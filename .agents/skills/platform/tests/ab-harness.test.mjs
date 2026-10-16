import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  DEFAULT_TOOLS, SHELL_ALLOWLIST, buildArms, composeTranscript, createToolbox,
  estimateCost, failedArmRecord, isShellCommandAllowed, modelParityError,
  resolveTrials, runTrial, transcriptEventsFor,
} from '../../../../evals/harness/run-ab.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..');
const RUN_AB = path.join(REPO_ROOT, 'evals', 'harness', 'run-ab.mjs');
const FIXTURE = path.join(REPO_ROOT, 'evals', 'behavioral', 'ship-subissue.json');
const SKILL_FILE = path.join(REPO_ROOT, '.agents', 'skills', 'routing', 'ship-subissue', 'SKILL.md');

const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
const skillBody = fs.readFileSync(SKILL_FILE, 'utf8').replace(/^---[\s\S]*?---\s*/, '');

const createdDirs = [];

function tempDir(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  createdDirs.push(dir);
  return dir;
}

// Every workspace these tests build is a throwaway copy of fixture material, so
// none of it should outlive the run.
after(() => {
  for (const dir of createdDirs) fs.rmSync(dir, { recursive: true, force: true });
});

function seedWorkspace(dir) {
  fs.writeFileSync(path.join(dir, 'notes.md'), '# notes\n\ncanonical work-item shape: work-item-format.md\n');
  fs.mkdirSync(path.join(dir, 'context'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'context', 'notes.md'), '# fixture context\n\n- the pull request body carries no linked issue reference\n');
  fs.writeFileSync(path.join(dir, 'probe.js'), 'const answer = 42;\n');
}

/* ------------------------------------------------------------------- arms */

test('buildArms returns two arms and only the with-skill arm carries the skill body', () => {
  const arms = buildArms(fixture, skillBody);

  assert.deepEqual(Object.keys(arms).sort(), ['baseline', 'with-skill']);
  assert.equal(arms['with-skill'].skillInjected, true);
  assert.equal(arms.baseline.skillInjected, false);
  assert.ok(arms['with-skill'].system.includes('## Skill instructions'), 'the injected block is labelled');
  assert.ok(arms['with-skill'].system.includes(skillBody.trim().slice(0, 200)), 'the skill body is the injected block');
  assert.ok(!arms.baseline.system.includes(skillBody.trim().slice(0, 200)), 'the baseline must not carry the skill body');
  assert.equal(arms['with-skill'].user, arms.baseline.user, 'both arms receive the same task');
  assert.ok(arms['with-skill'].user.includes(fixture.prompt), 'the prompt reaches the arm');
  for (const entry of fixture.context) {
    assert.ok(arms.baseline.user.includes(entry), `fixture context line reaches the arm: ${entry}`);
  }
  assert.ok(arms['with-skill'].systemChars > arms.baseline.systemChars, 'the skill costs the with-skill arm context');
});

test('buildArms reports no skill injection when no body is supplied', () => {
  const arms = buildArms(fixture, '');
  assert.equal(arms['with-skill'].skillInjected, false, 'an empty body is not an injected skill');
  assert.ok(!arms['with-skill'].system.includes(skillBody.trim().slice(0, 200)), 'no skill content leaks into the system prompt');
  assert.equal(arms['with-skill'].systemChars - arms.baseline.systemChars, '## Skill instructions - load them and follow them'.length + 4, 'only the empty block header is added');
});

/* --------------------------------------------------------- shell allowlist */

test('the shell allowlist admits only node --check, ls, cat and grep', () => {
  assert.deepEqual(SHELL_ALLOWLIST.map((entry) => entry.bin), ['node', 'ls', 'cat', 'grep']);
  assert.equal(isShellCommandAllowed('rm -rf .').allowed, false);
  assert.equal(isShellCommandAllowed('git push origin --delete').allowed, false);
  assert.equal(isShellCommandAllowed('gh pr merge 245').allowed, false);
  // A download verb, a pipe and a redirection are all refused: the first because
  // it is not allowlisted, the other two because they are shell metacharacters.
  assert.equal(isShellCommandAllowed('wget example.invalid/installer.sh').allowed, false);
  assert.equal(isShellCommandAllowed('cat notes.md | tee copy.md').allowed, false);
  assert.equal(isShellCommandAllowed('cat notes.md > copy.md').allowed, false);
  assert.ok(isShellCommandAllowed('cat notes.md | tee copy.md').reason.includes('metacharacter'));
  assert.ok(isShellCommandAllowed('rm -rf .').reason.includes('not in the shell allowlist'));
  assert.ok(isShellCommandAllowed('cat notes.md; rm notes.md').reason.includes('metacharacter'));
  assert.ok(isShellCommandAllowed('cat ../../etc/passwd').allowed, 'containment is checked at execution time, not by the allowlist');
  assert.equal(isShellCommandAllowed('node --check probe.js').allowed, true);
  assert.equal(isShellCommandAllowed('ls').allowed, true);
  assert.equal(isShellCommandAllowed('cat notes.md').allowed, true);
  assert.equal(isShellCommandAllowed('grep pattern notes.md').allowed, true);
  assert.equal(isShellCommandAllowed('node probe.js').allowed, false, 'node only runs --check');
  assert.equal(isShellCommandAllowed('cat').allowed, false, 'cat needs a file operand');
});

test('execute refuses a disallowed shell command and records the refusal instead of throwing', async () => {
  const workspace = tempDir('quirk-ab-toolbox-');
  seedWorkspace(workspace);
  const toolbox = createToolbox({ workspace });

  const rejected = await toolbox.execute('shell', { command: 'rm -rf notes.md' });
  assert.equal(rejected.rejected, true);
  assert.equal(rejected.ok, false);
  assert.match(rejected.reason, /not in the shell allowlist/);
  assert.equal(fs.existsSync(path.join(workspace, 'notes.md')), true, 'the refused command must not have touched the workspace');

  const piped = await toolbox.execute('shell', { command: 'cat notes.md | tee copy.md' });
  assert.equal(piped.rejected, true);
  assert.match(piped.reason, /metacharacter/);
  assert.equal(fs.existsSync(path.join(workspace, 'copy.md')), false);
});

test('tools stay inside the arm workspace and an allowlisted command still runs', async () => {
  const workspace = tempDir('quirk-ab-toolbox-');
  seedWorkspace(workspace);
  const toolbox = createToolbox({ workspace });

  const escape = await toolbox.execute('read', { path: '../../etc/passwd' });
  assert.equal(escape.rejected, true, 'a read outside the workspace is refused');
  assert.match(escape.reason, /escapes the arm workspace/);

  const inside = await toolbox.execute('read', { path: 'notes.md' });
  assert.equal(inside.ok, true);
  assert.ok(inside.output.includes('work-item-format.md'));

  const listed = await toolbox.execute('list', { path: '.' });
  assert.equal(listed.ok, true);
  assert.ok(listed.output.includes('notes.md'));

  const grep = await toolbox.execute('grep', { pattern: 'work-item', path: '.' });
  assert.equal(grep.ok, true);
  assert.match(grep.output, /notes\.md:3/);

  const checked = await toolbox.execute('shell', { command: 'node --check probe.js' });
  if (fs.existsSync('/bin/ls')) {
    assert.equal(checked.ok, true, 'an allowlisted command inside the workspace runs');
  }
  const unknown = await toolbox.execute('write', { path: 'x.md' });
  assert.equal(unknown.ok, false);
  assert.match(unknown.reason, /unknown tool/);
});

/* ------------------------------------------------------------- agent loop */

test('the agent loop records tool_call and tool_result events and honours the allowlist', async () => {
  const workspace = tempDir('quirk-ab-loop-');
  seedWorkspace(workspace);
  const toolbox = createToolbox({ workspace });

  const client = {
    provider: 'anthropic',
    model: 'test/snapshot',
    calls: 0,
    async complete({ messages, tools }) {
      this.calls += 1;
      assert.equal(tools.length, DEFAULT_TOOLS.length, 'the tool definitions reach the provider');
      if (this.calls === 1) {
        return {
          text: '',
          stopReason: 'tool_use',
          toolCalls: [
            { id: 'call_1', name: 'read', input: { path: 'notes.md' } },
            { id: 'call_2', name: 'shell', input: { command: 'rm -rf notes.md' } },
          ],
          usage: { input: 100, output: 20 },
        };
      }
      return {
        text: '## Target\n\nBlocked ship.',
        stopReason: 'end_turn',
        toolCalls: [],
        usage: { input: 150, output: 90 },
      };
    },
  };

  const record = await runTrial({ arm: buildArms(fixture, skillBody)['with-skill'], trial: 1, workspace, client, toolbox });

  assert.equal(record.status, 'completed');
  assert.equal(record.turnCount, 2);
  assert.equal(record.finalText, '## Target\n\nBlocked ship.');
  assert.equal(record.usage.input, 250);
  assert.equal(record.usage.output, 110);
  assert.equal(record.model, 'test/snapshot');

  const [firstTurn, secondTurn] = record.turns;
  assert.equal(firstTurn.toolCalls.find((call) => call.id === 'call_1').ok, true);
  assert.equal(firstTurn.toolCalls.find((call) => call.id === 'call_2').rejected, true, 'rm is recorded as rejected');
  assert.deepEqual(secondTurn.toolCalls, [], 'no tool call on the final turn');
});

test('a provider failure is recorded as a failed session instead of crashing the run', async () => {
  const workspace = tempDir('quirk-ab-loop-');
  const toolbox = createToolbox({ workspace });
  const client = {
    provider: 'anthropic',
    model: 'test/snapshot',
    async complete() { throw new Error('provider returned HTTP 429'); },
  };

  const record = await runTrial({ arm: buildArms(fixture, skillBody).baseline, trial: 2, workspace, client, toolbox });
  assert.equal(record.status, 'failed');
  assert.match(record.error, /HTTP 429/);
  assert.equal(record.finalText, '');
  assert.equal(record.usage.input, 0);
});

test('the turn budget stops a session that keeps calling tools', async () => {
  const workspace = tempDir('quirk-ab-loop-');
  seedWorkspace(workspace);
  const toolbox = createToolbox({ workspace });
  const client = {
    provider: 'anthropic',
    model: 'test/snapshot',
    async complete() {
      return {
        text: 'still working',
        stopReason: 'tool_use',
        toolCalls: [{ id: 'call_x', name: 'list', input: { path: '.' } }],
        usage: { input: 10, output: 5 },
      };
    },
  };

  const record = await runTrial({ arm: buildArms(fixture, skillBody).baseline, trial: 1, workspace, client, toolbox, maxTurns: 5 });
  assert.equal(record.turnCount, 5, 'the loop stops at the declared turn budget');
  assert.equal(record.budgetExhausted, true);
  assert.equal(record.finalText, '', 'a budget-exhausted session contributes no artifact text');
});

/* --------------------------------------------------- transcript round trip */

test('transcriptEventsFor produces events loadTranscript groups into trials', async () => {
  const { loadTranscript } = await import(pathToFileURL(path.join(REPO_ROOT, 'evals', 'run-behavioral.mjs')).href);
  const workspace = tempDir('quirk-ab-tx-');
  seedWorkspace(workspace);
  const toolbox = createToolbox({ workspace });
  const client = {
    provider: 'anthropic',
    model: 'test/snapshot',
    calls: 0,
    async complete() {
      this.calls += 1;
      if (this.calls === 1) {
        return {
          text: '',
          stopReason: 'tool_use',
          toolCalls: [
            { id: 'call_1', name: 'read', input: { path: 'notes.md' } },
            { id: 'call_2', name: 'shell', input: { command: 'rm -rf notes.md' } },
          ],
          usage: { input: 100, output: 20 },
        };
      }
      return { text: '## Target\n\nBlocked ship.', stopReason: 'end_turn', toolCalls: [], usage: { input: 150, output: 90 } };
    },
  };
  const record = await runTrial({ arm: buildArms(fixture, skillBody)['with-skill'], trial: 1, workspace, client, toolbox });

  const dir = tempDir('quirk-ab-txout-');
  const records = [1, 2, 3].map((trial) => ({ ...record, trial, mode: 'with-skill' }));
  const file = path.join(dir, 'with-skill.jsonl');
  fs.writeFileSync(file, composeTranscript(records, () => ({ path: 'evals/results/harness/artifacts/x.md', text: 'artifact body' })));

  const loaded = await loadTranscript(file);
  assert.equal(loaded.trials.length, 3, 'three recorded trials group into three trials');
  assert.deepEqual(loaded.trials.map((entry) => entry.mode), ['with-skill', 'with-skill', 'with-skill']);
  assert.deepEqual(loaded.trials.map((entry) => entry.model), ['test/snapshot', 'test/snapshot', 'test/snapshot']);
  assert.deepEqual(loaded.trials.map((entry) => entry.index), [1, 2, 3]);
  for (const trial of loaded.trials) {
    assert.equal(trial.tokens.input, 250);
    assert.equal(trial.tokens.output, 110);
    assert.equal(trial.messages.filter((message) => message.role === 'user').length, 1);
    assert.ok(trial.messages.some((message) => message.role === 'assistant'));
    assert.equal(trial.toolCalls.length, 2);
    assert.equal(trial.toolCalls.filter((call) => call.rejected).length, 1, 'the refused call is visible in the scored transcript');
    assert.equal(trial.finalArtifact.text, 'artifact body');
    assert.equal(trial.end.status, 'completed');
  }
  assert.equal(loaded.errors.length, 0);
});

test('transcriptEventsFor records the failure path so a crashed arm still scores', async () => {
  const record = failedArmRecord({ mode: 'baseline', trial: 1, model: 'test/snapshot', error: new Error('no record'), user: 'prompt' });
  const events = transcriptEventsFor(record, { path: 'evals/results/harness/artifacts/x.md', text: '' });
  const types = events.map((event) => event.type);
  assert.deepEqual(types, ['session', 'message', 'artifact', 'end']);
  const end = events.at(-1);
  assert.equal(end.status, 'failed');
  assert.equal(end.error, 'no record');
  assert.equal(end.tokens.input, null, 'a crashed arm reports no tokens instead of zeros');
});

/* ------------------------------------------------------------------- cost */

test('estimateCost applies a known price per 1k tokens', () => {
  assert.equal(estimateCost({ input: 1000, output: 500 }, { input: 0.003, output: 0.015 }), 0.0105);
  assert.equal(estimateCost({ input: 2000, output: 1000 }, { input: 0.003, output: 0.015 }), 0.021);
  assert.equal(estimateCost({ input: 1000, output: 0 }, { input: 0.002, output: 0.01 }), 0.002);
  assert.equal(estimateCost({ input: 1000, output: 500 }, 0.003), 0.0045, 'a single number prices both directions');
});

test('estimateCost refuses to invent a number it was not given', () => {
  assert.equal(estimateCost({ input: 1000, output: 500 }, null), null);
  assert.equal(estimateCost({ input: 1000, output: 500 }, {}), null);
  assert.equal(estimateCost({}, { input: 0.003, output: 0.015 }), null);
  assert.equal(estimateCost(null, { input: 0.003, output: 0.015 }), null);
});

/* ---------------------------------------------------------- model parity */

test('modelParityError accepts a shared snapshot and rejects a cross-model delta', () => {
  const trials = (model) => [{ model }, { model }];
  assert.equal(modelParityError(trials('anthropic/claude-sonnet-4-5'), trials('anthropic/claude-sonnet-4-5')), null);
  assert.match(
    modelParityError(trials('anthropic/claude-sonnet-4-5'), trials('anthropic/claude-opus-4-1')),
    /model snapshots differ between arms/,
  );
  assert.match(modelParityError([{ model: null }], trials('anthropic/claude-sonnet-4-5')), /no model snapshot was recorded/);
});

/* -------------------------------------------------------------- trial floor */

test('resolveTrials never drops below the protocol floor of 3 trials per arm', () => {
  assert.ok(resolveTrials(fixture) >= 3, 'the fixture floor is honoured');
  assert.equal(resolveTrials({ ...fixture, trials: 1 }), 3, 'a fixture declaring fewer trials is lifted to 3');
  assert.equal(resolveTrials({ ...fixture, trials: 7 }), 7, 'a fixture declaring more trials is respected');
});

test('--trials below the floor is refused by the runner', () => {
  const result = spawnSync('node', [RUN_AB, '--fixture', 'evals/behavioral/ship-subissue.json', '--trials', '2', '--dry-run'], {
    encoding: 'utf8', cwd: REPO_ROOT,
  });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /below the protocol floor of 3 trials/);
});

/* ----------------------------------------------------------------- dry run */

test('--dry-run validates a real fixture and exits 0 without any network call', () => {
  const result = spawnSync('node', [RUN_AB, '--fixture', 'evals/behavioral/ship-subissue.json', '--dry-run', '--json'], {
    encoding: 'utf8', cwd: REPO_ROOT, env: { ...process.env, ANTHROPIC_API_KEY: '' },
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);

  const plan = JSON.parse(result.stdout);
  assert.equal(plan.dryRun, true);
  assert.equal(plan.networkCalls, 0);
  assert.equal(plan.status, 'plan-ok');
  assert.deepEqual(plan.protocol.arms, ['with-skill', 'baseline']);
  assert.equal(plan.protocol.sessions, 2 * plan.protocol.trialsPerArm);
  assert.ok(plan.protocol.trialsPerArm >= 3);
  assert.equal(plan.protocol.freshWorkspacePerArmAndTrial, true);
  assert.equal(plan.protocol.oneChildProcessPerSession, true);
  assert.equal(plan.fixture.skill, fixture.skill);
  assert.equal(plan.model.apiKeyPresent, false, 'an empty key counts as absent');
  assert.deepEqual(plan.tools, DEFAULT_TOOLS.map((tool) => tool.name));
  assert.deepEqual(plan.shellAllowlist, ['node --check', 'ls', 'cat', 'grep']);

  const arms = Object.fromEntries(plan.arms.map((arm) => [arm.mode, arm]));
  assert.equal(arms['with-skill'].skillInjected, true);
  assert.equal(arms.baseline.skillInjected, false);
  assert.ok(arms['with-skill'].systemChars > arms.baseline.systemChars);
});

test('--dry-run refuses to report a plan for a fixture the scorer rejects', () => {
  const dir = tempDir('quirk-ab-dry-');
  const broken = path.join(dir, 'broken.json');
  fs.writeFileSync(broken, JSON.stringify({ skill: 'project/to-spec', trials: 1 }));
  const result = spawnSync('node', [RUN_AB, '--fixture', broken, '--dry-run'], { encoding: 'utf8', cwd: REPO_ROOT });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /missing required key "scenario"/);
});

test('the human-readable dry run prints the plan and states that no session ran', () => {
  const result = spawnSync('node', [RUN_AB, '--fixture', 'evals/behavioral/ship-subissue.json', '--dry-run'], {
    encoding: 'utf8', cwd: REPO_ROOT,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /no provider session started/);
  assert.match(result.stdout, /network calls: 0/);
  assert.match(result.stdout, /status: plan ok/);
  assert.match(result.stdout, /shell allowlist node --check \| ls \| cat \| grep/);
});

test('a real run without a provider key stops with a clear error instead of a silent report', () => {
  const result = spawnSync('node', [RUN_AB, '--fixture', 'evals/behavioral/ship-subissue.json', '--api-key-env', 'AB_TEST_ABSENT_KEY'], {
    encoding: 'utf8', cwd: REPO_ROOT,
  });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /AB_TEST_ABSENT_KEY is not set in the environment/);
});
