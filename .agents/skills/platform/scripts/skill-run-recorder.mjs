#!/usr/bin/env node
// skill-run-recorder.mjs - Skill Run Record recorder for the quirk bundle.
//
// A Skill Run Record (schema/skill-run.schema.json) is one append-only
// observability event of a skill run: route.started, route.selected,
// context.loaded, tool.called, artifact.created, gate.executed,
// verification.result, handoff.created, failure.classified, run.completed.
//
// Usage:
//   node skill-run-recorder.mjs --demo --json
//   node skill-run-recorder.mjs --record-events '<json-array>' [--out FILE] [--bridge]
//   node skill-run-recorder.mjs --validate <file.jsonl>
//   node skill-run-recorder.mjs --help
//
// Exit codes: 0 ok, 1 validation or I/O failure, 2 usage error.
// Records are redacted with redact() before they are persisted or returned.

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from '../skill-graph.mjs';
import { recordExecution } from '../record-execution.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const PLATFORM_DIR = path.resolve(here, '..');
const REPO_ROOT_FROM_HERE = path.resolve(PLATFORM_DIR, '..', '..', '..');
const SCHEMA_PATH = path.join(REPO_ROOT_FROM_HERE, 'schema', 'skill-run.schema.json');

const SKILL_RUN_SCHEMA = JSON.parse(await fs.readFile(SCHEMA_PATH, 'utf8'));

export const SKILL_RUN_SCHEMA_PATH = SCHEMA_PATH;
export const SCHEMA_VERSION = '1.0';
export const DEFAULT_SKILL_VERSION = '2.0';
export const DEFAULT_PROMPT_VERSION = '2.0';
export const EVENT_ORDER = SKILL_RUN_SCHEMA.properties.event.enum.slice();
export const REDACTED = '[REDACTED]';
export const REDACT_KEYS = [
  'authorization', 'api_key', 'apiKey', 'token', 'secret', 'password', 'cookie', 'set-cookie',
];
export const SKILL_RUNS_DIRNAME = 'skill-runs';
export { REPEATABLE_EVENTS };

// Key comparison normalizes separators so apiKey, api_key and api-key all match
// the same declared key.
const REDACT_KEY_SET = new Set(REDACT_KEYS.map((key) => key.toLowerCase().replace(/[^a-z0-9]/g, '')));
const REPEATABLE_EVENTS = new Set([
  'tool.called', 'artifact.created', 'gate.executed', 'verification.result',
  'handoff.created', 'failure.classified',
]);
const OPTIONAL_KEYS = [
  'skillVersion', 'promptVersion', 'inputHash', 'model', 'evidence', 'tools', 'artifacts',
  'sideEffects', 'durationMs', 'cost', 'verdict', 'failureMode',
];
const VERDICT_TO_TRACE_RESULT = {
  pass: 'completed',
  fail: 'failed',
  blocked: 'blocked',
  skipped: 'escalated',
};

const USAGE = `skill-run-recorder.mjs - Skill Run Record recorder

Usage:
  node skill-run-recorder.mjs --demo --json
  node skill-run-recorder.mjs --record-events '<json-array>' [--out FILE] [--bridge]
  node skill-run-recorder.mjs --validate <file.jsonl>

Options:
  --record-events <json>  JSON array of partial events {event, skill, ...} recorded under
                          one traceId; a missing run.completed is appended by finish().
  --out <file>            write the JSONL to an explicit file instead of the default
                          <repo>/.agents/skills/platform/skill-runs/<YYYY-MM-DD>.jsonl
  --validate <file>       validate every JSON line of a skill-run file
  --root <dir>            repository root used for the default sink (default: cwd)
  --bridge                mirror the finished run into traces/ via record-execution.mjs;
                          omit the flag and only the new format is written
  --json                  accepted for uniformity; output is JSON in both modes
  --help                  show this help

Exit codes: 0 ok, 1 validation or I/O failure, 2 usage error.`;

export class SkillRunValidationError extends Error {
  constructor(errors) {
    super(`skill run record failed validation: ${errors.join('; ')}`);
    this.name = 'SkillRunValidationError';
    this.errors = errors;
  }
}

class SkillRunSessionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SkillRunSessionError';
  }
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function jsonTypeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

function matchesType(value, type) {
  if (type === 'null') return value === null;
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return isPlainObject(value);
  if (type === 'integer') return Number.isInteger(value);
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
  if (type === 'string') return typeof value === 'string';
  if (type === 'boolean') return typeof value === 'boolean';
  return false;
}

// Minimal JSON-Schema validator for the subset the repo schemas use: type,
// required, enum, const, properties, additionalProperties, items, minimum,
// maximum, minLength, maxLength, pattern. No runtime dependency is available.
function validateNode(schema, instance, pointer, errors) {
  if (schema === true || schema === undefined || schema === null) return;
  if (schema === false) {
    errors.push(`${pointer}: the schema forbids any value`);
    return;
  }
  if (typeof schema !== 'object') return;
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => matchesType(instance, type))) {
      errors.push(`${pointer}: expected ${JSON.stringify(schema.type)}, got ${jsonTypeOf(instance)}`);
      return;
    }
  }
  if (schema.enum !== undefined && !schema.enum.some((value) => deepEqual(value, instance))) {
    errors.push(`${pointer}: ${JSON.stringify(instance)} is not one of ${JSON.stringify(schema.enum)}`);
  }
  if (schema.const !== undefined && !deepEqual(schema.const, instance)) {
    errors.push(`${pointer}: expected the const ${JSON.stringify(schema.const)}`);
  }
  if (typeof instance === 'string') {
    if (schema.minLength !== undefined && instance.length < schema.minLength) {
      errors.push(`${pointer}: shorter than minLength ${schema.minLength}`);
    }
    if (schema.maxLength !== undefined && instance.length > schema.maxLength) {
      errors.push(`${pointer}: longer than maxLength ${schema.maxLength}`);
    }
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(instance)) {
      errors.push(`${pointer}: does not match pattern ${schema.pattern}`);
    }
  }
  if (typeof instance === 'number' && Number.isFinite(instance)) {
    if (schema.minimum !== undefined && instance < schema.minimum) {
      errors.push(`${pointer}: below the minimum ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && instance > schema.maximum) {
      errors.push(`${pointer}: above the maximum ${schema.maximum}`);
    }
  }
  if (Array.isArray(instance)) {
    if (schema.minItems !== undefined && instance.length < schema.minItems) {
      errors.push(`${pointer}: fewer than minItems ${schema.minItems}`);
    }
    if (schema.items !== undefined) {
      instance.forEach((item, index) => validateNode(schema.items, item, `${pointer}[${index}]`, errors));
    }
  }
  if (isPlainObject(instance)) {
    for (const key of schema.required ?? []) {
      if (!(key in instance)) errors.push(`${pointer}: missing required property "${key}"`);
    }
    const properties = schema.properties ?? {};
    for (const [key, sub] of Object.entries(properties)) {
      if (key in instance) validateNode(sub, instance[key], `${pointer}.${key}`, errors);
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(instance)) {
        if (!(key in properties)) errors.push(`${pointer}: unexpected property "${key}"`);
      }
    } else if (isPlainObject(schema.additionalProperties)) {
      for (const key of Object.keys(instance)) {
        if (!(key in properties)) validateNode(schema.additionalProperties, instance[key], `${pointer}.${key}`, errors);
      }
    }
  }
}

export function validateSkillRun(record) {
  const errors = [];
  validateNode(SKILL_RUN_SCHEMA, record, '$', errors);
  return errors;
}

export function redact(value) {
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (isPlainObject(value)) {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      out[key] = REDACT_KEY_SET.has(normalized) ? REDACTED : redact(item);
    }
    return out;
  }
  return value;
}

export function newSkillRun(partial = {}) {
  const source = isPlainObject(partial) ? partial : {};
  const record = {
    schemaVersion: SCHEMA_VERSION,
    traceId: nonEmptyString(source.traceId) ?? crypto.randomUUID(),
    spanId: nonEmptyString(source.spanId) ?? crypto.randomUUID(),
    parentSpanId: source.parentSpanId === undefined ? null : source.parentSpanId,
    ts: nonEmptyString(source.ts) ?? new Date().toISOString(),
    event: source.event,
    skill: source.skill,
  };
  for (const key of OPTIONAL_KEYS) {
    if (source[key] !== undefined) record[key] = source[key];
  }
  return redact(record);
}

export function record(partial = {}) {
  const built = newSkillRun(partial);
  const errors = validateSkillRun(built);
  if (errors.length > 0) throw new SkillRunValidationError(errors);
  return built;
}

export function skillRunsDir(repoRoot = process.cwd()) {
  return path.join(path.resolve(repoRoot), '.agents', 'skills', 'platform', SKILL_RUNS_DIRNAME);
}

export function skillRunPath(record, repoRoot = process.cwd()) {
  const day = nonEmptyString(record?.ts)?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
  return path.join(skillRunsDir(repoRoot), `${day}.jsonl`);
}

export async function appendSkillRun(record, repoRoot = process.cwd()) {
  const target = skillRunPath(record, repoRoot);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.appendFile(target, `${JSON.stringify(record)}\n`);
  return target;
}

export async function resolveSkillVersion(skill, repoRoot = process.cwd()) {
  const fallback = DEFAULT_SKILL_VERSION;
  const name = nonEmptyString(skill);
  if (!name) return fallback;
  const candidates = [path.join(path.resolve(repoRoot), '.agents', 'skills', `${name}.md`)];
  const parts = name.split('/');
  candidates.push(path.join(path.resolve(repoRoot), '.agents', 'skills', ...parts, 'SKILL.md'));
  candidates.push(path.join(path.resolve(repoRoot), name, 'SKILL.md'));
  for (const candidate of candidates) {
    try {
      const text = await fs.readFile(candidate, 'utf8');
      const fm = parseFrontmatter(text);
      const version = nonEmptyString(fm.version) ?? nonEmptyString(fm.skillVersion);
      if (version) return version;
    } catch {
      // the skill body is not resolvable from this cwd; the default stays
    }
  }
  return fallback;
}

function normalizeSink(sink, repoRoot) {
  if (typeof sink === 'function') {
    return async (record_) => {
      const written = await sink(record_);
      return typeof written === 'string' ? written : null;
    };
  }
  if (typeof sink === 'string' && sink.trim() !== '') {
    const target = path.resolve(sink);
    return async (record_) => {
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.appendFile(target, `${JSON.stringify(record_)}\n`);
      return target;
    };
  }
  if (sink === 'memory') return async () => null;
  return async (record_) => appendSkillRun(record_, repoRoot);
}

export class SkillRunSession {
  constructor(options = {}) {
    const opts = isPlainObject(options) ? options : {};
    this.options = opts;
    this.repoRoot = opts.repoRoot ? path.resolve(opts.repoRoot) : process.cwd();
    this.sink = normalizeSink(opts.sink, this.repoRoot);
    this.traceId = nonEmptyString(opts.traceId) ?? crypto.randomUUID();
    this.rootSpanId = nonEmptyString(opts.spanId) ?? crypto.randomUUID();
    this.parentSpanId = opts.parentSpanId ?? null;
    this.skill = nonEmptyString(opts.skill);
    this.skillVersion = nonEmptyString(opts.skillVersion) ?? DEFAULT_SKILL_VERSION;
    this.promptVersion = nonEmptyString(opts.promptVersion) ?? DEFAULT_PROMPT_VERSION;
    this.model = isPlainObject(opts.model) ? opts.model : null;
    this.bridge = opts.bridge === true;
    this.records = [];
    this.lastSpanId = null;
    this.lastEmitMs = 0;
    this.startedAtMs = 0;
    this.endedAtMs = 0;
    this.started = false;
    this.finished = false;
    this.verdict = null;
    this.failureMode = null;
    this.writtenPaths = [];
    this.bridgePath = null;
  }

  async append(spec) {
    const partial = { traceId: this.traceId, ...spec };
    const built = record(partial);
    this.records.push(built);
    this.lastSpanId = built.spanId;
    this.lastEmitMs = Date.parse(built.ts);
    if (this.startedAtMs === 0) this.startedAtMs = this.lastEmitMs;
    this.endedAtMs = this.lastEmitMs;
    const written = await this.sink(built);
    if (typeof written === 'string') this.writtenPaths.push(written);
    return built;
  }

  async start(skill, inputHash, extra = {}) {
    if (this.started) throw new SkillRunSessionError('start() called twice on the same skill-run session');
    const overrides = isPlainObject(extra) ? extra : {};
    this.skill = nonEmptyString(skill) ?? this.skill;
    this.started = true;
    this.startedAtMs = Date.now();
    this.lastEmitMs = this.startedAtMs;
    return this.append({
      ...overrides,
      spanId: this.rootSpanId,
      parentSpanId: this.parentSpanId,
      event: 'route.started',
      skill: this.skill,
      skillVersion: this.skillVersion,
      promptVersion: this.promptVersion,
      ...(nonEmptyString(inputHash) ? { inputHash } : {}),
      ...(this.model ? { model: this.model } : {}),
    });
  }

  async emit(event, extra = {}) {
    if (this.finished) throw new SkillRunSessionError('emit() called after finish(); start a new session for a new trace');
    const overrides = isPlainObject(extra) ? { ...extra } : {};
    if (!this.started) {
      await this.start(overrides.skill ?? this.options.skill, overrides.inputHash);
    }
    const now = Date.now();
    const spanId = crypto.randomUUID();
    const parentSpanId = this.lastSpanId ?? this.rootSpanId;
    const durationMs = overrides.durationMs ?? (this.lastEmitMs === 0 ? 0 : Math.max(0, now - this.lastEmitMs));
    return this.append({
      ...overrides,
      spanId,
      parentSpanId,
      event,
      skill: this.skill,
      skillVersion: this.skillVersion,
      promptVersion: this.promptVersion,
      durationMs,
      ...(this.model ? { model: this.model } : {}),
    });
  }

  elapsedMs() {
    if (this.startedAtMs === 0) return 0;
    return Math.max(0, (this.endedAtMs || Date.now()) - this.startedAtMs);
  }

  async finish(verdict = 'pass', extra = {}) {
    const overrides = isPlainObject(extra) ? { ...extra } : {};
    if (this.finished) return this.summary();
    if (!this.started) throw new SkillRunSessionError('finish() called before start(); no trace exists yet');
    const finalVerdict = nonEmptyString(overrides.verdict) ?? nonEmptyString(verdict) ?? 'pass';
    this.verdict = finalVerdict;
    this.failureMode = overrides.failureMode ?? null;
    const alreadyCompleted = this.records.some((entry) => entry.event === 'run.completed');
    if (!alreadyCompleted) {
      await this.emit('run.completed', {
        ...overrides,
        verdict: finalVerdict,
        failureMode: this.failureMode,
        durationMs: overrides.durationMs ?? this.elapsedMs(),
      });
    }
    this.finished = true;
    if (this.bridge && this.bridgePath === null) {
      this.bridgePath = await this.bridgeLegacyTrace();
    }
    return this.summary();
  }

  async bridgeLegacyTrace() {
    const toolCounts = new Map();
    for (const entry of this.records) {
      for (const tool of entry.tools ?? []) {
        const name = nonEmptyString(tool?.name);
        if (!name) continue;
        toolCounts.set(name, (toolCounts.get(name) ?? 0) + 1);
      }
    }
    const artifacts = [];
    for (const entry of this.records) {
      for (const artifact of entry.artifacts ?? []) {
        if (nonEmptyString(artifact?.path)) artifacts.push(artifact);
      }
    }
    const startedAt = new Date(this.startedAtMs).toISOString();
    const completedAt = new Date(this.endedAtMs || Date.now()).toISOString();
    const runPath = await recordExecution({
      repoRoot: this.repoRoot,
      skill: this.skill,
      skillVersion: this.skillVersion,
      promptVersion: this.promptVersion,
      model: this.model ?? undefined,
      input: { artifactType: 'skill-run-input', sizeTokens: 0, contextRefs: [this.traceId] },
      output: { artifactType: 'skill-run-event', sizeTokens: 0, schemaValid: true },
      execution: { startedAt, completedAt, durationMs: this.elapsedMs(), iterations: 1, retries: 0 },
      tools: [...toolCounts.entries()].map(([name, calls]) => ({ name, calls })),
      quality: {
        artifactPassedQualityBar: this.verdict === 'pass',
        artifactScore: null,
        evaluators: ['skill-run-recorder'],
        findingsCount: this.verdict === 'fail' ? 1 : 0,
      },
      result: VERDICT_TO_TRACE_RESULT[this.verdict] ?? 'failed',
      blockedBy: this.failureMode ? [this.failureMode] : [],
      nextConsumer: this.records.find((entry) => entry.event === 'handoff.created')?.evidence?.[0] ?? '',
      extra: {
        skillRunTraceId: this.traceId,
        skillRunEventCount: this.records.length,
        skillRunArtifacts: artifacts.map((artifact) => artifact.path),
      },
    });
    return runPath;
  }

  summary() {
    return {
      traceId: this.traceId,
      skill: this.skill,
      skillVersion: this.skillVersion,
      promptVersion: this.promptVersion,
      events: this.records.length,
      eventTypes: this.records.map((entry) => entry.event),
      startedAt: this.startedAtMs ? new Date(this.startedAtMs).toISOString() : null,
      endedAt: this.endedAtMs ? new Date(this.endedAtMs).toISOString() : null,
      durationMs: this.elapsedMs(),
      verdict: this.verdict,
      failureMode: this.failureMode,
      runPath: this.writtenPaths[this.writtenPaths.length - 1] ?? null,
      bridgePath: this.bridgePath,
      records: this.records,
    };
  }
}

export function createSession(options = {}) {
  return new SkillRunSession(options);
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function redactionSample() {
  return JSON.parse('{"tool":"Read","headers":{"authorization":"demo-evidence-only"},"payload":{"attempts":[{"apiKey":"demo-evidence-only","note":"nested one level deeper"}]}}');
}

async function runDemo() {
  const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'quirk-skill-runs-demo-'));
  const traceFile = path.join(scratch, 'skill-runs-demo.jsonl');
  const session = createSession({ repoRoot: scratch, sink: traceFile, bridge: false });
  try {
    const toolInput = 'replay the recorded run';
    const toolOutput = 'run replayed deterministically';
    await session.start('delivery/review-pr', sha256('demo-input'), {
      evidence: ['routing request received'],
    });
    await session.emit('route.selected', {
      evidence: ['skill-graph ranked delivery/review-pr above the alternatives'],
      model: { provider: 'anthropic', model: 'router-tier-model', tier: 'router' },
    });
    await session.emit('context.loaded', {
      evidence: ['context pack resolved from the skills graph'],
    });
    await session.emit('tool.called', {
      tools: [{
        name: 'Read',
        inputHash: sha256(toolInput),
        outputHash: sha256(toolOutput),
        durationMs: 12,
      }],
      sideEffects: [],
    });
    await session.finish('pass', {
      cost: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
      failureMode: null,
    });

    const persisted = (await fs.readFile(traceFile, 'utf8')).split('\n').filter((line) => line.trim() !== '');
    const records = persisted.map((line) => JSON.parse(line));
    const failures = records.flatMap((entry, index) => validateSkillRun(entry).map((error) => `line ${index + 1}: ${error}`));
    const sample = redactionSample();
    return {
      demo: 'skill-run-recorder',
      skill: session.skill,
      traceId: session.traceId,
      sink: 'tmpdir',
      written: traceFile,
      events: records.length,
      eventTypes: records.map((entry) => entry.event),
      records,
      validation: { total: records.length, valid: records.length - failures.length, invalid: failures.length, failures },
      replay: { traceId: session.traceId, orderMatchesSchema: EVENT_ORDER.join(' -> ') },
      redaction: { keys: REDACT_KEYS, sample, redacted: redact(sample) },
      status: failures.length === 0 ? 'pass' : 'fail',
    };
  } finally {
    await fs.rm(scratch, { recursive: true, force: true }).catch(() => {});
  }
}

async function runValidate(file) {
  const text = await fs.readFile(file, 'utf8');
  const lines = text.split('\n').filter((line) => line.trim() !== '');
  const failures = [];
  let valid = 0;
  lines.forEach((line, index) => {
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      failures.push({ line: index + 1, errors: ['the line is not valid JSON'] });
      return;
    }
    const errors = validateSkillRun(parsed);
    if (errors.length > 0) failures.push({ line: index + 1, traceId: parsed?.traceId ?? null, errors });
    else valid += 1;
  });
  return {
    file: path.resolve(file),
    total: lines.length,
    valid,
    invalid: failures.length,
    failures,
    status: failures.length === 0 ? 'pass' : 'fail',
  };
}

async function runRecordEvents(raw, flags) {
  let events;
  try {
    events = JSON.parse(raw);
  } catch (error) {
    console.error(`--record-events expects a JSON array: ${error.message}`);
    return 2;
  }
  if (!Array.isArray(events) || events.length === 0) {
    console.error('--record-events expects a non-empty JSON array of events');
    return 2;
  }
  for (const entry of events) {
    if (!isPlainObject(entry) || typeof entry.event !== 'string') {
      console.error('--record-events expects every entry to be an object with an "event" string');
      return 2;
    }
    if (!EVENT_ORDER.includes(entry.event)) {
      console.error(`--record-events: "${entry.event}" is not a lifecycle event; expected one of ${EVENT_ORDER.join(', ')}`);
      return 2;
    }
  }
  if (!events.some((entry) => typeof entry.skill === 'string' && entry.skill.trim() !== '')) {
    console.error('--record-events: at least one entry must declare the "skill" of the run');
    return 2;
  }
  const session = createSession({
    repoRoot: flags.root ?? process.cwd(),
    sink: flags.out ?? undefined,
    bridge: flags.bridge === true,
    skill: events.find((entry) => typeof entry.skill === 'string')?.skill ?? null,
  });
  const completedInInput = events.some((entry) => entry.event === 'run.completed');
  for (const [position, entry] of events.entries()) {
    const enriched = { ...entry };
    if (enriched.skillVersion === undefined && enriched.skill) {
      enriched.skillVersion = await resolveSkillVersion(enriched.skill, session.repoRoot);
    }
    if (enriched.promptVersion === undefined) enriched.promptVersion = DEFAULT_PROMPT_VERSION;
    if (position === 0 && enriched.event === 'route.started') {
      await session.start(enriched.skill, enriched.inputHash, enriched);
      continue;
    }
    if (enriched.event === 'run.completed' && entry === events[events.length - 1]) {
      await session.finish(nonEmptyString(entry.verdict) ?? 'pass', enriched);
      continue;
    }
    await session.emit(enriched.event, enriched);
  }
  if (!completedInInput) {
    await session.finish(events[events.length - 1]?.verdict ?? 'pass', events[events.length - 1] ?? {});
  }
  const summary = session.summary();
  const lines = summary.records.map((entry) => JSON.stringify(entry));
  return {
    recorded: summary.events,
    traceId: summary.traceId,
    skill: summary.skill,
    eventTypes: summary.eventTypes,
    runPath: summary.runPath,
    closedBy: completedInInput ? 'caller' : 'recorder',
    bridgePath: summary.bridgePath,
    lines,
    status: 'pass',
  };
}

async function main(argv = process.argv.slice(2)) {
  const flags = {
    demo: false,
    validate: null,
    recordEvents: null,
    out: null,
    root: null,
    bridge: false,
    json: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--demo') flags.demo = true;
    else if (arg === '--json') flags.json = true;
    else if (arg === '--bridge') flags.bridge = true;
    else if (arg === '--help' || arg === '-h') flags.help = true;
    else if (arg === '--validate') flags.validate = argv[++i] ?? null;
    else if (arg.startsWith('--validate=')) flags.validate = arg.slice('--validate='.length);
    else if (arg === '--record-events') flags.recordEvents = argv[++i] ?? null;
    else if (arg.startsWith('--record-events=')) flags.recordEvents = arg.slice('--record-events='.length);
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
  if (flags.demo) {
    const report = await runDemo();
    console.log(JSON.stringify(report, null, 2));
    return report.status === 'pass' ? 0 : 1;
  }
  if (flags.validate !== null) {
    if (flags.validate.trim() === '') {
      console.error('--validate requires a file path');
      return 2;
    }
    let report;
    try {
      report = await runValidate(flags.validate);
    } catch (error) {
      console.error(`cannot read ${flags.validate}: ${error.message}`);
      return 2;
    }
    console.log(JSON.stringify(report, null, 2));
    return report.status === 'pass' ? 0 : 1;
  }
  if (flags.recordEvents !== null) {
    const report = await runRecordEvents(flags.recordEvents, flags);
    if (typeof report === 'number') return report;
    console.log(JSON.stringify(report, null, 2));
    return 0;
  }
  console.error(USAGE);
  return 2;
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
