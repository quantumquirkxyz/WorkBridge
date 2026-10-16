#!/usr/bin/env node
// mcp-skill-lab-server.mjs - unified MCP server for the quirk Skills bundle.
//
// One file, zero dependencies, two transports:
//   --stdio   newline-delimited JSON-RPC 2.0 over stdin/stdout (like server.mjs)
//   --port N  HTTP POST /mcp plus GET /health (like mcp-skills-server.mjs)
// Default transport when neither flag is passed is stdio.
//
// It joins what the two production servers keep apart:
//   - the full tool surface (list/get/search/route/validate/gate/registry/policy/explain)
//   - resources (registry, catalog, skill, fixtures, manifest) with a path guard
//   - prompts with a working prompts/get (server.mjs only implements prompts/list)
//   - deterministic --demo mode for tests and CI
//
// Security contract (mirrors the foundation/mcp-server skill):
//   - skills with trustTier > 3 are never exposed unless allowHighTrust: true is
//     passed explicitly; the excluded set is reported in every tools/list
//     response under excludedHighTrust[] and logged at startup.
//   - every tool payload passes through redact() before it reaches a client.
//   - resource URIs are resolved inside the repository; traversal attempts fail
//     with -32002 instead of reading the file.
//
// Usage:
//   node mcp-skill-lab-server.mjs --stdio
//   node mcp-skill-lab-server.mjs --port 8787
//   node mcp-skill-lab-server.mjs --demo --json
//   node mcp-skill-lab-server.mjs --help
//
// Exit codes: 0 = clean exit, 1 = runtime failure, 2 = usage error.

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter, collectSkills, buildGraphFromSkills, rank, tokenize } from '../skill-graph.mjs';
import { bm25Scores } from '../scripts/build-skill-index.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..');
const SKILLS_ROOT = path.join(REPO_ROOT, '.agents', 'skills');
const PLATFORM_DIR = path.join(SKILLS_ROOT, 'platform');
const MANIFESTS_DIR = path.join(PLATFORM_DIR, 'manifests');
const FIXTURES_DIR = path.join(PLATFORM_DIR, 'fixtures');
const INDEX_FILE = path.join(PLATFORM_DIR, 'index', 'skill-index.json');
const REGISTRY_FILE = path.join(REPO_ROOT, 'registry.yaml');
const CATALOG_FILE = path.join(REPO_ROOT, 'CATALOG.md');
const LOCK_FILE = path.join(REPO_ROOT, 'skills-lock.json');
const PACKAGE_FILE = path.join(REPO_ROOT, 'package.json');
const EVALS_DIR = path.join(REPO_ROOT, 'evals');

const PROTOCOL_VERSION = '2024-11-05';
const SERVER_NAME = 'skill-lab';
const MAX_TRUST_TIER = 3;
const REDACTED = '[REDACTED]';
const DEMO_TASK = 'review the changes since a fixed point and publish the findings along the standards and spec axes';

const REDACT_KEY_PATTERNS = [
  'authorization',
  'api_key',
  'api-key',
  'apikey',
  'token',
  'secret',
  'password',
  'cookie',
  'set-cookie',
];

// ---------------------------------------------------------------- redaction

function isSensitiveKey(key) {
  const lower = String(key).toLowerCase();
  return REDACT_KEY_PATTERNS.some((pattern) => lower.includes(pattern));
}

export function redact(value) {
  if (Array.isArray(value)) return value.map((entry) => redact(entry));
  if (value !== null && typeof value === 'object') {
    const out = {};
    for (const [key, entry] of Object.entries(value)) {
      out[key] = isSensitiveKey(key) ? REDACTED : redact(entry);
    }
    return out;
  }
  return value;
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// ---------------------------------------------------------------- rpc errors

export class RpcError extends Error {
  constructor(code, message, data) {
    super(message);
    this.name = 'RpcError';
    this.code = code;
    this.data = data;
  }
}

function errorResponse(id, code, message, data) {
  const error = { code, message };
  if (data !== undefined) error.data = data;
  return { jsonrpc: '2.0', id: id ?? null, error };
}

// ---------------------------------------------------------------- context

const context = {
  loaded: false,
  root: REPO_ROOT,
  skills: [],
  skillsById: new Map(),
  skillsByName: new Map(),
  allSkillNames: new Set(),
  graph: null,
  index: null,
  lock: {},
  registry: null,
  version: '0.0.0',
  manifestCache: new Map(),
};

function readJsonFile(file) {
  try {
    return JSON.parse(fsSync.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function collectAllSkillNames(dir, out = new Set()) {
  let entries;
  try {
    entries = fsSync.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const child = path.join(dir, entry.name);
    if (fsSync.existsSync(path.join(child, 'SKILL.md'))) out.add(entry.name);
    else collectAllSkillNames(child, out);
  }
  return out;
}

function loadContext() {
  if (context.loaded) return context;
  context.skills = collectSkills(REPO_ROOT);
  for (const skill of context.skills) {
    context.skillsById.set(`${skill.domain}/${skill.name}`, skill);
    if (!context.skillsByName.has(skill.name)) context.skillsByName.set(skill.name, skill);
  }
  context.allSkillNames = collectAllSkillNames(SKILLS_ROOT);
  context.graph = buildGraphFromSkills(context.skills);
  context.index = readJsonFile(INDEX_FILE);
  const lock = readJsonFile(LOCK_FILE);
  context.lock = lock?.skills ?? {};
  context.registry = readJsonFile(REGISTRY_FILE);
  const pkg = readJsonFile(PACKAGE_FILE);
  context.version = pkg?.version ?? context.registry?.version ?? '0.0.0';
  context.loaded = true;
  return context;
}

function tierOf(skill) {
  return Number(skill.tier) || 1;
}

function isHighTrust(skill) {
  return tierOf(skill) > MAX_TRUST_TIER;
}

function skillIdOf(skill) {
  return `${skill.domain}/${skill.name}`;
}

function highTrustNames(skills = context.skills) {
  return skills.filter(isHighTrust).map(skillIdOf).sort();
}

function visibleSkills(args = {}) {
  loadContext();
  return args.allowHighTrust === true
    ? context.skills
    : context.skills.filter((skill) => !isHighTrust(skill));
}

function resolveSkill(skillId) {
  loadContext();
  const id = String(skillId ?? '').trim();
  if (!id) return null;
  return context.skillsById.get(id) ?? context.skillsByName.get(id.split('/').pop()) ?? null;
}

function requireVisible(skill, args = {}) {
  if (isHighTrust(skill) && args.allowHighTrust !== true) {
    throw new RpcError(
      -32002,
      `skill ${skillIdOf(skill)} declares trustTier ${skill.tier} (> ${MAX_TRUST_TIER}) and is not exposed by default; pass allowHighTrust: true to override`,
    );
  }
  return skill;
}

function toList(value) {
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return String(value).split(',').map((entry) => entry.trim()).filter(Boolean);
}

function toBoolean(value) {
  return value === true || String(value).toLowerCase() === 'true';
}

function clampLimit(value, fallback, max) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), max) : fallback;
}

function resolveWithin(base, relativePath) {
  const target = path.resolve(base, relativePath);
  const rel = path.relative(base, target);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return target;
}

function readManifest(domain, name) {
  const key = `${domain}/${name}`;
  if (context.manifestCache.has(key)) return context.manifestCache.get(key);
  const file = path.join(MANIFESTS_DIR, `${domain}-${name}.runtime.json`);
  const value = readJsonFile(file);
  context.manifestCache.set(key, value);
  return value;
}

function logExclusions(skills) {
  const excluded = highTrustNames(skills);
  if (excluded.length > 0) {
    console.error(`[${SERVER_NAME}] excluded high-trust skills (trustTier > ${MAX_TRUST_TIER}): ${excluded.join(', ')}`);
  }
  return excluded;
}

// ---------------------------------------------------------------- param check

function validateParams(schema, params) {
  const value = params === undefined || params === null ? {} : params;
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new RpcError(-32602, 'invalid params: expected an object');
  }
  const properties = schema.properties ?? {};
  for (const key of schema.required ?? []) {
    if (value[key] === undefined) {
      throw new RpcError(-32602, `invalid params: missing required parameter "${key}"`);
    }
  }
  for (const [key, entry] of Object.entries(value)) {
    const spec = properties[key];
    if (!spec || entry === undefined || entry === null) continue;
    const actual = Array.isArray(entry) ? 'array' : typeof entry;
    if (spec.type && actual !== spec.type) {
      throw new RpcError(-32602, `invalid params: "${key}" must be of type ${spec.type}`);
    }
    if (Array.isArray(spec.enum) && !spec.enum.includes(entry)) {
      throw new RpcError(-32602, `invalid params: "${key}" must be one of ${spec.enum.join(', ')}`);
    }
  }
  return value;
}

// ---------------------------------------------------------------- tools

const TOOLS = {
  list_skills: {
    description:
      'List bundle skills with optional domain and trustTier filters. Skills with trustTier > 3 are excluded unless allowHighTrust is true.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: { type: 'string', description: 'Only skills in this domain (for example "delivery")' },
        trustTier: { type: 'string', description: 'Only skills with this trust tier (for example "1")' },
        allowHighTrust: { type: 'boolean', description: 'Expose skills with trustTier > 3 as well' },
      },
    },
    handler: (args) => {
      let skills = visibleSkills(args);
      if (args.domain) skills = skills.filter((skill) => skill.domain === args.domain);
      if (args.trustTier !== undefined) {
        skills = skills.filter((skill) => String(skill.tier) === String(args.trustTier));
      }
      return {
        total: skills.length,
        excludedHighTrust: highTrustNames(),
        skills: skills.map((skill) => ({
          skill: skillIdOf(skill),
          name: skill.name,
          domain: skill.domain,
          description: skill.description,
          trustTier: skill.tier,
          artifactType: skill.artifactType,
          capabilities: skill.capabilities,
        })),
      };
    },
  },
  get_skill: {
    description: 'Get the parsed frontmatter and body of one skill, addressed as domain/name.',
    inputSchema: {
      type: 'object',
      properties: {
        skill: { type: 'string', description: 'Skill id as domain/name (for example "delivery/code-review")' },
        allowHighTrust: { type: 'boolean', description: 'Allow reading a skill with trustTier > 3' },
      },
      required: ['skill'],
    },
    handler: async (args) => {
      const skill = resolveSkill(args.skill);
      if (!skill) throw new RpcError(-32002, `skill not found: ${args.skill}`);
      requireVisible(skill, args);
      const file = path.join(REPO_ROOT, skill.path, 'SKILL.md');
      const text = await fs.readFile(file, 'utf8');
      return {
        skill: skillIdOf(skill),
        name: skill.name,
        domain: skill.domain,
        path: skill.path,
        trustTier: skill.tier,
        description: skill.description,
        frontmatter: parseFrontmatter(text),
        body: skill.body,
      };
    },
  },
  search_skills: {
    description:
      'Search skills by query. Uses the BM25 index at .agents/skills/platform/index/skill-index.json when present, otherwise a token-overlap fallback.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free-text query' },
        limit: { type: 'number', description: 'Maximum results (default 10, max 50)' },
        allowHighTrust: { type: 'boolean', description: 'Include skills with trustTier > 3 in the ranking' },
      },
      required: ['query'],
    },
    handler: (args) => {
      const query = String(args.query ?? '');
      const limit = clampLimit(args.limit, 10, 50);
      const skills = visibleSkills(args);
      const visibleIds = new Set(skills.map(skillIdOf));
      let ranked;
      let engine;
      if (context.index) {
        engine = 'bm25';
        ranked = bm25Scores(context.index, query)
          .filter((entry) => visibleIds.has(entry.skill))
          .map((entry) => {
            const skill = context.skillsById.get(entry.skill);
            return { skill, score: entry.score, matchedTerms: entry.matchedTerms };
          })
          .filter((entry) => entry.skill);
      } else {
        engine = 'token-overlap';
        ranked = overlapSearch(query, skills);
      }
      return {
        query,
        engine,
        total: ranked.length,
        results: ranked.slice(0, limit).map((entry) => ({
          skill: skillIdOf(entry.skill),
          name: entry.skill.name,
          domain: entry.skill.domain,
          description: entry.skill.description,
          score: entry.score,
          matchedTerms: entry.matchedTerms ?? [],
        })),
        excludedHighTrust: highTrustNames(),
      };
    },
  },
  route_task: {
    description:
      'Route a task description to the best matching skills through the shared skill graph (keyword seeds plus neighborhood activation). Returns the top 3 by default.',
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'Task description in natural language' },
        limit: { type: 'number', description: 'How many skills to return (default 3, max 10)' },
        allowHighTrust: { type: 'boolean', description: 'Allow routing to skills with trustTier > 3' },
      },
      required: ['task'],
    },
    handler: (args) => {
      const task = String(args.task ?? '');
      if (!task.trim()) throw new RpcError(-32602, 'invalid params: "task" must be a non-empty string');
      const limit = clampLimit(args.limit, 3, 10);
      const ranked = rank(context.graph, task, { limit: Math.max(limit * 5, 25) });
      const excluded = args.allowHighTrust === true ? new Set() : new Set(highTrustNames());
      const results = [];
      for (const candidate of ranked.candidates) {
        const skill = context.skillsByName.get(candidate.name);
        if (!skill || excluded.has(skillIdOf(skill))) continue;
        results.push({
          skill: skillIdOf(skill),
          name: skill.name,
          domain: skill.domain,
          score: candidate.score,
          tier: candidate.tier,
          reason: candidate.reason,
        });
        if (results.length >= limit) break;
      }
      return { task, results, excludedHighTrust: highTrustNames() };
    },
  },
  validate_skill: {
    description:
      'Run the structural checks for one skill: required frontmatter fields, skills-lock.json hash, and dependency resolution.',
    inputSchema: {
      type: 'object',
      properties: {
        skill: { type: 'string', description: 'Skill id as domain/name' },
        allowHighTrust: { type: 'boolean', description: 'Allow validating a skill with trustTier > 3' },
      },
      required: ['skill'],
    },
    handler: async (args) => {
      const skill = resolveSkill(args.skill);
      if (!skill) throw new RpcError(-32002, `skill not found: ${args.skill}`);
      requireVisible(skill, args);
      const file = path.join(REPO_ROOT, skill.path, 'SKILL.md');
      const text = await fs.readFile(file, 'utf8');
      const fm = parseFrontmatter(text);
      const checks = [];
      const missing = ['name', 'description'].filter((field) => !fm[field]);
      checks.push({
        check: 'frontmatter-required',
        ok: missing.length === 0,
        detail: missing.length === 0 ? 'name and description present' : `missing: ${missing.join(', ')}`,
      });
      const hash = sha256(text);
      const lockEntry = context.lock[skill.name];
      checks.push({
        check: 'lockfile-hash',
        ok: Boolean(lockEntry) && lockEntry.hash === hash,
        detail: !lockEntry
          ? 'no entry in skills-lock.json'
          : lockEntry.hash === hash
            ? 'sha256 matches skills-lock.json'
            : 'sha256 mismatch against skills-lock.json',
      });
      const deps = toList(fm.dependencies);
      const missingDeps = deps.filter((dep) => !context.allSkillNames.has(dep));
      checks.push({
        check: 'dependencies-exist',
        ok: missingDeps.length === 0,
        detail: missingDeps.length === 0
          ? `${deps.length} dependencies resolved`
          : `unresolved: ${missingDeps.join(', ')}`,
      });
      return {
        skill: skillIdOf(skill),
        valid: checks.every((entry) => entry.ok),
        trustTier: skill.tier,
        checks,
      };
    },
  },
  run_quality_gate: {
    description:
      'Run the repository quality gate. With no check argument it runs check-all.mjs; otherwise it runs one named checker.',
    inputSchema: {
      type: 'object',
      properties: {
        check: {
          type: 'string',
          description: 'Named checker to run instead of the full gate',
          enum: [
            'check-all',
            'validate-skills',
            'audit-semantics',
            'evaluate-scenarios',
            'evaluate-behavioral-fixtures',
            'security-scan-skills',
            'run-routing',
          ],
        },
        timeoutMs: { type: 'number', description: 'Child timeout in milliseconds (default 240000, max 600000)' },
      },
    },
    handler: async (args) => runQualityGate(args),
  },
  get_registry_info: {
    description: 'Registry metadata: version, compatible agents, skill counts, domains, and channels.',
    inputSchema: { type: 'object', properties: {} },
    handler: () => {
      const registry = context.registry ?? {};
      const version = registry.version ?? context.version;
      return {
        name: registry.name ?? 'quirk-skills',
        version,
        bundleVersion: registry.bundleVersion ?? version,
        server: { name: SERVER_NAME, version: context.version, protocolVersion: PROTOCOL_VERSION },
        skills: { bundle: context.skills.length, repo: context.allSkillNames.size },
        domains: [...new Set(context.skills.map((skill) => skill.domain))].sort(),
        compatibleAgents: registry.agents_compatible ?? registry.supportsAgents ?? [],
        channels: registry.lifecycle?.channels ?? [],
        mcpSupport: registry.mcp_support === true,
      };
    },
  },
  get_side_effect_policy: {
    description:
      'Side-effect policy for one skill: sideEffects, approvalRequired, approvalFor, risk, and trustTier, read from frontmatter with the runtime manifest as fallback.',
    inputSchema: {
      type: 'object',
      properties: {
        skill: { type: 'string', description: 'Skill id as domain/name' },
        allowHighTrust: { type: 'boolean', description: 'Allow reading the policy of a skill with trustTier > 3' },
      },
      required: ['skill'],
    },
    handler: async (args) => {
      const skill = resolveSkill(args.skill);
      if (!skill) throw new RpcError(-32002, `skill not found: ${args.skill}`);
      requireVisible(skill, args);
      const file = path.join(REPO_ROOT, skill.path, 'SKILL.md');
      const text = await fs.readFile(file, 'utf8');
      const fm = parseFrontmatter(text);
      const guardrails = readManifest(skill.domain, skill.name)?.guardrails ?? {};
      const fromFrontmatter = fm.sideEffects !== undefined || fm.approvalRequired !== undefined;
      const source = fromFrontmatter ? 'frontmatter' : Object.keys(guardrails).length > 0 ? 'runtime-manifest' : 'defaults';
      return {
        skill: skillIdOf(skill),
        sideEffects: toList(fm.sideEffects ?? guardrails.sideEffects),
        approvalRequired: toBoolean(fm.approvalRequired ?? guardrails.approvalRequired ?? false),
        approvalFor: toList(fm.approvalFor ?? guardrails.approvalFor),
        risk: String(fm.risk ?? guardrails.risk ?? 'unknown'),
        trustTier: String(fm.trustTier ?? guardrails.trustTier ?? skill.tier),
        source,
      };
    },
  },
  explain_routing: {
    description:
      'Explain why the router picked each skill for a task: the matched terms per field plus the graph reason for every candidate.',
    inputSchema: {
      type: 'object',
      properties: {
        task: { type: 'string', description: 'Task description in natural language' },
        limit: { type: 'number', description: 'How many skills to explain (default 5, max 10)' },
        allowHighTrust: { type: 'boolean', description: 'Allow explaining skills with trustTier > 3' },
      },
      required: ['task'],
    },
    handler: (args) => {
      const task = String(args.task ?? '');
      if (!task.trim()) throw new RpcError(-32602, 'invalid params: "task" must be a non-empty string');
      const limit = clampLimit(args.limit, 5, 10);
      const tokens = tokenize(task);
      const ranked = rank(context.graph, task, { limit: Math.max(limit * 5, 25) });
      const excluded = args.allowHighTrust === true ? new Set() : new Set(highTrustNames());
      const explanations = [];
      for (const candidate of ranked.candidates) {
        const skill = context.skillsByName.get(candidate.name);
        if (!skill || excluded.has(skillIdOf(skill))) continue;
        explanations.push({
          skill: skillIdOf(skill),
          score: candidate.score,
          tier: candidate.tier,
          reason: candidate.reason,
          matched: {
            name: tokens.filter((token) => skill.name.toLowerCase().includes(token)),
            capabilities: tokens.filter((token) => skill.capabilities.some((cap) => cap.toLowerCase().includes(token))),
            description: tokens.filter((token) => skill.description.toLowerCase().includes(token)),
          },
        });
        if (explanations.length >= limit) break;
      }
      return { task, queryTokens: tokens, explanations, excludedHighTrust: highTrustNames() };
    },
  },
};

export function buildToolsList(options = {}) {
  loadContext();
  const allowHighTrust = options.allowHighTrust === true;
  return {
    tools: Object.entries(TOOLS).map(([name, tool]) => ({
      name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
    excludedHighTrust: allowHighTrust ? [] : highTrustNames(),
  };
}

function overlapSearch(query, skills) {
  const tokens = tokenize(query);
  const out = [];
  for (const skill of skills) {
    const name = skill.name.toLowerCase();
    const description = skill.description.toLowerCase();
    const capabilities = skill.capabilities.map((cap) => cap.toLowerCase());
    let score = 0;
    const matched = new Set();
    for (const token of tokens) {
      if (name.includes(token)) {
        score += 3;
        matched.add(token);
      } else if (capabilities.some((cap) => cap.includes(token))) {
        score += 2;
        matched.add(token);
      } else if (description.includes(token)) {
        score += 1;
        matched.add(token);
      }
    }
    if (score > 0) out.push({ skill, score, matchedTerms: [...matched].sort() });
  }
  out.sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name));
  return out;
}

const QUALITY_CHECKS = {
  'check-all': [path.join(PLATFORM_DIR, 'check-all.mjs')],
  'validate-skills': [path.join(PLATFORM_DIR, 'validate-skills.mjs')],
  'audit-semantics': [path.join(PLATFORM_DIR, 'audit-semantics.mjs')],
  'evaluate-scenarios': [path.join(PLATFORM_DIR, 'evaluate-scenarios.mjs')],
  'evaluate-behavioral-fixtures': [path.join(PLATFORM_DIR, 'evaluate-behavioral-fixtures.mjs')],
  'security-scan-skills': [path.join(PLATFORM_DIR, 'security-scan-skills.mjs')],
  'run-routing': [path.join(EVALS_DIR, 'run-routing.mjs'), '--check'],
};

function runProcess(command, args, timeoutMs) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(command, args, { cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut, durationMs: Date.now() - started });
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ code: 1, stdout, stderr: `${stderr}${err.message}`, timedOut, durationMs: Date.now() - started });
    });
  });
}

async function runQualityGate(args) {
  const check = args.check ? String(args.check) : 'check-all';
  const entry = QUALITY_CHECKS[check];
  if (!entry) {
    throw new RpcError(-32602, `unknown check: ${check} (known: ${Object.keys(QUALITY_CHECKS).join(', ')})`);
  }
  const timeoutMs = clampLimit(args.timeoutMs, 240000, 600000);
  const outcome = await runProcess('node', entry, timeoutMs);
  let report = null;
  try {
    report = JSON.parse(outcome.stdout);
  } catch {
    report = null;
  }
  return {
    check,
    status: outcome.timedOut ? 'timeout' : outcome.code === 0 ? 'pass' : 'fail',
    exitCode: outcome.code,
    timedOut: outcome.timedOut,
    durationMs: outcome.durationMs,
    report: report ? redact(report) : null,
    stdoutTail: report ? null : redact({ text: outcome.stdout.slice(-2000) }).text,
    stderrTail: redact({ text: outcome.stderr.slice(-500) }).text,
  };
}

// ---------------------------------------------------------------- resources

function mimeTypeOf(file) {
  return file.endsWith('.json') ? 'application/json' : 'text/markdown';
}

function fixtureEntries() {
  const out = [];
  let types;
  try {
    types = fsSync.readdirSync(FIXTURES_DIR, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const type of types) {
    if (!type.isDirectory()) continue;
    let files;
    try {
      files = fsSync.readdirSync(path.join(FIXTURES_DIR, type.name));
    } catch {
      continue;
    }
    for (const file of files.filter((name) => name.endsWith('.json')).sort()) {
      out.push({ type: type.name, name: file.replace(/\.json$/, '') });
    }
  }
  return out;
}

function listResources(options = {}) {
  loadContext();
  const skills = options.allowHighTrust === true
    ? context.skills
    : context.skills.filter((skill) => !isHighTrust(skill));
  const resources = [
    {
      uri: 'skill://registry',
      name: 'Skills registry',
      description: 'registry.yaml of the bundle (JSON syntax), pretty printed',
      mimeType: 'application/json',
    },
    {
      uri: 'skill://catalog',
      name: 'Skills catalog',
      description: 'CATALOG.md overview of every bundle skill',
      mimeType: 'text/markdown',
    },
  ];
  for (const skill of skills) {
    resources.push({
      uri: `skill://skill/${skillIdOf(skill)}`,
      name: `${skill.name} SKILL.md`,
      description: skill.description,
      mimeType: 'text/markdown',
    });
  }
  for (const skill of skills) {
    const file = path.join(MANIFESTS_DIR, `${skill.domain}-${skill.name}.runtime.json`);
    if (!fsSync.existsSync(file)) continue;
    resources.push({
      uri: `skill://manifest/${skillIdOf(skill)}`,
      name: `${skill.name} runtime manifest`,
      description: `Runtime manifest for ${skillIdOf(skill)}`,
      mimeType: 'application/json',
    });
  }
  for (const fixture of fixtureEntries()) {
    resources.push({
      uri: `skill://fixtures/${fixture.type}/${fixture.name}`,
      name: `${fixture.type} fixture ${fixture.name}`,
      description: `Fixture (${fixture.type}) for ${fixture.name}`,
      mimeType: 'application/json',
    });
  }
  return resources;
}

async function readRegistryText() {
  const text = await fs.readFile(REGISTRY_FILE, 'utf8');
  try {
    return `${JSON.stringify(JSON.parse(text), null, 2)}\n`;
  } catch {
    return text;
  }
}

async function readResource(uri, options = {}) {
  loadContext();
  const raw = String(uri ?? '');
  if (!raw.startsWith('skill://')) {
    throw new RpcError(-32002, `unsupported resource URI scheme: ${raw}`);
  }
  const rest = raw.slice('skill://'.length);
  if (rest === 'registry') {
    return { uri: raw, mimeType: 'application/json', text: await readRegistryText() };
  }
  if (rest === 'catalog') {
    return { uri: raw, mimeType: 'text/markdown', text: await fs.readFile(CATALOG_FILE, 'utf8') };
  }
  const parts = rest.split('/').filter((part) => part !== '');
  if (parts.some((part) => part === '.' || part === '..')) {
    throw new RpcError(-32002, `path traversal blocked: ${raw}`);
  }
  if (parts[0] === 'skill') {
    const [, domain, name, ...fileParts] = parts;
    const skill = context.skills.find((entry) => entry.domain === domain && entry.name === name);
    if (!skill) throw new RpcError(-32002, `skill not found: ${domain}/${name}`);
    requireVisible(skill, options);
    const relative = fileParts.length > 0 ? fileParts.join('/') : 'SKILL.md';
    const file = resolveWithin(path.join(REPO_ROOT, skill.path), relative);
    if (!file) throw new RpcError(-32002, `path traversal blocked: ${raw}`);
    if (!fsSync.existsSync(file)) throw new RpcError(-32002, `resource not found: ${raw}`);
    return { uri: raw, mimeType: mimeTypeOf(file), text: await fs.readFile(file, 'utf8') };
  }
  if (parts[0] === 'fixtures') {
    const [, type, ...nameParts] = parts;
    if (nameParts.length === 0) throw new RpcError(-32002, `resource not found: ${raw}`);
    const name = nameParts.join('/');
    const fileName = name.endsWith('.json') ? name : `${name}.json`;
    const file = resolveWithin(path.join(FIXTURES_DIR, type), fileName);
    if (!file) throw new RpcError(-32002, `path traversal blocked: ${raw}`);
    if (!fsSync.existsSync(file)) throw new RpcError(-32002, `resource not found: ${raw}`);
    return { uri: raw, mimeType: 'application/json', text: await fs.readFile(file, 'utf8') };
  }
  if (parts[0] === 'manifest') {
    const [, domain, ...nameParts] = parts;
    const name = nameParts.join('/').replace(/\.runtime\.json$/, '').replace(/\.json$/, '');
    if (!domain || !name) throw new RpcError(-32002, `resource not found: ${raw}`);
    const file = resolveWithin(MANIFESTS_DIR, `${domain}-${name}.runtime.json`);
    if (!file) throw new RpcError(-32002, `path traversal blocked: ${raw}`);
    if (!fsSync.existsSync(file)) throw new RpcError(-32002, `manifest not found: ${raw}`);
    return { uri: raw, mimeType: 'application/json', text: await fs.readFile(file, 'utf8') };
  }
  throw new RpcError(-32002, `unknown resource URI: ${raw}`);
}

// ---------------------------------------------------------------- prompts

const PROMPTS = {
  use_skill: {
    description: 'Prompt that instructs an agent to apply one bundle skill to a concrete task.',
    arguments: [
      { name: 'skill', description: 'Skill id as domain/name', required: true },
      { name: 'task', description: 'Task the skill must be applied to', required: true },
    ],
    build: async (args) => {
      const skill = resolveSkill(args.skill);
      if (!skill) throw new RpcError(-32002, `skill not found: ${args.skill}`);
      requireVisible(skill, args);
      const file = path.join(REPO_ROOT, skill.path, 'SKILL.md');
      const text = await fs.readFile(file, 'utf8');
      const fm = parseFrontmatter(text);
      const approvalFor = toList(fm.approvalFor);
      return [
        `Apply the quirk skill "${skill.name}" (domain: ${skill.domain}) to the task below.`,
        '',
        `Skill description: ${skill.description}`,
        `Declared trust tier: ${skill.tier}. Declared risk: ${fm.risk ?? 'unknown'}.`,
        approvalFor.length > 0
          ? `Side effects that require approval: ${approvalFor.join(', ')}.`
          : 'No approval-gated side effects are declared.',
        '',
        'Task:',
        String(args.task ?? ''),
        '',
        'Follow the skill contract exactly as written below: execute its Process step by step, respect its Guardrails, and stop at its declared stop condition.',
        '',
        text,
      ].join('\n');
    },
  },
  author_skill: {
    description: 'Prompt that scaffolds a new bundle skill following the repository conventions.',
    arguments: [
      { name: 'name', description: 'Directory and frontmatter name of the new skill', required: true },
      { name: 'domain', description: 'Domain directory under .agents/skills/', required: true },
      { name: 'description', description: 'One-sentence routing description for the frontmatter', required: true },
    ],
    build: (args) => {
      const name = String(args.name ?? '').trim();
      const domain = String(args.domain ?? '').trim();
      const description = String(args.description ?? '').trim();
      if (!name || !domain || !description) {
        throw new RpcError(-32602, 'invalid params: name, domain, and description are required');
      }
      return [
        `Author a new quirk skill named "${name}" in the "${domain}" domain.`,
        '',
        `Routing description for the frontmatter: ${description}`,
        '',
        'Repository conventions to follow:',
        `- Create .agents/skills/${domain}/${name}/SKILL.md as the single source of truth.`,
        '- Frontmatter declares: name, description, capabilities, sideEffects, dependencies, stopCondition, risk, trustTier, artifactType, modelTier, and promptVersion.',
        '- Body sections: Why, Contract, Process, Guardrails (with explicit Rule lines), and Completion Criteria.',
        '- Keep every load-bearing rule in the first 150 lines of the body: compaction only re-injects the start of a skill body.',
        '- After writing the skill, refresh skills-lock.json and run the full gate:',
        `  node ${path.join(PLATFORM_DIR, 'check-all.mjs')}`,
        '- The gate must pass with zero errors before the skill is considered done.',
      ].join('\n');
    },
  },
  evaluate_skill: {
    description: 'Prompt that evaluates one bundle skill against its declared fixtures.',
    arguments: [
      { name: 'skill', description: 'Skill id as domain/name', required: true },
      { name: 'task', description: 'Optional focus for the evaluation', required: false },
    ],
    build: async (args) => {
      const skill = resolveSkill(args.skill);
      if (!skill) throw new RpcError(-32002, `skill not found: ${args.skill}`);
      requireVisible(skill, args);
      const file = path.join(REPO_ROOT, skill.path, 'SKILL.md');
      const text = await fs.readFile(file, 'utf8');
      const fm = parseFrontmatter(text);
      const fixturesPath = String(fm.fixturesPath ?? '').trim();
      return [
        `Evaluate the quirk skill "${skill.name}" (domain: ${skill.domain}) against its fixtures.`,
        '',
        `Skill description: ${skill.description}`,
        fixturesPath
          ? `Declared fixtures: ${fixturesPath}`
          : 'No fixturesPath is declared in the frontmatter; evaluate against the Contract and Completion Criteria instead.',
        '',
        'Procedure:',
        '- Read the fixture expectations first, then the skill body, and check every expectation against the written contract.',
        '- Report each expectation as met, partially met, or missing, with the evidence from the skill body.',
        '- Finish with a verdict: keep the skill as written, or list the concrete edits the body needs.',
        args.task ? `\nFocus of this evaluation: ${String(args.task)}` : '',
        '',
        text,
      ].join('\n');
    },
  },
};

function listPrompts() {
  return Object.entries(PROMPTS).map(([name, prompt]) => ({
    name,
    description: prompt.description,
    arguments: prompt.arguments,
  }));
}

function promptSchema(prompt) {
  return {
    type: 'object',
    properties: Object.fromEntries(
      prompt.arguments.map((argument) => [
        argument.name,
        { type: 'string', description: argument.description },
      ]),
    ),
    required: prompt.arguments.filter((argument) => argument.required).map((argument) => argument.name),
  };
}

// ---------------------------------------------------------------- dispatcher

function initializeResult() {
  return {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: { tools: {}, resources: {}, prompts: {}, logging: {} },
    serverInfo: { name: SERVER_NAME, version: context.version },
  };
}

export async function handleJsonRpc(request) {
  loadContext();
  if (request === null || typeof request !== 'object' || Array.isArray(request)) {
    return errorResponse(null, -32600, 'Invalid Request: expected a JSON-RPC object');
  }
  const { id, method, params } = request;
  if (request.jsonrpc !== '2.0' || typeof method !== 'string') {
    if (id === undefined) return {};
    return errorResponse(id, -32600, 'Invalid Request: jsonrpc must be "2.0" and method must be a string');
  }
  if (method === 'notifications/initialized' || method === 'initialized' || method.startsWith('notifications/')) {
    return {};
  }
  try {
    switch (method) {
      case 'initialize':
        return { jsonrpc: '2.0', id, result: initializeResult() };
      case 'ping':
        return { jsonrpc: '2.0', id, result: {} };
      case 'tools/list':
        return { jsonrpc: '2.0', id, result: buildToolsList(params ?? {}) };
      case 'tools/call': {
        const name = params?.name;
        const tool = TOOLS[name];
        if (!tool) return errorResponse(id, -32601, `Tool not found: ${name}`);
        let args;
        try {
          args = validateParams(tool.inputSchema, params?.arguments);
        } catch (err) {
          return errorResponse(id, err instanceof RpcError ? err.code : -32602, err.message);
        }
        try {
          const result = await tool.handler(args);
          return {
            jsonrpc: '2.0',
            id,
            result: { content: [{ type: 'text', text: JSON.stringify(redact(result), null, 2) }] },
          };
        } catch (err) {
          if (err instanceof RpcError) return errorResponse(id, err.code, err.message, err.data);
          console.error(`[${SERVER_NAME}] internal error in tool ${name}: ${err.stack ?? err.message}`);
          return errorResponse(id, -32603, `Internal error: ${err.message}`);
        }
      }
      case 'resources/list':
        return { jsonrpc: '2.0', id, result: { resources: listResources(params ?? {}) } };
      case 'resources/read': {
        try {
          const contents = await readResource(params?.uri, params ?? {});
          return { jsonrpc: '2.0', id, result: { contents: [contents] } };
        } catch (err) {
          if (err instanceof RpcError) return errorResponse(id, err.code, err.message);
          console.error(`[${SERVER_NAME}] internal error reading resource: ${err.stack ?? err.message}`);
          return errorResponse(id, -32603, `Internal error: ${err.message}`);
        }
      }
      case 'prompts/list':
        return { jsonrpc: '2.0', id, result: { prompts: listPrompts() } };
      case 'prompts/get': {
        const prompt = PROMPTS[params?.name];
        if (!prompt) return errorResponse(id, -32601, `Prompt not found: ${params?.name}`);
        let args;
        try {
          args = validateParams(promptSchema(prompt), params?.arguments);
        } catch (err) {
          return errorResponse(id, err instanceof RpcError ? err.code : -32602, err.message);
        }
        try {
          const text = await prompt.build(args);
          return {
            jsonrpc: '2.0',
            id,
            result: {
              description: prompt.description,
              messages: [{ role: 'user', content: { type: 'text', text } }],
            },
          };
        } catch (err) {
          if (err instanceof RpcError) return errorResponse(id, err.code, err.message);
          console.error(`[${SERVER_NAME}] internal error in prompt ${params?.name}: ${err.stack ?? err.message}`);
          return errorResponse(id, -32603, `Internal error: ${err.message}`);
        }
      }
      default:
        return errorResponse(id, -32601, `Method not found: ${method}`);
    }
  } catch (err) {
    console.error(`[${SERVER_NAME}] internal error: ${err.stack ?? err.message}`);
    return errorResponse(id, -32603, `Internal error: ${err.message}`);
  }
}

// ---------------------------------------------------------------- transports

async function handleLine(line) {
  let request;
  try {
    request = JSON.parse(line);
  } catch {
    return errorResponse(null, -32700, 'Parse error: line is not valid JSON');
  }
  return handleJsonRpc(request);
}

function startStdio() {
  const stdin = process.stdin;
  const stdout = process.stdout;
  let buffer = '';
  // A client that pipes its requests and closes stdin must not lose in-flight
  // responses: track pending handlers and only end the process once the last
  // one has answered and the write has drained.
  let pending = 0;
  let ended = false;
  const settle = () => {
    if (!ended || pending > 0) return;
    process.exitCode = 0;
    stdout.write('', () => process.exit(0));
  };
  stdin.setEncoding('utf8');
  stdin.on('data', (chunk) => {
    buffer += chunk;
    while (buffer.includes('\n')) {
      const index = buffer.indexOf('\n');
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 1);
      if (!line.trim()) continue;
      pending += 1;
      handleLine(line).then((response) => {
        pending -= 1;
        if (response && Object.keys(response).length > 0) {
          stdout.write(`${JSON.stringify(response)}\n`);
        }
        settle();
      });
    }
  });
  stdin.on('end', () => {
    ended = true;
    settle();
  });
  console.error(`[${SERVER_NAME}] stdio transport ready (protocol ${PROTOCOL_VERSION}, ${context.skills.length} skills)`);
}

function startHttp(port) {
  const server = http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/mcp') {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', async () => {
        let request;
        try {
          request = JSON.parse(body);
        } catch {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(errorResponse(null, -32700, 'Parse error: body is not valid JSON')));
          return;
        }
        const response = await handleJsonRpc(request);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(Object.keys(response).length > 0 ? JSON.stringify(response) : '{}');
      });
      return;
    }
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        server: SERVER_NAME,
        version: context.version,
        protocolVersion: PROTOCOL_VERSION,
        skills: context.skills.length,
      }));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });
  server.listen(port, () => {
    console.error(`[${SERVER_NAME}] HTTP MCP endpoint at http://localhost:${port}/mcp`);
    console.error(`[${SERVER_NAME}] health check at http://localhost:${port}/health`);
  });
  process.on('SIGINT', () => {
    server.close();
    process.exit(0);
  });
}

// ---------------------------------------------------------------- demo

async function runDemo(json) {
  const calls = [
    ['initialize', { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 'skill-lab-demo', version: '1.0.0' } }],
    ['tools/list', {}],
    ['tools/call', { name: 'route_task', arguments: { task: DEMO_TASK } }],
  ];
  const steps = [];
  let id = 0;
  for (const [method, params] of calls) {
    const response = await handleJsonRpc({ jsonrpc: '2.0', id: (id += 1), method, params });
    steps.push({ step: method, response });
  }
  if (json) {
    console.log(JSON.stringify(steps, null, 2));
  } else {
    for (const entry of steps) {
      console.log(`== ${entry.step} ==`);
      console.log(JSON.stringify(entry.response, null, 2));
    }
  }
}

// ---------------------------------------------------------------- cli

const HELP = `mcp-skill-lab-server.mjs - unified MCP server for the quirk Skills bundle

Usage:
  node mcp-skill-lab-server.mjs --stdio            newline-delimited JSON-RPC 2.0 over stdin/stdout (default)
  node mcp-skill-lab-server.mjs --port N           HTTP POST /mcp plus GET /health on port N
  node mcp-skill-lab-server.mjs --demo [--json]     run initialize, tools/list, and route_task offline
  node mcp-skill-lab-server.mjs --help             show this help

Tools (9): list_skills, get_skill, search_skills, route_task, validate_skill,
           run_quality_gate, get_registry_info, get_side_effect_policy, explain_routing

Resources: skill://registry, skill://catalog, skill://skill/<domain>/<name>,
           skill://fixtures/<type>/<name>, skill://manifest/<domain>/<name>

Prompts: use_skill, author_skill, evaluate_skill (list and get)

Security: skills with trustTier > 3 stay hidden unless a call passes
          allowHighTrust: true; the excluded set is reported in tools/list.
          Tool payloads are redacted; resource URIs cannot escape the repository.`;

function parseArgs(argv) {
  const args = { stdio: false, port: null, demo: false, json: false, help: false };
  const unknown = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--stdio') args.stdio = true;
    else if (arg === '--port') args.port = Number(argv[++i]);
    else if (arg.startsWith('--port=')) args.port = Number(arg.slice('--port='.length));
    else if (arg === '--demo') args.demo = true;
    else if (arg === '--json') args.json = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else unknown.push(arg);
  }
  return { args, unknown };
}

// Returns an exit code for terminal modes (help, demo, usage errors) and null
// for the long-running transports, which keep the event loop alive on their own.
async function main(argv) {
  const { args, unknown } = parseArgs(argv);
  if (args.help) {
    console.log(HELP);
    return 0;
  }
  if (unknown.length > 0) {
    console.error(HELP);
    console.error(`\nunknown argument(s): ${unknown.join(', ')}`);
    return 2;
  }
  loadContext();
  logExclusions(context.skills);
  if (args.demo) {
    await runDemo(args.json);
    return 0;
  }
  if (args.port !== null && Number.isFinite(args.port) && args.port > 0) {
    startHttp(args.port);
    return null;
  }
  startStdio();
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
      console.error(`skill-lab server error: ${err.message}`);
      process.exit(1);
    });
}
