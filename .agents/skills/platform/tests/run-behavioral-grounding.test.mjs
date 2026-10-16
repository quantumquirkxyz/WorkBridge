import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateFixture } from '../../../../evals/run-behavioral.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..');
const RUNNER = path.join(REPO_ROOT, 'evals', 'run-behavioral.mjs');
const BEHAVIORAL_DIR = path.join(REPO_ROOT, 'evals', 'behavioral');

// validateFixture resolves skill names against the bundle; a one-skill set is
// enough for a synthetic fixture.
const BUNDLE_SKILLS = new Set(['project/to-spec']);

function rubricItem(id) {
  return {
    id,
    criterion: `The response demonstrates ${id} against the recorded evidence.`,
    levels: {
      '4': 'every observable element is present and explicitly named',
      '2': 'the element is named but its supporting evidence is missing',
      '0': 'no observable element appears anywhere in the response',
    },
  };
}

// A fixture that satisfies every schema rule except whatever grounding list
// the individual test injects.
function baseFixture(grounding) {
  return {
    id: 'synthetic-grounding',
    skill: 'project/to-spec',
    skillVersion: '1',
    scenario: 'A synthetic scenario long enough to satisfy the fixture schema validation.',
    baseline: 'without-skill',
    trials: 1,
    grounding,
    rubric: {
      instructionFollowing: [rubricItem('if-1'), rubricItem('if-2'), rubricItem('if-3')],
      goalCompletion: [rubricItem('gc-1'), rubricItem('gc-2'), rubricItem('gc-3')],
    },
    assertions: [
      { id: 'a1', type: 'deterministic', category: 'process', check: { kind: 'artifact_contains_all', values: ['Goals'] } },
    ],
  };
}

test('a grounding entry that does not resolve fails fixture validation', async () => {
  // The exact bug class this check exists for: a citation with a typo in the
  // skill directory name (publish-openpr instead of publish-open-pr).
  const fixture = baseFixture([
    '.agents/skills/routing/publish-open-pr/SKILL.md#Contract (never open a PR before gate-ci has passed)',
    '.agents/skills/routing/publish-openpr/SKILL.md#Process step 6 (push the branch, then open the PR)',
  ]);

  const errors = await validateFixture(fixture, 'synthetic.json', BUNDLE_SKILLS);

  assert.equal(errors.length, 1, `expected exactly one grounding error, got:\n${errors.join('\n')}`);
  assert.match(errors[0], /grounding path does not resolve/);
  assert.match(errors[0], /publish-openpr/);
});

test('a fragment-suffixed grounding path resolves against the repo', async () => {
  const fixture = baseFixture([
    'evals/run-behavioral.mjs#validateFixture (the fixture schema check)',
    '.agents/skills/platform/skill-graph.mjs#saveGraph (deterministic persistence)',
    '.agents/skills/platform/graph/skill-graph.json',
    // External citations are not repo-relative paths and must not be resolved.
    'https://arxiv.org/abs/2405.14831 (HippoRAG, external research)',
  ]);

  const errors = await validateFixture(fixture, 'synthetic.json', BUNDLE_SKILLS);

  assert.deepEqual(errors, [], `a resolvable fragment path must produce no errors, got:\n${errors.join('\n')}`);
});

test('a trailing-annotation grounding path without a fragment resolves', async () => {
  const fixture = baseFixture([
    '.agents/skills/routing/ask-to/references/routing-rules.md (selection criteria and fallback policy)',
    'docs/reference/agents/work-item-format.md',
  ]);

  const errors = await validateFixture(fixture, 'synthetic.json', BUNDLE_SKILLS);

  assert.deepEqual(errors, [], `annotation-suffixed paths must resolve, got:\n${errors.join('\n')}`);
});

test('grounding is optional but validated when present', async () => {
  const omitted = baseFixture(undefined);
  assert.deepEqual(await validateFixture(omitted, 'synthetic.json', BUNDLE_SKILLS), []);

  const wrongShape = baseFixture('.agents/skills/platform/skill-graph.mjs');
  const errors = await validateFixture(wrongShape, 'synthetic.json', BUNDLE_SKILLS);
  assert.ok(errors.some((error) => /grounding must be an array/.test(error)), errors.join('\n'));
});

test('every shipped fixture passes validation, grounding included', async () => {
  const names = fs.readdirSync(BEHAVIORAL_DIR).filter((name) => name.endsWith('.json')).sort();
  assert.ok(names.length >= 12, `the wave-1 contract guarantees at least 12 fixtures, saw ${names.length}`);
  for (const name of names) {
    const fixture = JSON.parse(fs.readFileSync(path.join(BEHAVIORAL_DIR, name), 'utf8'));
    const errors = await validateFixture(fixture, path.join(BEHAVIORAL_DIR, name), new Set([fixture.skill]));
    assert.deepEqual(errors, [], `${name} failed validation:\n${errors.join('\n')}`);
  }
});

test('the real fixture suite passes --all with grounding validation active', () => {
  const result = spawnSync('node', [RUNNER, '--all'], { encoding: 'utf8', cwd: REPO_ROOT });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /behavioural fixtures: \d+ file\(s\), 0 broken schema, 0 crashed/);
  assert.match(result.stdout, /status: pass/);
  const rows = result.stdout.split('\n').filter((line) => line.startsWith('ok  ') || line.startsWith('FAIL'));
  assert.ok(rows.length >= 12, `expected at least 12 fixture rows, saw:\n${result.stdout}`);
  for (const row of rows) {
    const match = row.match(/\((\d+) failed\)/);
    assert.ok(match, `row is missing the failure count: ${row}`);
    assert.equal(Number(match[1]), 0, row);
  }
});
