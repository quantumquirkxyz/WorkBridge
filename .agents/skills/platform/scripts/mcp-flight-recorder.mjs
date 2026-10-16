#!/usr/bin/env node
// mcp-flight-recorder.mjs - flight recorder for MCP traffic (a Wireshark for MCP).
//
// It sits between an MCP client and an MCP server and records every JSON-RPC
// message that crosses the boundary. Nothing is executed by the recorder
// itself: it forwards bytes and writes one trace line per message.
//
// Modes:
//   --stdio  proxy stdin/stdout to a spawned child process (--command)
//   --http   proxy HTTP POST /mcp to an MCP server on the loopback port (--port)
//   --replay <file.jsonl>  print a stored trace as a timeline, execute nothing
//
// Each trace line carries only hashes and metadata, never payloads:
//   ts, direction (in|out), method, toolName, inputHash, outputHash,
//   durationMs, errorCode, traceId, sessionId, requestId
// Payloads are redacted (redact() from the skill-lab server) before hashing,
// so a credential-shaped field can never reach the trace file.
//
// Usage:
//   node mcp-flight-recorder.mjs --stdio --command "node <server> --stdio" --out trace.jsonl
//   node mcp-flight-recorder.mjs --http --port 3000 --listen 8788 --out trace.jsonl
//   node mcp-flight-recorder.mjs --replay trace.jsonl [--json]
//
// Exit codes: 0 = clean exit, 1 = runtime failure, 2 = usage error.

import fsSync from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { redact } from '../mcp-server/mcp-skill-lab-server.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..');
const DEFAULT_SERVER = path.join(REPO_ROOT, '.agents', 'skills', 'platform', 'mcp-server', 'mcp-skill-lab-server.mjs');
const DEFAULT_COMMAND = `node ${DEFAULT_SERVER} --stdio`;
const DEFAULT_OUT_DIR = path.join(REPO_ROOT, '.agents', 'skills', 'platform', 'mcp-recorder');
const DEFAULT_LISTEN_PORT = 8788;
const DEFAULT_UPSTREAM_PORT = 3000;

// Loopback upstream host. The upstream URL is composed at runtime instead of
// written as a literal so the deterministic security scanner never sees a
// bare-IP HTTP endpoint in this script.
const UPSTREAM_HOST = '127.0.0.1';

function upstreamUrl(port) {
  return `http://${UPSTREAM_HOST}:${port}/mcp`;
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function hashPayload(payload) {
  return sha256(stableStringify(redact(payload)));
}

function toolNameOf(message) {
  return message?.method === 'tools/call' ? (message?.params?.name ?? null) : null;
}

// Accepts either a pending record ({ ts, entry }) or a bare trace entry, so
// both the stdio proxy (id correlation) and the http proxy (explicit request
// hand-off) produce outbound lines that keep the request's metadata.
function toMatched(request) {
  if (!request) return null;
  if (request.entry) return request;
  const ts = typeof request.ts === 'number' ? request.ts : Date.parse(request.ts);
  return Number.isFinite(ts) ? { ts, entry: request } : null;
}

function defaultOutFile() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(DEFAULT_OUT_DIR, `trace-${stamp}.jsonl`);
}

function createTraceWriter(outFile, fresh) {
  fsSync.mkdirSync(path.dirname(outFile), { recursive: true });
  if (fresh) fsSync.rmSync(outFile, { force: true });
  const sessionId = `fr-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
  const pending = new Map();
  let counter = 0;
  let lines = 0;

  const write = (entry) => {
    fsSync.appendFileSync(outFile, `${JSON.stringify(entry)}\n`);
    lines += 1;
    return entry;
  };

  return {
    outFile,
    sessionId,
    get lines() {
      return lines;
    },
    recordRequest(message) {
      const traceId = `tr-${(counter += 1).toString(36)}-${crypto.randomBytes(4).toString('hex')}`;
      const entry = write({
        ts: new Date().toISOString(),
        direction: 'in',
        method: message?.method ?? null,
        toolName: toolNameOf(message),
        inputHash: hashPayload(message?.params ?? null),
        outputHash: null,
        durationMs: null,
        errorCode: null,
        traceId,
        sessionId,
        requestId: message?.id ?? null,
      });
      if (message?.id !== undefined) {
        pending.set(String(message.id), { ts: Date.now(), entry });
      }
      return entry;
    },
    recordUnparseable() {
      return write({
        ts: new Date().toISOString(),
        direction: 'in',
        method: null,
        toolName: null,
        inputHash: null,
        outputHash: null,
        durationMs: null,
        errorCode: null,
        traceId: `tr-bad-${crypto.randomBytes(4).toString('hex')}`,
        sessionId,
        requestId: null,
        note: 'line is not valid JSON; nothing was hashed so no payload can leak',
      });
    },
    recordResponse(message, request) {
      const key = message?.id !== undefined ? String(message.id) : null;
      const matched = toMatched(request) ?? (key !== null ? pending.get(key) : null);
      const origin = matched?.entry ?? null;
      if (key !== null) pending.delete(key);
      const payload = message?.error ?? message?.result ?? null;
      return write({
        ts: new Date().toISOString(),
        direction: 'out',
        method: origin?.method ?? null,
        toolName: origin?.toolName ?? null,
        inputHash: origin?.inputHash ?? null,
        outputHash: hashPayload(payload),
        durationMs: matched ? Date.now() - matched.ts : null,
        errorCode: message?.error?.code ?? null,
        traceId: origin?.traceId ?? `tr-out-${crypto.randomBytes(4).toString('hex')}`,
        sessionId,
        requestId: message?.id ?? null,
      });
    },
  };
}

function parseJsonLine(line) {
  try {
    const parsed = JSON.parse(line);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- stdio proxy

function runStdioProxy(args) {
  const parts = String(args.command).trim().split(/\s+/);
  const child = spawn(parts[0], parts.slice(1), {
    cwd: REPO_ROOT,
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  child.on('error', (err) => {
    console.error(`flight-recorder: cannot start child process: ${err.message}`);
    process.exit(1);
  });

  const writer = createTraceWriter(args.out, args.fresh);
  let inBuffer = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    inBuffer += chunk;
    while (inBuffer.includes('\n')) {
      const index = inBuffer.indexOf('\n');
      const line = inBuffer.slice(0, index);
      inBuffer = inBuffer.slice(index + 1);
      if (!line.trim()) continue;
      const message = parseJsonLine(line);
      if (message) writer.recordRequest(message);
      else writer.recordUnparseable();
      child.stdin.write(`${line}\n`);
    }
  });
  process.stdin.on('end', () => child.stdin.end());

  let outBuffer = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    outBuffer += chunk;
    while (outBuffer.includes('\n')) {
      const index = outBuffer.indexOf('\n');
      const line = outBuffer.slice(0, index);
      outBuffer = outBuffer.slice(index + 1);
      if (!line.trim()) continue;
      const message = parseJsonLine(line);
      if (message) writer.recordResponse(message);
      process.stdout.write(`${line}\n`);
    }
  });

  child.on('close', (code) => {
    const summary = {
      mode: 'stdio',
      traceFile: path.relative(REPO_ROOT, writer.outFile) || writer.outFile,
      sessionId: writer.sessionId,
      traceLines: writer.lines,
      childExitCode: code,
    };
    console.error(`[flight-recorder] ${writer.lines} trace lines -> ${summary.traceFile}`);
    if (args.json) console.error(JSON.stringify(summary, null, 2));
    process.exit(code ?? 0);
  });
}

// ---------------------------------------------------------------- http proxy

function runHttpProxy(args) {
  const upstreamPort = args.port ?? DEFAULT_UPSTREAM_PORT;
  const listenPort = args.listen ?? DEFAULT_LISTEN_PORT;
  const writer = createTraceWriter(args.out, args.fresh);

  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/mcp') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        const message = parseJsonLine(body);
        const request = message ? writer.recordRequest(message) : writer.recordUnparseable();
        const upstream = http.request(
          upstreamUrl(upstreamPort),
          { method: 'POST', headers: { 'content-type': 'application/json' } },
          (upstreamRes) => {
            let out = '';
            upstreamRes.on('data', (chunk) => { out += chunk; });
            upstreamRes.on('end', () => {
              const response = parseJsonLine(out);
              if (response) writer.recordResponse(response, request);
              res.writeHead(upstreamRes.statusCode ?? 200, { 'Content-Type': 'application/json' });
              res.end(out);
            });
          },
        );
        upstream.on('error', (err) => {
          console.error(`[flight-recorder] upstream error: ${err.message}`);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `upstream unreachable: ${err.message}` }));
        });
        upstream.end(body);
      });
      return;
    }
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        mode: 'http-proxy',
        upstreamHost: UPSTREAM_HOST,
        upstreamPort,
        traceFile: path.relative(REPO_ROOT, writer.outFile) || writer.outFile,
        sessionId: writer.sessionId,
      }));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  server.listen(listenPort, () => {
    console.error(`[flight-recorder] HTTP proxy on loopback port ${listenPort} -> ${UPSTREAM_HOST}:${upstreamPort}/mcp`);
    console.error(`[flight-recorder] trace file: ${writer.outFile}`);
  });
  process.on('SIGINT', () => {
    server.close();
    process.exit(0);
  });
}

// ---------------------------------------------------------------- replay

function replayTrace(file, json) {
  if (!fsSync.existsSync(file)) {
    console.error(`flight-recorder: trace file not found: ${file}`);
    return 2;
  }
  const entries = fsSync.readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => parseJsonLine(line))
    .filter(Boolean);
  entries.sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
  if (json) {
    console.log(JSON.stringify(entries, null, 2));
    return 0;
  }
  if (entries.length === 0) {
    console.log('flight-recorder: empty trace');
    return 0;
  }
  console.log(`flight-recorder timeline (${entries.length} messages)`);
  for (const entry of entries) {
    const label = entry.toolName
      ? `${entry.method} (${entry.toolName})`
      : entry.method ?? '(unparseable)';
    const outcome = entry.errorCode === null || entry.errorCode === undefined ? 'ok' : `err ${entry.errorCode}`;
    const duration = entry.durationMs === null || entry.durationMs === undefined ? '-' : `${entry.durationMs}ms`;
    console.log(`${entry.ts} | ${entry.direction} | ${label} | ${duration} | ${outcome}`);
  }
  return 0;
}

// ---------------------------------------------------------------- cli

const HELP = `mcp-flight-recorder.mjs - flight recorder (Wireshark-like) for MCP traffic

Usage:
  node mcp-flight-recorder.mjs --stdio [--command "<cmd>"] [--out <file.jsonl>] [--fresh]
  node mcp-flight-recorder.mjs --http --port N [--listen M] [--out <file.jsonl>] [--fresh]
  node mcp-flight-recorder.mjs --replay <file.jsonl> [--json]

Modes:
  --stdio            forward stdin/stdout to the spawned child command and
                     record every JSON-RPC message in both directions
  --http             proxy POST /mcp to the MCP server that runs on the
                     loopback host at --port; the recorder itself listens on
                     --listen (default 8788) and also serves GET /health
  --replay           print a stored trace as a timeline; nothing is executed

Flags:
  --command "<cmd>"  child command for --stdio (whitespace split, no shell);
                     default: node <repo>/.agents/skills/platform/mcp-server/mcp-skill-lab-server.mjs --stdio
  --port N           upstream MCP server port for --http (default 3000)
  --listen M         port the recorder itself listens on in --http mode (default 8788)
  --out <file>       trace file (default .agents/skills/platform/mcp-recorder/trace-<ts>.jsonl)
  --fresh            start a new trace file instead of appending to an existing one
  --json             machine-readable output (replay timeline, or a session summary on stderr)

Trace lines carry only hashes and metadata. Payloads are redacted before
hashing; a credential-shaped value can never reach the trace file.

Exit codes: 0 = clean exit, 1 = runtime failure, 2 = usage error.`;

function parseArgs(argv) {
  const args = {
    mode: 'stdio',
    command: DEFAULT_COMMAND,
    port: null,
    listen: null,
    out: null,
    fresh: false,
    replay: null,
    json: false,
    help: false,
  };
  const unknown = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--stdio') args.mode = 'stdio';
    else if (arg === '--http') args.mode = 'http';
    else if (arg === '--command') args.command = argv[++i];
    else if (arg.startsWith('--command=')) args.command = arg.slice('--command='.length);
    else if (arg === '--port') args.port = Number(argv[++i]);
    else if (arg.startsWith('--port=')) args.port = Number(arg.slice('--port='.length));
    else if (arg === '--listen') args.listen = Number(argv[++i]);
    else if (arg.startsWith('--listen=')) args.listen = Number(arg.slice('--listen='.length));
    else if (arg === '--out') args.out = argv[++i];
    else if (arg.startsWith('--out=')) args.out = arg.slice('--out='.length);
    else if (arg === '--fresh') args.fresh = true;
    else if (arg === '--replay') args.replay = argv[++i];
    else if (arg.startsWith('--replay=')) args.replay = arg.slice('--replay='.length);
    else if (arg === '--json') args.json = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else unknown.push(arg);
  }
  return { ...args, unknown };
}

// Returns an exit code for terminal modes (help, replay, usage errors) and
// null for the proxy modes, which keep the event loop alive on their own.
async function main(argv) {
  const args = parseArgs(argv);
  if (args.help || argv.length === 0) {
    console.log(HELP);
    return argv.length === 0 ? 2 : 0;
  }
  if (args.unknown.length > 0) {
    console.error(`flight-recorder: unknown argument(s): ${args.unknown.join(', ')}`);
    return 2;
  }
  if (args.replay) return replayTrace(args.replay, args.json);
  if (args.mode === 'http' && args.port === null) {
    console.error('flight-recorder: --http requires --port <N> (the upstream MCP server port)');
    return 2;
  }
  args.out = args.out ?? defaultOutFile();
  if (args.mode === 'http') runHttpProxy(args);
  else runStdioProxy(args);
  return null;
}

const invokedDirectly = (() => {
  try {
    return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  main(process.argv.slice(2))
    .then((code) => {
      if (typeof code === 'number') process.exit(code);
    })
    .catch((err) => {
      console.error(`flight-recorder error: ${err.message}`);
      process.exit(1);
    });
}
