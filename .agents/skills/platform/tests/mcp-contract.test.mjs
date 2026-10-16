import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { redact, buildToolsList, handleJsonRpc } from '../mcp-server/mcp-skill-lab-server.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..');
const SERVER_SCRIPT = path.join(REPO_ROOT, '.agents', 'skills', 'platform', 'mcp-server', 'mcp-skill-lab-server.mjs');
const RECORDER_SCRIPT = path.join(REPO_ROOT, '.agents', 'skills', 'platform', 'scripts', 'mcp-flight-recorder.mjs');
const RPC_TIMEOUT_MS = 5000;

const TOOL_NAMES = [
  'list_skills',
  'get_skill',
  'search_skills',
  'route_task',
  'validate_skill',
  'run_quality_gate',
  'get_registry_info',
  'get_side_effect_policy',
  'explain_routing',
];

// Newline-delimited JSON-RPC session over a child process (server or recorder).
// Every call carries its own timeout and rejects with a readable message when
// the child died or never answered, so a broken server fails the test instead
// of hanging the runner.
function stdioSession(child, timeoutMs = RPC_TIMEOUT_MS) {
  const pending = new Map();
  let buffer = '';
  let nextId = 0;

  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    while (buffer.includes('\n')) {
      const index = buffer.indexOf('\n');
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line) continue;
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        continue;
      }
      if (message?.id === undefined) continue;
      const entry = pending.get(String(message.id));
      if (!entry) continue;
      pending.delete(String(message.id));
      clearTimeout(entry.timer);
      entry.resolve(message);
    }
  });

  const failAll = (reason) => {
    for (const [, entry] of pending) {
      clearTimeout(entry.timer);
      entry.reject(new Error(reason));
    }
    pending.clear();
  };
  child.on('exit', (code) => failAll(`child process exited with code ${code} before answering`));
  child.on('error', (err) => failAll(`child process error: ${err.message}`));

  const rpc = (method, params = {}) => new Promise((resolve, reject) => {
    const id = (nextId += 1);
    const timer = setTimeout(() => {
      pending.delete(String(id));
      reject(new Error(`timeout after ${timeoutMs}ms waiting for ${method}`));
    }, timeoutMs);
    pending.set(String(id), { resolve, reject, timer });
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });

  return { rpc };
}

function startServer() {
  const child = spawn('node', [SERVER_SCRIPT, '--stdio'], {
    cwd: REPO_ROOT,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return { child, ...stdioSession(child) };
}

async function waitFor(predicate, timeoutMs, intervalMs = 50) {
  const started = Date.now();
  for (;;) {
    let value = false;
    try {
      value = predicate();
    } catch {
      value = false;
    }
    if (value) return;
    if (Date.now() - started > timeoutMs) throw new Error('condition not met in time');
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

test('redact replaces secret-bearing values recursively', () => {
  // The apiKey value is kept short on purpose: the deterministic security
  // scanner treats a long quoted value next to a credential-shaped key as a
  // hardcoded credential, and this contract test must stay clean under --deep.
  const redacted = redact({
    headers: { authorization: 'Bearer alpha-1' },
    nested: [{ apiKey: 'beta-7' }],
    visible: 'kept',
  });
  assert.equal(redacted.headers.authorization, '[REDACTED]');
  assert.equal(redacted.nested[0].apiKey, '[REDACTED]');
  assert.equal(redacted.visible, 'kept');
  const serialized = JSON.stringify(redacted);
  assert.ok(!serialized.includes('alpha-1'), 'authorization value must not survive redaction');
  assert.ok(!serialized.includes('beta-7'), 'apiKey value must not survive redaction');
});

test('buildToolsList exposes the nine stable tools and hides high-trust skills', () => {
  const { tools, excludedHighTrust } = buildToolsList();
  assert.deepEqual(
    tools.map((tool) => tool.name).sort(),
    [...TOOL_NAMES].sort(),
  );
  for (const tool of tools) {
    assert.equal(tool.inputSchema.type, 'object', `${tool.name} must declare an object inputSchema`);
    assert.ok(typeof tool.description === 'string' && tool.description.length > 0, `${tool.name} needs a description`);
  }
  assert.ok(excludedHighTrust.includes('routing/ship-subissue'), 'the only tier-4 skill must be reported as excluded');
});

test('invalid params are rejected with -32602 in process', async () => {
  const missing = await handleJsonRpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_skill', arguments: {} } });
  assert.equal(missing.error.code, -32602);
  const badType = await handleJsonRpc({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'list_skills', arguments: { domain: 42 } } });
  assert.equal(badType.error.code, -32602);
  const unknownTool = await handleJsonRpc({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'nope', arguments: {} } });
  assert.equal(unknownTool.error.code, -32601);
});

test('stdio handshake returns the skill-lab server info', { timeout: 10000 }, async (t) => {
  const server = startServer();
  try {
    const response = await server.rpc('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'mcp-contract-test', version: '1.0.0' },
    });
    assert.equal(response.result.protocolVersion, '2024-11-05');
    assert.ok(response.result.capabilities.tools !== undefined, 'tools capability must be advertised');
    assert.equal(response.result.serverInfo.name, 'skill-lab');
  } catch (err) {
    t.diagnostic(`server stdout/stderr: ${err.message}`);
    throw err;
  } finally {
    server.child.kill();
  }
});

test('tools/list returns nine tools and list_skills hides high-trust skills', { timeout: 10000 }, async (t) => {
  const server = startServer();
  try {
    const list = await server.rpc('tools/list');
    const names = list.result.tools.map((tool) => tool.name).sort();
    assert.deepEqual(names, [...TOOL_NAMES].sort());
    for (const tool of list.result.tools) {
      assert.equal(tool.inputSchema.type, 'object');
      assert.ok(tool.description.length > 0);
    }

    const call = await server.rpc('tools/call', { name: 'list_skills', arguments: {} });
    const payload = JSON.parse(call.result.content[0].text);
    assert.equal(payload.excludedHighTrust.includes('routing/ship-subissue'), true);
    assert.equal(
      payload.skills.some((skill) => Number(skill.trustTier) > 3),
      false,
      'no skill with trustTier > 3 may appear in default list_skills results',
    );
    assert.equal(payload.skills.some((skill) => skill.name === 'ship-subissue'), false);
  } catch (err) {
    t.diagnostic(`stdio session failed: ${err.message}`);
    throw err;
  } finally {
    server.child.kill();
  }
});

test('tools/call route_task returns a non-empty top-3', { timeout: 10000 }, async (t) => {
  const server = startServer();
  try {
    const call = await server.rpc('tools/call', {
      name: 'route_task',
      arguments: { task: 'review the changes since a fixed point and publish the findings' },
    });
    const payload = JSON.parse(call.result.content[0].text);
    assert.ok(Array.isArray(payload.results));
    assert.ok(payload.results.length >= 1 && payload.results.length <= 3, 'route_task returns the top-3 by default');
    for (const result of payload.results) {
      assert.ok(result.skill.includes('/'), 'every result is addressed as domain/name');
      assert.ok(typeof result.reason === 'string' && result.reason.length > 0, 'every result carries a reason');
    }
    assert.equal(payload.results.some((result) => result.skill === 'routing/ship-subissue'), false);
  } catch (err) {
    t.diagnostic(`route_task failed: ${err.message}`);
    throw err;
  } finally {
    server.child.kill();
  }
});

test('tools/call get_skill returns frontmatter and errors cleanly for unknown skills', { timeout: 10000 }, async (t) => {
  const server = startServer();
  try {
    const found = await server.rpc('tools/call', { name: 'get_skill', arguments: { skill: 'delivery/code-review' } });
    assert.ok(found.result, 'an existing skill must return a result');
    const payload = JSON.parse(found.result.content[0].text);
    assert.equal(payload.frontmatter.name, 'code-review');
    assert.ok(typeof payload.body === 'string' && payload.body.length > 0);

    const missing = await server.rpc('tools/call', { name: 'get_skill', arguments: { skill: 'delivery/does-not-exist' } });
    assert.ok(missing.error, 'an unknown skill must return a JSON-RPC error, not throw');
    assert.equal(typeof missing.error.code, 'number');
    assert.ok(missing.error.message.includes('does-not-exist'));
  } catch (err) {
    t.diagnostic(`get_skill failed: ${err.message}`);
    throw err;
  } finally {
    server.child.kill();
  }
});

test('tools/call search_skills, validate_skill, explain_routing and policy work over stdio', { timeout: 10000 }, async (t) => {
  const server = startServer();
  try {
    const search = await server.rpc('tools/call', { name: 'search_skills', arguments: { query: 'kubernetes deployment', limit: 5 } });
    const searchPayload = JSON.parse(search.result.content[0].text);
    assert.ok(['bm25', 'token-overlap'].includes(searchPayload.engine));
    assert.ok(searchPayload.results.length >= 1);
    assert.ok(searchPayload.results.length <= 5);

    const validate = await server.rpc('tools/call', { name: 'validate_skill', arguments: { skill: 'delivery/code-review' } });
    const validatePayload = JSON.parse(validate.result.content[0].text);
    assert.equal(validatePayload.valid, true, JSON.stringify(validatePayload.checks));
    assert.deepEqual(
      validatePayload.checks.map((entry) => entry.check),
      ['frontmatter-required', 'lockfile-hash', 'dependencies-exist'],
    );

    const explain = await server.rpc('tools/call', { name: 'explain_routing', arguments: { task: 'design a kubernetes deployment' } });
    const explainPayload = JSON.parse(explain.result.content[0].text);
    assert.ok(explainPayload.explanations.length >= 1);
    const first = explainPayload.explanations[0];
    assert.ok(first.matched && typeof first.reason === 'string' && first.reason.length > 0);

    const policy = await server.rpc('tools/call', { name: 'get_side_effect_policy', arguments: { skill: 'delivery/implement' } });
    const policyPayload = JSON.parse(policy.result.content[0].text);
    assert.ok(Array.isArray(policyPayload.sideEffects));
    assert.equal(typeof policyPayload.approvalRequired, 'boolean');
    assert.ok(['low', 'medium', 'high'].includes(policyPayload.risk));
    assert.equal(typeof policyPayload.trustTier, 'string');

    const registry = await server.rpc('tools/call', { name: 'get_registry_info', arguments: {} });
    const registryPayload = JSON.parse(registry.result.content[0].text);
    assert.equal(registryPayload.skills.bundle, 253);
    assert.ok(registryPayload.compatibleAgents.length >= 1);
    assert.equal(registryPayload.server.name, 'skill-lab');
  } catch (err) {
    t.diagnostic(`tool battery failed: ${err.message}`);
    throw err;
  } finally {
    server.child.kill();
  }
});

test('resources expose registry and catalog, read registry content, and block traversal', { timeout: 10000 }, async (t) => {
  const server = startServer();
  try {
    const list = await server.rpc('resources/list');
    const uris = list.result.resources.map((resource) => resource.uri);
    assert.ok(uris.includes('skill://registry'), 'resources/list must include skill://registry');
    assert.ok(uris.includes('skill://catalog'), 'resources/list must include skill://catalog');
    assert.ok(uris.includes('skill://skill/delivery/code-review'), 'resources/list must include skill resources');
    assert.ok(uris.includes('skill://manifest/delivery/code-review'), 'resources/list must include runtime manifests');
    assert.ok(uris.some((uri) => uri.startsWith('skill://fixtures/')), 'resources/list must include fixtures');

    const registry = await server.rpc('resources/read', { uri: 'skill://registry' });
    const registryText = registry.result.contents[0].text;
    assert.ok(registryText.includes('quirk-skills'));
    assert.ok(registry.result.contents[0].mimeType === 'application/json');

    const catalog = await server.rpc('resources/read', { uri: 'skill://catalog' });
    assert.ok(catalog.result.contents[0].text.length > 100);

    const traversal = await server.rpc('resources/read', { uri: 'skill://../../etc/passwd' });
    assert.ok(traversal.error, 'a traversal URI must return a JSON-RPC error');
    assert.equal(traversal.error.code, -32002);
    assert.ok(!JSON.stringify(traversal).includes('root:'));

    const skillRead = await server.rpc('resources/read', { uri: 'skill://skill/delivery/code-review' });
    assert.ok(skillRead.result.contents[0].text.includes('name:'));
    assert.equal(skillRead.result.contents[0].mimeType, 'text/markdown');

    const missing = await server.rpc('resources/read', { uri: 'skill://fixtures/behavioral/nope-nope' });
    assert.ok(missing.error);
    assert.equal(missing.error.code, -32002);
  } catch (err) {
    t.diagnostic(`resources failed: ${err.message}`);
    throw err;
  } finally {
    server.child.kill();
  }
});

test('prompts/list exposes three prompts and prompts/get renders use_skill', { timeout: 10000 }, async (t) => {
  const server = startServer();
  try {
    const list = await server.rpc('prompts/list');
    assert.deepEqual(
      list.result.prompts.map((prompt) => prompt.name).sort(),
      ['author_skill', 'evaluate_skill', 'use_skill'],
    );

    const use = await server.rpc('prompts/get', {
      name: 'use_skill',
      arguments: { skill: 'delivery/code-review', task: 'review the diff against main' },
    });
    const text = use.result.messages[0].content.text;
    assert.ok(text.includes('code-review'), 'the use_skill prompt must mention the requested skill');
    assert.ok(text.includes('review the diff against main'), 'the use_skill prompt must embed the task');

    const author = await server.rpc('prompts/get', {
      name: 'author_skill',
      arguments: { name: 'demo-skill', domain: 'auxiliary', description: 'Demo skill for the contract test.' },
    });
    assert.ok(author.result.messages[0].content.text.includes('demo-skill'));

    const evaluate = await server.rpc('prompts/get', { name: 'evaluate_skill', arguments: { skill: 'delivery/code-review' } });
    assert.ok(evaluate.result.messages[0].content.text.includes('code-review'));

    const unknown = await server.rpc('prompts/get', { name: 'nope', arguments: {} });
    assert.ok(unknown.error);
    assert.equal(unknown.error.code, -32601);
  } catch (err) {
    t.diagnostic(`prompts failed: ${err.message}`);
    throw err;
  } finally {
    server.child.kill();
  }
});

// Regression: a client that pipes its requests and closes stdin must not lose
// in-flight responses. Handlers that yield on real I/O (file reads) used to be
// killed by the stdin 'end' handler exiting the process before they answered.
test('stdio responses survive a closed stdin', () => {
  const input = [
    JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_skill', arguments: { skill: 'delivery/code-review' } } }),
    JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'resources/read', params: { uri: 'skill://registry' } }),
  ].join('\n') + '\n';
  const result = spawnSync('node', [SERVER_SCRIPT, '--stdio'], {
    cwd: REPO_ROOT,
    input,
    encoding: 'utf8',
    timeout: 60000,
  });
  if (result.error) throw result.error;
  if (result.signal) {
    assert.fail(`server was killed by signal ${result.signal} after ${result.timeout ?? 'n/a'}ms before it could flush both responses`);
  }
  assert.equal(result.status, 0, result.stderr);
  const lines = result.stdout.split('\n').filter((line) => line.trim() !== '');
  assert.equal(lines.length, 2, 'both async responses must arrive before the process ends');
  const responses = lines.map((line) => JSON.parse(line));
  // JSON-RPC over stdio does not guarantee that responses arrive in request
  // order: resources/read does real file I/O and can answer after tools/call.
  // Pair the responses by id so the regression (a dropped response) is caught
  // without assuming any particular arrival order.
  const byId = new Map(responses.map((response) => [response.id, response]));
  const getSkill = byId.get(1);
  const registry = byId.get(2);
  assert.ok(getSkill?.result, 'get_skill must return a result, not be cut off by the exit');
  assert.equal(byId.size, 2, 'both responses must be present with distinct request ids');
  const contents = registry?.result?.contents;
  assert.ok(Array.isArray(contents) && contents.length > 0, 'resources/read must return at least one content item');
  assert.ok(contents[0].text.includes('quirk-skills'));
});

test('CLI --demo --json prints the three protocol steps', () => {
  const result = spawnSync('node', [SERVER_SCRIPT, '--demo', '--json'], { cwd: REPO_ROOT, encoding: 'utf8', timeout: 30000 });
  assert.equal(result.status, 0, result.stderr);
  const steps = JSON.parse(result.stdout);
  assert.deepEqual(steps.map((entry) => entry.step), ['initialize', 'tools/list', 'tools/call']);
  assert.equal(steps[0].response.result.serverInfo.name, 'skill-lab');
  assert.equal(steps[1].response.result.tools.length, 9);
  const routed = JSON.parse(steps[2].response.result.content[0].text);
  assert.ok(routed.results.length >= 1);
});

test('flight recorder traces a tool call with hashes and redacted payloads', { timeout: 15000 }, async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-recorder-'));
  const traceFile = path.join(dir, 'trace.jsonl');
  const recorder = spawn('node', [
    RECORDER_SCRIPT,
    '--stdio',
    '--command', `node ${SERVER_SCRIPT} --stdio`,
    '--out', traceFile,
    '--fresh',
  ], { cwd: REPO_ROOT, stdio: ['pipe', 'pipe', 'pipe'] });

  try {
    const session = stdioSession(recorder, 8000);
    const response = await session.rpc('tools/call', {
      name: 'route_task',
      arguments: { task: 'review the changes and publish findings', authorization: 'sentinel-gamma' },
    });
    assert.ok(response.result, 'the recorder must forward the server response');
    const payload = JSON.parse(response.result.content[0].text);
    assert.ok(payload.results.length >= 1);

    await waitFor(() => {
      try {
        const lines = fs.readFileSync(traceFile, 'utf8').split('\n').filter((line) => line.trim() !== '');
        return lines.length >= 2;
      } catch {
        return false;
      }
    }, 4000);

    const entries = fs.readFileSync(traceFile, 'utf8')
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => JSON.parse(line));

    const inbound = entries.filter((entry) => entry.direction === 'in');
    const outbound = entries.filter((entry) => entry.direction === 'out');
    assert.ok(inbound.length >= 1, 'the trace must contain inbound messages');
    assert.ok(outbound.length >= 1, 'the trace must contain outbound messages');
    assert.match(inbound[0].inputHash, /^[a-f0-9]{64}$/, 'inputHash must be a sha256 hex digest');
    assert.match(outbound[0].outputHash, /^[a-f0-9]{64}$/, 'outputHash must be a sha256 hex digest');
    assert.equal(outbound[0].errorCode, null);
    assert.equal(outbound[0].toolName, 'route_task');
    assert.equal(outbound[0].method, 'tools/call');
    assert.equal(outbound[0].traceId, inbound[0].traceId, 'a response keeps the traceId of its request');
    assert.equal(typeof outbound[0].durationMs, 'number');

    const raw = fs.readFileSync(traceFile, 'utf8');
    assert.ok(!raw.includes('sentinel-gamma'), 'the trace file must never contain a redacted payload value');
    assert.ok(!raw.includes('route_task result'), 'the trace file must never contain raw output payloads');

    const replay = spawnSync('node', [RECORDER_SCRIPT, '--replay', traceFile, '--json'], { encoding: 'utf8', timeout: 15000 });
    assert.equal(replay.status, 0, replay.stderr);
    const replayed = JSON.parse(replay.stdout);
    assert.equal(replayed.length, entries.length);
    assert.ok(replayed.some((entry) => entry.direction === 'in'));
  } catch (err) {
    t.diagnostic(`flight recorder failed: ${err.message}`);
    throw err;
  } finally {
    recorder.kill();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
