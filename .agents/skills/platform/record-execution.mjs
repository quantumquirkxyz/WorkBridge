import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, 'traces', 'schema.json');

const SCHEMA = JSON.parse(await fs.readFile(schemaPath, 'utf8'));

function simpleValidate(schema, data) {
  const errors = [];
  function check(s, obj, pointer = '') {
    if (s.type) {
      if (s.type === 'object') {
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
      } else if (s.type === 'array') {
        if (!Array.isArray(obj)) {
          errors.push(`${pointer || '$'} should be array`);
          return;
        }
        if (s.items) {
          obj.forEach((item, i) => check(s.items, item, `${pointer}[${i}]`));
        }
      } else if (s.type === 'string') {
        if (typeof obj !== 'string') {
          errors.push(`${pointer || '$'} should be string`);
        }
      } else if (s.type === 'integer') {
        if (!Number.isInteger(obj)) {
          errors.push(`${pointer || '$'} should be integer`);
        }
      } else if (s.type === 'boolean') {
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

export async function recordExecution({
  repoRoot,
  skill,
  skillVersion = "2.0",
  promptVersion = "2.0",
  model = { provider: "anthropic", model: "claude-sonnet-4-20250514", tier: "code" },
  input = { artifactType: "unknown", sizeTokens: 0, contextRefs: [] },
  output = { artifactType: "unknown", sizeTokens: 0, schemaValid: false },
  execution = { startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), durationMs: 0, iterations: 1, retries: 0 },
  tools = [],
  quality = { artifactPassedQualityBar: false, artifactScore: 0, evaluators: [], findingsCount: 0 },
  result = "completed",
  blockedBy = [],
  nextConsumer = "",
  extra = {},
}) {
  const traceId = crypto.randomUUID();
  const spanId = crypto.randomUUID();
  const trace = {
    traceId,
    spanId,
    parentSpanId: null,
    skill,
    skillVersion,
    promptVersion,
    model,
    input,
    output,
    execution,
    tools,
    quality,
    result,
    blockedBy,
    nextConsumer,
    ...extra,
  };
  const tracesDir = path.join(repoRoot, '.agents', 'skills', 'platform', 'traces');
  const dateStr = new Date(execution.startedAt).toISOString().slice(0, 10);
  await fs.mkdir(tracesDir, { recursive: true });
  const runPath = path.join(tracesDir, `${dateStr}.jsonl`);
  const line = JSON.stringify(trace);
  await fs.writeFile(runPath, line + '\n', { flag: 'a' });
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
