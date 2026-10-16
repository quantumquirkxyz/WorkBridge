import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  EVENT_ORDER,
  REDACT_KEYS,
  REDACTED,
  SKILL_RUN_SCHEMA_PATH,
  SkillRunSession,
  createSession,
  newSkillRun,
  record,
  redact,
  validateSkillRun,
} from '../scripts/skill-run-recorder.mjs';
import {
  ORDER,
  analyzeIntegrity,
  compareRuns,
  loadSkillRuns,
  projectEvent,
  replay,
} from '../scripts/replay-skill-run.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RECORDER = path.join(HERE, '..', 'scripts', 'skill-run-recorder.mjs');
const REPLAY = path.join(HERE, '..', 'scripts', 'replay-skill-run.mjs');
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const SINK_ROOT = path.join(REPO_ROOT, '.agents', 'skills', 'platform', 'skill-runs');

function sinkSnapshot() {
  if (!fs.existsSync(SINK_ROOT)) return {};
  return Object.fromEntries(
    fs.readdirSync(SINK_ROOT).map((name) => [name, fs.statSync(path.join(SINK_ROOT, name)).size]),
  );
}
const SINK_BEFORE = sinkSnapshot();
function assertSinkUnchanged() {
  assert.deepEqual(sinkSnapshot(), SINK_BEFORE);
}

const scratchDirs = [];
function makeScratch(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `quirk-skill-runs-${label}-`));
  scratchDirs.push(dir);
  return dir;
}
process.on('exit', () => {
  for (const dir of scratchDirs) fs.rmSync(dir, { recursive: true, force: true });
});

function iso(offsetMs) {
  return new Date(Date.UTC(2026, 9, 11, 6, 0, 0, 0) + offsetMs).toISOString();
}

function buildTrace({ withRun = true, outOfOrder = false, duplicateSpan = false } = {}) {
  const traceId = crypto.randomUUID();
  const root = crypto.randomUUID();
  const first = crypto.randomUUID();
  const second = crypto.randomUUID();
  const third = crypto.randomUUID();
  const base = { traceId, skill: 'platform/skill-run-test', skillVersion: '2.0', promptVersion: '2.0' };
  const events = [
    { spanId: root, parentSpanId: null, ts: iso(0), event: 'route.started' },
    { spanId: first, parentSpanId: root, ts: iso(5), event: 'route.selected' },
    { spanId: second, parentSpanId: first, ts: iso(9), event: 'context.loaded' },
    {
      spanId: third,
      parentSpanId: second,
      ts: iso(15),
      event: 'tool.called',
      tools: [{ name: 'Read', inputHash: 'a'.repeat(64), outputHash: 'b'.repeat(64), durationMs: 5 }],
    },
    { spanId: crypto.randomUUID(), parentSpanId: third, ts: iso(20), event: 'artifact.created', artifacts: [{ path: 'schema/skill-run.schema.json', bytes: 12 }] },
  ];
  if (outOfOrder) {
    const [rootEvent, ...rest] = events;
    return [rest[2], rest[0], rest[1], ...rest.slice(3)].map((event, index) => newSkillRun({ ...base, ...event, ts: iso(index) }));
  }
  const records = events.map((event) => newSkillRun({ ...base, ...event }));
  if (duplicateSpan) records[2] = newSkillRun({ ...records[2], spanId: records[0].spanId });
  if (withRun) {
    records.push(newSkillRun({
      ...base,
      spanId: crypto.randomUUID(),
      parentSpanId: records[records.length - 1].spanId,
      ts: iso(40),
      event: 'run.completed',
      verdict: 'pass',
      failureMode: null,
      durationMs: 40,
      cost: { inputTokens: 12, outputTokens: 4, costUsd: 0.001 },
    }));
  }
  return records;
}

describe('newSkillRun and validateSkillRun', () => {
  test('the minimal record passes validation', () => {
    const minimal = newSkillRun({ event: 'route.started', skill: 'platform/skill-run-test' });
    assert.equal(typeof minimal.traceId, 'string');
    assert.equal(typeof minimal.spanId, 'string');
    assert.equal(minimal.parentSpanId, null);
    assert.equal(minimal.schemaVersion, '1.0');
    assert.equal(Number.isNaN(Date.parse(minimal.ts)), false);
    assert.deepEqual(validateSkillRun(minimal), []);
    assert.equal(Object.hasOwn(minimal, 'cost'), false);
    assert.equal(Object.hasOwn(minimal, 'verdict'), false);
  });

  test('a record without traceId fails validation', () => {
    const missing = newSkillRun({ event: 'route.started', skill: 'platform/skill-run-test' });
    delete missing.traceId;
    const errors = validateSkillRun(missing);
    assert.ok(errors.length > 0);
    assert.ok(errors.some((error) => error.includes('traceId')));
  });

  test('an event outside the enum fails validation', () => {
    const built = newSkillRun({ event: 'route.exploded', skill: 'platform/skill-run-test' });
    const errors = validateSkillRun(built);
    assert.ok(errors.some((error) => error.includes('event')));
    assert.ok(errors.some((error) => error.includes('is not one of')));
  });

  test('an unexpected property fails validation', () => {
    const extra = newSkillRun({ event: 'route.started', skill: 'platform/skill-run-test' });
    extra.customField = 'not part of the contract';
    const errors = validateSkillRun(extra);
    assert.ok(errors.some((error) => error.includes('customField')));
  });

  test('the minimal validator rejects a string where an integer belongs', () => {
    const wrong = newSkillRun({ event: 'run.completed', skill: 'platform/skill-run-test' });
    wrong.durationMs = '12';
    const errors = validateSkillRun(wrong);
    assert.ok(errors.some((error) => error.includes('durationMs') && error.includes('integer')));
    const wrongCount = newSkillRun({ event: 'run.completed', skill: 'platform/skill-run-test' });
    wrongCount.cost = { inputTokens: '12', outputTokens: 0, costUsd: 0 };
    assert.ok(validateSkillRun(wrongCount).some((error) => error.includes('cost.inputTokens')));
  });

  test('a record outside the verdict enum and a wrong uuid shape fail validation', () => {
    const badVerdict = newSkillRun({ event: 'run.completed', skill: 'platform/skill-run-test', verdict: 'maybe' });
    assert.ok(validateSkillRun(badVerdict).some((error) => error.includes('verdict')));
    const badUuid = newSkillRun({ event: 'route.started', skill: 'platform/skill-run-test' });
    badUuid.spanId = 'not-a-uuid';
    assert.ok(validateSkillRun(badUuid).some((error) => error.includes('spanId')));
  });

  test('record() throws a validation error while newSkillRun() stays total', () => {
    assert.throws(() => record({ event: 'nope', skill: 'platform/skill-run-test' }), /failed validation/);
    const built = newSkillRun({ event: 'nope', skill: 'platform/skill-run-test' });
    assert.equal(built.event, 'nope');
  });

  test('the schema on disk declares the required keys and the closed root', () => {
    const schema = JSON.parse(fs.readFileSync(SKILL_RUN_SCHEMA_PATH, 'utf8'));
    assert.equal(schema.additionalProperties, false);
    assert.deepEqual(schema.required, ['schemaVersion', 'traceId', 'spanId', 'ts', 'event', 'skill']);
    assert.equal(schema.properties.event.type, 'string');
    assert.equal(schema.properties.verdict.enum.length, 4);
    assert.deepEqual(schema.properties.event.enum, ORDER);
  });
});

describe('redact', () => {
  test('nested sensitive keys are obscured and normal values are untouched', () => {
    const value = {
      tool: 'Read',
      durationMs: 12,
      ok: true,
      note: null,
      list: [
        { authorization: 'bearer demo material', nested: { apiKey: 'demo material', tier: 'code' } },
        { name: 'plain', password: 'demo material' },
      ],
    };
    const redacted = redact(value);
    assert.equal(redacted.tool, 'Read');
    assert.equal(redacted.durationMs, 12);
    assert.equal(redacted.ok, true);
    assert.equal(redacted.note, null);
    assert.equal(redacted.list[0].authorization, REDACTED);
    assert.equal(redacted.list[0].nested.apiKey, REDACTED);
    assert.equal(redacted.list[0].nested.tier, 'code');
    assert.equal(redacted.list[1].password, REDACTED);
    assert.equal(redacted.list[1].name, 'plain');
    assert.equal(value.list[0].authorization, 'bearer demo material');
  });

  test('REDACT_KEYS is the documented key set and matching is case-insensitive', () => {
    assert.deepEqual(REDACT_KEYS, [
      'authorization', 'api_key', 'apiKey', 'token', 'secret', 'password', 'cookie', 'set-cookie',
    ]);
    const redacted = redact({ SetCookie: 'x', TOKEN: 'y' });
    assert.equal(redacted.SetCookie, REDACTED);
    assert.equal(redacted.TOKEN, REDACTED);
  });

  test('records are redacted before they leave the builder', () => {
    const built = newSkillRun({ event: 'tool.called', skill: 'platform/skill-run-test', evidence: ['authorization header seen'] });
    assert.equal(built.evidence[0], 'authorization header seen');
    const nested = newSkillRun({
      event: 'tool.called',
      skill: 'platform/skill-run-test',
      sideEffects: ['write-files'],
    });
    assert.deepEqual(validateSkillRun(nested), []);
  });
});

describe('replay', () => {
  test('a five-event trace replays in order and reports the missing run.completed', () => {
    const records = buildTrace({ withRun: false });
    assert.equal(records.length, 5);
    const replayed = replay(records);
    assert.deepEqual(replayed.events.map((entry) => entry.event), [
      'route.started', 'route.selected', 'context.loaded', 'tool.called', 'artifact.created',
    ]);
    assert.deepEqual(replayed.skills, ['platform/skill-run-test']);
    assert.equal(replayed.verdict, null);
    assert.equal(replayed.completed, false);
    assert.equal(replayed.tools.length, 1);
    assert.equal(replayed.tools[0].name, 'Read');
    assert.equal(replayed.tools[0].calls, 1);
    assert.equal(replayed.artifacts.length, 1);
    assert.equal(replayed.artifacts[0].path, 'schema/skill-run.schema.json');
    assert.equal(Number.isFinite(replayed.durationMs), true);

    const integrity = analyzeIntegrity(records);
    assert.equal(integrity.complete, false);
    assert.equal(integrity.ok, false);
    assert.ok(integrity.findings.some((finding) => finding.type === 'incomplete-trace' && finding.severity === 'error'));
  });

  test('a closed trace replays with the terminal verdict and the summed cost', () => {
    const records = buildTrace({ withRun: true });
    assert.equal(records.length, 6);
    const replayed = replay(records);
    assert.equal(replayed.completed, true);
    assert.equal(replayed.verdict, 'pass');
    assert.deepEqual(replayed.cost, { inputTokens: 12, outputTokens: 4, costUsd: 0.001 });
    assert.equal(replayed.durationMs, 40);
    const integrity = analyzeIntegrity(records);
    assert.deepEqual(integrity.findings, []);
    assert.equal(integrity.ok, true);
  });

  test('loadSkillRuns reads a JSONL file and rejects a broken line', () => {
    const scratch = makeScratch('load');
    const file = path.join(scratch, 'skill-runs.jsonl');
    fs.writeFileSync(file, `${buildTrace({ withRun: true }).map((entry) => JSON.stringify(entry)).join('\n')}\n`);
    const loaded = loadSkillRuns(file);
    assert.equal(loaded.length, 6);
    fs.appendFileSync(file, 'not json\n');
    assert.throws(() => loadSkillRuns(file), /not valid JSON/);
  });

  test('empty and mixed inputs degrade instead of throwing', () => {
    assert.deepEqual(replay([]).events, []);
    assert.equal(analyzeIntegrity([]).findings[0].type, 'empty-trace');
    assert.deepEqual(replay(null).events, []);
  });
});

describe('analyzeIntegrity', () => {
  test('a duplicated spanId is a finding', () => {
    const records = buildTrace({ withRun: true, duplicateSpan: true });
    const findings = analyzeIntegrity(records).findings;
    const duplicates = findings.filter((finding) => finding.type === 'duplicate-span');
    assert.equal(duplicates.length, 1);
    assert.equal(duplicates[0].severity, 'error');
    assert.equal(duplicates[0].spanId, records[0].spanId);
  });

  test('tool.called before route.selected is out of order', () => {
    const records = buildTrace({ withRun: false, outOfOrder: true });
    const findings = analyzeIntegrity(records).findings.filter((finding) => finding.type === 'out-of-order');
    assert.ok(findings.length > 0);
    const first = findings[0];
    assert.equal(first.index, 1);
    assert.match(first.message, /tool\.called/);
    assert.match(first.message, /route\.selected/);
    assert.equal(first.severity, 'warning');
  });

  test('a dangling parentSpanId and a skill jump are findings', () => {
    const records = buildTrace({ withRun: true });
    records[2] = newSkillRun({ ...records[2], parentSpanId: crypto.randomUUID() });
    const dangling = analyzeIntegrity(records).findings.filter((finding) => finding.type === 'dangling-parent');
    assert.equal(dangling.length, 1);
    assert.equal(dangling[0].severity, 'error');

    const jumped = buildTrace({ withRun: true });
    jumped[3] = newSkillRun({ ...jumped[3], skill: 'platform/another-skill' });
    assert.ok(analyzeIntegrity(jumped).findings.some((finding) => finding.type === 'skill-jump'));

    const mixed = buildTrace({ withRun: true });
    mixed.push(newSkillRun({ ...mixed[0], traceId: crypto.randomUUID() }));
    assert.ok(analyzeIntegrity(mixed).findings.some((finding) => finding.type === 'multiple-traces'));
  });

  test('a non-repeatable event emitted twice is a duplicate phase', () => {
    const records = buildTrace({ withRun: true });
    records.push(newSkillRun({
      ...records[records.length - 1],
      spanId: crypto.randomUUID(),
      parentSpanId: records[records.length - 1].spanId,
      event: 'run.completed',
    }));
    const findings = analyzeIntegrity(records).findings.filter((finding) => finding.type === 'duplicate-phase');
    assert.equal(findings.length, 1);
    assert.equal(findings[0].event, 'run.completed');
    assert.equal(findings[0].severity, 'error');

    const repeated = buildTrace({ withRun: true });
    repeated.push(newSkillRun({
      ...repeated[repeated.length - 1],
      spanId: crypto.randomUUID(),
      parentSpanId: repeated[repeated.length - 1].spanId,
      event: 'tool.called',
      tools: [{ name: 'Grep' }],
    }));
    assert.equal(analyzeIntegrity(repeated).findings.some((finding) => finding.type === 'duplicate-phase'), false);
  });

  test('an event outside the enum is an invalid record', () => {
    const broken = buildTrace({ withRun: true });
    broken[1] = newSkillRun({ ...broken[1], event: 'route.exploded' });
    const findings = analyzeIntegrity(broken).findings;
    assert.ok(findings.some((finding) => finding.type === 'unknown-event'));
    assert.ok(findings.some((finding) => finding.type === 'invalid-record'));
  });
});

describe('compareRuns', () => {
  test('an event that only exists in A is reported', () => {
    const a = buildTrace({ withRun: true });
    const b = a.filter((entry) => entry.event !== 'context.loaded');
    const comparison = compareRuns(a, b);
    assert.equal(comparison.identical, false);
    assert.ok(comparison.onlyInA.some((entry) => entry.event === 'context.loaded' && entry.index === 2),
      JSON.stringify(comparison.onlyInA));
    assert.deepEqual(comparison.onlyInB, []);
    assert.equal(comparison.sameEvents.length, b.length);
    assert.ok(comparison.differingEvents.length > 0 || comparison.onlyInA.length > 0);
    assert.equal(comparison.verdictChanged, false);
    assert.equal(comparison.durationDelta, 0);
  });

  test('two identical replays compare equal and cost deltas are signed', () => {
    const a = buildTrace({ withRun: true });
    const comparison = compareRuns(a, a);
    assert.equal(comparison.identical, true);
    assert.deepEqual(comparison.differingEvents, []);
    assert.deepEqual(comparison.onlyInA, []);
    assert.deepEqual(comparison.onlyInB, []);
    assert.deepEqual(comparison.costDelta, { inputTokens: 0, outputTokens: 0, costUsd: 0 });
    assert.equal(comparison.sameEvents.length, a.length);

    const cheaper = buildTrace({ withRun: true });
    cheaper[cheaper.length - 1] = newSkillRun({
      ...cheaper[cheaper.length - 1],
      cost: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
    });
    const delta = compareRuns(a, cheaper).costDelta;
    assert.equal(delta.inputTokens, -12);
    assert.equal(delta.outputTokens, -4);

    const faster = buildTrace({ withRun: true });
    faster[faster.length - 1] = newSkillRun({
      ...faster[faster.length - 1],
      ts: new Date(Date.parse(faster[faster.length - 1].ts) - 10).toISOString(),
    });
    assert.equal(compareRuns(a, faster).durationDelta, -10);
  });

  test('a verdict change and an artifact change are divergences', () => {
    const a = buildTrace({ withRun: true });
    const b = buildTrace({ withRun: true });
    b[b.length - 1] = newSkillRun({ ...b[b.length - 1], verdict: 'fail', failureMode: 'gate-failed' });
    const changed = compareRuns(a, b);
    assert.equal(changed.verdictChanged, true);
    assert.equal(changed.identical, false);

    const c = buildTrace({ withRun: true });
    c[4] = newSkillRun({ ...c[4], artifacts: [{ path: 'schema/skill-run.schema.json', sha256: 'c'.repeat(64) }] });
    const art = compareRuns(a, c);
    assert.equal(art.identical, false);
    assert.equal(art.artifactDelta.changed.length, 1);
  });

  test('the event projection drops the identifiers a replay re-derives', () => {
    const base = newSkillRun({ event: 'route.selected', skill: 'platform/skill-run-test', evidence: ['reason'] });
    const projection = projectEvent(base);
    assert.deepEqual(Object.keys(projection).sort(), ['event', 'evidence', 'schemaVersion', 'skill']);
  });
});

describe('SkillRunSession', () => {
  test('a session chains spans, persists to the sink, and closes the trace', async () => {
    const scratch = makeScratch('session');
    const sinkFile = path.join(scratch, 'nested', 'skill-runs.jsonl');
    const session = createSession({ repoRoot: scratch, sink: sinkFile, bridge: false });
    assert.ok(session instanceof SkillRunSession);
    await session.start('platform/skill-run-test', 'a'.repeat(64));
    await session.emit('route.selected', { evidence: ['ranked first'] });
    await session.emit('tool.called', { tools: [{ name: 'Read', durationMs: 4 }] });
    const summary = await session.finish('pass', { cost: { inputTokens: 1, outputTokens: 1, costUsd: 0 } });

    assert.equal(summary.events, 4);
    assert.equal(summary.skill, 'platform/skill-run-test');
    assert.equal(summary.verdict, 'pass');
    assert.equal(summary.eventTypes[summary.eventTypes.length - 1], 'run.completed');
    assert.equal(summary.runPath, sinkFile);
    assert.equal(summary.bridgePath, null);

    const spanIds = new Set(summary.records.map((entry) => entry.spanId));
    assert.equal(spanIds.size, 4);
    summary.records.forEach((entry, index) => {
      assert.equal(entry.traceId, summary.traceId);
      assert.deepEqual(validateSkillRun(entry), []);
      if (index === 0) assert.equal(entry.parentSpanId, null);
      else assert.equal(entry.parentSpanId, summary.records[index - 1].spanId);
    });

    const loaded = loadSkillRuns(sinkFile);
    assert.equal(loaded.length, 4);
    assert.deepEqual(analyzeIntegrity(loaded).findings, []);
    assert.equal(loaded[loaded.length - 1].event, 'run.completed');
    assertSinkUnchanged();
  });

  test('finish is idempotent and appends run.completed exactly once', async () => {
    const scratch = makeScratch('finish');
    const sinkFile = path.join(scratch, 'skill-runs.jsonl');
    const session = createSession({ repoRoot: scratch, sink: 'memory' });
    await session.start('platform/skill-run-test');
    const first = await session.finish('fail', { failureMode: 'gate-failed' });
    const second = await session.finish('fail', { failureMode: 'gate-failed' });
    assert.equal(first.events, 2);
    assert.equal(second.events, 2);
    assert.equal(first.records.filter((entry) => entry.event === 'run.completed').length, 1);
    assert.equal(first.failureMode, 'gate-failed');
    assert.equal(first.verdict, 'fail');
    await assert.rejects(() => session.emit('tool.called', {}), /after finish/);
  });

  test('the default sink never points at the repository during a test run', async () => {
    const scratch = makeScratch('default-sink');
    const session = createSession({ repoRoot: scratch, sink: undefined });
    await session.start('platform/skill-run-test');
    const summary = await session.finish('skipped');
    assert.ok(summary.runPath.startsWith(path.join(scratch, '.agents', 'skills', 'platform', 'skill-runs')));
    assertSinkUnchanged();
  });

  test('emitting before start uses the session skill and start cannot run twice', async () => {
    const scratch = makeScratch('autostart');
    const session = createSession({ repoRoot: scratch, sink: 'memory', skill: 'platform/skill-run-test' });
    const entry = await session.emit('context.loaded', { evidence: ['context pack resolved'] });
    assert.equal(entry.event, 'context.loaded');
    assert.equal(entry.skill, 'platform/skill-run-test');
    await assert.rejects(() => session.start('platform/skill-run-test'), /start\(\) called twice/);
    await assert.rejects(() => createSession({ sink: 'memory' }).finish('pass'), /before start/);
  });

  test('the bridge mirrors the run into the legacy trace store', async () => {
    const scratch = makeScratch('bridge');
    const session = createSession({ repoRoot: scratch, sink: 'memory', bridge: true, skill: 'platform/skill-run-test' });
    await session.start('platform/skill-run-test');
    await session.emit('tool.called', { tools: [{ name: 'Read', durationMs: 2 }] });
    const summary = await session.finish('pass');
    assert.ok(summary.bridgePath.startsWith(path.join(scratch, '.agents', 'skills', 'platform', 'traces')));
    const mirrored = loadSkillRuns(summary.bridgePath);
    assert.equal(mirrored.length, 1);
    assert.equal(mirrored[0].skill, 'platform/skill-run-test');
    assert.equal(mirrored[0].result, 'completed');
    assert.deepEqual(mirrored[0].tools, [{ name: 'Read', calls: 1 }]);
    assertSinkUnchanged();
  });
});

describe('command line surfaces', () => {
  test('the recorder demo isolation ignores residual temp dirs and cleans its own trace directory', () => {
    const residual = fs.mkdtempSync(path.join(os.tmpdir(), 'quirk-skill-runs-demo-residual-'));
    try {
      const result = spawnSync('node', [RECORDER, '--demo', '--json'], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr || result.stdout);
      const payload = JSON.parse(result.stdout);
      assert.equal(payload.events, 5);
      assert.equal(payload.validation.invalid, 0);
      assert.equal(payload.status, 'pass');
      assert.equal(payload.sink, 'tmpdir');
      assert.deepEqual(payload.eventTypes, [
        'route.started', 'route.selected', 'context.loaded', 'tool.called', 'run.completed',
      ]);
      assert.ok(payload.written, 'demo payload must expose the trace file it wrote');
      assert.ok(!fs.existsSync(path.dirname(payload.written)), `demo scratch dir leaked: ${payload.written}`);
      assert.ok(fs.existsSync(residual), 'the seeded residual dir proves the assertion is scoped to this run');
      assertSinkUnchanged();
    } finally {
      fs.rmSync(residual, { recursive: true, force: true });
    }
  });

  test('--validate exits 1 on an invalid line and 0 on a clean file', () => {
    const scratch = makeScratch('validate');
    const clean = path.join(scratch, 'clean.jsonl');
    const broken = path.join(scratch, 'broken.jsonl');
    fs.writeFileSync(clean, `${buildTrace({ withRun: true }).map((entry) => JSON.stringify(entry)).join('\n')}\n`);
    const ok = spawnSync('node', [RECORDER, '--validate', clean], { encoding: 'utf8' });
    assert.equal(ok.status, 0, ok.stderr || ok.stdout);
    assert.equal(JSON.parse(ok.stdout).status, 'pass');

    const invalid = newSkillRun({ event: 'route.exploded', skill: 'platform/skill-run-test' });
    fs.writeFileSync(broken, `${JSON.stringify(invalid)}\n`);
    const failed = spawnSync('node', [RECORDER, '--validate', broken], { encoding: 'utf8' });
    assert.equal(failed.status, 1);
    assert.equal(JSON.parse(failed.stdout).invalid, 1);
    const unreadable = spawnSync('node', [RECORDER, '--validate', path.join(scratch, 'missing.jsonl')], { encoding: 'utf8' });
    assert.equal(unreadable.status, 2);
  });

  test('--record-events writes one trace to the requested file', () => {
    const scratch = makeScratch('record');
    const out = path.join(scratch, 'recorded.jsonl');
    const events = JSON.stringify([
      { event: 'route.started', skill: 'platform/skill-run-test' },
      { event: 'route.selected', evidence: ['ranked first'] },
      { event: 'context.loaded' },
      { event: 'tool.called', tools: [{ name: 'Read' }] },
      { event: 'run.completed', verdict: 'blocked', failureMode: 'gate-failed' },
    ]);
    const result = spawnSync('node', [RECORDER, '--record-events', events, '--out', out], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.recorded, 5);
    assert.equal(payload.closedBy, 'caller');
    assert.equal(payload.runPath, out);
    const loaded = loadSkillRuns(out);
    assert.equal(loaded.length, 5);
    assert.equal(new Set(loaded.map((entry) => entry.traceId)).size, 1);
    assert.deepEqual(analyzeIntegrity(loaded).findings, []);
    assertSinkUnchanged();

    const rejected = spawnSync('node', [RECORDER, '--record-events', '[{"event":"nope"}]', '--out', out], { encoding: 'utf8' });
    assert.equal(rejected.status, 2);
    const badUsage = spawnSync('node', [RECORDER, '--nope'], { encoding: 'utf8' });
    assert.equal(badUsage.status, 2);
  });

  test('the replay demo replays a valid trace and reports a deliberate divergence', () => {
    const result = spawnSync('node', [REPLAY, '--demo', '--json'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.status, 'pass');
    assert.equal(payload.trace.completed, true);
    assert.equal(payload.integrity.ok, true);
    assert.equal(payload.comparison.identical, false);
    assert.ok(payload.comparison.onlyInA.some((entry) => entry.event === 'context.loaded'));
  });

  test('replay, verify, and compare drive their exit codes', () => {
    const scratch = makeScratch('cli');
    const complete = path.join(scratch, 'complete.jsonl');
    const open = path.join(scratch, 'open.jsonl');
    fs.writeFileSync(complete, `${buildTrace({ withRun: true }).map((entry) => JSON.stringify(entry)).join('\n')}\n`);
    fs.writeFileSync(open, `${buildTrace({ withRun: false }).map((entry) => JSON.stringify(entry)).join('\n')}\n`);

    const plain = spawnSync('node', [REPLAY, complete], { encoding: 'utf8' });
    assert.equal(plain.status, 0, plain.stderr || plain.stdout);
    assert.equal(JSON.parse(plain.stdout).trace.completed, true);

    const openRun = spawnSync('node', [REPLAY, open], { encoding: 'utf8' });
    assert.equal(openRun.status, 0);
    assert.equal(JSON.parse(openRun.stdout).integrity.complete, false);

    const strict = spawnSync('node', [REPLAY, open, '--strict'], { encoding: 'utf8' });
    assert.equal(strict.status, 1);

    const verified = spawnSync('node', [REPLAY, '--verify', complete], { encoding: 'utf8' });
    assert.equal(verified.status, 0, verified.stderr || verified.stdout);

    const unverified = spawnSync('node', [REPLAY, '--verify', open], { encoding: 'utf8' });
    assert.equal(unverified.status, 3);

    const diverged = spawnSync('node', [REPLAY, '--compare', complete, open], { encoding: 'utf8' });
    assert.equal(diverged.status, 3);
    assert.equal(JSON.parse(diverged.stdout).comparison.identical, false);

    const same = spawnSync('node', [REPLAY, '--compare', complete, complete], { encoding: 'utf8' });
    assert.equal(same.status, 0, same.stderr || same.stdout);
    assert.equal(JSON.parse(same.stdout).comparison.identical, true);

    const out = path.join(scratch, 'report.json');
    const written = spawnSync('node', [REPLAY, complete, '--out', out], { encoding: 'utf8' });
    assert.equal(written.status, 0);
    assert.equal(JSON.parse(fs.readFileSync(out, 'utf8')).trace.completed, true);
  });
});

describe('ORDER and schema coherence', () => {
  test('ORDER is the schema enum in lifecycle order and starts at route.started', () => {
    assert.equal(EVENT_ORDER[0], 'route.started');
    assert.equal(EVENT_ORDER[EVENT_ORDER.length - 1], 'run.completed');
    assert.equal(new Set(EVENT_ORDER).size, EVENT_ORDER.length);
    assert.deepEqual(ORDER, EVENT_ORDER);
  });
});
