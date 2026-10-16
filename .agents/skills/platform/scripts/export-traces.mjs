#!/usr/bin/env node
// export-traces.mjs - export recorded skill runs to external observability formats.
//
// The repository stays the source of truth. This tool is an exporter, not a
// collector: it reads the trace stores that already exist, reshapes them, and
// writes to stdout or to the file named by --out. It never opens a socket,
// never calls a vendor endpoint, and never mutates the stores it reads.
//
// Sources (both are read-only here):
//   .agents/skills/platform/traces/<date>.jsonl      legacy record-execution.mjs
//   .agents/skills/platform/skill-runs/<date>.jsonl  skill-run-recorder.mjs
//
// Usage:
//   node export-traces.mjs --format otel|langsmith|braintrust|jsonl
//                          [--since YYYY-MM-DD] [--skill <domain/skill>] [--out FILE]
//
// Exit codes: 0 ok, 1 failure, 2 usage error.
// Every payload passes through redact() before it leaves the process.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { redact } from './skill-run-recorder.mjs';

const USAGE = `export-traces.mjs - export recorded skill runs

Usage:
  node export-traces.mjs --format otel [--since YYYY-MM-DD] [--skill <domain/skill>] [--out FILE]
  node export-traces.mjs --format langsmith|braintrust|jsonl [same filters]

Formats:
  jsonl        passthrough of the redacted records, one JSON object per line
  langsmith    LangSmith dataset examples: {id, dataset, inputs, outputs, metadata}
  braintrust   Braintrust events: {input, output, metadata, scores}
  otel         OTLP-shaped spans: traceId, spanId, parentSpanId, name,
               startTimeUnixNano, endTimeUnixNano, attributes, status

Options:
  --since <YYYY-MM-DD>  keep entries recorded on or after that UTC day
  --skill <name>        keep entries whose skill matches exactly
  --out <file>          write the payload to a file as well as printing it
  --json                accepted for uniformity; stdout carries the payload
                        (JSONL lines or a JSON array) and stderr a one-line summary
  --help                show this help

Exit codes: 0 ok, 1 failure, 2 usage error.`;

const FORMATS = ['jsonl', 'langsmith', 'braintrust', 'otel'];
const SOURCES = [
  { name: 'skill-runs', dir: 'skill-runs' },
  { name: 'traces', dir: 'traces' },
];

const OTEL_STATUS = { ok: 1, error: 2, unset: 0 };

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveRepoRoot(root) {
  return path.resolve(root ?? process.cwd());
}

function traceStores(repoRoot) {
  return SOURCES.map((source) => ({
    ...source,
    dir: path.join(repoRoot, '.agents', 'skills', 'platform', source.dir),
  }));
}

function listTraceFiles(store) {
  let names;
  try {
    names = fs.readdirSync(store.dir);
  } catch {
    return [];
  }
  return names
    .filter((name) => name.endsWith('.jsonl'))
    .sort()
    .map((name) => path.join(store.dir, name));
}

function entryDay(record, file) {
  const fromRecord = typeof record?.ts === 'string' ? record.ts.slice(0, 10) : null;
  const fromExecution = typeof record?.execution?.startedAt === 'string' ? record.execution.startedAt.slice(0, 10) : null;
  return fromRecord ?? fromExecution ?? path.basename(file, '.jsonl');
}

export function collectEntries({ repoRoot, since = null, skill = null } = {}) {
  const root = resolveRepoRoot(repoRoot);
  const entries = [];
  for (const store of traceStores(root)) {
    for (const file of listTraceFiles(store)) {
      const text = fs.readFileSync(file, 'utf8');
      for (const line of text.split(/\r?\n/)) {
        if (line.trim() === '') continue;
        let parsed;
        try {
          parsed = JSON.parse(line);
        } catch {
          continue;
        }
        if (!isPlainObject(parsed)) continue;
        const day = entryDay(parsed, file);
        if (since !== null && day < since) continue;
        if (skill !== null && parsed.skill !== skill) continue;
        entries.push({
          source: store.name,
          file: path.relative(root, file).split(path.sep).join('/'),
          record: redact(parsed),
        });
      }
    }
  }
  return entries;
}

function verdictScore(record) {
  const verdict = record.verdict ?? record.result;
  if (verdict === 'pass' || verdict === 'completed') return 1;
  if (verdict === 'skipped') return 0.5;
  if (verdict === 'fail' || verdict === 'failed' || verdict === 'blocked') return 0;
  return null;
}

function metadataOf(entry) {
  const record = entry.record;
  return {
    source: entry.source,
    file: entry.file,
    event: record.event ?? null,
    skill: record.skill ?? null,
    skillVersion: record.skillVersion ?? null,
    promptVersion: record.promptVersion ?? null,
    traceId: record.traceId ?? null,
    spanId: record.spanId ?? null,
    parentSpanId: record.parentSpanId ?? null,
    ts: record.ts ?? record.execution?.startedAt ?? null,
    durationMs: record.durationMs ?? record.execution?.durationMs ?? null,
    verdict: record.verdict ?? null,
    result: record.result ?? null,
    failureMode: record.failureMode ?? null,
    cost: record.cost ?? null,
    sideEffects: record.sideEffects ?? [],
    tools: (record.tools ?? []).map((tool) => tool?.name ?? null).filter((name) => typeof name === 'string'),
  };
}

function inputsOf(entry) {
  const record = entry.record;
  if (entry.source === 'skill-runs') {
    return {
      skill: record.skill ?? null,
      skillVersion: record.skillVersion ?? null,
      promptVersion: record.promptVersion ?? null,
      inputHash: record.inputHash ?? null,
      model: record.model ?? null,
    };
  }
  return {
    skill: record.skill ?? null,
    skillVersion: record.skillVersion ?? null,
    promptVersion: record.promptVersion ?? null,
    input: record.input ?? null,
    model: record.model ?? null,
  };
}

function outputsOf(entry) {
  const record = entry.record;
  if (entry.source === 'skill-runs') {
    return {
      event: record.event ?? null,
      evidence: record.evidence ?? [],
      tools: record.tools ?? [],
      artifacts: record.artifacts ?? [],
      sideEffects: record.sideEffects ?? [],
      durationMs: record.durationMs ?? 0,
      verdict: record.verdict ?? null,
      failureMode: record.failureMode ?? null,
      cost: record.cost ?? null,
    };
  }
  return {
    output: record.output ?? null,
    execution: record.execution ?? null,
    tools: record.tools ?? [],
    quality: record.quality ?? null,
    result: record.result ?? null,
    blockedBy: record.blockedBy ?? [],
    nextConsumer: record.nextConsumer ?? null,
  };
}

function toLangsmith(entries) {
  return entries.map((entry) => {
    const record = entry.record;
    return {
      id: record.traceId ?? record.spanId ?? null,
      dataset: entry.source === 'skill-runs' ? 'quirk-skill-run-events' : 'quirk-execution-traces',
      inputs: redact(inputsOf(entry)),
      outputs: redact(outputsOf(entry)),
      metadata: redact(metadataOf(entry)),
    };
  });
}

function toBraintrust(entries) {
  return entries.map((entry) => {
    const record = entry.record;
    const score = verdictScore(record);
    return {
      input: redact(inputsOf(entry)),
      output: redact(outputsOf(entry)),
      metadata: redact(metadataOf(entry)),
      ...(score === null ? {} : { scores: [{ name: 'verdict', score }] }),
    };
  });
}

function toNano(ms) {
  return Number(ms) * 1000000;
}

function toOtelStatus(record) {
  const verdict = record.verdict ?? record.result ?? null;
  if (verdict === 'fail' || verdict === 'failed' || verdict === 'blocked') {
    return { code: OTEL_STATUS.error, message: record.failureMode ?? verdict };
  }
  if (verdict === 'pass' || verdict === 'completed' || verdict === 'skipped' || verdict === 'escalated') {
    return { code: OTEL_STATUS.ok };
  }
  return { code: OTEL_STATUS.unset };
}

function toOtel(entries) {
  return entries.map((entry) => {
    const record = entry.record;
    const startMs = Number.isFinite(Date.parse(record.ts))
      ? Date.parse(record.ts)
      : (Number.isFinite(Date.parse(record.execution?.startedAt)) ? Date.parse(record.execution.startedAt) : Date.now());
    const durationMs = record.durationMs
      ?? record.execution?.durationMs
      ?? (Number.isFinite(Date.parse(record.execution?.completedAt))
        ? Math.max(0, Date.parse(record.execution.completedAt) - startMs)
        : 0);
    const attributes = {
      'skill.name': record.skill ?? null,
      'skill.version': record.skillVersion ?? null,
      'skill.prompt_version': record.promptVersion ?? null,
      'skill.event': record.event ?? 'execution.trace',
      'skill.input_hash': record.inputHash ?? null,
      'skill.verdict': record.verdict ?? record.result ?? null,
      'skill.failure_mode': record.failureMode ?? null,
      'skill.side_effects': (record.sideEffects ?? []).join(','),
      'skill.tools': (record.tools ?? []).map((tool) => tool?.name).filter((name) => typeof name === 'string').join(','),
      'skill.artifacts': (record.artifacts ?? []).map((artifact) => artifact?.path).filter((value) => typeof value === 'string').join(','),
      'gen_ai.provider': record.model?.provider ?? null,
      'gen_ai.request.model': record.model?.model ?? null,
      'gen_ai.request.tier': record.model?.tier ?? null,
      'export.source': entry.source,
      'export.file': entry.file,
    };
    return {
      traceId: record.traceId ?? null,
      spanId: record.spanId ?? null,
      parentSpanId: record.parentSpanId ?? null,
      name: entry.source === 'skill-runs' ? record.event ?? 'skill.run' : 'skill.run',
      kind: 'SPAN_KIND_INTERNAL',
      startTimeUnixNano: toNano(startMs),
      endTimeUnixNano: toNano(startMs + Math.max(0, durationMs)),
      attributes: redact(attributes),
      status: toOtelStatus(record),
    };
  });
}

function render(entries, format) {
  if (format === 'jsonl') {
    return entries.map((entry) => JSON.stringify(entry.record)).join('\n');
  }
  if (format === 'langsmith') return JSON.stringify(toLangsmith(entries), null, 2);
  if (format === 'braintrust') return JSON.stringify(toBraintrust(entries), null, 2);
  return JSON.stringify(toOtel(entries), null, 2);
}

function summarize(entries, format, root, filters) {
  const bySource = {};
  const bySkill = {};
  for (const entry of entries) {
    bySource[entry.source] = (bySource[entry.source] ?? 0) + 1;
    const skill = entry.record.skill ?? 'unknown';
    bySkill[skill] = (bySkill[skill] ?? 0) + 1;
  }
  return {
    tool: 'export-traces.mjs',
    role: 'exporter, not collector: it reads the trace stores and reshapes them for an external backend',
    format,
    repoRoot: root,
    filters,
    count: entries.length,
    bySource,
    bySkill,
  };
}

async function main(argv = process.argv.slice(2)) {
  const flags = { format: 'jsonl', since: null, skill: null, out: null, json: false, help: false, root: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') flags.json = true;
    else if (arg === '--help' || arg === '-h') flags.help = true;
    else if (arg === '--format') flags.format = argv[++i] ?? null;
    else if (arg.startsWith('--format=')) flags.format = arg.slice('--format='.length);
    else if (arg === '--since') flags.since = argv[++i] ?? null;
    else if (arg.startsWith('--since=')) flags.since = arg.slice('--since='.length);
    else if (arg === '--skill') flags.skill = argv[++i] ?? null;
    else if (arg.startsWith('--skill=')) flags.skill = arg.slice('--skill='.length);
    else if (arg === '--out') flags.out = argv[++i] ?? null;
    else if (arg.startsWith('--out=')) flags.out = arg.slice('--out='.length);
    else if (arg === '--root') flags.root = argv[++i] ?? null;
    else if (arg.startsWith('--root=')) flags.root = arg.slice('--root='.length);
    else {
      console.error(`unknown argument: ${arg}\n`);
      console.error(USAGE);
      return 2;
    }
  }
  if (flags.help) {
    console.log(USAGE);
    return 0;
  }
  if (!FORMATS.includes(flags.format)) {
    console.error(`unknown format: ${flags.format}; expected one of ${FORMATS.join(', ')}`);
    return 2;
  }
  if (flags.since !== null && !/^\d{4}-\d{2}-\d{2}$/.test(flags.since)) {
    console.error('--since expects a UTC date of the form YYYY-MM-DD');
    return 2;
  }
  if (flags.since !== null && Number.isNaN(Date.parse(flags.since))) {
    console.error('--since expects a real calendar date');
    return 2;
  }
  const root = resolveRepoRoot(flags.root);
  const entries = collectEntries({
    repoRoot: root,
    since: flags.since,
    skill: flags.skill,
  });
  const filters = { since: flags.since, skill: flags.skill };
  const payload = render(entries, flags.format);
  if (flags.out) {
    const target = path.resolve(flags.out);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${payload}\n`);
  }
  // stdout carries the payload alone so it stays pipeable: JSONL lines for the
  // passthrough format, a JSON array for every other one. The one-line summary
  // goes to stderr, where it never corrupts the stream.
  if (payload !== '') console.log(payload);
  console.error(JSON.stringify(summarize(entries, flags.format, root, filters)));
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
