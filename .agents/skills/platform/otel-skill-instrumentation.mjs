#!/usr/bin/env node
// otel-skill-instrumentation.mjs - OpenTelemetry instrumentation for skill execution
// Usage: node otel-skill-instrumentation.mjs <skill-name> [--trace-id <id>] [--span-id <id>]

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const tracesDir = path.join(root, '.agents', 'skills', 'platform', 'traces');

function parseFrontmatter(text) {
  if (!text.startsWith('---')) return {};
  const end = text.indexOf('\n---', 3);
  if (end === -1) return {};
  const out = {};
  let active = null;
  for (const line of text.slice(4, end).split(/\r?\n/)) {
    const key = line.match(/^([A-Za-z][A-Za-z0-9-]*):\s*(.*)$/);
    if (key) {
      active = key[1];
      out[active] = key[2] === '' || key[2] === '[]' ? [] : key[2].replace(/^["']|["']$/g, '');
      continue;
    }
    const item = line.match(/^\s+-\s+(.+)$/);
    if (item && active) {
      if (!Array.isArray(out[active])) out[active] = [];
      out[active].push(item[1].replace(/^["']|["']$/g, ''));
    }
  }
  return out;
}

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

function generateTraceId() { return crypto.randomBytes(16).toString('hex'); }
function generateSpanId() { return crypto.randomBytes(8).toString('hex'); }

async function startTrace(skillName, traceId, spanId, parentSpanId = null) {
  const trace = {
    traceId: traceId || generateTraceId(),
    spanId: spanId || generateSpanId(),
    parentSpanId,
    skill: skillName,
    spans: [],
    startedAt: new Date().toISOString(),
    finishedAt: null,
    status: 'running',
  };

  await fs.mkdir(tracesDir, { recursive: true });
  const tracePath = path.join(tracesDir, `${trace.traceId}-${skillName}.json`);
  await fs.writeFile(tracePath, JSON.stringify(trace, null, 2) + '\n');
  return trace;
}

async function addSpan(trace, name, kind = 'internal', attributes = {}) {
  const span = {
    spanId: generateSpanId(),
    parentSpanId: trace.spanId,
    name,
    kind,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: 0,
    attributes: {
      'skill.name': trace.skill,
      'gen_ai.skill.name': trace.skill,
      ...attributes,
    },
    events: [],
  };
  span.durationMs = new Date(span.finishedAt) - new Date(span.startedAt);
  trace.spans.push(span);
  return span;
}

async function finishTrace(trace, status = 'ok', errors = []) {
  trace.finishedAt = new Date().toISOString();
  trace.status = status;
  trace.errors = errors;
  trace.durationMs = new Date(trace.finishedAt) - new Date(trace.startedAt);

  const tracePath = path.join(tracesDir, `${trace.traceId}-${trace.skill}.json`);
  await fs.writeFile(tracePath, JSON.stringify(trace, null, 2) + '\n');
  return trace;
}

async function instrumentSkill(skillName, fn) {
  const trace = await startTrace(skillName);

  try {
    const loadSpan = await addSpan(trace, 'skill.load', 'internal', { 'skill.phase': 'load' });
    const skillFile = path.join(root, '.agents', 'skills', skillName, 'SKILL.md');
    if (!await exists(skillFile)) {
      await addSpan(trace, 'skill.load.error', 'internal', { 'error': 'Skill not found', 'skill.path': skillFile });
      await finishTrace(trace, 'error', [`Skill not found: ${skillName}`]);
      return { error: `Skill not found: ${skillName}` };
    }
    const text = await fs.readFile(skillFile, 'utf8');
    const fm = parseFrontmatter(text);
    const body = text.replace(/^---[\s\S]*?---\s*/, '');
    loadSpan.attributes['skill.loaded'] = true;

    const executeSpan = await addSpan(trace, 'skill.execute', 'internal', {
      'skill.phase': 'execute',
      'skill.trustTier': fm.trustTier || '1',
      'skill.risk': fm.risk || 'low',
      'skill.version': fm.version || '1.0.0',
      'skill.tokens': body.split(/\s+/).length,
    });

    const result = await fn({ skillName, skillFile, text, fm, body });

    executeSpan.attributes['skill.execute.status'] = result.status || 'ok';
    executeSpan.attributes['skill.execute.durationMs'] = result.durationMs || 0;

    if (result.sideEffects?.length) {
      for (const effect of result.sideEffects) {
        await addSpan(trace, `skill.side_effect.${effect}`, 'client', { 'skill.side_effect': effect });
      }
    }

    await finishTrace(trace, result.status || 'ok', result.errors || []);
    return result;
  } catch (err) {
    await addSpan(trace, 'skill.error', 'internal', { 'error.message': err.message, 'error.stack': err.stack });
    await finishTrace(trace, 'error', [err.message]);
    throw err;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const skillName = args.find(a => !a.startsWith('--'));

  if (!skillName) {
    console.error('Usage: node otel-skill-instrumentation.mjs <skill-name>');
    process.exit(1);
  }

  const result = await instrumentSkill(skillName, async () => {
    const start = Date.now();
    return { status: 'ok', durationMs: Date.now() - start };
  });

  console.log(JSON.stringify({ traced: skillName, status: result.status || 'ok' }, null, 2));
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
