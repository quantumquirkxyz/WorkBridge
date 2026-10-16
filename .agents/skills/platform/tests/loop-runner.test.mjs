import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runLoop, DEFAULT_LEDGER_PATH } from '../loop-runner.mjs';

const SCRIPT = '.agents/skills/platform/loop-runner.mjs';

function tempLedgerPath(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'loop-runner-test-'));
  return path.join(dir, `${name}.jsonl`);
}

function stepsFrom(script) {
  let index = 0;
  return {
    next() {
      if (index >= script.length) return Promise.resolve({ value: undefined, done: true });
      const step = script[index];
      index += 1;
      if (step instanceof Error) return Promise.reject(step);
      return Promise.resolve({ value: step, done: false });
    },
  };
}

function failingSteps(message) {
  return {
    next() {
      return Promise.reject(new Error(message));
    },
  };
}

function readLedger(ledgerPath) {
  return fs.readFileSync(ledgerPath, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
}

test('healthy loop completes with a typed result', async () => {
  const steps = (async function* () {
    yield { action: 'read-file', args: { file: 'a.js' }, result: { lines: 12 } };
    yield { action: 'edit-file', args: { file: 'a.js', hunk: 2 }, result: { ok: true } };
    return { answer: 'guard added' };
  })();
  const result = await runLoop({ steps, budget: { stepLimit: 10 }, ledgerPath: tempLedgerPath('healthy') });
  assert.equal(result.exitStatus, 'completed');
  assert.deepEqual(result.submission, { answer: 'guard added' });
  assert.deepEqual(result.budgetSpent.steps, 2);
  assert.deepEqual(result.budgetSpent.cost, 2);
  assert.equal(result.nudges.length, 0);
});

test('repeating identical action+result halts at repeatThreshold', async () => {
  const steps = (async function* () {
    for (;;) {
      yield { action: 'apply-fix', args: { file: 'p.js' }, result: { ok: false, error: 'same compile error' } };
    }
  })();
  const result = await runLoop({ steps, budget: { repeatThreshold: 3 }, ledgerPath: tempLedgerPath('repeat') });
  assert.equal(result.exitStatus, 'repeated-action');
  assert.equal(result.budgetSpent.steps, 3);
  const block = result.nudges.at(-1);
  assert.equal(block.type, 'repeat');
  assert.equal(block.severity, 'block');
  assert.equal(block.occurrences, 3);
  assert.equal(block.threshold, 3);
  assert.ok(block.instruction.length > 0);
});

test('ping-pong A-B-A-B halts with exitStatus ping-pong', async () => {
  const steps = (async function* () {
    for (;;) {
      yield { action: 'edit-a', args: { file: 'a.js' }, result: { ok: false, error: 'lint' } };
      yield { action: 'edit-b', args: { file: 'b.js' }, result: { ok: false, error: 'type' } };
    }
  })();
  const result = await runLoop({ steps, budget: { repeatThreshold: 5 }, ledgerPath: tempLedgerPath('pingpong') });
  assert.equal(result.exitStatus, 'ping-pong');
  assert.equal(result.budgetSpent.steps, 4);
  const block = result.nudges.at(-1);
  assert.equal(block.type, 'ping-pong');
  assert.equal(block.severity, 'block');
});

test('same action with changing results does not halt (polling exemption by signature)', async () => {
  const progress = [{ pct: 0 }, { pct: 10 }, { pct: 40 }, { pct: 70 }, { pct: 95 }, { pct: 100 }];
  let index = 0;
  const steps = (async function* () {
    while (index < progress.length) {
      yield { action: 'poll-status', args: { id: 7 }, result: progress[index] };
      index += 1;
    }
  })();
  const result = await runLoop({ steps, budget: { stepLimit: 20 }, ledgerPath: tempLedgerPath('polling') });
  assert.equal(result.exitStatus, 'completed');
  assert.equal(result.budgetSpent.steps, 6);
  assert.equal(result.nudges.length, 0);
});

test('exemptActions skips degenerate detection entirely', async () => {
  const steps = (async function* () {
    for (let i = 0; i < 8; i += 1) {
      yield { action: 'wait-for-ci', args: {}, result: { state: 'pending' } };
    }
  })();
  const result = await runLoop({
    steps,
    budget: { stepLimit: 20, repeatThreshold: 2 },
    exemptActions: ['wait-for-ci'],
    ledgerPath: tempLedgerPath('exempt'),
  });
  assert.equal(result.exitStatus, 'completed');
  assert.equal(result.budgetSpent.steps, 8);
  assert.equal(result.nudges.length, 0);
});

test('stepLimit exceeded yields limits-exceeded with correct budgetSpent', async () => {
  let pulls = 0;
  const steps = (async function* () {
    for (let i = 0; i < 100; i += 1) {
      pulls += 1;
      yield { action: `step-${i}`, args: { i }, result: { i } };
    }
  })();
  const result = await runLoop({ steps, budget: { stepLimit: 4 }, ledgerPath: tempLedgerPath('steplimit') });
  assert.equal(result.exitStatus, 'limits-exceeded');
  assert.equal(result.budgetSpent.steps, 4);
  assert.equal(pulls, 4);
});

test('costLimit exceeded yields limits-exceeded after the cost is charged', async () => {
  const steps = (async function* () {
    for (let i = 0; i < 100; i += 1) {
      yield { action: `step-${i}`, args: { i }, result: { i }, cost: 1 };
    }
  })();
  const result = await runLoop({ steps, budget: { costLimit: 2.5 }, ledgerPath: tempLedgerPath('costlimit') });
  assert.equal(result.exitStatus, 'limits-exceeded');
  assert.equal(result.budgetSpent.cost, 3);
});

test('a throwing step still charges cost and can trigger maxConsecutiveFormatErrors', async () => {
  const ledgerPath = tempLedgerPath('throwing');
  const steps = failingSteps('model emitted malformed JSON');
  const result = await runLoop({ steps, budget: { maxConsecutiveFormatErrors: 2 }, ledgerPath });
  assert.equal(result.exitStatus, 'format-errors');
  assert.equal(result.budgetSpent.steps, 2);
  assert.equal(result.budgetSpent.cost, 2);
  const block = result.nudges.at(-1);
  assert.equal(block.type, 'format-error');
  assert.equal(block.severity, 'block');
  assert.equal(block.message, 'model emitted malformed JSON');
});

test('consecutive format errors reset after a successful step', async () => {
  const steps = stepsFrom([
    { action: 'read', args: { file: 'a.js' }, result: { lines: 3 } },
    new Error('malformed generation'),
    { action: 'edit', args: { file: 'a.js' }, result: { ok: true } },
  ]);
  const result = await runLoop({ steps, budget: { maxConsecutiveFormatErrors: 2 }, ledgerPath: tempLedgerPath('reset') });
  assert.equal(result.exitStatus, 'completed');
  assert.equal(result.budgetSpent.steps, 3);
  assert.equal(result.nudges.length, 1);
  assert.equal(result.nudges[0].severity, 'warning');
  assert.equal(result.nudges[0].priorErrorsOmitted, 0);
});

test('ledger records failed steps even when the loop throws', async () => {
  const ledgerPath = tempLedgerPath('ledger-throw');
  const steps = failingSteps('malformed generation');
  const result = await runLoop({ steps, budget: { maxConsecutiveFormatErrors: 1 }, ledgerPath });
  assert.equal(result.exitStatus, 'format-errors');
  assert.ok(fs.existsSync(ledgerPath), 'ledger must exist after a failed run');
  const lines = readLedger(ledgerPath);
  const errorLines = lines.filter((line) => line.type === 'step-error');
  assert.equal(errorLines.length, 1);
  assert.equal(errorLines[0].error, 'malformed generation');
  assert.equal(errorLines[0].cost, 1);
  assert.match(errorLines[0].argsHash, /^[a-f0-9]{64}$/);
  const summary = lines.at(-1);
  assert.equal(summary.type, 'summary');
  assert.equal(summary.exitStatus, 'format-errors');
});

test('ledger appends one hashed line per step plus a summary', async () => {
  const ledgerPath = tempLedgerPath('ledger-healthy');
  const steps = (async function* () {
    yield { action: 'read', args: { file: 'a.js' }, result: { lines: 3 } };
    yield { action: 'edit', args: { file: 'a.js' }, result: { ok: true } };
  })();
  await runLoop({ steps, budget: { stepLimit: 10 }, ledgerPath });
  const lines = readLedger(ledgerPath);
  assert.deepEqual(lines.map((line) => line.type), ['step', 'step', 'summary']);
  assert.equal(lines[0].action, 'read');
  assert.deepEqual(lines[0].args, { file: 'a.js' });
  for (const field of ['argsHash', 'resultSignature', 'stepHash']) {
    assert.match(lines[0][field], /^[a-f0-9]{64}$/, `${field} must be a sha256 hex digest`);
  }
  assert.equal(lines[2].exitStatus, 'completed');
  assert.equal(lines[2].steps, 2);
});

test('ledger is append-only and never truncated across runs', async () => {
  const ledgerPath = tempLedgerPath('ledger-append');
  const first = (async function* () {
    yield { action: 'a', args: {}, result: { ok: true } };
  })();
  await runLoop({ steps: first, ledgerPath });
  const second = (async function* () {
    yield { action: 'b', args: {}, result: { ok: true } };
  })();
  await runLoop({ steps: second, ledgerPath });
  const lines = readLedger(ledgerPath);
  assert.deepEqual(lines.map((line) => line.type), ['step', 'summary', 'step', 'summary']);
  assert.equal(lines[2].action, 'b');
});

test('typed result is JSON-serializable', async () => {
  const steps = (async function* () {
    for (let i = 0; i < 10; i += 1) {
      yield { action: `step-${i}`, args: { i }, result: { i } };
    }
  })();
  const result = await runLoop({ steps, budget: { stepLimit: 3 }, ledgerPath: tempLedgerPath('json') });
  const roundTripped = JSON.parse(JSON.stringify(result));
  assert.deepEqual(roundTripped, result);
  assert.equal(roundTripped.exitStatus, 'limits-exceeded');
});

test('nudges escalate warning -> backoff -> block before halting', async () => {
  const steps = (async function* () {
    for (;;) {
      yield { action: 'fix', args: {}, result: { ok: false } };
    }
  })();
  const result = await runLoop({ steps, budget: { repeatThreshold: 4 }, ledgerPath: tempLedgerPath('escalate') });
  assert.equal(result.exitStatus, 'repeated-action');
  assert.deepEqual(result.nudges.map((nudge) => nudge.severity), ['warning', 'backoff', 'block']);
});

test('onNudge callback receives structured nudges', async () => {
  const seen = [];
  const steps = (async function* () {
    for (;;) {
      yield { action: 'fix', args: {}, result: { ok: false } };
    }
  })();
  const result = await runLoop({
    steps,
    budget: { repeatThreshold: 2 },
    ledgerPath: tempLedgerPath('callback'),
    onNudge: (nudge) => seen.push(nudge),
  });
  assert.equal(result.exitStatus, 'repeated-action');
  assert.deepEqual(seen, result.nudges);
  assert.equal(seen.at(-1).severity, 'block');
});

test('default ledger path is .scratch/loop-ledger.jsonl', () => {
  assert.equal(DEFAULT_LEDGER_PATH, '.scratch/loop-ledger.jsonl');
});

test('CLI --demo --json prints every typed exit', () => {
  const result = spawnSync('node', [SCRIPT, '--demo', '--json'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.length, 5);
  assert.deepEqual(
    [...new Set(payload.map((entry) => entry.exitStatus))].sort(),
    ['completed', 'format-errors', 'limits-exceeded', 'ping-pong', 'repeated-action'],
  );
  for (const entry of payload) {
    assert.deepEqual(Object.keys(entry).sort(), ['budgetSpent', 'demo', 'exitStatus', 'ledgerLines', 'nudges', 'submission', 'title']);
    assert.deepEqual(Object.keys(entry.budgetSpent).sort(), ['cost', 'steps', 'wallTimeMs']);
  }
});

test('CLI --demo human output shows typed exits', () => {
  const result = spawnSync('node', [SCRIPT, '--demo'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  for (const status of ['completed', 'limits-exceeded', 'repeated-action', 'ping-pong', 'format-errors']) {
    assert.ok(result.stdout.includes(status), `demo output should mention ${status}`);
  }
});

test('CLI --help explains usage and budget fields', () => {
  const result = spawnSync('node', [SCRIPT, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  for (const fragment of ['Usage:', '--demo', 'repeatThreshold', 'exitStatus']) {
    assert.ok(result.stdout.includes(fragment), `help should mention ${fragment}`);
  }
});
