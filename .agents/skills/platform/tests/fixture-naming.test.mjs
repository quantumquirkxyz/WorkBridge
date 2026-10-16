import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLATFORM_DIR = path.resolve(HERE, '..');
const REPO_ROOT = path.resolve(PLATFORM_DIR, '..', '..', '..');
const BEHAVIORAL_DIR = path.join(PLATFORM_DIR, 'fixtures', 'behavioral');
const SKILLS_ROOT = path.join(REPO_ROOT, '.agents', 'skills');

// Rename map from the completeness audit: legacy, domain-prefixed filenames
// that disagreed with the `skill` field of the fixtures they carried.
const RENAMED = {
  'backend-microservices.json': 'microservices.json',
  'foundation-agent-canvas.json': 'agent-canvas.json',
  'foundation-context-engine.json': 'context-engine.json',
  'foundation-domain-modeling.json': 'domain-modeling.json',
  'foundation-observability.json': 'observability.json',
  'project-project-viability.json': 'project-viability.json',
  'delivery-diagnosing-bugs.json': 'diagnosing-bugs.json',
};

// The shared multi-skill set that was merged into the per-skill files.
const MERGED_AWAY = 'core-triggers.json';

// Same walk as validate-skills.mjs collectSkillDirs: a directory holding a
// SKILL.md is a skill, otherwise the walk descends, and the top-level
// 'platform' subtree is ignored (the validator's `ignored` set).
const VALIDATOR_IGNORED = new Set(['platform']);

function behavioralFiles() {
  return fs.readdirSync(BEHAVIORAL_DIR).filter((name) => name.endsWith('.json')).sort();
}

function loadFile(name) {
  return JSON.parse(fs.readFileSync(path.join(BEHAVIORAL_DIR, name), 'utf8'));
}

function parseFrontmatter(text) {
  if (!text.startsWith('---')) return {};
  const end = text.indexOf('\n---', 3);
  if (end === -1) return {};
  const out = {};
  let active = null;
  for (const line of text.slice(4, end).split(/\r?\n/)) {
    const key = line.match(/^([A-Za-z][A-Za-z0-9-]*):\s*(.*)$/);
    if (key) {
      active = key[1];
      out[active] = key[2].replace(/^["']|["']$/g, '');
      continue;
    }
  }
  return out;
}

function collectSkillDirs(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || VALIDATOR_IGNORED.has(entry.name)) continue;
    const child = path.join(dir, entry.name);
    if (fs.existsSync(path.join(child, 'SKILL.md'))) {
      out.push(child);
    } else {
      collectSkillDirs(child, out);
    }
  }
  return out;
}

// --- (a) single-skill files are named after their skill ---------------------

test('every single-skill behavioral fixture file is named <skill>.json', () => {
  const offenders = [];
  for (const name of behavioralFiles()) {
    const skills = new Set(loadFile(name).fixtures.map((fixture) => fixture.skill));
    if (skills.size !== 1) continue; // multi-skill sets are covered by the next test
    const [skill] = [...skills];
    if (typeof skill !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(skill)) continue; // not a plain skill name
    if (name !== `${skill}.json`) {
      offenders.push(`${name} declares skill "${skill}"`);
    }
  }
  assert.deepStrictEqual(offenders, [], `filename/skill mismatches: ${offenders.join('; ')}`);
});

test('no multi-skill behavioral fixture files remain', () => {
  const multi = behavioralFiles()
    .map((name) => ({ name, skills: new Set(loadFile(name).fixtures.map((fixture) => fixture.skill)) }))
    .filter((entry) => entry.skills.size > 1)
    .map((entry) => `${entry.name} declares [${[...entry.skills].join(', ')}]`);
  assert.deepStrictEqual(multi, [], `multi-skill fixture files must be merged away: ${multi.join('; ')}`);
});

// --- (b) fixture ids are globally unique ------------------------------------

test('fixture ids are globally unique across the behavioral directory', () => {
  const seen = new Map();
  const duplicates = [];
  for (const name of behavioralFiles()) {
    for (const fixture of loadFile(name).fixtures) {
      if (seen.has(fixture.id)) {
        duplicates.push(`${fixture.id} appears in ${seen.get(fixture.id)} and ${name}`);
      } else {
        seen.set(fixture.id, name);
      }
    }
  }
  assert.deepStrictEqual(duplicates, [], `duplicate fixture ids: ${duplicates.join('; ')}`);
});

// --- (c) the legacy paths are gone, the canonical paths exist ---------------

test('renamed behavioral fixtures exist at their canonical paths and the legacy paths are gone', () => {
  const present = new Set(behavioralFiles());
  const legacyLeftovers = Object.keys(RENAMED).filter((old) => present.has(old));
  assert.deepStrictEqual(legacyLeftovers, [], `legacy fixture files still present: ${legacyLeftovers.join(', ')}`);
  const missingCanonical = Object.values(RENAMED).filter((next) => !present.has(next));
  assert.deepStrictEqual(missingCanonical, [], `canonical fixture files missing: ${missingCanonical.join(', ')}`);
  assert.ok(!present.has(MERGED_AWAY), `${MERGED_AWAY} must be deleted after the merge`);
});

// --- (d) every declared fixturesPath resolves to an existing file -----------

// validate-skills.mjs keeps its frontmatter parser and resolution rule
// module-private (it exports nothing and runs main() on import), so this test
// restates the same rule over the same skill set that validator walks: read
// `fixturesPath` from the frontmatter, resolve it against the repo root, and
// require the target file to exist.
test('every SKILL.md fixturesPath resolves to an existing file', () => {
  const unresolved = [];
  for (const skillDir of collectSkillDirs(SKILLS_ROOT)) {
    const skillFile = path.join(skillDir, 'SKILL.md');
    const fm = parseFrontmatter(fs.readFileSync(skillFile, 'utf8'));
    const declared = fm.fixturesPath;
    if (!declared || declared === '[]') continue;
    const resolved = path.resolve(REPO_ROOT, String(declared));
    if (!fs.existsSync(resolved)) {
      unresolved.push(`${path.relative(REPO_ROOT, skillFile)}: ${declared}`);
    }
  }
  assert.deepStrictEqual(unresolved, [], `unresolved fixturesPath declarations: ${unresolved.join('; ')}`);
});
