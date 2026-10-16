#!/usr/bin/env node
// replay-skill-run.mjs - replay and integrity-check recorded skill runs.
//
// Reads an append-only skill-run JSONL file (skill-run-recorder.mjs sink) and
// reconstructs the trace, then checks the invariants the format promises:
// events in lifecycle order, one run.completed, a declared skill per trace,
// unique span ids, and parents that actually exist.
//
// Usage:
//   node replay-skill-run.mjs <file.jsonl> [--json] [--out FILE] [--strict]
//   node replay-skill-run.mjs --verify <file.jsonl> [--json]
//   node replay-skill-run.mjs --compare <a.jsonl> <b.jsonl> [--json]
//   node replay-skill-run.mjs --demo --json
//
// Exit codes: 0 ok, 1 failure, 2 usage, 3 divergence or an unverifiable trace.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EVENT_ORDER, REPEATABLE_EVENTS, createSession, validateSkillRun } from './skill-run-recorder.mjs';

export const ORDER = EVENT_ORDER;
const TERMINAL_EVENT = 'run.completed';
const PROJECTION_KEYS = [
  'schemaVersion', 'event', 'skill', 'skillVersion', 'promptVersion', 'inputHash', 'model',
  'evidence', 'tools', 'artifacts', 'sideEffects', 'verdict', 'failureMode',
];
const USAGE = `replay-skill-run.mjs - replay recorded skill runs

Usage:
  node replay-skill-run.mjs <file.jsonl> [--json] [--out FILE] [--strict]
  node replay-skill-run.mjs --verify <file.jsonl> [--json]
  node replay-skill-run.mjs --compare <a.jsonl> <b.jsonl> [--json] [--strict]
  node replay-skill-run.mjs --demo [--json]

Options:
  --verify      exit 3 when the trace is incomplete or carries severe findings
  --compare     compare two traces; exit 3 when they diverge
  --strict      findings break the run (exit 1) instead of being advisory
  --out <file>  write the report next to printing it
  --json        accepted for uniformity; output is JSON in both modes
  --help        show this help

Comparison scope: traceId, spanId, parentSpanId, ts, durationMs and cost are
re-derived on every run, so they are excluded from the event projection; costDelta
and durationDelta report them separately. Events are matched by a longest common
subsequence over the projections, so an event the candidate run never emitted is
reported in onlyInA instead of hiding inside a positional shift.

Exit codes: 0 ok, 1 failure, 2 usage, 3 divergence or an unverifiable trace.`;

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecords(value) {
  return Array.isArray(value) ? value.filter((entry) => isPlainObject(entry)) : [];
}

export function loadSkillRuns(file) {
  const target = path.resolve(file);
  const text = fs.readFileSync(target, 'utf8');
  const records = [];
  const broken = [];
  text.split(/\r?\n/).forEach((line, index) => {
    if (line.trim() === '') return;
    try {
      const parsed = JSON.parse(line);
      if (!isPlainObject(parsed)) broken.push(index + 1);
      else records.push(parsed);
    } catch {
      broken.push(index + 1);
    }
  });
  if (broken.length > 0) {
    throw new Error(`${target}: lines ${broken.join(', ')} are not valid JSON objects`);
  }
  return records;
}

export function projectEvent(record) {
  if (!isPlainObject(record)) return null;
  const projection = {};
  for (const key of PROJECTION_KEYS) {
    if (record[key] !== undefined) projection[key] = record[key];
  }
  return projection;
}

function sumCost(records) {
  const total = { inputTokens: 0, outputTokens: 0, costUsd: 0 };
  for (const entry of records) {
    const cost = isPlainObject(entry.cost) ? entry.cost : null;
    if (!cost) continue;
    if (Number.isFinite(cost.inputTokens)) total.inputTokens += cost.inputTokens;
    if (Number.isFinite(cost.outputTokens)) total.outputTokens += cost.outputTokens;
    if (Number.isFinite(cost.costUsd)) total.costUsd += cost.costUsd;
  }
  return total;
}

function aggregateTools(records) {
  const byName = new Map();
  records.forEach((entry, index) => {
    for (const tool of Array.isArray(entry.tools) ? entry.tools : []) {
      if (!isPlainObject(tool) || typeof tool.name !== 'string') continue;
      const key = tool.name;
      const current = byName.get(key) ?? { name: key, calls: 0, totalDurationMs: 0, firstIndex: index };
      current.calls += 1;
      if (Number.isFinite(tool.durationMs)) current.totalDurationMs += tool.durationMs;
      byName.set(key, current);
    }
  });
  return [...byName.values()].sort((left, right) => (left.firstIndex ?? 0) - (right.firstIndex ?? 0))
    .map(({ name, calls, totalDurationMs }) => ({ name, calls, totalDurationMs }));
}

function collectArtifacts(records) {
  const byPath = new Map();
  records.forEach((entry, index) => {
    for (const artifact of Array.isArray(entry.artifacts) ? entry.artifacts : []) {
      if (!isPlainObject(artifact) || typeof artifact.path !== 'string') continue;
      byPath.set(artifact.path, {
        path: artifact.path,
        sha256: artifact.sha256 ?? null,
        bytes: artifact.bytes ?? null,
        firstIndex: index,
      });
    }
  });
  return [...byPath.values()].sort((left, right) => left.firstIndex - right.firstIndex);
}

export function replay(records) {
  const list = asRecords(records);
  const events = list.map((entry, index) => ({
    index,
    spanId: entry.spanId ?? null,
    parentSpanId: entry.parentSpanId ?? null,
    event: entry.event ?? null,
    ts: entry.ts ?? null,
    skill: entry.skill ?? null,
    verdict: entry.verdict ?? null,
    durationMs: Number.isFinite(entry.durationMs) ? entry.durationMs : 0,
  }));
  const traceIds = [...new Set(list.map((entry) => entry.traceId).filter((value) => typeof value === 'string'))];
  const skills = [...new Set(list.map((entry) => entry.skill).filter((value) => typeof value === 'string'))];
  const artifacts = collectArtifacts(list);
  const tools = aggregateTools(list);
  const sideEffects = [...new Set(list.flatMap((entry) => (Array.isArray(entry.sideEffects) ? entry.sideEffects : [])))];
  const startedAt = list.length > 0 ? list[0].ts ?? null : null;
  const endedAt = list.length > 0 ? list[list.length - 1].ts ?? null : null;
  const spanMs = Number.isFinite(Date.parse(startedAt)) && Number.isFinite(Date.parse(endedAt))
    ? Math.max(0, Date.parse(endedAt) - Date.parse(startedAt))
    : 0;
  const verdicts = list.map((entry) => entry.verdict).filter((value) => typeof value === 'string');
  const failureModes = list.map((entry) => entry.failureMode).filter((value) => typeof value === 'string' && value !== '');
  return {
    traceId: traceIds[0] ?? null,
    traceIds,
    events,
    eventCount: events.length,
    skills,
    artifacts,
    tools,
    sideEffects,
    cost: sumCost(list),
    verdict: verdicts.length > 0 ? verdicts[verdicts.length - 1] : null,
    failureMode: failureModes.length > 0 ? failureModes[failureModes.length - 1] : null,
    startedAt,
    endedAt,
    durationMs: spanMs,
    completed: list.some((entry) => entry.event === TERMINAL_EVENT),
  };
}

function rankOf(event) {
  const index = ORDER.indexOf(event);
  return index === -1 ? null : index;
}

export function analyzeIntegrity(records) {
  const list = asRecords(records);
  const findings = [];
  const add = (finding) => findings.push(finding);

  if (list.length === 0) {
    add({ type: 'empty-trace', severity: 'error', index: null, message: 'the trace holds no records' });
  }

  list.forEach((entry, index) => {
    const errors = validateSkillRun(entry);
    if (errors.length > 0) {
      add({
        type: 'invalid-record',
        severity: 'error',
        index,
        event: entry.event ?? null,
        spanId: entry.spanId ?? null,
        message: `record ${index + 1} does not satisfy schema/skill-run.schema.json: ${errors.join('; ')}`,
      });
    }
  });

  const spanCounts = new Map();
  for (const entry of list) {
    if (typeof entry.spanId !== 'string') continue;
    spanCounts.set(entry.spanId, (spanCounts.get(entry.spanId) ?? 0) + 1);
  }
  for (const [spanId, count] of spanCounts) {
    if (count > 1) {
      add({ type: 'duplicate-span', severity: 'error', index: null, spanId, message: `spanId ${spanId} is used by ${count} records` });
    }
  }

  const spanIds = new Set(spanCounts.keys());
  const firstIndexBySpan = new Map();
  list.forEach((entry, index) => {
    if (typeof entry.spanId === 'string' && !firstIndexBySpan.has(entry.spanId)) firstIndexBySpan.set(entry.spanId, index);
  });
  list.forEach((entry, index) => {
    if (entry.event !== undefined && rankOf(entry.event) === null) {
      add({ type: 'unknown-event', severity: 'error', index, spanId: entry.spanId ?? null, message: `event "${entry.event}" is not part of the lifecycle enum` });
    }
    const parent = entry.parentSpanId;
    if (parent === null || parent === undefined) return;
    if (!spanIds.has(parent)) {
      add({ type: 'dangling-parent', severity: 'error', index, spanId: entry.spanId ?? null, message: `parentSpanId ${parent} is not a span of this trace` });
      return;
    }
    if ((firstIndexBySpan.get(parent) ?? -1) > index) {
      add({ type: 'parent-after-child', severity: 'warning', index, spanId: entry.spanId ?? null, message: `parentSpanId ${parent} appears later in the trace than its child` });
    }
  });

  for (let index = 1; index < list.length; index += 1) {
    const previous = list[index - 1];
    const current = list[index];
    const previousRank = rankOf(previous.event);
    const currentRank = rankOf(current.event);
    if (previousRank === null || currentRank === null) continue;
    if (currentRank < previousRank) {
      add({
        type: 'out-of-order',
        severity: 'warning',
        index,
        spanId: current.spanId ?? null,
        message: `${previous.event} (index ${index - 1}) is followed by ${current.event} (index ${index}); the lifecycle expects ${ORDER[currentRank]} no earlier than position ${previousRank}`,
      });
    }
  }

  if (list.length > 0 && !list.some((entry) => entry.event === TERMINAL_EVENT)) {
    add({
      type: 'incomplete-trace',
      severity: 'error',
      index: list.length - 1,
      message: `the trace holds no ${TERMINAL_EVENT} event, so the run never closed`,
    });
  }

  const phaseCounts = new Map();
  for (const entry of list) {
    if (typeof entry.event !== 'string') continue;
    phaseCounts.set(entry.event, (phaseCounts.get(entry.event) ?? 0) + 1);
  }
  for (const [event, count] of phaseCounts) {
    if (count > 1 && !REPEATABLE_EVENTS.has(event)) {
      add({
        type: 'duplicate-phase',
        severity: 'error',
        index: list.findIndex((entry) => entry.event === event),
        event,
        message: `${event} is emitted ${count} times; only ${[...REPEATABLE_EVENTS].join(', ')} may repeat inside one trace`,
      });
    }
  }

  const skills = [...new Set(list.map((entry) => entry.skill).filter((value) => typeof value === 'string'))];
  if (skills.length > 1) {
    add({
      type: 'skill-jump',
      severity: 'warning',
      index: null,
      message: `one traceId declares ${skills.length} skills (${skills.join(', ')}); a handoff must be declared through handoff.created`,
    });
  }

  const traceIds = [...new Set(list.map((entry) => entry.traceId).filter((value) => typeof value === 'string'))];
  if (traceIds.length > 1) {
    add({
      type: 'multiple-traces',
      severity: 'error',
      index: null,
      message: `the file mixes ${traceIds.length} traceIds; replay one trace per file (or per directory)`,
    });
  }

  for (let index = 1; index < list.length; index += 1) {
    const previous = Date.parse(list[index - 1].ts);
    const current = Date.parse(list[index].ts);
    if (Number.isFinite(previous) && Number.isFinite(current) && current < previous) {
      add({
        type: 'timestamp-regression',
        severity: 'warning',
        index,
        spanId: list[index].spanId ?? null,
        message: `ts at index ${index} (${list[index].ts}) precedes ts at index ${index - 1} (${list[index - 1].ts})`,
      });
    }
  }

  const counts = { error: 0, warning: 0 };
  for (const finding of findings) {
    counts[finding.severity] = (counts[finding.severity] ?? 0) + 1;
  }
  return {
    traceIds,
    records: list.length,
    complete: list.some((entry) => entry.event === TERMINAL_EVENT),
    findings,
    counts,
    ok: findings.length === 0,
  };
}

export function severeFindings(integrity) {
  return (integrity?.findings ?? []).filter((finding) => finding.severity === 'error');
}

function artifactDelta(baseline, candidate) {
  const baselineByPath = new Map(baseline.artifacts.map((artifact) => [artifact.path, artifact]));
  const candidateByPath = new Map(candidate.artifacts.map((artifact) => [artifact.path, artifact]));
  const added = [];
  const removed = [];
  const changed = [];
  for (const [artifactPath, artifact] of candidateByPath) {
    const before = baselineByPath.get(artifactPath);
    if (!before) added.push({ path: artifactPath, sha256: artifact.sha256 ?? null });
    else if (before.sha256 !== artifact.sha256) changed.push({ path: artifactPath, a: before.sha256 ?? null, b: artifact.sha256 ?? null });
  }
  for (const [artifactPath, artifact] of baselineByPath) {
    if (!candidateByPath.has(artifactPath)) removed.push({ path: artifactPath, sha256: artifact.sha256 ?? null });
  }
  return { added, removed, changed };
}

function differingFields(left, right) {
  const keys = new Set([...Object.keys(left ?? {}), ...Object.keys(right ?? {})]);
  const fields = [];
  for (const key of [...keys].sort()) {
    if (JSON.stringify(left?.[key]) !== JSON.stringify(right?.[key])) fields.push(key);
  }
  return fields;
}

function lcsPairs(leftKeys, rightKeys) {
  const rows = leftKeys.length;
  const columns = rightKeys.length;
  const table = Array.from({ length: rows + 1 }, () => new Array(columns + 1).fill(0));
  for (let i = rows - 1; i >= 0; i -= 1) {
    for (let j = columns - 1; j >= 0; j -= 1) {
      table[i][j] = leftKeys[i] === rightKeys[j]
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const pairs = [];
  let i = 0;
  let j = 0;
  while (i < rows && j < columns) {
    if (leftKeys[i] === rightKeys[j]) {
      pairs.push([i, j]);
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      i += 1;
    } else {
      j += 1;
    }
  }
  return pairs;
}

export function compareRuns(a, b) {
  const left = asRecords(a);
  const right = asRecords(b);
  const leftKeys = left.map((entry) => JSON.stringify(projectEvent(entry)));
  const rightKeys = right.map((entry) => JSON.stringify(projectEvent(entry)));
  const sameEvents = [];
  const differingEvents = [];
  const onlyInA = [];
  const onlyInB = [];

  const emitGap = (aFrom, aTo, bFrom, bTo) => {
    const leftSpan = Math.min(aTo - aFrom, bTo - bFrom);
    for (let offset = 0; offset < leftSpan; offset += 1) {
      const first = left[aFrom + offset];
      const second = right[bFrom + offset];
      differingEvents.push({
        index: aFrom + offset,
        event: first.event ?? null,
        fields: differingFields(projectEvent(first), projectEvent(second)),
        a: projectEvent(first),
        b: projectEvent(second),
      });
    }
    for (let index = aFrom + leftSpan; index < aTo; index += 1) {
      onlyInA.push({ index, event: left[index].event ?? null, spanId: left[index].spanId ?? null });
    }
    for (let index = bFrom + leftSpan; index < bTo; index += 1) {
      onlyInB.push({ index, event: right[index].event ?? null, spanId: right[index].spanId ?? null });
    }
  };

  let aCursor = 0;
  let bCursor = 0;
  for (const [leftIndex, rightIndex] of lcsPairs(leftKeys, rightKeys)) {
    emitGap(aCursor, leftIndex, bCursor, rightIndex);
    sameEvents.push({
      index: leftIndex,
      event: left[leftIndex].event ?? null,
      spanId: left[leftIndex].spanId ?? null,
    });
    aCursor = leftIndex + 1;
    bCursor = rightIndex + 1;
  }
  emitGap(aCursor, left.length, bCursor, right.length);

  const replayedA = replay(left);
  const replayedB = replay(right);
  const artifacts = artifactDelta(replayedA, replayedB);
  return {
    sameEvents,
    differingEvents,
    onlyInA,
    onlyInB,
    verdictChanged: replayedA.verdict !== replayedB.verdict,
    verdicts: { a: replayedA.verdict, b: replayedB.verdict },
    costDelta: {
      inputTokens: replayedB.cost.inputTokens - replayedA.cost.inputTokens,
      outputTokens: replayedB.cost.outputTokens - replayedA.cost.outputTokens,
      costUsd: Number((replayedB.cost.costUsd - replayedA.cost.costUsd).toFixed(6)),
    },
    artifactDelta: artifacts,
    durationDelta: replayedB.durationMs - replayedA.durationMs,
    identical: differingEvents.length === 0
      && onlyInA.length === 0
      && onlyInB.length === 0
      && artifacts.added.length === 0
      && artifacts.removed.length === 0
      && artifacts.changed.length === 0
      && replayedA.verdict === replayedB.verdict
      && left.length === right.length,
  };
}

function writeReport(report, outFile) {
  if (!outFile) return null;
  const target = path.resolve(outFile);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`);
  return target;
}

async function runDemo() {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'quirk-replay-demo-'));
  const traceFile = path.join(scratch, 'skill-runs-demo.jsonl');
  const session = createSession({ repoRoot: scratch, sink: traceFile });
  try {
    await session.start('delivery/review-pr', null, { evidence: ['routing request received'] });
    await session.emit('route.selected', { evidence: ['skill-graph ranked delivery/review-pr first'] });
    await session.emit('context.loaded', { evidence: ['context pack resolved'] });
    await session.emit('tool.called', { tools: [{ name: 'Read', durationMs: 8 }] });
    await session.finish('pass', { cost: { inputTokens: 0, outputTokens: 0, costUsd: 0 } });
    const records = loadSkillRuns(traceFile);
    const replayed = replay(records);
    const integrity = analyzeIntegrity(records);
    const drifted = records.filter((entry) => entry.event !== 'context.loaded');
    const compared = compareRuns(records, drifted);
    return {
      demo: 'replay-skill-run',
      traceId: replayed.traceId,
      sink: 'tmpdir',
      written: traceFile,
      trace: replayed,
      integrity,
      comparison: { purpose: 'a run with the context.loaded event removed', ...compared },
      status: integrity.ok && !integrity.findings.some((finding) => finding.severity === 'error') ? 'pass' : 'fail',
    };
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

function modeReport(mode, payload) {
  return { mode, ...payload };
}

async function main(argv = process.argv.slice(2)) {
  const flags = {
    verify: null,
    compare: [],
    file: null,
    demo: false,
    strict: false,
    out: null,
    json: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') flags.json = true;
    else if (arg === '--demo') flags.demo = true;
    else if (arg === '--strict') flags.strict = true;
    else if (arg === '--help' || arg === '-h') flags.help = true;
    else if (arg === '--verify') flags.verify = argv[++i] ?? null;
    else if (arg.startsWith('--verify=')) flags.verify = arg.slice('--verify='.length);
    else if (arg === '--compare') {
      const first = argv[++i] ?? null;
      const second = argv[++i] ?? null;
      for (const value of [first, second]) {
        if (value === null || value.startsWith('--')) {
          console.error('--compare expects two trace files: --compare <a.jsonl> <b.jsonl>\n');
          console.error(USAGE);
          return 2;
        }
      }
      flags.compare = [first, second];
    } else if (arg.startsWith('--compare=')) {
      const first = arg.slice('--compare='.length);
      const second = argv[++i] ?? null;
      if (second === null || second.startsWith('--')) {
        console.error('--compare expects two trace files: --compare <a.jsonl> <b.jsonl>\n');
        console.error(USAGE);
        return 2;
      }
      flags.compare = [first, second];
    }
    else if (arg === '--out') flags.out = argv[++i] ?? null;
    else if (arg.startsWith('--out=')) flags.out = arg.slice('--out='.length);
    else if (arg.startsWith('--')) {
      console.error(`unknown argument: ${arg}\n`);
      console.error(USAGE);
      return 2;
    } else if (flags.file === null) flags.file = arg;
    else {
      console.error(`unexpected positional argument: ${arg}\n`);
      console.error(USAGE);
      return 2;
    }
  }
  if (flags.help) {
    console.log(USAGE);
    return 0;
  }
  if (flags.demo && flags.compare.length === 0) {
    const report = await runDemo();
    report.written = writeReport(report, flags.out) ?? report.written;
    console.log(JSON.stringify(report, null, 2));
    return report.status === 'pass' ? 0 : 1;
  }
  if (flags.compare.length > 0) {
    if (flags.compare.length !== 2 || flags.compare.some((entry) => entry === null)) {
      console.error('--compare expects exactly two trace files');
      return 2;
    }
    let left;
    let right;
    try {
      left = loadSkillRuns(flags.compare[0]);
      right = loadSkillRuns(flags.compare[1]);
    } catch (error) {
      console.error(error.message);
      return 1;
    }
    const comparison = compareRuns(left, right);
    const report = modeReport('compare', {
      a: path.resolve(flags.compare[0]),
      b: path.resolve(flags.compare[1]),
      traceIds: { a: replay(left).traceId, b: replay(right).traceId },
      comparison,
    });
    report.written = writeReport(report, flags.out);
    console.log(JSON.stringify(report, null, 2));
    if (!comparison.identical) {
      console.error('replay divergence: the two traces do not describe the same run');
      return 3;
    }
    return 0;
  }
  const target = flags.verify ?? flags.file;
  if (target === null) {
    console.error(USAGE);
    return 2;
  }
  let records;
  try {
    records = loadSkillRuns(target);
  } catch (error) {
    console.error(error.message);
    return 1;
  }
  const replayed = replay(records);
  const integrity = analyzeIntegrity(records);
  const errors = severeFindings(integrity);
  const report = modeReport(flags.verify !== null ? 'verify' : 'replay', {
    file: path.resolve(target),
    trace: replayed,
    integrity,
  });
  report.written = writeReport(report, flags.out);
  console.log(JSON.stringify(report, null, 2));
  if (flags.verify !== null) {
    if (errors.length > 0 || !integrity.complete) {
      console.error(`trace at ${target} is not verifiable: ${errors.length > 0 ? errors.map((finding) => finding.message).join('; ') : 'no run.completed event'}`);
      return 3;
    }
    return 0;
  }
  if (integrity.findings.length > 0 && flags.strict) {
    console.error(`${integrity.findings.length} finding(s) under --strict`);
    return 1;
  }
  return 0;
}

const invokedDirectly = process.argv[1] !== undefined
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    },
  );
}
