#!/usr/bin/env node
// dag-scheduler.mjs - Ticket DAG scheduling and the over-coupling linter.
//
// Research basis (cited in the consuming skills):
// - FLOW (ICLR 2025, arXiv 2501.07834): a workflow is an Activity-on-Vertex graph;
//   a topological sort yields levels of subtasks that can run in parallel.
//   Theorem 1: additional dependency edges REDUCE expected subtask success rate,
//   so an over-coupling linter is well-founded - redundant edges are removed or
//   recorded as intentional rather than left implicit.
//
// Formulas (also reported in JSON output):
// - level(ticket) = 0 when it has no blockers, else 1 + max(level(blocker))
// - parallelism score = (tickets - (waves - 1)) / tickets; the share of tickets
//   that add no further sequential layer. 1.0 = one parallel wave, and a fully
//   linear chain tends to 0.
// - dependency complexity = declared blocking edges / tickets
// - redundant edge = an edge the blocker still implies through another blocker
//   (transitive edge): removing it changes no ticket's level, so per FLOW
//   Theorem 1 it only lowers expected subtask success.
//
// Usage:
//   node dag-scheduler.mjs levels <file> [--json]
//   node dag-scheduler.mjs check <file> [--json]
//   node dag-scheduler.mjs <file> [--json]        (alias for levels)
//   node dag-scheduler.mjs --demo [--json]
//   node dag-scheduler.mjs --determine-default
//
// Exit codes: 0 = computable DAG (warnings are reported, never fatal),
//             1 = cycle or dangling blocker reference,
//             2 = usage or I/O error.

import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(HERE, '..', '..', '..');

const FAN_IN_LIMIT = 3;

const DEFAULT_DAG_FILES = [
  path.join(repoRoot, '.agents', 'skills', 'platform', 'workflows', 'default-dag.json'),
  path.join(repoRoot, '.agents', 'skills', 'platform', 'artifacts', 'default-dag.json'),
];

const usage = `dag-scheduler commands:
  levels <file> [--json]   topological waves (level 0 = no blockers)
  check <file> [--json]    over-coupling warnings; exit 1 on cycles
  <file> [--json]         alias for levels
  --demo [--json]          clean 3-wave DAG plus an over-coupled DAG with a redundant edge
  --determine-default      print the default DAG file, or "skip" when none exists`;

function round(value, digits = 4) {
  return Number(value.toFixed(digits));
}

export function ticketId(raw, index) {
  if (raw === undefined || raw === null || raw === '') return String(index + 1);
  return String(raw.id ?? raw.number ?? raw.key ?? raw.name ?? index + 1);
}

export function normalizeInput(payload) {
  let list = null;
  if (Array.isArray(payload)) list = payload;
  else if (payload && Array.isArray(payload.tickets)) list = payload.tickets;
  else if (payload && Array.isArray(payload.output)) list = payload.output;
  if (!list) {
    throw new Error('input must be a JSON array of tickets, {tickets:[...]}, or a TicketArtifact with an output array');
  }
  return list.map((raw, index) => {
    if (!raw || typeof raw !== 'object') throw new Error(`ticket at position ${index + 1} is not an object`);
    const rawBlockers = raw.blockedBy ?? raw.blockers ?? raw.blocked_by ?? [];
    if (!Array.isArray(rawBlockers)) throw new Error(`ticket ${ticketId(raw, index)}: blockedBy must be an array`);
    return {
      id: ticketId(raw, index),
      title: String(raw.title ?? raw.name ?? raw.id ?? `ticket ${index + 1}`),
      blockedBy: rawBlockers.map((value) => String(value)),
    };
  });
}

export function resolveBlockers(tickets) {
  const byId = new Map(tickets.map((ticket) => [ticket.id, ticket]));
  const byNumber = new Map(tickets.map((ticket, index) => [String(index + 1), ticket]));
  const byTitle = new Map();
  for (const ticket of tickets) {
    const key = ticket.title.trim().toLowerCase();
    if (key && !byTitle.has(key)) byTitle.set(key, ticket);
  }
  const dangling = [];
  for (const ticket of tickets) {
    ticket.resolved = ticket.blockedBy.map((ref) => {
      const key = ref.replace(/^#/, '').trim();
      const target = byId.get(key) ?? byNumber.get(key) ?? byTitle.get(key.toLowerCase());
      if (!target) dangling.push({ ticket: ticket.id, blockedBy: ref });
      return target ?? null;
    });
  }
  return dangling;
}

export function blockerIdsOf(ticket) {
  return [...new Set((ticket.resolved ?? []).filter(Boolean).map((target) => target.id))];
}

export function computeLevels(tickets) {
  const blockersOf = new Map(tickets.map((ticket) => [ticket.id, new Set()]));
  for (const ticket of tickets) {
    for (const id of blockerIdsOf(ticket)) blockersOf.get(ticket.id).add(id);
  }

  const level = new Map();
  const pending = new Set(tickets.map((ticket) => ticket.id));
  let progressed = true;
  while (pending.size > 0 && progressed) {
    progressed = false;
    for (const id of [...pending]) {
      const upstream = blockersOf.get(id);
      if ([...upstream].some((blocker) => pending.has(blocker))) continue;
      const blockerLevels = [...upstream].map((blocker) => level.get(blocker));
      level.set(id, blockerLevels.length ? 1 + Math.max(...blockerLevels) : 0);
      pending.delete(id);
      progressed = true;
    }
  }

  if (pending.size > 0) return { level, cyclic: [findCycle([...pending], blockersOf)] };
  return { level, cyclic: [] };
}

function findCycle(nodes, blockersOf) {
  const colour = new Map(nodes.map((node) => [node, 'white']));
  const stack = [];
  let cycle = null;
  function visit(node) {
    if (cycle) return;
    colour.set(node, 'grey');
    stack.push(node);
    for (const next of nodes) {
      if (!blockersOf.get(next)?.has(node)) continue;
      if (colour.get(next) === 'grey') {
        cycle = [...stack.slice(stack.indexOf(next)), next];
        return;
      }
      if (colour.get(next) === 'white') visit(next);
      if (cycle) return;
    }
    stack.pop();
    colour.set(node, 'black');
  }
  for (const node of nodes) {
    if (cycle) break;
    if (colour.get(node) === 'white') visit(node);
  }
  return cycle ?? [...nodes, nodes[0]];
}

export function buildLevels(tickets, level) {
  const scheduled = tickets.filter((ticket) => level.has(ticket.id));
  const maxLevel = scheduled.length ? Math.max(...scheduled.map((ticket) => level.get(ticket.id))) : -1;
  return Array.from({ length: maxLevel + 1 }, (_, index) => ({
    level: index,
    tickets: scheduled.filter((ticket) => level.get(ticket.id) === index),
  }));
}

export function ancestorsOf(tickets) {
  const blockersOf = new Map(tickets.map((ticket) => [ticket.id, blockerIdsOf(ticket)]));
  const ancestors = new Map();
  for (const ticket of tickets) ancestors.set(ticket.id, new Set());
  function compute(id) {
    const cached = ancestors.get(id);
    if (cached.size > 0) return cached;
    const found = new Set();
    ancestors.set(id, found);
    for (const blocker of blockersOf.get(id) ?? []) {
      found.add(blocker);
      for (const ancestor of compute(blocker)) found.add(ancestor);
    }
    return found;
  }
  for (const ticket of tickets) compute(ticket.id);
  return ancestors;
}

export function redundantEdges(tickets, ancestors) {
  const redundant = [];
  for (const ticket of tickets) {
    const blockers = blockerIdsOf(ticket);
    if (blockers.length < 2) continue;
    for (const blocker of blockers) {
      const implied = blockers
        .filter((id) => id !== blocker)
        .some((other) => (ancestors.get(other) ?? new Set()).has(blocker));
      if (implied) redundant.push({ from: blocker, to: ticket.id });
    }
  }
  return redundant;
}

export function analyze(payload) {
  const tickets = normalizeInput(payload);
  const dangling = resolveBlockers(tickets);
  const { level, cyclic } = computeLevels(tickets);

  const errors = [];
  for (const entry of dangling) {
    errors.push(`ticket ${entry.ticket}: blockedBy ${entry.blockedBy} references no ticket in the artifact`);
  }
  for (const cycle of cyclic) errors.push(`dependency cycle detected: ${cycle.join(' -> ')}`);

  const waves = buildLevels(tickets, level);
  const ancestors = ancestorsOf(tickets);
  const edgeCount = tickets.reduce((total, ticket) => total + blockerIdsOf(ticket).length, 0);
  const widestWave = waves.reduce((widest, wave) => Math.max(widest, wave.tickets.length), 0);

  const parallelismScore = tickets.length === 0 ? 0 : round((tickets.length - (waves.length - 1)) / tickets.length);
  const dependencyComplexity = tickets.length ? round(edgeCount / tickets.length) : 0;

  const warnings = [];
  for (const edge of redundantEdges(tickets, ancestors)) {
    warnings.push({
      type: 'redundant-edge',
      from: edge.from,
      to: edge.to,
      message: `edge ${edge.from} -> ${edge.to} is redundant (${edge.from} already reaches ${edge.to} through another blocker, so removal changes no level); per FLOW Theorem 1 an extra edge lowers expected subtask success`,
    });
  }
  for (const ticket of tickets) {
    const fanIn = blockerIdsOf(ticket).length;
    if (fanIn > FAN_IN_LIMIT) {
      warnings.push({
        type: 'fan-in',
        ticket: ticket.id,
        fanIn,
        message: `ticket ${ticket.id} has ${fanIn} blockers (limit ${FAN_IN_LIMIT})`,
      });
    }
  }

  return {
    tool: 'dag-scheduler',
    formulas: {
      level: 'level = 0 when a ticket has no blockers, else 1 + max(level of blockers)',
      parallelismScore: '(tickets - (waves - 1)) / tickets - share of tickets that add no sequential layer; 1.0 = one parallel wave',
      dependencyComplexity: 'declared blocking edges / tickets',
      redundantEdge: 'an edge whose blocker still reaches the ticket through another blocker, so removal changes no level',
    },
    ticketCount: tickets.length,
    edgeCount,
    waves: waves.length,
    widestWave,
    levels: waves.map((wave) => ({
      level: wave.level,
      count: wave.tickets.length,
      tickets: wave.tickets.map((ticket) => ({ id: ticket.id, title: ticket.title })),
    })),
    parallelismScore,
    dependencyComplexity,
    warnings,
    errors,
    status: errors.length ? 'fail' : 'pass',
  };
}

export function printAnalysis(analysis) {
  const lines = [
    `dag-scheduler: ${analysis.ticketCount} ticket(s), ${analysis.edgeCount} edge(s), ${analysis.waves} wave(s)`,
  ];
  for (const wave of analysis.levels) {
    lines.push(`  wave ${wave.level} (${wave.count} parallelizable)`);
    for (const ticket of wave.tickets) lines.push(`    - ${ticket.id}: ${ticket.title}`);
  }
  lines.push(`  parallelism score: ${analysis.parallelismScore} | dependency complexity: ${analysis.dependencyComplexity}`);
  for (const warning of analysis.warnings) lines.push(`  [over-coupling] ${warning.message}`);
  for (const error of analysis.errors) lines.push(`  [error] ${error}`);
  return lines.join('\n');
}

export function demoPayloads() {
  const clean = [
    { id: 1, title: 'scaffold contracts', blockedBy: [] },
    { id: 2, title: 'write fixtures', blockedBy: [] },
    { id: 3, title: 'define trace schema', blockedBy: [] },
    { id: 4, title: 'implement validator', blockedBy: [1, 2] },
    { id: 5, title: 'implement auditor', blockedBy: [2, 3] },
    { id: 6, title: 'implement ledger', blockedBy: [1, 3] },
    { id: 7, title: 'wire gate checks', blockedBy: [4, 5] },
    { id: 8, title: 'wire cost telemetry', blockedBy: [5, 6] },
    { id: 9, title: 'publish bundle', blockedBy: [4, 6] },
  ];
  return {
    clean,
    overCoupled: [
      ...clean,
      { id: 10, title: 'final report', blockedBy: [9, 1] },
      { id: 11, title: 'over-fanned integration', blockedBy: [1, 2, 3, 4, 5] },
    ],
  };
}

export function defaultDagFile() {
  for (const candidate of DEFAULT_DAG_FILES) {
    if (fsSync.existsSync(candidate)) return candidate;
  }
  return null;
}

export function loadPayload(file) {
  let text;
  try {
    text = fsSync.readFileSync(file, 'utf8');
  } catch (error) {
    throw new Error(`cannot read ${file}: ${error.message}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`invalid JSON in ${file}: ${error.message}`);
  }
}

export async function main(argv = process.argv.slice(2)) {
  const json = argv.includes('--json');
  const positional = argv.filter((value) => !value.startsWith('--'));

  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(usage);
    return 0;
  }

  if (argv.includes('--determine-default')) {
    const file = defaultDagFile();
    console.log(file ? path.relative(repoRoot, file) : 'skip');
    return 0;
  }

  if (argv.includes('--demo')) {
    const payloads = demoPayloads();
    if (json) {
      const reports = {};
      for (const [name, payload] of Object.entries(payloads)) reports[name] = analyze(payload);
      console.log(JSON.stringify({ source: 'demo', reports }, null, 2));
      return 0;
    }
    console.log('clean DAG - three waves, no over-coupling');
    console.log(printAnalysis(analyze(payloads.clean)));
    console.log('');
    console.log('over-coupled DAG - redundant edge plus fan-in pressure');
    console.log(printAnalysis(analyze(payloads.overCoupled)));
    return 0;
  }

  if (positional.length === 0) {
    console.error(usage);
    return 2;
  }

  const command = positional[0];
  const file = command === 'levels' || command === 'check' ? positional[1] : command;

  if (!file) {
    console.error(usage);
    return 2;
  }

  const analysis = analyze(loadPayload(file));
  if (json) {
    console.log(JSON.stringify({ source: file, ...analysis }, null, 2));
  } else {
    console.log(printAnalysis(analysis));
    if (command === 'check' && analysis.warnings.length === 0) console.log('over-coupling check: clean');
  }
  return analysis.errors.length ? 1 : 0;
}

const invokedDirectly = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();

if (invokedDirectly) {
  main().then((code) => process.exit(code)).catch((err) => {
    console.error(`dag-scheduler error: ${err.message}`);
    process.exit(2);
  });
}
