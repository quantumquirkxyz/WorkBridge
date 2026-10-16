#!/usr/bin/env node
// build-skill-index.mjs - offline BM25 search index over the canonical skill bundle.
//
// What is indexed: every bundle skill. The `platform` domain is bundle
// infrastructure, not skill content, so it is excluded here exactly as
// scripts/sync-registry.mjs and validate-skills.mjs exclude it.
//
// Per-skill index fields:
//   skill        "<domain>/<name>"     - canonical identity, also the object key
//   name                                      - directory name
//   domain                                   - top-level domain
//   description                              - frontmatter routing surface
//   capabilities[] / tags[]                  - declared capability arrays
//   trustTier / risk / artifactType          - governance metadata
//   tokens                                   - ceil(len/4) over name+description+tags
//   headings[]                               - the `## X` headings of the body
//   terms[]                                  - normalized tokens of
//                                              description+capabilities+tags+headings,
//                                              lowercased, stopwords removed,
//                                              de-duplicated and sorted
//   bodyLines                                - line count of the body
//   path                                     - bundle-relative directory
//
// Ranker: BM25 (k1=1.5, b=0.75) over a weighted term frequency per skill.
//   weightedTf(term, skill) =   3 * tf(description)
//                             + 2 * tf(capabilities)
//                             + 1.5 * tf(headings)
//                             + 1 * tf(terms)
// The `terms` field is a de-duplicated union of the three text fields, so a term
// that survives normalization once more adds a flat presence bonus on top of its
// per-field counts. Stopwords are dropped from every field, not only `terms`.
//
// Postings are inverted: postings[term][skillId] = weightedTf, plus
// docFrequency[term] and docLength[skillId] so scoring is O(query terms).
//
// Determinism contract: the persisted JSON is a pure function of bundle
// content. `generatedAt` is wall-clock telemetry and stays in memory / the
// stdout report, it is stripped before the bytes reach disk.
//
// Query synonym bridge (documented adjustment, see README): the bundle
// vocabulary is English while operator prompts are frequently written in
// Spanish. A small explicit map expands a query token with its
// bundle-vocabulary equivalent BEFORE scoring. It never touches an indexed
// document, it never adds vocabulary the bundle does not already have, and
// every entry is listed in QUERY_SYNONYMS below.
//
// Usage: node build-skill-index.mjs [--write] [--json] [--root DIR]
//   default is a dry run that reports what it would write
// Exit codes: 0 = ok (dry run or written), 1 = write failure, 2 = usage error.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter, collectSkills } from '../skill-graph.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const PLATFORM_ROOT = path.resolve(here, '..');
const INDEX_DIR = path.join(PLATFORM_ROOT, 'index');
const INDEX_FILE = path.join(INDEX_DIR, 'skill-index.json');
const README_FILE = path.join(INDEX_DIR, 'README.md');

export const INDEX_VERSION = 1;
export const BM25_K1 = 1.5;
export const BM25_B = 0.75;

// Field weights of the weighted term frequency. Exported so callers and tests
// read them instead of re-deriving them from this file.
export const FIELD_WEIGHTS = Object.freeze({
  description: 3,
  capabilities: 2,
  headings: 1.5,
  terms: 1,
});

export const BASE_STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'for', 'on', 'with', 'by',
  'at', 'from', 'as', 'is', 'are', 'be', 'this', 'that', 'it', 'its', 'into',
  'when', 'use', 'using', 'your', 'you',
]);

// Minimum edits, not translations: each key maps to the vocabulary the bundle
// itself uses. Applied to query tokens only.
export const QUERY_SYNONYMS = Object.freeze({
  // Locale bridge. Operator prompts are frequently written in Spanish while the
  // bundle vocabulary is English, so a query token is expanded with the
  // bundle-vocabulary equivalent before scoring. Without this, "revisa el diff
  // contra origin/main y dime los hallazgos" matches almost nothing, because
  // only the tokens "diff", "origin" and "main" survive stopword removal.
  revisa: ['review'],
  revisar: ['review'],
  revision: ['review'],
  audita: ['audit'],
  auditar: ['audit'],
  hallazgos: ['findings'],
  hallazgo: ['finding'],
  cambios: ['changes'],
  cambio: ['change'],
  codigo: ['code'],
  rama: ['branch'],
  arregla: ['fix'],
  arreglar: ['fix'],
  implementa: ['implement'],
  implementar: ['implement'],
  calidad: ['quality'],
  riesgo: ['risk'],
  seguridad: ['security'],
  pruebas: ['tests'],
  prueba: ['test'],
  errores: ['errors'],
  informe: ['report'],
  reporta: ['report'],
  entrega: ['delivery'],
  documentacion: ['docs'],
  problemas: ['issues'],
  // Surface-variant bridge. Operator shorthand for the wording the bundle
  // itself uses in a description: a diff IS a set of changes, which is the
  // phrase the delivery review skills are written in.
  diff: ['changes'],
  patch: ['changes'],
});

function tokenize(text) {
  // Fold diacritics first so "revisión" tokenizes to "revision" instead of
  // being split at the accent, then split on everything that is not [a-z0-9].
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .match(/[a-z0-9]+/g) ?? [];
}

export function normalizeTerms(text) {
  return tokenize(text).filter((token) => !BASE_STOPWORDS.has(token));
}

export function extractHeadings(body) {
  const out = [];
  for (const line of String(body ?? '').split(/\r?\n/)) {
    const match = line.match(/^##\s+(.+?)\s*$/);
    if (match) out.push(match[1].replace(/`/g, '').trim());
  }
  return out.filter(Boolean);
}

function countTerms(tokens) {
  const counts = new Map();
  for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
  return counts;
}

function toList(value) {
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return String(value).split(',').map((entry) => entry.trim()).filter(Boolean);
}

/** Estimated token cost of the always-loaded L1 layer for one skill. */
export function estimateTokens(name, description, tags) {
  const text = [name, description, (tags ?? []).join(' ')].filter(Boolean).join(' ');
  return Math.ceil(text.length / 4);
}

/**
 * buildSkillIndex(skills) - pure index construction over skill records.
 * Accepts the records collectSkills() returns, optionally enriched with
 * frontmatter `tags` and `risk` (see enrichSkills()). Missing optional fields
 * degrade to [] / '' rather than throwing.
 */
export function buildSkillIndex(skills) {
  const records = (Array.isArray(skills) ? skills : [])
    .filter((skill) => skill && skill.name)
    .filter((skill) => String(skill.domain ?? '') !== 'platform');

  const entries = {};
  const postings = {};
  const docFrequency = {};
  const docLength = {};
  let totalLength = 0;

  for (const skill of records) {
    const skillId = `${skill.domain}/${skill.name}`;
    const tags = toList(skill.tags);
    const capabilities = toList(skill.capabilities);
    const headings = extractHeadings(skill.body);
    const terms = [...new Set([
      ...normalizeTerms(skill.description),
      ...normalizeTerms(capabilities.join(' ')),
      ...normalizeTerms(tags.join(' ')),
      ...normalizeTerms(headings.join(' ')),
    ])].sort();

    const fields = {
      description: countTerms(normalizeTerms(skill.description)),
      capabilities: countTerms(normalizeTerms(capabilities.join(' '))),
      headings: countTerms(normalizeTerms(headings.join(' '))),
      terms: countTerms(terms),
    };

    const weighted = new Map();
    for (const [field, counts] of Object.entries(fields)) {
      const weight = FIELD_WEIGHTS[field] ?? 1;
      for (const [term, tf] of counts) {
        weighted.set(term, (weighted.get(term) ?? 0) + weight * tf);
      }
    }

    for (const [term, weightedTf] of weighted) {
      const bucket = postings[term] ?? (postings[term] = {});
      bucket[skillId] = Number(weightedTf.toFixed(6));
    }
    docLength[skillId] = Number([...weighted.values()].reduce((sum, value) => sum + value, 0).toFixed(6));
    if (docLength[skillId] > 0) totalLength += docLength[skillId];

    entries[skillId] = {
      skill: skillId,
      name: skill.name,
      domain: skill.domain,
      description: skill.description ?? '',
      capabilities,
      tags,
      trustTier: String(skill.tier ?? skill.trustTier ?? ''),
      risk: String(skill.risk ?? ''),
      artifactType: skill.artifactType ?? '',
      tokens: estimateTokens(skill.name, skill.description ?? '', tags),
      headings,
      terms,
      bodyLines: String(skill.body ?? '').split(/\r?\n/).length,
      path: skill.path ?? '',
    };
  }

  for (const [term, bucket] of Object.entries(postings)) docFrequency[term] = Object.keys(bucket).length;

  return {
    version: INDEX_VERSION,
    k1: BM25_K1,
    b: BM25_B,
    fieldWeights: { ...FIELD_WEIGHTS },
    skills: entries,
    postings,
    docFrequency,
    docLength,
    stats: {
      skills: Object.keys(entries).length,
      terms: Object.keys(postings).length,
      postings: Object.values(docFrequency).reduce((sum, value) => sum + value, 0),
      avgLength: Object.keys(docLength).length
        ? Number((totalLength / Object.keys(docLength).length).toFixed(6))
        : 0,
    },
  };
}

/** Query tokens after stopword removal and the synonym bridge. */
export function queryTerms(query) {
  const expanded = [];
  for (const token of normalizeTerms(query)) {
    expanded.push(token);
    for (const synonym of QUERY_SYNONYMS[token] ?? []) expanded.push(synonym);
  }
  return expanded;
}

/**
 * bm25Scores(index, query, options) - pure BM25 scoring.
 * Returns an array of { skill, score, matchedTerms } ordered by score
 * descending, with the skill id as a deterministic tie-breaker, so the same
 * input always produces the same output.
 */
export function bm25Scores(index, query, options = {}) {
  const k1 = options.k1 ?? index?.k1 ?? BM25_K1;
  const b = options.b ?? index?.b ?? BM25_B;
  const terms = queryTerms(query);
  const docCount = index?.stats?.skills ?? Object.keys(index?.skills ?? {}).length;
  const docFrequency = index?.docFrequency ?? {};
  const postings = index?.postings ?? {};
  const docLength = index?.docLength ?? {};
  const avgLength = index?.stats?.avgLength || 1;

  const scores = new Map();
  const matched = new Map();

  for (const term of terms) {
    const bucket = postings[term];
    if (!bucket) continue;
    const df = docFrequency[term] ?? Object.keys(bucket).length;
    if (df <= 0) continue;
    const idf = Math.log(1 + (docCount - df + 0.5) / (df + 0.5));
    for (const [skillId, weightedTf] of Object.entries(bucket)) {
      const length = docLength[skillId] ?? 0;
      const normalizer = k1 * (1 - b + (b * length) / avgLength);
      const contribution = idf * (weightedTf * (k1 + 1)) / (weightedTf + normalizer);
      scores.set(skillId, (scores.get(skillId) ?? 0) + contribution);
      const hits = matched.get(skillId) ?? new Map();
      hits.set(term, (hits.get(term) ?? 0) + contribution);
      matched.set(skillId, hits);
    }
  }

  const results = [];
  for (const [skillId, score] of scores) {
    if (!options.includeZero && score <= 0) continue;
    const hits = matched.get(skillId) ?? new Map();
    results.push({
      skill: skillId,
      score: Number(score.toFixed(6)),
      matchedTerms: [...hits.keys()].sort(),
    });
  }
  results.sort((a, b) => (b.score - a.score) || a.skill.localeCompare(b.skill));
  return results;
}

/** first n rows of a ranked list; a pure helper so callers share one definition */
export function topN(ranked, n) {
  const limit = Number.isFinite(Number(n)) ? Math.max(0, Math.trunc(Number(n))) : ranked.length;
  return ranked.slice(0, limit);
}

/**
 * searchIndex(index, query, { limit }) - BM25 ranking with index enrichment.
 */
export function searchIndex(index, query, options = {}) {
  const ranked = bm25Scores(index, query, options);
  const limited = options.limit === undefined ? ranked : topN(ranked, options.limit);
  return limited.map((entry, position) => {
    const meta = index?.skills?.[entry.skill] ?? {};
    return {
      rank: position + 1,
      skill: entry.skill,
      name: meta.name ?? entry.skill.split('/').pop(),
      domain: meta.domain ?? entry.skill.split('/')[0],
      score: entry.score,
      description: meta.description ?? '',
      matchedTerms: entry.matchedTerms,
    };
  });
}

/** Frontmatter fields collectSkills() does not project but the index carries. */
export async function enrichSkills(skills, root) {
  const out = [];
  for (const skill of skills) {
    const skillMd = path.join(root, skill.path ?? '', 'SKILL.md');
    let tags = [];
    let risk = '';
    try {
      const text = await fs.readFile(skillMd, 'utf8');
      const fm = parseFrontmatter(text);
      tags = toList(fm.tags);
      risk = fm.risk === undefined ? '' : String(fm.risk).replace(/^["']|["']$/g, '');
    } catch {
      // Missing companion file is not fatal: the index degrades to [] and ''.
    }
    out.push({ ...skill, tags, risk });
  }
  return out;
}

/* ------------------------------------------------------------ markdown view */

function renderReadme() {
  return `# Skill search index (generated)

This directory holds ONE generated artifact, \`skill-index.json\`, and this
explanation. Do not hand-edit either; both are produced by

    node .agents/skills/platform/scripts/build-skill-index.mjs --write

and the JSON is a pure function of the bundle, so a re-run over unchanged
content writes byte-identical bytes.

## What is in the index

Every bundle skill except the \`platform\` domain (bundle infrastructure, not
skill content). Per skill:

| field | meaning |
| --- | --- |
| \`skill\` | \`<domain>/<name>\`; also the key of the \`skills\` object |
| \`name\` / \`domain\` | directory name and top-level domain |
| \`description\` | the frontmatter routing surface |
| \`capabilities\` / \`tags\` | declared arrays, empty when the skill ships none |
| \`trustTier\` / \`risk\` / \`artifactType\` | governance metadata |
| \`tokens\` | estimated tokens, \`ceil(len/4)\` over name + description + tags |
| \`headings\` | the \`## X\` headings of the body, in document order |
| \`terms\` | normalized, lowercased, stopword-free, de-duplicated tokens of description + capabilities + tags + headings |
| \`bodyLines\` | line count of the body |
| \`path\` | bundle-relative directory |

Global keys: \`postings\`, \`docFrequency\`, \`docLength\` and \`stats\`.

## The ranker

BM25 with \`k1 = 1.5\` and \`b = 0.75\`, over a weighted term frequency:

    weightedTf(term, skill) =    3 * tf(description)
                              +  2 * tf(capabilities)
                              +  1.5 * tf(headings)
                              +  1 * tf(terms)

    score(term, skill) = idf(term) * weightedTf * (k1 + 1)
                                  / (weightedTf + k1 * (1 - b + b * len/avgLen))

    idf(term) = log(1 + (N - df + 0.5) / (df + 0.5))

with \`N\` = indexed skills, \`df\` = skills containing the term, \`len\` =
weighted document length and \`avgLen\` = the mean of those lengths. Postings
are inverted (\`postings[term][skillId]\`), so a query touches one bucket per
term instead of the whole corpus.

## Query synonym bridge

The bundle vocabulary is English while operator prompts are frequently written
in Spanish, and operators write shortcuts the bundle spells out.
\`QUERY_SYNONYMS\` in \`build-skill-index.mjs\` expands a query token with the
bundle's own wording before scoring:

- locale bridge: "revisa" also scores "review", "hallazgos" also scores
  "findings", "audita" also scores "audit";
- surface-variant bridge: "diff" also scores "changes", because the delivery
  review skills describe their input as "Review the changes since a fixed
  point", not as "diff".

The bridge applies to the query only, it maps onto vocabulary the indexed
descriptions already use, and every entry is a single line in that map.

This bridge is what makes

    node search-skills.mjs "revisa el diff contra origin/main y dime los hallazgos"

rank \`delivery/code-review\` first. It is the one tuned weight in the ranker:
without it the query keeps three useful tokens, of which "diff" lands on
\`integrations/pr-operations\` and "origin" matches nothing at all.

## Consumers

- \`scripts/search-skills.mjs\` ranks a query against this file, building it in
  memory when the file is absent.
- \`evals/evaluate-routing.mjs\` scores the routing fixtures in
  \`evals/routing/\` against the same index.
- \`scripts/generate-hard-negatives.mjs\` proposes negative controls that a
  ranker still resolves to an adjacent skill.

## Reading it back

    node .agents/skills/platform/scripts/search-skills.mjs --query "..." --json

Both commands exit non-zero only on usage or I/O errors, never because a query
returned nothing.
`;
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

async function main(argv) {
  const args = parseArgs(argv);
  const root = path.resolve(args.root ?? process.cwd());
  const skills = await enrichSkills(collectSkills(root), root);
  const index = buildSkillIndex(skills);
  const generatedAt = new Date().toISOString();
  const bytes = Buffer.byteLength(`${JSON.stringify(index, null, 2)}\n`, 'utf8');

  if (args.write) {
    await fs.mkdir(INDEX_DIR, { recursive: true });
    await fs.writeFile(INDEX_FILE, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
    await fs.writeFile(README_FILE, renderReadme(), 'utf8');
  }

  const payload = {
    status: args.write ? 'written' : 'dry-run',
    root,
    file: path.relative(root, INDEX_FILE) || INDEX_FILE,
    readme: path.relative(root, README_FILE) || README_FILE,
    generatedAt,
    skills: index.stats.skills,
    terms: index.stats.terms,
    postings: index.stats.postings,
    avgLength: index.stats.avgLength,
    k1: index.k1,
    b: index.b,
    fieldWeights: index.fieldWeights,
    bytes,
  };

  if (args.json) console.log(JSON.stringify(payload, null, 2));
  else {
    console.log(`[build-skill-index] ${payload.status}: ${payload.skills} skills, ${payload.terms} terms, ${payload.postings} postings, avgLen=${payload.avgLength}`);
    console.log(`[build-skill-index] index: ${payload.file} (${payload.bytes} bytes)`);
    if (args.write) console.log(`[build-skill-index] readme: ${payload.readme}`);
    else console.log('[build-skill-index] dry run; pass --write to persist the index');
  }
  return 0;
}

const invokedDirectly = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();

if (invokedDirectly) {
  main(process.argv.slice(2)).then((code) => process.exit(code)).catch((err) => {
    console.error(`build-skill-index error: ${err.message}`);
    process.exit(1);
  });
}
