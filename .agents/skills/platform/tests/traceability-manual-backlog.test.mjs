// traceability-manual-backlog.test.mjs - the manual-clause backlog gate.
//
// Completeness-audit item 3: the manual backlog that the first traceability
// wave left open is closed. Eight clauses (CODE-REVIEW-2/3/4, IMPLEMENT-2/3/4,
// TO-SPEC-2/3) stayed `manual` because their paired fixtures exercised the
// guardrail without citing the clause id; the citations landed in
// evals/behavioral/{code-review,implement,to-spec}.json and every `check:` was
// repointed at `evals/behavioral/<skill>.json#<CLAUSE-ID>`.
//
// The backlog map therefore stays empty and the gate enforces four invariants:
//
//   1. the real validator closes clean and no clause is left manual or
//      pending - a clause regressing to `manual` fails here;
//   2. every clause-declaring skill owns an evals/behavioral fixture, so a
//      clause can always be repointed at the fixture that exercises it;
//   3. every declared `check:` is a file that exists and literally cites the
//      clause id, which is what makes a check file-cited rather than
//      aspirational;
//   4. the closed clauses stay cited, so a fixture edit cannot quietly drop a
//      citation and reopen the backlog.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { splitFrontmatter, parseClauses, parseCheckRef } from '../validate-traceability.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..');
const SKILLS_ROOT = path.join(REPO_ROOT, '.agents', 'skills');
const EVALS_BEHAVIORAL = path.join(REPO_ROOT, 'evals', 'behavioral');

// The residual backlog is closed, so this map is empty. A clause may only go
// back to `manual` by recording its reason here; with the backlog closed an
// empty map means any manual clause fails this gate instead of passing as a
// documented exception.
const DOCUMENTED_MANUAL_BACKLOG = {};

// The eight clauses that were manual while their paired fixtures were owned by
// another work item, and the citation that closed each one. The gate re-reads
// these to prove the closure is durable: a fixture edit that drops one of these
// citations reopens the backlog.
const CLOSED_BACKLOG_CITATIONS = {
  'CODE-REVIEW-2': 'evals/behavioral/code-review.json',
  'CODE-REVIEW-3': 'evals/behavioral/code-review.json',
  'CODE-REVIEW-4': 'evals/behavioral/code-review.json',
  'IMPLEMENT-2': 'evals/behavioral/implement.json',
  'IMPLEMENT-3': 'evals/behavioral/implement.json',
  'IMPLEMENT-4': 'evals/behavioral/implement.json',
  'TO-SPEC-2': 'evals/behavioral/to-spec.json',
  'TO-SPEC-3': 'evals/behavioral/to-spec.json',
};

function collectSkillFiles() {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (full.includes(`${path.sep}platform${path.sep}runs${path.sep}`)) continue;
      if (entry.isDirectory()) {
        if (fs.existsSync(path.join(full, 'SKILL.md'))) out.push(path.join(full, 'SKILL.md'));
        else walk(full);
      }
    }
  };
  walk(SKILLS_ROOT);
  return out;
}

function declaredClauses() {
  const out = [];
  for (const file of collectSkillFiles()) {
    const text = fs.readFileSync(file, 'utf8');
    const name = path.basename(path.dirname(file));
    for (const clause of parseClauses(splitFrontmatter(text))) {
      out.push({ skill: name, file, clause });
    }
  }
  return out;
}

test('the real validator closes clean with no clause left manual or pending', () => {
  const result = spawnSync('node', ['.agents/skills/platform/validate-traceability.mjs', '--json'], {
    encoding: 'utf8',
    cwd: REPO_ROOT,
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, 'pass');
  assert.deepEqual(payload.errors, [], JSON.stringify(payload.errors));
  assert.deepEqual(payload.warnings, [], JSON.stringify(payload.warnings));
  assert.equal(payload.coverage.pending, 0, 'no clause may cite a fixture that does not exist yet');
  assert.equal(
    payload.coverage.resolved + payload.coverage.manual + payload.coverage.pending,
    payload.clauses,
    'every declared clause is counted exactly once',
  );

  assert.equal(payload.coverage.resolved, payload.clauses, 'every declared clause resolves to a file-cited check');

  const manual = payload.perSkill
    .flatMap((skill) => skill.clauses.map((clause) => ({ skill: skill.name, ...clause })))
    .filter((clause) => clause.status === 'manual')
    .map((clause) => clause.id)
    .sort();
  const documented = Object.keys(DOCUMENTED_MANUAL_BACKLOG).sort();
  assert.deepEqual(
    manual,
    documented,
    'the manual backlog is closed: repoint the clause at its fixture, or record its reason in DOCUMENTED_MANUAL_BACKLOG',
  );
  for (const id of manual) {
    assert.ok(DOCUMENTED_MANUAL_BACKLOG[id], `${id} is manual with no documented reason`);
  }
  assert.equal(manual.length, documented.length, 'the backlog size changed; keep the documentation honest');
});

test('the closed backlog stays cited so the citations cannot silently regress', () => {
  // Each of the eight clauses that closed the backlog is re-read from its own
  // fixture, so a fixture edit that drops a citation fails here instead of
  // letting the clause fall back to `manual`.
  for (const [id, fixtureRelative] of Object.entries(CLOSED_BACKLOG_CITATIONS)) {
    const fixtureFile = path.resolve(REPO_ROOT, fixtureRelative);
    assert.ok(fs.existsSync(fixtureFile), `${fixtureRelative} must still exist`);
    const content = fs.readFileSync(fixtureFile, 'utf8');
    assert.ok(content.includes(id), `${fixtureRelative} no longer cites ${id}; the manual backlog would reopen`);

    const declared = declaredClauses().find((entry) => entry.clause?.id === id);
    assert.ok(declared, `${id} is no longer declared as a clause`);
    const check = String(declared.clause?.check ?? '').trim();
    assert.notEqual(check, 'manual', `${id} fell back to a manual check`);
    assert.equal(
      check,
      `${fixtureRelative}#${id}`,
      `${id} must cite its own fixture with its own id as the fragment`,
    );
  }
});

test('every clause-declaring skill owns an evals/behavioral fixture', () => {
  const fixtureSkills = fs.readdirSync(EVALS_BEHAVIORAL)
    .filter((entry) => entry.endsWith('.json'))
    .map((entry) => JSON.parse(fs.readFileSync(path.join(EVALS_BEHAVIORAL, entry), 'utf8')))
    .map((fixture) => String(fixture.skill ?? '').split('/').pop())
    .filter((name) => name.length > 0);

  const declaring = new Set();
  for (const { skill, clause } of declaredClauses()) {
    if (String(clause?.id ?? '').trim()) declaring.add(skill);
  }
  assert.ok(declaring.size > 0, 'no clause-declaring skill was found, so the scan is broken');

  for (const skill of declaring) {
    assert.ok(
      fixtureSkills.includes(skill),
      `${skill} declares clauses but has no evals/behavioral fixture to cite`,
    );
  }
});

test('every declared check is manual or points at an existing file that cites the clause', () => {
  const clauses = declaredClauses();
  assert.ok(clauses.length > 0, 'no clause declarations were found, so the scan is broken');

  for (const { skill, file, clause } of clauses) {
    const id = String(clause?.id ?? '').trim();
    const check = String(clause?.check ?? '').trim();
    assert.ok(check.length > 0, `${skill}: clause ${id} declares no check`);

    if (check === 'manual') {
      assert.ok(
        DOCUMENTED_MANUAL_BACKLOG[id],
        `${skill}: clause ${id} is manual with no documented reason in this gate`,
      );
      continue;
    }

    const { path: checkPath, fragment } = parseCheckRef(check);
    assert.equal(fragment, id, `${skill}: clause ${id} cites ${check} but the fragment is not its own id`);
    const resolved = path.resolve(REPO_ROOT, checkPath);
    assert.ok(
      fs.existsSync(resolved),
      `${skill}: clause ${id} cites ${checkPath}, which does not exist`,
    );
    const content = fs.readFileSync(resolved, 'utf8');
    assert.ok(
      content.includes(id),
      `${skill}: clause ${id} is not cited by ${checkPath}, so the check is not file-cited`,
    );
  }
});

test('every closed backlog clause names the fixture that carries its citation', () => {
  for (const [id, fixtureRelative] of Object.entries(CLOSED_BACKLOG_CITATIONS)) {
    const target = path.resolve(REPO_ROOT, fixtureRelative);
    assert.ok(fs.existsSync(target), `${id}: the fixture that carries the citation does not exist`);
  }
  assert.ok(
    Object.keys(CLOSED_BACKLOG_CITATIONS).length > 0,
    'the closed-backlog record was emptied; the gate would stop proving the closure',
  );
});
