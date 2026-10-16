#!/usr/bin/env node
// trace-improver.mjs - turns execution traces into
// structured skill-improvement proposals.
//
// The bundle already records every skill invocation
// (record-execution.mjs -> .agents/skills/platform/traces/*.jsonl).
// Those traces are the signal the quirk method says
// to measure before repairing; this script is the
// missing loop that closes it: aggregate -> diagnose
// -> propose. It never edits a skill itself. A human
// (or skill-evolver, with its evidence gate) applies
// the proposals.
//
// Diagnosis rules, per skill:
//   T1 blocked-rate    - >25% of traces end blocked
//                        -> the stop condition or the
//                        completion criteria need work
//   T2 iteration-pinch - traces routinely reach the
//                        maxIterations ceiling -> raise
//                        the budget or split the skill
//   T3 schema-drift    - outputs fail their own
//                        schema often -> tighten the
//                        output contract or examples
//   T4 quality-bar     - artifacts miss the quality bar
//                        often -> add guidance, examples
//   T5 blocked-reason  - one blockedBy reason
//                        dominates -> fix that cause
// first
//   T6 slow-trace      - p95 duration far above the
//                        skill median -> investigate the
//                        long tail
//
// Proposals are versioned, typed, and evidence-carrying
// (counts, rates, windows) so they satisfy the
// skill-evolver evidence vocabulary.
//
// Usage:
//   node .agents/skills/platform/trace-improver.mjs [--json] [--write]
//
// --write persists proposals to
//   .agents/skills/platform/artifacts/trace-improvements.json
//
// Exit codes: 0 = proposals emitted (having proposals
// is not a failure), 1 = crash, 2 = usage.

import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './skill-graph.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.cwd();
const tracesDir = path.join(__dirname, 'traces');
const artifactsDir = path.join(__dirname, 'artifacts');
const outputFile = path.join(artifactsDir, 'trace-improvements.json');

const BLOCKED_RATE_THRESHOLD = 0.25;
const ITERATION_PINCH_RATE = 0.5;
const SCHEMA_DRIFT_RATE = 0.2;
const QUALITY_MISS_RATE = 0.25;
const DOMINANT_REASON_RATE = 0.5;
const SLOW_TAIL_FACTOR = 3;

class UsageError extends Error {}

function parseArgs(argv) {
  const flags = { json: false, write: false, help: false };
  for (const token of argv) {
    if (token === '--json') flags.json = true;
    else if (token === '--write') flags.write = true;
    else if (token === '--help' || token === '-h') flags.help = true;
    else throw new UsageError(`unknown argument: ${token}`);
  }
  return flags;
}

// Minimal frontmatter reader for maxIterations and the
// skill's declared budget, keyed by skill name.
function skillBudgets(skillsRoot) {
  const budgets = new Map();
  const walk = (dir) => {
    for (const entry of fsSync.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === 'platform') continue;
      const child = path.join(dir, entry.name);
      const skillMd = path.join(child, 'SKILL.md');
      if (fsSync.existsSync(skillMd)) {
        const meta = parseFrontmatter(fsSync.readFileSync(skillMd, 'utf8'));
        budgets.set(entry.name, {
          maxIterations: Number.isFinite(Number(meta.maxIterations)) ? Number(meta.maxIterations) : null,
          risk: meta.risk ?? null,
          trustTier: meta.trustTier ?? null,
        });
      } else {
        walk(child);
      }
    }
  };
  walk(skillsRoot);
  return budgets;
}

function readTraces() {
  const traces = [];
  let files = [];
  try {
    files = fsSync.readdirSync(tracesDir).filter((f) => f.endsWith('.jsonl')).sort();
  } catch {
    return traces;
  }
  for (const file of files) {
    const text = fsSync.readFileSync(path.join(tracesDir, file), 'utf8');
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        traces.push(JSON.parse(line));
      } catch {
        // A malformed line is a recorder defect, not an
        // improvement signal; skip it.
      }
    }
  }
  return traces;
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

function aggregate(traces) {
  const bySkill = new Map();
  for (const trace of traces) {
    const name = trace.skill ?? 'unknown';
    if (!bySkill.has(name)) bySkill.set(name, []);
    bySkill.get(name).push(trace);
  }
  return bySkill;
}

function diagnose(name, skillTraces, budgets) {
  const proposals = [];
  const total = skillTraces.length;
  const budget = budgets.get(name) ?? {};

  const results = skillTraces.map((t) => t.result ?? 'unknown');
  const countOf = (value) => results.filter((r) => r === value).length;
  const blockedRate = countOf('blocked') / total;
  const failedRate = countOf('failed') / total;

  // T1 - blocked rate
  if (blockedRate > BLOCKED_RATE_THRESHOLD && total >= 5) {
    proposals.push({
      type: 'stop-condition',
      skill: name,
      severity: blockedRate > 0.5 ? 'high' : 'medium',
      evidence: { traces: total, blockedRate: Number(blockedRate.toFixed(2)) },
      proposal: 'Clarify the stopCondition and completion criteria; over a quarter of runs end blocked.',
    });
  }

  // T2 - iteration pinch
  const iterations = skillTraces.map((t) => t.execution?.iterations ?? 0);
  const atCeiling = budget.maxIterations
    ? iterations.filter((i) => i >= budget.maxIterations).length / total
    : 0;
  if (budget.maxIterations && atCeiling > ITERATION_PINCH_RATE && total >= 5) {
    proposals.push({
      type: 'iteration-budget',
      skill: name,
      severity: 'medium',
      evidence: { traces: total, maxIterations: budget.maxIterations, atCeilingRate: Number(atCeiling.toFixed(2)) },
      proposal: `Runs hit the maxIterations ceiling (${budget.maxIterations}) in over half the traces; raise the budget or split the skill.`,
    });
  }

  // T3 - schema drift
  const outputs = skillTraces.filter((t) => t.output && typeof t.output.schemaValid === 'boolean');
  const schemaDrift = outputs.length ? outputs.filter((t) => !t.output.schemaValid).length / outputs.length : 0;
  if (schemaDrift > SCHEMA_DRIFT_RATE && outputs.length >= 5) {
    proposals.push({
      type: 'schema-validation',
      skill: name,
      severity: 'medium',
      evidence: { outputs: outputs.length, schemaDriftRate: Number(schemaDrift.toFixed(2)) },
      proposal: 'Outputs fail their declared schema too often; tighten the output contract or add an example artifact.',
    });
  }

  // T4 - quality bar
  const quality = skillTraces.filter((t) => t.quality && typeof t.quality.artifactPassedQualityBar === 'boolean');
  const qualityMiss = quality.length ? quality.filter((t) => !t.quality.artifactPassedQualityBar).length / quality.length : 0;
  if (qualityMiss > QUALITY_MISS_RATE && quality.length >= 5) {
    proposals.push({
      type: 'quality-bar',
      skill: name,
      severity: 'medium',
      evidence: { qualityTraces: quality.length, missRate: Number(qualityMiss.toFixed(2)) },
      proposal: 'Artifacts miss the quality bar too often; add guidance, examples, or a tighter completion checklist.',
    });
  }

  // T5 - dominant blocked reason
  const reasons = skillTraces.flatMap((t) => (Array.isArray(t.blockedBy) ? t.blockedBy : []));
  if (reasons.length >= 5) {
    const frequency = new Map();
    for (const reason of reasons) frequency.set(reason, (frequency.get(reason) ?? 0) + 1);
    const [topReason, topCount] = [...frequency.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topCount / reasons.length > DOMINANT_REASON_RATE) {
      proposals.push({
        type: 'blocked-reason',
        skill: name,
        severity: 'high',
        evidence: { reason: topReason, share: Number((topCount / reasons.length).toFixed(2)), blockedTraces: reasons.length },
        proposal: `One cause ("${topReason}") dominates blockers; remove that cause first.`,
      });
    }
  }

  // T6 - slow tail
  const durations = skillTraces.map((t) => t.execution?.durationMs ?? 0).filter((d) => d > 0);
  if (durations.length >= 10) {
    const median = percentile(durations, 50);
    const p95 = percentile(durations, 95);
    if (median > 0 && p95 > median * SLOW_TAIL_FACTOR) {
      proposals.push({
        type: 'slow-trace',
        skill: name,
        severity: 'low',
        evidence: { traces: durations.length, medianMs: Math.round(median), p95Ms: Math.round(p95), tailFactor: Number((p95 / median).toFixed(1)) },
        proposal: 'The p95 duration is a long tail over the median; profile the slow runs before changing the skill.',
      });
    }
  }

  if (failedRate > BLOCKED_RATE_THRESHOLD && total >= 5) {
    proposals.push({
      type: 'failure-rate',
      skill: name,
      severity: 'high',
      evidence: { traces: total, failedRate: Number(failedRate.toFixed(2)) },
      proposal: 'Over a quarter of runs fail; treat as a defect before any improvement work.',
    });
  }

  return proposals;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) {
    console.log('trace-improver options:\n  (no flags) report proposals from recorded traces\n  --write    persist proposals to artifacts/trace-improvements.json\n  --json     machine-readable report\n  --help     this help');
    return 0;
  }

  const traces = readTraces();
  const budgets = skillBudgets(path.join(repoRoot, '.agents', 'skills'));
  const bySkill = aggregate(traces);

  const proposals = [];
  const perSkill = [];
  for (const [name, skillTraces] of [...bySkill.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const skillProposals = diagnose(name, skillTraces, budgets);
    proposals.push(...skillProposals);
    perSkill.push({ skill: name, traces: skillTraces.length, proposals: skillProposals.length });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    tracesAnalyzed: traces.length,
    skillsAnalyzed: bySkill.size,
    proposalsCount: proposals.length,
    byType: proposals.reduce((acc, p) => { acc[p.type] = (acc[p.type] ?? 0) + 1; return acc; }, {}),
    perSkill,
    proposals,
  };

  if (flags.write) {
    await fs.mkdir(artifactsDir, { recursive: true });
    await fs.writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`);
  }

  if (flags.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`[trace-improver] traces: ${report.tracesAnalyzed}, skills: ${report.skillsAnalyzed}, proposals: ${report.proposalsCount}`);
    for (const [type, count] of Object.entries(report.byType)) console.log(`[trace-improver]   ${type}: ${count}`);
    for (const proposal of proposals.slice(0, 10)) {
      console.log(`[trace-improver] [${proposal.severity}] ${proposal.skill} (${proposal.type}): ${proposal.proposal}`);
    }
    if (proposals.length > 10) console.log(`[trace-improver] ... and ${proposals.length - 10} more`);
  }

  return 0;
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      if (error instanceof UsageError) {
        console.error(`[trace-improver] ${error.message}`);
        process.exit(2);
      }
      console.error(`[trace-improver] error: ${error?.message ?? error}`);
      process.exit(1);
    },
  );
}
