#!/usr/bin/env node
// build-skill-dashboard.mjs - static bundle dashboard, skill cards, and card index.
//
// Three artifacts, all pure functions of the bundle content (same input bytes ->
// same output bytes):
//   1. <root>/.agents/skills/platform/dashboard/index.html - one self-contained
//      HTML file: inline CSS, dark theme, monospace type, no network, no CDN, no
//      external JavaScript. The only script is a vanilla substring filter over
//      the skill table.
//   2. <root>/.agents/skills/platform/skill-cards/<domain>-<skill>.card.md - one
//      "model card" per bundle skill.
//   3. <root>/.agents/skills/platform/skill-cards/README.md - the index table.
//
// Inputs (every one optional except the bundle itself):
//   .agents/skills/**/SKILL.md                             via collectSkills()
//   .agents/skills/platform/manifests/*.runtime.json       runtime manifests
//   .agents/skills/platform/index/skill-index.json         search index
//   .agents/skills/platform/metrics/routing/latest.json    routing metrics
//   .agents/skills/platform/fixtures/{behavioral,regression}/*.json
//   evals/routing/*.csv                                    negative-control rows
//   .agents/skills/platform/agent-cards/*.json             agent cards
//
// Determinism contract: every directory listing is sorted in code-unit order,
// every number is rounded to a fixed number of decimals, and no wall-clock value
// reaches the output unless the caller passes --now <iso>.
//
// Usage:
//   node build-skill-dashboard.mjs [--write] [--json] [--out <path>]
//                                  [--now <iso>] [--skill <domain/name>]
//                                  [--root DIR]
//   default is a dry run that reports what it would write
// Exit codes: 0 = ok (dry run or written), 1 = write failure, 2 = usage error.

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter, collectSkills, buildGraph, propagate } from '../skill-graph.mjs';

const PLATFORM_REL = '.agents/skills/platform';
const DASHBOARD_REL_FILE = `${PLATFORM_REL}/dashboard/index.html`;
const CARDS_REL_DIR = `${PLATFORM_REL}/skill-cards`;
const CARDS_INDEX_FILE = 'README.md';
const MANIFEST_SUFFIX = '.runtime.json';
const CARD_SUFFIX = '.card.md';
const REGENERATE_COMMAND = 'node .agents/skills/platform/scripts/build-skill-dashboard.mjs --write';

export const RISK_LEVELS = ['low', 'medium', 'high'];
export const TRUST_TIERS = [1, 2, 3, 4];
export const TOP_CENTRAL_LIMIT = 20;

// Color thresholds for the routing-metrics section. The metrics file carries
// its own minTop1 / maxFp thresholds under different key names; those override
// the defaults below, and minTop3Recall keeps the default when the file does not
// declare one.
export const ROUTING_THRESHOLDS = Object.freeze({
  minTop1Accuracy: 0.6,
  minTop3Recall: 0.75,
  maxFalsePositiveRate: 0.25,
});

const DEFAULT_RISK = 'low';
const DEFAULT_TRUST_TIER = 1;
const DEFAULT_MODEL_TIER = 'reasoning';
const MODEL_TIER_NORMALIZATION = { code: 'reasoning' };
const MODEL_TIERS = ['fast', 'reasoning', 'router'];

/* ------------------------------------------------------------------ helpers */

function compareCodeUnit(a, b) {
  const left = String(a);
  const right = String(b);
  return left < right ? -1 : left > right ? 1 : 0;
}

function toPosix(value) {
  return String(value).split(path.sep).join('/');
}

function toList(value) {
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return String(value).split(',').map((entry) => String(entry).trim()).filter(Boolean);
}

function round(value, digits = 4) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Number(number.toFixed(digits));
}

function percent(part, total) {
  if (!total) return 0;
  return round((part / total) * 100, 1);
}

function safeRead(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function listNames(dir, test = () => true) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isFile() && test(entry.name))
    .map((entry) => entry.name)
    .sort(compareCodeUnit);
}

function unquote(value) {
  const text = String(value ?? '').trim();
  if (text.length >= 2 && ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'")))) {
    return text.slice(1, -1);
  }
  return text;
}

/** Escape every HTML-significant character before skill text reaches markup. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/* --------------------------------------------------------------- normalizers */

// The same normalizations scripts/build-runtime-manifests.mjs applies, so an
// undeclared frontmatter value degrades identically here and in the manifest.
function normalizeRisk(value) {
  const risk = String(value ?? '').trim().toLowerCase();
  return RISK_LEVELS.includes(risk) ? risk : DEFAULT_RISK;
}

function normalizeTrustTier(value) {
  const tier = Number(value);
  if (!Number.isInteger(tier) || tier < 1 || tier > 4) return DEFAULT_TRUST_TIER;
  return tier;
}

function normalizeModelTier(value) {
  const tier = String(value ?? '').trim().toLowerCase();
  if (MODEL_TIERS.includes(tier)) return tier;
  if (MODEL_TIER_NORMALIZATION[tier]) return MODEL_TIER_NORMALIZATION[tier];
  return DEFAULT_MODEL_TIER;
}

function normalizeMaxTurns(value) {
  const turns = Number(value);
  if (!Number.isInteger(turns) || turns < 1) return 6;
  return turns;
}

function isTrueValue(value) {
  return String(value ?? '').trim().toLowerCase() === 'true';
}

// Mirror of frontmatterHash() in scripts/build-runtime-manifests.mjs: sha256 over
// JSON.stringify of the frontmatter object with its keys sorted. A manifest is
// stale when this value no longer matches the one it was generated from.
export function frontmatterHash(frontmatter) {
  const fm = frontmatter && typeof frontmatter === 'object' ? frontmatter : {};
  const sorted = {};
  for (const key of Object.keys(fm).sort(compareCodeUnit)) sorted[key] = fm[key];
  return createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
}

export function manifestFileName(skillId) {
  return `${String(skillId).replaceAll('/', '-')}${MANIFEST_SUFFIX}`;
}

export function cardFileName(skillId) {
  return `${String(skillId).replaceAll('/', '-')}${CARD_SUFFIX}`;
}

/* ------------------------------------------------- frontmatter block parsing */

// The bundle's frontmatter subset is bounded: block lists whose items are either
// scalars ("- user request") or flat maps ("- type: object" followed by indented
// "description: ..."). parseFrontmatter() flattens both into strings and loses
// the record boundaries, so the blocks are re-read from the raw text here.
export function parseBlockList(text, key) {
  const lines = String(text ?? '').split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^${key}:`).test(line));
  if (start === -1) return [];
  const records = [];
  let current = null;
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break; // the next top-level key ends the block
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item) {
      current = {};
      records.push(current);
      const inline = item[1].match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
      if (inline) current[inline[1]] = unquote(inline[2]);
      else current.value = unquote(item[1]);
      continue;
    }
    const field = line.match(/^\s+([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
    if (field && current) current[field[1]] = unquote(field[2]);
  }
  return records;
}

// clauses: - id: X / text: "..." / check: "path#fragment"
export function parseClauses(text) {
  return parseBlockList(text, 'clauses')
    .map((record) => ({
      id: String(record.id ?? ''),
      text: String(record.text ?? ''),
      check: String(record.check ?? ''),
    }))
    .filter((clause) => clause.id || clause.text);
}

/* ------------------------------------------------------------------- loaders */

// Batched fixture files: { fixtures: [ { skill: "<name>", ... } ] }. The skill
// field carries the bare skill name, not the domain-qualified id.
function loadFixtureMap(root, kind) {
  const dir = path.join(root, PLATFORM_REL, 'fixtures', kind);
  const bySkill = new Map();
  for (const name of listNames(dir, (entry) => entry.endsWith('.json'))) {
    const data = readJson(path.join(dir, name));
    const entries = Array.isArray(data?.fixtures) ? data.fixtures : [];
    for (const entry of entries) {
      const skill = String(entry?.skill ?? '').trim();
      if (!skill) continue;
      if (!bySkill.has(skill)) bySkill.set(skill, `${PLATFORM_REL}/fixtures/${kind}/${name}`);
    }
  }
  return { bySkill, files: listNames(dir, (entry) => entry.endsWith('.json')).length };
}

// evals/routing/<domain>-<skill>.csv; a row is a negative control when its
// should_trigger column reads false. The file name is resolved against the known
// bundle ids because a domain can itself contain a dash (skill-dev), which the
// first-dash split alone would cut in half.
function loadRoutingNegatives(root, knownIds = null) {
  const dir = path.join(root, 'evals', 'routing');
  const known = knownIds instanceof Set ? knownIds : null;
  const domains = known
    ? [...new Set([...known].map((id) => String(id).slice(0, String(id).indexOf('/'))))]
      .sort((a, b) => (b.length - a.length) || compareCodeUnit(a, b))
    : [];
  const toSkillId = (base) => {
    for (const domain of domains) {
      const candidate = `${domain}/${base.slice(domain.length + 1)}`;
      if (known.has(candidate)) return candidate;
    }
    const slash = base.indexOf('-');
    return slash > 0 ? `${base.slice(0, slash)}/${base.slice(slash + 1)}` : base;
  };
  const bySkill = new Map();
  for (const name of listNames(dir, (entry) => entry.endsWith('.csv'))) {
    const base = name.slice(0, -'.csv'.length);
    const skillId = toSkillId(base);
    let rows = 0;
    let negatives = 0;
    for (const line of safeRead(path.join(dir, name)).split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || /^should_trigger/i.test(trimmed)) continue;
      rows += 1;
      if (/^false\s*(,|$)/i.test(trimmed)) negatives += 1;
    }
    bySkill.set(skillId, { file: `evals/routing/${name}`, rows, negatives });
  }
  return bySkill;
}

function loadRuntimeManifests(root) {
  const dir = path.join(root, PLATFORM_REL, 'manifests');
  const bySkill = new Map();
  const files = [];
  for (const name of listNames(dir, (entry) => entry.endsWith(MANIFEST_SUFFIX))) {
    const data = readJson(path.join(dir, name));
    if (!data || typeof data !== 'object') continue;
    files.push(name);
    const skillId = String(data.skill ?? '').trim();
    if (skillId) bySkill.set(skillId, data);
  }
  return { bySkill, files };
}

function loadAgentCardIds(root) {
  const dir = path.join(root, PLATFORM_REL, 'agent-cards');
  const ids = new Set();
  for (const name of listNames(dir, (entry) => entry.endsWith('.json'))) {
    const data = readJson(path.join(dir, name));
    const id = String(data?.skills?.[0]?.id ?? '').trim();
    if (id) ids.add(id);
  }
  return ids;
}

function loadBundleIndex(root) {
  const data = readJson(path.join(root, PLATFORM_REL, 'index', 'skill-index.json'));
  if (!data || typeof data !== 'object') {
    return { present: false, skills: 0, terms: 0, ids: [], matchesBundle: false };
  }
  const ids = Object.keys(data.skills ?? {}).sort(compareCodeUnit);
  return {
    present: true,
    skills: ids.length,
    terms: Number(data.stats?.terms ?? 0),
    ids,
    matchesBundle: false,
  };
}

function loadRoutingMetrics(root) {
  const data = readJson(path.join(root, PLATFORM_REL, 'metrics', 'routing', 'latest.json'));
  const global = data?.global;
  if (!global || typeof global !== 'object') return null;
  const declared = data.thresholds && typeof data.thresholds === 'object' ? data.thresholds : {};
  const thresholds = {
    minTop1Accuracy: Number.isFinite(Number(declared.minTop1))
      ? Number(declared.minTop1)
      : ROUTING_THRESHOLDS.minTop1Accuracy,
    minTop3Recall: Number.isFinite(Number(declared.minTop3Recall))
      ? Number(declared.minTop3Recall)
      : ROUTING_THRESHOLDS.minTop3Recall,
    maxFalsePositiveRate: Number.isFinite(Number(declared.maxFp))
      ? Number(declared.maxFp)
      : ROUTING_THRESHOLDS.maxFalsePositiveRate,
  };
  const metrics = {
    top1Accuracy: round(global.top1Accuracy ?? 0),
    top3Recall: round(global.top3Recall ?? 0),
    falsePositiveRate: round(global.falsePositiveRate ?? 0),
    negativeRejectionRate: round(global.negativeRejectionRate ?? 0),
    adjacentCaptureRate: round(global.adjacentCaptureRate ?? 0),
    coverage: round(global.coverage ?? 0),
  };
  const verdicts = {
    top1Accuracy: metrics.top1Accuracy >= thresholds.minTop1Accuracy ? 'pass' : 'fail',
    top3Recall: metrics.top3Recall >= thresholds.minTop3Recall ? 'pass' : 'fail',
    falsePositiveRate: metrics.falsePositiveRate <= thresholds.maxFalsePositiveRate ? 'pass' : 'fail',
  };
  const perSkill = (Array.isArray(data.perSkill) ? data.perSkill : [])
    .map((entry) => ({
      skill: String(entry?.skill ?? ''),
      rows: Number(entry?.metrics?.rows ?? 0),
      top1Accuracy: round(entry?.metrics?.top1Accuracy ?? 0),
      top3Recall: round(entry?.metrics?.top3Recall ?? 0),
      falsePositiveRate: round(entry?.metrics?.falsePositiveRate ?? 0),
    }))
    .sort((a, b) => compareCodeUnit(a.skill, b.skill));
  return {
    tool: String(data.tool ?? ''),
    generatedAt: typeof data.generatedAt === 'string' ? data.generatedAt : null,
    rows: Number(data.totalRows ?? global.rows ?? 0),
    status: String(data.status ?? ''),
    thresholds,
    metrics,
    verdicts,
    regressions: Array.isArray(data.regressions) ? data.regressions.length : 0,
    perSkill,
  };
}

/* ------------------------------------------------------ skill record assembly */

function buildSkillRecords(root) {
  return collectSkills(root)
    .map((skill) => {
      const text = safeRead(path.join(root, skill.path, 'SKILL.md'));
      const fm = parseFrontmatter(text);
      const description = typeof fm.description === 'string' ? fm.description : skill.description ?? '';
      const clauses = parseClauses(text).map((clause) => {
        if (!clause.check) return { ...clause, checkPath: null, checkFragment: '' };
        const separator = clause.check.indexOf('#');
        const target = separator === -1 ? clause.check : clause.check.slice(0, separator);
        const fragment = separator === -1 ? '' : clause.check.slice(separator + 1);
        const resolved = target && existsSync(path.join(root, target)) ? toPosix(target) : null;
        return { ...clause, checkPath: resolved, checkFragment: fragment };
      });
      const declaredFixturesPath = typeof fm.fixturesPath === 'string' ? fm.fixturesPath.trim() : '';
      return {
        skill: `${skill.domain}/${skill.name}`,
        name: skill.name,
        domain: skill.domain,
        path: toPosix(skill.path),
        description,
        capabilities: toList(fm.capabilities ?? skill.capabilities),
        dependencies: toList(fm.dependencies ?? skill.dependencies),
        compatibility: toList(fm.compatibility ?? skill.compatibility),
        tags: toList(fm.tags),
        // Rendered verbatim in the card: a flat parser loses the record
        // boundaries of a nested block, so the raw lines are the projection.
        inputsBlock: frontmatterBlockLines(text, 'inputs'),
        outputsBlock: frontmatterBlockLines(text, 'outputs'),
        clauses,
        risk: normalizeRisk(fm.risk),
        trustTier: normalizeTrustTier(fm.trustTier),
        sideEffects: toList(fm.sideEffects),
        approvalRequired: isTrueValue(fm.approvalRequired),
        approvalFor: toList(fm.approvalFor),
        artifactType: typeof fm.artifactType === 'string' ? fm.artifactType.trim() : '',
        modelTier: normalizeModelTier(fm.modelTier),
        maxIterations: normalizeMaxTurns(fm.maxIterations),
        maturity: typeof fm.maturity === 'string' ? unquote(fm.maturity) : '',
        version: typeof fm.version === 'string' ? unquote(fm.version) : '',
        category: typeof fm.category === 'string' ? unquote(fm.category) : skill.domain,
        license: typeof fm.license === 'string' ? unquote(fm.license) : '',
        diataxis: typeof fm.diataxis === 'string' ? unquote(fm.diataxis) : '',
        promptVersion: typeof fm.promptVersion === 'string' ? unquote(fm.promptVersion) : '',
        reloadPolicy: typeof fm.reloadPolicy === 'string' ? unquote(fm.reloadPolicy) : '',
        evaluators: toList(fm.evaluators),
        declaredFixturesPath: declaredFixturesPath && existsSync(path.join(root, declaredFixturesPath))
          ? toPosix(declaredFixturesPath)
          : null,
        frontmatterHash: frontmatterHash(fm),
        bodyLines: String(skill.body ?? '').split(/\r?\n/).length,
      };
    })
    .sort((a, b) => compareCodeUnit(a.skill, b.skill));
}

/* ------------------------------------------------------- graph derived views */

// Personalized PageRank with a uniform seed over the typed edge graph: the same
// propagation rank() runs, with the seed term switched off. Score order is a
// measure of how much of the graph's mass flows through a node.
export function centralityRanking(graph, options = {}) {
  const names = Object.keys(graph.nodes ?? {});
  const degree = new Map(names.map((name) => [name, { fanIn: 0, fanOut: 0 }]));
  for (const edge of graph.edges ?? []) {
    if (degree.has(edge.from)) degree.get(edge.from).fanOut += 1;
    if (degree.has(edge.to)) degree.get(edge.to).fanIn += 1;
  }
  let scores = null;
  try {
    scores = propagate(graph, new Map()).scores;
  } catch {
    scores = null;
  }
  return names
    .map((name, position) => ({
      name,
      domain: String(graph.nodes?.[name]?.domain ?? ''),
      score: round(scores ? scores[position] : 0, 8),
      fanIn: degree.get(name)?.fanIn ?? 0,
      fanOut: degree.get(name)?.fanOut ?? 0,
    }))
    .sort((a, b) => (b.score - a.score) || compareCodeUnit(a.name, b.name))
    .slice(0, options.limit ?? TOP_CENTRAL_LIMIT);
}

// Tarjan's algorithm, iterative so a deep chain cannot blow the stack. Nodes and
// successors are visited in code-unit order, so the components come out stable.
export function dependencyCycles(graph) {
  const adjacency = new Map();
  for (const name of Object.keys(graph.nodes ?? {})) adjacency.set(name, []);
  for (const edge of graph.edges ?? []) {
    if (edge.type !== 'depends-on') continue;
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    if (!adjacency.has(edge.to)) adjacency.set(edge.to, []);
    adjacency.get(edge.from).push(edge.to);
  }
  for (const targets of adjacency.values()) targets.sort(compareCodeUnit);

  const index = new Map();
  const low = new Map();
  const onStack = new Set();
  const stack = [];
  const components = [];
  let counter = 0;

  for (const root of [...adjacency.keys()].sort(compareCodeUnit)) {
    if (index.has(root)) continue;
    const work = [[root, 0]];
    while (work.length > 0) {
      const frame = work[work.length - 1];
      const node = frame[0];
      const position = frame[1];
      if (position === 0) {
        index.set(node, counter);
        low.set(node, counter);
        counter += 1;
        stack.push(node);
        onStack.add(node);
      }
      const neighbors = adjacency.get(node) ?? [];
      if (position < neighbors.length) {
        frame[1] = position + 1;
        const next = neighbors[position];
        if (!index.has(next)) work.push([next, 0]);
        else if (onStack.has(next)) low.set(node, Math.min(low.get(node), index.get(next)));
        continue;
      }
      work.pop();
      if (work.length > 0) {
        const parent = work[work.length - 1][0];
        low.set(parent, Math.min(low.get(parent), low.get(node)));
      }
      if (low.get(node) === index.get(node)) {
        const component = [];
        for (;;) {
          const member = stack.pop();
          onStack.delete(member);
          component.push(member);
          if (member === node) break;
        }
        components.push(component.sort(compareCodeUnit));
      }
    }
  }

  return components
    .filter((component) => component.length > 1)
    .sort((a, b) => compareCodeUnit(a[0], b[0]));
}

/* ------------------------------------------------------------- data assembly */

function tally(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => (b.count - a.count) || compareCodeUnit(a.value, b.value));
}

function countWhere(skills, predicate) {
  return skills.reduce((total, skill) => (predicate(skill) ? total + 1 : total), 0);
}

/**
 * buildDashboardData(root) - every input the dashboard and the cards need, in one
 * deterministic object. Reading the bundle is the only I/O; every collection is
 * sorted and every number rounded, so equal bundle content yields equal data.
 */
export function buildDashboardData(root, options = {}) {
  const now = typeof options.now === 'string' && options.now.trim() ? options.now.trim() : null;
  const records = buildSkillRecords(root);
  const manifests = loadRuntimeManifests(root);
  const index = loadBundleIndex(root);
  const routing = loadRoutingMetrics(root);
  const behavioral = loadFixtureMap(root, 'behavioral');
  const regression = loadFixtureMap(root, 'regression');
  const routingNegatives = loadRoutingNegatives(root, new Set(records.map((record) => record.skill)));
  const agentCards = loadAgentCardIds(root);
  const graph = buildGraph(root);

  const manifestFileFor = (skillId) => `${PLATFORM_REL}/manifests/${manifestFileName(skillId)}`;
  const agentCardFor = (skillId) => `${PLATFORM_REL}/agent-cards/${skillId.replaceAll('/', '-')}.json`;

  const skills = records.map((record) => {
    const manifest = manifests.bySkill.get(record.skill) ?? null;
    const routingFixture = routingNegatives.get(record.skill) ?? null;
    return {
      ...record,
      manifest,
      manifestStatus: manifest === null
        ? 'missing'
        : (manifest.frontmatterHash === record.frontmatterHash ? 'ok' : 'stale'),
      manifestFile: manifestFileFor(record.skill),
      behavioralFixture: behavioral.bySkill.get(record.name) ?? null,
      regressionFixture: regression.bySkill.get(record.name) ?? null,
      routingFixture,
      hasRoutingNegatives: Boolean(routingFixture && routingFixture.negatives > 0),
      agentCard: agentCards.has(record.skill) ? agentCardFor(record.skill) : null,
    };
  });

  const skillIds = skills.map((skill) => skill.skill);
  const skillNames = new Set(skills.map((skill) => skill.name));
  if (index.present) {
    index.matchesBundle = index.ids.length === skillIds.length
      && index.ids.every((id, position) => id === skillIds[position]);
  }

  const domains = [...new Set(skills.map((skill) => skill.domain))].sort(compareCodeUnit);
  const allEffects = skills.flatMap((skill) => skill.sideEffects);

  const domainRows = domains.map((domain) => {
    const inDomain = skills.filter((skill) => skill.domain === domain);
    return {
      domain,
      count: inDomain.length,
      risk: {
        low: countWhere(inDomain, (skill) => skill.risk === 'low'),
        medium: countWhere(inDomain, (skill) => skill.risk === 'medium'),
        high: countWhere(inDomain, (skill) => skill.risk === 'high'),
      },
      trustTiers: {
        1: countWhere(inDomain, (skill) => skill.trustTier === 1),
        2: countWhere(inDomain, (skill) => skill.trustTier === 2),
        3: countWhere(inDomain, (skill) => skill.trustTier === 3),
        4: countWhere(inDomain, (skill) => skill.trustTier === 4),
      },
      approvals: countWhere(inDomain, (skill) => skill.approvalRequired),
      withSideEffects: countWhere(inDomain, (skill) => skill.sideEffects.length > 0),
      manifests: {
        ok: countWhere(inDomain, (skill) => skill.manifestStatus === 'ok'),
        missing: countWhere(inDomain, (skill) => skill.manifestStatus === 'missing'),
        stale: countWhere(inDomain, (skill) => skill.manifestStatus === 'stale'),
      },
    };
  });

  const idByName = new Map(skills.map((skill) => [skill.name, skill.skill]));
  const edgeTypes = tally((graph.edges ?? []).map((edge) => String(edge.type)));
  const central = centralityRanking(graph, { limit: TOP_CENTRAL_LIMIT });

  const missingManifests = skills
    .filter((skill) => skill.manifestStatus === 'missing')
    .map((skill) => skill.skill);
  const staleManifests = skills
    .filter((skill) => skill.manifestStatus === 'stale')
    .map((skill) => ({
      skill: skill.skill,
      declared: skill.frontmatterHash,
      stored: String(manifests.bySkill.get(skill.skill)?.frontmatterHash ?? ''),
    }));
  const manifestNames = new Set(skills.map((skill) => manifestFileName(skill.skill)));

  return {
    generatedAt: now,
    summary: {
      skills: skills.length,
      domains: domains.length,
      domainList: domains,
      risk: {
        low: countWhere(skills, (skill) => skill.risk === 'low'),
        medium: countWhere(skills, (skill) => skill.risk === 'medium'),
        high: countWhere(skills, (skill) => skill.risk === 'high'),
      },
      trustTiers: {
        1: countWhere(skills, (skill) => skill.trustTier === 1),
        2: countWhere(skills, (skill) => skill.trustTier === 2),
        3: countWhere(skills, (skill) => skill.trustTier === 3),
        4: countWhere(skills, (skill) => skill.trustTier === 4),
      },
      sideEffects: {
        declared: countWhere(skills, (skill) => skill.sideEffects.length > 0),
        none: countWhere(skills, (skill) => skill.sideEffects.length === 0),
        total: allEffects.length,
        top: tally(allEffects).slice(0, 8),
      },
      approvals: {
        required: countWhere(skills, (skill) => skill.approvalRequired),
        withTargets: countWhere(skills, (skill) => skill.approvalFor.length > 0),
      },
      capabilities: {
        declared: countWhere(skills, (skill) => skill.capabilities.length > 0),
        none: countWhere(skills, (skill) => skill.capabilities.length === 0),
      },
      agentCards: {
        present: countWhere(skills, (skill) => skill.agentCard !== null),
        total: agentCards.size,
      },
      index,
      graph: {
        nodes: Object.keys(graph.nodes).length,
        edges: (graph.edges ?? []).length,
        edgeTypes,
      },
      fixtures: {
        behavioralCovered: countWhere(skills, (skill) => skill.behavioralFixture !== null),
        regressionCovered: countWhere(skills, (skill) => skill.regressionFixture !== null),
        routingNegativeCovered: countWhere(skills, (skill) => skill.hasRoutingNegatives),
      },
    },
    domains: domainRows,
    riskTierMatrix: {
      risks: RISK_LEVELS,
      tiers: TRUST_TIERS,
      cells: RISK_LEVELS.map((risk) => TRUST_TIERS.map((tier) => countWhere(
        skills,
        (skill) => skill.risk === risk && skill.trustTier === tier,
      ))),
    },
    fixtureCoverage: {
      behavioral: {
        covered: countWhere(skills, (skill) => skill.behavioralFixture !== null),
        files: behavioral.files,
        missing: skills.filter((skill) => skill.behavioralFixture === null).map((skill) => skill.skill),
      },
      regression: {
        covered: countWhere(skills, (skill) => skill.regressionFixture !== null),
        files: regression.files,
        missing: skills.filter((skill) => skill.regressionFixture === null).map((skill) => skill.skill),
      },
      routingNegatives: {
        covered: countWhere(skills, (skill) => skill.hasRoutingNegatives),
        files: routingNegatives.size,
        missing: skills.filter((skill) => !skill.hasRoutingNegatives).map((skill) => skill.skill),
      },
      unmatched: {
        behavioral: [...behavioral.bySkill.keys()].filter((name) => !skillNames.has(name)).sort(compareCodeUnit),
        regression: [...regression.bySkill.keys()].filter((name) => !skillNames.has(name)).sort(compareCodeUnit),
      },
    },
    routing,
    graph: {
      nodes: Object.keys(graph.nodes).length,
      edges: (graph.edges ?? []).length,
      edgeTypes,
      topCentral: central.map((entry) => ({
        skill: idByName.get(entry.name) ?? entry.name,
        name: entry.name,
        domain: entry.domain,
        score: entry.score,
        fanIn: entry.fanIn,
        fanOut: entry.fanOut,
      })),
      cycles: dependencyCycles(graph).map((cycle) => cycle.map((name) => idByName.get(name) ?? name)),
    },
    manifests: {
      expected: skills.length,
      present: manifests.files.length,
      missing: missingManifests,
      stale: staleManifests,
      extra: manifests.files.filter((name) => !manifestNames.has(name)),
    },
    skills,
  };
}

/* --------------------------------------------------------------- html render */

const CSS = `:root{--bg:#0b0e14;--panel:#121824;--panel-2:#0e131d;--line:#243044;--fg:#dce5f2;--muted:#8ba0bd;--accent:#6ea8fe;--ok:#3fb950;--bad:#f85149;--warn:#d29922}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:13px/1.55 ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:1180px;margin:0 auto;padding:24px 20px 64px}
.masthead{border-bottom:1px solid var(--line);padding-bottom:14px}
h1{font-size:19px;margin:0 0 6px;letter-spacing:.5px}
.sub{color:var(--muted);font-size:12px}
nav.toc{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0 26px}
nav.toc a{border:1px solid var(--line);border-radius:3px;padding:3px 8px;font-size:12px;color:var(--fg);background:var(--panel)}
nav.toc a:hover{border-color:var(--accent);text-decoration:none}
section{margin:0 0 32px}
h2{font-size:13px;text-transform:uppercase;letter-spacing:1px;color:var(--accent);border-bottom:1px solid var(--line);padding-bottom:6px;margin:0 0 14px}
h3{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin:18px 0 8px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.stat{background:var(--panel);border:1px solid var(--line);border-radius:4px;padding:10px 12px}
.stat .k{color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.6px}
.stat .v{font-size:20px;margin-top:2px}
.stat .n{color:var(--muted);font-size:11px;margin-top:2px}
.bars{display:flex;flex-direction:column;gap:5px}
.bar{display:grid;grid-template-columns:200px 1fr 96px;gap:10px;align-items:center;font-size:12px}
.bar .label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar .track{background:var(--panel-2);border:1px solid var(--line);height:11px;border-radius:2px;overflow:hidden}
.bar .fill{display:block;height:100%;background:linear-gradient(90deg,#2f6fd0,var(--accent))}
.bar .val{color:var(--muted);text-align:right}
table{border-collapse:collapse;width:100%;font-size:12px}
th,td{border-bottom:1px solid var(--line);padding:5px 8px;text-align:left;vertical-align:top}
th{color:var(--muted);font-weight:400;text-transform:uppercase;letter-spacing:.5px;font-size:10px;background:var(--panel);position:sticky;top:0}
tbody tr:hover{background:var(--panel-2)}
td.num,th.num{text-align:right}
.matrix td,.matrix th{text-align:center}
.matrix td.hot{color:var(--bad)}
.chip{display:inline-block;border:1px solid var(--line);border-radius:3px;padding:0 5px;font-size:10px;color:var(--muted);margin-right:3px}
.chip.on{color:var(--ok);border-color:#1f6f33}
.badge{display:inline-block;border-radius:3px;padding:0 6px;font-size:11px;border:1px solid}
.badge.ok{color:var(--ok);border-color:#1f6f33;background:#0f2417}
.badge.bad{color:var(--bad);border-color:#7a2b2b;background:#2a1214}
.badge.warn{color:var(--warn);border-color:#7a5c1e;background:#2a2113}
.badge.risk-low{color:var(--ok);border-color:#1f6f33}
.badge.risk-medium{color:var(--warn);border-color:#7a5c1e}
.badge.risk-high{color:var(--bad);border-color:#7a2b2b}
.listbox{background:var(--panel);border:1px solid var(--line);border-radius:4px;padding:10px 12px;max-height:190px;overflow:auto;font-size:12px;color:var(--muted)}
.listbox div{padding:1px 0}
.note{background:var(--panel);border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:3px;padding:10px 12px;font-size:12px;color:var(--muted);margin:0 0 14px}
.filter{display:flex;gap:10px;align-items:center;margin:0 0 10px;flex-wrap:wrap}
.filter input{flex:1;min-width:260px;background:var(--panel-2);border:1px solid var(--line);border-radius:3px;color:var(--fg);padding:7px 10px;font:inherit}
.filter input:focus{outline:none;border-color:var(--accent)}
.filter .count{color:var(--muted);font-size:12px}
.muted{color:var(--muted)}
.scroll{overflow:auto;max-height:640px;border:1px solid var(--line);border-radius:4px}
footer{border-top:1px solid var(--line);margin-top:34px;padding-top:14px;color:var(--muted);font-size:11px}
code{background:var(--panel-2);border:1px solid var(--line);border-radius:3px;padding:0 4px;font-size:11px}`;

const FILTER_SCRIPT = `(function () {
  'use strict';
  var input = document.getElementById('skill-filter');
  var rows = Array.prototype.slice.call(document.querySelectorAll('#skills-table tbody tr'));
  var count = document.getElementById('skill-filter-count');
  if (!input) { return; }
  var apply = function () {
    var query = input.value.trim().toLowerCase();
    var shown = 0;
    for (var i = 0; i < rows.length; i += 1) {
      var haystack = rows[i].getAttribute('data-search') || '';
      var visible = query === '' || haystack.indexOf(query) !== -1;
      rows[i].style.display = visible ? '' : 'none';
      if (visible) { shown += 1; }
    }
    if (count) { count.textContent = shown + ' / ' + rows.length + ' shown'; }
  };
  input.addEventListener('input', apply);
  apply();
})();`;

const NAV = [
  ['summary', 'Summary'],
  ['domains', 'Domains'],
  ['matrix', 'Risk x tier'],
  ['fixtures', 'Fixture coverage'],
  ['routing', 'Routing metrics'],
  ['graph', 'Dependency graph'],
  ['manifests', 'Runtime manifests'],
  ['skills', 'Skill table'],
];

function statTile(key, value, note) {
  return `<div class="stat"><div class="k">${escapeHtml(key)}</div><div class="v">${escapeHtml(value)}</div><div class="n">${escapeHtml(note)}</div></div>`;
}

function barRow(label, value, max) {
  const width = max > 0 ? round((value / max) * 100, 2) : 0;
  return `<div class="bar"><span class="label">${escapeHtml(label)}</span>`
    + `<span class="track"><span class="fill" style="width:${width}%"></span></span>`
    + `<span class="val">${escapeHtml(value)}</span></div>`;
}

function badge(kind, text) {
  return `<span class="badge ${escapeHtml(kind)}">${escapeHtml(text)}</span>`;
}

function riskBadge(risk) {
  return badge(`risk-${risk}`, risk);
}

function listBox(items, emptyLabel) {
  if (!items.length) return `<div class="listbox"><div>${escapeHtml(emptyLabel)}</div></div>`;
  const rows = items.map((item) => `<div>${escapeHtml(item)}</div>`).join('');
  return `<div class="listbox">${rows}</div>`;
}

function renderSummary(data) {
  const s = data.summary;
  const tiles = [
    statTile('skills', s.skills, 'bundle entries, platform excluded'),
    statTile('domains', s.domains, 'top-level domains'),
    statTile('risk low', s.risk.low, `${percent(s.risk.low, s.skills)}% of the bundle`),
    statTile('risk medium', s.risk.medium, `${percent(s.risk.medium, s.skills)}% of the bundle`),
    statTile('risk high', s.risk.high, `${percent(s.risk.high, s.skills)}% of the bundle`),
    statTile('tier 1', s.trustTiers[1], 'least trusted'),
    statTile('tier 2', s.trustTiers[2], ''),
    statTile('tier 3', s.trustTiers[3], ''),
    statTile('tier 4', s.trustTiers[4], 'most trusted'),
    statTile('side effects', s.sideEffects.declared, `${s.sideEffects.total} declared effects`),
    statTile('approval required', s.approvals.required, `${s.approvals.withTargets} list approval targets`),
    statTile('manifests ok', countManifestStatus(data, 'ok'), 'runtime manifests fresh'),
    statTile('manifests stale', countManifestStatus(data, 'stale'), 'frontmatter hash drift'),
    statTile('manifests missing', countManifestStatus(data, 'missing'), 'no runtime manifest'),
    statTile('graph nodes', s.graph.nodes, `${s.graph.edges} typed edges`),
    statTile('agent cards', s.agentCards.present, `of ${s.skills} skills`),
    statTile('capabilities', s.capabilities.declared, `${s.capabilities.none} skills declare none`),
  ];
  const indexNote = s.index.present
    ? `${s.index.skills} skills indexed, ${s.index.terms} terms - ${s.index.matchesBundle ? 'matches the bundle' : 'DRIFTS from the bundle'}`
    : 'not generated yet';
  const edgeSummary = s.graph.edgeTypes.map((entry) => `${entry.value} ${entry.count}`).join(', ') || 'none';
  return `<section id="summary"><h2>1. Summary</h2>`
    + `<div class="grid">${tiles.join('')}</div>`
    + `<h3>Declared side effects (top ${s.sideEffects.top.length || 0})</h3>`
    + `<div class="bars">${s.sideEffects.top.map((entry) => barRow(entry.value, entry.count, s.sideEffects.top[0]?.count ?? 0)).join('')}</div>`
    + `<h3>Graph edge types</h3><p class="muted">${escapeHtml(edgeSummary)}</p>`
    + `<h3>Search index</h3><p class="muted">${escapeHtml(indexNote)}</p>`
    + `</section>`;
}

function countManifestStatus(data, status) {
  return data.skills.reduce((total, skill) => (skill.manifestStatus === status ? total + 1 : total), 0);
}

function renderDomains(data) {
  const max = data.domains.reduce((peak, row) => Math.max(peak, row.count), 0);
  const rows = data.domains.map((row) => barRow(row.domain, row.count, max)).join('');
  const table = data.domains.map((row) => `<tr><td>${escapeHtml(row.domain)}</td>`
    + `<td class="num">${row.count}</td>`
    + `<td class="num">${row.risk.low}</td><td class="num">${row.risk.medium}</td><td class="num">${row.risk.high}</td>`
    + `<td class="num">${row.trustTiers[1]}</td><td class="num">${row.trustTiers[2]}</td>`
    + `<td class="num">${row.trustTiers[3]}</td><td class="num">${row.trustTiers[4]}</td>`
    + `<td class="num">${row.approvals}</td><td class="num">${row.withSideEffects}</td>`
    + `<td class="num">${row.manifests.ok}</td><td class="num">${row.manifests.missing}</td>`
    + `<td class="num">${row.manifests.stale}</td></tr>`).join('');
  return `<section id="domains"><h2>2. Skills by domain</h2>`
    + `<div class="bars">${rows}</div>`
    + `<h3>Per-domain breakdown</h3>`
    + `<table><thead><tr><th>domain</th><th class="num">skills</th>`
    + `<th class="num">low</th><th class="num">medium</th><th class="num">high</th>`
    + `<th class="num">t1</th><th class="num">t2</th><th class="num">t3</th><th class="num">t4</th>`
    + `<th class="num">approval</th><th class="num">effects</th>`
    + `<th class="num">ok</th><th class="num">missing</th><th class="num">stale</th>`
    + `</tr></thead><tbody>${table}</tbody></table></section>`;
}

function renderMatrix(data) {
  const { risks, tiers, cells } = data.riskTierMatrix;
  const head = `<tr><th>risk \\ trustTier</th>${tiers.map((tier) => `<th class="num">${tier}</th>`).join('')}<th class="num">total</th></tr>`;
  const rows = risks.map((risk, rowIndex) => {
    const cellsHtml = tiers.map((tier, columnIndex) => {
      const value = cells[rowIndex][columnIndex];
      // Sensitive per the tool-risk policy: high risk at any tier, medium risk
      // from trust tier 3 up.
      const hot = risk === 'high' || (risk === 'medium' && Number(tier) >= 3);
      return `<td class="num${hot ? ' hot' : ''}">${value}</td>`;
    }).join('');
    const total = cells[rowIndex].reduce((sum, value) => sum + value, 0);
    return `<tr><td>${riskBadge(risk)}</td>${cellsHtml}<td class="num">${total}</td></tr>`;
  }).join('');
  const totals = tiers.map((_, columnIndex) => cells.reduce((sum, row) => sum + row[columnIndex], 0));
  const footer = `<tr><td>total</td>${totals.map((value) => `<td class="num">${value}</td>`).join('')}`
    + `<td class="num">${totals.reduce((sum, value) => sum + value, 0)}</td></tr>`;
  return `<section id="matrix"><h2>3. Risk x trustTier matrix</h2>`
    + `<div class="note">Cell counts are bundle skills that declare the row's risk and the column's trust tier. `
    + `Red marks the combinations the tool-risk policy treats as sensitive: high risk at any tier, and medium risk from tier 3 up.</div>`
    + `<table class="matrix"><thead>${head}</thead><tbody>${rows}${footer}</tbody></table></section>`;
}

function renderFixtures(data) {
  const total = data.summary.skills;
  const coverage = data.fixtureCoverage;
  const rows = [
    ['Behavioral fixture', coverage.behavioral.covered, coverage.behavioral.missing.length],
    ['Regression fixture', coverage.regression.covered, coverage.regression.missing.length],
    ['Routing negative controls', coverage.routingNegatives.covered, coverage.routingNegatives.missing.length],
  ].map(([label, covered, missing]) => `<tr><td>${escapeHtml(label)}</td>`
    + `<td class="num">${covered}</td><td class="num">${percent(covered, total)}%</td>`
    + `<td class="num">${missing}</td></tr>`).join('');
  const unmatched = [...coverage.unmatched.behavioral, ...coverage.unmatched.regression].sort(compareCodeUnit);
  return `<section id="fixtures"><h2>4. Fixture coverage</h2>`
    + `<div class="note">A skill counts as covered when a fixture file in <code>fixtures/behavioral/</code>, `
    + `<code>fixtures/regression/</code>, or <code>evals/routing/</code> names it. Routing coverage means the skill's `
    + `CSV carries at least one <code>should_trigger=false</code> negative control.</div>`
    + `<table><thead><tr><th>coverage</th><th class="num">skills</th><th class="num">share</th><th class="num">missing</th></tr></thead>`
    + `<tbody>${rows}</tbody></table>`
    + `<h3>Missing behavioral fixture (${coverage.behavioral.missing.length})</h3>${listBox(coverage.behavioral.missing, 'none - every skill has a behavioral fixture')}`
    + `<h3>Missing regression fixture (${coverage.regression.missing.length})</h3>${listBox(coverage.regression.missing, 'none - every skill has a regression fixture')}`
    + `<h3>Missing routing negative controls (${coverage.routingNegatives.missing.length})</h3>${listBox(coverage.routingNegatives.missing, 'none - every skill has negative controls')}`
    + `<h3>Fixture skills that are not bundle skills (${unmatched.length})</h3>${listBox(unmatched, 'none - every fixture resolves to a bundle skill')}`
    + `</section>`;
}

function renderRouting(data) {
  if (!data.routing) {
    return `<section id="routing"><h2>5. Routing metrics</h2>`
      + `<div class="note">No routing metrics yet. Generate them with `
      + `<code>node .agents/skills/platform/evals/evaluate-routing.mjs --json</code>.</div></section>`;
  }
  const r = data.routing;
  const t = r.thresholds;
  const metricRow = (label, value, verdict, thresholdText, higherIsBetter) => {
    const good = verdict === 'pass';
    const arrow = higherIsBetter ? '>=' : '<=';
    return `<tr><td>${escapeHtml(label)}</td><td class="num">${value}</td>`
      + `<td>${badge(good ? 'ok' : 'bad', good ? 'pass' : 'fail')}</td>`
      + `<td class="muted">${escapeHtml(arrow)} ${escapeHtml(thresholdText)}</td></tr>`;
  };
  const rows = [
    metricRow('top1Accuracy', r.metrics.top1Accuracy, r.verdicts.top1Accuracy, t.minTop1Accuracy, true),
    metricRow('top3Recall', r.metrics.top3Recall, r.verdicts.top3Recall, t.minTop3Recall, true),
    metricRow('falsePositiveRate', r.metrics.falsePositiveRate, r.verdicts.falsePositiveRate, t.maxFalsePositiveRate, false),
    `<tr><td>negativeRejectionRate</td><td class="num">${r.metrics.negativeRejectionRate}</td>`
      + `<td><span class="badge warn">info</span></td><td class="muted">no threshold</td></tr>`,
    `<tr><td>adjacentCaptureRate</td><td class="num">${r.metrics.adjacentCaptureRate}</td>`
      + `<td><span class="badge warn">info</span></td><td class="muted">no threshold</td></tr>`,
    `<tr><td>coverage</td><td class="num">${r.metrics.coverage}</td>`
      + `<td><span class="badge warn">info</span></td><td class="muted">share of rows evaluated</td></tr>`,
  ].join('');
  const perSkill = r.perSkill.map((entry) => `<tr><td>${escapeHtml(entry.skill)}</td>`
    + `<td class="num">${entry.rows}</td><td class="num">${entry.top1Accuracy}</td>`
    + `<td class="num">${entry.top3Recall}</td><td class="num">${entry.falsePositiveRate}</td></tr>`).join('');
  return `<section id="routing"><h2>5. Routing metrics</h2>`
    + `<div class="note">Green means the metric clears its threshold, red means it does not. `
    + `Thresholds come from <code>metrics/routing/latest.json</code> (${escapeHtml(String(r.rows))} rows, `
    + `tool ${escapeHtml(r.tool)}, status ${escapeHtml(r.status)}); metrics the file does not threshold are shown as info.</div>`
    + `<table><thead><tr><th>metric</th><th class="num">value</th><th>verdict</th><th>threshold</th></tr></thead>`
    + `<tbody>${rows}</tbody></table>`
    + `<h3>Per-skill routing metrics (${r.perSkill.length})</h3>`
    + `<table><thead><tr><th>skill</th><th class="num">rows</th><th class="num">top1</th>`
    + `<th class="num">top3</th><th class="num">fp rate</th></tr></thead><tbody>${perSkill}</tbody></table>`
    + `</section>`;
}

function renderGraph(data) {
  const g = data.graph;
  const max = g.topCentral.reduce((peak, entry) => Math.max(peak, entry.score), 0);
  const bars = g.topCentral.map((entry) => barRow(entry.skill, entry.score, max)).join('');
  const rows = g.topCentral.map((entry) => `<tr><td>${escapeHtml(entry.skill)}</td>`
    + `<td class="num">${entry.score}</td><td class="num">${entry.fanIn}</td>`
    + `<td class="num">${entry.fanOut}</td><td>${escapeHtml(entry.domain)}</td></tr>`).join('');
  const cycles = g.cycles.length
    ? g.cycles.map((cycle) => `<div>${escapeHtml(cycle.join(' -&gt; '))}</div>`).join('')
    : '<div>none - the dependency graph is acyclic</div>';
  return `<section id="graph"><h2>6. Dependency graph</h2>`
    + `<div class="note">Centrality is Personalized PageRank (damping 0.85) over the typed edge graph with a uniform `
    + `seed - the propagation <code>skill-graph.mjs rank</code> runs, seeded equally instead of by a query. `
    + `Top ${g.topCentral.length} of ${g.nodes} nodes / ${g.edges} edges.</div>`
    + `<div class="bars">${bars}</div>`
    + `<h3>Centrality table</h3>`
    + `<table><thead><tr><th>skill</th><th class="num">pagerank</th><th class="num">fan-in</th>`
    + `<th class="num">fan-out</th><th>domain</th></tr></thead><tbody>${rows}</tbody></table>`
    + `<h3>Circular dependencies (${g.cycles.length})</h3><div class="listbox">${cycles}</div>`
    + `</section>`;
}

function renderManifests(data) {
  const m = data.manifests;
  const stale = m.stale.map((entry) => `<div><strong>${escapeHtml(entry.skill)}</strong> declared ${escapeHtml(entry.declared)} but the manifest stores ${escapeHtml(entry.stored)}</div>`).join('');
  return `<section id="manifests"><h2>7. Runtime manifests</h2>`
    + `<div class="note">A manifest is stale when its <code>frontmatterHash</code> no longer matches the hash of the `
    + `current <code>SKILL.md</code> frontmatter. Regenerate with `
    + `<code>node .agents/skills/platform/scripts/build-runtime-manifests.mjs --write</code>.</div>`
    + `<div class="grid">`
    + statTile('manifests expected', m.expected, 'one per bundle skill')
    + statTile('manifests present', m.present, `${m.extra.length} files without a skill`)
    + statTile('missing', m.missing.length, 'skill without a manifest')
    + statTile('stale', m.stale.length, 'manifest behind its SKILL.md')
    + `</div>`
    + `<h3>Skills without a runtime manifest (${m.missing.length})</h3>${listBox(m.missing, 'none - every skill has a runtime manifest')}`
    + `<h3>Stale manifests (${m.stale.length})</h3>`
    + (stale ? `<div class="listbox">${stale}</div>` : listBox([], 'none - every manifest is fresh'))
    + `<h3>Manifest files without a bundle skill (${m.extra.length})</h3>${listBox(m.extra, 'none - no orphan manifest files')}`
    + `</section>`;
}

function renderSkillsTable(data) {
  const rows = data.skills.map((skill) => {
    const search = [
      skill.skill, skill.name, skill.domain, skill.description, skill.risk,
      skill.trustTier, skill.modelTier, skill.artifactType, skill.sideEffects.join(' '),
      skill.tags.join(' '),
    ].join(' ').toLowerCase();
    const fixtureChips = [
      skill.behavioralFixture ? '<span class="chip on">beh</span>' : '',
      skill.regressionFixture ? '<span class="chip on">reg</span>' : '',
      skill.hasRoutingNegatives ? '<span class="chip on">neg</span>' : '',
    ].join('');
    const manifestBadge = skill.manifestStatus === 'ok'
      ? badge('ok', 'ok')
      : (skill.manifestStatus === 'stale' ? badge('bad', 'stale') : badge('warn', 'missing'));
    return `<tr data-search="${escapeHtml(search)}">`
      + `<td>${escapeHtml(skill.skill)}</td>`
      + `<td>${escapeHtml(skill.domain)}</td>`
      + `<td>${riskBadge(skill.risk)}</td>`
      + `<td class="num">${skill.trustTier}</td>`
      + `<td>${escapeHtml(skill.modelTier)}</td>`
      + `<td>${escapeHtml(skill.artifactType || '-')}</td>`
      + `<td class="num">${skill.sideEffects.length}</td>`
      + `<td>${skill.approvalRequired ? 'yes' : 'no'}</td>`
      + `<td>${fixtureChips || '<span class="chip">none</span>'}</td>`
      + `<td>${manifestBadge}</td>`
      + `<td class="muted">${escapeHtml(skill.description)}</td>`
      + `</tr>`;
  }).join('');
  return `<section id="skills"><h2>8. Skill table</h2>`
    + `<div class="filter"><input id="skill-filter" type="search" placeholder="filter by name, domain, description, risk, trustTier, model, artifact..."`
    + ` aria-label="filter skills"><span class="count" id="skill-filter-count"></span></div>`
    + `<noscript><p class="note">JavaScript is disabled: the filter does nothing, but every row is in the table.</p></noscript>`
    + `<div class="scroll"><table id="skills-table"><thead><tr><th>skill</th><th>domain</th><th>risk</th>`
    + `<th class="num">tier</th><th>model</th><th>artifact</th><th class="num">effects</th>`
    + `<th>approval</th><th>fixtures</th><th>manifest</th><th>description</th>`
    + `</tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

/** renderDashboard(data) - the whole dashboard as one self-contained HTML document. */
export function renderDashboard(data) {
  const nav = NAV.map(([id, label]) => `<a href="#${id}">${escapeHtml(label)}</a>`).join('');
  const generated = data.generatedAt
    ? `<!-- generated ${escapeHtml(data.generatedAt)} -->`
    : '<!-- generated -->';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>quirk skills bundle dashboard</title>
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
<header class="masthead">
<h1>quirk skills bundle dashboard</h1>
<div class="sub">${escapeHtml(data.summary.skills)} skills across ${escapeHtml(data.summary.domains)} domains. Static, self-contained, offline: no network requests, no external assets.</div>
</header>
${generated}
<nav class="toc">${nav}</nav>
<main>
${renderSummary(data)}
${renderDomains(data)}
${renderMatrix(data)}
${renderFixtures(data)}
${renderRouting(data)}
${renderGraph(data)}
${renderManifests(data)}
${renderSkillsTable(data)}
</main>
<footer>
<p>Generated artifact - do not edit by hand. Regenerate with <code>${escapeHtml(REGENERATE_COMMAND)}</code>.</p>
<p>Skill cards: <code>.agents/skills/platform/skill-cards/</code>. Field semantics and color thresholds: <code>.agents/skills/platform/dashboard/README.md</code>.</p>
</footer>
</div>
<script>${FILTER_SCRIPT}</script>
</body>
</html>
`;
}

/* ---------------------------------------------------------------- skill card */

function frontmatterBlockLines(text, key) {
  const lines = String(text ?? '').split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^${key}:`).test(line));
  if (start === -1) return [];
  const out = [];
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break; // the next top-level key ends the block
    out.push(line);
  }
  while (out.length > 0 && out[out.length - 1].trim() === '') out.pop();
  // Strip the shared minimum indent, never more, so a nested block keeps its
  // relative shape inside the card.
  const indents = out.filter((line) => line.trim() !== '').map((line) => line.match(/^ */)[0].length);
  const base = indents.length ? Math.min(...indents) : 0;
  return out.map((line) => line.slice(base));
}

function isScalarBlock(lines) {
  return lines.length > 0 && lines.every((line) => /^-\s+[^:]+$/.test(line.trim()));
}

// The declared trigger of a skill: the clause after "Use when", or the first
// sentence of the description when the skill does not phrase one that way.
export function triggerSentence(description) {
  const text = String(description ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const firstStop = text.search(/\.\s/);
  const firstSentence = (firstStop === -1 ? text : text.slice(0, firstStop)).trim().replace(/\.$/, '');
  const useWhen = text.match(/\buse when\b\s*(.+)/i);
  if (!useWhen) return firstSentence;
  const clause = useWhen[1];
  const stop = clause.search(/\.\s/);
  return (stop === -1 ? clause : clause.slice(0, stop)).trim().replace(/\.$/, '');
}

function inlineList(values) {
  return values.length ? values.map((value) => `\`${value}\``).join(', ') : 'none declared';
}

function blockLink(relative, label) {
  return relative ? `[${label}](${relative})` : label;
}

/**
 * buildSkillCard(skill, manifest, context) - one Markdown "model card".
 * `skill` is a record from buildDashboardData(), `manifest` is the parsed runtime
 * manifest or null, and context carries the card directory plus an optional
 * name-to-id resolver used to link dependencies and compatible skills.
 */
export function buildSkillCard(skill, manifest, context = {}) {
  const cardsDir = context.cardsDir ?? CARDS_REL_DIR;
  const resolveId = typeof context.cardIdFor === 'function' ? context.cardIdFor : () => null;
  const link = (target) => {
    if (!target) return null;
    const relative = path.posix.relative(cardsDir, target);
    return relative === '' ? null : relative;
  };

  const skillDoc = link(`${skill.path}/SKILL.md`);
  const manifestLink = link(skill.manifestFile);
  const behavioralLink = link(skill.behavioralFixture);
  const regressionLink = link(skill.regressionFixture);
  const routingFixture = skill.routingFixture ?? null;
  const routingLink = link(routingFixture?.file ?? null);
  const agentCardLink = link(skill.agentCard);
  const cardLinkFor = (name) => {
    const id = resolveId(name);
    return id ? link(`${cardsDir}/${cardFileName(id)}`) : null;
  };

  const lines = [];
  lines.push(`# ${skill.name}`);
  lines.push('');
  lines.push(`Generated skill card for \`${skill.skill}\`. Do not edit this file by hand: it is a pure function`);
  lines.push('of the bundle. Regenerate every card with:');
  lines.push('');
  lines.push(`    ${REGENERATE_COMMAND}`);
  lines.push('');
  lines.push(`- **Skill**: \`${skill.skill}\``);
  lines.push(`- **Domain**: \`${skill.domain}\``);
  lines.push(`- **Category**: \`${skill.category || skill.domain}\``);
  lines.push(`- **Maturity**: \`${skill.maturity || 'not declared'}\``);
  lines.push(`- **Version**: \`${skill.version || 'not declared'}\``);
  lines.push(`- **License**: \`${skill.license || 'not declared'}\``);
  if (skill.diataxis) lines.push(`- **Diataxis**: \`${skill.diataxis}\``);
  lines.push(`- **Source**: ${blockLink(skillDoc, 'SKILL.md')}`);
  lines.push('');
  lines.push('## Description');
  lines.push('');
  lines.push(skill.description || 'No description declared.');
  lines.push('');
  lines.push('## Risk and execution');
  lines.push('');
  lines.push(`- **Risk**: \`${skill.risk}\``);
  lines.push(`- **Trust tier**: \`${skill.trustTier}\``);
  lines.push(`- **Model tier**: \`${skill.modelTier}\``);
  lines.push(`- **Max iterations**: \`${skill.maxIterations}\``);
  if (skill.promptVersion) lines.push(`- **Prompt version**: \`${skill.promptVersion}\``);
  if (skill.reloadPolicy) lines.push(`- **Reload policy**: \`${skill.reloadPolicy}\``);
  lines.push(`- **Artifact type**: \`${skill.artifactType || 'none declared'}\``);
  lines.push(`- **Approval required**: \`${skill.approvalRequired ? 'yes' : 'no'}\``);
  lines.push(`- **Approval for**: ${inlineList(skill.approvalFor)}`);
  lines.push(`- **Side effects**: ${inlineList(skill.sideEffects)}`);
  lines.push('');
  lines.push('## Capabilities');
  lines.push('');
  if (skill.capabilities.length) lines.push(...skill.capabilities.map((entry) => `- \`${entry}\``));
  else lines.push('None declared.');
  lines.push('');
  lines.push('## Tags');
  lines.push('');
  lines.push(skill.tags.length ? skill.tags.map((tag) => `\`${tag}\``).join(', ') : 'None declared.');
  lines.push('');

  // Raw lines: keep the indentation, so the rendered YAML block keeps its shape.
  const inputsBlock = Array.isArray(skill.inputsBlock) ? skill.inputsBlock : [];
  const outputsBlock = Array.isArray(skill.outputsBlock) ? skill.outputsBlock : [];
  lines.push('## Inputs');
  lines.push('');
  if (!inputsBlock.length) lines.push('None declared.');
  else if (isScalarBlock(inputsBlock)) lines.push(...inputsBlock.map((line) => `- \`${unquote(line.trim().replace(/^-\s+/, ''))}\``));
  else lines.push('```yaml', ...inputsBlock, '```');
  lines.push('');
  lines.push('## Outputs');
  lines.push('');
  if (!outputsBlock.length) lines.push(`None declared. Artifact type: \`${skill.artifactType || 'none declared'}\`.`);
  else lines.push('```yaml', ...outputsBlock, '```');
  lines.push('');

  lines.push('## Fixtures');
  lines.push('');
  lines.push(`- **Behavioral fixture**: ${behavioralLink ? `[${behavioralLink}](${behavioralLink})` : 'not present'}`);
  lines.push(`- **Regression fixture**: ${regressionLink ? `[${regressionLink}](${regressionLink})` : 'not present'}`);
  if (routingFixture) {
    const negative = routingFixture.negatives > 0 ? `${routingFixture.negatives} negative control(s)` : 'no negative controls';
    lines.push(`- **Routing fixture**: ${routingLink ? `[${routingLink}](${routingLink})` : routingFixture.file} - ${routingFixture.rows} rows, ${negative}`);
  } else {
    lines.push('- **Routing fixture**: not present');
  }
  if (skill.declaredFixturesPath) lines.push(`- **Declared fixturesPath**: \`${skill.declaredFixturesPath}\``);
  else lines.push('- **Declared fixturesPath**: not declared');
  lines.push('');

  lines.push('## Runtime manifest');
  lines.push('');
  if (manifest === null) {
    lines.push('No runtime manifest for this skill.');
    lines.push('');
    lines.push('Generate one with `node .agents/skills/platform/scripts/build-runtime-manifests.mjs --write`.');
  } else {
    const execution = manifest.execution ?? {};
    const tools = execution.tools ?? {};
    const guardrails = manifest.guardrails ?? {};
    lines.push(`- **File**: ${manifestLink ? `[${manifestLink}](${manifestLink})` : skill.manifestFile}`);
    const status = skill.manifestStatus === 'ok'
      ? 'present and fresh'
      : (skill.manifestStatus === 'stale' ? 'present but STALE (frontmatter hash drift)' : 'present');
    lines.push(`- **Status**: ${status}`);
    lines.push(`- **Role**: \`${manifest.role ?? 'not declared'}\``);
    lines.push(`- **Isolation**: \`${execution.isolation ?? 'not declared'}\``);
    lines.push(`- **Max turns**: \`${execution.maxTurns ?? 'not declared'}\``);
    lines.push(`- **Default agent**: \`${execution.defaultAgent ?? 'not declared'}\``);
    lines.push(`- **Tools allow**: ${inlineList(toList(tools.allow))}`);
    lines.push(`- **Tools deny**: ${inlineList(toList(tools.deny))}`);
    lines.push(`- **Guardrail side effects**: ${inlineList(toList(guardrails.sideEffects))}`);
    lines.push(`- **Verification commands**: ${inlineList(toList(manifest.verification?.commands))}`);
    lines.push(`- **Artifact schema**: ${manifest.verification?.artifactSchema ? `\`${manifest.verification.artifactSchema}\`` : 'none'}`);
    lines.push(`- **Trace events**: ${inlineList(toList(manifest.observability?.traceEvents))}`);
  }
  lines.push('');

  lines.push('## Dependencies');
  lines.push('');
  if (skill.dependencies.length) {
    for (const dependency of skill.dependencies) {
      const relative = cardLinkFor(dependency);
      lines.push(relative ? `- [${dependency}](${relative})` : `- \`${dependency}\``);
    }
  } else lines.push('None declared.');
  lines.push('');
  lines.push('## Compatible skills');
  lines.push('');
  if (skill.compatibility.length) {
    for (const entry of skill.compatibility) {
      const relative = cardLinkFor(entry);
      lines.push(relative ? `- [${entry}](${relative})` : `- \`${entry}\``);
    }
  } else lines.push('None declared.');
  lines.push('');
  lines.push('## Agent card');
  lines.push('');
  lines.push(agentCardLink ? `[${agentCardLink}](${agentCardLink})` : 'Not generated for this skill.');
  lines.push('');

  if (skill.clauses.length) {
    lines.push('## Clauses');
    lines.push('');
    for (const clause of skill.clauses) {
      const head = clause.id ? `**${clause.id}**` : 'clause';
      const check = clause.checkPath
        ? ` - check: [${clause.check}](${path.posix.relative(cardsDir, `${clause.checkPath}${clause.checkFragment ? `#${clause.checkFragment}` : ''}`)})`
        : (clause.check ? ` - declared check: \`${clause.check}\`` : '');
      lines.push(`- ${head}: ${clause.text}${check}`);
    }
    lines.push('');
  }

  const trigger = triggerSentence(skill.description);
  lines.push('## Non-goals / when not to use');
  lines.push('');
  if (trigger) {
    lines.push(`- In scope: ${trigger}.`);
    lines.push(`- Out of scope: requests that do not match that declared trigger.`);
  } else {
    lines.push('- No declared trigger: read the description above before routing a request here.');
  }
  if (skill.compatibility.length) {
    lines.push(`- When the request belongs to ${inlineList(skill.compatibility)}, hand off there instead of widening this skill's scope.`);
  }
  lines.push('- This card is documentation; the contract lives in the skill body.');
  lines.push('');
  lines.push('## Regeneration');
  lines.push('');
  lines.push(`Source of truth: ${blockLink(skillDoc, 'SKILL.md')}. Regenerate with:`);
  lines.push('');
  lines.push(`    ${REGENERATE_COMMAND}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

/** buildCardsIndex(data) - the Markdown index that tables every card. */
export function buildCardsIndex(data) {
  const rows = data.skills.map((skill) => {
    const file = cardFileName(skill.skill);
    const fixtures = [
      skill.behavioralFixture ? 'beh' : '',
      skill.regressionFixture ? 'reg' : '',
      skill.hasRoutingNegatives ? 'neg' : '',
    ].filter(Boolean).join(' ') || '-';
    return `| [\`${skill.skill}\`](${file}) | ${skill.domain} | ${skill.risk} | ${skill.trustTier} | ${skill.modelTier} | ${fixtures} | ${skill.manifestStatus} |`;
  }).join('\n');
  const coverage = data.fixtureCoverage;
  return `# Skill cards (generated)

One Markdown card per bundle skill: ${data.skills.length} cards in this directory.
These files and this index are GENERATED. Do not edit them by hand; regenerate with:

    ${REGENERATE_COMMAND}

## What a card carries

Each card is a "model card" for one skill, projected from its \`SKILL.md\`
frontmatter, its runtime manifest, and the fixtures that name it:

identity (domain, category, maturity, version, license), description, risk and
trust tier, model tier and max iterations, capabilities, inputs and outputs with
the artifact type, declared side effects, approval requirement and its targets,
dependencies, compatible skills, fixture paths, the runtime manifest summary
(role, isolation, max turns, allowed and denied tools), tags, contract clauses,
and the non-goals derived from the declared trigger.

## Index

| Skill | Domain | Risk | Trust tier | Model tier | Fixtures | Manifest |
|---|---|---|---|---|---|---|
${rows}

## Totals

- Skills: ${data.summary.skills} across ${data.summary.domains} domains.
- Risk: low ${data.summary.risk.low}, medium ${data.summary.risk.medium}, high ${data.summary.risk.high}.
- Trust tiers: ${data.summary.trustTiers[1]} / ${data.summary.trustTiers[2]} / ${data.summary.trustTiers[3]} / ${data.summary.trustTiers[4]} for tiers 1 to 4.
- Skills with a declared side effect: ${data.summary.sideEffects.declared}; requiring approval: ${data.summary.approvals.required}.
- Behavioral fixture: ${coverage.behavioral.covered} of ${data.summary.skills}; regression fixture: ${coverage.regression.covered} of ${data.summary.skills}; routing negative controls: ${coverage.routingNegatives.covered} of ${data.summary.skills}.
- Runtime manifests: ${data.manifests.present} present, ${data.manifests.missing.length} missing, ${data.manifests.stale.length} stale.

Legend - fixtures: \`beh\` behavioral, \`reg\` regression, \`neg\` routing negative controls, \`-\` none.
Manifest: \`ok\` fresh, \`stale\` behind its \`SKILL.md\` frontmatter hash, \`missing\` not generated.

The bundle dashboard that aggregates the same data is
[\`../dashboard/index.html\`](../dashboard/index.html).
`;
}

/* ----------------------------------------------------------------------- cli */

const USAGE = `build-skill-dashboard.mjs - static bundle dashboard, skill cards, and card index

Usage:
  node build-skill-dashboard.mjs [--write] [--json] [--out <path>]
                                 [--now <iso>] [--skill <domain/name>] [--root DIR]

Options:
  --write             persist the dashboard and every card (default is a dry run)
  --json              print the report as JSON
  --out <path>        dashboard output path, relative to the root
                      (default .agents/skills/platform/dashboard/index.html)
  --now <iso>         value emitted as the generation timestamp; omitted means the
                      output stays byte-identical across runs
  --skill <domain/name>
                      restrict the run to one skill: only that card is planned or
                      written, and the dashboard is left untouched
  --root <dir>        bundle root (default is the current working directory)

Exit codes: 0 = ok (dry run or written), 1 = write failure, 2 = usage error.`;

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) args[key] = true;
    else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function pruneCards(dir, keep) {
  const removed = [];
  for (const name of listNames(dir, (entry) => entry.endsWith(CARD_SUFFIX))) {
    if (keep.has(name)) continue;
    rmSync(path.join(dir, name), { force: true });
    removed.push(name);
  }
  return removed;
}

function main(argv) {
  const args = parseArgs(argv);
  if (args.help || args.h) {
    console.log(USAGE);
    return 0;
  }
  if (args._.length > 0) {
    console.error(`build-skill-dashboard: unexpected argument: ${args._[0]}`);
    return 2;
  }
  for (const flag of ['out', 'now', 'skill', 'root']) {
    if (args[flag] === true) {
      console.error(`build-skill-dashboard: --${flag} requires a value`);
      return 2;
    }
  }

  const root = path.resolve(String(args.root ?? process.cwd()));
  const selected = args.skill === undefined ? null : String(args.skill).trim();
  if (selected === '') {
    console.error('build-skill-dashboard: --skill requires <domain/name>');
    return 2;
  }

  let data;
  try {
    data = buildDashboardData(root, { now: typeof args.now === 'string' ? args.now : null });
  } catch (error) {
    console.error(`build-skill-dashboard: cannot read the bundle at ${root}: ${error?.message ?? error}`);
    return 1;
  }

  if (selected !== null && !data.skills.some((skill) => skill.skill === selected)) {
    console.error(`build-skill-dashboard: no bundle skill matches --skill ${selected}`);
    return 2;
  }

  const scoped = selected !== null;
  const cards = data.skills
    .filter((skill) => !scoped || skill.skill === selected)
    .map((skill) => ({
      file: cardFileName(skill.skill),
      content: buildSkillCard(skill, skill.manifest ?? null, {
        cardsDir: CARDS_REL_DIR,
        cardIdFor: (name) => {
          const match = data.skills.find((candidate) => candidate.name === String(name));
          return match ? match.skill : null;
        },
      }),
    }));

  const html = scoped ? null : renderDashboard(data);
  const cardsIndex = scoped ? null : buildCardsIndex(data);
  const dashboardFile = scoped
    ? null
    : (args.out === undefined ? path.join(root, DASHBOARD_REL_FILE) : path.resolve(root, String(args.out)));
  const cardsDir = path.join(root, CARDS_REL_DIR);
  const keep = new Set(cards.map((card) => card.file));

  const pruned = [];
  let written = false;
  if (args.write) {
    try {
      if (dashboardFile !== null) {
        mkdirSync(path.dirname(dashboardFile), { recursive: true });
        writeFileSync(dashboardFile, html);
      }
      mkdirSync(cardsDir, { recursive: true });
      for (const card of cards) {
        writeFileSync(path.join(cardsDir, card.file), card.content);
      }
      if (cardsIndex !== null) {
        writeFileSync(path.join(cardsDir, CARDS_INDEX_FILE), cardsIndex);
        pruned.push(...pruneCards(cardsDir, keep));
      }
      written = true;
    } catch (error) {
      console.error(`build-skill-dashboard: write failed: ${error?.message ?? error}`);
      return 1;
    }
  }

  const dashboardBytes = html === null ? 0 : Buffer.byteLength(html, 'utf8');
  const cardsBytes = cards.reduce((total, card) => total + Buffer.byteLength(card.content, 'utf8'), 0)
    + (cardsIndex === null ? 0 : Buffer.byteLength(cardsIndex, 'utf8'));
  const report = {
    tool: 'build-skill-dashboard.mjs',
    status: written ? 'written' : 'dry-run',
    root,
    generatedAt: data.generatedAt,
    scope: selected,
    dashboard: dashboardFile === null
      ? null
      : {
        file: toPosix(path.relative(root, dashboardFile)) || DASHBOARD_REL_FILE,
        bytes: dashboardBytes,
        written,
      },
    cards: {
      dir: toPosix(path.relative(root, cardsDir)) || CARDS_REL_DIR,
      count: cards.length,
      index: cardsIndex === null ? null : CARDS_INDEX_FILE,
      pruned,
      bytes: cardsBytes,
      written,
    },
    data,
  };

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
    return 0;
  }

  const summary = data.summary;
  const routing = data.routing
    ? `routing top1 ${data.routing.metrics.top1Accuracy} (${data.routing.verdicts.top1Accuracy})`
    : 'routing metrics absent';
  console.log(`[build-skill-dashboard] ${report.status}: ${summary.skills} skills, ${summary.domains} domains, ${routing}`);
  console.log(`[build-skill-dashboard] manifests: ${data.manifests.present} present, ${data.manifests.missing.length} missing, ${data.manifests.stale.length} stale`);
  if (report.dashboard) {
    console.log(`[build-skill-dashboard] dashboard: ${report.dashboard.file} (${report.dashboard.bytes} bytes)`);
  }
  console.log(`[build-skill-dashboard] cards: ${cards.length} -> ${report.cards.dir} (${cardsBytes} bytes)`);
  if (pruned.length) console.log(`[build-skill-dashboard] pruned ${pruned.length} stale card file(s)`);
  if (!written) console.log('[build-skill-dashboard] dry run; pass --write to persist the artifacts');
  return 0;
}

const invokedDirectly = (() => {
  try {
    return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  process.exit(main(process.argv.slice(2)));
}
