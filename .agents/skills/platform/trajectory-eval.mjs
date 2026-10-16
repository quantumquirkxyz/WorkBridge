#!/usr/bin/env node
// trajectory-eval.mjs - evaluates recorded skill
// trajectories against the skill's own declared
// state machine.
//
// Where agentskills-compliance checks the skill's
// static form, this checks the runtime contract:
// did each recorded invocation stay inside the
// boundaries its SKILL.md declares?
//
// Conformance rules, per trace:
//   R1 result     - must be one of completed,
//                     blocked, failed, escalated
//   R2 iterations - must not exceed the skill's
//                     maxIterations frontmatter
//   R3 duration   - completedAt after startedAt,
//                     durationMs matches the gap
//                     within 1s tolerance
//   R4 tools      - every recorded tool must be
//                     covered by the skill's
//                     declared sideEffects (the
//                     same conservative derivation
//                     check-tool-risk-policy uses)
//   R5 model tier - trace model tier must exist
//                     in the trace schema enum
//   R6 schema     - output.schemaValid must be a
//                     boolean when output exists
//
// The report gives a per-skill conformance rate
// and a per-rule violation list, so a skill that
// drifts from its own contract is measurable.
//
// Usage:
//   node .agents/skills/platform/trajectory-eval.mjs [--json] [--skill name]
//
// Exit codes: 0 = all trajectories conform,
//             1 = violations found, 2 = usage.

import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './skill-graph.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.cwd();
const tracesDir = path.join(__dirname, 'traces');

const RESULT_ENUM = new Set(['completed', 'blocked', 'failed', 'escalated']);
const MODEL_TIERS = new Set(['reasoning', 'code', 'fast', 'router']);
const DURATION_TOLERANCE_MS = 1000;

// Shell commands recorded as tools are Bash sub-invocations;
// they inherit the Bash derivation (execution side effect).
const SHELL_COMMANDS = new Set([
  'node', 'npm', 'npx', 'pnpm', 'yarn', 'bun', 'deno',
  'rm', 'cp', 'mv', 'mkdir', 'touch', 'cat', 'sed', 'awk',
  'git', 'grep', 'find', 'curl', 'wget', 'tar', 'unzip',
  'python', 'python3', 'uv', 'pip', 'cargo', 'go', 'make',
  'chmod', 'chown', 'ln', 'ls', 'pwd', 'which', 'echo',
]);
const WRITE_SIDE_EFFECTS = new Set(['write-code', 'write-files', 'write-docs', 'write-temp-file']);
const WRITE_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit']);
const EXEC_SIDE_EFFECTS = new Set(['run-tests', 'execute', 'run-command', 'build']);
const EXEC_TOOLS = new Set(['Bash', 'PowerShell']);
const NETWORK_SIDE_EFFECTS = new Set(['fetch-url', 'network', 'web-fetch', 'web-search']);
const NETWORK_TOOLS = new Set(['WebFetch', 'WebSearch']);
const ORCHESTRATION_SIDE_EFFECTS = new Set(['spawn-agent', 'coordinate-agents', 'post-pr-comment', 'create-project', 'link-repositories', 'message']);
const ORCHESTRATION_TOOLS = new Set(['Task', 'Agent', 'SendMessage', 'Skill']);
const BASE_TOOLS = new Set(['Read', 'Grep', 'Glob', 'LSP', 'TodoWrite']);

class UsageError extends Error {}

function parseArgs(argv) {
  const flags = { json: false, skill: null, skillNext: false, help: false };
  for (const token of argv) {
    if (token === '--json') flags.json = true;
    else if (token === '--help' || token === '-h') flags.help = true;
    else if (token === '--skill') flags.skillNext = true;
    else if (flags.skillNext) { flags.skill = token; flags.skillNext = false; }
    else throw new UsageError(`unknown argument: ${token}`);
  }
  return flags;
}

function skillContracts(skillsRoot) {
  const contracts = new Map();
  const walk = (dir, domain) => {
    for (const entry of fsSync.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === 'platform') continue;
      const child = path.join(dir, entry.name);
      const skillMd = path.join(child, 'SKILL.md');
      if (fsSync.existsSync(skillMd)) {
        const meta = parseFrontmatter(fsSync.readFileSync(skillMd, 'utf8'));
        const contract = {
          maxIterations: Number.isFinite(Number(meta.maxIterations)) ? Number(meta.maxIterations) : null,
          sideEffects: Array.isArray(meta.sideEffects) ? meta.sideEffects : [],
        };
        // Traces key skills by "domain/name"; contracts
        // are authored by directory name. Register both.
        contracts.set(entry.name, contract);
        contracts.set(`${domain || 'uncategorized'}/${entry.name}`, contract);
      } else {
        walk(child, domain || entry.name);
      }
    }
  };
  walk(skillsRoot, '');
  return contracts;
}

function readTraces() {
  const traces = [];
  let files = [];
  try {
    files = fsSync.readdirSync(tracesDir).filter((f) => f.endsWith('.jsonl')).sort();
  } catch {
    return traces;
  }
  for (const file of files) {
    const text = fsSync.readFileSync(path.join(tracesDir, file), 'utf8');
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        traces.push(JSON.parse(line));
      } catch {
        // skip malformed recorder output
      }
    }
  }
  return traces;
}

// R4: tools used must be covered by declared side effects.
function toolViolations(trace, contract) {
  const violations = [];
  const tools = Array.isArray(trace.tools) ? trace.tools.map((t) => t?.name).filter(Boolean) : [];
  const declared = new Set(contract.sideEffects);
  for (const tool of tools) {
    if (BASE_TOOLS.has(tool)) continue;
    if (SHELL_COMMANDS.has(tool)) {
      if (![...declared].some((effect) => EXEC_SIDE_EFFECTS.has(effect) || WRITE_SIDE_EFFECTS.has(effect))) {
        violations.push(`R4: command "${tool}" run without an execution or write sideEffect declared`);
      }
      continue;
    }
    if (WRITE_TOOLS.has(tool) && ![...declared].some((effect) => WRITE_SIDE_EFFECTS.has(effect))) {
      violations.push(`R4: tool "${tool}" used without a write sideEffect declared`);
    } else if (EXEC_TOOLS.has(tool) && ![...declared].some((effect) => EXEC_SIDE_EFFECTS.has(effect))) {
      violations.push(`R4: tool "${tool}" used without an execution sideEffect declared`);
    } else if (NETWORK_TOOLS.has(tool) && ![...declared].some((effect) => NETWORK_SIDE_EFFECTS.has(effect))) {
      violations.push(`R4: tool "${tool}" used without a network sideEffect declared`);
    } else if (ORCHESTRATION_TOOLS.has(tool) && ![...declared].some((effect) => ORCHESTRATION_SIDE_EFFECTS.has(effect))) {
      violations.push(`R4: tool "${tool}" used without an orchestration sideEffect declared`);
    } else if (!BASE_TOOLS.has(tool) && !WRITE_TOOLS.has(tool) && !EXEC_TOOLS.has(tool) && !NETWORK_TOOLS.has(tool) && !ORCHESTRATION_TOOLS.has(tool)) {
      violations.push(`R4: tool "${tool}" is outside the known tool vocabulary`);
    }
  }
  return violations;
}

function evaluate(trace, contract) {
  const violations = [];

  // R1
  if (!RESULT_ENUM.has(trace.result)) {
    violations.push(`R1: result "${trace.result}" is not in the trace schema enum`);
  }

  // R2
  const iterations = trace.execution?.iterations;
  if (contract.maxIterations !== null && Number.isFinite(iterations) && iterations > contract.maxIterations) {
    violations.push(`R2: ${iterations} iterations exceed maxIterations ${contract.maxIterations}`);
  }

  // R3
  const started = Date.parse(trace.execution?.startedAt ?? '');
  const completed = Date.parse(trace.execution?.completedAt ?? '');
  const durationMs = trace.execution?.durationMs;
  if (Number.isFinite(started) && Number.isFinite(completed)) {
    if (completed < started) violations.push('R3: completedAt precedes startedAt');
    else if (Number.isFinite(durationMs) && Math.abs((completed - started) - durationMs) > DURATION_TOLERANCE_MS) {
      violations.push(`R3: durationMs ${durationMs} does not match the ${completed - started}ms window`);
    }
  }

  // R4
  violations.push(...toolViolations(trace, contract));

  // R5
  const tier = trace.model?.tier;
  if (tier !== undefined && !MODEL_TIERS.has(tier)) {
    violations.push(`R5: model tier "${tier}" is not in the schema enum`);
  }

  // R6
  if (trace.output && typeof trace.output.schemaValid !== 'boolean') {
    violations.push('R6: output.schemaValid must be a boolean');
  }

  return violations;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) {
    console.log('trajectory-eval options:\n  (no flags) evaluate all recorded trajectories\n  --skill n  evaluate one skill\n  --json     machine-readable report\n  --help     this help');
    return 0;
  }

  const traces = readTraces();
  const contracts = skillContracts(path.join(repoRoot, '.agents', 'skills'));
  const bySkill = new Map();
  for (const trace of traces) {
    const name = trace.skill ?? 'unknown';
    if (!bySkill.has(name)) bySkill.set(name, []);
    bySkill.get(name).push(trace);
  }

  const perSkill = [];
  const violations = [];
  for (const [name, skillTraces] of [...bySkill.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    if (flags.skill && name !== flags.skill) continue;
    const contract = contracts.get(name) ?? { maxIterations: null, sideEffects: [] };
    const skillViolations = [];
    for (const trace of skillTraces) {
      const traceViolations = evaluate(trace, contract);
      for (const violation of traceViolations) {
        skillViolations.push({ traceId: trace.traceId, rule: violation });
      }
    }
    violations.push(...skillViolations.map((v) => `${name} ${v.traceId}: ${v.rule}`));
    perSkill.push({
      skill: name,
      traces: skillTraces.length,
      conformant: skillTraces.length - new Set(skillViolations.map((v) => v.traceId)).size,
      violations: skillViolations.length,
      conformanceRate: skillTraces.length ? Number((1 - new Set(skillViolations.map((v) => v.traceId)).size / skillTraces.length).toFixed(3)) : 1,
      detail: skillViolations.slice(0, 5),
    });
  }

  const totalTraces = perSkill.reduce((sum, s) => sum + s.traces, 0);
  const conformantTraces = perSkill.reduce((sum, s) => sum + s.conformant, 0);
  const report = {
    tracesEvaluated: totalTraces,
    skillsEvaluated: perSkill.length,
    conformantTraces,
    conformanceRate: totalTraces ? Number((conformantTraces / totalTraces).toFixed(3)) : 1,
    violations,
    perSkill,
    status: violations.length ? 'fail' : 'pass',
  };

  console.log(JSON.stringify(report, null, 2));
  return violations.length ? 1 : 0;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      if (error instanceof UsageError) {
        console.error(`[trajectory-eval] ${error.message}`);
        process.exit(2);
      }
      console.error(`[trajectory-eval] error: ${error?.message ?? error}`);
      process.exit(1);
    },
  );
}
