import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readJournal, foldJournal, parseYaml } from '../workflow-state-machine.mjs';

const SCRIPT = '.agents/skills/platform/workflow-state-machine.mjs';
const REPO_WORKFLOWS_DIR = path.resolve(SCRIPT, '../workflows');

// State isolation: the ambient repository state directory is never written by
// these tests. The state dir override (wave-2) also relocates the journal, so
// every test writes only inside its own temporary directory.
let stateDir;
let workflowsDir;

// Same environment for every invocation, so a fixture workflow that only
// exists in the temporary workflows dir resolves exactly like standard-feature.
function run(args) {
  return spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8', env: isolatedEnv() });
}

function isolatedEnv() {
  return {
    ...process.env,
    WORKFLOW_STATE_MACHINE_STATE_DIR: stateDir,
    WORKFLOW_STATE_MACHINE_WORKFLOWS_DIR: workflowsDir
  };
}

function runIsolated(args) {
  return spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8', env: isolatedEnv() });
}

function readRecords(workflow) {
  const file = path.join(stateDir, 'checkpoints', workflow + '.jsonl');
  return fs.readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line));
}

function readSnapshot(workflow) {
  return JSON.parse(fs.readFileSync(path.join(stateDir, workflow + '.json'), 'utf8'));
}

function writeJournal(workflow, records) {
  fs.mkdirSync(path.join(stateDir, 'checkpoints'), { recursive: true });
  fs.writeFileSync(
    path.join(stateDir, 'checkpoints', workflow + '.jsonl'),
    records.map((record) => JSON.stringify(record)).join('\n') + '\n'
  );
}

// A guard-free fixture keeps journal behaviour independent of guard logic.
const GUARD_FREE_YAML = [
  'name: journal-flow',
  'description: journal fixture used by the checkpoint tests',
  'entryPoint: start',
  'version: "1.0"',
  '',
  'context:',
  '  loopIterations: 0',
  '',
  'states:',
  '  start:',
  '    type: router',
  '    transitions:',
  '      GO: work',
  '  work:',
  '    type: executor',
  '    loop:',
  '      - step',
  '    maxIterations: 2',
  '    transitions:',
  '      AGAIN: work',
  '      DONE: end',
  '  end:',
  '    type: terminal',
  ''
].join('\n');

describe('workflow-state-machine checkpoint journal', () => {
  beforeEach(() => {
    stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quirk-journal-state-'));
    workflowsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quirk-journal-workflows-'));
    fs.copyFileSync(
      path.join(REPO_WORKFLOWS_DIR, 'standard-feature.yaml'),
      path.join(workflowsDir, 'standard-feature.yaml')
    );
    fs.writeFileSync(path.join(workflowsDir, 'journal-flow.yaml'), GUARD_FREE_YAML);
  });

  afterEach(() => {
    fs.rmSync(stateDir, { recursive: true, force: true });
    fs.rmSync(workflowsDir, { recursive: true, force: true });
  });

  test('only state-changing commands append to the journal', () => {
    const reset = runIsolated(['journal-flow', 'reset']);
    assert.equal(reset.status, 0, reset.stderr);
    assert.equal(readRecords('journal-flow').length, 1, 'reset appends exactly one record');

    const go = runIsolated(['journal-flow', 'transition', 'GO']);
    assert.equal(go.status, 0, go.stderr);
    assert.equal(readRecords('journal-flow').length, 2, 'transition appends exactly one record');

    // Read-only commands never touch the journal.
    runIsolated(['journal-flow', 'current']);
    runIsolated(['journal-flow', 'legal-events']);
    runIsolated(['journal-flow', 'history']);
    assert.equal(readRecords('journal-flow').length, 2, 'current/legal-events/history append nothing');

    // An invalid event is not a state change either.
    const invalid = runIsolated(['journal-flow', 'transition', 'NOPE']);
    assert.equal(invalid.status, 1);
    assert.equal(readRecords('journal-flow').length, 2, 'an invalid event appends nothing');
  });

  test('journal records carry the documented shape and a monotonically increasing seq', () => {
    runIsolated(['journal-flow', 'reset']);
    runIsolated(['journal-flow', 'transition', 'GO']);
    runIsolated(['journal-flow', 'transition', 'AGAIN']);

    const records = readRecords('journal-flow');
    assert.deepEqual(records.map((r) => r.seq), [1, 2, 3], 'seq increases by one per record');

    const resetRecord = records[0];
    for (const field of ['seq', 'ts', 'workflow', 'event', 'from', 'to', 'status', 'loopIterations']) {
      assert.ok(field in resetRecord, 'reset record carries ' + field);
    }
    assert.equal(resetRecord.workflow, 'journal-flow');
    assert.equal(resetRecord.event, 'reset');
    assert.equal(resetRecord.from, null);
    assert.equal(resetRecord.to, 'start');
    assert.equal(resetRecord.status, 'applied');

    const loopRecord = records[2];
    assert.equal(loopRecord.event, 'AGAIN');
    assert.equal(loopRecord.from, 'work');
    assert.equal(loopRecord.to, 'work');
    assert.equal(loopRecord.status, 'applied');
    assert.deepEqual(loopRecord.contextDelta, { loopIterations: 1 }, 'the loop counter is a sparse delta');
    assert.equal(loopRecord.loopIterations, 1);
    assert.match(loopRecord.ts, /^\d{4}-\d{2}-\d{2}T/, 'ts is an ISO timestamp');
  });

  test('replay reproduces the persisted snapshot exactly for a full fold', () => {
    runIsolated(['standard-feature', 'reset']);
    for (const event of ['AMBIGUOUS', 'SHARP_ENOUGH', 'PUBLISHED', 'APPROVED', 'NEXT_READY', 'VALIDATED']) {
      const result = runIsolated(['standard-feature', 'transition', event]);
      assert.equal(result.status, 0, event + ': ' + result.stderr);
    }

    const replayed = JSON.parse(run(['standard-feature', 'replay', '--json']).stdout);
    assert.equal(replayed.ok, true, JSON.stringify(replayed));
    assert.equal(replayed.verification.matchesPersistedSnapshot, true, 'the fold is the snapshot derivation');
    assert.deepStrictEqual(replayed.state, readSnapshot('standard-feature'), 'folded state equals the snapshot');

    // Replaying twice is identical: the fold is deterministic.
    const again = JSON.parse(run(['standard-feature', 'replay', '--json']).stdout);
    assert.deepStrictEqual(again.state, replayed.state);
  });

  test('replay --to reproduces an earlier checkpoint', () => {
    runIsolated(['standard-feature', 'reset']);
    runIsolated(['standard-feature', 'transition', 'AMBIGUOUS']);
    const atTwo = readSnapshot('standard-feature');
    runIsolated(['standard-feature', 'transition', 'SHARP_ENOUGH']);

    const partial = JSON.parse(run(['standard-feature', 'replay', '--to', '2', '--json']).stdout);
    assert.equal(partial.ok, true);
    assert.equal(partial.eventsFolded, 2);
    assert.deepStrictEqual(partial.state, atTwo, 'the seq-2 checkpoint replays to the seq-2 snapshot');
    assert.equal(partial.verification.fullFold, false);
  });

  test('a missing journal yields a structured no-journal result with exit code 0', () => {
    // A snapshot with no journal beside it: a legacy run.
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(path.join(stateDir, 'standard-feature.json'), JSON.stringify({
      workflow: 'standard-feature',
      version: '2.0',
      currentState: 'ask-to',
      history: [{ state: 'ask-to', enteredAt: '2026-10-10T00:00:00.000Z', event: null }],
      context: {}
    }, null, 2));

    const replayed = run(['standard-feature', 'replay', '--json']);
    assert.equal(replayed.status, 0, 'a missing journal is not an error');
    const payload = JSON.parse(replayed.stdout);
    assert.equal(payload.ok, false);
    assert.equal(payload.reason, 'no-journal');
    assert.match(payload.note, /legacy run/);
    assert.match(payload.note, /time travel is unavailable/);

    // An empty journal degrades the same way.
    fs.mkdirSync(path.join(stateDir, 'checkpoints'), { recursive: true });
    fs.writeFileSync(path.join(stateDir, 'checkpoints', 'standard-feature.jsonl'), '\\n');
    const empty = run(['standard-feature', 'replay', '--json']);
    assert.equal(empty.status, 0);
    assert.equal(JSON.parse(empty.stdout).reason, 'no-journal');
  });

  test('replay verifies recorded guard decisions and reports divergence', () => {
    runIsolated(['standard-feature', 'reset']);
    for (const event of ['CLEAR_SPEC', 'PUBLISHED', 'APPROVED', 'NEXT_READY', 'VALIDATED']) {
      const result = runIsolated(['standard-feature', 'transition', event]);
      assert.equal(result.status, 0, event + ': ' + result.stderr);
    }
    // gateCI is still "pending", so OPENED is rejected by its guard.
    const blocked = runIsolated(['standard-feature', 'transition', 'OPENED']);
    assert.equal(blocked.status, 2, blocked.stderr);

    const records = readRecords('standard-feature');
    const rejection = records[records.length - 1];
    assert.equal(rejection.event, 'OPENED');
    assert.equal(rejection.status, 'rejected-by-guard');
    assert.equal(rejection.guard, 'gateCI == "passed"');
    assert.equal(rejection.guardResult, false);
    assert.deepEqual(rejection.legalEvents, ['FAILED']);

    const replayed = JSON.parse(run(['standard-feature', 'replay', '--json']).stdout);
    assert.equal(replayed.ok, true, JSON.stringify(replayed.verification));
    const guardCheck = replayed.verification.guardChecks.find((check) => check.seq === rejection.seq);
    assert.equal(guardCheck.recordedGuardResult, false);
    assert.equal(guardCheck.reevaluatedGuardResult, false, 're-evaluation reproduces the recorded decision');
    assert.equal(guardCheck.match, true);
    assert.deepEqual(replayed.verification.divergences, []);

    // Replay stability: the guard decision does not drift across repeats.
    for (let i = 0; i < 5; i++) {
      const repeat = JSON.parse(run(['standard-feature', 'replay', '--json']).stdout);
      assert.deepEqual(repeat.verification.guardChecks, replayed.verification.guardChecks);
    }

    // Tamper with the recorded decision: re-evaluation now disagrees.
    rejection.guardResult = true;
    writeJournal('standard-feature', records);
    const diverged = run(['standard-feature', 'replay', '--json']);
    assert.notEqual(diverged.status, 0, 'divergence is an error');
    const payload = JSON.parse(diverged.stdout);
    assert.equal(payload.reason, 'divergence');
    assert.equal(payload.divergences.length, 1);
    assert.equal(payload.divergences[0].recordedGuardResult, true);
    assert.equal(payload.divergences[0].reevaluatedGuardResult, false);
    assert.equal(payload.divergences[0].guard, 'gateCI == "passed"');
  });

  test('readJournal and foldJournal are importable pure helpers', () => {
    // The imported helpers resolve the journal directory from the environment
    // on every call, so the in-process redirect works without a child process.
    process.env.WORKFLOW_STATE_MACHINE_STATE_DIR = stateDir;
    assert.equal(readJournal('standard-feature'), null, 'no journal means null, not an empty array');

    writeJournal('standard-feature', [
      { seq: 1, ts: '2026-10-10T00:00:00.000Z', workflow: 'standard-feature', event: 'reset', from: null, to: 'ask-to', status: 'applied', loopIterations: 0 },
      { seq: 2, ts: '2026-10-10T00:00:01.000Z', workflow: 'standard-feature', event: 'AMBIGUOUS', from: 'ask-to', to: 'grill-with-docs', status: 'applied', loopIterations: 0 }
    ]);
    const loaded = readJournal('standard-feature');
    assert.equal(loaded.length, 2);

    const workflow = parseYaml(fs.readFileSync(path.join(workflowsDir, 'standard-feature.yaml'), 'utf8'));
    const fold = foldJournal(loaded, { workflow, to: 1 });
    assert.equal(fold.folded, 1);
    assert.equal(fold.state.currentState, 'ask-to');
    assert.deepEqual(fold.divergences, []);

    delete process.env.WORKFLOW_STATE_MACHINE_STATE_DIR;
  });

  test('fork creates a new thread and never modifies the original', () => {
    runIsolated(['standard-feature', 'reset']);
    for (const event of ['CLEAR_SPEC', 'PUBLISHED', 'APPROVED', 'NEXT_READY', 'VALIDATED']) {
      const result = runIsolated(['standard-feature', 'transition', event]);
      assert.equal(result.status, 0, event + ': ' + result.stderr);
    }
    const parentState = readSnapshot('standard-feature');
    const parentJournal = fs.readFileSync(path.join(stateDir, 'checkpoints', 'standard-feature.jsonl'), 'utf8');
    const parentRecords = readRecords('standard-feature');

    // Branch from BEFORE the gate-guarded OPENED transition, with the override
    // that makes it legal (the A/B repair use case from CHECKPOINTS.md).
    const forkSeq = parentRecords.find((r) => r.event === 'VALIDATED').seq;
    const forked = runIsolated(['standard-feature', 'fork', '--to', String(forkSeq), '--set', 'gateCI=passed']);
    assert.equal(forked.status, 0, forked.stderr);
    const payload = JSON.parse(forked.stdout);
    assert.equal(payload.ok, true);
    assert.equal(payload.fork.name, 'standard-feature-fork-1');
    assert.deepEqual(payload.fork.forkedFrom, { workflow: 'standard-feature', seq: forkSeq, name: 'standard-feature-fork-1' });
    assert.deepEqual(payload.fork.overrides, { gateCI: 'passed' });

    // The original thread is untouched, byte for byte.
    assert.deepStrictEqual(readSnapshot('standard-feature'), parentState, 'the parent snapshot is unchanged');
    assert.equal(
      fs.readFileSync(path.join(stateDir, 'checkpoints', 'standard-feature.jsonl'), 'utf8'),
      parentJournal,
      'the parent journal is unchanged'
    );

    // The fork is a real thread with its own state and journal.
    const forkState = readSnapshot('standard-feature-fork-1');
    assert.equal(forkState.workflow, 'standard-feature-fork-1');
    assert.equal(forkState.currentState, 'publish-open-pr');
    assert.equal(forkState.context.gateCI, 'passed', 'the override is applied to the fork context');
    const forkRecords = readRecords('standard-feature-fork-1');
    assert.equal(forkRecords.length, 1);
    assert.equal(forkRecords[0].event, 'fork');
    assert.equal(forkRecords[0].status, 'applied');
    assert.deepEqual(forkRecords[0].forkedFrom, { workflow: 'standard-feature', seq: forkSeq, name: 'standard-feature-fork-1' });

    // Subsequent commands accept the fork name like any workflow.
    const transition = runIsolated(['standard-feature-fork-1', 'transition', 'OPENED', '--json']);
    assert.equal(transition.status, 0, transition.stderr);
    assert.equal(JSON.parse(transition.stdout).current, 'review-pr');

    // ... and the fork journal replays to the fork snapshot.
    const forkReplay = JSON.parse(runIsolated(['standard-feature-fork-1', 'replay', '--json']).stdout);
    assert.equal(forkReplay.ok, true, JSON.stringify(forkReplay));
    assert.equal(forkReplay.verification.matchesPersistedSnapshot, true);
    assert.deepStrictEqual(forkReplay.state, readSnapshot('standard-feature-fork-1'));

    // The parent machine is still blocked by its own guard: forking did not
    // leak the override into the original thread.
    const stillBlocked = runIsolated(['standard-feature', 'transition', 'OPENED']);
    assert.equal(stillBlocked.status, 2, stillBlocked.stderr);
  });

  test('fork names increment, honour --name, and refuse to overwrite', () => {
    runIsolated(['standard-feature', 'reset']);

    const first = JSON.parse(runIsolated(['standard-feature', 'fork', '--to', '1']).stdout);
    assert.equal(first.fork.name, 'standard-feature-fork-1');

    const second = JSON.parse(runIsolated(['standard-feature', 'fork', '--to', '1']).stdout);
    assert.equal(second.fork.name, 'standard-feature-fork-2');

    const named = JSON.parse(runIsolated(['standard-feature', 'fork', '--to', '1', '--name', 'strategy-b']).stdout);
    assert.equal(named.fork.name, 'strategy-b');
    assert.equal(named.fork.forkedFrom.workflow, 'standard-feature');

    const clash = runIsolated(['standard-feature', 'fork', '--to', '1', '--name', 'strategy-b']);
    assert.equal(clash.status, 1);
    assert.match(clash.stderr, /already in use/);

    // Both threads coexist independently and replay to their own snapshots.
    for (const forkName of ['strategy-b', 'standard-feature-fork-2']) {
      const replayed = JSON.parse(runIsolated([forkName, 'replay', '--json']).stdout);
      assert.equal(replayed.ok, true);
      assert.deepStrictEqual(replayed.state, readSnapshot(forkName));
    }
  });

  test('fork requires --to and refuses usage errors and unknown seqs', () => {
    runIsolated(['standard-feature', 'reset']);

    const noTo = runIsolated(['standard-feature', 'fork']);
    assert.equal(noTo.status, 1);
    assert.match(noTo.stderr, /Usage: fork/);

    const badSet = runIsolated(['standard-feature', 'fork', '--to', '1', '--set', 'gateCI']);
    assert.equal(badSet.status, 1);
    assert.match(badSet.stderr, /expected key=value/);

    const unknownSeq = runIsolated(['standard-feature', 'fork', '--to', '99']);
    assert.equal(unknownSeq.status, 1);
    assert.match(unknownSeq.stderr, /No journal event with seq 99/);

    const noJournalFork = runIsolated(['journal-flow', 'fork', '--to', '1']);
    assert.equal(noJournalFork.status, 1, 'fork without a journal is a real failure, not a silent no-op');
    assert.match(noJournalFork.stderr, /no-journal/);
  });

  test('fork --set supports dotted context paths and the reserved currentState key', () => {
    runIsolated(['standard-feature', 'reset']);

    const forked = JSON.parse(runIsolated([
      'standard-feature', 'fork', '--to', '1',
      '--set', 'review.specFindings=3', '--set', 'loopIterations=2', '--set', 'currentState=review-pr'
    ]).stdout);
    const state = forked.fork.state;
    // A fork writes its context verbatim: no defaults merge, exactly like the
    // reset that seeded the parent, so replaying it back is exact.
    assert.deepEqual(state.context.review, { specFindings: 3 }, 'dotted paths set nested values');
    assert.equal(state.context.loopIterations, 2);
    assert.equal(state.currentState, 'review-pr', 'currentState is a reserved --set key');

    const replayed = JSON.parse(runIsolated(['standard-feature-fork-1', 'replay', '--json']).stdout);
    assert.equal(replayed.ok, true);
    assert.deepStrictEqual(replayed.state, readSnapshot('standard-feature-fork-1'));
  });

  test('reset and escalation are journaled and replay to the escalated snapshot', () => {
    runIsolated(['journal-flow', 'reset']);
    runIsolated(['journal-flow', 'transition', 'GO']);
    runIsolated(['journal-flow', 'transition', 'AGAIN']);
    const escalated = runIsolated(['journal-flow', 'transition', 'AGAIN']);
    assert.equal(escalated.status, 1);
    assert.match(escalated.stderr, /Max iterations/);

    const records = readRecords('journal-flow');
    const escalation = records[records.length - 1];
    assert.equal(escalation.event, 'AGAIN');
    assert.equal(escalation.status, 'escalated');
    assert.equal(escalation.to, 'escalate');
    assert.equal(escalation.loopIterations, 2);

    const replayed = JSON.parse(run(['journal-flow', 'replay', '--json']).stdout);
    assert.equal(replayed.ok, true);
    assert.equal(replayed.state.currentState, 'escalate');
    assert.deepStrictEqual(replayed.state, readSnapshot('journal-flow'));

    // A reset afterwards starts a fresh fold: the context is empty again.
    runIsolated(['journal-flow', 'reset']);
    const afterReset = JSON.parse(run(['journal-flow', 'replay', '--json']).stdout);
    assert.equal(afterReset.ok, true);
    assert.deepStrictEqual(afterReset.state, readSnapshot('journal-flow'));
    assert.deepEqual(afterReset.state.context, {}, 'reset persists an empty context');
  });

  test('replay rejects malformed option values without crashing', () => {
    runIsolated(['standard-feature', 'reset']);

    const badTo = runIsolated(['standard-feature', 'replay', '--to', 'abc']);
    assert.equal(badTo.status, 1);
    assert.match(badTo.stderr, /Usage: replay/);

    const badRange = runIsolated(['standard-feature', 'replay', '--from', '3', '--to', '2']);
    assert.equal(badRange.status, 1);
    assert.match(badRange.stderr, /--from must not exceed --to/);

    // A windowed fold folds only the requested window and skips guard checks.
    runIsolated(['standard-feature', 'transition', 'CLEAR_SPEC']);
    const windowed = JSON.parse(runIsolated(['standard-feature', 'replay', '--from', '2']).stdout);
    assert.equal(windowed.ok, true);
    assert.equal(windowed.eventsFolded, 1);
    assert.equal(windowed.state.currentState, 'to-spec');
    assert.match(windowed.verification.guardVerificationSkipped, /windowed fold/);
  });
});
