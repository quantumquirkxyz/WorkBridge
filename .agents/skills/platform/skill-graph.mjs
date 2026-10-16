#!/usr/bin/env node
// skill-graph.mjs - Graph-driven skill routing over the canonical quirk skill bundle.
//
// Research basis (implemented faithfully):
//   - HippoRAG (arXiv 2405.14831): Personalized PageRank over a knowledge graph.
//     Node specificity = 1 / (number of sources mentioning the node) acts as a
//     local IDF - rare terms and rarely mentioned skills carry more signal.
//   - HippoRAG 2 (arXiv 2502.14802): pure knowledge-graph retrieval REGRESSED on
//     simple factual queries versus keyword baselines. Lesson applied here:
//     exact/keyword matching stays the primary path; the graph only re-ranks
//     and augments candidates through neighborhood activation. This is enforced
//     as a hard two-tier ranking: tier-1 (seed/keyword hits) ALWAYS outranks
//     tier-2 (pure neighborhood activation), whatever the activation score.
//   - GraphRAG community summaries (coarse first, fan out later): neighborhood
//     activation pulls adjacent skills forward before a human has to
//     disambiguate by hand.
//
// The bundle's flat description/keyword routing is structurally vector-RAG over
// isolated chunks. This module materializes the implicit edges between those
// chunks:
//   - dependencies frontmatter     A -> B  ("depends-on", weight 1.0)
//   - compatibility frontmatter     A <-> B  ("compatible", weight 0.4, activated in both directions)
//   - artifact handoffs in bodies   A -> B  ("handoff", weight 0.8) - parsed from
//     `nextConsumer` targets and "hands off to <skill>" / "delegates to <skill>"
//     style references. Precision note: extraction is best-effort regex; a
//     reference becomes an edge only when it resolves to a known skill name in
//     the bundle. Prose that names no real skill is ignored - recall is
//     deliberately sacrificed so the graph stays a re-ranker, never an oracle.
//   - capability tokens shared     A -- B  ("capability", weight = Jaccard of the
//     two capability arrays x 0.2). Empty capability sets produce no edges.
//
// Node specificity is computed from the graph itself: specificity(token) =
// 1 / df(token), where df is the number of skills mentioning the token anywhere
// in name, description, or capabilities (HippoRAG's local IDF).
//
// Usage:
//   node skill-graph.mjs build [--root DIR] [--json]
//   node skill-graph.mjs rank "<query>" [--root DIR] [--json] [--limit N]
//   node skill-graph.mjs neighbors <skill> [--root DIR] [--json]
//   node skill-graph.mjs --compare <decisions.jsonl> [--root DIR] [--json]
//
// Seed scoring (tier 1, primary path):
//   exact normalized-name match                score = 100
//   otherwise per query token (stopwords dropped):
//     name hit        weight 3.0 x specificity(token)
//     capability hit  weight 1.5 x specificity(token)
//     description hit weight 1.0 x specificity(token)
//   (strongest field wins per token; a token is counted once)
//
// Propagation (tier 2, re-ranker): Personalized PageRank with damping 0.85 over
// the typed edge graph. Effective edge weight = declared weight x type weight.
// Dangling mass is redistributed to the seed set, so scores always sum to 1.

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const DAMPING = 0.85;
const EDGE_TYPE_WEIGHTS = { 'depends-on': 1.0, compatible: 0.4, handoff: 0.8, capability: 0.2 };
const UNDIRECTED_TYPES = new Set(['compatible']);
const MAX_ITERATIONS = 200;
// collectSkills()'s recursion guard (depth < 4) admits a SKILL.md up to five
// levels below .agents/skills; the manifest filter mirrors that bound.
const MAX_SKILL_NESTING = 5;
const TOLERANCE = 1e-10;

const STOPWORDS = new Set([
  'a', 'an', 'the', 'to', 'for', 'of', 'and', 'or', 'in', 'on', 'with', 'from', 'by', 'at', 'as',
  'into', 'about', 'over', 'under', 'up', 'down', 'out', 'off', 'my', 'me', 'i', 'you', 'we', 'us',
  'our', 'your', 'this', 'that', 'these', 'those', 'it', 'is', 'are', 'be', 'been', 'do', 'does',
  'did', 'how', 'what', 'which', 'who', 'when', 'where', 'why', 'can', 'could', 'should', 'would',
  'will', 'shall', 'may', 'might', 'must', 'then', 'than', 'so', 'if', 'not', 'no', 'any', 'some',
  'help', 'need', 'want', 'using', 'use', 'via', 'per',
]);

export function tokenize(text) {
  return String(text || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

export function normalizeQuery(query) {
  return String(query || '').toLowerCase().trim().replace(/\s+/g, '-');
}

export function parseFrontmatter(text) {
  if (!text.startsWith('---')) return {};
  const end = text.indexOf('\n---', 3);
  if (end === -1) return {};
  const out = {};
  let active = null;
  for (const line of text.slice(4, end).split(/\r?\n/)) {
    const key = line.match(/^([A-Za-z][A-Za-z0-9-]*):\s*(.*)$/);
    if (key) {
      active = key[1];
      let raw = key[2].replace(/^["']|["']$/g, '');
      if (raw === '') {
        out[active] = [];
      } else if (raw.startsWith('[') && raw.endsWith(']')) {
        try {
          out[active] = JSON.parse(raw);
        } catch {
          out[active] = raw.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);
        }
      } else {
        out[active] = raw;
      }
      continue;
    }
    const item = line.match(/^\s+-\s+(.+)$/);
    if (item && active) {
      if (!Array.isArray(out[active])) out[active] = [];
      out[active].push(item[1].replace(/^["']|["']$/g, ''));
    }
  }
  return out;
}

function toList(value) {
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return String(value).split(',').map((entry) => entry.trim()).filter(Boolean);
}

function bodyOf(text) {
  if (!text.startsWith('---')) return text;
  const end = text.indexOf('\n---', 3);
  return end === -1 ? text : text.slice(text.indexOf('\n', end + 1) + 1);
}

function extractHandoffTargets(body, knownNames) {
  const targets = new Set();
  const add = (name) => {
    const candidate = String(name || '').trim().toLowerCase();
    if (knownNames.has(candidate)) targets.add(candidate);
  };
  for (const line of body.split(/\r?\n/)) {
    if (!/nextConsumer/i.test(line)) continue;
    for (const match of line.matchAll(/`([^`]+)`/g)) {
      const inner = match[1].trim();
      if (/^[a-z][a-z0-9-]*$/.test(inner)) add(inner);
    }
  }
  const phrasePatterns = [
    /\bhand(?:s|ed|ing)?\s+off\s+to\s+`?([a-z][a-z0-9-]*)`?/gi,
    /\bdelegat(?:e|es|ed|ing)\s+to\s+`?([a-z][a-z0-9-]*)`?/gi,
  ];
  for (const pattern of phrasePatterns) {
    for (const match of body.matchAll(pattern)) add(match[1]);
  }
  return [...targets];
}

export function collectSkills(root) {
  const skillsRoot = join(root, '.agents', 'skills');
  const out = [];
  const scan = (dir, domain, depth) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === 'platform') continue;
      const child = join(dir, entry.name);
      const skillMd = join(child, 'SKILL.md');
      if (existsSync(skillMd)) {
        const text = readFileSync(skillMd, 'utf8');
        const fm = parseFrontmatter(text);
        out.push({
          name: entry.name,
          domain: domain || 'uncategorized',
          tier: fm.trustTier === undefined || fm.trustTier === '' ? '1' : String(fm.trustTier),
          artifactType: fm.artifactType ? String(fm.artifactType) : '',
          capabilities: toList(fm.capabilities),
          dependencies: toList(fm.dependencies),
          compatibility: toList(fm.compatibility),
          description: typeof fm.description === 'string' ? fm.description : '',
          body: bodyOf(text),
          path: relative(root, child),
        });
      } else if (depth < 4) {
        scan(child, domain || entry.name, depth + 1);
      }
    }
  };
  scan(skillsRoot, '', 0);
  return out;
}

// Manifest-driven entry points. The shared manifest (built once per check-all
// run: { path, dirPath, domain, dirName, text }) is mapped onto the exact skill
// records collectSkills() produces, then the identical graph assembly runs over
// them, so a graph built from the manifest equals a graph built from the walk.
export function skillsFromManifest(manifest) {
  const skillsRootSegments = 3; // .agents/skills/<first>/...
  return manifest
    .filter((entry) => {
      const segments = entry.path.split('/');
      const platformExcluded = segments[2] === 'platform';
      const nesting = segments.length - skillsRootSegments; // path segments between the skills root and SKILL.md
      return !platformExcluded && nesting <= MAX_SKILL_NESTING;
    })
    .map((entry) => {
      const relSegments = entry.path.split('/');
      const fm = parseFrontmatter(entry.text);
      return {
        name: entry.dirName,
        domain: relSegments.length === skillsRootSegments + 1 ? 'uncategorized' : entry.domain,
        tier: fm.trustTier === undefined || fm.trustTier === '' ? '1' : String(fm.trustTier),
        artifactType: fm.artifactType ? String(fm.artifactType) : '',
        capabilities: toList(fm.capabilities),
        dependencies: toList(fm.dependencies),
        compatibility: toList(fm.compatibility),
        description: typeof fm.description === 'string' ? fm.description : '',
        body: bodyOf(entry.text),
        path: entry.dirPath,
      };
    });
}

export function buildGraphFromSkills(skills, options = {}) {
  // Canonical order by SKILL.md path - the order the shared manifest already
  // carries - so both entry points (directory walk and manifest audit) persist
  // identical bytes and the tracked file is a pure function of bundle content.
  // readdir order varies by filesystem and would leave it drifting between
  // machines.
  const ordered = [...skills].sort((a, b) => {
    const keyA = `${a.path}/SKILL.md`;
    const keyB = `${b.path}/SKILL.md`;
    return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
  });
  const knownNames = new Set(ordered.map((skill) => skill.name));
  const resolve = (token) => {
    const candidate = String(token || '').trim().toLowerCase().replace(/^["']|["']$/g, '');
    if (knownNames.has(candidate)) return candidate;
    const tail = candidate.split('/').pop();
    return knownNames.has(tail) ? tail : null;
  };

  const nodes = {};
  for (const skill of ordered) {
    nodes[skill.name] = {
      domain: skill.domain,
      tier: skill.tier,
      artifactType: skill.artifactType,
      capabilities: skill.capabilities,
      description: skill.description,
      path: skill.path,
    };
  }

  const edges = [];
  const seen = new Set();
  const addEdge = (from, to, type, weight) => {
    const key = `${from}\u0000${to}\u0000${type}`;
    if (from === to || !knownNames.has(from) || !knownNames.has(to) || seen.has(key)) return;
    seen.add(key);
    edges.push({ from, to, type, weight: Number(weight.toFixed(6)) });
  };

  for (const skill of ordered) {
    for (const dep of skill.dependencies) {
      const target = resolve(dep);
      if (target) addEdge(skill.name, target, 'depends-on', EDGE_TYPE_WEIGHTS['depends-on']);
    }
  }

  for (const skill of ordered) {
    for (const entry of skill.compatibility) {
      const target = resolve(entry);
      if (target) addEdge(skill.name, target, 'compatible', EDGE_TYPE_WEIGHTS.compatible);
    }
  }

  for (const skill of ordered) {
    for (const target of extractHandoffTargets(skill.body, knownNames)) {
      if (target !== skill.name) addEdge(skill.name, target, 'handoff', EDGE_TYPE_WEIGHTS.handoff);
    }
  }

  const withCaps = ordered.filter((skill) => skill.capabilities.length > 0);
  for (let i = 0; i < withCaps.length; i++) {
    for (let j = i + 1; j < withCaps.length; j++) {
      const a = new Set(withCaps[i].capabilities);
      const b = new Set(withCaps[j].capabilities);
      let intersection = 0;
      for (const cap of a) if (b.has(cap)) intersection++;
      if (intersection === 0) continue;
      const union = a.size + b.size - intersection;
      const jaccard = intersection / union;
      addEdge(withCaps[i].name, withCaps[j].name, 'capability', jaccard);
    }
  }

  const graph = {
    version: 1,
    // In-memory telemetry for the stdout report. saveGraph() strips it, so two
    // builds over an unchanged bundle persist byte-identical files.
    generatedAt: new Date().toISOString(),
    root: '.',
    damping: DAMPING,
    edgeTypeWeights: EDGE_TYPE_WEIGHTS,
    nodes,
    edges,
  };
  if (options.meta) Object.assign(graph, options.meta);
  return graph;
}

// Walk-driven entry point kept for the CLI and every other caller.
export function buildGraph(root, options = {}) {
  return buildGraphFromSkills(collectSkills(root), options);
}

export function auditSkills(manifest, { root = '.', save = false } = {}) {
  const graph = buildGraphFromSkills(skillsFromManifest(manifest));
  const file = save ? saveGraph(root, graph) : graphPath(root);
  return {
    status: save ? 'written' : 'dry-run',
    file: relative(root, file),
    nodes: Object.keys(graph.nodes).length,
    edges: graph.edges.length,
    edgeTypes: edgeTypeBreakdown(graph),
  };
}

export function graphPath(root) {
  return join(root, '.agents', 'skills', 'platform', 'graph', 'skill-graph.json');
}

export function saveGraph(root, graph) {
  const file = graphPath(root);
  mkdirSync(join(root, '.agents', 'skills', 'platform', 'graph'), { recursive: true });
  // Determinism contract: the persisted file must be a pure function of the
  // bundle. generatedAt is wall-clock telemetry, so it stays on the in-memory
  // graph and in the stdout report, never in bytes written to disk.
  const persisted = { ...graph };
  delete persisted.generatedAt;
  writeFileSync(file, `${JSON.stringify(persisted, null, 2)}\n`);
  return file;
}

export function loadGraph(root, options = {}) {
  const file = graphPath(root);
  if (!options.fresh && existsSync(file)) {
    try {
      return JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      // fall through to a fresh build
    }
  }
  return buildGraph(root);
}

function mentionVocab(graph) {
  const df = new Map();
  const fields = new Map();
  for (const [name, node] of Object.entries(graph.nodes)) {
    const nameTokens = new Set(tokenize(name));
    const capTokens = new Set();
    for (const cap of node.capabilities || []) for (const t of tokenize(cap)) capTokens.add(t);
    const descTokens = new Set(tokenize(node.description || ''));
    fields.set(name, { nameTokens, capTokens, descTokens });
    for (const token of new Set([...nameTokens, ...capTokens, ...descTokens])) {
      df.set(token, (df.get(token) || 0) + 1);
    }
  }
  return { df, fields };
}

function scoreSeeds(graph, query) {
  const { df, fields } = mentionVocab(graph);
  const queryTokens = tokenize(query).filter((token) => !STOPWORDS.has(token));
  const spec = (token) => 1 / (df.get(token) || 1);
  const norm = normalizeQuery(query);
  const seeds = new Map();
  for (const name of Object.keys(graph.nodes)) {
    const { nameTokens, capTokens, descTokens } = fields.get(name);
    if (norm && norm === name) {
      seeds.set(name, { score: 100, fields: ['name (exact)'], tokens: [norm] });
      continue;
    }
    let score = 0;
    const fieldHits = { name: [], capability: [], description: [] };
    for (const token of queryTokens) {
      if (nameTokens.has(token)) {
        score += 3.0 * spec(token);
        fieldHits.name.push(token);
      } else if (capTokens.has(token)) {
        score += 1.5 * spec(token);
        fieldHits.capability.push(token);
      } else if (descTokens.has(token)) {
        score += 1.0 * spec(token);
        fieldHits.description.push(token);
      }
    }
    if (score > 0) {
      const hitFields = [];
      if (fieldHits.name.length) hitFields.push(`name: ${fieldHits.name.join(', ')}`);
      if (fieldHits.capability.length) hitFields.push(`capability: ${fieldHits.capability.join(', ')}`);
      if (fieldHits.description.length) hitFields.push(`description: ${fieldHits.description.join(', ')}`);
      seeds.set(name, { score, fields: hitFields, tokens: queryTokens });
    }
  }
  return { seeds, queryTokens };
}

function buildAdjacency(graph) {
  const names = Object.keys(graph.nodes);
  const index = new Map(names.map((name, i) => [name, i]));
  const outEdges = names.map(() => []);
  const outWeight = new Float64Array(names.length);
  for (const edge of graph.edges || []) {
    const u = index.get(edge.from);
    const v = index.get(edge.to);
    if (u === undefined || v === undefined) continue;
    const weight = Number(edge.weight) * (EDGE_TYPE_WEIGHTS[edge.type] ?? 1);
    if (!(weight > 0)) continue;
    outEdges[u].push({ v, w: weight, via: edge.from, type: edge.type });
    outWeight[u] += weight;
    if (UNDIRECTED_TYPES.has(edge.type)) {
      outEdges[v].push({ v: u, w: weight, via: edge.to, type: edge.type });
      outWeight[v] += weight;
    }
  }
  return { names, index, outEdges, outWeight };
}

export function propagate(graph, seedWeights, options = {}) {
  const damping = options.damping ?? graph.damping ?? DAMPING;
  const maxIterations = options.maxIterations ?? MAX_ITERATIONS;
  const tolerance = options.tolerance ?? TOLERANCE;
  const { names, index, outEdges, outWeight } = buildAdjacency(graph);
  const n = names.length;
  if (n === 0) return { scores: new Float64Array(0), iterations: 0, converged: true };

  const seed = new Float64Array(n);
  let total = 0;
  for (const [name, weight] of seedWeights) total += Math.max(0, weight);
  if (total > 0) {
    for (const [name, weight] of seedWeights) {
      const i = index.get(name);
      if (i !== undefined) seed[i] = Math.max(0, weight) / total;
    }
  } else {
    for (let i = 0; i < n; i++) seed[i] = 1 / n;
  }

  let x = Float64Array.from(seed);
  let iterations = 0;
  let converged = false;
  for (; iterations < maxIterations; iterations++) {
    const next = new Float64Array(n);
    let danglingMass = 0;
    for (let u = 0; u < n; u++) {
      if (outWeight[u] === 0) {
        danglingMass += x[u];
        continue;
      }
      const share = x[u] / outWeight[u];
      for (const edge of outEdges[u]) next[edge.v] += share * edge.w;
    }
    for (let i = 0; i < n; i++) {
      next[i] = (1 - damping) * seed[i] + damping * (next[i] + danglingMass * seed[i]);
    }
    let delta = 0;
    for (let i = 0; i < n; i++) delta += Math.abs(next[i] - x[i]);
    x = next;
    if (delta < tolerance) {
      converged = true;
      iterations += 1;
      break;
    }
  }
  return { scores: x, iterations, converged };
}

function seedReason(detail) {
  if (!detail) return 'seed match';
  if (detail.fields[0] && detail.fields[0].startsWith('name (exact)')) return 'seed match (exact name)';
  return `seed match (${detail.fields.join('; ')})`;
}

function activationReason(graph, name, scores, adjacency) {
  let best = null;
  const { names, index, outEdges } = adjacency;
  const target = index.get(name);
  if (target === undefined) return 'neighborhood activation';
  for (let u = 0; u < names.length; u++) {
    for (const edge of outEdges[u]) {
      if (edge.v !== target) continue;
      const strength = scores[u] * edge.w;
      if (!best || strength > best.strength) best = { via: edge.via, type: edge.type, strength };
    }
  }
  if (!best) return 'neighborhood activation';
  return `neighborhood activation via ${best.via} (${best.type})`;
}

export function rank(graph, query, options = {}) {
  const { seeds, queryTokens } = scoreSeeds(graph, query);
  const seedWeights = new Map([...seeds].map(([name, detail]) => [name, detail.score]));
  const { scores, iterations, converged } = propagate(graph, seedWeights);
  const adjacency = buildAdjacency(graph);
  const candidates = Object.keys(graph.nodes).map((name) => {
    const seedDetail = seeds.get(name);
    const score = scores[adjacency.index.get(name)] ?? 0;
    const candidate = {
      name,
      score: Number(score.toFixed(8)),
      tier: seedDetail ? 1 : 2,
      reason: seedDetail ? seedReason(seedDetail) : activationReason(graph, name, scores, adjacency),
    };
    if (seedDetail) candidate.seedScore = Number(seedDetail.score.toFixed(8));
    return candidate;
  });
  // HippoRAG-2 invariant, two tiers:
  //   tier 1 = keyword/exact seeds, ordered BY SPECIFICITY (seed score), never by
  //            propagated mass - a rare exact hit can never be outranked by a
  //            better-connected sibling;
  //   tier 2 = pure neighborhood activation, ordered by propagated score.
  // Tier-1 ALWAYS sits above tier-2, whatever the activation scores.
  const tier1 = candidates
    .filter((c) => c.tier === 1)
    .sort((a, b) => (b.seedScore ?? 0) - (a.seedScore ?? 0) || a.name.localeCompare(b.name));
  const tier2 = candidates
    .filter((c) => c.tier === 2)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const ordered = [...tier1, ...tier2];
  const limit = options.limit;
  const visible = limit ? ordered.slice(0, limit) : ordered;
  return {
    query,
    damping: DAMPING,
    queryTokens,
    seedCount: tier1.length,
    iterations,
    converged,
    nodeCount: Object.keys(graph.nodes).length,
    edgeCount: (graph.edges || []).length,
    candidates: visible,
    top1: ordered[0] ? ordered[0].name : null,
  };
}

export function neighbors(graph, skillName) {
  const name = String(skillName || '').toLowerCase().trim();
  const fanIn = [];
  const fanOut = [];
  for (const edge of graph.edges || []) {
    if (edge.to === name) fanIn.push({ from: edge.from, type: edge.type, weight: edge.weight });
    if (edge.from === name) fanOut.push({ to: edge.to, type: edge.type, weight: edge.weight });
  }
  const byType = (a, b) => (EDGE_TYPE_WEIGHTS[b.type] ?? 0) - (EDGE_TYPE_WEIGHTS[a.type] ?? 0)
    || (b.weight ?? 0) - (a.weight ?? 0);
  fanIn.sort((a, b) => byType(a, b) || a.from.localeCompare(b.from));
  fanOut.sort((a, b) => byType(a, b) || a.to.localeCompare(b.to));
  return {
    skill: name,
    exists: Boolean(graph.nodes[name]),
    node: graph.nodes[name] || null,
    fanIn,
    fanOut,
    fanInCount: fanIn.length,
    fanOutCount: fanOut.length,
  };
}

export function compareDecisions(graph, entries, options = {}) {
  const hits = [];
  const misses = [];
  for (const entry of entries) {
    const query = String(entry.query ?? '');
    const selected = String(entry.selected ?? '');
    const { top1 } = rank(graph, query, options);
    if (top1 === selected) hits.push({ query, selected });
    else misses.push({ query, selected, top1 });
  }
  const total = entries.length;
  return {
    entries: total,
    top1Hits: hits.length,
    top1Rate: total ? Number((hits.length / total).toFixed(6)) : 0,
    hits,
    misses,
  };
}

function readDecisionLog(file) {
  const text = readFileSync(file, 'utf8');
  const entries = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') entries.push(parsed);
    } catch {
      // skip malformed lines: diagnostic mode must never crash the router
    }
  }
  return entries;
}

function parseArgs(argv) {
  const flags = { json: false, fresh: false, root: process.cwd(), limit: 10, compare: null };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') flags.json = true;
    else if (arg === '--fresh') flags.fresh = true;
    else if (arg === '--root') flags.root = argv[++i] || process.cwd();
    else if (arg === '--limit') flags.limit = Number(argv[++i]) || 10;
    else if (arg === '--compare') flags.compare = argv[++i];
    else if (arg === '--help' || arg === '-h') flags.help = true;
    else positional.push(arg);
  }
  return { flags, positional };
}

function edgeTypeBreakdown(graph) {
  const counts = {};
  for (const edge of graph.edges || []) counts[edge.type] = (counts[edge.type] || 0) + 1;
  return counts;
}

function printRankHuman(result) {
  console.log(`[skill-graph] query="${result.query}" nodes=${result.nodeCount} edges=${result.edgeCount} seeds=${result.seedCount} converged=${result.converged} (${result.iterations} iterations, damping=${result.damping})`);
  if (result.candidates.length === 0) console.log('  (no candidates)');
  result.candidates.forEach((candidate, index) => {
    console.log(`  ${index + 1}. ${candidate.name}  score=${candidate.score}  tier=${candidate.tier}  ${candidate.reason}`);
  });
}

function printNeighborsHuman(result) {
  const node = result.node || {};
  console.log(`[skill-graph] ${result.skill}${node.domain ? ` (${node.domain})` : ''}${result.exists ? '' : ' [unknown skill]'} fan-in=${result.fanInCount} fan-out=${result.fanOutCount}`);
  console.log('  fan-in (prerequisite / inbound references):');
  if (!result.fanIn.length) console.log('    (none)');
  for (const edge of result.fanIn) console.log(`    - ${edge.from} (${edge.type}, weight=${edge.weight})`);
  console.log('  fan-out (declared outbound references):');
  if (!result.fanOut.length) console.log('    (none)');
  for (const edge of result.fanOut) console.log(`    - ${edge.to} (${edge.type}, weight=${edge.weight})`);
}

function printCompareHuman(result) {
  console.log(`[skill-graph] compare: ${result.entries} decisions, ${result.top1Hits} top-1 matches (rate=${result.top1Rate})`);
  for (const miss of result.misses) {
    console.log(`  miss: query="${miss.query}" selected=${miss.selected} top1=${miss.top1}`);
  }
}

function main(argv) {
  const { flags, positional } = parseArgs(argv);
  if (flags.help || (positional.length === 0 && !flags.compare)) {
    console.log('Usage:');
    console.log('  node skill-graph.mjs build [--root DIR] [--json]');
    console.log('  node skill-graph.mjs rank "<query>" [--root DIR] [--json] [--limit N]');
    console.log('  node skill-graph.mjs neighbors <skill> [--root DIR] [--json]');
    console.log('  node skill-graph.mjs --compare <decisions.jsonl> [--root DIR] [--json]');
    return 0;
  }
  const command = positional[0];
  const root = flags.root;
  const graph = command === 'build' ? buildGraph(root) : loadGraph(root, { fresh: flags.fresh });

  if (command === 'build') {
    const file = saveGraph(root, graph);
    const breakdown = edgeTypeBreakdown(graph);
    if (flags.json) {
      console.log(JSON.stringify({
        status: 'written',
        file: relative(root, file),
        generatedAt: graph.generatedAt,
        nodes: Object.keys(graph.nodes).length,
        edges: graph.edges.length,
        edgeTypes: breakdown,
      }, null, 2));
    } else {
      console.log(`[skill-graph] built ${Object.keys(graph.nodes).length} nodes / ${graph.edges.length} edges -> ${relative(root, file)}`);
      for (const [type, count] of Object.entries(breakdown)) console.log(`  ${type}: ${count}`);
    }
    return 0;
  }

  if (command === 'rank') {
    const query = positional.slice(1).join(' ');
    if (!query) {
      console.error('rank requires a query string');
      return 2;
    }
    const result = rank(graph, query, { limit: flags.limit });
    if (flags.json) console.log(JSON.stringify(result, null, 2));
    else printRankHuman(result);
    return 0;
  }

  if (command === 'neighbors') {
    const skill = positional[1];
    if (!skill) {
      console.error('neighbors requires a skill name');
      return 2;
    }
    const result = neighbors(graph, skill);
    if (flags.json) console.log(JSON.stringify(result, null, 2));
    else printNeighborsHuman(result);
    return 0;
  }

  if (flags.compare) {
    if (!existsSync(flags.compare)) {
      console.error(`decision log not found: ${flags.compare}`);
      return 2;
    }
    const entries = readDecisionLog(flags.compare);
    const result = compareDecisions(graph, entries, {});
    if (flags.json) console.log(JSON.stringify(result, null, 2));
    else printCompareHuman(result);
    return 0;
  }

  console.error(`unknown command: ${command}`);
  return 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main(process.argv.slice(2)));
}
