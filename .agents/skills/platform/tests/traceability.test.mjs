import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseClauses, parseCheckRef, citedIds, criticalSkills } from '../validate-traceability.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function run(args) {
  return spawnSync('node', ['.agents/skills/platform/validate-traceability.mjs', ...args], { encoding: 'utf8' });
}

const CRITICAL_SKILLS = [
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
];

test('traceability validator passes on the repository bundle', () => {
  const result = run([]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(spawnSync('node', ['.agents/skills/platform/validate-traceability.mjs', '--json'], { encoding: 'utf8' }).stdout);
  assert.equal(payload.status, 'pass');
  assert.deepEqual(payload.errors, []);
  assert.ok(payload.clauses >= CRITICAL_SKILLS.length * 2);
  const { resolved, manual, pending } = payload.coverage;
  assert.equal(resolved + manual + pending, payload.clauses);
});

test('every critical skill declares at least two clauses with unique ids', () => {
  const result = run(['--json']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  const byName = new Map(payload.perSkill.map((entry) => [entry.name, entry]));
  for (const name of CRITICAL_SKILLS) {
    const entry = byName.get(name);
    assert.ok(entry, `${name} declares no clauses`);
    assert.equal(entry.critical, true, `${name} must be in the critical set`);
    assert.ok(entry.clauses.length >= 2, `${name} must declare at least two clauses`);
    const ids = entry.clauses.map((clause) => clause.id);
    assert.equal(new Set(ids).size, ids.length, `${name} has duplicate clause ids`);
  }
  const allIds = payload.perSkill.flatMap((entry) => entry.clauses.map((clause) => clause.id));
  assert.equal(new Set(allIds).size, allIds.length, 'clause ids must be globally unique');
});

test('governance skills carry an always reload policy', () => {
  const result = run(['--json']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  const always = payload.perSkill.filter((entry) => entry.reloadPolicy === 'always').map((entry) => entry.name).sort();
  assert.deepEqual(always, ['ask-to', 'publish-open-pr', 'ship-subissue', 'work-item-router']);
});

test('fix-hint mode prints remediation for pending evals citations', () => {
  const result = run(['--fix-hint']);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /check-pending: land the evals\/behavioral fixture/);
  assert.match(result.stdout, /Remediation by class:/);
});

test('parseClauses reads the block-sequence dialect', () => {
  const clauses = parseClauses(`clauses:
  - id: TO-SPEC-1
    text: "Prefer one seam, and make any seam choice explicit before publishing."
    check: evals/behavioral/to-spec.json#TO-SPEC-1
  - id: TO-SPEC-2
    text: Stop when the spec cannot be handed off.
    check: manual
risk: medium`);
  assert.equal(clauses.length, 2);
  assert.deepEqual(clauses[0], {
    id: 'TO-SPEC-1',
    text: 'Prefer one seam, and make any seam choice explicit before publishing.',
    check: 'evals/behavioral/to-spec.json#TO-SPEC-1',
  });
  assert.equal(clauses[1].check, 'manual');
});

test('parseClauses reads the inline JSON dialect and ignores absent declarations', () => {
  assert.deepEqual(parseClauses('clauses: [{"id":"TDD-1","text":"Write the failing test first.","check":"manual"}]'), [
    { id: 'TDD-1', text: 'Write the failing test first.', check: 'manual' },
  ]);
  assert.deepEqual(parseClauses('clauses: []'), []);
  assert.deepEqual(parseClauses('name: to-spec\nrisk: medium'), []);
});

test('parseCheckRef splits the optional fragment', () => {
  assert.deepEqual(parseCheckRef('evals/behavioral/tdd.json#TDD-1'), { path: 'evals/behavioral/tdd.json', fragment: 'TDD-1' });
  assert.deepEqual(parseCheckRef('manual'), { path: 'manual', fragment: '' });
  assert.deepEqual(parseCheckRef('.agents/skills/platform/validate-skills.mjs'), { path: '.agents/skills/platform/validate-skills.mjs', fragment: '' });
});

test('citedIds extracts clause ids without false positives', () => {
  assert.deepEqual(citedIds('assertion TO-SPEC-1 holds and CODE-REVIEW-2 holds'), ['TO-SPEC-1', 'CODE-REVIEW-2']);
  assert.deepEqual(citedIds('uses UTF-8 encoding and an RFC-4122 identifier'), []);
  assert.deepEqual(citedIds('no clause citation here'), []);
});

test('the critical set contains exactly the sixteen wave-1 skills', () => {
  assert.equal(criticalSkills.size, 16);
  for (const name of CRITICAL_SKILLS) assert.ok(criticalSkills.has(name), `${name} missing from critical set`);
});

/* ---------------------------------- finding 3: critical audit before the skip */

test('auditClauseDeclarations fires critical-min-clauses for a critical skill with no clauses', async () => {
  const { auditClauseDeclarations } = await import('../validate-traceability.mjs');
  const { errors, warnings } = auditClauseDeclarations('tdd', [], { critical: true });
  assert.equal(errors.length, 1);
  assert.equal(errors[0].code, 'critical-min-clauses');
  assert.match(errors[0].message, /critical-set skill must declare at least 2 clauses \(found 0\)/);
  assert.deepEqual(warnings, []);
});

test('auditClauseDeclarations leaves a non-critical skill with no clauses alone', async () => {
  const { auditClauseDeclarations } = await import('../validate-traceability.mjs');
  const { errors, warnings } = auditClauseDeclarations('some-future-skill', [], { critical: false });
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test('auditClauseDeclarations still counts sub-minimum clause lists for critical skills', async () => {
  const { auditClauseDeclarations } = await import('../validate-traceability.mjs');
  const clauses = [{ id: 'TDD-1', text: 'Write the failing test before the implementation.', check: 'manual' }];
  const { errors } = auditClauseDeclarations('tdd', clauses, { critical: true });
  assert.equal(errors.length, 1);
  assert.equal(errors[0].code, 'critical-min-clauses');
  assert.match(errors[0].message, /found 1\)/);
  const passing = auditClauseDeclarations('tdd', [...clauses, { id: 'TDD-2', text: 'Refactor only after the test is green.', check: 'manual' }], { critical: true });
  assert.deepEqual(passing.errors, []);
});

test('a critical skill declaring no clauses is reported on a synthetic tree', () => {
  // The end-to-end shape: build a throwaway skills tree with one critical-set
  // skill carrying zero clauses and one non-critical skill, then run the real
  // validator against it.
  const tree = fs.mkdtempSync(path.join(os.tmpdir(), 'quirk-traceability-'));
  const criticalDir = path.join(tree, '.agents', 'skills', 'delivery', 'tdd');
  const plainDir = path.join(tree, '.agents', 'skills', 'backend', 'some-future-skill');
  fs.mkdirSync(criticalDir, { recursive: true });
  fs.mkdirSync(plainDir, { recursive: true });
  fs.writeFileSync(path.join(criticalDir, 'SKILL.md'), '---\nname: tdd\ndescription: "Test first."\n---\n\n# Body\n');
  fs.writeFileSync(path.join(plainDir, 'SKILL.md'), '---\nname: some-future-skill\ndescription: "Nothing declared yet."\n---\n\n# Body\n');

  const result = spawnSync('node', [path.join(HERE, '..', 'validate-traceability.mjs'), '--json'], { encoding: 'utf8', cwd: tree });
  assert.notEqual(result.status, 0, 'a critical skill without clauses must fail the gate');

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, 'fail');
  assert.ok(payload.errors.some((message) => /critical-min-clauses/.test(message) || /tdd: critical-set skill must declare at least 2 clauses/.test(message)),
    `expected the critical-min-clauses error, got: ${JSON.stringify(payload.errors)}`);
  assert.ok(!payload.errors.some((message) => /some-future-skill/.test(message)), 'a non-critical skill with no clauses must stay silent');
});

test('criticalCount covers critical skills present in the tree regardless of clause count', () => {
  const tree = fs.mkdtempSync(path.join(os.tmpdir(), 'quirk-traceability-'));
  const skillsRoot = path.join(tree, '.agents', 'skills');
  const writeSkill = (name, clauses) => {
    const dir = path.join(skillsRoot, name);
    fs.mkdirSync(dir, { recursive: true });
    const clauseBlock = clauses === '' ? '' : `clauses:\n${clauses}\n`;
    fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\n${clauseBlock}---\n\n# Body\n`);
  };
  // Two critical-set skills are present: one declares clauses, one declares none.
  writeSkill('tdd', '  - id: TDD-1\n    text: "Write the failing test before the implementation."\n    check: manual');
  writeSkill('to-spec', '');
  writeSkill('some-future-skill', '');

  const result = spawnSync('node', [path.join(HERE, '..', 'validate-traceability.mjs'), '--json'], { encoding: 'utf8', cwd: tree });
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.criticalSkills, 2, 'both critical-set skills in the tree must be counted, with or without clauses');
  assert.equal(payload.clauses, 1, 'only the skill that declares clauses contributes clause totals');
  assert.equal(payload.status, 'fail');
  assert.ok(payload.errors.some((message) => /to-spec: critical-set skill must declare at least 2 clauses/.test(message)),
    `expected to-spec to be flagged, got: ${JSON.stringify(payload.errors)}`);
  assert.ok(!payload.errors.some((message) => /TDD-1/.test(message) && /critical-min/.test(message)), 'tdd declares a clause and must not be flagged for the minimum');
});

/* --------------------------------- finding 4: the fragment must name the clause */

test('resolveCheck resolves when the fragment equals the clause id', async () => {
  const { resolveCheck } = await import('../validate-traceability.mjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'quirk-traceability-check-'));
  const cited = path.join(dir, 'tdd.json');
  fs.writeFileSync(cited, JSON.stringify({ assertions: [{ id: 'a1', check: { note: 'clause TDD-1' } }] }));

  const result = await resolveCheck('tdd', { id: 'TDD-1', check: `${cited}#TDD-1` });
  assert.equal(result.status, 'resolved');
});

test('resolveCheck errors when the fragment is another clause id', async () => {
  const { resolveCheck } = await import('../validate-traceability.mjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'quirk-traceability-check-'));
  const cited = path.join(dir, 'tdd.json');
  fs.writeFileSync(cited, JSON.stringify({ assertions: [{ id: 'a1', check: { note: 'clause TDD-1 and TDD-2 both mentioned' } }] }));

  const result = await resolveCheck('tdd', { id: 'TDD-1', check: `${cited}#TDD-2` });
  assert.equal(result.status, 'error');
  assert.equal(result.code, 'check-fragment-mismatch');
  assert.match(result.message, /clause TDD-1 cites .*#TDD-2/);
  assert.match(result.message, /repoint the citation at #TDD-1/);
});

test('resolveCheck still accepts a citation with no fragment', async () => {
  const { resolveCheck } = await import('../validate-traceability.mjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'quirk-traceability-check-'));
  const cited = path.join(dir, 'notes.md');
  fs.writeFileSync(cited, 'The manual rule mentions clause TDD-1 in prose.');

  const result = await resolveCheck('tdd', { id: 'TDD-1', check: cited });
  assert.equal(result.status, 'resolved');

  // manual never resolves against the filesystem at all
  assert.deepEqual(await resolveCheck('tdd', { id: 'TDD-1', check: 'manual' }), { status: 'manual' });
});

test('a fragment mismatch is reported end-to-end on a synthetic tree', () => {
  const tree = fs.mkdtempSync(path.join(os.tmpdir(), 'quirk-traceability-'));
  const skillsRoot = path.join(tree, '.agents', 'skills', 'delivery');
  fs.mkdirSync(path.join(skillsRoot, 'tdd'), { recursive: true });
  fs.mkdirSync(path.join(tree, 'evals', 'behavioral'), { recursive: true });
  // The fixture cites both ids, so only the fragment check can catch the wrong one.
  fs.writeFileSync(path.join(tree, 'evals', 'behavioral', 'tdd.json'), JSON.stringify({
    fixtures: [{ assertions: [{ id: 'a1', check: { note: 'clause TDD-1 and clause TDD-2' } }] }],
  }));
  fs.writeFileSync(path.join(skillsRoot, 'tdd', 'SKILL.md'), [
    '---',
    'name: tdd',
    'clauses:',
    '  - id: TDD-1',
    '    text: "Write the failing test before the implementation."',
    '    check: evals/behavioral/tdd.json#TDD-2',
    '  - id: TDD-2',
    '    text: "Refactor only after the test is green."',
    '    check: manual',
    '---',
    '',
    '# Body',
  ].join('\n'));

  const result = spawnSync('node', [path.join(HERE, '..', 'validate-traceability.mjs'), '--json'], { encoding: 'utf8', cwd: tree });
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.status, 'fail');
  assert.ok(payload.errors.some((message) => /check-fragment-mismatch/.test(message) || /clause TDD-1 cites .*#TDD-2/.test(message)),
    `expected the fragment mismatch error, got: ${JSON.stringify(payload.errors)}`);
});
