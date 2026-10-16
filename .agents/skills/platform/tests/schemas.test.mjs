import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const schemasDir = path.join(root, '.agents', 'skills', 'platform', 'schemas');

const loadSchema = async (name) => JSON.parse(await fs.readFile(path.join(schemasDir, name), 'utf8'));

// Minimal JSON Schema validator for the subset used by the platform artifact
// schemas. No runtime dependency is available in this repo, so the subset is
// validated directly — same approach as delegation-brief.test.mjs.

const typeOf = (value) => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
};

const matchesType = (value, type) =>
  Array.isArray(type) ? type.some((t) => matchesType(value, t)) : typeOf(value) === type ||
  (type === 'number' && typeof value === 'number');

function validate(schemaNode, instance, pointer, errors) {
  if (schemaNode === true || schemaNode === undefined) return;
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
  if (schemaNode.enum && !schemaNode.enum.some((v) => JSON.stringify(v) === JSON.stringify(instance))) {
    errors.push(`${pointer}: ${JSON.stringify(instance)} not in enum`);
  }
  if (typeof instance === 'string') {
    if (schemaNode.minLength !== undefined && instance.length < schemaNode.minLength) {
      errors.push(`${pointer}: shorter than minLength ${schemaNode.minLength}`);
    }
    if (schemaNode.pattern && !new RegExp(schemaNode.pattern).test(instance)) {
      errors.push(`${pointer}: does not match pattern ${schemaNode.pattern}`);
    }
  }
  if (Array.isArray(instance)) {
    if (schemaNode.minItems !== undefined && instance.length < schemaNode.minItems) {
      errors.push(`${pointer}: fewer than minItems ${schemaNode.minItems}`);
    }
    instance.forEach((item, index) => {
      if (schemaNode.items) validate(schemaNode.items, item, `${pointer}/${index}`, errors);
    });
  }
  if (instance && typeof instance === 'object') {
    for (const key of schemaNode.required ?? []) {
      if (instance[key] === undefined) errors.push(`${pointer}: missing required "${key}"`);
    }
    for (const [key, value] of Object.entries(instance)) {
      const childSchema = schemaNode.properties?.[key];
      if (childSchema === undefined && schemaNode.additionalProperties === false) {
        errors.push(`${pointer}: additional property "${key}" not allowed`);
        continue;
      }
      if (childSchema) validate(childSchema, value, `${pointer}/${key}`, errors);
    }
  }
}

const validateAgainst = (schema, instance) => {
  const errors = [];
  validate(schema, instance, '$', errors);
  return errors;
};

const implementSchema = await loadSchema('implement-schema.json');
const publishSchema = await loadSchema('publish-open-pr-schema.json');

const validImplementArtifact = () => ({
  status: 'completed',
  changes: ['evals/routing/parse.js', 'evals/routing/parse.test.js'],
  validation: { acceptanceCriteriaMet: true, commands: ['node --test evals/routing/parse.test.js'] },
  commitSha: '9f2c1ab4d5e6f70819a2b3c4d5e6f708192a3b4c',
  branch: 'feat/issue-28-routing-csv-validator',
  nextConsumer: 'publish-open-pr',
  riskRemaining: 'None identified.',
  qualityGateResults: { gateIde: 'pass', gatePreCommit: 'pass', gateCi: 'pass' },
});

const validPublishArtifact = () => ({
  status: 'completed',
  branch: 'feat/issue-214-routing-audit',
  prNumber: 217,
  prUrl: 'https://github.com/quantumquirkxyz/skills-quirk/pull/217',
  title: 'fix: route audit findings 6-8 (fixtures, citations, schemas)',
  validation: { passed: true, commands: ['node --test .agents/skills/platform/tests/'] },
  gateCiResult: { status: 'pass', failingChecks: [] },
  reviewers: ['m-collaborator'],
  labels: ['ready-for-human'],
});

test('review-findings schema copies parse and match the canonical schema byte-for-byte', async () => {
  const canonical = await fs.readFile(path.join(root, 'schema', 'review-findings-schema.json'), 'utf8');
  const platformCopy = await fs.readFile(path.join(root, '.agents', 'skills', 'platform', 'schemas', 'review-findings-schema.json'), 'utf8');
  const fixtureCopy = await fs.readFile(path.join(root, 'fixtures', 'repos', 'mini-bundle', 'schema', 'review-findings-schema.json'), 'utf8');

  assert.doesNotThrow(() => JSON.parse(canonical));
  assert.doesNotThrow(() => JSON.parse(platformCopy));
  assert.doesNotThrow(() => JSON.parse(fixtureCopy));
  assert.equal(platformCopy, canonical, 'platform review-findings schema copy must match schema/review-findings-schema.json');
  assert.equal(fixtureCopy, canonical, 'mini-bundle review-findings schema copy must match schema/review-findings-schema.json');
});

test('implement-schema.json parses and declares its root contract', () => {
  assert.equal(implementSchema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(implementSchema.title, 'ImplementArtifact');
  assert.equal(implementSchema.type, 'object');
  for (const field of ['status', 'changes', 'validation', 'commitSha', 'branch', 'nextConsumer', 'blockedBy', 'riskRemaining', 'qualityGateResults']) {
    assert.ok(implementSchema.properties[field], `implement-schema.json must declare ${field}`);
  }
  for (const field of ['status', 'nextConsumer', 'validation', 'qualityGateResults']) {
    assert.ok(implementSchema.required.includes(field), `implement-schema.json must require ${field}`);
  }
});

test('publish-open-pr-schema.json parses and declares its root contract', () => {
  assert.equal(publishSchema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(publishSchema.title, 'PublishOpenPrArtifact');
  assert.equal(publishSchema.type, 'object');
  for (const field of ['status', 'branch', 'prNumber', 'prUrl', 'title', 'validation', 'gateCiResult', 'reviewers', 'labels']) {
    assert.ok(publishSchema.properties[field], `publish-open-pr-schema.json must declare ${field}`);
  }
  for (const field of ['status', 'branch', 'prNumber', 'prUrl', 'title', 'validation', 'gateCiResult']) {
    assert.ok(publishSchema.required.includes(field), `publish-open-pr-schema.json must require ${field}`);
  }
});

test('a synthetic ImplementArtifact validates', () => {
  assert.deepEqual(validateAgainst(implementSchema, validImplementArtifact()), []);
});

test('a synthetic PublishOpenPrArtifact validates', () => {
  assert.deepEqual(validateAgainst(publishSchema, validPublishArtifact()), []);
});

test('an ImplementArtifact missing nextConsumer fails', () => {
  const artifact = validImplementArtifact();
  delete artifact.nextConsumer;
  const errors = validateAgainst(implementSchema, artifact);
  assert.ok(errors.some((e) => e.includes('missing required "nextConsumer"')), errors.join('; '));
});

test('an ImplementArtifact with an unknown status fails', () => {
  const errors = validateAgainst(implementSchema, { ...validImplementArtifact(), status: 'done' });
  assert.ok(errors.some((e) => e.includes('not in enum')), errors.join('; '));
});

test('an ImplementArtifact with a failing gate enum value fails', () => {
  const artifact = validImplementArtifact();
  artifact.qualityGateResults = { gateIde: 'pass', gatePreCommit: 'pass', gateCi: 'red' };
  const errors = validateAgainst(implementSchema, artifact);
  assert.ok(errors.some((e) => e.includes('not in enum')), errors.join('; '));
});

test('a PublishOpenPrArtifact with a non-integer prNumber fails', () => {
  const errors = validateAgainst(publishSchema, { ...validPublishArtifact(), prNumber: '217' });
  assert.ok(errors.some((e) => e.includes('expected "integer"')), errors.join('; '));
});

test('a PublishOpenPrArtifact missing gateCiResult fails', () => {
  const artifact = validPublishArtifact();
  delete artifact.gateCiResult;
  const errors = validateAgainst(publishSchema, artifact);
  assert.ok(errors.some((e) => e.includes('missing required "gateCiResult"')), errors.join('; '));
});

test('the skills that cite these schemas resolve the paths', async () => {
  const citations = [
    ['.agents/skills/delivery/implement/SKILL.md', '.agents/skills/platform/schemas/implement-schema.json'],
    ['.agents/skills/routing/publish-open-pr/SKILL.md', '.agents/skills/platform/schemas/publish-open-pr-schema.json'],
  ];
  for (const [skillRel, schemaRel] of citations) {
    const skill = await fs.readFile(path.join(root, skillRel), 'utf8');
    assert.ok(skill.includes(schemaRel), `${skillRel} must cite ${schemaRel}`);
    await fs.access(path.join(root, schemaRel));
  }
});
