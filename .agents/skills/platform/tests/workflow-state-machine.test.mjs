import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SCRIPT = '.agents/skills/platform/workflow-state-machine.mjs';

// State isolation: platform/state is a tracked runtime artifact, so the tests
// never write to it. Each test gets its own state directory through the same
// environment override the machine documents (workflow-state-machine.mjs) and
// that workflow-guards.test.mjs already uses.
let stateDir;

function run(args) {
  return spawnSync('node', [SCRIPT, ...args], {
    encoding: 'utf8',
    env: { ...process.env, WORKFLOW_STATE_MACHINE_STATE_DIR: stateDir }
  });
}

describe('workflow-state-machine.mjs', () => {
  beforeEach(() => {
    stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quirk-state-machine-'));
  });

  afterEach(() => {
    fs.rmSync(stateDir, { recursive: true, force: true });
  });

  test('standard-feature starts at ask-to', () => {
    const result = run(['standard-feature', 'reset', '--json']);
    assert.equal(result.status, 0, result.stderr);
    const state = JSON.parse(result.stdout);
    assert.equal(state.currentState, 'ask-to');
  });

  test('AMBIGUOUS transition from ask-to goes to grill-with-docs', () => {
    run(['standard-feature', 'reset']);
    const result = run(['standard-feature', 'transition', 'AMBIGUOUS', '--json']);
    assert.equal(result.status, 0, result.stderr);
    const state = JSON.parse(result.stdout);
    assert.equal(state.current, 'grill-with-docs');
  });

  test('SHARP_ENOUGH transition from grill-with-docs goes to to-spec', () => {
    run(['standard-feature', 'reset']);
    run(['standard-feature', 'transition', 'AMBIGUOUS']);
    const result = run(['standard-feature', 'transition', 'SHARP_ENOUGH', '--json']);
    assert.equal(result.status, 0, result.stderr);
    const state = JSON.parse(result.stdout);
    assert.equal(state.current, 'to-spec');
  });

  test('Invalid event returns exit code 1', () => {
    run(['standard-feature', 'reset']);
    const result = run(['standard-feature', 'transition', 'INVALID_EVENT']);
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes('Invalid event'));
  });

  test('State persists to the workflow state directory', () => {
    run(['standard-feature', 'reset']);
    const stateFile = path.join(stateDir, 'standard-feature.json');
    assert.ok(fs.existsSync(stateFile), 'State file should exist');
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    assert.equal(state.workflow, 'standard-feature');
    assert.ok(state.history.length > 0);
  });
});
