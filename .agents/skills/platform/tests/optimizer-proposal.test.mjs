import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DESCRIPTION_CAPACITY,
  TRAIN_RATIO,
  MIN_FIXTURES_FOR_HELD_OUT,
  MIN_HELD_OUT_FOR_CLAIM,
  splitFixtures,
  canHoldOut,
  hasEnoughFixtures,
  capacityReport,
  decideCandidate,
  evaluationRow,
  paretoFront,
  buildProposal
} from '../../skill-dev/skill-optimizer/scripts/proposal-policy.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OPTIMIZER_DIR = path.resolve(HERE, '..', '..', 'skill-dev', 'skill-optimizer');

function readSkillFile(...segments) {
  return fs.readFileSync(path.join(OPTIMIZER_DIR, ...segments), 'utf8');
}

// A ten-fixture routing set: five prompts that should fire skill-optimizer's target
// skill, five that should route elsewhere.
const FIXTURES = Array.from({ length: 10 }, (_, index) => `routing-${String(index).padStart(2, '0')}`);

function heldOutRows(scores) {
  const { heldOut } = splitFixtures(FIXTURES);
  return scores.map((score, index) => ({ fixture: heldOut[index], score }));
}

// --- Contract fidelity: the documented rules stay in the skill and its reference -----

test('skill-optimizer declares the propose-only, capped, triple-recorded contract', () => {
  const skill = readSkillFile('SKILL.md');
  const protocol = readSkillFile('references', 'gepa-protocol.md');

  assert.match(skill, /1024-character capacity cap/, 'capacity cap is declared in the skill');
  assert.match(skill, /60\/40/, 'the held-out split is declared in the skill');
  assert.match(skill, /Never write to the target skill/, 'propose-only boundary is stated as a hard rule');
  assert.match(skill, /\(skill, version, fixture\) triple/, 'provenance triple is declared');
  assert.match(skill, /references\/gepa-protocol\.md/, 'the skill points at the protocol reference');
  assert.equal(skill.includes('Operating Contract'), false, 'operating contract is externalized');

  assert.match(protocol, /arXiv:2507\.19457/, 'GEPA paper citation');
  assert.match(protocol, /github\.com\/gepa-ai\/gepa/, 'GEPA reference implementation citation');
  assert.match(protocol, /dspy\.ai/, 'DSPy GEPA documentation citation');
  assert.match(protocol, /propose-only/i, 'the bundle adaptation is recorded in the protocol');
});

test('the skill frontmatter carries the v2 contract fields the gate reads', () => {
  const frontmatter = readSkillFile('SKILL.md').split('---')[1];
  for (const field of [
    'name:', 'category:', 'version:', 'description:', 'license:',
    'sideEffects:', 'stopCondition:', 'risk:', 'trustTier:', 'maxIterations:',
    'promptVersion:', 'artifactType:', 'modelTier:', 'evaluators:', 'diataxis:',
    'tags:', 'compatibility:', 'approvalRequired:'
  ]) {
    assert.ok(frontmatter.includes(`\n${field}`), `frontmatter is missing ${field}`);
  }
  assert.match(frontmatter, /sideEffects: \[\]/, 'a propose-only skill declares no side effects');
  assert.match(frontmatter, /maturity: "experimental"/, 'new skill is experimental until promoted');
});

// --- The 60/40 split ----------------------------------------------------------------

test('splitFixtures assigns exactly 60% train and 40% held-out', () => {
  const { train, heldOut } = splitFixtures(FIXTURES);
  assert.equal(train.length, Math.round(FIXTURES.length * TRAIN_RATIO));
  assert.equal(heldOut.length, FIXTURES.length - train.length);
  assert.equal(train.length + heldOut.length, FIXTURES.length);
  assert.equal(train.length, 6);
  assert.equal(heldOut.length, 4);
});

test('splitFixtures is deterministic and independent of input order', () => {
  const first = splitFixtures(FIXTURES);
  const second = splitFixtures([...FIXTURES].reverse());
  assert.deepEqual(first, second);
  assert.deepEqual(splitFixtures(FIXTURES), first);
});

test('splitFixtures covers every fixture exactly once and accepts id objects', () => {
  const { train, heldOut } = splitFixtures(FIXTURES.map((id) => ({ fixture: id })));
  assert.deepEqual([...train, ...heldOut].sort(), [...FIXTURES].sort());
  assert.equal(new Set([...train, ...heldOut]).size, FIXTURES.length);
  assert.equal(train.filter((id) => heldOut.includes(id)).length, 0);
});

test('a fixture set too small to hold out evidence is reported, not estimated', () => {
  assert.equal(hasEnoughFixtures(['a', 'b', 'c', 'd']), false);
  assert.equal(hasEnoughFixtures(Array.from({ length: MIN_FIXTURES_FOR_HELD_OUT }, (_, i) => `f${i}`)), true);
  assert.equal(hasEnoughFixtures([]), false);
  assert.equal(canHoldOut(['a']), false, 'a single fixture leaves an empty held-out split');
  assert.equal(canHoldOut(['a', 'b', 'c', 'd', 'e']), true);
});

// --- The 1024-character capacity cap ------------------------------------------------

test('capacityReport enforces the 1024-character cap at the boundary', () => {
  assert.deepEqual(capacityReport('a'.repeat(DESCRIPTION_CAPACITY)), {
    characters: DESCRIPTION_CAPACITY,
    cap: DESCRIPTION_CAPACITY,
    withinCap: true
  });
  assert.equal(capacityReport('a'.repeat(DESCRIPTION_CAPACITY + 1)).withinCap, false);
  assert.equal(capacityReport('').withinCap, false);
});

// --- The acceptance rule ------------------------------------------------------------

test('a candidate that improves every held-out fixture without regression is accepted', () => {
  const { heldOut } = splitFixtures(FIXTURES);
  const decision = decideCandidate({
    candidateDescription: 'Use when routing is wrong for the target skill.',
    baselineRows: heldOutRows([1, 1, 1, 1]),
    candidateRows: heldOutRows([2, 1, 2, 2]),
    heldOutFixtureIds: heldOut
  });
  assert.equal(decision.decision, 'accept');
  assert.deepEqual(decision.reasons, []);
  assert.ok(decision.means.candidate > decision.means.baseline);
});

test('a held-out regression rejects a candidate even when its mean improves', () => {
  const { heldOut } = splitFixtures(FIXTURES);
  const decision = decideCandidate({
    candidateDescription: 'Trade one route for another.',
    baselineRows: heldOutRows([1, 1, 1, 1]),
    candidateRows: heldOutRows([0, 3, 3, 3]),
    heldOutFixtureIds: heldOut
  });
  assert.equal(decision.decision, 'reject');
  assert.ok(decision.reasons.some((reason) => reason.includes('regression')));
});

test('a tie keeps the baseline instead of churning the description', () => {
  const { heldOut } = splitFixtures(FIXTURES);
  const decision = decideCandidate({
    candidateDescription: 'Same routing, different words.',
    baselineRows: heldOutRows([1, 2, 1, 2]),
    candidateRows: heldOutRows([1, 2, 1, 2]),
    heldOutFixtureIds: heldOut
  });
  assert.equal(decision.decision, 'tie');
  assert.ok(decision.reasons.some((reason) => reason.includes('did not improve')));
});

test('a non-finite score is treated as missing evidence, not as a zero', () => {
  const { heldOut } = splitFixtures(FIXTURES);
  const decision = decideCandidate({
    candidateDescription: 'One fixture scored without a number.',
    baselineRows: heldOutRows([1, 1, 1, 1]),
    candidateRows: [...heldOutRows([2, 2, 2]), { fixture: heldOut[3], score: Number.NaN }],
    heldOutFixtureIds: heldOut
  });
  assert.equal(decision.decision, 'reject');
  assert.ok(decision.reasons.some((reason) => reason.includes('coverage')));
});

test('an over-capacity candidate is rejected rather than trimmed', () => {
  const { heldOut } = splitFixtures(FIXTURES);
  const decision = decideCandidate({
    candidateDescription: 'a'.repeat(DESCRIPTION_CAPACITY + 1),
    baselineRows: heldOutRows([1, 1, 1, 1]),
    candidateRows: heldOutRows([2, 2, 2, 2]),
    heldOutFixtureIds: heldOut
  });
  assert.equal(decision.decision, 'reject');
  assert.ok(decision.reasons.some((reason) => reason.includes('cap')));
});

test('an empty held-out split makes any improvement claim indefensible', () => {
  const decision = decideCandidate({
    candidateDescription: 'Train-only improvement.',
    baselineRows: [{ fixture: 'routing-00', score: 1 }],
    candidateRows: [{ fixture: 'routing-00', score: 2 }],
    heldOutFixtureIds: []
  });
  assert.equal(decision.decision, 'reject');
  assert.ok(decision.reasons.some((reason) => reason.includes('held-out')));
});

test('an uncovered held-out fixture blocks the decision', () => {
  const { heldOut } = splitFixtures(FIXTURES);
  const decision = decideCandidate({
    candidateDescription: 'Missing one held-out fixture.',
    baselineRows: heldOutRows([1, 1, 1, 1]),
    candidateRows: heldOutRows([2, 2, 2]),
    heldOutFixtureIds: heldOut
  });
  assert.equal(decision.decision, 'reject');
  assert.ok(decision.reasons.some((reason) => reason.includes('coverage')));
});

// --- (skill, version, fixture) provenance triples -----------------------------------

test('an evaluation row without its full triple is rejected', () => {
  assert.throws(() => evaluationRow({ skill: 'to-spec', version: '1', score: 1 }), /fixture/);
  assert.throws(() => evaluationRow({ skill: 'to-spec', fixture: 'f1', score: 1 }), /version/);
  assert.throws(() => evaluationRow({ version: '1', fixture: 'f1', score: 1 }), /skill/);
  assert.throws(() => evaluationRow({ skill: 'to-spec', version: '1', fixture: 'f1' }), /score/);
  assert.deepEqual(
    evaluationRow({ skill: 'to-spec', version: '1', fixture: 'f1', score: 0.5, feedback: 'fired on plan prompt' }),
    { skill: 'to-spec', version: '1', fixture: 'f1', score: 0.5, feedback: 'fired on plan prompt' }
  );
});

test('buildProposal keeps the split, the capacity, and every triple', () => {
  const { train, heldOut } = splitFixtures(FIXTURES);
  const rows = [...train, ...heldOut].map((fixture) =>
    evaluationRow({ skill: 'skill-optimizer', version: '1', fixture, score: 1, feedback: 'routed correctly' })
  );
  const proposal = buildProposal({
    skill: 'skill-optimizer',
    version: '1',
    currentDescription: 'Old description.',
    candidateDescription: 'New description.',
    split: { train, heldOut },
    evaluations: rows,
    decision: 'accept',
    reasons: []
  });

  assert.equal(proposal.skill, 'skill-optimizer');
  assert.equal(proposal.version, '1');
  assert.deepEqual(proposal.split.train, train);
  assert.deepEqual(proposal.split.heldOut, heldOut);
  assert.deepEqual(proposal.capacity, capacityReport('New description.'));
  assert.equal(proposal.decision, 'accept');
  assert.equal(proposal.evaluations.length, FIXTURES.length);
  for (const row of proposal.evaluations) {
    assert.equal(row.skill, 'skill-optimizer');
    assert.equal(row.version, '1');
    assert.ok(FIXTURES.includes(row.fixture));
  }
});

test('buildProposal rejects evaluations attributed to another skill or version', () => {
  const { train, heldOut } = splitFixtures(FIXTURES);
  assert.throws(
    () => buildProposal({
      skill: 'skill-optimizer',
      version: '2',
      currentDescription: 'a',
      candidateDescription: 'b',
      split: { train, heldOut },
      evaluations: [{ skill: 'skill-optimizer', version: '1', fixture: 'f1', score: 1 }],
      decision: 'accept',
      reasons: []
    }),
    /disagree with the proposal/
  );
});

// --- Pareto frontier selection -------------------------------------------------------

test('paretoFront keeps non-dominated candidates and drops dominated ones', () => {
  const front = paretoFront([
    { id: 'baseline', scores: { 'routing-00': 1, 'routing-01': 1 } },
    { id: 'balanced', scores: { 'routing-00': 1, 'routing-01': 2 } },
    { id: 'strictly-worse', scores: { 'routing-00': 0, 'routing-01': 0 } },
    { id: 'complementary', scores: { 'routing-00': 2, 'routing-01': 1 } }
  ]);
  assert.deepEqual(front.sort(), ['balanced', 'complementary']);
});

test('paretoFront over disjoint held-out winners keeps every winner', () => {
  const front = paretoFront([
    { id: 'a', scores: { 'routing-06': 2, 'routing-07': 1 } },
    { id: 'b', scores: { 'routing-06': 1, 'routing-07': 2 } }
  ]);
  assert.deepEqual(front.sort(), ['a', 'b']);
});

// --- End-to-end: evidence -> decision -> proposal ------------------------------------

test('the documented loop produces a replayable proposal from fixture evidence', () => {
  const heldOut = splitFixtures(FIXTURES).heldOut;
  const baselineRows = heldOutRows([1, 1, 1, 1]);
  const candidateRows = heldOutRows([0, 2, 2, 2]);
  const decision = decideCandidate({
    candidateDescription: 'Sharper trigger for the target skill.',
    baselineRows,
    candidateRows,
    heldOutFixtureIds: heldOut
  });
  assert.equal(decision.decision, 'reject');
  assert.ok(decision.reasons.some((reason) => reason.includes(heldOut[0])));

  const fixedRows = heldOutRows([2, 2, 2, 2]);
  const accepted = decideCandidate({
    candidateDescription: 'Sharper trigger for the target skill.',
    baselineRows,
    candidateRows: fixedRows,
    heldOutFixtureIds: heldOut
  });
  assert.equal(accepted.decision, 'accept');

  const proposal = buildProposal({
    skill: 'skill-optimizer',
    version: '1',
    currentDescription: 'Blurry trigger description.',
    candidateDescription: 'Sharper trigger for the target skill.',
    split: splitFixtures(FIXTURES),
    evaluations: [...baselineRows, ...fixedRows].map((row, index) =>
      evaluationRow({
        skill: 'skill-optimizer',
        version: '1',
        fixture: row.fixture,
        score: row.score,
        feedback: index < baselineRows.length ? 'baseline run' : 'candidate run'
      })
    ),
    decision: accepted.decision,
    reasons: accepted.reasons
  });
  assert.equal(proposal.decision, 'accept');
  assert.equal(proposal.capacity.withinCap, true);
  assert.equal(proposal.evaluations.length, heldOut.length * 2);
});
