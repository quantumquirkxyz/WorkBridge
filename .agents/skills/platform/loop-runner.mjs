#!/usr/bin/env node
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import crypto from 'node:crypto';

export const DEFAULT_LEDGER_PATH = '.scratch/loop-ledger.jsonl';

const DEFAULT_COST_PER_STEP = 1;

const BUDGET_DEFAULTS = {
  stepLimit: Infinity,
  costLimit: Infinity,
  wallTimeLimitMs: Infinity,
  maxConsecutiveFormatErrors: 3,
  repeatThreshold: 3,
  repeatWindow: 12,
  pingPongWindow: 12,
};

const HELP = `loop-runner.mjs - budgeted, degenerate-loop-safe agent loop runner

Usage:
  node loop-runner.mjs --demo [--json]   run built-in demo loops and print typed exits
  node loop-runner.mjs --help            show this help

Importable API:
  import { runLoop } from './loop-runner.mjs'
  const result = await runLoop({ steps, budget, ledgerPath, onNudge, exemptActions, loopId })
  // steps: async iterable/iterator yielding { action, args, result } verdicts
  //        (a verdict may carry cost; top-level error marks a failed step)
  // result: { exitStatus, submission, budgetSpent: { steps, cost, wallTimeMs }, nudges }

Budget fields:
  stepLimit                    max steps executed (default Infinity)
  costLimit                    abstract cost units (default Infinity)
  wallTimeLimitMs              wall-clock ceiling in ms (default Infinity)
  maxConsecutiveFormatErrors   consecutive failed/malformed steps before exit (default 3)
  repeatThreshold              identical action+args+result occurrences before halt (default 3)
  repeatWindow                 sliding window for repeat detection (default 12)
  pingPongWindow               sliding window for A-B-A-B detection (default 12)

exitStatus values:
  completed        the step iterator finished normally
  limits-exceeded  step, cost, or wall-time budget exhausted
  repeated-action  identical action+args+result repeated to the threshold
  ping-pong        A-B-A-B oscillation detected
  format-errors    consecutive malformed/failed steps reached maxConsecutiveFormatErrors

Loop rules honored (mini-swe-agent budgets + SWE-agent ACI guardrails):
  - budgets are checked before each step executes
  - cost is charged even when a step throws; the failed step is recorded in the ledger
  - every step is appended to the ledger as one JSON line; the ledger is never compacted
  - polling actions with changing results are exempt (the result hash is part of the
    signature); list never-changing polling actions in exemptActions to skip detection
`;

function canonicalJson(value) {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map((item) => safeCanonical(item)).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${safeCanonical(value[key])}`).join(',')}}`;
}

function safeCanonical(value) {
  try {
    return canonicalJson(value);
  } catch {
    return JSON.stringify('[unserializable]');
  }
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function hashArgs(args) {
  return sha256(safeCanonical(args));
}

export function signatureOf(result) {
  return sha256(safeCanonical(result));
}

function stepHashOf(action, argsHash, resultSignature) {
  return sha256(`${action}\u0000${argsHash}\u0000${resultSignature}`);
}

function toIterator(steps) {
  if (steps && typeof steps.next === 'function') return steps;
  if (steps && typeof steps[Symbol.asyncIterator] === 'function') return steps[Symbol.asyncIterator]();
  if (steps && typeof steps[Symbol.iterator] === 'function') return steps[Symbol.iterator]();
  throw new TypeError('runLoop requires steps to be an async iterable or iterator');
}

function normalizeBudget(budget) {
  const normalized = { ...BUDGET_DEFAULTS, ...(budget ?? {}) };
  for (const key of Object.keys(BUDGET_DEFAULTS)) {
    if (normalized[key] === undefined || normalized[key] === null) {
      normalized[key] = BUDGET_DEFAULTS[key];
    }
  }
  return normalized;
}

function errorText(error) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && typeof error.message === 'string') return error.message;
  return String(error);
}

function repeatNudge(action, severity, occurrences, threshold) {
  const base = { type: 'repeat', severity, action, occurrences, threshold };
  if (severity === 'block') {
    return {
      ...base,
      message: `Action "${action}" with identical arguments and result has now repeated ${occurrences} times (threshold ${threshold}). The loop is degenerate.`,
      instruction: 'Do not repeat this step. Change the action, its arguments, or the approach - or stop and report the blocker.',
    };
  }
  if (severity === 'backoff') {
    return {
      ...base,
      message: `Action "${action}" with identical arguments and result has repeated ${occurrences} times (threshold ${threshold}).`,
      instruction: 'Back off: re-read the current state before retrying. One more identical repeat halts the loop.',
    };
  }
  return {
    ...base,
    message: `Action "${action}" with identical arguments and result has repeated ${occurrences} times.`,
    instruction: 'Change the approach. Repeating an identical step cannot produce a new result.',
  };
}

function pingPongNudge(severity, pattern) {
  if (severity === 'block') {
    return {
      type: 'ping-pong',
      severity,
      pattern,
      message: `Ping-pong detected: the loop is oscillating between two steps (${pattern.join(' <-> ')}) without progress.`,
      instruction: 'Break the alternation. Reconcile the two competing actions or stop and report the blocker.',
    };
  }
  return {
    type: 'ping-pong',
    severity,
    pattern,
    message: `Early alternation detected between two steps (${pattern.join(' <-> ')}).`,
    instruction: 'A confirmed A-B-A-B oscillation halts the loop. Make the next step depend on the last result.',
  };
}

function formatErrorNudge(action, firstMessage, attempt, maxAttempts) {
  return {
    type: 'format-error',
    severity: attempt >= maxAttempts ? 'block' : 'warning',
    action,
    attempt,
    maxAttempts,
    message: firstMessage,
    priorErrorsOmitted: attempt - 1,
    instruction: 'Regenerate a well-formed step. Per the ACI retry policy only the first format-error message is kept in the retry prompt.',
  };
}

function detectRepeat(action, key, budget, history, emitNudge) {
  const window = history.slice(-budget.repeatWindow);
  const occurrences = window.filter((entry) => entry.key === key).length;
  if (occurrences >= budget.repeatThreshold) {
    emitNudge(repeatNudge(action, 'block', occurrences, budget.repeatThreshold));
    return true;
  }
  if (budget.repeatThreshold > 2 && occurrences === budget.repeatThreshold - 1) {
    emitNudge(repeatNudge(action, 'backoff', occurrences, budget.repeatThreshold));
    return false;
  }
  if (occurrences >= 2) {
    emitNudge(repeatNudge(action, 'warning', occurrences, budget.repeatThreshold));
  }
  return false;
}

function detectPingPong(budget, history, emitNudge) {
  const window = history.slice(-budget.pingPongWindow);
  if (window.length >= 4) {
    const tail = window.slice(-4);
    const [a, b, c, d] = tail.map((entry) => entry.stepHash);
    if (a === c && b === d && a !== b) {
      emitNudge(pingPongNudge('block', [tail[0].action, tail[1].action]));
      return true;
    }
  }
  if (window.length >= 3) {
    const tail = window.slice(-3);
    const [a, b, c] = tail.map((entry) => entry.stepHash);
    if (a === c && a !== b) {
      emitNudge(pingPongNudge('warning', [tail[0].action, tail[1].action]));
    }
  }
  return false;
}

export async function runLoop(options = {}) {
  const { steps, onNudge, exemptActions = [], loopId = null } = options;
  const iterator = toIterator(steps);
  const budget = normalizeBudget(options.budget);
  const ledgerPath = options.ledgerPath === undefined ? DEFAULT_LEDGER_PATH : options.ledgerPath;
  const exempt = new Set(Array.isArray(exemptActions) ? exemptActions : [exemptActions]);

  const nudges = [];
  const emitNudge = (nudge) => {
    nudges.push(nudge);
    if (typeof onNudge === 'function') {
      try {
        onNudge(nudge);
      } catch {}
    }
  };

  const appendLedger = (line) => {
    if (!ledgerPath) return;
    try {
      appendFileSync(ledgerPath, `${JSON.stringify(line)}\n`);
    } catch {}
  };

  const startedAt = Date.now();
  let stepsSpent = 0;
  let costSpent = 0;
  let consecutiveFormatErrors = 0;
  let firstFormatError = null;
  let lastVerdict = null;
  let submission = null;
  let exitStatus = 'interrupted';
  let seq = 0;
  const history = [];

  if (ledgerPath) {
    try {
      mkdirSync(dirname(resolve(ledgerPath)), { recursive: true });
    } catch {}
  }

  const finish = (status) => {
    exitStatus = status;
    return {
      exitStatus,
      submission,
      budgetSpent: { steps: stepsSpent, cost: costSpent, wallTimeMs: Date.now() - startedAt },
      nudges,
    };
  };

  try {
    for (;;) {
      if (
        stepsSpent >= budget.stepLimit ||
        costSpent >= budget.costLimit ||
        Date.now() - startedAt >= budget.wallTimeLimitMs
      ) {
        return finish('limits-exceeded');
      }

      const stepStartedAt = Date.now();
      let verdict = null;
      let stepError = null;
      let done = false;
      let iteratorReturn = null;

      try {
        const next = await iterator.next();
        if (next.done) {
          done = true;
          iteratorReturn = next.value ?? null;
        } else {
          verdict = next.value ?? null;
        }
      } catch (error) {
        stepError = error instanceof Error ? error : new Error(String(error));
      }

      if (done) {
        submission = iteratorReturn ?? lastVerdict ?? null;
        return finish('completed');
      }

      const stepCost = verdict && Number.isFinite(verdict.cost) ? verdict.cost : DEFAULT_COST_PER_STEP;
      stepsSpent += 1;
      costSpent += stepCost;
      const stepWallTimeMs = Date.now() - stepStartedAt;

      const errored = stepError !== null || (verdict !== null && verdict.error !== undefined && verdict.error !== null);
      const action = verdict && typeof verdict.action === 'string' && verdict.action !== ''
        ? verdict.action
        : '__step__';
      const argsHash = hashArgs(verdict ? verdict.args : undefined);
      const resultSignature = errored
        ? signatureOf({ error: stepError ? errorText(stepError) : String(verdict.error) })
        : signatureOf(verdict ? verdict.result : undefined);
      const stepHash = stepHashOf(action, argsHash, resultSignature);

      const record = {
        type: errored ? 'step-error' : 'step',
        seq: seq++,
        ts: new Date(stepStartedAt).toISOString(),
        loopId,
        action,
        args: verdict && verdict.args !== undefined ? verdict.args : null,
        argsHash,
        resultSignature,
        stepHash,
        status: errored ? 'error' : 'ok',
        cost: stepCost,
        wallTimeMs: stepWallTimeMs,
      };
      if (errored) {
        record.error = stepError ? errorText(stepError) : String(verdict.error);
      }

      try {
        if (errored) {
          if (firstFormatError === null) firstFormatError = record.error;
          consecutiveFormatErrors += 1;
          emitNudge(formatErrorNudge(action, firstFormatError, consecutiveFormatErrors, budget.maxConsecutiveFormatErrors));
          if (consecutiveFormatErrors >= budget.maxConsecutiveFormatErrors) {
            return finish('format-errors');
          }
        } else {
          consecutiveFormatErrors = 0;
          firstFormatError = null;
          lastVerdict = verdict;
          if (!exempt.has(action)) {
            const key = `${action}\u0000${argsHash}\u0000${resultSignature}`;
            history.push({ key, stepHash, action });
            if (detectRepeat(action, key, budget, history, emitNudge)) {
              return finish('repeated-action');
            }
            if (detectPingPong(budget, history, emitNudge)) {
              return finish('ping-pong');
            }
          }
        }
      } finally {
        appendLedger(record);
      }
    }
  } finally {
    appendLedger({
      type: 'summary',
      ts: new Date().toISOString(),
      loopId,
      exitStatus,
      steps: stepsSpent,
      cost: costSpent,
      wallTimeMs: Date.now() - startedAt,
      nudgeCount: nudges.length,
    });
  }
}

function demoScenarios() {
  return [
    {
      id: 'budget-exhausted',
      title: 'budget-exhausted loop (stepLimit reached)',
      budget: { stepLimit: 3 },
      steps() {
        return (async function* () {
          for (let i = 0; ; i += 1) {
            yield { action: `step-${i}`, args: { i }, result: { progress: i } };
          }
        })();
      },
    },
    {
      id: 'repeating-error',
      title: 'repeating-error loop (same action, same failing result)',
      budget: { stepLimit: 50 },
      steps() {
        return (async function* () {
          for (;;) {
            yield {
              action: 'apply-fix',
              args: { file: 'src/parser.js', hunk: 3 },
              result: { ok: false, error: 'TS2322: type mismatch remains' },
            };
          }
        })();
      },
    },
    {
      id: 'format-errors',
      title: 'malformed-generation loop (every step throws)',
      budget: { stepLimit: 50, maxConsecutiveFormatErrors: 3 },
      steps() {
        return {
          next() {
            return Promise.reject(new Error('model emitted malformed generation (missing action)'));
          },
        };
      },
    },
    {
      id: 'ping-pong',
      title: 'ping-pong loop (edit-a, edit-b, edit-a, edit-b, ...)',
      budget: { stepLimit: 50 },
      steps() {
        return (async function* () {
          for (;;) {
            yield { action: 'edit-a', args: { file: 'a.js' }, result: { ok: false, error: 'lint failed' } };
            yield { action: 'edit-b', args: { file: 'b.js' }, result: { ok: false, error: 'type check failed' } };
          }
        })();
      },
    },
    {
      id: 'healthy',
      title: 'healthy loop (distinct steps, fresh results)',
      budget: { stepLimit: 10 },
      steps() {
        return (async function* () {
          yield { action: 'read-file', args: { file: 'src/parser.js' }, result: { lines: 120 } };
          yield { action: 'edit-file', args: { file: 'src/parser.js', hunk: 3 }, result: { ok: true } };
          yield { action: 'run-tests', args: { suite: 'unit' }, result: { passed: 41, failed: 1 } };
          yield { action: 'edit-file', args: { file: 'src/parser.js', hunk: 7 }, result: { ok: true } };
          yield { action: 'run-tests', args: { suite: 'unit' }, result: { passed: 42, failed: 0 } };
          return { answer: 'parser guard fixed; 42/42 unit tests pass' };
        })();
      },
    },
  ];
}

async function runDemo({ json }) {
  const ledgerRoot = mkdtempSync(join(os.tmpdir(), 'loop-runner-demo-'));
  const results = [];
  try {
    for (const scenario of demoScenarios()) {
      const ledgerPath = join(ledgerRoot, `${scenario.id}.jsonl`);
      const result = await runLoop({
        steps: scenario.steps(),
        budget: scenario.budget,
        ledgerPath,
      });
      const ledgerLines = readFileSync(ledgerPath, 'utf8').trim().split('\n').length;
      results.push({
        demo: scenario.id,
        title: scenario.title,
        exitStatus: result.exitStatus,
        submission: result.submission,
        budgetSpent: result.budgetSpent,
        nudges: result.nudges,
        ledgerLines,
      });
    }
  } finally {
    rmSync(ledgerRoot, { recursive: true, force: true });
  }

  if (json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  console.log('loop-runner demo - every loop ends with a typed exit, never an exception');
  console.log('='.repeat(72));
  console.log('');
  for (const [index, entry] of results.entries()) {
    console.log(`${index + 1}. ${entry.title}`);
    console.log(`   exitStatus : ${entry.exitStatus}`);
    console.log(`   budgetSpent: steps=${entry.budgetSpent.steps} cost=${entry.budgetSpent.cost} wallTimeMs=${entry.budgetSpent.wallTimeMs}`);
    console.log(`   submission : ${JSON.stringify(entry.submission)}`);
    console.log(`   nudges     : ${entry.nudges.length}`);
    for (const nudge of entry.nudges) {
      console.log(`     - [${nudge.severity}] ${nudge.type}: ${nudge.message}`);
    }
    console.log(`   ledger     : ${entry.ledgerLines} JSON lines (temp, removed after demo)`);
    console.log('');
  }
  const observed = [...new Set(results.map((entry) => entry.exitStatus))];
  console.log(`typed exits observed: ${observed.join(', ')}`);
}

function main(argv) {
  const args = argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log(HELP);
    return 0;
  }
  if (!args.includes('--demo')) {
    if (args.length > 0) {
      console.error(`Unknown argument(s): ${args.join(' ')}\n`);
      console.error(HELP);
      return 1;
    }
    console.log(HELP);
    return 0;
  }
  return runDemo({ json: args.includes('--json') }).then(() => 0);
}

const invokedDirectly = process.argv[1] !== undefined
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  Promise.resolve(main(process.argv)).then(
    (code) => process.exit(code),
    (error) => {
      console.error(error);
      process.exit(1);
    },
  );
}
