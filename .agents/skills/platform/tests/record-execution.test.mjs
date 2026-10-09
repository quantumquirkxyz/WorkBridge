import { test, describe } from 'node:test';
import assert from 'node:assert';
import { recordExecution, validateTrace } from '../record-execution.mjs';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('record-execution.mjs', () => {
  test('recordExecution returns a valid ExecutionTrace', async () => {
    const tracesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quirk-traces-'));
    try {
      const runPath = await recordExecution({
        repoRoot: tracesDir,
        skill: 'test-skill',
        result: 'completed'
      });
      assert.ok(runPath.endsWith('.jsonl'));
      const content = fs.readFileSync(runPath, 'utf8').trim();
      const trace = JSON.parse(content);
      assert.equal(trace.skill, 'test-skill');
      assert.equal(trace.result, 'completed');
    } finally {
      fs.rmSync(tracesDir, { recursive: true, force: true });
    }
  });

  test('trace is written to .agents/skills/platform/traces/', async () => {
    const tracesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quirk-traces-'));
    try {
      const runPath = await recordExecution({
        repoRoot: tracesDir,
        skill: 'test-skill-2'
      });
      const expectedDir = path.join(tracesDir, '.agents', 'skills', 'platform', 'traces');
      assert.ok(runPath.startsWith(expectedDir));
      assert.ok(fs.existsSync(runPath));
    } finally {
      fs.rmSync(tracesDir, { recursive: true, force: true });
    }
  });

  test('trace validates against schema', async () => {
    const tracesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quirk-traces-'));
    try {
      const runPath = await recordExecution({
        repoRoot: tracesDir,
        skill: 'test-skill-3',
        result: 'completed'
      });
      const content = fs.readFileSync(runPath, 'utf8').trim();
      const trace = JSON.parse(content);
      const errors = validateTrace(trace);
      assert.equal(errors.length, 0, errors.join(', '));
    } finally {
      fs.rmSync(tracesDir, { recursive: true, force: true });
    }
  });

  test('trace has required fields (traceId, spanId, skill, result)', async () => {
    const tracesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'quirk-traces-'));
    try {
      const runPath = await recordExecution({
        repoRoot: tracesDir,
        skill: 'test-skill-4',
        result: 'completed'
      });
      const content = fs.readFileSync(runPath, 'utf8').trim();
      const trace = JSON.parse(content);
      assert.ok(trace.traceId, 'traceId should exist');
      assert.ok(trace.spanId, 'spanId should exist');
      assert.equal(trace.skill, 'test-skill-4');
      assert.equal(trace.result, 'completed');
    } finally {
      fs.rmSync(tracesDir, { recursive: true, force: true });
    }
  });
});
