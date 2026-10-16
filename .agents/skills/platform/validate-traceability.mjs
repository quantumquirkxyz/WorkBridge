#!/usr/bin/env node
// validate-traceability.mjs - Contract-clause traceability gate.
//
// Wave 1 item 1.6: every contract clause of a skill carries a stable ID, every
// clause's check is cited by ID, and CI fails when an ID has no check or a
// check cites a dead ID - turning docs<->behavior drift from discipline into
// a build failure (Kiro-style requirement IDs threaded through checks, plus
// Tessl-style spec<->code drift blocking merges).
//
// Clause declaration lives in SKILL.md frontmatter:
//   clauses:
//     - id: TO-SPEC-1
//       text: "Prefer one seam, and make any seam choice explicit before publishing."
//       check: evals/behavioral/to-spec.json#TO-SPEC-1   # file that cites the id
//       check: manual                                    # human-verified, never auto-satisfied
//
// Usage: node .agents/skills/platform/validate-traceability.mjs [--json] [--fix-hint]

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordExecution } from './record-execution.mjs';

const repoRoot = process.cwd();
const skillsRoot = path.join(repoRoot, '.agents', 'skills');
const evalsBehavioralDir = path.join(repoRoot, 'evals', 'behavioral');
const evalsBehavioralPrefix = 'evals/behavioral/';
const minClauseTextLength = 15;
const minCriticalClauses = 2;

// The critical set: work-item governance and delivery-flow skills whose
// contract clauses are load-bearing for the repository's own workflows.
export const criticalSkills = new Set([
  'work-item-router',
  'ask-to',
  'ship-subissue',
  'publish-open-pr',
  'to-spec',
  'to-tickets',
  'implement',
  'tdd',
  'code-review',
  'review-pr',
  'review-fix-loop',
  'evaluate-skill',
  'skill-audit',
  'skill-promoter',
  'side-effect-auditor',
  'subagent-swarm',
]);

// Matches clause-id citations such as TO-SPEC-1, CODE-REVIEW-2, SUBAGENT-SWARM-1.
const clauseIdPattern = /\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+-\d+\b/g;

const fixHints = {
  'missing-id': 'give the clause a stable id of the form <SKILL>-<n>',
  'duplicate-id': 'rename one of the duplicates so each clause id is unique within its skill',
  'check-missing': 'create the cited check file, repoint the clause at a file that cites it, or use check: manual for prose-level rules',
  'check-uncited': 'add the clause id as a citation (assertion, rubric, or comment) inside the cited file so the grep resolves',
  'check-fragment-mismatch': 'point the citation fragment at this clause\'s own id, e.g. evals/behavioral/<skill>.json#<CLAUSE-ID>',
  'check-pending': 'land the evals/behavioral fixture with assertions citing the id, or switch the clause to check: manual',
  'dead-citation': 'declare the cited id as a clause in the owning SKILL.md frontmatter, or remove the stale citation',
  'critical-min-clauses': 'declare at least 2 contract clauses for critical-set skills',
  'short-text': 'rewrite the clause text as a real enforced rule of at least 15 characters',
  'fixture-unreadable': 'fix the fixture JSON so its assertions and rubric can be parsed',
};

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectSkillFiles(dir, out = []) {
  if (!(await exists(dir))) return out;
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const filePath = path.join(dir, entry.name);
    if (filePath.includes(`${path.sep}platform${path.sep}runs${path.sep}`)) continue;
    if (entry.isDirectory()) {
      const skillMd = path.join(filePath, 'SKILL.md');
      if (await exists(skillMd)) out.push(skillMd);
      else await collectSkillFiles(filePath, out);
    }
  }
  return out;
}

export function splitFrontmatter(text) {
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return null;
  return text.slice(4, end);
}

export function unquote(value) {
  const raw = String(value ?? '').trim();
  if (raw.length >= 2 && ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'")))) {
    return raw.slice(1, -1);
  }
  return raw;
}

function scalarValue(raw) {
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === '[]') return [];
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) return trimmed;
  return unquote(trimmed);
}

// Parses the clauses frontmatter in both supported dialects: a YAML block
// sequence of mappings and an inline JSON array of objects.
export function parseClauses(frontmatter) {
  if (!frontmatter) return [];
  const lines = frontmatter.split(/\r?\n/);
  const clauses = [];
  let inClauses = false;
  let current = null;
  const push = () => {
    if (current) clauses.push(current);
    current = null;
  };
  for (const line of lines) {
    const key = line.match(/^([A-Za-z][A-Za-z0-9-]*):\s*(.*)$/);
    if (key) {
      push();
      inClauses = key[1] === 'clauses';
      if (!inClauses) continue;
      const inline = scalarValue(key[2]);
      if (typeof inline === 'string') {
        try {
          const parsed = JSON.parse(inline);
          if (Array.isArray(parsed)) return parsed.filter((entry) => entry && typeof entry === 'object');
        } catch {
          // not inline JSON - fall through to block-sequence parsing
        }
      }
      continue;
    }
    if (!inClauses) continue;
    const item = line.match(/^\s*-\s+(.*)$/);
    if (item) {
      push();
      current = {};
      const inlinePair = item[1].match(/^([A-Za-z][A-Za-z0-9-]*):\s*(.*)$/);
      if (inlinePair) current[inlinePair[1]] = unquote(inlinePair[2]);
      continue;
    }
    const prop = line.match(/^\s+([A-Za-z][A-Za-z0-9-]*):\s*(.*)$/);
    if (prop && current) current[prop[1]] = unquote(prop[2]);
  }
  push();
  return clauses;
}

export function parseCheckRef(check) {
  const trimmed = String(check ?? '').trim();
  const hashIndex = trimmed.indexOf('#');
  if (hashIndex === -1) return { path: trimmed, fragment: '' };
  return { path: trimmed.slice(0, hashIndex), fragment: trimmed.slice(hashIndex + 1) };
}

export function citedIds(text) {
  return String(text ?? '').match(clauseIdPattern) ?? [];
}

function flattenStrings(value) {
  if (value === null || value === undefined) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(flattenStrings);
  if (typeof value === 'object') return Object.entries(value).flatMap(([entryKey, entryValue]) => [entryKey, ...flattenStrings(entryValue)]);
  return [String(value)];
}

// Rules (a), (d), (e): pure declaration checks that need no filesystem access.
export function auditClauseDeclarations(name, clauses, { critical }) {
  const errors = [];
  const warnings = [];
  const seen = new Set();
  for (const clause of clauses) {
    const id = String(clause?.id ?? '').trim();
    const text = String(clause?.text ?? '').trim();
    if (!id) {
      errors.push({ code: 'missing-id', message: `${name}: clause without an id` });
      continue;
    }
    if (seen.has(id)) errors.push({ code: 'duplicate-id', message: `${name}: duplicate clause id ${id}` });
    seen.add(id);
    if (text.length < minClauseTextLength) {
      errors.push({ code: 'short-text', message: `${name}: clause ${id} text must be at least ${minClauseTextLength} characters, not a placeholder` });
    }
    const check = String(clause?.check ?? '').trim();
    if (!check) errors.push({ code: 'check-missing', message: `${name}: clause ${id} has no check (cite a file that carries the id, or check: manual)` });
  }
  if (critical && clauses.length < minCriticalClauses) {
    errors.push({ code: 'critical-min-clauses', message: `${name}: critical-set skill must declare at least ${minCriticalClauses} clauses (found ${clauses.length})` });
  }
  return { errors, warnings };
}

// Rule (b)/(f): resolve one clause check against the filesystem.
//
// A citation may carry a fragment: `evals/behavioral/tdd.json#TDD-1`. The
// fragment is the anchor the citation points at, so the invariant to enforce is
// that it names THIS clause's id. Without the fragment check a typo'd or
// copy-pasted anchor resolves as long as the file mentions the clause id
// somewhere, which makes a wrong anchor undetectable.
export async function resolveCheck(name, clause) {
  const check = String(clause?.check ?? '').trim();
  if (check === 'manual') return { status: 'manual' };
  const { path: checkPath, fragment } = parseCheckRef(check);
  const clauseId = String(clause?.id ?? '').trim();
  const fullPath = path.resolve(repoRoot, checkPath);
  if (!(await exists(fullPath))) {
    if (checkPath.startsWith(evalsBehavioralPrefix)) {
      // Rule (f): evals/behavioral fixtures land in a parallel work item, so a
      // missing fixture is a pending warning, not a traceability error.
      return { status: 'pending', code: 'check-pending', message: `${name}: clause ${clauseId} check ${check} does not exist yet` };
    }
    return { status: 'error', code: 'check-missing', message: `${name}: clause ${clauseId} check file missing: ${checkPath}` };
  }
  const content = await fs.readFile(fullPath, 'utf8');
  if (fragment !== '' && fragment !== clauseId) {
    return {
      status: 'error',
      code: 'check-fragment-mismatch',
      message: `${name}: clause ${clauseId} cites ${checkPath}#${fragment}, but that fragment is not this clause's id - repoint the citation at #${clauseId}`,
    };
  }
  if (!content.includes(clauseId)) {
    return { status: 'error', code: 'check-uncited', message: `${name}: clause ${clauseId} is not cited by ${checkPath}` };
  }
  return { status: 'resolved' };
}

// Rule (c): every id cited by an evals/behavioral fixture's assertions or
// rubric must correspond to a declared clause.
async function scanEvalsCitations(declaredIds, errors) {
  if (!(await exists(evalsBehavioralDir))) return;
  for (const entry of await fs.readdir(evalsBehavioralDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const relative = `${evalsBehavioralPrefix}${entry.name}`;
    let parsed;
    try {
      parsed = JSON.parse(await fs.readFile(path.join(evalsBehavioralDir, entry.name), 'utf8'));
    } catch {
      errors.push({ code: 'fixture-unreadable', message: `${relative}: fixture JSON could not be parsed` });
      continue;
    }
    const fixtures = Array.isArray(parsed?.fixtures) ? parsed.fixtures : Array.isArray(parsed) ? parsed : [parsed];
    for (const fixture of fixtures) {
      const dead = new Set();
      for (const field of [fixture?.assertions, fixture?.rubric]) {
        for (const text of flattenStrings(field)) {
          for (const cited of citedIds(text)) {
            if (!declaredIds.has(cited)) dead.add(cited);
          }
        }
      }
      for (const cited of dead) {
        errors.push({ code: 'dead-citation', message: `${relative}: dead citation ${cited} - no skill declares that clause id` });
      }
    }
  }
}

function label(value) {
  return String(value ?? '').padEnd(22).slice(0, 22);
}

function printReport(rows, totals) {
  console.log('Contract-clause traceability');
  console.log('============================');
  if (rows.length === 0) {
    console.log('No skills declare clauses.');
  } else {
    console.log(`${label('skill')}${label('clauses')}${label('resolved')}${label('manual')}${label('pending')}${label('errors')}reload`);
    for (const row of rows) {
      console.log(`${label(row.name)}${label(row.clauses)}${label(row.resolved)}${label(row.manual)}${label(row.pending)}${label(row.errors)}${row.reloadPolicy || '-'}`);
    }
  }
  console.log('');
  console.log(`Totals: skills=${totals.skills} critical=${totals.critical} clauses=${totals.clauses} resolved=${totals.resolved} manual=${totals.manual} pending=${totals.pending}`);
  console.log(`Errors: ${totals.errors}  Warnings: ${totals.warnings}`);
}

function printFindings(warnings, errors) {
  if (warnings.length) {
    console.log('');
    console.log('Warnings:');
    for (const warning of warnings) console.log(`  ! ${warning}`);
  }
  if (errors.length) {
    console.log('');
    console.log('Errors:');
    for (const error of errors) console.log(`  x ${error}`);
  }
}

function printFixHints(warnings, errors) {
  const classes = new Map();
  for (const [finding, code] of [...errors.map((entry) => [entry, entry.code]), ...warnings.map((entry) => [entry, entry.code])]) {
    if (!classes.has(code)) classes.set(code, []);
    classes.get(code).push(finding.message);
  }
  console.log('');
  if (classes.size === 0) {
    // Hint mode always publishes the remediation vocabulary, so operators can
    // see the available classes even when nothing is currently pending.
    console.log('Remediation by class:');
    for (const [code, hint] of Object.entries(fixHints)) {
      console.log(`  ${code}: ${hint}`);
    }
    console.log('No errors - nothing to remediate.');
    return;
  }
  console.log('Remediation by class:');
  for (const [code, messages] of classes) {
    console.log(`  ${code}: ${fixHints[code] ?? 'inspect the finding'}`);
    for (const message of messages) console.log(`    - ${message}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const fixHintMode = args.includes('--fix-hint');

  const skillFiles = await collectSkillFiles(skillsRoot);
  const errors = [];
  const warnings = [];
  const rows = [];
  const perSkill = [];
  const declaredIds = new Set();
  let criticalCount = 0;
  let totalClauses = 0;
  let totalResolved = 0;
  let totalManual = 0;
  let totalPending = 0;

  for (const file of skillFiles) {
    const text = await fs.readFile(file, 'utf8');
    const name = path.basename(path.dirname(file));
    const relativeSkillPath = path.relative(repoRoot, file).replaceAll(path.sep, '/');
    const frontmatter = splitFrontmatter(text);
    const clauses = parseClauses(frontmatter);
    // The critical-set audit runs before the zero-clause skip: a critical skill
    // with no clauses is exactly the drift this gate exists to catch, and it must
    // be counted as present in the tree even when its clause list is empty.
    const critical = criticalSkills.has(name);
    if (critical) criticalCount += 1;
    const declared = auditClauseDeclarations(name, clauses, { critical });
    errors.push(...declared.errors);
    warnings.push(...declared.warnings);

    // Non-critical skills legitimately declare no clauses yet; they keep the skip.
    if (clauses.length === 0) continue;

    let resolved = 0;
    let manual = 0;
    let pending = 0;
    let errored = 0;
    const clauseRows = [];
    for (const clause of clauses) {
      const id = String(clause?.id ?? '').trim();
      if (id) declaredIds.add(id);
      totalClauses += 1;
      const result = await resolveCheck(name, clause);
      if (result.status === 'pending') warnings.push({ code: result.code, message: result.message });
      if (result.status === 'error') errors.push({ code: result.code, message: result.message });
      if (result.status === 'resolved') resolved += 1;
      else if (result.status === 'manual') manual += 1;
      else if (result.status === 'pending') pending += 1;
      else errored += 1;
      clauseRows.push({ id, status: result.status, check: String(clause?.check ?? '') });
    }
    totalResolved += resolved;
    totalManual += manual;
    totalPending += pending;

    const reloadPolicy = /^reloadPolicy:\s*(.*)$/m.exec(frontmatter ?? '')?.[1]?.trim();
    rows.push({ name, clauses: clauses.length, resolved, manual, pending, errors: errored, reloadPolicy: unquote(reloadPolicy) });
    perSkill.push({ name, path: relativeSkillPath, critical, reloadPolicy: unquote(reloadPolicy), clauses: clauseRows });
  }

  await scanEvalsCitations(declaredIds, errors);

  const totals = {
    skills: skillFiles.length,
    critical: criticalCount,
    clauses: totalClauses,
    resolved: totalResolved,
    manual: totalManual,
    pending: totalPending,
    errors: errors.length,
    warnings: warnings.length,
  };

  const warningMessages = warnings.map((entry) => entry.message);
  const errorMessages = errors.map((entry) => entry.message);

  const runPath = await recordExecution({
    repoRoot,
    skill: 'skill-audit',
    tool: 'skills:validate-traceability',
    contextPack: 'platform-traceability',
    status: errorMessages.length ? 'fail' : 'pass',
    errors: errorMessages,
    warnings: warningMessages,
    extra: { clauses: totalClauses, criticalSkills: criticalCount },
  });

  if (jsonMode) {
    console.log(JSON.stringify({
      skills: skillFiles.length,
      criticalSkills: criticalCount,
      clauses: totalClauses,
      coverage: { resolved: totalResolved, manual: totalManual, pending: totalPending },
      perSkill,
      warnings: warningMessages,
      errors: errorMessages,
      status: errors.length ? 'fail' : 'pass',
      executionRecord: path.relative(repoRoot, runPath),
    }, null, 2));
  } else {
    printReport(rows, totals);
    printFindings(warningMessages, errorMessages);
    if (fixHintMode) printFixHints(warnings, errors);
    console.log('');
    console.log(`Execution record: ${path.relative(repoRoot, runPath)}`);
  }

  if (errors.length) process.exit(1);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
