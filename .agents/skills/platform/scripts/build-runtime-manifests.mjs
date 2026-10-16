#!/usr/bin/env node
// build-runtime-manifests.mjs - Deterministic runtime manifest generator.
//
// Projects the frontmatter of every bundle skill (the .agents/skills/** tree,
// excluding the platform domain, which is infrastructure) into one runtime
// manifest per skill under .agents/skills/platform/manifests/.
//
// The derivation is mechanical and side-effect free: the same frontmatter
// always produces byte-identical manifest bytes, so the generated directory is
// a pure function of the bundle. No model, no network, no heuristics beyond
// the documented regexes below.
//
// Usage:
//   node scripts/build-runtime-manifests.mjs [--write] [--json] [--skill <domain/skill>]
//
// Default mode is a dry run that reports how many manifests would be written.
// --write applies the manifests and regenerates manifests/README.md.
// --skill restricts the run to one skill (accepted as domain/skill or as a
// bare skill name).
//
// Exit codes: 0 = success, 2 = usage or I/O error.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter, collectSkills } from '../skill-graph.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLATFORM_DIR = path.resolve(HERE, '..');
const MANIFESTS_REL_DIR = '.agents/skills/platform/manifests';
const SCHEMAS_REL_DIR = '.agents/skills/platform/schemas';
const DEFAULT_SCHEMAS_DIR = path.join(PLATFORM_DIR, 'schemas');

export const RUNTIME_MANIFEST_VERSION = 1;
export const DEFAULT_MAX_TURNS = 6;
export const DEFAULT_MODEL_TIER = 'reasoning';
export const DEFAULT_RISK = 'low';
export const DEFAULT_TRUST_TIER = 1;
export const MANIFEST_SUFFIX = '.runtime.json';
export const README_NAME = 'README.md';

export const BASE_TOOLS = ['Read', 'Grep', 'Glob'];
export const TRACE_EVENTS = ['skill.route', 'skill.execute', 'skill.verify'];
export const VERIFICATION_COMMAND = 'node .agents/skills/platform/check-all.mjs';
export const VERIFICATION_DOMAINS = new Set(['delivery', 'skill-dev', 'platform']);
export const HIGH_RISK_DENY = ['Bash', 'WebFetch', 'WebSearch'];

// Side effects that mutate the working tree or a remote tracker, so the skill
// runs inside a worktree instead of the caller's checkout.
export const MUTATING_SIDE_EFFECTS = new Set([
  'write-files', 'write-code', 'post-pr-comment', 'issue-mutation', 'git-mutation',
]);

// The manifest model tier vocabulary is fast/reasoning/router; the repo
// frontmatter also declares a code tier (model-rules.yaml), which normalizes
// to reasoning here so every manifest stays inside the schema enum.
export const MODEL_TIER_NORMALIZATION = { code: 'reasoning' };
const MODEL_TIERS = new Set(['fast', 'reasoning', 'router']);

// Derivation regexes, applied to description + capabilities + body.
const EXECUTION_MENTION = /run (?:the )?(?:test|command|script)|shell|npm |node /i;
const WEB_MENTION = /web|fetch|búsqueda|search/i;

function toList(value) {
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return String(value).split(',').map((entry) => entry.trim()).filter(Boolean);
}

export function normalizeRisk(value) {
  const risk = String(value ?? '').trim().toLowerCase();
  return risk === 'low' || risk === 'medium' || risk === 'high' ? risk : DEFAULT_RISK;
}

export function normalizeTrustTier(value) {
  const tier = Number(value);
  if (!Number.isInteger(tier) || tier < 1 || tier > 4) return DEFAULT_TRUST_TIER;
  return tier;
}

export function normalizeApprovalRequired(value) {
  return String(value ?? '').trim().toLowerCase() === 'true';
}

export function normalizeModelTier(value) {
  const tier = String(value ?? '').trim().toLowerCase();
  if (MODEL_TIERS.has(tier)) return tier;
  if (MODEL_TIER_NORMALIZATION[tier]) return MODEL_TIER_NORMALIZATION[tier];
  return DEFAULT_MODEL_TIER;
}

export function normalizeMaxTurns(value) {
  const turns = Number(value);
  if (!Number.isInteger(turns) || turns < 1) return DEFAULT_MAX_TURNS;
  return turns;
}

export function frontmatterHash(frontmatter) {
  const fm = frontmatter && typeof frontmatter === 'object' ? frontmatter : {};
  const sorted = {};
  for (const key of Object.keys(fm).sort()) sorted[key] = fm[key];
  return createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
}

export function manifestFileName(skill) {
  return `${String(skill).replace(/\//g, '-')}${MANIFEST_SUFFIX}`;
}

function resolveArtifactSchema(artifactType, schemasDir) {
  if (!artifactType) return null;
  const dir = schemasDir === undefined ? DEFAULT_SCHEMAS_DIR : schemasDir;
  if (!dir) return null;
  const relative = `${SCHEMAS_REL_DIR}/${artifactType}-schema.json`;
  if (existsSync(path.join(dir, `${artifactType}-schema.json`))) return relative;
  return null;
}

export function deriveTools(haystack, sideEffects, risk) {
  const allow = [...BASE_TOOLS];
  if (EXECUTION_MENTION.test(haystack)) allow.push('Bash');
  if (sideEffects.includes('write-code') || sideEffects.includes('write-files')) allow.push('Edit', 'Write');
  if (WEB_MENTION.test(haystack)) allow.push('WebFetch', 'WebSearch');
  const deny = risk === 'high' ? [...HIGH_RISK_DENY] : [];
  return { allow, deny };
}

// Pure projection: frontmatter in, manifest out. Options:
//   skill      bundle identity <domain>/<skill> (required for a useful result)
//   domain     overrides the domain parsed from the skill identity
//   body       skill body text fed to the mention regexes
//   schemasDir absolute directory probed for <artifactType>-schema.json
export function buildRuntimeManifest(frontmatter, options = {}) {
  const fm = frontmatter && typeof frontmatter === 'object' ? frontmatter : {};
  const skill = String(options.skill ?? '');
  const slash = skill.indexOf('/');
  const domain = options.domain ?? (slash > 0 ? skill.slice(0, slash) : '');
  const body = typeof options.body === 'string' ? options.body : '';
  const haystack = [
    typeof fm.description === 'string' ? fm.description : '',
    ...toList(fm.capabilities),
    body,
  ].join('\n');

  const sideEffects = toList(fm.sideEffects);
  const risk = normalizeRisk(fm.risk);
  const trustTier = normalizeTrustTier(fm.trustTier);
  const artifactType = typeof fm.artifactType === 'string' ? fm.artifactType.trim() : '';
  const inputs = toList(fm.inputs);
  const mutating = sideEffects.some((effect) => MUTATING_SIDE_EFFECTS.has(effect));

  return {
    skill,
    version: RUNTIME_MANIFEST_VERSION,
    generatedFrom: 'frontmatter',
    frontmatterHash: frontmatterHash(fm),
    role: inputs.length > 0 || artifactType ? 'workflow' : 'tool',
    router: { positive: [], negative: [], requiredSignals: [] },
    execution: {
      defaultAgent: trustTier <= 1 && sideEffects.length === 0 ? 'explore' : 'general',
      isolation: mutating ? 'worktree' : 'none',
      maxTurns: normalizeMaxTurns(fm.maxIterations),
      modelTier: normalizeModelTier(fm.modelTier),
      tools: deriveTools(haystack, sideEffects, risk),
    },
    guardrails: {
      sideEffects,
      approvalRequired: normalizeApprovalRequired(fm.approvalRequired),
      approvalFor: toList(fm.approvalFor),
      risk,
      trustTier,
    },
    verification: {
      commands: VERIFICATION_DOMAINS.has(domain) ? [VERIFICATION_COMMAND] : [],
      artifactSchema: resolveArtifactSchema(artifactType, options.schemasDir),
    },
    observability: { traceEvents: [...TRACE_EVENTS] },
  };
}

// One entry per bundle skill: identity, frontmatter, body, and the manifest
// derived from them. Reading is the only I/O; the caller decides what to do
// with the manifests.
export function collectManifestInputs(root = process.cwd()) {
  const schemasDir = path.join(root, '.agents', 'skills', 'platform', 'schemas');
  return collectSkills(root)
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    .map((skill) => {
      const text = readFileSync(path.join(root, skill.path, 'SKILL.md'), 'utf8');
      const frontmatter = parseFrontmatter(text);
      const skillId = `${skill.domain}/${skill.name}`;
      return {
        skill: skillId,
        domain: skill.domain,
        name: skill.name,
        path: skill.path,
        body: skill.body,
        frontmatter,
        manifest: buildRuntimeManifest(frontmatter, {
          skill: skillId,
          domain: skill.domain,
          body: skill.body,
          schemasDir,
        }),
      };
    });
}

function byDomainCount(inputs) {
  const counts = {};
  for (const input of inputs) counts[input.domain] = (counts[input.domain] || 0) + 1;
  return counts;
}

function summarize(inputs) {
  const count = (key, pick) => {
    const out = {};
    for (const input of inputs) {
      const value = pick(input.manifest);
      out[value] = (out[value] || 0) + 1;
    }
    return out;
  };
  return {
    role: count('role', (m) => m.role),
    isolation: count('isolation', (m) => m.execution.isolation),
    defaultAgent: count('defaultAgent', (m) => m.execution.defaultAgent),
    modelTier: count('modelTier', (m) => m.execution.modelTier),
  };
}

function renderReadme() {
  return `# Runtime manifests (generated)

Every \`*.runtime.json\` file in this directory is generated. Do not edit these
files by hand; the next regeneration overwrites them.

Each file is a deterministic projection of the frontmatter of one bundle skill:
\`<domain>-<skill>.runtime.json\` is derived from
\`.agents/skills/<domain>/<skill>/SKILL.md\`. The platform domain is
infrastructure and is not projected; every bundle skill gets exactly one
manifest.

## Regenerate

Dry run (reports how many manifests would be written):

    node .agents/skills/platform/scripts/build-runtime-manifests.mjs

Write every manifest plus this README:

    node .agents/skills/platform/scripts/build-runtime-manifests.mjs --write

Write a single skill:

    node .agents/skills/platform/scripts/build-runtime-manifests.mjs --write --skill delivery/review-pr

Validate the directory against the schema, the bundle coverage, and the
frontmatter consistency of every manifest:

    node .agents/skills/platform/validate-runtime-manifests.mjs --check --json

## Field derivation

| Field | Rule |
| --- | --- |
| \`skill\` | Bundle identity \`<domain>/<skill>\`. |
| \`version\` | Runtime manifest format version (\`1\`). |
| \`generatedFrom\` | Always \`frontmatter\`; manifests are mechanical projections. |
| \`frontmatterHash\` | \`sha256\` of \`JSON.stringify\` over the frontmatter object with sorted keys; the validator compares it to detect drift. |
| \`role\` | \`workflow\` when the frontmatter declares \`inputs\` or a non-empty \`artifactType\`; \`tool\` otherwise. |
| \`router\` | \`{positive: [], negative: [], requiredSignals: []}\`; routing signals are filled in a later phase. |
| \`execution.defaultAgent\` | \`explore\` when \`trustTier\` is 1 and \`sideEffects\` is empty; \`general\` otherwise. |
| \`execution.isolation\` | \`worktree\` when \`sideEffects\` holds a mutating effect (\`write-files\`, \`write-code\`, \`post-pr-comment\`, \`issue-mutation\`, \`git-mutation\`); \`none\` otherwise. |
| \`execution.maxTurns\` | The frontmatter \`maxIterations\`, or \`6\` when absent or not a positive integer. |
| \`execution.modelTier\` | The frontmatter \`modelTier\`; \`code\` normalizes to \`reasoning\`; \`reasoning\` when absent. |
| \`execution.tools.allow\` | \`Read\`, \`Grep\`, \`Glob\` on every manifest; \`Bash\` when the description, capabilities, or body match \`/run (?:the )?(?:test\\|command\\|script)\\|shell\\|npm \\|node /i\`; \`Edit\` and \`Write\` when \`sideEffects\` include \`write-code\` or \`write-files\`; \`WebFetch\` and \`WebSearch\` when the text matches \`/web\\|fetch\\|búsqueda\\|search/i\`. |
| \`execution.tools.deny\` | Empty, except \`Bash\`, \`WebFetch\`, and \`WebSearch\` for \`risk: high\` skills. |
| \`guardrails.sideEffects\` | Copied from the frontmatter; empty when it declares none. |
| \`guardrails.approvalRequired\` | The frontmatter \`approvalRequired\` as a boolean. |
| \`guardrails.approvalFor\` | Copied from the frontmatter. |
| \`guardrails.risk\` | \`low\`, \`medium\`, or \`high\`; \`low\` when the frontmatter declares none. |
| \`guardrails.trustTier\` | Integer 1-4; \`1\` when the frontmatter declares none. |
| \`verification.commands\` | \`${VERIFICATION_COMMAND}\` for the \`delivery\`, \`skill-dev\`, and \`platform\` domains; empty otherwise. |
| \`verification.artifactSchema\` | \`${SCHEMAS_REL_DIR}/<artifactType>-schema.json\` when that file exists; \`null\` otherwise. |
| \`observability.traceEvents\` | \`skill.route\`, \`skill.execute\`, \`skill.verify\`. |

## Schema

\`schema/runtime-manifest.schema.json\` (JSON Schema draft-07). The tool risk
vocabulary behind the allow and deny lists lives in
\`policy/tool-risk.yaml\`.
`;
}

function serialize(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

function parseArgs(argv) {
  const args = { write: false, json: false, skill: null, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--write') args.write = true;
    else if (arg === '--json') args.json = true;
    else if (arg === '--skill') {
      args.skill = argv[++i];
      if (args.skill === undefined) throw new Error('--skill requires <domain/skill>');
    } else if (arg.startsWith('--skill=')) args.skill = arg.slice('--skill='.length);
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return args;
}

function printHuman(result) {
  const where = result.manifestsDir;
  if (result.mode === 'write') {
    console.log(`[build-runtime-manifests] wrote ${result.manifests} manifests + ${README_NAME} to ${where}`);
  } else {
    console.log(`[build-runtime-manifests] dry-run: ${result.manifests} manifests would be written to ${where}`);
    console.log('[build-runtime-manifests] pass --write to apply');
  }
  for (const [domain, count] of Object.entries(result.byDomain)) {
    console.log(`  ${domain}: ${count}`);
  }
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log('usage: node scripts/build-runtime-manifests.mjs [--write] [--json] [--skill <domain/skill>]');
    console.log('  --write               apply the manifests and regenerate manifests/README.md');
    console.log('  --json                emit machine-readable JSON');
    console.log('  --skill <domain/skill>  restrict the run to one skill');
    return 0;
  }

  const root = process.cwd();
  const manifestsDir = path.join(root, '.agents', 'skills', 'platform', 'manifests');
  let inputs;
  try {
    inputs = collectManifestInputs(root);
  } catch (error) {
    console.error(`build-runtime-manifests: cannot read the skills bundle: ${error?.message ?? error}`);
    return 2;
  }
  if (args.skill) {
    const wanted = args.skill.trim();
    inputs = inputs.filter((input) => input.skill === wanted || input.name === wanted);
    if (inputs.length === 0) {
      console.error(`build-runtime-manifests: no bundle skill matches "${wanted}"`);
      return 2;
    }
  }

  if (args.write) {
    try {
      mkdirSync(manifestsDir, { recursive: true });
      for (const input of inputs) {
        writeFileSync(path.join(manifestsDir, manifestFileName(input.skill)), serialize(input.manifest));
      }
      writeFileSync(path.join(manifestsDir, README_NAME), renderReadme());
    } catch (error) {
      console.error(`build-runtime-manifests: write failed: ${error?.message ?? error}`);
      return 2;
    }
  }

  const result = {
    tool: 'build-runtime-manifests.mjs',
    status: args.write ? 'written' : 'dry-run',
    mode: args.write ? 'write' : 'dry-run',
    root,
    manifestsDir: MANIFESTS_REL_DIR,
    skills: inputs.length,
    manifests: inputs.length,
    byDomain: byDomainCount(inputs),
    summary: summarize(inputs),
    files: inputs.map((input) => manifestFileName(input.skill)),
    readme: args.write ? README_NAME : null,
  };

  if (args.json) console.log(JSON.stringify(result, null, 2));
  else printHuman(result);
  return 0;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main().then((code) => process.exit(code)).catch((error) => {
  console.error(`build-runtime-manifests: ${error?.message ?? error}`);
  process.exit(2);
});
