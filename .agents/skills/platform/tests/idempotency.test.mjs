import { test, describe } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  recordIntent,
  completeIntent,
  checkIntent,
  readIntent,
  runEffectOnce,
  DEFAULT_INTENTS_DIR,
  UNKNOWN_OUTCOME
} from '../idempotency.mjs';

const SCRIPT = '.agents/skills/platform/idempotency.mjs';

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// A tiny "external effect" whose execution count is observable across calls,
// modeling a merge/label/comment side effect a mutating skill performs.
function makeEffect(logFile) {
  let executions = 0;
  return {
    get executions() { return executions; },
    run(label) {
      executions += 1;
      fs.appendFileSync(logFile, label + '\n');
      return label;
    }
  };
}

describe('idempotency ledger: intent lifecycle', () => {
  test('recordIntent writes the claim shape to <dir>/<key>.json', (t) => {
    const dir = tempDir('quirk-intents-record-');
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const payload = { pr: 108, action: 'merge' };

    const { status, intent } = recordIntent(dir, 'merge-pr-108', payload);
    assert.equal(status, 'recorded');
    assert.equal(intent.key, 'merge-pr-108');
    assert.deepEqual(intent.payload, payload);
    assert.equal(intent.outcome, null);
    assert.ok(!Number.isNaN(Date.parse(intent.recordedAt)), 'recordedAt is an ISO timestamp');

    const onDisk = JSON.parse(fs.readFileSync(path.join(dir, 'merge-pr-108.json'), 'utf8'));
    assert.deepEqual(onDisk, intent);
  });

  test('checkIntent reports unknown-outcome while a claim is pending', (t) => {
    const dir = tempDir('quirk-intents-pending-');
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    recordIntent(dir, 'merge-pr-108', { pr: 108 });
    assert.equal(checkIntent(dir, 'merge-pr-108'), UNKNOWN_OUTCOME);
  });

  test('checkIntent returns null when the intent is absent', (t) => {
    const dir = tempDir('quirk-intents-absent-');
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    assert.equal(checkIntent(dir, 'never-recorded'), null);
    assert.equal(readIntent(dir, 'never-recorded'), null);
  });

  test('completeIntent commits the outcome and checkIntent returns it', (t) => {
    const dir = tempDir('quirk-intents-complete-');
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    recordIntent(dir, 'merge-pr-108', { pr: 108 });

    const { status, intent } = completeIntent(dir, 'merge-pr-108', { merged: true, sha: 'abc123' });
    assert.equal(status, 'completed');
    assert.deepEqual(intent.outcome, { merged: true, sha: 'abc123' });

    const outcome = checkIntent(dir, 'merge-pr-108');
    assert.deepEqual(outcome, { merged: true, sha: 'abc123' });

    const onDisk = JSON.parse(fs.readFileSync(path.join(dir, 'merge-pr-108.json'), 'utf8'));
    assert.equal(onDisk.outcome.merged, true);
  });
});

describe('idempotency ledger: effect sandwich', () => {
  test('full lifecycle: record before the effect, complete after, replay reuses the outcome', (t) => {
    const dir = tempDir('quirk-intents-sandwich-');
    const logFile = path.join(dir, 'effect.log');
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const effect = makeEffect(logFile);

    const first = runEffectOnce(dir, 'merge-pr-108', { pr: 108 }, () => effect.run('merged'));
    assert.equal(first.executed, true);
    assert.equal(first.outcome, 'merged');
    assert.equal(effect.executions, 1);

    const replay = runEffectOnce(dir, 'merge-pr-108', { pr: 108 }, () => effect.run('merged again'));
    assert.equal(replay.executed, false);
    assert.equal(replay.reason, 'already-completed');
    assert.equal(replay.outcome, 'merged');
    assert.equal(effect.executions, 1, 'a completed intent is never re-executed');
  });

  test('crash between record and complete: replay reports unknown-outcome instead of re-executing', (t) => {
    const dir = tempDir('quirk-intents-crash-');
    const logFile = path.join(dir, 'effect.log');
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const effect = makeEffect(logFile);

    // Attempt 1: record the claim, execute the effect, then crash before the
    // outcome is committed (Temporal effect sandwich, interrupted).
    recordIntent(dir, 'merge-pr-108', { pr: 108, attempt: 1 });
    effect.run('merged (attempt 1, before crash)');
    // ...no completeIntent: the process died here.

    assert.equal(checkIntent(dir, 'merge-pr-108'), UNKNOWN_OUTCOME);

    // Attempt 2 (resume/replay): must not re-run the effect.
    const replay = runEffectOnce(dir, 'merge-pr-108', { pr: 108, attempt: 2 }, () => effect.run('merged (attempt 2)'));
    assert.equal(replay.executed, false);
    assert.equal(replay.reason, UNKNOWN_OUTCOME);
    assert.equal(effect.executions, 1, 'an outcome-unknown effect is never silently re-executed');
    assert.equal(checkIntent(dir, 'merge-pr-108'), UNKNOWN_OUTCOME, 'the claim stays pending');
  });

  test('an effect that throws leaves the claim pending for the replay', (t) => {
    const dir = tempDir('quirk-intents-throw-');
    const logFile = path.join(dir, 'effect.log');
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const effect = makeEffect(logFile);

    assert.throws(() => runEffectOnce(dir, 'label-issue-77', { issue: 77 }, () => {
      effect.run('label attempted');
      throw new Error('network down');
    }), /network down/);

    assert.equal(checkIntent(dir, 'label-issue-77'), UNKNOWN_OUTCOME);
    const replay = runEffectOnce(dir, 'label-issue-77', { issue: 77 }, () => effect.run('label retried'));
    assert.equal(replay.executed, false);
    assert.equal(replay.reason, UNKNOWN_OUTCOME);
    assert.equal(effect.executions, 1);
  });
});

describe('idempotency ledger: ledger safety rails', () => {
  test('recordIntent never clobbers an in-flight claim', (t) => {
    const dir = tempDir('quirk-intents-clobber-');
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const first = recordIntent(dir, 'merge-pr-108', { pr: 108, attempt: 1 });
    const original = { ...first.intent };

    const second = recordIntent(dir, 'merge-pr-108', { pr: 108, attempt: 2 });
    assert.equal(second.status, 'already-pending');
    assert.deepEqual(second.intent, original, 'the original claim is preserved verbatim');

    const onDisk = JSON.parse(fs.readFileSync(path.join(dir, 'merge-pr-108.json'), 'utf8'));
    assert.deepEqual(onDisk, original);
  });

  test('recordIntent does not silently re-arm a completed intent', (t) => {
    const dir = tempDir('quirk-intents-rearm-');
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    runEffectOnce(dir, 'merge-pr-108', { pr: 108 }, () => 'merged');
    const again = recordIntent(dir, 'merge-pr-108', { pr: 108 });
    assert.equal(again.status, 'already-completed');
    assert.equal(checkIntent(dir, 'merge-pr-108'), 'merged');
  });

  test('completeIntent reports not-found for an absent intent', (t) => {
    const dir = tempDir('quirk-intents-notfound-');
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const { status } = completeIntent(dir, 'merge-pr-108', 'merged');
    assert.equal(status, 'not-found');
    assert.equal(checkIntent(dir, 'merge-pr-108'), null);
  });

  test('completeIntent is first-write-wins', (t) => {
    const dir = tempDir('quirk-intents-firstwrite-');
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    recordIntent(dir, 'merge-pr-108', { pr: 108 });
    assert.equal(completeIntent(dir, 'merge-pr-108', 'merged').status, 'completed');
    const second = completeIntent(dir, 'merge-pr-108', 'merged-again');
    assert.equal(second.status, 'already-completed');
    assert.equal(checkIntent(dir, 'merge-pr-108'), 'merged');
  });

  test('the default ledger directory is .scratch/intents', () => {
    assert.equal(DEFAULT_INTENTS_DIR, '.scratch/intents');
  });
});

describe('idempotency ledger: CLI demo', () => {
  test('--demo narrates the crash/replay outcome-unknown case', (t) => {
    const dir = tempDir('quirk-intents-demo-');
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

    const result = spawnSync('node', [SCRIPT, '--demo', '--intents-dir', dir], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Effect sandwich demo/);
    assert.match(result.stdout, /unknown-outcome/);
    assert.match(result.stdout, /NOT re-executing the effect/);
    assert.match(result.stdout, /must stay 1/);

    // The crash claim is still pending; the completed key carries its outcome.
    assert.equal(checkIntent(dir, 'demo-merge-pr-42'), UNKNOWN_OUTCOME);
    assert.equal(checkIntent(dir, 'demo-label-pr-42'), 'labeled');

    const effectLog = fs.readFileSync(path.join(dir, 'demo-effect.log'), 'utf8')
      .split('\n').filter((line) => line.trim() !== '');
    assert.equal(effectLog.length, 2, 'one crash-scenario execution plus one committed execution');
    assert.equal(checkIntent(dir, 'never-existed'), null);
  });

  test('--help documents the effect sandwich contract', () => {
    const result = spawnSync('node', [SCRIPT, '--help'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /record claim -> execute -> commit outcome/);
    assert.match(result.stdout, /checkIntent/);
  });
});
