#!/usr/bin/env node
// validate-spec-compliance.mjs - agentskills.io open-spec alignment gate.
//
// Wave 2 item 2.7: the canonical bundle must stay installable by spec-strict
// packagers, not only by Claude Code.
//
// Research basis:
// - agentskills.io open specification (governed at agentskills/agentskills, with
//   the skills-ref reference validator and 30+ client implementations). Only six
//   frontmatter fields are portable cross-harness: name, description, license,
//   compatibility, metadata, allowed-tools.
// - Outside Claude Code, non-spec frontmatter fields HARD-FAIL packaging
//   ("Unexpected key(s) in SKILL.md frontmatter"). The canonical files therefore
//   satisfy the spec's normative constraints, and every bundle-specific field
//   (category, capabilities, risk, trustTier, diataxis, ...) is documented as
//   read-only for quirk tooling: spec-strict packagers strip it, so it must never
//   carry load-bearing semantics alone.
//
// Documented divergence (canonical record lives in
// docs/reference/agents/skill-templates.md): the bundle's `compatibility` field
// is a list of adjacent skill names (routing), NOT the spec's <=500-character
// environment-requirements string. This validator treats bundle `compatibility`
// as a bundle field and checks only the spec-portable concerns.
//
// Checks (ERROR unless marked WARNING):
//   name-missing             frontmatter name present
//   name-dir-mismatch        name equals the parent directory name (case-sensitive)
//   name-invalid             name matches ^[a-z0-9]+(-[a-z0-9]+)*$
//   name-consecutive-hyphens name contains no "--"
//   name-reserved-word       name contains no anthropic|claude reserved word
//   name-too-long            name <= 64 characters
//   description-missing      description present and non-empty
//   description-too-long     description <= 1024 characters
//   description-xml-tags     description contains no XML tags
//   license-missing    WARN  license present (bundle policy: license: MIT)
//   body-too-long      WARN  SKILL.md body <= 500 lines (spec recommendation)
//   description-truncated
//                     WARN  >600 chars and no terminal punctuation (heuristic,
//                             documentation-only: descriptions are routing
//                             surfaces, so they are never rewritten by tooling)
//   windows-backslash-path
//                     WARN  no Windows-style path separators (existing bundle rule)
//
// Usage: node validate-spec-compliance.mjs [--path <skills-root>] [--json]
// Exit codes: 0 = no errors, 1 = at least one error, 2 = usage or I/O error.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordExecution } from './record-execution.mjs';

const repoRoot = process.cwd();
const defaultSkillsRoot = path.join(repoRoot, '.agents', 'skills');

// Spec constraints (agentskills.io specification, SKILL.md frontmatter table).
export const MAX_NAME_LENGTH = 64;
export const MAX_DESCRIPTION_LENGTH = 1024;
export const MAX_BODY_LINES = 500;
export const TRUNCATION_MIN_LENGTH = 600;
export const SPEC_PORTABLE_FIELDS = ['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools'];

const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RESERVED_NAME_PATTERN = /anthropic|claude/i;
const XML_TAG_PATTERN = /<[a-zA-Z!/][^>]*>/;
const TERMINAL_PUNCTUATION_PATTERN = /[.!?;:)\]}"'\u201d\u00bb]$/;
const WINDOWS_PATH_PATTERN = /[A-Za-z0-9_.$~-]\\[A-Za-z0-9_.$~-]/;

function unquote(value) {
  const raw = String(value ?? '').trim();
  if (raw.length >= 2 && ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'")))) {
    return raw.slice(1, -1);
  }
  return raw;
}

export function splitFrontmatter(text) {
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return null;
  return text.slice(4, end);
}

// Reads the frontmatter fields this gate needs: top-level scalars (name,
// description, license), block scalars folded to one string, and sequences read
// as string arrays. Nested map values are passed over on purpose.
export function parseFrontmatter(text) {
  const frontmatter = splitFrontmatter(text);
  if (frontmatter === null) return {};
  const fields = {};
  let active = null;
  let blockLines = null;
  const flushBlock = () => {
    if (active !== null && blockLines !== null) fields[active] = blockLines.join(' ').trim();
    blockLines = null;
  };
  for (const line of frontmatter.split(/\r?\n/)) {
    if (blockLines !== null && (/^\s+\S/.test(line) || line.trim() === '')) {
      blockLines.push(line.trim());
      continue;
    }
    flushBlock();
    const key = line.match(/^([A-Za-z][A-Za-z0-9-]*):\s*(.*)$/);
    if (key) {
      active = key[1];
      const raw = key[2].trim();
      if (raw === '') {
        fields[active] = null;
      } else if (/^[>|][+-]?$/.test(raw)) {
        fields[active] = '';
        blockLines = [];
      } else {
        fields[active] = unquote(raw);
      }
      continue;
    }
    const item = line.match(/^\s+-\s+(.+)$/);
    if (item && active !== null) {
      if (!Array.isArray(fields[active])) fields[active] = [];
      fields[active].push(unquote(item[1].trim()));
    }
  }
  flushBlock();
  return fields;
}

export function bodyLineCount(text) {
  const body = text.startsWith('---') ? text.replace(/^---[\s\S]*?---\s*/, '') : text;
  return body.split('\n').length;
}

// Pure check for one skill sample. Drives both the CLI (per scanned SKILL.md)
// and the tests (synthetic samples), so the error classes stay pinned in code.
export function checkSkillSample(sample) {
  const {
    dirName,
    name = null,
    description = null,
    license = null,
    bodyLines = 0,
    text = '',
  } = sample;
  const errors = [];
  const warnings = [];
  const fail = (code, message) => errors.push({ code, message, severity: 'error' });
  const warn = (code, message) => warnings.push({ code, message, severity: 'warning' });
  const label = name ?? dirName;

  if (name === null || name === '') {
    fail('name-missing', `${dirName}: frontmatter name is required by the agentskills.io spec`);
  } else {
    if (name !== dirName) {
      fail('name-dir-mismatch', `${name}: name must equal the parent directory name "${dirName}"`);
    }
    if (name.length > MAX_NAME_LENGTH) {
      fail('name-too-long', `${name}: name must be at most ${MAX_NAME_LENGTH} characters (${name.length})`);
    }
    if (RESERVED_NAME_PATTERN.test(name)) {
      fail('name-reserved-word', `${name}: name must not contain a reserved word (anthropic|claude)`);
    }
    if (!NAME_PATTERN.test(name)) {
      if (name.includes('--')) {
        fail('name-consecutive-hyphens', `${name}: name must not contain consecutive hyphens`);
      } else {
        fail('name-invalid', `${name}: name must match ^[a-z0-9]+(-[a-z0-9]+)*$ (lowercase letters, digits, single hyphens)`);
      }
    }
  }

  if (description === null || description.trim() === '') {
    fail('description-missing', `${label}: description must be present and non-empty`);
  } else {
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      fail('description-too-long', `${label}: description must be at most ${MAX_DESCRIPTION_LENGTH} characters (${description.length})`);
    }
    const xmlTag = description.match(XML_TAG_PATTERN);
    if (xmlTag) {
      fail('description-xml-tags', `${label}: description must not contain XML tags (${xmlTag[0]})`);
    }
    if (description.length > TRUNCATION_MIN_LENGTH && !TERMINAL_PUNCTUATION_PATTERN.test(description)) {
      warn('description-truncated', `${label}: description ends without punctuation at ${description.length} characters and may be truncated (report only; descriptions are routing surfaces and are never auto-edited)`);
    }
  }

  if (license === null || license === '') {
    warn('license-missing', `${label}: license is absent; the spec-portable field is optional, but bundle policy declares license: MIT on every skill`);
  }

  if (bodyLines > MAX_BODY_LINES) {
    warn('body-too-long', `${label}: SKILL.md body is ${bodyLines} lines, above the recommended ${MAX_BODY_LINES}`);
  }

  if (WINDOWS_PATH_PATTERN.test(text)) {
    warn('windows-backslash-path', `${label}: SKILL.md contains a Windows-style backslash path`);
  }

  return { errors, warnings };
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

const EXCLUDED_WALK_NAMES = new Set(['node_modules', 'traces', 'runs']);

// Single walk + read producing the shared skill manifest
// ({ path, dirPath, domain, dirName, text }) every report-only audit consumes.
// The walk mirrors the validator's historical scan: directories named
// node_modules/traces/runs are skipped at every level, and a directory that
// holds a SKILL.md is a leaf.
async function collectManifest(dir, domain = '', out = []) {
  if (!(await exists(dir))) return out;
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (EXCLUDED_WALK_NAMES.has(entry.name)) continue;
    const dirPath = path.join(dir, entry.name);
    if (!entry.isDirectory()) continue;
    const skillMd = path.join(dirPath, 'SKILL.md');
    if (await exists(skillMd)) {
      const text = await fs.readFile(skillMd, 'utf8');
      out.push({
        path: path.relative(repoRoot, skillMd).replaceAll(path.sep, '/'),
        dirPath: path.relative(repoRoot, dirPath).replaceAll(path.sep, '/'),
        domain,
        dirName: entry.name,
        text,
      });
    } else {
      await collectManifest(dirPath, domain || entry.name, out);
    }
  }
  return out;
}

const byPath = (a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);

// Manifest-driven audit: identical findings to the CLI's own walk because the
// per-skill checks (checkSkillSample, parseFrontmatter, bodyLineCount) are the
// same functions applied to the same texts, just read once for every consumer.
export function auditSkills(manifest, { skillsRoot = defaultSkillsRoot } = {}) {
  const files = manifest
    .filter((entry) => !entry.path.split('/').some((segment) => EXCLUDED_WALK_NAMES.has(segment)))
    .sort(byPath);
  const perSkill = [];
  const errorFindings = [];
  const warningFindings = [];
  const overBudget = [];
  for (const entry of files) {
    const fields = parseFrontmatter(entry.text);
    const { errors, warnings } = checkSkillSample({
      dirName: entry.dirName,
      name: typeof fields.name === 'string' && fields.name !== '' ? fields.name : null,
      description: typeof fields.description === 'string' ? fields.description : null,
      license: typeof fields.license === 'string' && fields.license !== '' ? fields.license : null,
      bodyLines: bodyLineCount(entry.text),
      text: entry.text,
    });
    errorFindings.push(...errors);
    warningFindings.push(...warnings);
    if (errors.length || warnings.length) perSkill.push({ skill: entry.dirName, path: entry.path, errors, warnings });
    const bodyWarning = warnings.find((finding) => finding.code === 'body-too-long');
    if (bodyWarning) overBudget.push(entry.dirName);
  }

  const errorMessages = errorFindings.map((finding) => finding.message);
  const warningMessages = warningFindings.map((finding) => finding.message);
  const status = errorFindings.length ? 'fail' : 'pass';
  const relativeRoot = path.relative(repoRoot, skillsRoot) || '.';

  return {
    skills: files.length,
    skillsRoot: relativeRoot,
    specFields: SPEC_PORTABLE_FIELDS,
    perSkill,
    warnings: warningMessages,
    errors: errorMessages,
    status,
    overBudget,
  };
}

function parseArgs(argv) {
  const args = { path: null, json: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') args.json = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg === '--path') {
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) return { error: `--path requires a directory argument` };
      args.path = next;
      i++;
    } else if (arg.startsWith('--path=')) args.path = arg.slice('--path='.length);
    else if (!arg.startsWith('-') && args.path === null) args.path = arg;
    else return { error: `unknown argument: ${arg}` };
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.error) {
    console.error(args.error);
    console.error('Usage: node .agents/skills/platform/validate-spec-compliance.mjs [--path <skills-root>] [--json]');
    process.exit(2);
  }
  if (args.help) {
    console.log('Usage: node .agents/skills/platform/validate-spec-compliance.mjs [--path <skills-root>] [--json]');
    return;
  }

  const skillsRoot = path.resolve(repoRoot, args.path ?? defaultSkillsRoot);
  if (!(await exists(skillsRoot))) {
    console.error(`Skills root not found: ${path.relative(repoRoot, skillsRoot) || skillsRoot}`);
    process.exit(2);
  }

  const manifest = (await collectManifest(skillsRoot)).sort(byPath);
  const report = auditSkills(manifest, { skillsRoot });
  const { perSkill, warnings: warningMessages, errors: errorMessages, status, overBudget } = report;
  const relativeRoot = report.skillsRoot;

  const runPath = await recordExecution({
    repoRoot,
    skill: 'skill-audit',
    tool: 'skills:validate-spec-compliance',
    contextPack: 'platform-spec-compliance',
    status,
    errors: errorMessages,
    warnings: warningMessages,
    extra: { skills: report.skills, specFields: SPEC_PORTABLE_FIELDS.length },
  });

  if (args.json) {
    console.log(JSON.stringify({
      skills: report.skills,
      skillsRoot: relativeRoot,
      specFields: SPEC_PORTABLE_FIELDS,
      perSkill,
      warnings: warningMessages,
      errors: errorMessages,
      status,
      executionRecord: path.relative(repoRoot, runPath),
    }, null, 2));
  } else {
    console.log(`agentskills.io spec compliance (${report.skills} skills under ${relativeRoot})`);
    console.log('='.repeat(60));
    if (perSkill.length === 0) {
      console.log('No findings: every skill satisfies the checked constraints.');
    } else {
      for (const entry of perSkill) {
        console.log(`${entry.skill}: ${entry.errors.length} error(s), ${entry.warnings.length} warning(s)`);
        for (const finding of entry.errors) console.log(`  x ${finding.message}`);
        for (const finding of entry.warnings) console.log(`  ! ${finding.message}`);
      }
    }
    console.log('');
    console.log(`Totals: skills=${report.skills} errors=${errorMessages.length} warnings=${warningMessages.length}`);
    console.log(
      overBudget.length
        ? `Body-length budget: ${overBudget.length} skill(s) exceed ${MAX_BODY_LINES} lines: ${overBudget.join(', ')}`
        : `Body-length budget: every skill body is within ${MAX_BODY_LINES} lines`,
    );
    console.log('');
    console.log(`Execution record: ${path.relative(repoRoot, runPath)}`);
  }

  if (status === 'fail') process.exit(1);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  main().catch((error) => {
    console.error(error);
    process.exit(2);
  });
}
