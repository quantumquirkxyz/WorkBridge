import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkSkillSample, parseFrontmatter, bodyLineCount, SPEC_PORTABLE_FIELDS } from '../validate-spec-compliance.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLATFORM_DIR = path.resolve(HERE, '..');
const REPO_ROOT = path.resolve(PLATFORM_DIR, '..', '..', '..');
const VALIDATOR = path.join(PLATFORM_DIR, 'validate-spec-compliance.mjs');
const BUNDLE_SKILLS = 265; // 253 bundle skills + 12 platform skills

function runValidator(args) {
  return spawnSync('node', [VALIDATOR, ...args], { encoding: 'utf8', cwd: REPO_ROOT });
}

function writeSkill(root, dirName, frontmatter, body = '# Purpose\n\nBody.\n') {
  const dir = path.join(root, dirName);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\n${frontmatter}\n---\n${body}`);
  return dir;
}

function fixtureRoot(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `quirk-spec-${label}-`));
}

function codes(findings) {
  return findings.map((finding) => finding.code).sort();
}

function codesFor(result, severity) {
  return codes(result[severity === 'error' ? 'errors' : 'warnings']);
}

const cleanFrontmatter = (dirName) => `name: "${dirName}"
description: "Do the thing when the user asks for the thing."
license: "MIT"`;

// --- Error classes -----------------------------------------------------------

test('name must equal the parent directory name', () => {
  const { errors } = checkSkillSample({ dirName: 'real-dir', name: 'other-name', description: 'x', license: 'MIT' });
  assert.ok(errors.some((e) => e.code === 'name-dir-mismatch'));
});

test('name must be present', () => {
  const { errors } = checkSkillSample({ dirName: 'silent', name: null, description: 'x', license: 'MIT' });
  assert.ok(errors.some((e) => e.code === 'name-missing'));
});

test('consecutive hyphens in name are an error', () => {
  const { errors } = checkSkillSample({ dirName: 'data--pipeline', name: 'data--pipeline', description: 'x', license: 'MIT' });
  assert.deepEqual(errors.map((e) => e.code), ['name-consecutive-hyphens']);
});

test('uppercase or underscore names are invalid', () => {
  const upper = checkSkillSample({ dirName: 'Rag-Pipeline', name: 'Rag-Pipeline', description: 'x', license: 'MIT' });
  assert.deepEqual(upper.errors.map((e) => e.code), ['name-invalid']);
  const underscore = checkSkillSample({ dirName: 'rag_pipeline', name: 'rag_pipeline', description: 'x', license: 'MIT' });
  assert.deepEqual(underscore.errors.map((e) => e.code), ['name-invalid']);
});

test('reserved words in name are an error', () => {
  for (const name of ['claude-helper', 'anthropic-skills', 'claude']) {
    const { errors } = checkSkillSample({ dirName: name, name, description: 'x', license: 'MIT' });
    assert.ok(errors.some((e) => e.code === 'name-reserved-word'), `${name} must trip the reserved-word rule`);
  }
});

test('names over 64 characters are an error', () => {
  const name = `${'a'.repeat(65)}`;
  const { errors } = checkSkillSample({ dirName: name, name, description: 'x', license: 'MIT' });
  assert.ok(errors.some((e) => e.code === 'name-too-long'));
});

test('description must be non-empty', () => {
  for (const description of [null, '', '   ']) {
    const { errors } = checkSkillSample({ dirName: 'd', name: 'd', description, license: 'MIT' });
    assert.ok(errors.some((e) => e.code === 'description-missing'), `description ${JSON.stringify(description)} must fail`);
  }
});

test('description over 1024 characters is an error', () => {
  const { errors } = checkSkillSample({ dirName: 'd', name: 'd', description: 'a'.repeat(1025), license: 'MIT' });
  assert.ok(errors.some((e) => e.code === 'description-too-long'));
});

test('description with an XML tag is an error', () => {
  const { errors } = checkSkillSample({ dirName: 'd', name: 'd', description: 'Parses the <payload> when triggered.', license: 'MIT' });
  assert.ok(errors.some((e) => e.code === 'description-xml-tags'));
});

// --- Warning classes ---------------------------------------------------------

test('missing license is a warning, never an error', () => {
  const { errors, warnings } = checkSkillSample({ dirName: 'd', name: 'd', description: 'x', license: null });
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings.map((w) => w.code), ['license-missing']);
});

test('bodies over 500 lines warn', () => {
  const { warnings, errors } = checkSkillSample({ dirName: 'd', name: 'd', description: 'x', license: 'MIT', bodyLines: 501, text: '' });
  assert.deepEqual(errors, []);
  assert.ok(warnings.some((w) => w.code === 'body-too-long' && /501/.test(w.message)));
});

test('a >600-character description without terminal punctuation warns as truncated', () => {
  const truncated = checkSkillSample({ dirName: 'd', name: 'd', description: `${'x'.repeat(600)} tail`, license: 'MIT' });
  assert.ok(truncated.warnings.some((w) => w.code === 'description-truncated'));
  const closed = checkSkillSample({ dirName: 'd', name: 'd', description: `${'x'.repeat(600)}.`, license: 'MIT' });
  assert.equal(closed.warnings.length, 0);
  const shortUnclosed = checkSkillSample({ dirName: 'd', name: 'd', description: 'short unterminated', license: 'MIT' });
  assert.equal(shortUnclosed.warnings.length, 0);
});

test('Windows-style backslash paths warn', () => {
  const { warnings, errors } = checkSkillSample({ dirName: 'd', name: 'd', description: 'x', license: 'MIT', text: 'See references\\windows-path.md for detail.\n' });
  assert.deepEqual(errors, []);
  assert.ok(warnings.some((w) => w.code === 'windows-backslash-path'));
  const posix = checkSkillSample({ dirName: 'd', name: 'd', description: 'x', license: 'MIT', text: 'See references/posix-path.md for detail.\n' });
  assert.equal(posix.warnings.length, 0);
});

test('a spec-clean sample produces no findings', () => {
  const { errors, warnings } = checkSkillSample({ dirName: 'clean-skill', name: 'clean-skill', description: 'Do the thing when asked.', license: 'MIT', bodyLines: 120, text: '# Clean\n' });
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

// --- Parser units ------------------------------------------------------------

test('parseFrontmatter reads quoted, plain, and block-scalar values', () => {
  const quoted = parseFrontmatter('---\nname: "demo"\ndescription: "Do the thing."\nlicense: "MIT"\n---\nBody\n');
  assert.equal(quoted.name, 'demo');
  assert.equal(quoted.description, 'Do the thing.');
  assert.equal(quoted.license, 'MIT');
  const plain = parseFrontmatter('---\nname: demo\ndescription: Do the thing\n---\n');
  assert.equal(plain.name, 'demo');
  const folded = parseFrontmatter('---\nname: demo\ndescription: >\n  Do the thing\n  when triggered\n---\n');
  assert.equal(folded.description, 'Do the thing when triggered');
});

test('bodyLineCount ignores the frontmatter block', () => {
  assert.equal(bodyLineCount('---\nname: d\n---\nline1\nline2\n'), 3);
  assert.equal(bodyLineCount('# no frontmatter\n'), 2);
});

test('the spec-portable field set is the six-field cross-harness contract', () => {
  assert.deepEqual(SPEC_PORTABLE_FIELDS, ['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);
});

// --- CLI behavior ------------------------------------------------------------

test('the CLI exits 1 and names every error code for an invalid fixture bundle', () => {
  const root = fixtureRoot('errors');
  try {
    writeSkill(root, 'mismatched', 'name: "other"\ndescription: "Valid description."\nlicense: "MIT"');
    writeSkill(root, 'data--pipeline', 'name: "data--pipeline"\ndescription: "Valid description."\nlicense: "MIT"');
    writeSkill(root, 'claude-helper', 'name: "claude-helper"\ndescription: "Valid description."\nlicense: "MIT"');
    writeSkill(root, 'too-long', `name: "${'a'.repeat(65)}"\ndescription: "Valid description."\nlicense: "MIT"`);
    writeSkill(root, 'no-description', 'name: "no-description"\nlicense: "MIT"');
    writeSkill(root, 'long-description', `name: "long-description"\ndescription: "${'a'.repeat(1025)}"\nlicense: "MIT"`);
    writeSkill(root, 'xml-description', 'name: "xml-description"\ndescription: "Parses the <payload> when triggered."\nlicense: "MIT"');

    const result = runValidator(['--path', root, '--json']);
    assert.equal(result.status, 1, `expected exit 1\n${result.stdout}\n${result.stderr}`);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, 'fail');
    assert.equal(payload.skills, 7);
    const found = new Set(payload.perSkill.flatMap((skill) => skill.errors.map((e) => e.code)));
    for (const code of [
      'name-dir-mismatch', 'name-consecutive-hyphens', 'name-reserved-word', 'name-too-long',
      'description-missing', 'description-too-long', 'description-xml-tags',
    ]) {
      assert.ok(found.has(code), `expected error code ${code} in ${[...found].join(', ')}`);
    }
    const failing = new Set(payload.perSkill.filter((s) => s.errors.length).map((s) => s.skill));
    assert.ok(failing.has('mismatched') && failing.has('data--pipeline') && failing.has('xml-description'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('the CLI exits 0 on warning-only fixtures and still reports every warning code', () => {
  const root = fixtureRoot('warnings');
  try {
    writeSkill(root, 'missing-license', 'name: "missing-license"\ndescription: "Valid description."');
    const fatBody = `${'Body line.\n'.repeat(501)}`;
    writeSkill(root, 'fat-body', 'name: "fat-body"\ndescription: "Valid description."\nlicense: "MIT"', fatBody);
    writeSkill(root, 'truncated', `name: "truncated"\ndescription: "${'x'.repeat(600)} tail"\nlicense: "MIT"`);
    writeSkill(root, 'backslash', 'name: "backslash"\ndescription: "Valid description."\nlicense: "MIT"', 'See references\\win.md.\n');

    const result = runValidator(['--path', root, '--json']);
    assert.equal(result.status, 0, `warnings must not fail the gate\n${result.stdout}\n${result.stderr}`);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, 'pass');
    assert.deepEqual(payload.errors, []);
    const found = new Set(payload.perSkill.flatMap((skill) => skill.warnings.map((w) => w.code)));
    for (const code of ['license-missing', 'body-too-long', 'description-truncated', 'windows-backslash-path']) {
      assert.ok(found.has(code), `expected warning code ${code} in ${[...found].join(', ')}`);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('the CLI exits 0 with no findings for a spec-clean fixture bundle', () => {
  const root = fixtureRoot('clean');
  try {
    writeSkill(root, 'alpha-skill', cleanFrontmatter('alpha-skill'));
    writeSkill(root, 'beta-skill', cleanFrontmatter('beta-skill'));
    const result = runValidator(['--path', root]);
    assert.equal(result.status, 0, result.stdout);
    assert.match(result.stdout, /No findings/);
    assert.match(result.stdout, /every skill body is within 500 lines/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a missing --path target is a usage error (exit 2)', () => {
  const result = runValidator(['--path', '/tmp/quirk-spec-does-not-exist']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Skills root not found/);
});

test('the real bundle passes the spec gate after the license edit', () => {
  const result = runValidator([]);
  assert.equal(result.status, 0, result.stdout);
  const json = runValidator(['--json']);
  assert.equal(json.status, 0, json.stderr);
  const payload = JSON.parse(json.stdout);
  assert.equal(payload.status, 'pass');
  assert.deepEqual(payload.errors, []);
  assert.ok(payload.skills >= BUNDLE_SKILLS, `expected at least ${BUNDLE_SKILLS} skills, got ${payload.skills}`);
  assert.deepEqual(payload.specFields, SPEC_PORTABLE_FIELDS);
});

test('every real-bundle skill declares a name matching its directory', () => {
  const payload = JSON.parse(runValidator(['--json']).stdout);
  const offenders = payload.perSkill.filter((skill) => skill.errors.some((e) => e.code.startsWith('name-')));
  assert.deepEqual(offenders.map((skill) => skill.skill), []);
});
