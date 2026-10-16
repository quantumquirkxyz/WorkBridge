#!/usr/bin/env node
// benchmark-harness.mjs - measurement layer over the
// task fixtures, in the spirit of Terminal-Bench and
// Harness-Bench: repeat every task, measure the pass
// rate, and keep a history so the bundle's own
// benchmark trend is visible over time.
//
// The task scenarios themselves belong to
// run-skill-task.mjs (workspace seed, defect
// injection, declared actions, final-state
// verification). This harness adds what that runner
// does not provide:
//
//   - repetition (pass@k over N repeats, the
//     Terminal-Bench convention)
//   - duration statistics (median, p95)
//   - a persistent history (benchmark-history.jsonl)
//     so regressions are a trend, not a surprise
//   - a summary verdict for the whole suite
//
// Cost accounting is token-free on purpose: the
// tasks run deterministic scripts, so the honest
// unit of cost here is wall time.
//
// Usage:
//   node .agents/skills/platform/benchmark-harness.mjs [--json]
//        [--repeats N] [--task id] [--history path]
//        [--sandbox copy|worktree|tmpdir]
//
// Exit codes: 0 = every task passed every repeat,
//             1 = any task failed any repeat,
//             2 = usage.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.cwd();
const tasksDir = path.join(__dirname, 'tasks');
const defaultHistory = path.join(__dirname, 'artifacts', 'benchmark-history.jsonl');
const RUNNER = path.join(__dirname, 'scripts', 'run-skill-task.mjs');

const DEFAULT_REPEATS = 3;

class UsageError extends Error {}

function parseArgs(argv) {
  const flags = { json: false, repeats: DEFAULT_REPEATS, task: null, history: defaultHistory, sandbox: 'copy', help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--json') flags.json = true;
    else if (token === '--help' || token === '-h') flags.help = true;
    else if (token === '--repeats') { flags.repeats = Number(argv[i + 1]); i += 1; }
    else if (token === '--task') { flags.task = argv[i + 1]; i += 1; }
    else if (token === '--history') { flags.history = argv[i + 1]; i += 1; }
    else if (token === '--sandbox') { flags.sandbox = argv[i + 1]; i += 1; }
    else throw new UsageError(`unknown argument: ${token}`);
  }
  return flags;
}

function listTasks() {
  return fs.readdirSync(tasksDir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => ({ id: file.replace(/\.json$/, ''), path: path.join(tasksDir, file) }));
}

function runTask(taskPath, sandbox) {
  return new Promise((resolve) => {
    const started = process.hrtime.bigint();
    const child = spawn('node', [RUNNER, taskPath, '--json', '--sandbox', sandbox], {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => {
      const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
      let report = null;
      try {
        report = JSON.parse(stdout.trim());
      } catch {
        report = null;
      }
      resolve({
        exitCode: code,
        durationMs,
        status: report?.status ?? (code === 0 ? 'pass' : 'error'),
        report,
        stderr: stderr.trim(),
      });
    });
  });
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) {
    console.log(`benchmark-harness options:
  (no flags)         run every task ${DEFAULT_REPEATS} times and report
  --repeats N        repeats per task (default ${DEFAULT_REPEATS})
  --task id          run one task
  --sandbox mode     copy | worktree | tmpdir (default copy)
  --history path     history file (default artifacts/benchmark-history.jsonl)
  --json             machine-readable report
  --help             this help`);
    return 0;
  }
  if (!Number.isInteger(flags.repeats) || flags.repeats < 1) {
    throw new UsageError('--repeats must be a positive integer');
  }

  const tasks = listTasks().filter((task) => !flags.task || task.id === flags.task);
  if (flags.task && tasks.length === 0) {
    throw new UsageError(`unknown task "${flags.task}" (one of: ${listTasks().map((t) => t.id).join(', ')})`);
  }

  const results = [];
  for (const task of tasks) {
    const repeats = [];
    for (let i = 0; i < flags.repeats; i += 1) {
      const run = await runTask(task.path, flags.sandbox);
      repeats.push({ status: run.status, exitCode: run.exitCode, durationMs: Math.round(run.durationMs) });
    }
    const passes = repeats.filter((r) => r.status === 'pass').length;
    const durations = repeats.map((r) => r.durationMs);
    results.push({
      task: task.id,
      repeats,
      passCount: passes,
      passRate: Number((passes / repeats.length).toFixed(3)),
      medianMs: Math.round(percentile(durations, 50)),
      p95Ms: Math.round(percentile(durations, 95)),
      status: passes === repeats.length ? 'pass' : passes === 0 ? 'fail' : 'flaky',
    });
  }

  const totalRuns = results.reduce((sum, r) => sum + r.repeats.length, 0);
  const totalPasses = results.reduce((sum, r) => sum + r.passCount, 0);
  const suite = {
    generatedAt: new Date().toISOString(),
    repeats: flags.repeats,
    sandbox: flags.sandbox,
    tasks: results.length,
    runs: totalRuns,
    passes: totalPasses,
    passRate: totalRuns ? Number((totalPasses / totalRuns).toFixed(3)) : 0,
    verdict: results.every((r) => r.status === 'pass') ? 'pass' : 'fail',
    results,
  };

  // Persist the run to the history ledger so the
  // trend survives across sessions.
  try {
    await fs.promises.mkdir(path.dirname(flags.history), { recursive: true });
    const entry = {
      at: suite.generatedAt,
      repeats: suite.repeats,
      sandbox: suite.sandbox,
      tasks: suite.tasks,
      runs: suite.runs,
      passes: suite.passes,
      passRate: suite.passRate,
      verdict: suite.verdict,
      perTask: results.map((r) => ({ task: r.task, passRate: r.passRate, medianMs: r.medianMs, p95Ms: r.p95Ms, status: r.status })),
    };
    await fs.promises.appendFile(flags.history, `${JSON.stringify(entry)}\n`);
  } catch {
    // History is best-effort: a read-only checkout must
    // not fail the benchmark because the ledger cannot
    // be written.
  }

  if (flags.json) {
    console.log(JSON.stringify(suite, null, 2));
  } else {
    console.log(`[benchmark-harness] suite: ${suite.tasks} tasks, ${suite.runs} runs, pass rate ${suite.passRate} [${suite.verdict}]`);
    for (const result of results) {
      console.log(`[benchmark-harness]   ${result.task}: ${result.passCount}/${result.repeats.length} pass, median ${result.medianMs}ms, p95 ${result.p95Ms}ms [${result.status}]`);
    }
  }

  return suite.verdict === 'pass' ? 0 : 1;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      if (error instanceof UsageError) {
        console.error(`[benchmark-harness] ${error.message}`);
        console.error(`[benchmark-harness] run with --help for usage`);
        process.exit(2);
      }
      console.error(`[benchmark-harness] error: ${error?.message ?? error}`);
      process.exit(1);
    },
  );
}
