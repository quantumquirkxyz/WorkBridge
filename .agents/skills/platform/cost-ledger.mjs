#!/usr/bin/env node
// cost-ledger.mjs - Aggregates execution traces into a per-skill cost ledger.
//
// Research basis (cited in the consuming skills):
// - Traces are the ExecutionTrace records in platform/traces/*.jsonl (see
//   traces/schema.json): model.tier, input/output.sizeTokens, execution.durationMs,
//   and quality fields.
// - Anthropic multi-agent research: token volume explains roughly 80% of agent
//   system performance variance, so cost telemetry is first-class.
// - skill-performance-metrics rule, honoured here: missing data is never silently
//   treated as zero. A trace with no measurable sizeTokens, durationMs, or priced
//   tier is counted as "unknown" and excluded from the aggregate, so a skill with
//   no measurements never looks cheap or fast.
//
// Prices come from platform/cost-model.json, which carries an explicit
// `estimate: true` disclaimer; --no-estimate suppresses every cost figure.
//
// Usage:
//   node cost-ledger.mjs [--by-skill|--by-day] [--since YYYY-MM-DD] [--no-estimate] [--json]
//   node cost-ledger.mjs --traces <dir> --cost-model <file> [--json]
//
// Exit codes: 0 = ledger printed (report-only),
//             2 = usage or I/O error.

import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(HERE, '..', '..', '..');

const DEFAULT_TRACES_DIR = path.join(repoRoot, '.agents', 'skills', 'platform', 'traces');
const DEFAULT_COST_MODEL = path.join(HERE, 'cost-model.json');
const UNKNOWN = 'unknown';

const usage = `cost-ledger options:
  --by-skill           group per skill (default)
  --by-day             group per UTC day of execution.startedAt
  --since YYYY-MM-DD   only traces started on or after this date
  --no-estimate        suppress all cost figures
  --traces <dir>       traces directory (default: platform/traces)
  --cost-model <file>  price table (default: platform/cost-model.json)
  --json               emit machine-readable JSON`;

function isMeasured(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function traceDate(trace, fallback) {
  const startedAt = trace.execution?.startedAt ?? trace.startedAt ?? trace.completedAt;
  if (typeof startedAt === 'string' && startedAt.length >= 10) return startedAt.slice(0, 10);
  return fallback;
}

export function readTraces(tracesDir) {
  if (!fsSync.existsSync(tracesDir)) return [];
  const traces = [];
  for (const entry of fsSync.readdirSync(tracesDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue;
    const fallbackDate = entry.name.replace(/\.jsonl$/, '');
    const text = fsSync.readFileSync(path.join(tracesDir, entry.name), 'utf8');
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      let parsed;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }
      traces.push({ trace: parsed, day: traceDate(parsed, fallbackDate) });
    }
  }
  traces.sort((a, b) => (a.day + a.trace.skill).localeCompare(b.day + b.trace.skill));
  return traces;
}

export function loadCostModel(file) {
  let model;
  try {
    model = JSON.parse(fsSync.readFileSync(file, 'utf8'));
  } catch {
    model = null;
  }
  const tiers = model?.tiers ?? {};
  if (model?.estimate !== true) {
    return { estimate: false, tiers: {}, disclaimer: 'cost-model.json is missing the estimate disclaimer; no cost figures are emitted' };
  }
  return {
    estimate: true,
    tiers,
    disclaimer: typeof model.disclaimer === 'string' ? model.disclaimer : 'estimated cost',
    currency: model.currency ?? 'USD',
  };
}

export function costOf(trace, costModel) {
  const tier = trace.model?.tier;
  const price = costModel.estimate ? costModel.tiers[tier] : null;
  if (!price) return null;
  const input = trace.input?.sizeTokens;
  const output = trace.output?.sizeTokens;
  if (!isMeasured(input) || !isMeasured(output)) return null;
  return (input / 1000) * (price.input ?? 0) + (output / 1000) * (price.output ?? 0);
}

function aggregate(key, entries, costModel, estimate) {
  let runs = 0;
  let tokensKnown = 0;
  let tokensUnknown = 0;
  let durationKnown = 0;
  let durationUnknown = 0;
  let totalTokens = 0;
  let totalDurationMs = 0;
  let costKnown = 0;
  let costUnknown = 0;
  let totalCost = 0;

  for (const { trace } of entries) {
    runs += 1;
    const input = trace.input?.sizeTokens;
    const output = trace.output?.sizeTokens;
    if (isMeasured(input) && isMeasured(output)) {
      tokensKnown += 1;
      totalTokens += input + output;
    } else {
      tokensUnknown += 1;
    }
    const duration = trace.execution?.durationMs;
    if (isMeasured(duration)) {
      durationKnown += 1;
      totalDurationMs += duration;
    } else {
      durationUnknown += 1;
    }
    if (!estimate) continue;
    const cost = costOf(trace, costModel);
    if (cost === null) costUnknown += 1;
    else {
      costKnown += 1;
      totalCost += cost;
    }
  }

  return {
    key,
    runs,
    tokens: {
      measuredRuns: tokensKnown,
      unknownRuns: tokensUnknown,
      total: tokensKnown ? totalTokens : UNKNOWN,
      mean: tokensKnown ? Math.round(totalTokens / tokensKnown) : UNKNOWN,
    },
    durationMs: {
      measuredRuns: durationKnown,
      unknownRuns: durationUnknown,
      total: durationKnown ? totalDurationMs : UNKNOWN,
      mean: durationKnown ? Math.round(totalDurationMs / durationKnown) : UNKNOWN,
    },
    cost: estimate
      ? {
          measuredRuns: costKnown,
          unknownRuns: costUnknown,
          total: costKnown ? Number(totalCost.toFixed(6)) : UNKNOWN,
          mean: costKnown ? Number((totalCost / costKnown).toFixed(6)) : UNKNOWN,
          currency: costModel.currency,
        }
      : { suppressed: true, reason: '--no-estimate' },
  };
}

function groupKey(entry, mode) {
  return mode === 'by-day' ? entry.day : (entry.trace.skill ?? UNKNOWN);
}

export function buildCostLedger({ tracesDir = DEFAULT_TRACES_DIR, costModelFile = DEFAULT_COST_MODEL, mode = 'by-skill', since = null, estimate = true } = {}) {
  const groups = new Map();
  for (const entry of readTraces(tracesDir)) {
    if (since && entry.day < since) continue;
    const key = groupKey(entry, mode);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }

  const costModel = estimate ? loadCostModel(costModelFile) : { estimate: false, tiers: {}, currency: 'USD' };
  const rows = [...groups.entries()]
    .map(([key, entries]) => aggregate(key, entries, costModel, estimate))
    .sort((a, b) => b.runs - a.runs || String(a.key).localeCompare(String(b.key)));

  const totals = rows.reduce(
    (sum, row) => ({
      runs: sum.runs + row.runs,
      tokensMeasured: sum.tokensMeasured + row.tokens.measuredRuns,
      tokensUnknown: sum.tokensUnknown + row.tokens.unknownRuns,
      durationMeasured: sum.durationMeasured + row.durationMs.measuredRuns,
      durationUnknown: sum.durationUnknown + row.durationMs.unknownRuns,
      costMeasured: sum.costMeasured + (estimate ? row.cost.measuredRuns : 0),
      costUnknown: sum.costUnknown + (estimate ? row.cost.unknownRuns : 0),
      totalCost: sum.totalCost + (estimate && row.cost.total !== UNKNOWN ? row.cost.total : 0),
    }),
    { runs: 0, tokensMeasured: 0, tokensUnknown: 0, durationMeasured: 0, durationUnknown: 0, costMeasured: 0, costUnknown: 0, totalCost: 0 },
  );

  return {
    tool: 'cost-ledger',
    tracesDir: path.relative(repoRoot, tracesDir),
    mode,
    since,
    estimate,
    currency: costModel.currency ?? 'USD',
    disclaimer: estimate ? costModel.disclaimer : 'cost estimation suppressed with --no-estimate',
    totalTraces: totals.runs,
    totals,
    groups: rows,
    warnings: [],
    status: 'pass',
  };
}

// Manifest-driven entry point for the check-all gate. The cost ledger
// aggregates traces, not SKILL.md files, so it never walked the bundle in the
// first place: the shared manifest is accepted for wiring uniformity (every
// report-only audit receives the same manifest) and carries no data this tool
// consumes. Avoiding the subprocess spawn is the whole saving here.
export function auditSkills(manifest, options = {}) {
  return buildCostLedger(options);
}

function cell(value) {
  return value === UNKNOWN ? UNKNOWN : String(value);
}

export function printLedger(ledger) {
  const lines = [
    `cost-ledger: ${ledger.totalTraces} trace(s) across ${ledger.groups.length} ${ledger.mode === 'by-day' ? 'day(s)' : 'skill(s)'}`,
    `  ${ledger.disclaimer}`,
    '',
  ];
  const headers = ledger.mode === 'by-day' ? ['day'] : ['skill'];
  headers.push('runs', 'tokens (mean)', 'durationMs (mean)');
  if (ledger.estimate) headers.push(`cost USD (mean)`);
  const rows = ledger.groups.map((row) => {
    const cells = [cell(row.key), String(row.runs), `${cell(row.tokens.total)} (${cell(row.tokens.mean)})`, `${cell(row.durationMs.total)} (${cell(row.durationMs.mean)})`];
    if (ledger.estimate) cells.push(`${cell(row.cost.total)} (${cell(row.cost.mean)})`);
    return cells;
  });
  const widths = headers.map((header, index) => Math.max(header.length, ...rows.map((row) => row[index].length)));
  lines.push(`| ${headers.map((header, index) => header.padEnd(widths[index])).join(' | ')} |`);
  lines.push(`| ${widths.map((width) => '-'.repeat(width)).join(' | ')} |`);
  for (const row of rows) lines.push(`| ${row.map((cellValue, index) => cellValue.padEnd(widths[index])).join(' | ')} |`);
  lines.push('');
  lines.push(`  totals: ${ledger.totals.runs} run(s), tokens measured in ${ledger.totals.tokensMeasured} run(s) and unknown in ${ledger.totals.tokensUnknown} run(s), duration measured in ${ledger.totals.durationMeasured} run(s) and unknown in ${ledger.totals.durationUnknown} run(s)`);
  if (ledger.estimate) {
    lines.push(`  estimated cost: ${ledger.totals.totalCost === 0 && ledger.totals.costMeasured === 0 ? UNKNOWN : ledger.totals.totalCost.toFixed(6)} ${ledger.currency} across ${ledger.totals.costMeasured} measured run(s); ${ledger.totals.costUnknown} run(s) have no priced tier or no measured tokens`);
  }
  return lines.join('\n');
}

export async function main(argv = process.argv.slice(2)) {
  const valueOf = (flag, fallback) => {
    const index = argv.indexOf(flag);
    return index === -1 ? fallback : (argv[index + 1] ?? fallback);
  };

  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(usage);
    return 0;
  }

  const tracesDir = path.resolve(process.cwd(), valueOf('--traces', DEFAULT_TRACES_DIR));
  const costModelFile = path.resolve(process.cwd(), valueOf('--cost-model', DEFAULT_COST_MODEL));
  const mode = argv.includes('--by-day') ? 'by-day' : 'by-skill';
  const estimate = !argv.includes('--no-estimate');
  const since = argv.includes('--since') ? valueOf('--since', null) : null;
  if (since && !/^\d{4}-\d{2}-\d{2}$/.test(since)) {
    console.error('cost-ledger: --since must be YYYY-MM-DD');
    return 2;
  }

  const ledger = buildCostLedger({ tracesDir, costModelFile, mode, since, estimate });
  if (argv.includes('--json')) console.log(JSON.stringify(ledger, null, 2));
  else console.log(printLedger(ledger));
  return 0;
}

const invokedDirectly = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();

if (invokedDirectly) {
  main().then((code) => process.exit(code)).catch((err) => {
    console.error(`cost-ledger error: ${err.message}`);
    process.exit(2);
  });
}
