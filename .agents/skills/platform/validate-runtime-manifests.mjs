#!/usr/bin/env node
// validate-runtime-manifests.mjs - Runtime manifest auditor.
//
// Validates every .agents/skills/platform/manifests/<domain>-<skill>.runtime.json
// file against schema/runtime-manifest.schema.json, checks that the bundle
// coverage is exact (every skill has one manifest, no manifest is orphaned),
// and re-derives each manifest from the current frontmatter to catch drift:
//   - stale[]        the stored frontmatterHash no longer matches the skill
//   - inconsistent[] guardrails or execution fields no longer match the
//                    frontmatter, or the allow/deny lists overlap
//
// The JSON-Schema validator is a minimal in-repo implementation (no npm
// dependency is available) covering the keyword subset this repository uses:
// type, required, enum, const, properties, additionalProperties:false, items,
// minimum, maximum, minLength, maxLength, pattern, minItems.
//
// Usage:
//   node validate-runtime-manifests.mjs [--json] [--check]
//
// Default mode is an informative dry run that always exits 0. --check exits 1
// when the directory has any error (schema, coverage, stale, or inconsistent).
// Exit codes: 0 = pass, 1 = --check with errors, 2 = usage or I/O error.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MANIFEST_SUFFIX,
  collectManifestInputs,
  manifestFileName,
} from './scripts/build-runtime-manifests.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MANIFESTS_REL_DIR = '.agents/skills/platform/manifests';
const SCHEMA_REL_PATH = 'schema/runtime-manifest.schema.json';

// ── minimal JSON Schema validator ───────────────────────────────────────────

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

function matchesType(value, type) {
  const types = Array.isArray(type) ? type : [type];
  return types.some((expected) => (expected === 'number' ? typeof value === 'number' : typeOf(value) === expected));
}

function validateInstance(schemaNode, instance, pointer, errors) {
  if (schemaNode === true || schemaNode === undefined || schemaNode === null) return;
  if (schemaNode === false) {
    errors.push(`${pointer}: schema is false`);
    return;
  }
  if (schemaNode.type && !matchesType(instance, schemaNode.type)) {
    errors.push(`${pointer}: expected ${JSON.stringify(schemaNode.type)}, got ${typeOf(instance)}`);
    return;
  }
  if (schemaNode.const !== undefined && JSON.stringify(instance) !== JSON.stringify(schemaNode.const)) {
    errors.push(`${pointer}: expected const ${JSON.stringify(schemaNode.const)}`);
  }
  if (schemaNode.enum && !schemaNode.enum.some((value) => JSON.stringify(value) === JSON.stringify(instance))) {
    errors.push(`${pointer}: ${JSON.stringify(instance)} not in enum ${JSON.stringify(schemaNode.enum)}`);
  }
  if (typeof instance === 'string') {
    if (schemaNode.minLength !== undefined && instance.length < schemaNode.minLength) {
      errors.push(`${pointer}: shorter than minLength ${schemaNode.minLength}`);
    }
    if (schemaNode.maxLength !== undefined && instance.length > schemaNode.maxLength) {
      errors.push(`${pointer}: longer than maxLength ${schemaNode.maxLength}`);
    }
    if (schemaNode.pattern && !new RegExp(schemaNode.pattern).test(instance)) {
      errors.push(`${pointer}: does not match pattern ${schemaNode.pattern}`);
    }
  }
  if (typeof instance === 'number') {
    if (schemaNode.minimum !== undefined && instance < schemaNode.minimum) {
      errors.push(`${pointer}: below minimum ${schemaNode.minimum}`);
    }
    if (schemaNode.maximum !== undefined && instance > schemaNode.maximum) {
      errors.push(`${pointer}: above maximum ${schemaNode.maximum}`);
    }
  }
  if (Array.isArray(instance)) {
    if (schemaNode.minItems !== undefined && instance.length < schemaNode.minItems) {
      errors.push(`${pointer}: fewer than minItems ${schemaNode.minItems}`);
    }
    instance.forEach((item, index) => {
      if (schemaNode.items) validateInstance(schemaNode.items, item, `${pointer}/${index}`, errors);
    });
  }
  if (instance && typeof instance === 'object' && !Array.isArray(instance)) {
    for (const key of schemaNode.required ?? []) {
      if (instance[key] === undefined) errors.push(`${pointer}: missing required "${key}"`);
    }
    for (const [key, value] of Object.entries(instance)) {
      const childSchema = schemaNode.properties?.[key];
      if (childSchema === undefined && schemaNode.additionalProperties === false) {
        errors.push(`${pointer}: additional property "${key}" not allowed`);
        continue;
      }
      if (childSchema) validateInstance(childSchema, value, `${pointer}/${key}`, errors);
    }
  }
}

// Validates one manifest object against the runtime manifest schema and
// returns the list of schema errors (empty when the manifest conforms).
export function validateManifestEntry(manifest, schema) {
  const errors = [];
  if (!schema || typeof schema !== 'object') {
    errors.push('schema: no runtime manifest schema supplied');
    return errors;
  }
  validateInstance(schema, manifest, '$', errors);
  return errors;
}

// ── coverage ────────────────────────────────────────────────────────────────

function skillIdOf(entry) {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry.skill === 'string') return entry.skill;
  if (entry && typeof entry.domain === 'string' && typeof entry.name === 'string') {
    return `${entry.domain}/${entry.name}`;
  }
  return null;
}

// Compares the set of bundle skills against the set of manifests. Both inputs
// accept objects carrying a skill identity or bare identity strings.
export function manifestCoverage(skills, manifests) {
  const skillIds = [...new Set((skills ?? []).map(skillIdOf).filter(Boolean))].sort();
  const manifestIds = [...new Set((manifests ?? []).map(skillIdOf).filter(Boolean))].sort();
  const skillSet = new Set(skillIds);
  const manifestSet = new Set(manifestIds);
  const missing = skillIds.filter((id) => !manifestSet.has(id));
  const extra = manifestIds.filter((id) => !skillSet.has(id));
  return {
    skills: skillIds.length,
    manifests: manifestIds.length,
    missing,
    extra,
    complete: missing.length === 0 && extra.length === 0,
  };
}

// ── consistency ─────────────────────────────────────────────────────────────

function sortedList(value) {
  return Array.isArray(value) ? [...value].map(String).sort() : [];
}

// Compares a stored manifest against the manifest freshly derived from the
// current frontmatter (the "expected" manifest). Only the fields the frontmatter
// owns are compared; the frontmatterHash staleness check lives in the auditor.
export function manifestInconsistencies(manifest, expected) {
  const issues = [];
  if (!manifest || typeof manifest !== 'object') return ['manifest is not an object'];
  if (!expected || typeof expected !== 'object') return ['expected manifest is not an object'];

  const guardrails = manifest.guardrails ?? {};
  const expectedGuardrails = expected.guardrails ?? {};
  if (guardrails.risk !== expectedGuardrails.risk) {
    issues.push(`guardrails.risk: manifest has ${JSON.stringify(guardrails.risk)}, frontmatter derives ${JSON.stringify(expectedGuardrails.risk)}`);
  }
  if (guardrails.trustTier !== expectedGuardrails.trustTier) {
    issues.push(`guardrails.trustTier: manifest has ${JSON.stringify(guardrails.trustTier)}, frontmatter derives ${JSON.stringify(expectedGuardrails.trustTier)}`);
  }
  if (guardrails.approvalRequired !== expectedGuardrails.approvalRequired) {
    issues.push(`guardrails.approvalRequired: manifest has ${JSON.stringify(guardrails.approvalRequired)}, frontmatter derives ${JSON.stringify(expectedGuardrails.approvalRequired)}`);
  }
  if (JSON.stringify(sortedList(guardrails.sideEffects)) !== JSON.stringify(sortedList(expectedGuardrails.sideEffects))) {
    issues.push(`guardrails.sideEffects: manifest has ${JSON.stringify(guardrails.sideEffects ?? null)}, frontmatter derives ${JSON.stringify(expectedGuardrails.sideEffects ?? null)}`);
  }
  if (JSON.stringify(sortedList(guardrails.approvalFor)) !== JSON.stringify(sortedList(expectedGuardrails.approvalFor))) {
    issues.push(`guardrails.approvalFor: manifest has ${JSON.stringify(guardrails.approvalFor ?? null)}, frontmatter derives ${JSON.stringify(expectedGuardrails.approvalFor ?? null)}`);
  }

  const execution = manifest.execution ?? {};
  const expectedExecution = expected.execution ?? {};
  if (execution.modelTier !== expectedExecution.modelTier) {
    issues.push(`execution.modelTier: manifest has ${JSON.stringify(execution.modelTier)}, frontmatter derives ${JSON.stringify(expectedExecution.modelTier)}`);
  }
  if (execution.maxTurns !== expectedExecution.maxTurns) {
    issues.push(`execution.maxTurns: manifest has ${JSON.stringify(execution.maxTurns)}, frontmatter derives ${JSON.stringify(expectedExecution.maxTurns)}`);
  }

  const allow = Array.isArray(execution.tools?.allow) ? execution.tools.allow : [];
  const deny = Array.isArray(execution.tools?.deny) ? execution.tools.deny : [];
  const overlap = allow.filter((tool) => deny.includes(tool));
  if (overlap.length) {
    issues.push(`execution.tools: allow and deny lists share ${JSON.stringify(overlap)}`);
  }
  return issues;
}

// ── auditor ─────────────────────────────────────────────────────────────────

export function loadRuntimeManifestSchema(root = process.cwd()) {
  const file = path.join(root, SCHEMA_REL_PATH);
  if (!existsSync(file)) throw new Error(`runtime manifest schema not found: ${file}`);
  return JSON.parse(readFileSync(file, 'utf8'));
}

export function validateRuntimeManifests(root = process.cwd()) {
  const schema = loadRuntimeManifestSchema(root);
  const inputs = collectManifestInputs(root);
  const bySkill = new Map(inputs.map((input) => [input.skill, input]));
  const manifestsDir = path.join(root, '.agents', 'skills', 'platform', 'manifests');
  const fileNames = existsSync(manifestsDir)
    ? readdirSync(manifestsDir).filter((name) => name.endsWith(MANIFEST_SUFFIX)).sort()
    : [];

  const schemaErrors = [];
  const stale = [];
  const inconsistent = [];
  const orphanManifests = [];
  const coveredSkills = new Set();

  for (const fileName of fileNames) {
    let manifest = null;
    try {
      manifest = JSON.parse(readFileSync(path.join(manifestsDir, fileName), 'utf8'));
    } catch {
      schemaErrors.push({ file: fileName, skill: null, errors: ['file is not valid JSON'] });
      continue;
    }
    const skill = manifest && typeof manifest.skill === 'string' ? manifest.skill : null;
    if (!skill || !bySkill.has(skill)) {
      orphanManifests.push({ file: fileName, skill });
      continue;
    }
    coveredSkills.add(skill);
    const entryErrors = validateManifestEntry(manifest, schema);
    if (entryErrors.length) schemaErrors.push({ file: fileName, skill, errors: entryErrors });
    const expected = bySkill.get(skill).manifest;
    if (manifest.frontmatterHash !== expected.frontmatterHash) {
      stale.push({
        skill,
        file: fileName,
        manifestHash: manifest.frontmatterHash ?? null,
        expectedHash: expected.frontmatterHash,
      });
    }
    const issues = manifestInconsistencies(manifest, expected);
    if (issues.length) inconsistent.push({ skill, file: fileName, issues });
  }

  const missing = inputs
    .filter((input) => !coveredSkills.has(input.skill))
    .map((input) => ({ skill: input.skill, file: manifestFileName(input.skill) }));
  const extra = orphanManifests;

  const errors = [];
  for (const entry of schemaErrors) {
    for (const message of entry.errors) errors.push(`${entry.file}: ${message}`);
  }
  for (const entry of missing) errors.push(`missing manifest for ${entry.skill} (expected ${entry.file})`);
  for (const entry of extra) errors.push(`manifest ${entry.file} has no bundle skill (declares ${entry.skill ?? 'no skill field'})`);
  for (const entry of stale) errors.push(`stale manifest for ${entry.skill}: frontmatter changed since generation`);
  for (const entry of inconsistent) {
    for (const issue of entry.issues) errors.push(`${entry.file}: ${issue}`);
  }

  return {
    tool: 'validate-runtime-manifests.mjs',
    root,
    schema: SCHEMA_REL_PATH,
    manifestsDir: MANIFESTS_REL_DIR,
    skills: inputs.length,
    manifests: fileNames.length,
    coverage: {
      total: inputs.length,
      covered: coveredSkills.size,
      missing,
      extra,
      complete: missing.length === 0 && extra.length === 0,
    },
    stale,
    inconsistent,
    schemaErrors,
    errors,
    warnings: [],
    status: errors.length ? 'fail' : 'pass',
  };
}

function printHuman(report) {
  console.log('validate-runtime-manifests - runtime manifest audit');
  console.log(`scope: ${report.manifestsDir} (${report.manifests} manifests over ${report.skills} bundle skills)`);
  console.log(`coverage: complete=${report.coverage.complete} missing=${report.coverage.missing.length} extra=${report.coverage.extra.length}`);
  console.log(`drift: stale=${report.stale.length} inconsistent=${report.inconsistent.length} schemaErrors=${report.schemaErrors.length}`);
  if (report.errors.length === 0) {
    console.log('status: pass');
    return;
  }
  for (const message of report.errors) console.log(`  ${message}`);
  console.log(`status: ${report.status}`);
}

function parseArgs(argv) {
  const args = { json: false, check: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') args.json = true;
    else if (arg === '--check') args.check = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return args;
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log('usage: node validate-runtime-manifests.mjs [--json] [--check]');
    console.log('  --json   emit machine-readable JSON');
    console.log('  --check  exit 1 when the manifests directory has any error');
    return 0;
  }

  let report;
  try {
    report = validateRuntimeManifests(process.cwd());
  } catch (error) {
    console.error(`validate-runtime-manifests: ${error?.message ?? error}`);
    return 2;
  }

  const payload = { ...report, mode: args.check ? 'check' : 'dry-run' };
  if (args.json) console.log(JSON.stringify(payload, null, 2));
  else printHuman(payload);

  if (args.check && payload.status !== 'pass') return 1;
  return 0;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main().then((code) => process.exit(code)).catch((error) => {
  console.error(`validate-runtime-manifests: ${error?.message ?? error}`);
  process.exit(2);
});
