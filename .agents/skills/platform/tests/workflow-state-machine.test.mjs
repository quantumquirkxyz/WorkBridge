import { test, describe } from 'node:test';
import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SCRIPT = '.agents/skills/platform/workflow-state-machine.mjs';
const STATE_DIR = '.agents/skills/platform/state';
const STATE_FILE = path.join(STATE_DIR, 'standard-feature.json');

function run(args) {
  return spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8' });
}

function cleanup() {
  try { fs.unlinkSync(STATE_FILE); } catch {}
}

describe('workflow-state-machine.mjs', () => {
  test('standard-feature starts at ask-to', () => {
    cleanup();
    const result = run(['standard-feature', 'reset', '--json']);
    assert.equal(result.status, 0, result.stderr);
    const state = JSON.parse(result.stdout);
    assert.equal(state.currentState, 'ask-to');
  });

  test('AMBIGUOUS transition from ask-to goes to grill-with-docs', () => {
    cleanup();
    run(['standard-feature', 'reset']);
    const result = run(['standard-feature', 'transition', 'AMBIGUOUS', '--json']);
    assert.equal(result.status, 0, result.stderr);
    const state = JSON.parse(result.stdout);
    assert.equal(state.current, 'grill-with-docs');
  });

  test('SHARP_ENOUGH transition from grill-with-docs goes to to-spec', () => {
    cleanup();
    run(['standard-feature', 'reset']);
    run(['standard-feature', 'transition', 'AMBIGUOUS']);
    const result = run(['standard-feature', 'transition', 'SHARP_ENOUGH', '--json']);
    assert.equal(result.status, 0, result.stderr);
    const state = JSON.parse(result.stdout);
    assert.equal(state.current, 'to-spec');
  });

  test('Invalid event returns exit code 1', () => {
    cleanup();
    run(['standard-feature', 'reset']);
    const result = run(['standard-feature', 'transition', 'INVALID_EVENT']);
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes('Invalid event'));
  });

  test('State persists to .agents/skills/platform/state/', () => {
    cleanup();
    run(['standard-feature', 'reset']);
    assert.ok(fs.existsSync(STATE_FILE), 'State file should exist');
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    assert.equal(state.workflow, 'standard-feature');
    assert.ok(state.history.length > 0);
  });
});
