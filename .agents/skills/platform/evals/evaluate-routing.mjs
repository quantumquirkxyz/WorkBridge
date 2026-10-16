#!/usr/bin/env node
// evaluate-routing.mjs - deterministic (model-free) scorer for the routing
// fixtures in evals/routing/.
//
// run-routing.mjs scores RECORDED routing decisions: an agent harness runs the
// prompts, a JSONL log of what it picked gets replayed, and the report tells you
// how that log did. This scorer answers the prior question without a harness:
// how well does a deterministic BM25 ranker DO on the same fixtures, measured
// the same way. No model is invoked, no model is simulated - the numbers below
// are a property of the ranker and the fixtures, nothing else.
//
// It therefore complements run-routing.mjs rather than replacing it:
//   run-routing.mjs --check   validates fixture shape (the gate)
//   evaluate-routing.mjs      measures ranker quality against those fixtures,
//                             with a baseline mode that flags regressions
//
// The BM25 index is the one scripts/build-skill-index.mjs builds, so the scorer
// and the search CLI can never disagree about ranking.
//
// Metrics (global and per skill):
//   top1Accuracy          rows whose top-1 is the expected skill
//   top3Recall            rows whose expected skill sits in the top 3
//   falsePositiveRate     of should_trigger=false rows, those whose top-1 is
//                         the skill under test
//   negativeRejectionRate of should_trigger=false rows, those where the skill
//                         under test is absent from the top 3
//   adjacentCaptureRate   of should_trigger=false rows, those whose top-1 is a
//                         different, adjacent, bundle skill
//   coverage              rows scored / rows read across every fixture file
//
// Usage:
//   node evaluate-routing.mjs [--json] [--out <file>] [--skill <name>]
//                              [--baseline] [--min-top1 0..1] [--max-fp 0..1]
// Metrics are written to .agents/skills/platform/metrics/routing/latest.json.
// Exit codes: 0 = pass, 1 = threshold breach (or a baseline regression),
//             2 = usage or I/O error.

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSkillIndex, enrichSkills, searchIndex } from '../scripts/build-skill-index.mjs';
import { collectSkills, buildGraph } from '../skill-graph.mjs';
import { adjacentSkills, fixtureSkillIds } from '../scripts/generate-hard-negatives.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const PLATFORM_ROOT = path.resolve(here, '..');
const REPO_ROOT = path.resolve(here, '..', '..', '..', '..');
const DEFAULT_ROUTING_DIR = path.join(REPO_ROOT, 'evals', 'routing');
const METRICS_DIR = path.join(PLATFORM_ROOT, 'metrics', 'routing');
const METRICS_FILE = path.join(METRICS_DIR, 'latest.json');
const PREVIOUS_FILE = path.join(METRICS_DIR, 'previous.json');
const TOP_DEPTH = 3;
export const DEFAULT_MIN_TOP1 = 0.6;
export const DEFAULT_MAX_FP = 0.25;

export { bm25Scores, topN } from '../scripts/build-skill-index.mjs';

/* --------------------------------------------------------------- csv reader */

/**
 * parseCsvRows(text) - copied verbatim from evals/run-routing.mjs so the two
 * scorers read a fixture byte-for-byte the same way. Deliberately duplicated
 * rather than imported: a shared parse seam between the gate and a measurement
 * tool would let one silently move the other.
 */
function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === ',') { row.push(field); field = ''; continue; }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    if (ch === '\r') continue;
    field += ch;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

const TOKEN_RE = /[A-Za-z0-9][A-Za-z0-9._-]*/g;

function isPathish(text, start, end) {
  const before = start > 0 ? text[start - 1] : ' ';
  const after = end < text.length ? text[end] : ' ';
  return before === '/' || after === '/' || before === '.' || after === '.';
}

/** Skill names a prompt mentions, ignoring tokens that sit inside a path. */
function skillMentions(prompt, knownNames) {
  const found = new Set();
  const clean = prompt.replace(/`/g, ' ');
  for (const match of clean.matchAll(TOKEN_RE)) {
    const raw = match[0];
    if (isPathish(clean, match.index, match.index + raw.length)) continue;
    const token = raw.replace(/\.(mjs|md|json|sh|js|ts)$/, '');
    if (knownNames.has(token)) found.add(token);
  }
  return [...found];
}

const TRUTHY = new Set(['true', '1', 'yes', 'y']);

/**
 * readFixtures(routingDir, skills) - every CSV row as a candidate to score.
 * `totalRows` counts every row read before any --skill filter, so `coverage`
 * can say how much of the corpus a run actually measured.
 */
export async function readFixtures(routingDir, skills) {
  const files = fsSync.readdirSync(routingDir).filter((name) => name.endsWith('.csv')).sort();
  const ids = fixtureSkillIds(files, skills);
  const knownNames = new Set(skills.map((skill) => skill.name));
  // A prompt names a skill by its directory name; the ranker reports
  // <domain>/<name>. Basenames are unique across the bundle, so this map is
  // what makes a negative row's "expected" comparable to a top-1.
  const idByName = new Map(skills.map((skill) => [skill.name, `${skill.domain}/${skill.name}`]));
  const fixtures = [];

  for (const file of files) {
    const rows = parseCsvRows(fsSync.readFileSync(path.join(routingDir, file), 'utf8'));
    const skill = ids.get(file) ?? file.replace(/\.csv$/, '');
    for (let index = 0; index < rows.length - 1; index++) {
      const cells = rows[index + 1];
      if (cells.length !== 3) continue;
      const prompt = String(cells[2] ?? '').trim();
      if (!prompt) continue;
      fixtures.push({
        file,
        skill,
        skillName: skill.split('/').pop(),
        row: index + 1,
        shouldTrigger: TRUTHY.has(String(cells[0] ?? '').trim().toLowerCase()),
        category: String(cells[1] ?? '').trim(),
        prompt,
        mentioned: skillMentions(prompt, knownNames).map((name) => idByName.get(name) ?? name),
      });
    }
  }
  return { files, fixtures, totalRows: fixtures.length };
}

/* ---------------------------------------------------------- pure functions */

/**
 * confusionMatrix(rows) - { expected: { selected: count } } over row.top1.
 * Rows with no answer at all land under the <none> column, which is what keeps
 * "the ranker said nothing" visible instead of silently missing.
 */
export function confusionMatrix(rows) {
  const matrix = {};
  for (const row of rows ?? []) {
    const expected = String(row.expected ?? '<none>');
    const selected = String(row.top1 ?? '') || '<none>';
    if (!matrix[expected]) matrix[expected] = {};
    matrix[expected][selected] = (matrix[expected][selected] ?? 0) + 1;
  }
  return matrix;
}

/**
 * routingMetrics(rows) - the metric block, global or per skill.
 * Row shape: { expected, top1, top3, shouldTrigger, skill, adjacent }.
 * `adjacent` is the bundle neighbourhood of `skill`; `evaluated: false` drops a
 * row out of the denominators without hiding it from the total.
 */
export function routingMetrics(rows, options = {}) {
  const all = rows ?? [];
  const evaluated = all.filter((row) => row.evaluated !== false);
  const positives = evaluated.filter((row) => row.shouldTrigger);
  const negatives = evaluated.filter((row) => !row.shouldTrigger);
  const top1Hits = evaluated.filter((row) => row.top1 && row.top1 === row.expected);
  const top3Hits = evaluated.filter((row) => (row.top3 ?? []).includes(row.expected));
  const falsePositives = negatives.filter((row) => row.top1 === row.skill);
  const rejections = negatives.filter((row) => !(row.top3 ?? []).includes(row.skill));
  const captures = negatives.filter((row) => row.top1 && row.top1 !== row.skill && row.adjacent?.has?.(row.top1));
  const noAnswer = evaluated.filter((row) => !row.top1).length;

  const ratio = (numerator, denominator) => (denominator === 0 ? null : Number((numerator / denominator).toFixed(4)));
  return {
    rows: all.length,
    evaluated: evaluated.length,
    positiveRows: positives.length,
    negativeRows: negatives.length,
    top1Hits: top1Hits.length,
    top3Hits: top3Hits.length,
    top1Accuracy: ratio(top1Hits.length, evaluated.length),
    top3Recall: ratio(top3Hits.length, evaluated.length),
    falsePositives: falsePositives.length,
    falsePositiveRate: ratio(falsePositives.length, negatives.length),
    negativeRejections: rejections.length,
    negativeRejectionRate: ratio(rejections.length, negatives.length),
    adjacentCaptures: captures.length,
    adjacentCaptureRate: ratio(captures.length, negatives.length),
    noAnswer,
    coverage: options.totalRows ? ratio(evaluated.length, options.totalRows) : null,
  };
}

/* ----------------------------------------------------------------- scoring */

/** Skill whose top-3 a row is expected to resolve to. */
function expectedSkill(row) {
  if (row.shouldTrigger) return row.skill;
  return row.mentioned[0] ?? '<none>';
}

function scoreFixtures(fixtures, index, adjacentBySkill) {
  const scored = [];
  for (const row of fixtures) {
    const ranked = searchIndex(index, row.prompt, { limit: TOP_DEPTH });
    const top1 = ranked.length > 0 ? ranked[0].skill : null;
    scored.push({
      ...row,
      ranked: ranked.map((entry) => ({ skill: entry.skill, name: entry.name, score: entry.score, matchedTerms: entry.matchedTerms })),
      top3: ranked.map((entry) => entry.skill),
      top1,
      expected: expectedSkill(row),
      adjacent: adjacentBySkill.get(row.skill) ?? new Set(),
    });
  }
  return scored;
}

/* ------------------------------------------------------------------ report */

function fmt(value) { return value === null || value === undefined ? 'n/a' : value.toFixed(3); }

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Routing evaluation - BM25 over the routing fixtures');
  lines.push('');
  lines.push(`Deterministic scorer, no model was invoked. ${report.evaluatedRows}/${report.totalRows} fixture rows across ${report.files} file(s), ranked against a BM25 index (k1=${report.k1}, b=${report.b}) over ${report.indexedSkills} bundle skills.`);
  lines.push('');
  lines.push('| metric | value | hits / denominator |');
  lines.push('| --- | --- | --- |');
  lines.push(`| top1Accuracy | ${fmt(report.global.top1Accuracy)} | ${report.global.top1Hits}/${report.global.evaluated} |`);
  lines.push(`| top3Recall | ${fmt(report.global.top3Recall)} | ${report.global.top3Hits}/${report.global.evaluated} |`);
  lines.push(`| falsePositiveRate | ${fmt(report.global.falsePositiveRate)} | ${report.global.falsePositives}/${report.global.negativeRows} |`);
  lines.push(`| negativeRejectionRate | ${fmt(report.global.negativeRejectionRate)} | ${report.global.negativeRejections}/${report.global.negativeRows} |`);
  lines.push(`| adjacentCaptureRate | ${fmt(report.global.adjacentCaptureRate)} | ${report.global.adjacentCaptures}/${report.global.negativeRows} |`);
  lines.push(`| coverage | ${fmt(report.global.coverage)} | ${report.evaluatedRows}/${report.totalRows} |`);
  lines.push('');

  lines.push('## Per skill');
  lines.push('');
  lines.push('| skill | rows | top1 | top3 | falsePositiveRate | negativeRejectionRate | adjacentCaptureRate |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');
  for (const entry of report.perSkill) {
    lines.push(`| ${entry.skill} | ${entry.metrics.evaluated} | ${fmt(entry.metrics.top1Accuracy)} | ${fmt(entry.metrics.top3Recall)} | ${fmt(entry.metrics.falsePositiveRate)} | ${fmt(entry.metrics.negativeRejectionRate)} | ${fmt(entry.metrics.adjacentCaptureRate)} |`);
  }
  lines.push('');

  if (report.confusions.length > 0) {
    lines.push('## Top confusions');
    lines.push('');
    lines.push('Rows whose expected skill the ranker resolved elsewhere:');
    lines.push('');
    for (const entry of report.confusions.slice(0, 15)) {
      lines.push(`- ${entry.expected} -> ${entry.selected} x${entry.count}`);
    }
    if (report.confusions.length > 15) lines.push(`- ... and ${report.confusions.length - 15} more`);
    lines.push('');
  }

  if (report.misses.length > 0) {
    lines.push('## Missed rows');
    lines.push('');
    lines.push('| ref | expected | top-1 | matched terms |');
    lines.push('| --- | --- | --- | --- |');
    for (const miss of report.misses.slice(0, 20)) {
      lines.push(`| ${miss.ref} | ${miss.expected} | ${miss.top1 ?? '<none>'} | ${miss.matchedTerms.join(', ') || '(none)'} |`);
    }
    if (report.misses.length > 20) lines.push(`| ... and ${report.misses.length - 20} more | | | |`);
    lines.push('');
  }

  lines.push('## Thresholds');
  lines.push('');
  lines.push(`- min top1Accuracy: ${report.thresholds.minTop1}`);
  lines.push(`- max falsePositiveRate: ${report.thresholds.maxFp}`);
  lines.push('');

  if (report.regressions.length > 0) {
    lines.push('## Baseline regressions');
    lines.push('');
    lines.push('| metric | previous | current |');
    lines.push('| --- | --- | --- |');
    for (const regression of report.regressions) {
      lines.push(`| ${regression.metric} | ${fmt(regression.previous)} | ${fmt(regression.current)} |`);
    }
    lines.push('');
  }

  lines.push(`status: ${report.status}`);
  lines.push('');
  return lines.join('\n');
}

/* --------------------------------------------------------------------- cli */

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) { args._.push(token); continue; }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) args[key] = true;
    else { args[key] = next; i += 1; }
  }
  return args;
}

function threshold(argv, key, fallback) {
  if (argv[key] === undefined || argv[key] === true) return fallback;
  const value = Number(argv[key]);
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`--${key} must be a rate between 0 and 1 (found ${String(argv[key])})`);
  }
  return value;
}

/** Metrics whose drop is a regression, and metrics whose rise is one. */
const LOWER_IS_BETTER = new Set(['falsePositiveRate']);

function diffBaselines(previous, current) {
  const keys = ['top1Accuracy', 'top3Recall', 'falsePositiveRate', 'negativeRejectionRate', 'adjacentCaptureRate', 'coverage'];
  const regressions = [];
  for (const key of keys) {
    const before = previous?.global?.[key];
    const after = current?.global?.[key];
    if (typeof before !== 'number' || typeof after !== 'number') continue;
    const worse = LOWER_IS_BETTER.has(key) ? after > before : after < before;
    if (worse) regressions.push({ metric: key, previous: before, current: after, delta: Number((after - before).toFixed(4)) });
  }
  return regressions;
}

async function main(argv) {
  const args = parseArgs(argv);
  let minTop1;
  let maxFp;
  try {
    minTop1 = threshold(args, 'min-top1', DEFAULT_MIN_TOP1);
    maxFp = threshold(args, 'max-fp', DEFAULT_MAX_FP);
  } catch (err) {
    console.error(`usage error: ${err.message}`);
    return 2;
  }

  const routingDir = path.resolve(typeof args.routing === 'string' ? args.routing : DEFAULT_ROUTING_DIR);
  if (!fsSync.existsSync(routingDir)) {
    console.error(`error: routing fixtures not found at ${routingDir}`);
    return 2;
  }

  // latest.json is the full-corpus baseline that --baseline reads back. A
  // --skill run is scoped, so it reports only and leaves that file alone.
  const persist = !args.skill;

  const root = process.cwd();
  const skills = await enrichSkills(collectSkills(root), root);
  const graph = buildGraph(root);
  const index = buildSkillIndex(skills);

  const adjacentBySkill = new Map();
  for (const skill of skills) {
    const id = `${skill.domain}/${skill.name}`;
    adjacentBySkill.set(id, new Set(adjacentSkills(graph, skills, id)));
  }

  const { files, fixtures, totalRows } = await readFixtures(routingDir, skills);

  let selected = fixtures;
  if (args.skill) {
    const wanted = String(args.skill).replace(/\.csv$/, '');
    const filtered = fixtures.filter((row) => row.skill === wanted
      || row.file.replace(/\.csv$/, '') === wanted
      || row.skillName === wanted.split('/').pop());
    if (filtered.length === 0) {
      console.error(`usage error: no routing fixture matches --skill ${args.skill}`);
      return 2;
    }
    selected = filtered;
  }

  const scored = scoreFixtures(selected, index, adjacentBySkill);
  const evaluatedRows = scored.length;
  const global = routingMetrics(scored, { totalRows });

  const perSkill = [];
  const bySkill = new Map();
  for (const row of scored) {
    if (!bySkill.has(row.skill)) bySkill.set(row.skill, []);
    bySkill.get(row.skill).push(row);
  }
  for (const [skill, rows] of [...bySkill.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    perSkill.push({ skill, metrics: routingMetrics(rows) });
  }

  const matrix = confusionMatrix(scored);
  const confusions = [];
  for (const [expected, bucket] of Object.entries(matrix)) {
    for (const [selectedSkill, count] of Object.entries(bucket)) {
      if (selectedSkill === expected) continue;
      confusions.push({ expected, selected: selectedSkill, count });
    }
  }
  confusions.sort((a, b) => (b.count - a.count) || a.expected.localeCompare(b.expected));

  const misses = scored
    .filter((row) => !row.top1 || row.top1 !== row.expected)
    .sort((a, b) => a.file.localeCompare(b.file) || a.row - b.row)
    .map((row) => ({
      ref: `${row.file}#${row.row}`,
      expected: row.expected,
      top1: row.top1,
      matchedTerms: row.ranked[0]?.matchedTerms ?? [],
    }));

  const breached = global.top1Accuracy !== null && global.top1Accuracy < minTop1;
  const fpBreached = global.falsePositiveRate !== null && global.falsePositiveRate > maxFp;

  let regressions = [];
  let baseline = null;
  if (args.baseline) {
    try {
      baseline = JSON.parse(fsSync.readFileSync(METRICS_FILE, 'utf8'));
    } catch {
      baseline = null;
    }
    if (!baseline) {
      console.error(`error: --baseline needs a previous metrics file at ${path.relative(root, METRICS_FILE)}`);
      return 2;
    }
    regressions = diffBaselines(baseline, { global });
    if (fsSync.existsSync(METRICS_FILE)) await fs.writeFile(PREVIOUS_FILE, JSON.stringify(baseline, null, 2), 'utf8');
  }

  const status = (breached || fpBreached || regressions.length > 0) ? 'fail' : 'pass';
  const report = {
    tool: 'evaluate-routing.mjs',
    mode: 'deterministic-bm25',
    judge: 'none',
    modelInvocation: 'none',
    generatedAt: new Date().toISOString(),
    routingDir: path.relative(root, routingDir) || routingDir,
    files,
    indexedSkills: index.stats.skills,
    totalRows,
    evaluatedRows,
    k1: index.k1,
    b: index.b,
    thresholds: { minTop1, maxFp },
    global,
    perSkill,
    confusions,
    regressions,
    misses,
    status,
    metricsFile: persist ? (path.relative(root, METRICS_FILE) || METRICS_FILE) : null,
  };

  const metrics = {
    generatedAt: report.generatedAt,
    tool: 'evaluate-routing.mjs',
    skills: index.stats.skills,
    totalRows,
    evaluatedRows,
    thresholds: report.thresholds,
    global,
    perSkill,
    regressions,
    status,
  };

  if (persist) {
    await fs.mkdir(METRICS_DIR, { recursive: true });
    await fs.writeFile(METRICS_FILE, `${JSON.stringify(metrics, null, 2)}\n`, 'utf8');
  }

  // The markdown report and the JSON report are mutually exclusive on stdout:
  // a JSON stream that also carries prose is not a JSON stream. --out always
  // receives the markdown, JSON still goes to stdout when --json is set.
  const markdown = renderMarkdown(report);
  if (args.out) {
    const outFile = path.resolve(args.out);
    await fs.mkdir(path.dirname(outFile), { recursive: true });
    await fs.writeFile(outFile, markdown, 'utf8');
    if (!args.json) console.error(`[evaluate-routing] report written to ${path.relative(root, args.out)}`);
  }
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else if (!args.out) console.log(markdown);
  return status === 'fail' ? 1 : 0;
}

const invokedDirectly = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();

if (invokedDirectly) {
  main(process.argv.slice(2)).then((code) => process.exit(code)).catch((err) => {
    console.error(`evaluate-routing error: ${err.message}`);
    process.exit(2);
  });
}
