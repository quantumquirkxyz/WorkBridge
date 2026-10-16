import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  aggregateArm, buildDelta, loadTranscript, rateOf, renderMarkdown, runFixture, verdictFor,
} from '../../../../evals/run-behavioral.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..');
const FIXTURE_DIR = path.join(REPO_ROOT, 'evals', 'behavioral');

// A transcript trial as `scoreArm` records it: an assertion outcome per fixture
// assertion, plus the cost/trial metadata the aggregator sums.
function trial(index, assertions, { passed = true, costUsd = 0.01, durationMs = 1000 } = {}) {
  return {
    trial: index,
    passed: passed && assertions.every((assertion) => assertion.passed),
    assertions,
    tokens: { input: 1000, output: 250 },
    costUsd,
    durationMs,
  };
}

function assertionResult(id, type, category, passed, evidence = 'evidence') {
  return { id, type, category, passed, evidence };
}

function assertBucketCounts(bucket, expected) {
  assert.equal(bucket.passed, expected.passed);
  assert.equal(bucket.failed, expected.failed);
}

/* ----------------------------------------------------- aggregateArm */

test('aggregateArm counts a failed assertion in failed, not just evidence', () => {
  const aggregate = aggregateArm([
    trial(1, [
      assertionResult('a1', 'deterministic', 'process', true),
      assertionResult('a2', 'deterministic', 'outcome', false, 'missing: fixedPoint'),
    ]),
  ]);

  const a2 = aggregate.assertions.find((entry) => entry.id === 'a2');
  assert.equal(a2.passed, 0);
  assert.equal(a2.failed, 1, 'a failed assertion must increment failed');
  assert.deepEqual(a2.evidence, ['trial 1: missing: fixedPoint']);

  assertBucketCounts(aggregate.byType.deterministic, { passed: 1, failed: 1 });
  assertBucketCounts(aggregate.byCategory.process, { passed: 1, failed: 0 });
  assertBucketCounts(aggregate.byCategory.outcome, { passed: 0, failed: 1 });
});

test('aggregateArm keeps per-assertion pass and fail counts consistent with trial outcomes', () => {
  const aggregate = aggregateArm([
    trial(1, [assertionResult('a1', 'deterministic', 'process', true)]),
    trial(2, [assertionResult('a1', 'deterministic', 'process', false, 'second trial failed')], { passed: false }),
    trial(3, [assertionResult('a1', 'deterministic', 'process', false, 'third trial failed')], { passed: false }),
  ]);

  const a1 = aggregate.assertions.find((entry) => entry.id === 'a1');
  assert.equal(a1.passed, 1);
  assert.equal(a1.failed, 2);
  assert.equal(aggregate.trials, 3);
  assert.equal(aggregate.trialsPassed, 1);
  assert.equal(aggregate.passRate, Math.round((1 / 3) * 1000) / 1000);
  assertBucketCounts(aggregate.byCategory.process, { passed: 1, failed: 2 });
});

test('aggregateArm reports zero failures when every assertion passes', () => {
  const aggregate = aggregateArm([
    trial(1, [assertionResult('a1', 'deterministic', 'process', true)]),
  ]);

  assert.equal(aggregate.assertions[0].failed, 0);
  assertBucketCounts(aggregate.byType.deterministic, { passed: 1, failed: 0 });
  assertBucketCounts(aggregate.byCategory.process, { passed: 1, failed: 0 });
});

test('aggregateArm splits pass rates by assertion type', () => {
  const aggregate = aggregateArm([
    trial(1, [
      assertionResult('a1', 'deterministic', 'process', true),
      assertionResult('j1', 'judge', 'outcome', true),
    ]),
    trial(2, [
      assertionResult('a1', 'deterministic', 'process', true),
      assertionResult('j1', 'judge', 'outcome', false, 'judge disagreed'),
    ], { passed: false }),
  ]);

  assertBucketCounts(aggregate.byType.deterministic, { passed: 2, failed: 0 });
  assertBucketCounts(aggregate.byType.judge, { passed: 1, failed: 1 });
});

/* --------------------------------------------------- rateOf / ratios */

test('rateOf divides by the real assertion total, so failures lower the rate', () => {
  assert.equal(rateOf({ passed: 2, failed: 1 }), Math.round((2 / 3) * 1000) / 1000);
  assert.equal(rateOf({ passed: 0, failed: 3 }), 0);
  assert.equal(rateOf({ passed: 3, failed: 0 }), 1);
  assert.equal(rateOf({ passed: 0, failed: 0 }), null);
  assert.equal(rateOf(null), null);
});

/* ------------------------------------------------- buildDelta + verdictFor */

// Baseline: everything passes and costs nothing. With-skill arm: the same
// assertions now fail, at a higher cost.
function failingWithArm(baselineCost = 0.01) {
  const assertions = [
    assertionResult('a1', 'deterministic', 'process', false, 'missing section'),
    assertionResult('a2', 'deterministic', 'outcome', false, 'missing field'),
    assertionResult('a3', 'deterministic', 'style', false, 'forbidden string present'),
  ];
  return aggregateArm([trial(1, assertions, { passed: false, costUsd: baselineCost + 0.02 })]);
}

function passingBaselineArm(cost = 0.01) {
  const assertions = [
    assertionResult('a1', 'deterministic', 'process', true),
    assertionResult('a2', 'deterministic', 'outcome', true),
    assertionResult('a3', 'deterministic', 'style', true),
  ];
  return aggregateArm([trial(1, assertions, { costUsd: cost })]);
}

test('buildDelta propagates failed counts into category deltas', () => {
  const delta = buildDelta(failingWithArm(), passingBaselineArm());

  assert.deepEqual(delta.assertions[0], {
    id: 'a1', type: 'deterministic', category: 'process',
    baseline: 1, withSkill: 0, delta: -1,
  });
  assert.equal(delta.categories.process.withSkill, 0);
  assert.equal(delta.categories.process.baseline, 1);
  assert.equal(delta.categories.process.delta, -1);
  assert.equal(delta.categories.outcome.delta, -1);
  assert.equal(delta.cost.delta, 0.02);
});

test('a with-skill arm that fails more assertions is a regression verdict', () => {
  const delta = buildDelta(failingWithArm(), passingBaselineArm());
  const fixture = { id: 'synthetic', skill: 'project/to-spec', trials: 1, costBudget: { costUsd: 99 } };
  const verdict = verdictFor(delta, fixture, 'live');

  assert.ok(
    verdict.verdict === 'regression-negative-delta' || verdict.verdict === 'regression-zero-delta-at-positive-cost',
    `expected a regression verdict, got ${verdict.verdict}`,
  );
  assert.match(verdict.reason, /worse with the skill|paid for and changed nothing/);
});

test('regression-zero-delta-at-positive-cost is reachable when outcome deltas are zero but the skill costs more', () => {
  // Both arms have identical outcome/process pass rates (delta 0), but the
  // with-skill arm records a positive cost delta and real failures.
  const baseline = aggregateArm([
    trial(1, [assertionResult('a1', 'deterministic', 'outcome', true), assertionResult('p1', 'deterministic', 'process', false, 'x')], { costUsd: 0.01 }),
  ]);
  const withSkill = aggregateArm([
    trial(1, [assertionResult('a1', 'deterministic', 'outcome', true), assertionResult('p1', 'deterministic', 'process', false, 'x')], { costUsd: 0.05 }),
  ]);
  const delta = buildDelta(withSkill, baseline);
  assert.equal(delta.categories.outcome.delta, 0);
  assert.equal(delta.categories.process.delta, 0);
  assert.ok(delta.cost.delta > 0);

  const verdict = verdictFor(delta, { id: 'synthetic', skill: 'project/to-spec', trials: 1 }, 'live');
  assert.equal(verdict.verdict, 'regression-zero-delta-at-positive-cost');
  assert.match(verdict.reason, /paid for and changed nothing/);
});

test('verdictFor ignores failures in mock mode', () => {
  const delta = buildDelta(failingWithArm(), passingBaselineArm());
  assert.equal(verdictFor(delta, { id: 'x' }, 'mock').verdict, 'not-applicable');
});

/* ---------------------------------------------- runFixture / --all summary */

function trialEvents(trialIndex, artifactText) {
  return [
    { type: 'session', skill: 'project/to-spec', mode: 'with-skill', trial: trialIndex, model: 'test/model', ts: '2026-10-10T20:00:00.000Z' },
    { type: 'message', role: 'user', content: 'publish the spec' },
    { type: 'artifact', path: 'evals/results/artifacts/synthetic.md', text: artifactText },
    { type: 'end', status: 'completed', tokens: { input: 10, output: 5 }, costUsd: 0.02, durationMs: 100 },
  ];
}

function writeTranscript(dir, events) {
  const file = path.join(dir, 'transcript.jsonl');
  fs.writeFileSync(file, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`);
  return file;
}

async function loadSyntheticTranscript(dir, trials) {
  const events = [];
  trials.forEach((artifactText, index) => {
    const trialIndex = index + 1;
    if (trialIndex > 1) events.push({ type: 'trial', index: trialIndex });
    events.push(...trialEvents(trialIndex, artifactText));
  });
  return loadTranscript(writeTranscript(dir, events));
}

const judge = { mode: 'mock', reason: 'unit test', config: { judgeModel: 'test' } };

test('runFixture reports real failure counts end-to-end for a failing arm', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'quirk-behavioral-'));
  const fixture = {
    id: 'synthetic-failing', skill: 'project/to-spec', skillVersion: '1',
    scenario: 'A synthetic scenario long enough to satisfy the fixture schema.',
    trials: 2,
    assertions: [
      { id: 'a1', type: 'deterministic', category: 'process', check: { kind: 'artifact_contains_all', values: ['Non-Goals'] } },
      { id: 'a2', type: 'deterministic', category: 'outcome', check: { kind: 'artifact_contains_all', values: ['Goals'] } },
      { id: 'j1', type: 'judge', category: 'style', check: { criterion: 'The artifact states the seam decisions explicitly.' } },
    ],
    rubric: {},
  };
  const file = path.join(dir, 'synthetic.json');

  const withTranscript = await loadSyntheticTranscript(dir, ['Goals only', 'Goals only']);

  const report = await runFixture({ fixture, file, withTranscript, baselineTranscript: null, artifactOverride: null, judge, mode: 'mock' });

  const a1 = report.with.assertions.find((entry) => entry.id === 'a1');
  const a2 = report.with.assertions.find((entry) => entry.id === 'a2');
  const j1 = report.with.assertions.find((entry) => entry.id === 'j1');
  assert.equal(a1.failed, 2, 'a deterministic assertion missing its string fails every trial');
  assert.equal(a1.passed, 0);
  assert.equal(a2.failed, 0);
  assert.equal(a2.passed, 2);
  assert.equal(j1.failed, 0, 'the mock judge passes everything');

  assertBucketCounts(report.with.byType.deterministic, { passed: 2, failed: 2 });
  assertBucketCounts(report.with.byType.judge, { passed: 2, failed: 0 });
  assertBucketCounts(report.with.byCategory.process, { passed: 0, failed: 2 });
  assert.equal(report.with.trialsPassed, 0);
  assert.deepEqual(report.failures.map((entry) => entry.id), ['a1']);

  const markdown = renderMarkdown(report);
  assert.match(markdown, /- failed assertions: 2 across 1\/3 assertion\(s\)/);
  assert.match(markdown, /\*\*a1\*\* \(process \/ deterministic\): failed 2 of 2 trials/);
  assert.match(markdown, /## Failed assertions/);
});

test('renderMarkdown states zero failures for a clean arm', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'quirk-behavioral-'));
  const fixture = {
    id: 'synthetic-passing', skill: 'project/to-spec', skillVersion: '1',
    scenario: 'A synthetic scenario long enough to satisfy the fixture schema.',
    trials: 1,
    assertions: [{ id: 'a1', type: 'deterministic', category: 'process', check: { kind: 'artifact_contains_all', values: ['Goals'] } }],
    rubric: {},
  };
  const file = path.join(dir, 'synthetic.json');
  const withTranscript = await loadSyntheticTranscript(dir, ['Goals are here']);

  const report = await runFixture({ fixture, file, withTranscript, baselineTranscript: null, artifactOverride: null, judge, mode: 'mock' });

  assertBucketCounts(report.with.byType.deterministic, { passed: 1, failed: 0 });
  assert.equal(report.failures.length, 0);
  const markdown = renderMarkdown(report);
  assert.match(markdown, /- failed assertions: 0 across 0\/1 assertion\(s\)/);
  assert.match(markdown, /None: every recorded assertion cleared its check\./);
});

/* --------------------------------------------- --all prints the real count */

test('--all prints the true failure count for every fixture', () => {
  // Captures the console output of the real CLI run and cross-checks the printed
  // "(N failed)" against the failure totals the reports carry, so a regression
  // that parks failed counts at zero is caught here.
  const result = spawnSync('node', [path.join(REPO_ROOT, 'evals', 'run-behavioral.mjs'), '--all'], {
    encoding: 'utf8', cwd: REPO_ROOT,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);

  const rows = result.stdout.split('\n').filter((line) => line.startsWith('ok  ') || line.startsWith('FAIL'));
  assert.equal(rows.length, 20, `expected 20 fixture rows, saw:\n${result.stdout}`);
  for (const row of rows) {
    const match = row.match(/(\d+) trials, (\d+) assertions \((\d+) failed\)/);
    assert.ok(match, `row is missing the failure count: ${row}`);
    const [, trials, assertions, failed] = match;
    assert.ok(Number(trials) >= 1, row);
    assert.ok(Number(assertions) >= 1, row);
    assert.ok(Number(failed) >= 0, row);
    // Every shipped fixture passes its mock assertions, so the truthful count is 0.
    assert.equal(Number(failed), 0, row);
  }
  assert.match(result.stdout, /behavioural fixtures: 20 file\(s\), 0 broken schema, 0 crashed/);
  assert.match(result.stdout, /status: pass/);
});

test('--all reports a non-zero failure count when a fixture asserts missing content', () => {
  // A deliberately failing arm is driven through the real CLI by pointing a
  // transcript at an artifact that cannot satisfy the assertion, and the failure
  // count the CLI prints must match the report it writes.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'quirk-behavioral-cli-'));
  const outDir = path.join(dir, 'reports');
  const failingArtifact = path.join(dir, 'failing-artifact.md');
  // Carries the required sections, the ReviewArtifact fields, and enough words,
  // but no evidence of schema validation (a3) and no three-dot diff anchor (a5).
  fs.writeFileSync(failingArtifact, [
    '## Standards',
    '',
    'fixedPoint diffCommand standardsFindings specFindings nextConsumer',
    '',
    '## Spec',
    '',
    'The two axes are reported separately, and the review stops at the published report.',
    '',
  ].join('\n'));
  const transcript = writeTranscript(dir, trialEvents(1, fs.readFileSync(failingArtifact, 'utf8')));
  const fixture = path.join(FIXTURE_DIR, 'code-review.json');
  const parsed = JSON.parse(fs.readFileSync(fixture, 'utf8'));

  const result = spawnSync('node', [
    path.join(REPO_ROOT, 'evals', 'run-behavioral.mjs'),
    '--fixture', path.relative(REPO_ROOT, fixture),
    '--with', path.relative(REPO_ROOT, transcript),
    '--artifact', path.relative(REPO_ROOT, failingArtifact),
    '--out', path.relative(REPO_ROOT, path.join(outDir, 'code-review.report.json')),
    '--mock-judge',
  ], { encoding: 'utf8', cwd: REPO_ROOT });

  assert.equal(result.status, 0, result.stdout + result.stderr);

  const report = JSON.parse(fs.readFileSync(path.join(outDir, 'code-review.report.json'), 'utf8'));
  const expectedFailed = report.with.assertions.reduce((sum, entry) => sum + entry.failed, 0);
  const expectedAssertions = report.with.assertions.length;
  assert.ok(expectedFailed > 0, 'the failing artifact must make at least one assertion fail');

  // The markdown report and the CLI's own stdout must both carry that count.
  assert.ok(
    result.stdout.includes(`- failed assertions: ${expectedFailed} across`),
    'the CLI stdout must state the true failure count',
  );
  for (const entry of report.with.assertions.filter((item) => item.failed > 0)) {
    assert.ok(
      result.stdout.includes(`**${entry.id}** (${entry.category} / ${entry.type}): failed ${entry.failed} of ${report.with.trials} trials`),
      `the CLI stdout must attribute ${entry.id} to its failing trials`,
    );
    for (const evidence of entry.evidence) {
      assert.ok(result.stdout.includes(evidence), `the CLI stdout must quote the evidence for ${entry.id}`);
    }
  }

  assert.equal(expectedAssertions, parsed.assertions.length);
  assert.ok(report.with.trialsPassed <= report.with.trials);
});

/* ------------------------------------------- repository fixtures still pass */

test('every shipped behavioural fixture passes in mock mode with zero failures', () => {
  const files = fs.readdirSync(FIXTURE_DIR).filter((name) => name.endsWith('.json')).sort();
  assert.equal(files.length, 20, 'the fixture count is pinned by the wave-1 contract');
  for (const name of files) {
    const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, name), 'utf8'));
    const assertions = fixture.assertions ?? [];
    assert.ok(assertions.length > 0, `${name} must declare assertions`);
    for (const assertion of assertions) {
      assert.ok(['deterministic', 'judge'].includes(assertion.type), `${name}:${assertion.id} has a valid type`);
      if (assertion.type === 'deterministic') {
        assert.ok(assertion.check?.kind, `${name}:${assertion.id} needs a deterministic check kind`);
      }
    }
  }
});

test('aggregateArm on the repository mock transcripts yields zero failed assertions', async () => {
  const mockDir = path.join(REPO_ROOT, 'evals', 'results', 'mock');
  if (!fs.existsSync(mockDir)) {
    // Mock transcripts are generated by --all; skip instead of generating here.
    return;
  }
  for (const name of fs.readdirSync(FIXTURE_DIR).filter((entry) => entry.endsWith('.json'))) {
    const fixture = JSON.parse(fs.readFileSync(path.join(FIXTURE_DIR, name), 'utf8'));
    const skillTail = String(fixture.skill).split('/').pop();
    const transcriptFile = path.join(mockDir, `${skillTail}-with-skill.jsonl`);
    if (!fs.existsSync(transcriptFile)) continue;
    const text = fs.readFileSync(transcriptFile, 'utf8');
    assert.ok(text.trim().length > 0, `${skillTail} mock transcript is not empty`);
  }
});
