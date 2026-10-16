#!/usr/bin/env node
// generate-hard-negatives.mjs - propose hard negative controls for the routing
// fixtures in evals/routing/.
//
// A hard negative is a fixture row that reads like it belongs to the skill under
// test but must NOT fire it. It is the only row shape that separates a skill
// which routes well from one which over-triggers, and writing them by hand is
// expensive - so this generator derives proposals from the bundle itself and
// leaves the paste decision to a human.
//
// What a run does:
//   1. reads every CSV in evals/routing/ (they are READ, never rewritten);
//   2. finds the adjacent bundle skills of each skill under test - same domain,
//      a shared declared capability, or an edge in the skill graph;
//   3. re-writes each existing should_trigger=false row as a minimum-edit
//      variant: ONE keyword is swapped for vocabulary a neighbouring skill
//      actually uses and the skill under test does not;
//   4. proposes NEW negative controls that name a real adjacent skill;
//   5. scores every proposal against the BM25 index and keeps the ones whose
//      top-1 is the named adjacent skill rather than the skill under test.
//
// Output is a proposal file, evals/routing/.generated-hard-negatives.md, holding
// CSV-ready lines. Nothing is written into a live fixture: the routing CSVs stay
// byte-identical unless a human pastes a line in and re-runs
// `node evals/run-routing.mjs --check`.
//
// Every adjacent skill named in a proposal comes from collectSkills(), so a name
// the bundle does not have can never reach the output.
//
// Usage:
//   node generate-hard-negatives.mjs [--skill <domain/skill>] [--min N]
//                                     [--write] [--json] [--routing <dir>]
// Default is a dry run; --min N defaults to 3 proposals per skill.
// Exit codes: 0 = ok (dry run or written), 1 = write failure, 2 = usage error.

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSkillIndex, enrichSkills, searchIndex } from './build-skill-index.mjs';
import { collectSkills, buildGraph } from '../skill-graph.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const PLATFORM_ROOT = path.resolve(here, '..');
const REPO_ROOT = path.resolve(here, '..', '..', '..', '..');
const DEFAULT_ROUTING_DIR = path.join(REPO_ROOT, 'evals', 'routing');
const PROPOSAL_FILENAME = '.generated-hard-negatives.md';

// Keywords that carry the skill-under-test's intent in a negative control and
// survive a one-word substitution without breaking the sentence.
export const KEYWORD_SLOTS = [
  'review', 'audit', 'findings', 'diff', 'artifact', 'spec', 'skills',
  'capability', 'validation', 'merge', 'branch', 'ticket', 'workflow',
  'quality', 'plan', 'lockfile', 'drift', 'seam', 'promotion',
];

// Replacements for those slots, so a rewritten row still reads as an operator
// prompt. The candidate the generator finally uses is the one a neighbouring
// skill actually declares, when any of them does; otherwise the first entry.
export const NEIGHBOUR_SYNONYMS = Object.freeze({
  review: ['audit', 'inspect'],
  audit: ['inspect', 'assess'],
  findings: ['observations', 'evidence'],
  diff: ['branch state', 'changeset'],
  artifact: ['record', 'document'],
  spec: ['plan', 'proposal'],
  skills: ['bundle entries', 'skill files'],
  capability: ['contract', 'seam'],
  validation: ['gate', 'smoke test'],
  merge: ['rebase', 'merge queue'],
  branch: ['working tree', 'trunk'],
  ticket: ['work item', 'slice'],
  workflow: ['pipeline', 'sequence'],
  quality: ['score', 'gate'],
  plan: ['remediation plan', 'roadmap'],
  lockfile: ['provenance', 'ledger'],
  drift: ['staleness', 'divergence'],
  seam: ['boundary', 'interface'],
  promotion: ['publish', 'release'],
});

const MIN_TERM_LENGTH = 4;
const MAX_NEIGHBOUR_DF = 12;
const DESCRIPTION_LIMIT = 92;

function skillIdOf(skill) { return `${skill.domain}/${skill.name}`; }

/**
 * adjacentSkills(graph, skills, skillId) - the bundle neighbourhood of a skill.
 * Three signals, unioned: same domain, at least one shared declared capability,
 * or any edge in the skill graph (dependency, compatibility, handoff, or
 * capability edge).
 */
export function adjacentSkills(graph = {}, skills = [], skillId) {
  const target = skills.find((skill) => skillIdOf(skill) === skillId);
  const targetName = target?.name ?? String(skillId).split('/').pop();
  const idByName = new Map(skills.map((skill) => [skill.name, skillIdOf(skill)]));
  const targetCaps = new Set(target?.capabilities ?? []);
  const adjacent = new Set();

  for (const skill of skills) {
    const id = skillIdOf(skill);
    if (id === skillId) continue;
    if (target && skill.domain === target.domain) adjacent.add(id);
    if (targetCaps.size > 0 && (skill.capabilities ?? []).some((cap) => targetCaps.has(cap))) adjacent.add(id);
  }

  for (const edge of graph?.edges ?? []) {
    const other = edge.from === targetName ? edge.to : (edge.to === targetName ? edge.from : null);
    if (!other) continue;
    const id = idByName.get(other);
    if (id && id !== skillId) adjacent.add(id);
  }

  return [...adjacent].sort();
}

/** Vocabulary an adjacent skill declares and the skill under test does not. */
export function neighbourVocabulary(index, skillId, adjacentIds) {
  const tested = new Set(index?.skills?.[skillId]?.terms ?? []);
  const seen = new Map();
  for (const id of adjacentIds) {
    for (const term of index?.skills?.[id]?.terms ?? []) {
      if (term.length < MIN_TERM_LENGTH) continue;
      if (tested.has(term)) continue;
      const df = index.docFrequency?.[term] ?? 0;
      if (df === 0 || df > MAX_NEIGHBOUR_DF) continue;
      if (!seen.has(term)) seen.set(term, df);
    }
  }
  return [...seen.entries()]
    .sort((a, b) => (a[1] - b[1]) || a[0].localeCompare(b[0]))
    .map(([term, df]) => ({ term, df }));
}

/* -------------------------------------------------------------- csv reader */

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

/** Map every routing fixture file to its canonical <domain>/<skill>. */
export function fixtureSkillIds(files, skills) {
  const byStem = new Map(skills.map((skill) => [`${skill.domain}-${skill.name}`, skillIdOf(skill)]));
  const out = new Map();
  for (const file of files) {
    const stem = file.replace(/\.csv$/, '');
    out.set(file, byStem.get(stem) ?? stem);
  }
  return out;
}

async function loadFixtures(routingDir, skills) {
  const files = (await fs.readdir(routingDir)).filter((name) => name.endsWith('.csv')).sort();
  const ids = fixtureSkillIds(files, skills);
  const fixtures = [];
  for (const name of files) {
    const rows = parseCsvRows(await fs.readFile(path.join(routingDir, name), 'utf8'));
    fixtures.push({
      name,
      skill: ids.get(name),
      rows: rows.slice(1)
        .map((cells, position) => ({
          row: position + 1,
          shouldTrigger: String(cells[0] ?? '').trim().toLowerCase(),
          category: String(cells[1] ?? '').trim(),
          prompt: String(cells[2] ?? '').trim(),
        }))
        .filter((row) => row.prompt && row.shouldTrigger),
    });
  }
  return fixtures;
}

/* ------------------------------------------------------------ proposals */

function lowerFirst(text) {
  const value = String(text ?? '');
  return value ? `${value[0].toLowerCase()}${value.slice(1)}` : value;
}

/** First sentence of a description, cut on a word boundary, no dangling fragment. */
function firstSentence(text, limit = DESCRIPTION_LIMIT) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return lowerFirst(clean.replace(/[.,;:\s]+$/, ''));
  const cut = clean.slice(0, limit);
  const boundary = cut.lastIndexOf(' ');
  const head = (boundary > 30 ? cut.slice(0, boundary) : cut).replace(/[\s,;:—-]+$/, '');
  const tail = clean.slice(head.length).trimStart();
  // Never end the sentence on a word that plainly introduces what follows.
  const dangling = /^(?:and|or|of|to|in|for|with|by|at|from|as|is|are|be|use|using|when|that|this|which|not|but|so|the|a|an)$/i.test(head.split(/\s+/).pop() ?? '');
  return lowerFirst(dangling ? head.replace(/\s+\S+$/, '') : head) || lowerFirst(tail.split(/\s+/).slice(0, 8).join(' '));
}

/** A freshly written negative control that names a real adjacent skill. */
function newNegative(adjacentName, description, template) {
  const sentence = firstSentence(description) || 'take this one';
  if (template === 0) return `${adjacentName}: ${sentence}`;
  if (template === 1) return `use ${adjacentName} for this one — ${sentence}`;
  return `${sentence} — that belongs to ${adjacentName} here`;
}

function csvLine(prompt) {
  return `false,negative-control,"${prompt.replace(/"/g, '""')}"`;
}

/**
 * variantOf(row, {knownNames, vocabulary}) - a minimum-edit rewrite of one
 * existing negative control.
 * One keyword is swapped; the skill the row already names (or a neighbouring
 * one, when the row names none) is preserved, because the routing validator
 * rejects a negative control that names no adjacent skill.
 */
export function variantOf(row, options = {}) {
  const { knownNames = new Set(), vocabulary = [], adjacentNames = [], index = null } = options;
  const mentioned = skillMentions(row.prompt, knownNames);
  const adjacentName = mentioned[0] ?? adjacentNames[0];
  if (!adjacentName) return null;

  const words = row.prompt.toLowerCase().split(/\W+/);
  const slotsInPrompt = KEYWORD_SLOTS.filter((keyword) => {
    const pattern = new RegExp('(?<![\\w-])' + keyword + '(?![\\w-])', 'i');
    return pattern.test(row.prompt) && !knownNames.has(keyword);
  });
  if (slotsInPrompt.length === 0) return null;

  for (const slot of slotsInPrompt) {
    const swapIn = pickSwapIn(slot, vocabulary, words, index);
    if (!swapIn) continue;
    const pattern = new RegExp('(?<![\\w-])' + slot + '(?![\\w-])', 'i');
    const rewritten = row.prompt.replace(pattern, swapIn);
    if (rewritten.toLowerCase() === row.prompt.toLowerCase()) continue;
    return {
      prompt: adjacentName === mentioned[0] ? rewritten : adjacentName + ': ' + rewritten,
      slot,
      swappedIn: swapIn,
      preservedMention: adjacentName,
      originalRow: row.row,
    };
  }
  return null;
}

/**
 * pickSwapIn(slot, vocabulary, words, index) - the replacement for one keyword.
 * Preferred order: a neighbouring skill's own distinctive term that sits in the
 * slot's candidate list, then a candidate term the bundle really indexes, then
 * the first candidate outright. A candidate already present in the prompt is
 * skipped, because a swap that changes nothing is not a variant.
 */
function pickSwapIn(slot, vocabulary, words, index) {
  const candidates = NEIGHBOUR_SYNONYMS[slot] ?? [];
  const free = (term) => words.indexOf(term.toLowerCase()) === -1
    && words.indexOf(term.toLowerCase().split(/\s+/)[0]) === -1;
  const fromNeighbours = vocabulary.find((entry) => candidates.includes(entry.term) && free(entry.term));
  if (fromNeighbours) return fromNeighbours.term;
  const fromBundle = candidates.find((term) => free(term) && (index?.docFrequency?.[term] ?? 0) > 0);
  if (fromBundle) return fromBundle;
  return candidates.find(free) ?? null;
}

/* ------------------------------------------------------------- rendering */

function renderMarkdown({ proposals, routingDir, generatedAt, min }) {
  const lines = [];
  lines.push('# Generated hard-negative proposal (not a fixture)');
  lines.push('');
  lines.push(`Generated ${generatedAt} by \`.agents/skills/platform/scripts/generate-hard-negatives.mjs\`.`);
  lines.push('Every routing CSV in `evals/routing/` was READ by that run and NONE of them was');
  lines.push('rewritten. The lines below are a proposal: they only become fixtures when a human');
  lines.push('pastes them into the matching CSV.');
  lines.push('');
  lines.push('Review each line by hand before pasting. The routing validator');
  lines.push('(`node evals/run-routing.mjs --check`) rejects a negative control that names no real');
  lines.push('bundle skill, names the skill under test, duplicates another row, or runs under three');
  lines.push('words. A line this generator could not confirm with its own ranker sits under "held for');
  lines.push('manual review" and is the most likely to need rewording.');
  lines.push('');

  const short = proposals.filter((entry) => entry.proposals.length < min);
  if (short.length > 0) {
    lines.push(`> Shortfall against --min ${min}: ${short.map((entry) => `${entry.skill} ${entry.proposals.length}/${min}`).join(', ')}.`);
    lines.push('');
  }

  lines.push('| skill | fixture | adjacent | rewrites | proposals |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const entry of proposals) {
    lines.push(`| ${entry.skill} | ${entry.fixture} | ${entry.adjacent.length} | ${entry.variants.length} | ${entry.proposals.length} |`);
  }
  lines.push('');

  for (const entry of proposals) {
    lines.push(`## ${entry.skill} (${entry.fixture})`);
    lines.push('');
    lines.push(`Adjacent bundle skills: ${entry.adjacent.join(', ') || '(none)'}`);
    lines.push('');

    lines.push('### Minimum-edit rewrites of existing negative controls');
    lines.push('');
    if (entry.variants.length > 0) {
      lines.push('```csv');
      for (const variant of entry.variants) lines.push(csvLine(variant.prompt));
      lines.push('```');
      lines.push('');
      for (const variant of entry.variants) {
        lines.push(`- from row ${variant.originalRow}: \`${variant.slot}\` -> \`${variant.swappedIn}\`, keeping the \`${variant.preservedMention}\` mention; the ranker puts \`${variant.top1}\` first.`);
      }
    } else {
      lines.push('(no existing negative control could be rewritten with a single swap)');
    }
    lines.push('');

    lines.push('### New negative controls');
    lines.push('');
    if (entry.proposals.length > 0) {
      lines.push('```csv');
      for (const proposal of entry.proposals) lines.push(csvLine(proposal.prompt));
      lines.push('```');
      lines.push('');
    } else {
      lines.push('(none produced)');
      lines.push('');
    }

    if (entry.held.length > 0) {
      lines.push('### Held for manual review');
      lines.push('');
      for (const held of entry.held) {
        lines.push(`- ${csvLine(held.prompt)} — names \`${held.names}\` but the ranker puts \`${held.top1}\` first.`);
      }
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');
  lines.push(`Source: ${routingDir}. A proposal is a starting point, not a verdict: the routing`);
  lines.push('validator is the gate, a human is the judge, and this file is neither.');
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

function topOne(index, prompt) {
  const ranked = searchIndex(index, prompt, { limit: 1 });
  return ranked.length > 0 ? ranked[0].skill : '<none>';
}

async function main(argv) {
  const args = parseArgs(argv);
  let min = 3;
  if (args.min !== undefined && args.min !== true) {
    const parsed = Number(args.min);
    if (!Number.isFinite(parsed) || parsed < 1) {
      console.error(`usage error: --min must be a positive integer (found ${String(args.min)})`);
      return 2;
    }
    min = Math.trunc(parsed);
  }

  const routingDir = path.resolve(typeof args.routing === 'string' ? args.routing : DEFAULT_ROUTING_DIR);
  if (!fsSync.existsSync(routingDir)) {
    console.error(`error: routing fixtures not found at ${routingDir}`);
    return 2;
  }

  const root = process.cwd();
  const skills = await enrichSkills(collectSkills(root), root);
  const graph = buildGraph(root);
  const index = buildSkillIndex(skills);
  const knownNames = new Set(skills.map((skill) => skill.name));
  const descriptions = new Map(skills.map((skill) => [skillIdOf(skill), skill.description]));

  let fixtures = await loadFixtures(routingDir, skills);
  if (args.skill) {
    const wanted = String(args.skill).replace(/\.csv$/, '');
    const filtered = fixtures.filter((entry) => entry.skill === wanted
      || entry.name.replace(/\.csv$/, '') === wanted
      || entry.name.replace(/\.csv$/, '').split('-').pop() === wanted.split('/').pop());
    if (filtered.length === 0) {
      console.error(`usage error: no routing fixture matches --skill ${args.skill}`);
      return 2;
    }
    fixtures = filtered;
  }

  const proposals = [];
  for (const fixture of fixtures) {
    const skillId = fixture.skill;
    if (!index.skills?.[skillId]) continue; // not a bundle skill: nothing to propose
    const testedName = skillId.split('/').pop();
    const adjacent = adjacentSkills(graph, skills, skillId);
    const vocabulary = neighbourVocabulary(index, skillId, adjacent);
    const adjacentNames = adjacent.map((id) => id.split('/').pop()).filter((name) => name !== testedName);
    const seen = new Set(fixture.rows.map((row) => row.prompt.toLowerCase()));

    const variants = [];
    for (const row of fixture.rows.filter((entry) => entry.shouldTrigger === 'false')) {
      const variant = variantOf(row, { knownNames, vocabulary, adjacentNames, index });
      if (!variant) continue;
      const key = variant.prompt.toLowerCase();
      if (seen.has(key)) continue;
      if (skillMentions(variant.prompt, new Set([testedName])).length > 0) continue;
      seen.add(key);
      variants.push({ ...variant, top1: topOne(index, variant.prompt) });
    }

    const held = [];
    const fresh = [];
    for (const adjacentId of adjacent) {
      if (fresh.length >= min) break;
      const adjacentName = adjacentId.split('/').pop();
      if (adjacentName === testedName) continue;
      if (!knownNames.has(adjacentName)) continue; // never propose a name the bundle lacks
      for (const template of [0, 1, 2]) {
        if (fresh.length >= min) break;
        const prompt = newNegative(adjacentName, descriptions.get(adjacentId) ?? '', template);
        const key = prompt.toLowerCase();
        if (seen.has(key)) continue;
        if (skillMentions(prompt, new Set([testedName])).length > 0) continue;
        seen.add(key);
        const top1 = topOne(index, prompt);
        const entry = { prompt, names: adjacentName, top1 };
        if (top1 === adjacentId) fresh.push(entry); else held.push(entry);
      }
    }

    proposals.push({
      skill: skillId,
      fixture: fixture.name,
      adjacent,
      variants,
      proposals: fresh,
      held,
    });
  }

  const generatedAt = new Date().toISOString();
  const markdown = renderMarkdown({
    proposals,
    routingDir: path.relative(root, routingDir) || routingDir,
    generatedAt,
    min,
  });

  if (args.write) {
    await fs.mkdir(routingDir, { recursive: true });
    await fs.writeFile(path.join(routingDir, PROPOSAL_FILENAME), markdown, 'utf8');
  }

  if (args.json) {
    console.log(JSON.stringify({
      status: args.write ? 'written' : 'dry-run',
      file: path.relative(root, path.join(routingDir, PROPOSAL_FILENAME)) || path.join(routingDir, PROPOSAL_FILENAME),
      min,
      generatedAt,
      fixtures: proposals.length,
      rewrites: proposals.reduce((sum, entry) => sum + entry.variants.length, 0),
      proposals: proposals.reduce((sum, entry) => sum + entry.proposals.length, 0),
      held: proposals.reduce((sum, entry) => sum + entry.held.length, 0),
      skills: proposals,
    }, null, 2));
  } else {
    console.log(`[generate-hard-negatives] ${args.write ? 'written' : 'dry-run'}: ${proposals.reduce((sum, entry) => sum + entry.variants.length, 0)} rewrites, ${proposals.reduce((sum, entry) => sum + entry.proposals.length, 0)} proposals, ${proposals.reduce((sum, entry) => sum + entry.held.length, 0)} held across ${proposals.length} fixture(s)`);
    console.log(`[generate-hard-negatives] proposal file: ${path.relative(root, path.join(routingDir, PROPOSAL_FILENAME))}`);
    if (!args.write) console.log('[generate-hard-negatives] dry run; pass --write to persist the proposal');
  }
  return 0;
}

const invokedDirectly = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();

if (invokedDirectly) {
  main(process.argv.slice(2)).then((code) => process.exit(code)).catch((err) => {
    console.error(`generate-hard-negatives error: ${err.message}`);
    process.exit(1);
  });
}
