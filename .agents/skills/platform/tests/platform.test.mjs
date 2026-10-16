import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

function run(args) {
  return spawnSync('node', args, { encoding: 'utf8' });
}

test('scenario evaluator passes on repository fixtures', () => {
  const result = run(['.agents/skills/platform/evaluate-scenarios.mjs']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, 'pass');
  assert.equal(payload.scenarios, 8);
});

// Wave-1 contract: the semantic auditor reports a documented, heuristic warning
// category (load-bearing rules after line 150 - compaction keeps only the start of
// re-injected skill bodies). Warnings stay advisory and never block the gate, so
// only unexpected warning categories fail here.
const auditSemanticsWarningPatterns = [
  /^[^:]+: load-bearing rules appear after line 150/,
];

test('semantic audit passes with only advisory warning categories', () => {
  const result = run(['.agents/skills/platform/audit-semantics.mjs']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, 'pass');
  assert.strictEqual(payload.errors.length, 0, `Unexpected errors: ${JSON.stringify(payload.errors)}`);
  const unexpectedWarnings = payload.warnings.filter(
    (warning) => !auditSemanticsWarningPatterns.some((pattern) => pattern.test(warning)),
  );
  assert.deepStrictEqual(unexpectedWarnings, [], `Unexpected warning categories: ${JSON.stringify(unexpectedWarnings)}`);
});

test('sync bundle defaults to dry-run', () => {
  const target = fs.mkdtempSync('/tmp/quirk-sync-test-');
  const result = run(['.agents/skills/platform/sync-bundle.mjs', target]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.mode, 'dry-run');
  assert.equal(fs.existsSync(`${target}/.agents`), false);
});
