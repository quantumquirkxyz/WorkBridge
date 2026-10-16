import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const SCRIPT = '.agents/skills/platform/skill-lab.mjs';

test('tutorial resolves a unique nested skill by basename', () => {
  const result = spawnSync('node', [SCRIPT, 'tutorial', 'skill-tutor'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^# Tutorial: skill-tutor/m);
});

test('help documents every implemented command', () => {
  const result = spawnSync('node', [SCRIPT, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  for (const command of ['list', 'search', 'template', 'validate', 'graph', 'rules', 'diff', 'tutorial', 'metrics', 'cost', 'playground', 'pr-check', 'evolve', 'work-item']) {
    assert.match(result.stdout, new RegExp(`\\b${command}\\b`));
  }
});
