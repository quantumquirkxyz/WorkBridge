import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, 'traces', 'schema.json');

const SCHEMA = JSON.parse(await fs.readFile(schemaPath, 'utf8'));

const QUALITY_SCORER_PATH = path.join(__dirname, 'quality-scorer.mjs');
const DEFAULT_QUALITY_BAR = 60;
const SCORE_TIMEOUT_MS = 15000;
const MAX_ARTIFACT_READ_BYTES = 2 * 1024 * 1024;

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function simpleValidate(schema, data) {
  const errors = [];
  function check(s, obj, pointer = '') {
    if (s.type) {
      const types = Array.isArray(s.type) ? s.type : [s.type];
      const nullable = types.length > 1 && types.includes('null') && obj === null;
      if (nullable) {
        // null is an explicitly allowed value for this field; skip type and bounds checks
      } else if (types[0] === 'object') {
        if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
          errors.push(`${pointer || '$'} should be object`);
          return;
        }
        if (s.required) {
          for (const key of s.required) {
            if (!(key in obj)) {
              errors.push(`missing required property: ${key}`);
            }
          }
        }
        if (s.properties) {
          for (const [key, sub] of Object.entries(s.properties)) {
            if (key in obj) {
              check(sub, obj[key], pointer ? `${pointer}.${key}` : key);
            }
          }
        }
      } else if (types[0] === 'array') {
        if (!Array.isArray(obj)) {
          errors.push(`${pointer || '$'} should be array`);
          return;
        }
        if (s.items) {
          obj.forEach((item, i) => check(s.items, item, `${pointer}[${i}]`));
        }
      } else if (types[0] === 'string') {
        if (typeof obj !== 'string') {
          errors.push(`${pointer || '$'} should be string`);
        }
      } else if (types[0] === 'integer') {
        if (!Number.isInteger(obj)) {
          errors.push(`${pointer || '$'} should be integer`);
        }
      } else if (types[0] === 'boolean') {
        if (typeof obj !== 'boolean') {
          errors.push(`${pointer || '$'} should be boolean`);
        }
      }
    }
    if (s.enum && !s.enum.includes(obj)) {
      errors.push(`${pointer || '$'} must be one of ${JSON.stringify(s.enum)}`);
    }
    if (s.minimum !== undefined && obj < s.minimum) {
      errors.push(`${pointer || '$'} must be >= ${s.minimum}`);
    }
    if (s.maximum !== undefined && obj > s.maximum) {
      errors.push(`${pointer || '$'} must be <= ${s.maximum}`);
    }
  }
  check(schema, data);
  return errors;
}

function estimateTokens(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(1, Math.ceil(value));
  if (value === null || value === undefined) return 0;
  if (typeof value === 'string') return Math.max(1, Math.ceil(value.length / 4));
  try {
    return Math.max(1, Math.ceil(JSON.stringify(value).length / 4));
  } catch {
    return 0;
  }
}

function explicitSizeTokens(artifact) {
  if (!isPlainObject(artifact)) return null;
  const explicit = [artifact.sizeTokens, artifact.tokens, artifact.tokenCount]
    .find((v) => typeof v === 'number' && Number.isFinite(v) && v > 0);
  if (explicit !== undefined) return Math.round(explicit);
  const content = artifact.content ?? artifact.text ?? artifact.artifact ?? artifact.body;
  if (content !== undefined && content !== null) return estimateTokens(content);
  return null;
}

async function readArtifactText(ref) {
  if (typeof ref !== 'string' || ref === '') return null;
  try {
    const stat = await fs.stat(ref);
    if (!stat.isFile() || stat.size > MAX_ARTIFACT_READ_BYTES) return null;
    return await fs.readFile(ref, 'utf8');
  } catch {
    return null;
  }
}

async function normalizeArtifact(artifact, fallback) {
  const base = isPlainObject(artifact) ? { ...artifact } : {};
  let sizeTokens = explicitSizeTokens(base);
  if (sizeTokens === null) {
    const ref = base.outputRef ?? base.ref ?? base.path;
    const text = await readArtifactText(ref);
    sizeTokens = text === null ? (typeof fallback === 'number' ? fallback : 0) : estimateTokens(text);
  }
  base.sizeTokens = sizeTokens;
  return base;
}

function normalizeExecution(execution) {
  const base = isPlainObject(execution) ? { ...execution } : {};
  const now = Date.now();
  const startedAtMs = Number.isFinite(Date.parse(base.startedAt)) ? Date.parse(base.startedAt) : now;
  const completedAtMs = Number.isFinite(Date.parse(base.completedAt)) ? Date.parse(base.completedAt) : now;
  base.startedAt = new Date(startedAtMs).toISOString();
  base.completedAt = new Date(completedAtMs).toISOString();
  base.durationMs = typeof base.durationMs === 'number' && Number.isFinite(base.durationMs)
    ? Math.max(0, Math.round(base.durationMs))
    : Math.max(0, Math.round(completedAtMs - startedAtMs));
  base.iterations = Number.isFinite(base.iterations) ? Math.max(1, Math.round(base.iterations)) : 1;
  base.retries = Number.isFinite(base.retries) ? Math.max(0, Math.round(base.retries)) : 0;
  return base;
}

function normalizeQuality(quality) {
  const base = isPlainObject(quality) ? { ...quality } : {};
  base.artifactPassedQualityBar = typeof base.artifactPassedQualityBar === 'boolean' ? base.artifactPassedQualityBar : false;
  base.artifactScore = typeof base.artifactScore === 'number' && Number.isFinite(base.artifactScore) ? base.artifactScore : null;
  base.evaluators = Array.isArray(base.evaluators) ? base.evaluators : [];
  base.findingsCount = Number.isFinite(base.findingsCount) ? Math.max(0, Math.round(base.findingsCount)) : 0;
  return base;
}

function scoreArtifactPath(artifactPath, childCwd) {
  return new Promise((resolve) => {
    let timer = null;
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(value);
    };
    const child = spawn(process.execPath, [QUALITY_SCORER_PATH, artifactPath, '--json'], {
      cwd: childCwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    timer = setTimeout(() => {
      child.kill();
      finish(null);
    }, SCORE_TIMEOUT_MS);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; if (stdout.length > 1000000) child.kill(); });
    child.stderr.on('data', (chunk) => { stderr += chunk; if (stderr.length > 100000) child.kill(); });
    child.on('error', () => finish(null));
    child.on('close', (code) => {
      if (code !== 0) return finish(null);
      const start = stdout.indexOf('{');
      const end = stdout.lastIndexOf('}');
      if (start === -1 || end <= start) return finish(null);
      try {
        const parsed = JSON.parse(stdout.slice(start, end + 1));
        finish(Number.isFinite(parsed?.total) ? parsed.total : null);
      } catch {
        finish(null);
      }
    });
  });
}

async function scoreArtifactObject(artifact, repoRoot) {
  if (!isPlainObject(artifact)) return null;
  const text = [artifact.body, artifact.content, artifact.text].find((v) => typeof v === 'string' && v.trim() !== '');
  if (!text) return null;
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'quirk-artifact-'));
  try {
    const frontmatter = isPlainObject(artifact.frontmatter) ? artifact.frontmatter : {};
    const lines = Object.entries(frontmatter)
      .filter(([, value]) => typeof value === 'string' || typeof value === 'number')
      .map(([key, value]) => `${key}: ${value}`);
    const header = lines.length ? `---\n${lines.join('\n')}\n---\n` : '';
    await fs.writeFile(path.join(dir, 'SKILL.md'), header + text);
    return await scoreArtifact(dir, repoRoot);
  } catch {
    return null;
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

async function scoreArtifact(artifactPath, repoRoot) {
  const childCwd = repoRoot ? path.resolve(repoRoot) : process.cwd();
  const candidates = path.isAbsolute(artifactPath)
    ? [path.relative(childCwd, artifactPath)]
    : [artifactPath, path.relative(childCwd, path.resolve(process.cwd(), artifactPath))];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const score = await scoreArtifactPath(candidate, childCwd);
    if (score !== null) return score;
  }
  return null;
}

async function deriveArtifactScore(quality, repoRoot) {
  const target = quality?.artifactPath ?? quality?.path ?? quality?.skillPath;
  if (typeof target === 'string' && target !== '') {
    return await scoreArtifact(target, repoRoot);
  }
  if (isPlainObject(quality?.artifact)) {
    return await scoreArtifactObject(quality.artifact, repoRoot);
  }
  return null;
}

export async function recordExecution({
  repoRoot,
  skill,
  skillVersion = "2.0",
  promptVersion = "2.0",
  model = { provider: "anthropic", model: "claude-sonnet-4-20250514", tier: "code" },
  input = { artifactType: "unknown", sizeTokens: 0, contextRefs: [] },
  output = { artifactType: "unknown", sizeTokens: 0, schemaValid: false },
  execution = {},
  tools = [],
  quality = { artifactPassedQualityBar: false, artifactScore: null, evaluators: [], findingsCount: 0 },
  result = "completed",
  blockedBy = [],
  nextConsumer = "",
  extra = {},
  scoreArtifact = false,
  qualityBar = DEFAULT_QUALITY_BAR,
}) {
  const traceId = crypto.randomUUID();
  const spanId = crypto.randomUUID();

  // One clock read for the default start/end pair. Two independent reads can
  // straddle a millisecond boundary under load, which leaves the recorded
  // timestamps a millisecond apart while normalizeExecution derives durationMs
  // from the same pair - the two then disagree. Caller-supplied timestamps are
  // always honoured untouched.
  const recordedAt = new Date().toISOString();
  const executionInput = execution.startedAt === undefined && execution.completedAt === undefined
    ? { ...execution, startedAt: recordedAt, completedAt: recordedAt }
    : execution;

  let normalizedInput = input;
  let normalizedOutput = output;
  let normalizedExecution = normalizeExecution(executionInput);
  let normalizedQuality = normalizeQuality(quality);

  try {
    normalizedInput = await normalizeArtifact(input, 0);
    normalizedOutput = await normalizeArtifact(output, 0);
  } catch {
    normalizedInput = input;
    normalizedOutput = output;
  }

  if (scoreArtifact) {
    try {
      const score = await deriveArtifactScore(normalizedQuality, repoRoot);
      if (score !== null) {
        normalizedQuality.artifactScore = score;
        if (typeof quality?.artifactPassedQualityBar !== 'boolean') {
          normalizedQuality.artifactPassedQualityBar = score >= qualityBar;
        }
        if (!normalizedQuality.evaluators.includes('quality-scorer')) {
          normalizedQuality.evaluators.push('quality-scorer');
        }
      }
    } catch {
      // scoring is optional and must never fail a trace write
    }
  }

  const trace = {
    traceId,
    spanId,
    parentSpanId: null,
    skill,
    skillVersion,
    promptVersion,
    model,
    input: normalizedInput,
    output: normalizedOutput,
    execution: normalizedExecution,
    tools,
    quality: normalizedQuality,
    result,
    blockedBy,
    nextConsumer,
    ...extra,
  };
  const tracesDir = path.join(repoRoot, '.agents', 'skills', 'platform', 'traces');
  const dateStr = new Date(normalizedExecution.startedAt).toISOString().slice(0, 10);
  await fs.mkdir(tracesDir, { recursive: true });
  const runPath = path.join(tracesDir, `${dateStr}.jsonl`);
  const line = JSON.stringify(trace);
  await fs.appendFile(runPath, line + '\n');
  return runPath;
}

export function validateTrace(data) {
  return simpleValidate(SCHEMA, data);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain) {
  async function main() {
    const args = process.argv.slice(2);
    if (args[0] === '--schema') {
      const file = args[1];
      if (!file) {
        console.error('Usage: record-execution.mjs --schema <trace-file>');
        process.exit(1);
      }
      const raw = await fs.readFile(file, 'utf8');
      const lines = raw.split(/\n+/).filter(Boolean);
      let pass = 0;
      let fail = 0;
      for (const line of lines) {
        const obj = JSON.parse(line);
        const errs = validateTrace(obj);
        if (errs.length === 0) {
          pass++;
        } else {
          fail++;
          for (const e of errs) {
            console.error(`Validation error for trace ${obj.traceId}: ${e}`);
          }
        }
      }
      console.log(`Validated ${pass + fail} traces: ${pass} passed, ${fail} failed`);
      process.exit(fail > 0 ? 1 : 0);
    }
    console.error('Usage: record-execution.mjs --schema <trace-file>');
    process.exit(1);
  }

  main();
}
