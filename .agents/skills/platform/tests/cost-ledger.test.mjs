import { test, describe } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SCRIPT = '.agents/skills/platform/cost-ledger.mjs';
const COST_MODEL = '.agents/skills/platform/cost-model.json';

function trace({ skill, tier, inputTokens, outputTokens, durationMs, day }) {
  return JSON.stringify({
    traceId: `${skill}-${tier}-${tier && inputTokens}`,
    spanId: 'span-1',
    skill,
    skillVersion: '2.0',
    promptVersion: '2.0',
    model: tier ? { provider: 'anthropic', model: 'claude-sonnet-4-20250514', tier } : undefined,
    input: { artifactType: 'unknown', sizeTokens: inputTokens ?? 0 },
    output: { artifactType: 'unknown', sizeTokens: outputTokens ?? 0, schemaValid: false },
    execution: { startedAt: `${day}T10:00:00.000Z`, completedAt: `${day}T10:00:01.000Z`, durationMs: durationMs ?? 0, iterations: 1, retries: 0 },
    quality: { artifactPassedQualityBar: false, artifactScore: null, evaluators: [], findingsCount: 0 },
    result: 'completed',
  });
}

function writeTraces(lines) {
  const dir = fs.mkdtempSync(path.join('/tmp', 'quirk-traces-'));
  fs.writeFileSync(path.join(dir, '2026-10-01.jsonl'), `${lines.join('\n')}\n`);
  return dir;
}

function run(tracesDir, extra = []) {
  return spawnSync('node', [SCRIPT, '--traces', tracesDir, '--cost-model', COST_MODEL, ...extra], { encoding: 'utf8' });
}

const SYNTHETIC = [
  trace({ skill: 'skill-audit', tier: 'code', inputTokens: 1000, outputTokens: 500, durationMs: 2000, day: '2026-10-01' }),
  trace({ skill: 'skill-audit', tier: 'code', inputTokens: 3000, outputTokens: 1500, durationMs: 4000, day: '2026-10-01' }),
  trace({ skill: 'skill-audit', tier: 'code', day: '2026-10-01' }),
  trace({ skill: 'evaluate-skill', tier: 'reasoning', inputTokens: 500, outputTokens: 250, durationMs: 1000, day: '2026-10-01' }),
];

describe('cost-ledger.mjs', () => {
  test('aggregates runs, duration, and tokens per skill', () => {
    const dir = writeTraces(SYNTHETIC);
    const result = run(dir, ['--json']);
    assert.equal(result.status, 0, result.stderr);
    const ledger = JSON.parse(result.stdout);

    assert.equal(ledger.totalTraces, 4);
    const audit = ledger.groups.find((group) => group.key === 'skill-audit');
    assert.equal(audit.runs, 3);
    assert.equal(audit.tokens.measuredRuns, 2);
    assert.equal(audit.tokens.total, 6000);
    assert.equal(audit.tokens.mean, 3000);
    assert.equal(audit.durationMs.total, 6000);
    assert.equal(audit.durationMs.measuredRuns, 2);
    assert.equal(audit.cost.total, 0.042);
  });

  test('a trace with no measured tokens and no duration counts as unknown, never as zero', () => {
    const dir = writeTraces(SYNTHETIC);
    const ledger = JSON.parse(run(dir, ['--json']).stdout);
    const audit = ledger.groups.find((group) => group.key === 'skill-audit');

    assert.equal(audit.tokens.unknownRuns, 1);
    assert.equal(audit.durationMs.unknownRuns, 1);
    assert.equal(audit.cost.unknownRuns, 1);
    assert.notEqual(audit.cost.total, 0);
    assert.ok(audit.cost.total > 0);

    const unmeasured = writeTraces([trace({ skill: 'silent-skill', tier: 'code', day: '2026-10-01' })]);
    const silent = JSON.parse(run(unmeasured, ['--json']).stdout).groups[0];
    assert.equal(silent.tokens.total, 'unknown');
    assert.equal(silent.tokens.mean, 'unknown');
    assert.equal(silent.durationMs.total, 'unknown');
    assert.equal(silent.cost.total, 'unknown');
    assert.match(run(unmeasured).stdout, /\| silent-skill\s+\| 1\s+\| unknown \(unknown\)\s+\| unknown \(unknown\)\s+\| unknown \(unknown\) \|/);
  });

  test('--no-estimate suppresses every cost column', () => {
    const dir = writeTraces(SYNTHETIC);
    const ledger = JSON.parse(run(dir, ['--json', '--no-estimate']).stdout);
    assert.equal(ledger.estimate, false);
    assert.deepEqual(ledger.groups[0].cost, { suppressed: true, reason: '--no-estimate' });
    assert.match(run(dir, ['--no-estimate']).stdout, /cost estimation suppressed with --no-estimate/);
    assert.doesNotMatch(run(dir, ['--no-estimate']).stdout, /\| cost USD \(mean\) \|/);
    assert.match(run(dir, ['--no-estimate']).stdout, /\| skill\s+\| runs\s+\| tokens \(mean\)\s+\| durationMs \(mean\) \|/);
  });

  test('per-day grouping splits the same skill across days', () => {
    const dir = writeTraces([
      trace({ skill: 'skill-audit', tier: 'code', inputTokens: 1000, outputTokens: 500, durationMs: 2000, day: '2026-10-01' }),
      trace({ skill: 'skill-audit', tier: 'code', inputTokens: 2000, outputTokens: 1000, durationMs: 4000, day: '2026-10-02' }),
      trace({ skill: 'to-spec', tier: 'reasoning', inputTokens: 500, outputTokens: 250, durationMs: 1000, day: '2026-10-02' }),
    ]);
    const ledger = JSON.parse(run(dir, ['--json', '--by-day']).stdout);
    assert.deepEqual(ledger.groups.map((group) => group.key), ['2026-10-02', '2026-10-01']);
    const day2 = ledger.groups.find((group) => group.key === '2026-10-02');
    assert.equal(day2.runs, 2);
    assert.equal(day2.tokens.total, 3750);
    assert.equal(day2.durationMs.total, 5000);
  });

  test('--since filters traces by execution day', () => {
    const dir = writeTraces([
      trace({ skill: 'skill-audit', tier: 'code', inputTokens: 1000, outputTokens: 500, durationMs: 2000, day: '2026-10-01' }),
      trace({ skill: 'skill-audit', tier: 'code', inputTokens: 2000, outputTokens: 1000, durationMs: 4000, day: '2026-10-05' }),
    ]);
    const ledger = JSON.parse(run(dir, ['--json', '--since', '2026-10-03']).stdout);
    assert.equal(ledger.totalTraces, 1);
    assert.equal(ledger.groups[0].tokens.total, 3000);
    assert.equal(ledger.since, '2026-10-03');

    const invalid = run(dir, ['--since', '2026-1-3']);
    assert.equal(invalid.status, 2);
    assert.match(invalid.stderr, /--since must be YYYY-MM-DD/);
  });

  test('an unknown tier yields unknown cost rather than a fabricated price', () => {
    const dir = writeTraces([trace({ skill: 'mystery-skill', inputTokens: 1000, outputTokens: 500, durationMs: 100, day: '2026-10-01' })]);
    const ledger = JSON.parse(run(dir, ['--json']).stdout).groups[0];
    assert.equal(ledger.tokens.total, 1500);
    assert.equal(ledger.cost.total, 'unknown');
    assert.equal(ledger.cost.unknownRuns, 1);
  });

  test('an empty traces directory reports zero traces without failing', () => {
    const dir = fs.mkdtempSync(path.join('/tmp', 'quirk-traces-'));
    const result = run(dir, ['--json']);
    assert.equal(result.status, 0, result.stderr);
    const ledger = JSON.parse(result.stdout);
    assert.equal(ledger.totalTraces, 0);
    assert.deepEqual(ledger.groups, []);
  });
});
