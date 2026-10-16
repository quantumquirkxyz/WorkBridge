import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectSkills } from '../skill-graph.mjs';
import {
  COMMAND_ALLOWLIST,
  SUPPORTED_OPS,
  STATE_CHECK_KINDS,
  loadTask,
  listTasks,
  validateTask,
  runSetup,
  runAction,
  verifyState,
  checkForbiddenPaths,
  snapshotForbidden,
  resolveCommand,
  runTask,
} from '../scripts/run-skill-task.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLATFORM_DIR = path.resolve(HERE, '..');
const REPO_ROOT = path.resolve(PLATFORM_DIR, '..', '..', '..');
const TASKS_DIR = path.join(PLATFORM_DIR, 'tasks');
const SIMPLEST_TASK = 'task-lockfile-integrity';

function tempDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `quirk-task-test-${label}-`));
}

function contextFor(workspace, extra = {}) {
  return {
    repoRoot: REPO_ROOT,
    workspace,
    steps: [],
    actionSteps: [],
    timeoutMs: 60000,
    verbose: false,
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Loading and schema validation
// ---------------------------------------------------------------------------

test('every shipped task loads, has a unique id, and passes schema validation', () => {
  const files = fs.readdirSync(TASKS_DIR).filter((name) => name.endsWith('.json')).sort();
  assert.ok(files.length >= 3, `expected at least three task files, found ${files.length}`);

  const bundleSkills = collectSkills(REPO_ROOT);
  assert.ok(bundleSkills.length >= 240, `the bundle collector should see the canonical skills, saw ${bundleSkills.length}`);

  const ids = new Set();
  for (const file of files) {
    const { task } = loadTask(path.join(TASKS_DIR, file));
    assert.ok(!ids.has(task.id), `duplicate task id ${task.id}`);
    ids.add(task.id);

    const siblings = files
      .filter((other) => other !== file)
      .map((other) => loadTask(path.join(TASKS_DIR, other)).task.id);

    const errors = validateTask(task, { skills: bundleSkills, siblingIds: siblings });
    assert.deepStrictEqual(errors, [], `${file} must validate: ${errors.join('; ')}`);

    assert.ok(SUPPORTED_OPS.includes('copy') && SUPPORTED_OPS.includes('run'));
    for (const op of [...(task.setup ?? []), ...(task.actions ?? [])]) {
      assert.ok(SUPPORTED_OPS.includes(op.op), `${file} declares unsupported op ${op.op}`);
    }
    for (const check of task.verification.stateChecks) {
      assert.ok(STATE_CHECK_KINDS.includes(check.kind), `${file} declares unsupported check ${check.kind}`);
    }
  }
});

test('listTasks reports every task file', () => {
  const tasks = listTasks(TASKS_DIR);
  const files = fs.readdirSync(TASKS_DIR).filter((name) => name.endsWith('.json')).sort();
  assert.equal(tasks.length, files.length);
  for (const entry of tasks) {
    assert.ok(entry.id, `${entry.file} must declare an id`);
    assert.ok(entry.skill && entry.skill.includes('/'), `${entry.file} must declare <domain>/<skill>`);
    assert.equal(entry.parseError, null);
  }
  assert.ok(tasks.map((entry) => entry.id).includes(SIMPLEST_TASK));
});

test('validateTask rejects a malformed task', () => {
  const { task } = loadTask(SIMPLEST_TASK);
  const broken = {
    ...task,
    id: 'Not Kebab',
    skill: 'no-such-skill',
    difficulty: 'impossible',
    workspace: { kind: 'nope' },
    setup: [{ op: 'explode' }, { op: 'copy', from: 'x' }],
    actions: [{ op: 'run', command: ['rm', '-rf', '.'] }],
    verification: { stateChecks: [{ kind: 'mind-read', path: 'a' }, { kind: 'file-exists' }] },
  };
  const errors = validateTask(broken, { skills: [], siblingIds: [] });
  assert.ok(errors.length >= 8, `expected a full error list, got ${errors.join('; ')}`);
});

// ---------------------------------------------------------------------------
// verifyState over every kind
// ---------------------------------------------------------------------------

test('verifyState evaluates every state check kind against a real workspace', () => {
  const workspace = tempDir('state');
  try {
    fs.mkdirSync(path.join(workspace, 'nested'), { recursive: true });
    fs.writeFileSync(path.join(workspace, 'nested', 'data.json'), `${JSON.stringify({
      skills: { 'review-pr': { hash: 'abc', revision: 'working-tree' } },
      entries: [{ absolute: false }, { absolute: true }],
      count: 2,
    }, null, 2)}\n`);
    fs.writeFileSync(path.join(workspace, 'notes.md'), 'line one\nline two\nline three');
    fs.writeFileSync(path.join(workspace, 'trust.txt'), 'risk: medium\ntrustTier: 3\n');

    const steps = [
      { op: 'run', command: ['node', '--version'], exitCode: 0 },
      { op: 'run', command: ['node', 'missing.mjs'], exitCode: 1 },
    ];

    const results = verifyState([
      { kind: 'file-exists', path: 'notes.md' },
      { kind: 'file-missing', path: 'gone.md' },
      { kind: 'file-contains', path: 'notes.md', value: 'line two' },
      { kind: 'file-not-contains', path: 'notes.md', value: 'line nine' },
      { kind: 'json-field-equals', path: 'nested/data.json', field: 'skills.review-pr.revision', value: 'working-tree' },
      { kind: 'json-field-equals', path: 'nested/data.json', field: 'entries.0.absolute', value: false },
      { kind: 'json-field-equals', path: 'nested/data.json', field: 'count', value: 3 },
      { kind: 'json-field-equals', path: 'nested/data.json', field: 'skills.absent.hash', value: 'abc' },
      { kind: 'file-min-lines', path: 'notes.md', value: 3 },
      { kind: 'file-min-lines', path: 'notes.md', value: 4 },
      { kind: 'exit-was-zero', step: 0 },
      { kind: 'exit-was-nonzero', step: 1 },
      { kind: 'exit-was-zero', step: 1 },
      { kind: 'regex-matches', path: 'trust.txt', value: '\\ntrustTier: 3\\n' },
      { kind: 'regex-matches', path: 'trust.txt', value: 'trustTier: 4' },
      { kind: 'file-exists', path: 'nested/missing/data.json' },
    ], contextFor(workspace, { actionSteps: steps }));

    const byIndex = (index) => results[index];
    assert.equal(byIndex(0).ok, true, 'file-exists passes for a present file');
    assert.equal(byIndex(1).ok, true, 'file-missing passes for an absent file');
    assert.equal(byIndex(2).ok, true, 'file-contains passes on a substring');
    assert.equal(byIndex(3).ok, true, 'file-not-contains passes on an absent substring');
    assert.equal(byIndex(4).ok, true, 'json-field-equals walks nested objects');
    assert.equal(byIndex(5).ok, true, 'json-field-equals walks array indices');
    assert.equal(byIndex(6).ok, false, 'json-field-equals fails on a different value');
    assert.equal(byIndex(7).ok, false, 'json-field-equals fails on a missing field');
    assert.equal(byIndex(7).actual, '__MISSING__');
    assert.equal(byIndex(8).ok, true, 'file-min-lines passes at the boundary');
    assert.equal(byIndex(9).ok, false, 'file-min-lines fails below the boundary');
    assert.equal(byIndex(10).ok, true, 'exit-was-zero passes on a zero exit');
    assert.equal(byIndex(11).ok, true, 'exit-was-nonzero passes on a non-zero exit');
    assert.equal(byIndex(12).ok, false, 'exit-was-zero fails on a non-zero exit');
    assert.equal(byIndex(13).ok, true, 'regex-matches anchors on explicit newlines');
    assert.equal(byIndex(14).ok, false, 'regex-matches fails when the text differs');
    assert.equal(byIndex(15).ok, false, 'file-exists fails without throwing on a missing parent');

    // An unreadable file is a failed check, never an exception.
    const missing = verifyState([{ kind: 'file-contains', path: 'nope.txt', value: 'x' }], contextFor(workspace));
    assert.equal(missing[0].ok, false);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// forbidden paths
// ---------------------------------------------------------------------------

test('checkForbiddenPaths detects a modified file and a deleted file', () => {
  const workspace = tempDir('forbidden');
  try {
    fs.writeFileSync(path.join(workspace, 'stable.json'), '{"a":1}\n');
    fs.writeFileSync(path.join(workspace, 'edited.json'), '{"a":1}\n');
    fs.writeFileSync(path.join(workspace, 'deleted.json'), '{"a":1}\n');
    fs.writeFileSync(path.join(workspace, 'untouched.json'), '{"a":1}\n');

    const forbidden = ['stable.json', 'edited.json', 'deleted.json', 'untouched.json'];
    const before = snapshotForbidden(workspace, forbidden);

    fs.writeFileSync(path.join(workspace, 'edited.json'), '{"a":2}\n');
    fs.rmSync(path.join(workspace, 'deleted.json'));

    const { violations, entries } = checkForbiddenPaths(workspace, forbidden, before);
    assert.equal(entries.length, 4);
    assert.deepStrictEqual(
      violations.map((entry) => entry.path).sort(),
      ['deleted.json', 'edited.json'],
      'a modified file and a deleted file are both violations',
    );
    assert.equal(violations.find((entry) => entry.path === 'deleted.json').after, null);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('checkForbiddenPaths also flags a file that appeared', () => {
  const workspace = tempDir('forbidden-appear');
  try {
    fs.writeFileSync(path.join(workspace, 'keep.txt'), 'stable\n');
    const forbidden = ['keep.txt', 'backup.txt'];
    const before = snapshotForbidden(workspace, forbidden);
    fs.writeFileSync(path.join(workspace, 'backup.txt'), 'sneaky\n');
    const { violations } = checkForbiddenPaths(workspace, forbidden, before);
    assert.deepStrictEqual(violations.map((entry) => entry.path), ['backup.txt']);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// command allowlist
// ---------------------------------------------------------------------------

test('resolveCommand refuses anything outside the allowlist', () => {
  const workspace = tempDir('allowlist');
  try {
    fs.writeFileSync(path.join(workspace, 'tool.mjs'), 'process.exit(0);\n');

    for (const command of [['rm', '-rf', '.'], ['sh', '-c', 'echo hi'], ['curl', 'https://example.test'], ['node', '-e', 'process.exit(1)']]) {
      const verdict = resolveCommand(command, workspace);
      assert.equal(verdict.ok, false, `${command.join(' ')} must be refused`);
      assert.ok(typeof verdict.reason === 'string' && verdict.reason.length > 0);
    }

    assert.equal(resolveCommand(['node', 'tool.mjs'], workspace).ok, true);
    assert.equal(resolveCommand(['node', '--check', 'tool.mjs'], workspace).ok, true);
    assert.equal(resolveCommand(['node', '--version'], workspace).ok, true);
    assert.equal(resolveCommand(['node', 'elsewhere.mjs'], workspace).ok, false);
    assert.equal(resolveCommand(['node', '../outside.mjs'], workspace).ok, false);
    assert.equal(resolveCommand(['git', 'status'], workspace).ok, true);
    assert.deepStrictEqual([...COMMAND_ALLOWLIST], ['node', 'npm', 'git', 'bash']);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('a task whose action is outside the allowlist ends blocked, not failed', async () => {
  const task = {
    id: 'task-allowlist-probe',
    title: 'allowlist probe',
    skill: 'skill-dev/lockfile-maintenance',
    difficulty: 'easy',
    workspace: { kind: 'empty' },
    prompt: 'Attempt a command the runner must refuse.',
    setup: [{ op: 'write', path: 'marker.txt', content: 'seeded\n' }],
    actions: [
      { op: 'run', command: ['rm', '-rf', '.'] },
      { op: 'run', command: ['node', 'never-runs.mjs'] },
    ],
    verification: {
      stateChecks: [{ kind: 'file-exists', path: 'marker.txt' }],
      forbiddenPaths: [],
    },
  };

  const report = await runTask(task, { sandbox: 'tmpdir', repoRoot: REPO_ROOT });
  assert.equal(report.status, 'blocked', 'an allowlisted-out command blocks the task');
  assert.match(report.blocked.reason, /outside the allowlist/);
  // The refused command is recorded, and nothing after it was executed.
  // The setup step ran, the refused command was recorded, and the action that
  // followed it never executed.
  assert.equal(report.steps.length, 2);
  assert.equal(report.steps[0].phase, 'setup');
  assert.equal(report.steps[1].status, 'blocked');
  assert.ok(!report.steps.some((step) => JSON.stringify(step.command ?? []).includes('never-runs')));
  assert.equal(report.cleanup, 'removed');
  assert.equal(fs.existsSync(report.workspace), false, 'the workspace is cleaned up');
  assert.ok(report.tracePath, 'a blocked run is still recorded in the trace log');
});

// ---------------------------------------------------------------------------
// end to end
// ---------------------------------------------------------------------------

test('the simplest task passes end to end in an empty sandbox and cleans up', async () => {
  const { task, file } = loadTask(SIMPLEST_TASK);
  const report = await runTask(task, { sandbox: 'tmpdir', repoRoot: REPO_ROOT, taskFile: file });

  assert.equal(report.status, 'pass', `expected pass, got ${report.status}: ${JSON.stringify(report.stateChecks.filter((c) => !c.ok))}`);
  assert.equal(report.cleanup, 'removed');
  assert.equal(fs.existsSync(report.workspace), false, 'the workspace directory is gone');
  assert.ok(report.tracePath.startsWith('.agents/skills/platform/traces/'), report.tracePath);
  assert.equal(report.steps.filter((step) => step.phase === 'action').length, task.actions.length);
  assert.ok(report.stateChecks.every((check) => check.ok));
  assert.deepStrictEqual(report.forbiddenViolations, []);
});

test('a failing state check is a fail, never an error', async () => {
  const task = {
    id: 'task-state-failure-probe',
    title: 'state failure probe',
    skill: 'skill-dev/lockfile-maintenance',
    difficulty: 'easy',
    workspace: { kind: 'empty' },
    prompt: 'Run a repair that leaves the declared end state unreachable.',
    setup: [{ op: 'write', path: 'skills-lock.json', content: '{"skills":{}}\n' }],
    actions: [{ op: 'run', command: ['node', '--version'] }],
    verification: {
      stateChecks: [
        { kind: 'file-exists', path: 'skills-lock.json' },
        { kind: 'json-field-equals', path: 'skills-lock.json', field: 'skills.review-pr.revision', value: 'working-tree' },
      ],
      forbiddenPaths: [],
    },
  };

  const report = await runTask(task, { sandbox: 'tmpdir', repoRoot: REPO_ROOT });
  assert.equal(report.status, 'fail');
  assert.equal(report.errors.length, 0, 'a failed check is not an execution error');
  assert.deepStrictEqual(report.stateChecks.map((check) => check.ok), [true, false]);
  assert.equal(report.cleanup, 'removed');
});

test('a repair that edits a forbidden path is a fail', async () => {
  const workspace = tempDir('forbidden-run');
  try {
    fs.writeFileSync(path.join(workspace, 'schema.json'), '{"type":"object"}\n');
    fs.writeFileSync(path.join(workspace, 'repair.mjs'), [
      "import fs from 'node:fs';",
      "fs.writeFileSync('schema.json', '{\"type\":\"string\"}\\n');",
      "console.log('edited the schema');",
      '',
    ].join('\n'));

    const context = contextFor(workspace);
    const setup = await runSetup({
      setup: [{ op: 'assert', stateChecks: [{ kind: 'file-contains', path: 'schema.json', value: 'object' }] }],
    }, context);
    assert.equal(setup.abort, null);

    const before = snapshotForbidden(workspace, ['schema.json']);
    const actions = await runAction({
      actions: [{ op: 'run', command: ['node', 'repair.mjs'] }],
    }, context);
    assert.equal(actions.abort, null);

    const { violations } = checkForbiddenPaths(workspace, ['schema.json'], before);
    assert.equal(violations.length, 1, 'editing a forbidden path is a violation');
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('runSetup and runAction are exported phase runners over the same ops', async () => {
  const workspace = tempDir('phases');
  try {
    fs.writeFileSync(path.join(workspace, 'hello.txt'), 'hello\n');
    const context = contextFor(workspace);

    const setup = await runSetup({
      setup: [
        { op: 'write', path: 'out.txt', content: 'written by setup\n' },
        { op: 'assert', stateChecks: [{ kind: 'file-exists', path: 'out.txt' }] },
      ],
    }, context);
    assert.equal(setup.abort, null);
    assert.equal(setup.steps.length, 2);
    assert.equal(setup.steps[0].phase, 'setup');

    const actions = await runAction({
      actions: [
        { op: 'run', command: ['node', '--version'] },
        { op: 'assert', stateChecks: [{ kind: 'file-contains', path: 'hello.txt', value: 'hello' }] },
      ],
    }, context);
    assert.equal(actions.abort, null);
    assert.equal(actions.steps.length, 2);
    assert.equal(actions.steps[0].phase, 'action');
    assert.equal(actions.steps[0].exitCode, 0);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});
