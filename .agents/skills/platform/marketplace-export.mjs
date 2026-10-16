#!/usr/bin/env node
// marketplace-export.mjs - exports the bundle
// in the open Agent Skills format
// (agentskills.io) for community registries.
//
// The quirk frontmatter is richer than the
// open standard. The standard form is what
// Claude Code, Codex, Gemini CLI, Cursor,
// Copilot, OpenCode and Windsurf read, and
// what community registries (officialskills.sh,
// skillsboard, awesomeskill, agent-skills.cc)
// ingest. This exporter produces, per skill:
//
//   <export-root>/<skill-name>/SKILL.md
//     frontmatter: name, description, license,
//     compatibility (joined from the quirk
//     list), metadata (every quirk-specific
//     field stringified), allowed-tools
//     (derived from side effects)
//     body: the canonical body verbatim
//
// plus an index.json listing every exported
// skill with its source path and hash, so a
// registry can verify provenance.
//
// Complex frontmatter values are stringified
// deterministically (JSON for arrays/objects,
// String() for scalars) so the export is
// reproducible.
//
// Usage:
//   node .agents/skills/platform/marketplace-export.mjs [--out dir]
//        [--json] [--write]
//
// Default out dir: .agents/skills/platform/artifacts/agentskills-export
// Default mode is dry-run; --write materialises the export.
//
// Exit codes: 0 = export ready (or written),
//             1 = a skill could not be exported,
//             2 = usage.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './skill-graph.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.cwd();
// NOTE: the export must never live under .agents/skills/.
// Every bundle walker treats any directory containing a
// SKILL.md as a skill, so an export inside the bundle
// tree would shadow the canonical skills with 251
// phantom duplicates. The repo-root artifacts/ directory
// stays outside every walked tree.
const defaultOut = path.join(repoRoot, 'artifacts', 'agentskills-export');

const STANDARD_FIELDS = new Set(['name', 'description', 'license', 'compatibility', 'allowed-tools', 'metadata']);

// Side effects that justify pre-approved tool access
// in the standard allowed-tools field.
const ALLOWED_TOOLS_BY_EFFECT = {
  'write-code': ['Edit', 'Write'],
  'write-files': ['Edit', 'Write'],
  'write-docs': ['Edit', 'Write'],
  'write-temp-file': ['Write'],
  'commit-git': ['Bash(git:*)'],
  'push-branch': ['Bash(git:*)'],
  'post-pr-comment': ['Bash(gh:*)'],
  'run-tests': ['Bash(node:*)', 'Bash(npm:*)'],
  'execute': ['Bash(node:*)'],
  'run-command': ['Bash'],
  'fetch-url': ['WebFetch'],
  'web-fetch': ['WebFetch'],
  'web-search': ['WebSearch'],
};

const BASE_ALLOWED = ['Read', 'Grep', 'Glob'];

class UsageError extends Error {}

function parseArgs(argv) {
  const flags = { json: false, write: false, out: defaultOut, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--json') flags.json = true;
    else if (token === '--write') flags.write = true;
    else if (token === '--help' || token === '-h') flags.help = true;
    else if (token === '--out') { flags.out = argv[i + 1]; i += 1; }
    else throw new UsageError(`unknown argument: ${token}`);
  }
  return flags;
}

function collectSkills(skillsRoot) {
  const out = [];
  const walk = (dir, domain) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === 'platform') continue;
      const child = path.join(dir, entry.name);
      const skillMd = path.join(child, 'SKILL.md');
      if (fs.existsSync(skillMd)) {
        out.push({
          name: entry.name,
          domain: domain || 'uncategorized',
          dirPath: child,
          text: fs.readFileSync(skillMd, 'utf8'),
        });
      } else {
        walk(child, domain || entry.name);
      }
    }
  };
  walk(skillsRoot, '');
  return out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

// Split a SKILL.md into frontmatter text and body.
function splitSkill(text) {
  const end = text.indexOf('\n---', 3);
  if (end === -1) return { frontmatter: '', body: text };
  return {
    frontmatter: text.slice(0, end + 4),
    body: text.slice(end + 4),
  };
}

function stringifyValue(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

// Derive the standard allowed-tools string from
// declared side effects, conservative: read-only
// base plus exactly the tools the declared side
// effects justify.
function deriveAllowedTools(sideEffects) {
  const tools = new Set(BASE_ALLOWED);
  for (const effect of sideEffects) {
    for (const tool of ALLOWED_TOOLS_BY_EFFECT[effect] ?? []) tools.add(tool);
  }
  return [...tools].sort().join(' ');
}

function exportSkill(skill) {
  const meta = parseFrontmatter(skill.text);
  const { body } = splitSkill(skill.text);

  // Quirk-specific fields become stringified
  // entries in the standard metadata map.
  const metadata = {};
  for (const [key, value] of Object.entries(meta)) {
    if (STANDARD_FIELDS.has(key)) continue;
    metadata[key] = stringifyValue(value);
  }

  const compatibility = Array.isArray(meta.compatibility)
    ? meta.compatibility.join(', ')
    : (meta.compatibility ?? '');

  const sideEffects = Array.isArray(meta.sideEffects) ? meta.sideEffects : [];

  const frontmatter = [
    '---',
    `name: ${skill.name}`,
    `description: ${typeof meta.description === 'string' ? meta.description : ''}`,
    meta.license ? `license: ${meta.license}` : null,
    compatibility ? `compatibility: ${compatibility}` : null,
    `allowed-tools: ${deriveAllowedTools(sideEffects)}`,
    'metadata:',
    ...Object.entries(metadata).map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`),
    '---',
  ].filter((line) => line !== null).join('\n');

  const exported = `${frontmatter}\n${body}`;
  const hash = crypto.createHash('sha256').update(exported).digest('hex');
  return { name: skill.name, domain: skill.domain, content: exported, hash };
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) {
    console.log(`marketplace-export options:
  (no flags)  build the agentskills.io export in memory and report
  --out dir   export directory (default artifacts/agentskills-export)
  --write     materialise the export
  --json      machine-readable report
  --help      this help`);
    return 0;
  }

  const skills = collectSkills(path.join(repoRoot, '.agents', 'skills'));
  const exported = [];
  const errors = [];
  for (const skill of skills) {
    try {
      exported.push(exportSkill(skill));
    } catch (error) {
      errors.push(`${skill.name}: ${error?.message ?? error}`);
    }
  }

  if (flags.write) {
    for (const skill of exported) {
      const targetDir = path.join(flags.out, skill.name);
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(path.join(targetDir, 'SKILL.md'), skill.content);
    }
    const index = {
      generatedAt: new Date().toISOString(),
      spec: 'https://agentskills.io/specification',
      source: 'https://github.com/quantumquirkxyz/skills-quirk',
      skills: exported.map((skill) => ({
        name: skill.name,
        domain: skill.domain,
        path: `${skill.name}/SKILL.md`,
        sha256: skill.hash,
      })),
    };
    fs.writeFileSync(path.join(flags.out, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
  }

  const report = {
    mode: flags.write ? 'write' : 'dry-run',
    out: path.relative(repoRoot, flags.out),
    skills: exported.length,
    errors,
    exported: exported.map((skill) => ({ name: skill.name, domain: skill.domain, hash: skill.hash })),
    status: errors.length ? 'error' : 'ready',
  };

  if (flags.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`[marketplace-export] mode: ${report.mode}, skills: ${report.skills}, out: ${report.out} [${report.status}]`);
    for (const error of errors) console.log(`[marketplace-export] error: ${error}`);
  }

  return errors.length ? 1 : 0;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      if (error instanceof UsageError) {
        console.error(`[marketplace-export] ${error.message}`);
        process.exit(2);
      }
      console.error(`[marketplace-export] error: ${error?.message ?? error}`);
      process.exit(1);
    },
  );
}
