// Deterministic policy for skill-optimizer proposals.
//
// The reflective loop in the skill is model-driven; everything that decides whether a
// candidate description may be proposed is computed here so that the decision is
// reproducible and testable. Pure functions only: no I/O, no clock, no randomness.
//
// See references/gepa-protocol.md for the research basis and the acceptance rule.

/** Hard cap on a proposed description, matching the portable-skill description limit. */
export const DESCRIPTION_CAPACITY = 1024;

/** Fraction of fixtures assigned to the train (reflection) split. */
export const TRAIN_RATIO = 0.6;

/** Fraction of fixtures assigned to the held-out (scoring) split. */
export const HELD_OUT_RATIO = 0.4;

/** Below this many fixtures the split cannot hold out evidence. */
export const MIN_FIXTURES_FOR_HELD_OUT = 5;

/** A defensible improvement claim needs at least this many held-out fixtures. */
export const MIN_HELD_OUT_FOR_CLAIM = 1;

function fixtureIdentifier(fixture) {
  if (typeof fixture === 'string') return fixture;
  if (!fixture || typeof fixture !== 'object') {
    throw new Error('fixture must be an id string or an object with a fixture/id field');
  }
  const id = fixture.fixture ?? fixture.id ?? fixture.name;
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('fixture must carry a non-empty fixture, id, or name field');
  }
  return id;
}

function roundRatio(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Deterministic 60/40 split of a fixture set.
 *
 * Fixture ids are sorted, then ranked: the first `round(0.6 * n)` ids form the train
 * (reflection) split and the remainder form the held-out (scoring) split. The split is a
 * pure function of the fixture set, so two runs over the same fixtures always produce the
 * same split, and the proposal records it so a score can be replayed against it.
 *
 * @param {Array<string|{fixture?:string,id?:string,name?:string}>} fixtures
 * @returns {{train: string[], heldOut: string[]}}
 */
export function splitFixtures(fixtures) {
  const ids = [...new Set((fixtures ?? []).map(fixtureIdentifier))].sort();
  const trainCount = Math.round(ids.length * TRAIN_RATIO);
  return {
    train: ids.slice(0, trainCount),
    heldOut: ids.slice(trainCount)
  };
}

/**
 * Whether a fixture set is large enough for the reflective loop to say anything
 * defensible. Below MIN_FIXTURES_FOR_HELD_OUT fixtures the skill reports that no
 * claim is possible rather than proposing on a sample this thin.
 *
 * @param {Array<string|{fixture?:string,id?:string,name?:string}>} fixtures
 * @returns {boolean}
 */
export function hasEnoughFixtures(fixtures) {
  const ids = fixtures ?? [];
  return ids.length >= MIN_FIXTURES_FOR_HELD_OUT;
}

/**
 * Whether a fixture set can hold out evidence at all. Below MIN_FIXTURES_FOR_HELD_OUT
 * fixtures the reflective loop has no defensible claim to make and must report that.
 *
 * @param {Array<string|{fixture?:string,id?:string,name?:string}>} fixtures
 * @returns {boolean}
 */
export function canHoldOut(fixtures) {
  return splitFixtures(fixtures).heldOut.length >= MIN_HELD_OUT_FOR_CLAIM;
}

/**
 * Capacity check for a proposed description.
 *
 * @param {string} description
 * @returns {{characters:number, cap:number, withinCap:boolean}}
 */
export function capacityReport(description) {
  const characters = typeof description === 'string' ? [...description].length : 0;
  return {
    characters,
    cap: DESCRIPTION_CAPACITY,
    withinCap: characters > 0 && characters <= DESCRIPTION_CAPACITY
  };
}

/**
 * Build one evaluation row. A row without the full (skill, version, fixture) triple is
 * rejected, because an unattributable score cannot be replayed.
 *
 * @param {{skill:string, version:string, fixture:string, description?:string, score:number, feedback?:string}} row
 */
export function evaluationRow(row) {
  const missing = ['skill', 'version', 'fixture'].filter((key) => {
    const value = row?.[key];
    return typeof value !== 'string' || value.length === 0;
  });
  if (missing.length > 0) {
    throw new Error(`evaluation row is missing ${missing.join(', ')} from its (skill, version, fixture) triple`);
  }
  if (typeof row.score !== 'number' || Number.isNaN(row.score)) {
    throw new Error('evaluation row is missing a numeric score');
  }
  return {
    skill: row.skill,
    version: row.version,
    fixture: row.fixture,
    score: row.score,
    feedback: row.feedback ?? '',
    ...(typeof row.description === 'string' ? { description: row.description } : {})
  };
}

function toHeldOutMap(rows, heldOutFixtureIds) {
  const wanted = new Set(heldOutFixtureIds);
  const map = new Map();
  for (const row of rows ?? []) {
    if (!wanted.has(row.fixture) || map.has(row.fixture)) continue;
    // A row without a finite score is not evidence: the fixture stays uncovered so the
    // decision is blocked instead of being computed from a NaN mean.
    if (typeof row.score !== 'number' || !Number.isFinite(row.score)) continue;
    map.set(row.fixture, row.score);
  }
  return map;
}

function meanOf(values) {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/**
 * Decide whether a candidate description may be proposed (gepa-protocol.md).
 *
 * @param {object} input
 * @param {string} input.candidateDescription
 * @param {Array<{fixture:string,score:number}>} input.baselineRows baseline scores
 * @param {Array<{fixture:string,score:number}>} input.candidateRows candidate scores
 * @param {string[]} input.heldOutFixtureIds held-out split ids
 * @returns {{decision:'accept'|'reject'|'tie', reasons:string[], means:{baseline:number,candidate:number}}}
 */
export function decideCandidate({ candidateDescription, baselineRows, candidateRows, heldOutFixtureIds }) {
  const reasons = [];
  const capacity = capacityReport(candidateDescription);
  if (!capacity.withinCap) reasons.push(`capacity: ${capacity.characters} characters exceeds the ${DESCRIPTION_CAPACITY} cap`);

  const heldOut = heldOutFixtureIds ?? [];
  if (heldOut.length < MIN_HELD_OUT_FOR_CLAIM) {
    reasons.push('held-out split is empty: no defensible improvement claim is possible');
    return { decision: 'reject', reasons, means: { baseline: 0, candidate: 0 } };
  }

  const baseline = toHeldOutMap(baselineRows, heldOut);
  const candidate = toHeldOutMap(candidateRows, heldOut);
  const uncovered = heldOut.filter((fixture) => !baseline.has(fixture) || !candidate.has(fixture));
  if (uncovered.length > 0) {
    reasons.push(`held-out coverage incomplete for ${uncovered.join(', ')}`);
  }

  const shared = heldOut.filter((fixture) => baseline.has(fixture) && candidate.has(fixture));
  const baselineValues = shared.map((fixture) => baseline.get(fixture));
  const candidateValues = shared.map((fixture) => candidate.get(fixture));
  const baselineMean = roundRatio(meanOf(baselineValues));
  const candidateMean = roundRatio(meanOf(candidateValues));
  const means = { baseline: baselineMean, candidate: candidateMean };

  const regressions = shared.filter((fixture) => candidate.get(fixture) < baseline.get(fixture));
  for (const fixture of regressions) {
    reasons.push(`held-out regression on ${fixture}: ${candidate.get(fixture)} < ${baseline.get(fixture)}`);
  }

  if (reasons.length > 0) return { decision: 'reject', reasons, means };
  if (candidateMean <= baselineMean) {
    reasons.push(`held-out mean did not improve: ${candidateMean} <= ${baselineMean}, so the baseline stands`);
    return { decision: 'tie', reasons, means };
  }
  return { decision: 'accept', reasons, means };
}

/**
 * Non-dominated candidates over per-fixture held-out scores (GEPA Pareto frontier).
 * A candidate is dominated when another candidate scores at least as well on every
 * held-out fixture and strictly better on at least one.
 *
 * @param {Array<{id:string, scores:Record<string,number>}>} candidates
 * @returns {string[]} ids of the non-dominated candidates
 */
export function paretoFront(candidates) {
  const list = candidates ?? [];
  return list
    .filter((candidate) =>
      !list.some((other) => {
        if (other === candidate) return false;
        const fixtures = new Set([...Object.keys(other.scores ?? {}), ...Object.keys(candidate.scores ?? {})]);
        let atLeastAsGood = true;
        let strictlyBetter = false;
        for (const fixture of fixtures) {
          const otherScore = other.scores?.[fixture];
          const candidateScore = candidate.scores?.[fixture];
          if (otherScore === undefined || candidateScore === undefined) return false;
          if (otherScore < candidateScore) atLeastAsGood = false;
          if (otherScore > candidateScore) strictlyBetter = true;
        }
        return atLeastAsGood && strictlyBetter;
      })
    )
    .map((candidate) => candidate.id);
}

/**
 * Assemble the proposal envelope. Every evaluation row must carry the full
 * (skill, version, fixture) triple and agree with the proposal's own skill and version.
 *
 * @param {object} input
 * @returns {object} SkillOptimizerProposal
 */
export function buildProposal({
  skill,
  version,
  currentDescription,
  candidateDescription,
  split,
  evaluations,
  decision,
  reasons
}) {
  const rows = (evaluations ?? []).map(evaluationRow);
  const misattributed = rows.filter((row) => row.skill !== skill || row.version !== version);
  if (misattributed.length > 0) {
    throw new Error('evaluation rows disagree with the proposal skill/version: ' +
      misattributed.map((row) => `${row.skill}@${row.version}#${row.fixture}`).join(', '));
  }
  return {
    skill,
    version,
    currentDescription,
    candidateDescription,
    capacity: capacityReport(candidateDescription),
    split: {
      train: [...(split?.train ?? [])].sort(),
      heldOut: [...(split?.heldOut ?? [])].sort()
    },
    evaluations: rows,
    decision,
    reasons: reasons ?? []
  };
}
