#!/usr/bin/env node
// search-skills.mjs - query the generated skill search index.
//
// Reads .agents/skills/platform/index/skill-index.json when it exists. When the
// default artifact is absent, the index is built in memory from the bundle, so
// the command also works on a checkout that has never run
// build-skill-index.mjs and never fails just because the artifact is stale.
// An index path named explicitly with --index has to exist: naming a file that
// is not there is a usage error, not a silent fallback.
//
// Usage:
//   node search-skills.mjs "<query>" [--limit N] [--json] [--explain]
//   node search-skills.mjs --query "<query>" [--index <path>]
//
// Default output, one line per hit:
//   1. delivery/code-review (score 19.053255) — <description truncated to 90 chars>
//
// --explain adds, per hit, the matched terms and the per-term contribution that
// produced the score, so a ranking decision can be argued with rather than
// taken on faith. In JSON mode the extra detail lands under "explain".
//
// Exit codes: 0 = ranked (a query that matches nothing is a valid result),
//             2 = usage error (no query, bad --limit, missing --index).

import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSkillIndex, enrichSkills, searchIndex, INDEX_VERSION } from './build-skill-index.mjs';
import { collectSkills } from '../skill-graph.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const PLATFORM_ROOT = path.resolve(here, '..');
const DEFAULT_INDEX = path.join(PLATFORM_ROOT, 'index', 'skill-index.json');
const DESCRIPTION_LIMIT = 90;

async function loadIndex(indexPath, explicit) {
  const resolved = path.resolve(indexPath);
  if (!fsSync.existsSync(resolved)) {
    if (explicit) {
      throw new Error(`index not found: ${resolved} — build it with build-skill-index.mjs --write, or drop --index to use the default artifact`);
    }
    // Absent default artifact is not an error: build the same index in memory.
    const index = buildSkillIndex(await enrichSkills(collectSkills(process.cwd()), process.cwd()));
    return { index, generated: true, path: path.relative(process.cwd(), resolved) || resolved };
  }
  const parsed = JSON.parse(await fs.readFile(resolved, 'utf8'));
  if (!parsed || typeof parsed !== 'object' || !parsed.skills) {
    throw new Error(`${resolved} is not a skill index (missing "skills")`);
  }
  if (parsed.version !== undefined && parsed.version !== INDEX_VERSION) {
    throw new Error(`${resolved} is index version ${parsed.version}, this build reads ${INDEX_VERSION}; rebuild it with build-skill-index.mjs --write`);
  }
  return { index: parsed, generated: false, path: path.relative(process.cwd(), resolved) || resolved };
}

function truncate(text, limit) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

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

/** Per-term contribution behind one ranked hit, plus the corpus context. */
function explainHit(index, hit) {
  const total = index.stats?.skills ?? Object.keys(index.skills ?? {}).length;
  const terms = hit.matchedTerms.map((term) => {
    const bucket = index.postings?.[term] ?? {};
    const df = index.docFrequency?.[term] ?? Object.keys(bucket).length;
    const weightedTf = bucket[hit.skill] ?? 0;
    const idf = Math.log(1 + (total - df + 0.5) / (df + 0.5));
    return { term, df, idf: Number(idf.toFixed(6)), weightedTf };
  });
  const docLength = index.docLength?.[hit.skill] ?? 0;
  const avgLength = index.stats?.avgLength || 1;
  return {
    skill: hit.skill,
    score: hit.score,
    matchedTerms: hit.matchedTerms,
    docLength,
    lengthBias: Number((docLength / avgLength).toFixed(4)),
    terms,
    why: `matched ${terms.length} term(s) over a weighted length of ${docLength}, against a bundle mean of ${avgLength}; longer definitions are discounted by b, rarer terms are promoted by idf`,
  };
}

async function main(argv) {
  const args = parseArgs(argv);
  const query = typeof args.query === 'string' ? args.query : args._.join(' ');
  if (!query || query.trim().length === 0) {
    console.error('usage error: a query is required');
    console.error('  node search-skills.mjs "<query>" [--limit N] [--json] [--explain] [--index <path>]');
    return 2;
  }

  let limit = 5;
  if (args.limit !== undefined && args.limit !== true) {
    const parsed = Number(args.limit);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      console.error(`usage error: --limit must be a positive integer (found ${String(args.limit)})`);
      return 2;
    }
    limit = Math.trunc(parsed);
  }

  const explicitIndex = typeof args.index === 'string';
  const indexPath = explicitIndex ? args.index : DEFAULT_INDEX;
  let loaded;
  try {
    loaded = await loadIndex(indexPath, explicitIndex);
  } catch (err) {
    console.error(`error: ${err.message}`);
    return 2;
  }

  const results = searchIndex(loaded.index, query, { limit });
  const explain = args.explain ? results.map((hit) => explainHit(loaded.index, hit)) : null;

  if (args.json) {
    console.log(JSON.stringify({
      query,
      total: results.length,
      results,
      ...(explain ? { explain } : {}),
      indexGenerated: loaded.generated,
      indexPath: loaded.path,
    }, null, 2));
    return 0;
  }

  console.log(`[search-skills] query="${query}"`);
  console.log(`[search-skills] index=${loaded.path} (${loaded.generated ? 'built in memory' : 'read from disk'})`);
  for (let i = 0; i < results.length; i++) {
    const hit = results[i];
    console.log(`${hit.rank}. ${hit.skill} (score ${hit.score}) — ${truncate(hit.description, DESCRIPTION_LIMIT)}`);
    if (!explain) continue;
    console.log(`   matched: ${hit.matchedTerms.join(', ') || '(none)'}`);
    const detail = explain[i];
    for (const term of detail.terms) {
      console.log(`     ${term.term}: idf=${term.idf} df=${term.df} weightedTf=${term.weightedTf}`);
    }
    console.log(`   length: ${detail.docLength} (bundle mean ${detail.lengthBias}x)`);
    console.log(`   why: ${detail.why}`);
  }
  if (results.length === 0) console.log('  (no skill matched the query)');
  return 0;
}

const invokedDirectly = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();

if (invokedDirectly) {
  main(process.argv.slice(2)).then((code) => process.exit(code)).catch((err) => {
    console.error(`search-skills error: ${err.message}`);
    process.exit(2);
  });
}
