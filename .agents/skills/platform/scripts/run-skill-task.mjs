#!/usr/bin/env node
// run-skill-task.mjs - miniature SWE-bench harness for the quirk Skills bundle.
//
// A "task" is a JSON fixture that declares a reproducible defect scenario: a
// workspace seed, the setup that injects the defect, the actions that repair it,
// and verification by FINAL STATE (never by transcript). The runner materialises
// the workspace, replays the declared steps, then inspects what the workspace
// looks like afterwards. The run is appended to the platform trace log so task
// outcomes are auditable through the same ledger as skill runs.
//
// Sandbox modes (--sandbox):
//   copy      tmpdir seeded with the workspace the task declares (default)
//   worktree  `git worktree add` of HEAD in a tmpdir, removed on cleanup; falls
//             back to `copy` with a recorded warning when git fails
//   tmpdir    empty tmpdir, so the task has to seed itself through its setup
//
// Workspace declarations (task.workspace):
//   kind "fixture-copy"  source <repository-relative path> is copied in as the seed
//   kind "repo-minimal"  paths[] is copied in, or the documented default set:
//                        .agents/skills/<domain>/<skill>, skills-lock.json,
//                        schema/, policy/
//   kind "empty"         nothing is seeded
// Sources for every copy step resolve against the repository root first, then
// the platform fixtures directory, then the workspace itself, so a declared
// path keeps the same meaning in every sandbox mode. Repository paths are never
// pulled into a workspace wholesale: .claude/, .git/, node_modules/, site/ and
// dist/ are refused as copy sources.
//
// Ops (setup[] and actions[], executed in array order):
//   copy    {from, to}       copy a tree or file (symlinks stay symlinks)
//   write   {path, content}  create or overwrite a file (object content is
//                            serialised as pretty JSON)
//   remove  {path}           delete a file or tree
//   run     {command[], expectExit?, timeoutMs?}
//   assert  {stateChecks[]}  inline state checks at this point in the run
//
// Command allowlist (COMMAND_ALLOWLIST): node, npm, git, bash. Nothing else is
// executed: a rejected command marks the task `blocked` and stops the run. For
// node and bash the target script must resolve inside the workspace, and inline
// evaluation flags are refused. Every command a task runs must be declared in
// its own actions; the runner never invents a step.
//
// Step indices: every step record carries its own index within its phase. A
// state check of kind exit-was-zero / exit-was-nonzero takes `step` as the
// index of a step inside the task's actions[] array, so verification of the
// steps a task performs never depends on how much setup scaffolding precedes
// them. Setup steps are verified with inline assert ops instead.
//
// Step failure policy: a blocked or erroring step stops the run immediately
// (status blocked / error). A setup step that fails its declared exit code also
// stops the run, because the defect the task declares could not be injected.
// An action step that fails its exit code is recorded and the run continues,
// because the verdict belongs to the final state check, not the transcript.
//
// Verification kinds (verification.stateChecks[]):
//   file-exists, file-missing, file-contains, file-not-contains,
//   json-field-equals, file-min-lines, exit-was-zero, exit-was-nonzero,
//   regex-matches
// verification.forbiddenPaths[] are hashed once the workspace is fully prepared
// (seeded, and with the declared defect injected) and compared at the end; a
// path whose hash changed, appeared, or disappeared is a violation, so a repair
// cannot hide inside an undeclared edit.
//
// Statuses and exit codes:
//   pass     0   every state check passed and no forbidden path moved
//   fail     1   a state check failed, a forbidden path moved, or the scenario
//                could not be injected
//   blocked  3   a command fell outside the allowlist
//   error    1   the task could not be prepared or executed
//   usage or schema problem   2   reported before the run starts
//
// Usage: node run-skill-task.mjs <task-id|task.json> [--list] [--json] [--verbose]
//                                  [--sandbox copy|worktree|tmpdir] [--keep]

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter, collectSkills } from '../skill-graph.mjs';
import { recordExecution } from '../record-execution.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLATFORM_ROOT = path.resolve(HERE, '..');
const TASKS_DIR = path.join(PLATFORM_ROOT, 'tasks');
const FIXTURES_DIR = path.join(PLATFORM_ROOT, 'fixtures');

// Executables a task may declare. Anything else is refused before spawning.
export const COMMAND_ALLOWLIST = Object.freeze(['node', 'npm', 'git', 'bash']);
// Operations a task may declare in setup[] and actions[].
export const SUPPORTED_OPS = Object.freeze(['copy', 'write', 'remove', 'run', 'assert']);
// Final-state check kinds understood by verifyState.
export const STATE_CHECK_KINDS = Object.freeze([
  'file-exists', 'file-missing', 'file-contains', 'file-not-contains',
  'json-field-equals', 'file-min-lines', 'exit-was-zero', 'exit-was-nonzero',
  'regex-matches',
]);
export const SANDBOX_MODES = Object.freeze(['copy', 'worktree', 'tmpdir']);
export const WORKSPACE_KINDS = Object.freeze(['fixture-copy', 'repo-minimal', 'empty']);
export const DIFFICULTIES = Object.freeze(['easy', 'medium', 'hard']);

// Repository paths refused as copy sources: the generated compatibility view,
// git metadata, dependency trees, built output.
const NEVER_COPY_TOP_LEVEL = new Set(['.git', '.claude', 'node_modules', 'site', 'dist', '.opencode']);
// Pruned from the inside of any copied tree. Git metadata and dependency trees
// are never legitimate task content, while a task fixture may legitimately
// carry its own small view directory.
const WALK_PRUNE = new Set(['.git', 'node_modules']);
// node/bash flags that exist to evaluate or load code outside the workspace.
const NODE_DENIED_FLAGS = new Set(['-e', '--eval', '-p', '--print', '-r', '--require', '--import', '-i', '--interactive']);
const BASH_DENIED_FLAGS = new Set(['-c', '--command', '-i', '--interactive', '-s', '--rcfile']);
const BARE_FLAGS = new Set(['--version', '-v', '--help', '-h']);
const DEFAULT_STEP_TIMEOUT_MS = 120000;
const MAX_OUTPUT_CHARS = 16384;
const TAIL_CHARS = 900;
const VERBOSE_TAIL_CHARS = 8000;

const MISSING = '__MISSING__';
const UNPARSABLE = '__UNPARSABLE__';
const TRACE_RESULTS = { pass: 'completed', fail: 'failed', blocked: 'blocked', error: 'escalated' };

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isInside(root, candidate) {
  const rel = path.relative(root, candidate);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

// A workspace-relative path: no absolute form and no parent escape.
function isWorkspaceRelative(value) {
  if (typeof value !== 'string' || value.trim() === '') return false;
  if (path.isAbsolute(value)) return false;
  return !value.split(/[\\/]+/).includes('..');
}

function sha256File(filePath) {
  try {
    const stat = fs.lstatSync(filePath);
    if (!stat.isFile()) return null;
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  } catch {
    return null;
  }
}

function tail(text, limit) {
  const value = typeof text === 'string' ? text : '';
  return value.length <= limit ? value : `...${value.slice(value.length - limit)}`;
}

function jsonEquals(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function readJsonField(data, field) {
  let current = data;
  for (const part of String(field).split('.')) {
    if (current === null || current === undefined) return { found: false, value: undefined };
    if (Array.isArray(current)) {
      const index = Number(part);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) return { found: false, value: undefined };
      current = current[index];
      continue;
    }
    if (typeof current !== 'object') return { found: false, value: undefined };
    if (!Object.prototype.hasOwnProperty.call(current, part)) return { found: false, value: undefined };
    current = current[part];
  }
  return { found: true, value: current };
}

// ------------------------------------------------------------------- copying

function assertCopyAllowed(source, repoRoot) {
  if (source === repoRoot) {
    throw new Error('a copy source must be a path inside the repository, not the repository root');
  }
  const rel = path.relative(repoRoot, source);
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) return;
  const top = rel.split(path.sep)[0];
  if (NEVER_COPY_TOP_LEVEL.has(top)) {
    throw new Error(`refusing to copy repository path "${top}/" into a task workspace`);
  }
}

function copyTree(source, dest) {
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink()) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.rmSync(dest, { force: true });
    fs.symlinkSync(fs.readlinkSync(source), dest);
    return;
  }
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(source).sort((a, b) => a.localeCompare(b))) {
      if (WALK_PRUNE.has(entry)) continue;
      copyTree(path.join(source, entry), path.join(dest, entry));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(source, dest);
}

// A copy source resolves against the repository root first, then the platform
// fixtures directory, then the workspace, so a declared path keeps the same
// meaning in every sandbox mode.
export function resolveSource(from, { repoRoot = process.cwd(), workspace = null } = {}) {
  if (typeof from !== 'string' || from.trim() === '') return null;
  const candidates = [
    path.resolve(repoRoot, from),
    path.resolve(FIXTURES_DIR, from),
    workspace ? path.resolve(workspace, from) : null,
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

// ------------------------------------------------------------------ commands

export function resolveCommand(command, workspace) {
  if (!Array.isArray(command) || command.length === 0) {
    return { ok: false, reason: 'a run op needs a non-empty command array' };
  }
  if (!command.every((part) => typeof part === 'string')) {
    return { ok: false, reason: 'every command entry must be a string' };
  }
  const [name, ...args] = command;
  if (!COMMAND_ALLOWLIST.includes(name)) {
    return { ok: false, reason: `command "${name}" is outside the allowlist [${COMMAND_ALLOWLIST.join(', ')}]` };
  }

  if (name === 'node' || name === 'bash') {
    const denied = args.find((arg) => (name === 'node' ? NODE_DENIED_FLAGS : BASH_DENIED_FLAGS).has(arg));
    if (denied) {
      return { ok: false, reason: `${name} flag "${denied}" evaluates or loads code and is refused` };
    }
    const firstPositional = args.findIndex((arg) => !arg.startsWith('-'));
    if (firstPositional === -1) {
      const unknown = args.find((arg) => !BARE_FLAGS.has(arg));
      if (unknown) return { ok: false, reason: `${name} flag "${unknown}" is not an allowlisted builtin` };
      return { ok: true, bin: name === 'node' ? process.execPath : name, args };
    }
    const resolved = path.resolve(workspace, args[firstPositional]);
    if (!isInside(workspace, resolved)) {
      return { ok: false, reason: `"${args[firstPositional]}" must resolve inside the workspace` };
    }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      return { ok: false, reason: `"${args[firstPositional]}" is not a file inside the workspace` };
    }
  }

  return { ok: true, bin: name === 'node' ? process.execPath : name, args };
}

function executeCommand(command, { cwd, timeoutMs }) {
  const resolved = resolveCommand(command, cwd);
  if (!resolved.ok) return { blocked: resolved.reason };
  return new Promise((resolve) => {
    const child = spawn(resolved.bin, resolved.args, {
      cwd,
      env: { ...process.env, QUIRK_TASK_WORKSPACE: cwd },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const captured = { stdout: '', stderr: '' };
    let timedOut = false;
    const limit = Math.max(1, Number(timeoutMs) || DEFAULT_STEP_TIMEOUT_MS);
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, limit);
    const collect = (stream) => (chunk) => {
      const text = chunk.toString('utf8');
      if (captured[stream].length < MAX_OUTPUT_CHARS) {
        captured[stream] += text.slice(0, MAX_OUTPUT_CHARS - captured[stream].length);
      }
    };
    child.stdout.on('data', collect('stdout'));
    child.stderr.on('data', collect('stderr'));
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({
        code: null, signal: null, timedOut,
        stdout: captured.stdout, stderr: captured.stderr, spawnError: error.message,
      });
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({
        code, signal, timedOut,
        stdout: captured.stdout, stderr: captured.stderr, spawnError: null,
      });
    });
  });
}

// --------------------------------------------------------------------- tasks

export function loadTask(ref, { tasksDir = TASKS_DIR } = {}) {
  if (typeof ref !== 'string' || ref.trim() === '') {
    throw new Error('a task id (or a path to a task .json file) is required');
  }
  const trimmed = ref.trim();
  const candidates = trimmed.endsWith('.json')
    ? [path.resolve(process.cwd(), trimmed), path.resolve(tasksDir, trimmed)]
    : [path.resolve(tasksDir, `${trimmed}.json`)];
  const file = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  if (!file) {
    throw new Error(`task not found: ${trimmed} (looked in ${candidates.join(', ')})`);
  }
  let task;
  try {
    task = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`task file is not valid JSON: ${file} (${error.message})`);
  }
  if (!isPlainObject(task)) {
    throw new Error(`task file must contain a JSON object: ${file}`);
  }
  return { task, file };
}

export function listTasks(tasksDir = TASKS_DIR) {
  let names = [];
  try {
    names = fs.readdirSync(tasksDir);
  } catch {
    return [];
  }
  return names
    .filter((name) => name.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const file = path.join(tasksDir, name);
      let task = null;
      let parseError = null;
      try {
        task = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch (error) {
        parseError = error.message;
      }
      return {
        id: task?.id ?? null,
        title: task?.title ?? null,
        skill: task?.skill ?? null,
        difficulty: task?.difficulty ?? null,
        file: path.relative(process.cwd(), file) || file,
        parseError,
      };
    });
}

function validateStateChecks(checks, label, errors) {
  checks.forEach((check, index) => {
    const at = `${label}[${index}]`;
    if (!isPlainObject(check)) {
      errors.push(`${at} must be an object`);
      return;
    }
    if (!STATE_CHECK_KINDS.includes(check.kind)) {
      errors.push(`${at} uses unsupported kind "${check.kind}"`);
      return;
    }
    const positional = check.kind === 'exit-was-zero' || check.kind === 'exit-was-nonzero';
    if (positional) {
      if (!Number.isInteger(check.step)) errors.push(`${at} needs an integer "step" index`);
    } else if (!isWorkspaceRelative(check.path)) {
      errors.push(`${at} needs a workspace-relative "path"`);
    }
    const textKinds = ['file-contains', 'file-not-contains', 'regex-matches'];
    if (textKinds.includes(check.kind) && typeof check.value !== 'string') {
      errors.push(`${at} needs a string "value"`);
    }
    if (check.kind === 'json-field-equals' && typeof check.field !== 'string') {
      errors.push(`${at} needs a dotted "field" string`);
    }
    if (check.kind === 'file-min-lines' && !Number.isInteger(check.value)) {
      errors.push(`${at} needs an integer "value"`);
    }
    if (check.kind === 'regex-matches') {
      try {
        new RegExp(check.value);
      } catch (regexError) {
        errors.push(`${at} value is not a valid regex: ${regexError.message}`);
      }
    }
  });
}

function validateOps(ops, label, errors) {
  if (!Array.isArray(ops)) {
    errors.push(`${label} must be an array`);
    return;
  }
  ops.forEach((op, index) => {
    const at = `${label}[${index}]`;
    if (!isPlainObject(op)) {
      errors.push(`${at} must be an object`);
      return;
    }
    if (!SUPPORTED_OPS.includes(op.op)) {
      errors.push(`${at} uses unsupported op "${op.op}"`);
      return;
    }
    if (op.op === 'copy') {
      if (typeof op.from !== 'string' || !op.from) errors.push(`${at} needs a "from" path`);
      if (typeof op.to !== 'string' || !op.to) errors.push(`${at} needs a "to" path`);
      if (typeof op.to === 'string' && !isWorkspaceRelative(op.to)) {
        errors.push(`${at} destination "${op.to}" must be workspace-relative`);
      }
      return;
    }
    if (op.op === 'write') {
      if (!isWorkspaceRelative(op.path)) errors.push(`${at} needs a workspace-relative "path"`);
      if (op.content === undefined) errors.push(`${at} needs "content"`);
      if (op.content !== undefined && typeof op.content !== 'string' && !isPlainObject(op.content) && !Array.isArray(op.content)) {
        errors.push(`${at} content must be a string, object, or array`);
      }
      return;
    }
    if (op.op === 'remove') {
      if (!isWorkspaceRelative(op.path)) errors.push(`${at} needs a workspace-relative "path"`);
      return;
    }
    if (op.op === 'run') {
      if (!Array.isArray(op.command) || op.command.length === 0) errors.push(`${at} needs a "command" array`);
      if (op.expectExit !== undefined && !Number.isInteger(op.expectExit)) {
        errors.push(`${at} expectExit must be an integer`);
      }
      if (op.timeoutMs !== undefined && !(Number.isFinite(op.timeoutMs) && op.timeoutMs > 0)) {
        errors.push(`${at} timeoutMs must be a positive number`);
      }
      return;
    }
    if (op.op === 'assert') {
      if (!Array.isArray(op.stateChecks) || op.stateChecks.length === 0) {
        errors.push(`${at} needs a non-empty "stateChecks" array`);
        return;
      }
      validateStateChecks(op.stateChecks, `${at}.stateChecks`, errors);
    }
  });
}

export function validateTask(task, { skills = null, siblingIds = [] } = {}) {
  if (!isPlainObject(task)) return ['task must be a JSON object'];
  const errors = [];

  if (typeof task.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(task.id)) {
    errors.push('id must be a non-empty kebab-case string');
  }
  if (siblingIds.includes(task.id)) errors.push(`id "${task.id}" is already used by another task`);
  if (typeof task.title !== 'string' || task.title.trim() === '') errors.push('title must be a non-empty string');
  if (typeof task.skill !== 'string' || !/^[a-z0-9-]+\/[a-z0-9-]+$/.test(task.skill)) {
    errors.push('skill must be declared as "<domain>/<name>"');
  } else if (Array.isArray(skills)) {
    const [domain, name] = task.skill.split('/');
    if (!skills.some((skill) => skill?.name === name && skill?.domain === domain)) {
      errors.push(`skill "${task.skill}" is not a canonical bundle skill`);
    }
  }
  if (task.difficulty !== undefined && !DIFFICULTIES.includes(task.difficulty)) {
    errors.push(`difficulty must be one of ${DIFFICULTIES.join(', ')}`);
  }
  if (typeof task.prompt !== 'string' || task.prompt.trim() === '') {
    errors.push('prompt must be a non-empty string (the statement a solver receives)');
  }

  if (!isPlainObject(task.workspace)) {
    errors.push('workspace must be an object declaring a "kind"');
  } else if (!WORKSPACE_KINDS.includes(task.workspace.kind)) {
    errors.push(`workspace.kind must be one of ${WORKSPACE_KINDS.join(', ')}`);
  } else {
    if (task.workspace.kind === 'fixture-copy' && (typeof task.workspace.source !== 'string' || !task.workspace.source)) {
      errors.push('workspace.kind "fixture-copy" needs a "source" path');
    }
    if (task.workspace.kind === 'repo-minimal' && task.workspace.paths !== undefined) {
      if (!Array.isArray(task.workspace.paths) || !task.workspace.paths.every((entry) => typeof entry === 'string' && entry)) {
        errors.push('workspace.paths must be an array of repository-relative strings');
      }
    }
  }

  validateOps(task.setup ?? [], 'setup', errors);
  validateOps(task.actions ?? [], 'actions', errors);

  if (!isPlainObject(task.verification)) {
    errors.push('verification must be an object');
  } else {
    if (!Array.isArray(task.verification.stateChecks) || task.verification.stateChecks.length === 0) {
      errors.push('verification.stateChecks must be a non-empty array');
    } else {
      validateStateChecks(task.verification.stateChecks, 'verification.stateChecks', errors);
    }
    const forbidden = task.verification.forbiddenPaths ?? [];
    if (!Array.isArray(forbidden) || !forbidden.every((entry) => isWorkspaceRelative(entry))) {
      errors.push('verification.forbiddenPaths must be an array of workspace-relative paths');
    }
  }

  return errors;
}

// --------------------------------------------------------------------- steps

function recordStep(phase, index, op, outcome, tailChars) {
  return {
    index,
    phase,
    op: op.op,
    command: op.op === 'run' ? op.command : null,
    exitCode: outcome.exitCode ?? null,
    signal: outcome.signal ?? null,
    timedOut: Boolean(outcome.timedOut),
    durationMs: outcome.durationMs ?? 0,
    stdoutTail: tail(outcome.stdout ?? '', tailChars),
    stderrTail: tail(outcome.stderr ?? '', tailChars),
    status: outcome.status,
    detail: outcome.detail ?? null,
    message: outcome.message ?? null,
  };
}

async function applyOp(op, context) {
  const workspace = context.workspace;
  const startedAt = Date.now();

  if (op.op === 'copy') {
    const source = resolveSource(op.from, context);
    if (!source) {
      return { status: 'error', detail: op.from, message: `copy source not found: ${op.from}` };
    }
    assertCopyAllowed(source, context.repoRoot);
    const dest = path.resolve(workspace, op.to);
    if (!isInside(workspace, dest)) {
      return { status: 'error', detail: op.from, message: `copy destination "${op.to}" escapes the workspace` };
    }
    if (fs.lstatSync(source).isDirectory()) copyTree(source, dest);
    else {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(source, dest);
    }
    return { status: 'ok', detail: `${op.from} -> ${op.to}`, durationMs: Date.now() - startedAt };
  }

  if (op.op === 'write') {
    const dest = path.resolve(workspace, op.path);
    if (!isInside(workspace, dest)) {
      return { status: 'error', detail: op.path, message: `write path "${op.path}" escapes the workspace` };
    }
    const content = typeof op.content === 'string' ? op.content : `${JSON.stringify(op.content, null, 2)}\n`;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content);
    return { status: 'ok', detail: op.path, durationMs: Date.now() - startedAt };
  }

  if (op.op === 'remove') {
    const dest = path.resolve(workspace, op.path);
    if (!isInside(workspace, dest)) {
      return { status: 'error', detail: op.path, message: `remove path "${op.path}" escapes the workspace` };
    }
    fs.rmSync(dest, { recursive: true, force: true });
    return { status: 'ok', detail: op.path, durationMs: Date.now() - startedAt };
  }

  if (op.op === 'run') {
    const result = await executeCommand(op.command, { cwd: workspace, timeoutMs: op.timeoutMs ?? context.timeoutMs });
    if (result.blocked) {
      return {
        status: 'blocked',
        detail: (op.command ?? []).join(' '),
        message: result.blocked,
        durationMs: Date.now() - startedAt,
      };
    }
    if (result.spawnError) {
      return {
        status: 'error',
        detail: (op.command ?? []).join(' '),
        message: result.spawnError,
        stdout: result.stdout,
        stderr: result.stderr,
        durationMs: Date.now() - startedAt,
      };
    }
    const expected = op.expectExit === undefined ? 0 : op.expectExit;
    const matches = result.code === expected;
    return {
      status: matches ? 'ok' : 'failed',
      detail: (op.command ?? []).join(' '),
      message: matches
        ? null
        : `expected exit ${expected}, got ${result.code === null ? `signal ${result.signal}` : result.code}`,
      exitCode: result.code,
      signal: result.signal,
      timedOut: result.timedOut,
      stdout: result.stdout,
      stderr: result.stderr,
      durationMs: Date.now() - startedAt,
    };
  }

  if (op.op === 'assert') {
    const results = verifyState(op.stateChecks, context);
    const failures = results.filter((entry) => !entry.ok);
    return {
      status: failures.length ? 'failed' : 'ok',
      detail: `${results.length - failures.length}/${results.length} inline state checks passed`,
      message: failures.length
        ? failures.map((entry) => `${entry.kind} ${entry.path ?? `step ${entry.step}`}`).join('; ')
        : null,
      stateChecks: results,
      durationMs: Date.now() - startedAt,
    };
  }

  return { status: 'error', detail: null, message: `unsupported op "${op.op}"`, durationMs: Date.now() - startedAt };
}

// Aborts immediately on blocked/error at any phase. A step that fails its
// declared exit code also aborts during setup, because the defect the task
// declares could not be injected; during actions it is recorded and the run
// continues, since the verdict belongs to the final state check.
async function runOps(ops, phase, context) {
  const steps = [];
  for (const [index, op] of ops.entries()) {
    const outcome = await applyOp(op, context);
    const step = recordStep(phase, index, op, outcome, context.verbose ? VERBOSE_TAIL_CHARS : TAIL_CHARS);
    steps.push(step);
    if (phase === 'action') context.actionSteps.push(step);
    if (outcome.status === 'blocked' || outcome.status === 'error') {
      return { steps, abort: { status: outcome.status, message: outcome.message ?? '' } };
    }
    if (outcome.status === 'failed' && phase === 'setup') {
      return { steps, abort: { status: 'fail', message: outcome.message ?? 'a setup step failed' } };
    }
  }
  return { steps, abort: null };
}

export async function runSetup(task, context) {
  const { steps, abort } = await runOps(task.setup ?? [], 'setup', context);
  return { steps, abort };
}

export async function runAction(task, context) {
  const { steps, abort } = await runOps(task.actions ?? [], 'action', context);
  return { steps, abort };
}

// -------------------------------------------------------------- verification

export function verifyState(stateChecks, context) {
  const workspace = context.workspace;
  const steps = context.actionSteps ?? [];
  return stateChecks.map((check) => {
    const entry = {
      kind: check.kind,
      path: check.path ?? null,
      step: check.step ?? null,
      expected: null,
      actual: null,
      ok: false,
    };

    if (check.kind === 'exit-was-zero' || check.kind === 'exit-was-nonzero') {
      const step = steps[check.step];
      entry.expected = check.kind === 'exit-was-zero' ? 'exit 0' : 'a non-zero exit';
      if (step === undefined) entry.actual = 'no step at that index';
      else if (step.exitCode === null) entry.actual = 'no exit code recorded';
      else entry.actual = step.exitCode;
      entry.ok = check.kind === 'exit-was-zero'
        ? step !== undefined && step.exitCode === 0
        : step !== undefined && step.exitCode !== null && step.exitCode !== 0;
      return entry;
    }

    const abs = path.resolve(workspace, check.path);
    let text = null;
    try {
      text = fs.readFileSync(abs, 'utf8');
    } catch {
      text = null;
    }
    const exists = fs.existsSync(abs);

    if (check.kind === 'file-exists') {
      entry.expected = 'present';
      entry.actual = exists ? 'present' : 'absent';
      entry.ok = exists;
      return entry;
    }
    if (check.kind === 'file-missing') {
      entry.expected = 'absent';
      entry.actual = exists ? 'present' : 'absent';
      entry.ok = !exists;
      return entry;
    }
    if (check.kind === 'file-contains' || check.kind === 'file-not-contains') {
      entry.expected = check.value;
      const contains = text !== null && text.includes(check.value);
      entry.actual = text === null ? 'file unreadable' : contains;
      entry.ok = check.kind === 'file-contains' ? contains : !contains;
      return entry;
    }
    if (check.kind === 'regex-matches') {
      entry.expected = check.value;
      if (text === null) {
        entry.actual = 'file unreadable';
        return entry;
      }
      const matched = new RegExp(check.value).test(text);
      entry.actual = matched;
      entry.ok = matched;
      return entry;
    }
    if (check.kind === 'file-min-lines') {
      entry.expected = check.value;
      entry.actual = text === null ? 'file unreadable' : text.split(/\r?\n/).length;
      entry.ok = typeof entry.actual === 'number' && entry.actual >= check.value;
      return entry;
    }
    if (check.kind === 'json-field-equals') {
      entry.expected = check.value;
      if (text === null) {
        entry.actual = 'file unreadable';
        return entry;
      }
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        entry.actual = UNPARSABLE;
        return entry;
      }
      const found = readJsonField(data, check.field);
      entry.actual = found.found ? found.value : MISSING;
      entry.ok = found.found && jsonEquals(found.value, check.value);
      return entry;
    }

    entry.actual = `unsupported kind "${check.kind}"`;
    return entry;
  });
}

export function snapshotForbidden(workspace, forbiddenPaths = []) {
  const snapshot = {};
  for (const rel of forbiddenPaths) {
    snapshot[rel] = sha256File(path.resolve(workspace, rel));
  }
  return snapshot;
}

// The baseline is taken once the workspace is fully prepared: seeded, and with
// the defect injected. Everything after that point is the repair under test, so
// a repair that edits, creates, or deletes a forbidden path is a violation
// however it hid the change. Taking the baseline here rather than before setup
// keeps the rule identical in every sandbox mode, because a task in worktree
// mode legitimately rewrites the repository paths it borrows as its seed.
export function checkForbiddenPaths(workspace, forbiddenPaths = [], before = {}) {
  const entries = forbiddenPaths.map((rel) => {
    const after = sha256File(path.resolve(workspace, rel));
    const prior = before[rel] ?? null;
    return { path: rel, before: prior, after, ok: prior === after };
  });
  return { entries, violations: entries.filter((entry) => !entry.ok) };
}

// ------------------------------------------------------------------ workspace

function defaultMinimalPaths(task) {
  const paths = ['skills-lock.json', 'schema', 'policy'];
  if (typeof task.skill === 'string' && task.skill.includes('/')) {
    const [domain, name] = task.skill.split('/');
    paths.unshift(path.join('.agents', 'skills', domain, name));
  }
  return paths;
}

function seedWorkspace(workspace, task, repoRoot) {
  const declared = task.workspace ?? {};

  if (declared.kind === 'fixture-copy') {
    const source = resolveSource(declared.source, { repoRoot, workspace });
    if (!source) throw new Error(`workspace source not found: ${declared.source}`);
    assertCopyAllowed(source, repoRoot);
    if (fs.lstatSync(source).isDirectory()) {
      // A directory fixture seeds the workspace root with its own contents.
      copyTree(source, workspace);
    } else {
      // A file fixture keeps its repository-relative path inside the workspace.
      const rel = path.relative(repoRoot, source);
      const dest = path.resolve(workspace, rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel : path.basename(source));
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(source, dest);
    }
    return;
  }

  if (declared.kind === 'repo-minimal') {
    const relative = Array.isArray(declared.paths) && declared.paths.length ? declared.paths : defaultMinimalPaths(task);
    for (const rel of relative) {
      const source = resolveSource(rel, { repoRoot, workspace });
      if (!source) continue;
      const dest = path.resolve(workspace, rel);
      if (fs.lstatSync(source).isDirectory()) copyTree(source, dest);
      else {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(source, dest);
      }
    }
  }
}

async function createWorkspace(mode, { repoRoot, task }) {
  if (mode === 'worktree') {
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'quirk-task-worktree-'));
    const result = spawnSync('git', ['worktree', 'add', '--detach', dir, 'HEAD'], { cwd: repoRoot, encoding: 'utf8' });
    if (result.status !== 0) {
      await fs.promises.rm(dir, { recursive: true, force: true });
      const fallback = await createWorkspace('copy', { repoRoot, task });
      fallback.warning = `git worktree unavailable (${(result.stderr || '').trim() || 'unknown error'}); fell back to copy mode`;
      return fallback;
    }
    return { path: dir, mode };
  }
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'quirk-task-'));
  if (mode === 'tmpdir') return { path: dir, mode };
  seedWorkspace(dir, task, repoRoot);
  return { path: dir, mode };
}

async function cleanupWorkspace(workspace, { keep, status, repoRoot }) {
  if (!workspace) return 'kept';
  if (keep && status !== 'pass') return 'kept';
  if (workspace.mode === 'worktree') {
    spawnSync('git', ['worktree', 'remove', '--force', workspace.path], { cwd: repoRoot, encoding: 'utf8' });
    spawnSync('git', ['worktree', 'prune'], { cwd: repoRoot, encoding: 'utf8' });
  }
  await fs.promises.rm(workspace.path, { recursive: true, force: true });
  return 'removed';
}

// ---------------------------------------------------------------------- trace

function skillMetadata(task, repoRoot) {
  try {
    const [domain, name] = String(task.skill ?? '').split('/');
    const match = collectSkills(repoRoot).find((skill) => skill.name === name && skill.domain === domain);
    if (!match) return { skillVersion: '1', promptVersion: '2.0' };
    const fm = parseFrontmatter(fs.readFileSync(path.join(repoRoot, match.path, 'SKILL.md'), 'utf8'));
    return {
      skillVersion: fm.version === undefined || fm.version === '' ? '1' : String(fm.version),
      promptVersion: fm.promptVersion === undefined || fm.promptVersion === '' ? '2.0' : String(fm.promptVersion),
    };
  } catch {
    return { skillVersion: '1', promptVersion: '2.0' };
  }
}

async function recordTaskTrace(task, report, { repoRoot, startedAt }) {
  const calls = new Map();
  for (const step of report.steps) {
    if (step.op !== 'run') continue;
    const name = step.command?.[0] ?? step.op;
    calls.set(name, (calls.get(name) ?? 0) + 1);
  }
  const failedChecks = report.stateChecks.filter((entry) => !entry.ok).length;
  try {
    const tracePath = await recordExecution({
      repoRoot,
      skill: task.skill,
      skillVersion: report.skillVersion,
      promptVersion: report.promptVersion,
      input: { artifactType: 'task-prompt', sizeTokens: 0, contextRefs: [task.id] },
      output: { artifactType: 'task-report', sizeTokens: 0, schemaValid: false },
      execution: {
        startedAt: startedAt.toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: report.durationMs,
        iterations: Math.max(1, report.steps.length),
        retries: 0,
      },
      tools: [...calls.entries()].map(([name, count]) => ({ name, calls: count })),
      quality: {
        artifactPassedQualityBar: report.status === 'pass',
        artifactScore: null,
        evaluators: ['state-checks'],
        findingsCount: failedChecks + report.forbiddenViolations.length,
      },
      result: TRACE_RESULTS[report.status] ?? 'escalated',
      blockedBy: report.blocked ? [report.blocked.reason] : [],
      nextConsumer: 'skill-performance-metrics',
      extra: {
        taskId: task.id,
        taskFile: report.taskFile,
        sandbox: report.sandbox,
        status: report.status,
        stateChecks: report.stateChecks,
        forbiddenViolations: report.forbiddenViolations,
        cleanup: report.cleanup,
      },
    });
    return path.relative(repoRoot, tracePath) || tracePath;
  } catch {
    return null;
  }
}

async function finalizeReport(report, { startedMs, startedAt, task, repoRoot, cleanup, blocked }) {
  report.durationMs = Date.now() - startedMs;
  report.cleanup = cleanup;
  if (blocked) report.blocked = blocked;
  if (task?.skill) {
    report.tracePath = await recordTaskTrace(task, report, { repoRoot, startedAt });
  }
  return report;
}

// -------------------------------------------------------------------- the run

export async function runTask(task, options = {}) {
  const repoRoot = options.repoRoot ? path.resolve(options.repoRoot) : process.cwd();
  const startedAt = new Date();
  const startedMs = Date.now();
  const context = {
    repoRoot,
    workspace: null,
    steps: [],
    actionSteps: [],
    timeoutMs: options.timeoutMs ?? DEFAULT_STEP_TIMEOUT_MS,
    verbose: Boolean(options.verbose),
  };
  const report = {
    task: task.id,
    title: task.title ?? null,
    skill: task.skill ?? null,
    difficulty: task.difficulty ?? null,
    status: 'error',
    sandbox: options.sandbox ?? 'copy',
    steps: [],
    stateChecks: [],
    forbiddenViolations: [],
    durationMs: 0,
    workspace: null,
    cleanup: 'kept',
    tracePath: null,
    taskFile: options.taskFile ? path.relative(repoRoot, options.taskFile) || options.taskFile : null,
    errors: [],
  };

  const shapeErrors = validateTask(task, { skills: null });
  if (shapeErrors.length) {
    report.errors = shapeErrors;
    report.durationMs = Date.now() - startedMs;
    return report;
  }

  Object.assign(report, skillMetadata(task, repoRoot));

  let workspace = null;
  let blocked = null;
  let cleanup = 'kept';
  try {
    workspace = await createWorkspace(report.sandbox, { repoRoot, task });
    report.workspace = workspace.path;
    if (workspace.warning) report.warnings = [workspace.warning];
    context.workspace = workspace.path;

    const forbidden = task.verification?.forbiddenPaths ?? [];

    const setup = await runSetup(task, context);
    const before = snapshotForbidden(workspace.path, forbidden);
    report.steps.push(...setup.steps);
    context.steps = report.steps;
    if (setup.abort) {
      if (setup.abort.status === 'blocked') blocked = { reason: setup.abort.message };
      report.status = setup.abort.status;
    } else {
      const actions = await runAction(task, context);
      report.steps.push(...actions.steps);
      context.steps = report.steps;
      if (actions.abort) {
        if (actions.abort.status === 'blocked') blocked = { reason: actions.abort.message };
        report.status = actions.abort.status;
      } else {
        report.stateChecks = verifyState(task.verification.stateChecks, context);
        const forbiddenResult = checkForbiddenPaths(workspace.path, forbidden, before);
        report.forbiddenViolations = forbiddenResult.violations;
        report.status = report.stateChecks.every((entry) => entry.ok) && forbiddenResult.violations.length === 0
          ? 'pass'
          : 'fail';
      }
    }
  } catch (error) {
    report.status = 'error';
    report.errors.push(error?.message ?? String(error));
  } finally {
    cleanup = await cleanupWorkspace(workspace, { keep: Boolean(options.keep), status: report.status, repoRoot });
  }

  return finalizeReport(report, { startedMs, startedAt, task, repoRoot, cleanup, blocked });
}

// ------------------------------------------------------------------------ cli

function parseCli(argv) {
  const options = {
    task: null, list: false, json: false, verbose: false, keep: false, sandbox: 'copy', help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--list') options.list = true;
    else if (token === '--json') options.json = true;
    else if (token === '--verbose') options.verbose = true;
    else if (token === '--keep') options.keep = true;
    else if (token === '--help' || token === '-h') options.help = true;
    else if (token === '--sandbox') {
      const value = argv[index + 1];
      if (!value || !SANDBOX_MODES.includes(value)) {
        throw new Error(`--sandbox expects one of ${SANDBOX_MODES.join(', ')}`);
      }
      options.sandbox = value;
      index += 1;
    } else if (token.startsWith('--sandbox=')) {
      const value = token.slice('--sandbox='.length);
      if (!SANDBOX_MODES.includes(value)) {
        throw new Error(`--sandbox expects one of ${SANDBOX_MODES.join(', ')}`);
      }
      options.sandbox = value;
    } else if (token.startsWith('-')) {
      throw new Error(`unknown option: ${token}`);
    } else if (options.task === null) {
      options.task = token;
    } else {
      throw new Error('only one task reference is accepted');
    }
  }
  return options;
}

const USAGE = `run-skill-task - miniature SWE-bench harness for the quirk Skills bundle

usage: node run-skill-task.mjs <task-id|task.json> [options]
       node run-skill-task.mjs --list

options:
  --list                         list every task in .agents/skills/platform/tasks
  --json                         emit the machine-readable report (the report is JSON by default)
  --sandbox copy|worktree|tmpdir how the workspace is materialised (default copy)
  --keep                         keep the workspace when the task does not pass
  --verbose                      keep longer step output tails (8k instead of 900 chars)

exit codes: 0 pass, 1 fail or error, 2 usage or schema error, 3 blocked by the allowlist`;

async function main(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseCli(argv);
  } catch (error) {
    console.error(`run-skill-task: ${error.message}`);
    console.error(USAGE);
    return 2;
  }

  if (options.help) {
    console.log(USAGE);
    return 0;
  }

  if (options.list) {
    const tasks = listTasks();
    const broken = tasks.filter((entry) => entry.parseError || !entry.id);
    if (options.json) {
      console.log(JSON.stringify({ tasks }, null, 2));
    } else {
      console.log(`run-skill-task - ${tasks.length} task(s) in ${path.relative(process.cwd(), TASKS_DIR) || TASKS_DIR}`);
      for (const entry of tasks) {
        const label = entry.parseError
          ? `unreadable (${entry.parseError})`
          : `${entry.id} [${entry.difficulty ?? 'unrated'}] ${entry.skill ?? 'no skill declared'}`;
        console.log(`  ${entry.file}: ${label}`);
      }
    }
    return broken.length ? 1 : 0;
  }

  if (!options.task) {
    console.error('run-skill-task: a task id (or a path to a task .json file) is required');
    console.error(USAGE);
    return 2;
  }

  const repoRoot = process.cwd();
  let loaded;
  try {
    loaded = loadTask(options.task);
  } catch (error) {
    console.error(`run-skill-task: ${error.message}`);
    return 2;
  }

  const errors = validateTask(loaded.task, {
    skills: collectSkills(repoRoot),
    siblingIds: listTasks()
      .filter((entry) => entry.id !== null && entry.file !== path.relative(repoRoot, loaded.file))
      .map((entry) => entry.id),
  });
  if (errors.length) {
    console.error(`run-skill-task: task "${loaded.task?.id ?? options.task}" failed schema validation`);
    for (const error of errors) console.error(`  - ${error}`);
    return 2;
  }

  const report = await runTask(loaded.task, {
    sandbox: options.sandbox,
    keep: options.keep,
    verbose: options.verbose,
    repoRoot,
    taskFile: loaded.file,
  });

  console.log(JSON.stringify(report, null, 2));

  if (!options.json) {
    const passed = report.stateChecks.filter((entry) => entry.ok).length;
    const lines = [
      `run-skill-task: ${report.task} -> ${report.status}`,
      `  sandbox ${report.sandbox}, workspace ${report.workspace ?? 'none'} (${report.cleanup})`,
      `  steps ${report.steps.length}, state checks ${passed}/${report.stateChecks.length} passed`,
    ];
    for (const violation of report.forbiddenViolations) {
      lines.push(`  forbidden path moved: ${violation.path} (${violation.before ?? 'absent'} -> ${violation.after ?? 'absent'})`);
    }
    if (report.blocked) lines.push(`  blocked: ${report.blocked.reason}`);
    for (const error of report.errors) lines.push(`  error: ${error}`);
    for (const warning of report.warnings ?? []) lines.push(`  warning: ${warning}`);
    console.error(lines.join('\n'));
  }

  if (report.status === 'pass') return 0;
  if (report.status === 'blocked') return 3;
  return 1;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main().then((code) => process.exit(code));
