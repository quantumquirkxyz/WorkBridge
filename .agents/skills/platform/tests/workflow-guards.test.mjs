import { test, describe } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  parseYaml,
  loadWorkflow,
  evaluateGuard,
  computeLegalEvents
} from '../workflow-state-machine.mjs';

const SCRIPT = '.agents/skills/platform/workflow-state-machine.mjs';
const REPO_WORKFLOWS_DIR = path.resolve(SCRIPT, '../workflows');

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// State isolation: tests never touch the repository's platform/state. The
// workflow and state directories are redirected per invocation.
function runWorkflow(args, { stateDir, workflowsDir } = {}) {
  const env = { ...process.env };
  if (stateDir) env.WORKFLOW_STATE_MACHINE_STATE_DIR = stateDir;
  if (workflowsDir) env.WORKFLOW_STATE_MACHINE_WORKFLOWS_DIR = workflowsDir;
  return spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8', env });
}

function writeSnapshot(stateDir, snapshot) {
  fs.mkdirSync(stateDir, { recursive: true });
  fs.writeFileSync(path.join(stateDir, snapshot.workflow + '.json'), JSON.stringify(snapshot, null, 2));
}

function readSnapshot(stateDir, workflow) {
  return JSON.parse(fs.readFileSync(path.join(stateDir, workflow + '.json'), 'utf8'));
}

// A snapshot with a non-empty history (getCurrentState falls back to the entry
// point for empty histories) and an explicit context.
function snapshot(workflow, currentState, context) {
  return {
    workflow,
    version: '2.0',
    currentState,
    history: [{ state: currentState, enteredAt: '2026-10-10T00:00:00.000Z', event: null }],
    context
  };
}

const CLEAN_DEFAULTS = {
  review: { standardsFindings: 0, specFindings: 0 },
  gateCI: 'pending',
  loopIterations: 0,
  maxIterations: 5
};

const FINDINGS_CONTEXT = {
  ...CLEAN_DEFAULTS,
  review: { standardsFindings: 0, specFindings: 2 }
};

const CLEAN_GUARD = 'review.standardsFindings == 0 && review.specFindings == 0';
const LOOP_GUARD = 'loopIterations < maxIterations';
const GATE_GUARD = 'gateCI == "passed"';

describe('workflow-state-machine guards: legal-events', () => {
  test('legal-events lists the full router set at the entry state', (t) => {
    const stateDir = tempDir('quirk-guards-legal-');
    t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));
    const result = runWorkflow(['standard-feature', 'legal-events', '--json'], { stateDir });
    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.workflow, 'standard-feature');
    assert.equal(payload.currentState, 'ask-to');
    assert.deepEqual(payload.legalEvents, [
      'AMBIGUOUS', 'CLEAR_SPEC', 'BUG', 'NEW_PROJECT', 'VIABILITY_CHECK', 'LARGE_EFFORT', 'MONITORING'
    ]);
    assert.deepEqual(payload.blockedEvents, []);
  });

  test('legal-events applies the review-pr guards to the legal set', (t) => {
    const stateDir = tempDir('quirk-guards-review-');
    t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));

    writeSnapshot(stateDir, snapshot('standard-feature', 'review-pr', CLEAN_DEFAULTS));
    const clean = JSON.parse(runWorkflow(['standard-feature', 'legal-events', '--json'], { stateDir }).stdout);
    assert.deepEqual(clean.legalEvents, ['CLEAN', 'FINDINGS', 'CONFLICT']);
    assert.deepEqual(clean.blockedEvents, []);

    writeSnapshot(stateDir, snapshot('standard-feature', 'review-pr', FINDINGS_CONTEXT));
    const dirty = JSON.parse(runWorkflow(['standard-feature', 'legal-events', '--json'], { stateDir }).stdout);
    assert.deepEqual(dirty.legalEvents, ['FINDINGS', 'CONFLICT']);
    assert.equal(dirty.blockedEvents.length, 1);
    assert.equal(dirty.blockedEvents[0].event, 'CLEAN');
    assert.equal(dirty.blockedEvents[0].target, 'ship-subissue');
    assert.equal(dirty.blockedEvents[0].guard, CLEAN_GUARD);
  });

  test('legal-events applies the gateCI guard on publish-open-pr', (t) => {
    const stateDir = tempDir('quirk-guards-gate-');
    t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));

    writeSnapshot(stateDir, snapshot('standard-feature', 'publish-open-pr', CLEAN_DEFAULTS));
    const pending = JSON.parse(runWorkflow(['standard-feature', 'legal-events', '--json'], { stateDir }).stdout);
    assert.deepEqual(pending.legalEvents, ['FAILED']);
    assert.equal(pending.blockedEvents[0].event, 'OPENED');
    assert.equal(pending.blockedEvents[0].guard, GATE_GUARD);

    writeSnapshot(stateDir, snapshot('standard-feature', 'publish-open-pr', { ...CLEAN_DEFAULTS, gateCI: 'passed' }));
    const passed = JSON.parse(runWorkflow(['standard-feature', 'legal-events', '--json'], { stateDir }).stdout);
    assert.deepEqual(passed.legalEvents, ['OPENED', 'FAILED']);
    assert.deepEqual(passed.blockedEvents, []);
  });

  test('legal-events formalizes the loop budget guard before counter escalation', (t) => {
    const stateDir = tempDir('quirk-guards-loop-');
    t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));

    writeSnapshot(stateDir, snapshot('standard-feature', 'review-pr', { ...CLEAN_DEFAULTS, loopIterations: 5 }));
    const exhausted = JSON.parse(runWorkflow(['standard-feature', 'legal-events', '--json'], { stateDir }).stdout);
    assert.deepEqual(exhausted.legalEvents, ['CLEAN', 'CONFLICT']);
    assert.equal(exhausted.blockedEvents[0].event, 'FINDINGS');
    assert.equal(exhausted.blockedEvents[0].guard, LOOP_GUARD);

    writeSnapshot(stateDir, snapshot('standard-feature', 'review-pr', { ...CLEAN_DEFAULTS, loopIterations: 1 }));
    const within = JSON.parse(runWorkflow(['standard-feature', 'legal-events', '--json'], { stateDir }).stdout);
    assert.deepEqual(within.legalEvents, ['CLEAN', 'FINDINGS', 'CONFLICT']);
    assert.deepEqual(within.blockedEvents, []);
  });

  test('legal-events text output names legal and blocked events', (t) => {
    const stateDir = tempDir('quirk-guards-text-');
    t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));
    writeSnapshot(stateDir, snapshot('standard-feature', 'review-pr', FINDINGS_CONTEXT));
    const result = runWorkflow(['standard-feature', 'legal-events'], { stateDir });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Current State: review-pr/);
    assert.match(result.stdout, /CLEAN => ship-subissue/);
    assert.match(result.stdout, /Blocked by guards:/);
    assert.match(result.stdout, /CLEAN => ship-subissue \[guard: /);
  });
});

describe('workflow-state-machine guards: transition rejection', () => {
  test('a blocked event yields rejected-by-guard with legal alternatives recorded in history', (t) => {
    const stateDir = tempDir('quirk-guards-reject-');
    t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));
    writeSnapshot(stateDir, snapshot('standard-feature', 'review-pr', FINDINGS_CONTEXT));

    const result = runWorkflow(['standard-feature', 'transition', 'CLEAN', '--json'], { stateDir });
    assert.equal(result.status, 2, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, false);
    assert.equal(payload.reason, 'rejected-by-guard');
    assert.equal(payload.event, 'CLEAN');
    assert.deepEqual(payload.legalEvents, ['FINDINGS', 'CONFLICT']);
    assert.equal(payload.guard, CLEAN_GUARD);

    const after = readSnapshot(stateDir, 'standard-feature');
    assert.equal(after.currentState, 'review-pr', 'a rejected event must not move the machine');
    const last = after.history[after.history.length - 1];
    assert.equal(last.event, 'rejected-by-guard');
    assert.equal(last.rejectedEvent, 'CLEAN');
    assert.equal(last.guard, CLEAN_GUARD);
    assert.deepEqual(last.legalEvents, ['FINDINGS', 'CONFLICT'], 'the re-offer set is recorded in history');
  });

  test('a blocked event reports the legal move set on stderr in text mode', (t) => {
    const stateDir = tempDir('quirk-guards-reject-text-');
    t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));
    writeSnapshot(stateDir, snapshot('standard-feature', 'review-pr', FINDINGS_CONTEXT));
    const result = runWorkflow(['standard-feature', 'transition', 'CLEAN'], { stateDir });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Rejected by guard: CLEAN/);
    assert.match(result.stderr, /Legal events: FINDINGS, CONFLICT/);
  });

  test('gateCI blocks OPENED until the gate passes, then the transition succeeds', (t) => {
    const stateDir = tempDir('quirk-guards-gate-transition-');
    t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));
    writeSnapshot(stateDir, snapshot('standard-feature', 'publish-open-pr', CLEAN_DEFAULTS));

    const blocked = runWorkflow(['standard-feature', 'transition', 'OPENED', '--json'], { stateDir });
    assert.equal(blocked.status, 2, blocked.stderr);
    const blockedPayload = JSON.parse(blocked.stdout);
    assert.equal(blockedPayload.reason, 'rejected-by-guard');
    assert.deepEqual(blockedPayload.legalEvents, ['FAILED']);

    writeSnapshot(stateDir, snapshot('standard-feature', 'publish-open-pr', { ...CLEAN_DEFAULTS, gateCI: 'passed' }));
    const allowed = runWorkflow(['standard-feature', 'transition', 'OPENED', '--json'], { stateDir });
    assert.equal(allowed.status, 0, allowed.stderr);
    const allowedPayload = JSON.parse(allowed.stdout);
    assert.equal(allowedPayload.current, 'review-pr');
    assert.deepEqual(allowedPayload.legalEvents, ['CLEAN', 'FINDINGS', 'CONFLICT']);
  });

  test('loop re-entry beyond the budget is rejected-by-guard, within budget it succeeds', (t) => {
    const stateDir = tempDir('quirk-guards-loop-transition-');
    t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));

    writeSnapshot(stateDir, snapshot('standard-feature', 'review-pr', { ...CLEAN_DEFAULTS, loopIterations: 5 }));
    const blocked = runWorkflow(['standard-feature', 'transition', 'FINDINGS', '--json'], { stateDir });
    assert.equal(blocked.status, 2, blocked.stderr);
    const blockedPayload = JSON.parse(blocked.stdout);
    assert.equal(blockedPayload.reason, 'rejected-by-guard');
    assert.equal(blockedPayload.guard, LOOP_GUARD);
    assert.deepEqual(blockedPayload.legalEvents, ['CLEAN', 'CONFLICT']);

    writeSnapshot(stateDir, snapshot('standard-feature', 'review-pr', { ...CLEAN_DEFAULTS, loopIterations: 1 }));
    const allowed = runWorkflow(['standard-feature', 'transition', 'FINDINGS', '--json'], { stateDir });
    assert.equal(allowed.status, 0, allowed.stderr);
    assert.equal(JSON.parse(allowed.stdout).current, 'review-fix-loop');
  });

  test('the same guards are enforced in the other three workflows', (t) => {
    const stateDir = tempDir('quirk-guards-all-workflows-');
    t.after(() => fs.rmSync(stateDir, { recursive: true, force: true }));

    for (const workflow of ['bug-fix', 'repair']) {
      writeSnapshot(stateDir, snapshot(workflow, 'review-pr', FINDINGS_CONTEXT));
      const blocked = runWorkflow([workflow, 'transition', 'CLEAN', '--json'], { stateDir });
      assert.equal(blocked.status, 2, workflow + ': ' + blocked.stderr);
      assert.equal(JSON.parse(blocked.stdout).reason, 'rejected-by-guard', workflow);
    }

    writeSnapshot(stateDir, snapshot('operations', 'deployment', { gateCI: 'pending' }));
    const deployBlocked = runWorkflow(['operations', 'transition', 'DEPLOYED', '--json'], { stateDir });
    assert.equal(deployBlocked.status, 2, deployBlocked.stderr);
    assert.equal(JSON.parse(deployBlocked.stdout).reason, 'rejected-by-guard');

    writeSnapshot(stateDir, snapshot('operations', 'deployment', { gateCI: 'passed' }));
    const deployAllowed = runWorkflow(['operations', 'transition', 'DEPLOYED', '--json'], { stateDir });
    assert.equal(deployAllowed.status, 0, deployAllowed.stderr);
    assert.equal(JSON.parse(deployAllowed.stdout).current, 'observability');
  });
});

describe('workflow-state-machine guards: backward compatibility', () => {
  // A guard-free fixture must behave exactly as the pre-guard machine did:
  // same transitions, same invalid-event error, same loop counter and
  // max-iteration escalation, and no context seeding.
  const LEGACY_YAML = `name: legacy-flow
description: pre-guard fixture used for backward compatibility
entryPoint: start
version: "1.0"

states:
  start:
    type: router
    transitions:
      GO: work
  work:
    type: executor
    loop:
      - do
    maxIterations: 2
    transitions:
      AGAIN: work
      DONE: end
  end:
    type: terminal
`;

  test('a guard-free workflow keeps the pre-guard semantics exactly', (t) => {
    const stateDir = tempDir('quirk-guards-legacy-state-');
    const workflowsDir = tempDir('quirk-guards-legacy-workflows-');
    t.after(() => {
      fs.rmSync(stateDir, { recursive: true, force: true });
      fs.rmSync(workflowsDir, { recursive: true, force: true });
    });
    fs.writeFileSync(path.join(workflowsDir, 'legacy-flow.yaml'), LEGACY_YAML);
    assert.ok(!LEGACY_YAML.includes('guards:'), 'fixture must be guard-free');

    const reset = runWorkflow(['legacy-flow', 'reset', '--json'], { stateDir, workflowsDir });
    assert.equal(reset.status, 0, reset.stderr);
    const resetState = JSON.parse(reset.stdout);
    assert.equal(resetState.currentState, 'start');
    assert.deepEqual(resetState.context, {}, 'no guard machinery leaks into guard-free workflows');

    const go = runWorkflow(['legacy-flow', 'transition', 'GO', '--json'], { stateDir, workflowsDir });
    assert.equal(go.status, 0, go.stderr);
    assert.equal(JSON.parse(go.stdout).current, 'work');

    const invalid = runWorkflow(['legacy-flow', 'transition', 'NOPE'], { stateDir, workflowsDir });
    assert.equal(invalid.status, 1);
    assert.ok(invalid.stderr.includes('Invalid event'));

    const firstLoop = runWorkflow(['legacy-flow', 'transition', 'AGAIN', '--json'], { stateDir, workflowsDir });
    assert.equal(firstLoop.status, 0, firstLoop.stderr);
    assert.equal(JSON.parse(firstLoop.stdout).current, 'work');
    assert.equal(readSnapshot(stateDir, 'legacy-flow').context.loopIterations, 1);

    // Second loop exit hits maxIterations: the pre-guard escalation is intact.
    const escalated = runWorkflow(['legacy-flow', 'transition', 'AGAIN'], { stateDir, workflowsDir });
    assert.equal(escalated.status, 1);
    assert.ok(escalated.stderr.includes('Max iterations'));
    assert.equal(readSnapshot(stateDir, 'legacy-flow').currentState, 'escalate');

    const legal = runWorkflow(['legacy-flow', 'legal-events', '--json'], { stateDir, workflowsDir });
    assert.equal(legal.status, 0, legal.stderr);
    assert.deepEqual(JSON.parse(legal.stdout).legalEvents, []);
  });

  test('a copy of the real workflow transitions its unguarded states exactly as before', (t) => {
    const stateDir = tempDir('quirk-guards-copy-state-');
    const workflowsDir = tempDir('quirk-guards-copy-workflows-');
    t.after(() => {
      fs.rmSync(stateDir, { recursive: true, force: true });
      fs.rmSync(workflowsDir, { recursive: true, force: true });
    });
    fs.copyFileSync(
      path.join(REPO_WORKFLOWS_DIR, 'standard-feature.yaml'),
      path.join(workflowsDir, 'standard-feature.yaml')
    );

    const reset = runWorkflow(['standard-feature', 'reset', '--json'], { stateDir, workflowsDir });
    assert.equal(reset.status, 0, reset.stderr);
    assert.equal(JSON.parse(reset.stdout).currentState, 'ask-to');

    const first = runWorkflow(['standard-feature', 'transition', 'AMBIGUOUS', '--json'], { stateDir, workflowsDir });
    assert.equal(first.status, 0, first.stderr);
    assert.equal(JSON.parse(first.stdout).current, 'grill-with-docs');

    const second = runWorkflow(['standard-feature', 'transition', 'SHARP_ENOUGH', '--json'], { stateDir, workflowsDir });
    assert.equal(second.status, 0, second.stderr);
    assert.equal(JSON.parse(second.stdout).current, 'to-spec');

    const invalid = runWorkflow(['standard-feature', 'transition', 'INVALID_EVENT'], { stateDir, workflowsDir });
    assert.equal(invalid.status, 1);
    assert.ok(invalid.stderr.includes('Invalid event'));

    const legal = runWorkflow(['standard-feature', 'legal-events', '--json'], { stateDir, workflowsDir });
    assert.deepEqual(JSON.parse(legal.stdout).legalEvents, ['PUBLISHED', 'MISSING_INPUT', 'BLOCKED']);
  });
});

describe('workflow-state-machine guards: replay stability', () => {
  test('the same event sequence from the same snapshot yields identical decisions', (t) => {
    const dirA = tempDir('quirk-guards-replay-a-');
    const dirB = tempDir('quirk-guards-replay-b-');
    t.after(() => {
      fs.rmSync(dirA, { recursive: true, force: true });
      fs.rmSync(dirB, { recursive: true, force: true });
    });

    const sequence = [
      ['standard-feature', 'transition', 'CLEAN', '--json'],
      ['standard-feature', 'legal-events', '--json'],
      ['standard-feature', 'transition', 'FINDINGS', '--json'],
      ['standard-feature', 'legal-events', '--json'],
      ['standard-feature', 'transition', 'CONFLICT', '--json']
    ];

    const play = (stateDir) => {
      writeSnapshot(stateDir, snapshot('standard-feature', 'review-pr', FINDINGS_CONTEXT));
      return sequence.map((args) => {
        const result = runWorkflow(args, { stateDir });
        return { status: result.status, stdout: JSON.parse(result.stdout) };
      });
    };

    const first = play(dirA);
    const second = play(dirB);
    assert.deepEqual(first, second, 'identical snapshots must decide identically');

    // Determinism across repeats in the same directory.
    const third = play(dirA);
    assert.deepEqual(first, third, 'replaying the same sequence must not change decisions');

    // The replayed sequence must contain the guard rejection exactly once,
    // followed by the legal alternatives and the successful re-entry.
    assert.equal(first[0].status, 2);
    assert.equal(first[0].stdout.reason, 'rejected-by-guard');
    assert.deepEqual(first[1].stdout.legalEvents, ['FINDINGS', 'CONFLICT']);
    assert.equal(first[2].status, 0);
    assert.equal(first[2].stdout.current, 'review-fix-loop');
    assert.equal(first[4].status, 0);
    assert.equal(first[4].stdout.current, 'resolving-merge-conflicts');
  });
});

describe('guard expression evaluator (pure, fail-closed)', () => {
  test('comparisons, logic, parentheses, literals and len()', () => {
    const context = {
      review: { standardsFindings: 0, specFindings: 3, findings: ['a', 'b'], blocked: false, approved: true },
      gateCI: 'passed',
      count: 7,
      note: 'ship it',
      nothing: null
    };
    assert.equal(evaluateGuard('review.standardsFindings == 0', context), true);
    assert.equal(evaluateGuard('review.specFindings == 0', context), false);
    assert.equal(evaluateGuard('review.specFindings != 0', context), true);
    assert.equal(evaluateGuard('count >= 7 && count <= 7', context), true);
    assert.equal(evaluateGuard('count > 7 || count < 7', context), false);
    assert.equal(evaluateGuard('review.standardsFindings == 0 && review.specFindings == 0', context), false);
    assert.equal(evaluateGuard('!(review.blocked == true) && review.approved == true', context), true);
    assert.equal(evaluateGuard('!review.blocked', context), true);
    assert.equal(evaluateGuard('(count > 100) || (review.approved == true)', context), true);
    assert.equal(evaluateGuard('gateCI == "passed"', context), true);
    assert.equal(evaluateGuard('gateCI == "failed"', context), false);
    assert.equal(evaluateGuard('note == "ship it"', context), true);
    assert.equal(evaluateGuard('len(review.findings) >= 2', context), true);
    assert.equal(evaluateGuard('len(review.findings) >= 3', context), false);
    assert.equal(evaluateGuard('count == 7', context), true);
    assert.equal(evaluateGuard('count == 7.0', context), true);
    assert.equal(evaluateGuard('nothing == null', context), true);
  });

  test('missing context paths and malformed expressions fail closed', () => {
    const context = { review: { standardsFindings: 0 } };
    assert.equal(evaluateGuard('review.missing == 1', context), false);
    assert.equal(evaluateGuard('gateCI == "passed"', context), false);
    assert.equal(evaluateGuard('len(review.findings) >= 1', context), false);
    assert.equal(evaluateGuard('review.standardsFindings ==', context), false);
    assert.equal(evaluateGuard('(review.standardsFindings == 0', context), false);
    assert.equal(evaluateGuard('review.standardsFindings == 0 &&', context), false);
    assert.equal(evaluateGuard('review.exports == 1', context), false);
    assert.equal(evaluateGuard('', context), true, 'an empty expression is treated as no guard');
  });

  test('guards are pure: same state + same context yields the same decision', () => {
    const context = { review: { standardsFindings: 1, specFindings: 0 } };
    const expression = 'review.standardsFindings == 0 && review.specFindings == 0';
    const decisions = Array.from({ length: 25 }, () => evaluateGuard(expression, context));
    assert.deepEqual(new Set(decisions), new Set([false]));
    assert.equal(evaluateGuard(expression, { review: { standardsFindings: 0, specFindings: 0 } }), true);
    // Re-evaluating after a different context does not leak state.
    assert.equal(evaluateGuard(expression, context), false);
  });

  test('computeLegalEvents treats events without guards as always legal', () => {
    const workflow = parseYaml(`name: mini
entryPoint: a
version: "1.0"
states:
  a:
    type: router
    transitions:
      GO: b
      STAY: a
  b:
    type: terminal
`);
    const state = snapshot('mini', 'a', {});
    const { legalEvents, blockedEvents } = computeLegalEvents(workflow, state);
    assert.deepEqual(legalEvents, ['GO', 'STAY']);
    assert.deepEqual(blockedEvents, []);
  });
});

describe('workflow guard declarations (repository workflows)', () => {
  test('the four workflows declare the documented guards and context defaults', () => {
    const standard = loadWorkflow('standard-feature');
    assert.deepEqual(standard.context, CLEAN_DEFAULTS);
    assert.deepEqual(standard.states['review-pr'].guards, { CLEAN: CLEAN_GUARD, FINDINGS: LOOP_GUARD });
    assert.deepEqual(standard.states['publish-open-pr'].guards, { OPENED: GATE_GUARD });

    const bugFix = loadWorkflow('bug-fix');
    assert.deepEqual(bugFix.context, CLEAN_DEFAULTS);
    assert.deepEqual(bugFix.states['review-pr'].guards, { CLEAN: CLEAN_GUARD, FINDINGS: LOOP_GUARD });
    assert.deepEqual(bugFix.states['publish-open-pr'].guards, { OPENED: GATE_GUARD });

    const repair = loadWorkflow('repair');
    assert.deepEqual(repair.context, { review: { standardsFindings: 0, specFindings: 0 }, loopIterations: 0, maxIterations: 5 });
    assert.deepEqual(repair.states['review-pr'].guards, { CLEAN: CLEAN_GUARD, FINDINGS: LOOP_GUARD });

    const operations = loadWorkflow('operations');
    assert.deepEqual(operations.context, { gateCI: 'pending' });
    assert.deepEqual(operations.states.deployment.guards, { DEPLOYED: GATE_GUARD });
  });
});
