#!/usr/bin/env node
// agentskills-compliance.mjs - validates every shippable SKILL.md
// against the open Agent Skills specification (agentskills.io) and
// the progressive disclosure budgets from the Anthropic skill-authoring
// guidance.
//
// Why this exists: the quirk frontmatter is richer than the open
// standard (maturity, risk, trustTier, sideEffects, outputs, ...).
// The standard is what Claude Code, Codex, Gemini CLI, Cursor,
// Copilot, OpenCode and Windsurf all read, and what community
// registries (officialskills.sh, skillsboard, awesomeskill) ingest.
// This audit proves the bundle can be expressed in the standard
// form, and reports the deltas the exporter must map into the
// standard `metadata` map.
//
// The platform domain is tooling, not a shippable skill, so it is
// excluded - the same convention check-tool-risk-policy applies.
//
// Checks per skill:
//   C1 name        - required, 1-64 chars, [a-z0-9-], no leading/trailing
//                    or consecutive hyphens, must equal the parent directory
//   C2 description - required, 1-1024 chars, states what and when
//   C3 license     - optional string when present
//   C4 compatibility - optional, <=500 chars when present
//   C5 allowed-tools - optional space-separated string when present
//   C6 metadata-map - every quirk-specific field must be representable as
//                    a standard metadata entry (string -> string). Complex
//                    values are recorded as exporter mapping notes rather
//                    than warnings because they are expected bundle shape.
//   D1 metadata budget - name + description together stay under ~100 tokens
//                    (this is what runtimes preload at startup)
//   D2 body budget - SKILL.md body stays under 500 lines and ~5000 tokens
//                    (progressive disclosure: split into references/ when over)
//
// Token estimates use the chars/4 heuristic: good enough for a budget
// gate, deliberately conservative.
//
// Usage:
//   node .agents/skills/platform/agentskills-compliance.mjs [--json] [--skill name]
//
// Exit codes: 0 = compliant (warnings allowed), 1 = violations, 2 = usage.
//
// Report fields: skills counts the audited bundle; compliant counts skills
// with zero violations; violations lists C-rule failures (blocking); warnings
// lists D-rule budget overruns (non-blocking). Metadata-mapping notes are
// reported separately as informational exporter evidence.

import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './skill-graph.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_NAME = 64;
const MAX_DESCRIPTION = 1024;
const MAX_COMPATIBILITY = 500;
const BODY_LINE_BUDGET = 500;
const BODY_TOKEN_BUDGET = 5000;
const METADATA_TOKEN_BUDGET = 100;

// Standard fields the open spec defines. Anything else in the quirk
// frontmatter is quirk-specific and must survive the export as a
// stringified entry in the standard `metadata` map.
const STANDARD_FIELDS = new Set(['name', 'description', 'license', 'compatibility', 'allowed-tools', 'metadata']);

// Quirk fields with complex values. The exporter stringifies them
// into metadata entries; listing them keeps the mapping explicit
// instead of silent.
const COMPLEX_QUIRK_FIELDS = new Set([
  'capabilities', 'inputs', 'outputs', 'sideEffects', 'dependencies',
  'version', 'maturity', 'risk', 'trustTier', 'maxIterations', 'modelTier', 'category',
]);

const CHARS_PER_TOKEN = 4;
const estimateTokens = (text) => Math.ceil((text ?? '').length / CHARS_PER_TOKEN);

class UsageError extends Error {}

function parseArgs(argv) {
  const flags = { json: false, skill: null, skillNext: false, help: false };
  for (const token of argv) {
    if (token === '--json') flags.json = true;
    else if (token === '--help' || token === '-h') flags.help = true;
    else if (token === '--skill') flags.skillNext = true;
    else if (flags.skillNext) { flags.skill = token; flags.skillNext = false; }
    else throw new UsageError(`unknown argument: ${token}`);
  }
  return flags;
}

// Body of a SKILL.md (everything after the frontmatter block), or the
// whole text when no frontmatter block exists.
function bodyOf(text) {
  if (!text.startsWith('---')) return text;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return text;
  return text.slice(end + 4);
}

// Build the check-all manifest shape: { path, dirName, text, domain }.
// Walks the bundle the same way check-all.mjs does, minus the platform
// domain (tooling, not shippable skills).
function buildManifest(skillsRoot, repoRoot) {
  const entries = [];
  const walk = (dir, domain) => {
    for (const entry of fsSync.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === 'platform') continue;
      const full = path.join(dir, entry.name);
      const skillMd = path.join(full, 'SKILL.md');
      const toPosix = (value) => path.relative(repoRoot, value).split(path.sep).join('/');
      if (fsSync.existsSync(skillMd)) {
        entries.push({
          path: toPosix(skillMd),
          dirPath: toPosix(full),
          domain,
          dirName: entry.name,
          text: fsSync.readFileSync(skillMd, 'utf8'),
        });
      } else {
        walk(full, domain || entry.name);
      }
    }
  };
  walk(skillsRoot, '');
  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return entries;
}

function auditOne(entry) {
  const violations = [];
  const warnings = [];
  const metadataNotes = [];
  const label = entry.dirName;
  let meta = {};
  try {
    meta = parseFrontmatter(entry.text);
  } catch {
    violations.push(`${label}: frontmatter is not parseable`);
    return { name: label, path: entry.path, violations, warnings, metadataNotes };
  }

  // C1 - name
  const name = meta.name;
  if (typeof name !== 'string' || name.length === 0) {
    violations.push(`${label}: missing required field "name"`);
  } else {
    if (name.length > MAX_NAME) violations.push(`${label}: name exceeds ${MAX_NAME} characters`);
    if (!NAME_RE.test(name)) violations.push(`${label}: name must be lowercase alphanumeric with single hyphens only`);
    if (name !== label) violations.push(`${label}: name "${name}" does not match parent directory`);
  }

  // C2 - description
  const description = meta.description;
  if (typeof description !== 'string' || description.length === 0) {
    violations.push(`${label}: missing required field "description"`);
  } else if (description.length > MAX_DESCRIPTION) {
    violations.push(`${label}: description exceeds ${MAX_DESCRIPTION} characters`);
  }

  // C3/C4/C5 - optional standard fields
  if (meta.license !== undefined && typeof meta.license !== 'string') {
    violations.push(`${label}: license must be a string`);
  }
  // quirk's `compatibility` is a list of agent names; the standard's
  // is a string. A list is valid quirk form - the exporter joins it
  // into the standard string. Only a non-string, non-list value is a
  // violation, and a joined form over 500 chars is a warning.
  if (meta.compatibility !== undefined) {
    if (Array.isArray(meta.compatibility)) {
      const joined = meta.compatibility.join(', ');
      if (joined.length > MAX_COMPATIBILITY) {
        warnings.push(`${label}: compatibility list joins to ${joined.length} chars, over the ${MAX_COMPATIBILITY}-char standard field`);
      }
    } else if (typeof meta.compatibility !== 'string') {
      violations.push(`${label}: compatibility must be a string or a list of agent names`);
    } else if (meta.compatibility.length > MAX_COMPATIBILITY) {
      violations.push(`${label}: compatibility exceeds ${MAX_COMPATIBILITY} characters`);
    }
  }
  if (meta['allowed-tools'] !== undefined && typeof meta['allowed-tools'] !== 'string') {
    violations.push(`${label}: allowed-tools must be a space-separated string`);
  }

  // C6 - quirk fields map onto the standard metadata map
  const needsStringification = Object.keys(meta)
    .filter((key) => !STANDARD_FIELDS.has(key) && COMPLEX_QUIRK_FIELDS.has(key));
  if (needsStringification.length) {
    metadataNotes.push(`${label}: quirk fields [${needsStringification.join(', ')}] export as stringified metadata entries`);
  }

  // D1 - preloaded metadata budget (name + description only)
  const preloadedTokens = estimateTokens(`${name ?? ''} ${description ?? ''}`);
  if (preloadedTokens > METADATA_TOKEN_BUDGET) {
    warnings.push(`${label}: name+description ~${preloadedTokens} tokens exceeds the ~${METADATA_TOKEN_BUDGET}-token preload budget`);
  }

  // D2 - body budget (progressive disclosure)
  const body = bodyOf(entry.text);
  const bodyLines = body.split('\n').length;
  const bodyTokens = estimateTokens(body);
  if (bodyLines > BODY_LINE_BUDGET || bodyTokens > BODY_TOKEN_BUDGET) {
    warnings.push(`${label}: body ${bodyLines} lines / ~${bodyTokens} tokens exceeds the ${BODY_LINE_BUDGET}-line / ~${BODY_TOKEN_BUDGET}-token budget - split into references/`);
  }

  return { name: label, path: entry.path, violations, warnings, metadataNotes };
}

// manifest: array of { path, dirName, text, domain } in the check-all
// shape. Returns the compliance report.
export function auditSkills(manifest) {
  const shippable = manifest.filter((entry) => entry.domain !== 'platform');
  const results = shippable.map(auditOne);
  const violations = results.flatMap((r) => r.violations);
  const warnings = results.flatMap((r) => r.warnings);
  const metadataNotes = results.flatMap((r) => r.metadataNotes);
  return {
    skills: results.length,
    compliant: results.filter((r) => r.violations.length === 0).length,
    overBudget: results.filter((r) => r.warnings.length > 0).length,
    violations,
    warnings,
    metadataNotes,
    budgets: {
      nameChars: MAX_NAME,
      descriptionChars: MAX_DESCRIPTION,
      compatibilityChars: MAX_COMPATIBILITY,
      metadataTokens: METADATA_TOKEN_BUDGET,
      bodyLines: BODY_LINE_BUDGET,
      bodyTokens: BODY_TOKEN_BUDGET,
    },
    spec: 'https://agentskills.io/specification',
    status: violations.length ? 'fail' : 'pass',
  };
}

const HELP = `agentskills-compliance options:
  (no flags)  audit the bundle against the agentskills.io spec
  --skill n   report one skill by directory name
  --json      emit the machine-readable report
  --help      show this help`;

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) { console.log(HELP); return 0; }
  const repoRoot = process.cwd();
  const manifest = buildManifest(path.join(repoRoot, '.agents', 'skills'), repoRoot);
  const report = auditSkills(manifest);
  if (flags.skill) {
    const one = {
      name: flags.skill,
      violations: report.violations.filter((v) => v.startsWith(`${flags.skill}:`)),
      warnings: report.warnings.filter((w) => w.startsWith(`${flags.skill}:`)),
    };
    console.log(JSON.stringify(one, null, 2));
    return one.violations.length ? 1 : 0;
  }
  console.log(JSON.stringify(report, null, 2));
  return report.violations.length ? 1 : 0;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      if (error instanceof UsageError) {
        console.error(`[agentskills-compliance] ${error.message}`);
        console.error(HELP);
        process.exit(2);
      }
      console.error(`[agentskills-compliance] error: ${error?.message ?? error}`);
      process.exit(1);
    },
  );
}
