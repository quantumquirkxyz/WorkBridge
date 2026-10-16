import { evaluateHardConstraints, failedConstraintIds } from "./constraints";
import { InvalidMatchDecisionError } from "./errors";
import { applyPromotion } from "./promotion";
import { createRoutingPort } from "./routing";
import {
  availabilityScore,
  experienceScore,
  salaryScore,
  technicalScore,
  transportScore,
  type DimensionScore,
} from "./scoring";
import { buildTieBreakKey } from "./ties";
import type {
  MatchDecision,
  MatchOptions,
  RouteEstimate,
  ScoreBreakdownItem,
  ScoreDimension,
  SolverCandidate,
  SolverVacancy,
  TransportMode,
} from "./types";
import { validateMatchDecision } from "./validate";
import { MATCH_WEIGHTS, classifyAptitude, weightedScore } from "./weights";

/** Shared offline-first routing port; Google Maps is injected when configured. */
const defaultRoutingPort = createRoutingPort();

function preferredMode(candidate: SolverCandidate): TransportMode {
  const preferred = candidate.transport.modes?.[0];
  if (preferred) return preferred;
  return candidate.transport.hasVehicle ? "driving" : "transit";
}

function routingReasons(routing: RouteEstimate): string[] {
  const reasons = [
    `Route estimated with ${routing.source} (${Math.round(routing.commuteMinutes)} min, ${routing.distanceKm} km).`,
  ];
  if (routing.fallbackReason) {
    reasons.push(
      `Google Maps was unavailable; fell back to the local matrix (${routing.fallbackReason}).`,
    );
  }
  return reasons;
}

/**
 * Compute the deterministic base decision: weighted score breakdown, hard
 * constraints, routing estimate, and reasons. Promotion is finalized separately
 * by `applyPromotion` once peer evidence and human approval are known.
 */
export async function buildBaseDecision(
  candidate: SolverCandidate,
  vacancy: SolverVacancy,
  options: MatchOptions = {},
): Promise<MatchDecision> {
  const now = options.now ?? (() => new Date());
  const routingPort = options.routing ?? defaultRoutingPort;

  const requiresAccessible =
    (candidate.transport.accessibilityNeeds?.length ?? 0) > 0 ||
    (vacancy.accessibilityRequirements?.length ?? 0) > 0;
  const routing = await routingPort.route({
    origin: candidate.home,
    destination: vacancy.location,
    mode: preferredMode(candidate),
    requiresAccessible,
  });

  const dimensionScores: Record<ScoreDimension, DimensionScore> = {
    technical: technicalScore(candidate, vacancy),
    experience: experienceScore(candidate),
    availability: availabilityScore(candidate, vacancy),
    transport: transportScore(
      routing.commuteMinutes,
      candidate.transport.maxCommuteMinutes,
      routing.accessible,
    ),
    salary: salaryScore(candidate, vacancy),
  };

  const dimensions = Object.keys(MATCH_WEIGHTS) as ScoreDimension[];
  const scoreBreakdown: ScoreBreakdownItem[] = dimensions.map((dimension) => ({
    dimension,
    weight: MATCH_WEIGHTS[dimension],
    rawScore: dimensionScores[dimension].rawScore,
    weightedScore: Number(
      (MATCH_WEIGHTS[dimension] * dimensionScores[dimension].rawScore).toFixed(2),
    ),
    reasons: dimensionScores[dimension].reasons,
  }));

  const rawScores = dimensions.reduce(
    (accumulator, dimension) => {
      accumulator[dimension] = dimensionScores[dimension].rawScore;
      return accumulator;
    },
    {} as Record<ScoreDimension, number>,
  );
  const baseScore = weightedScore(rawScores);

  const hardConstraints = evaluateHardConstraints({ candidate, vacancy, routing });
  const failedConstraints = failedConstraintIds(hardConstraints);

  const reasons: string[] = [];
  for (const item of scoreBreakdown) reasons.push(...item.reasons);
  for (const constraint of hardConstraints) {
    if (!constraint.satisfied) reasons.push(constraint.reason);
  }
  reasons.push(...routingReasons(routing));

  const decision: MatchDecision = {
    schemaVersion: "1.0.0",
    candidateId: candidate.candidateId,
    vacancyId: vacancy.vacancyId,
    aptitude:
      failedConstraints.length > 0 ? "not_currently_apt" : classifyAptitude(baseScore),
    score: baseScore,
    baseScore,
    scoreBreakdown,
    hardConstraints,
    failedConstraints,
    reasons,
    tieBreakKey: buildTieBreakKey({
      score: baseScore,
      failedCount: failedConstraints.length,
      vacancyId: vacancy.vacancyId,
      candidateId: candidate.candidateId,
    }),
    promotion: {
      eligible: false,
      applied: false,
      requiresHumanApproval: false,
      reason: "Promotion not evaluated.",
    },
    routing,
    decidedAt: now().toISOString(),
  };

  if (!validateMatchDecision(decision)) {
    throw new InvalidMatchDecisionError(validateMatchDecision.errors);
  }
  return decision;
}

/**
 * Evaluate one candidate/vacancy pair deterministically.
 *
 * A failed hard constraint overrides the weighted score and resolves the
 * decision to `not_currently_apt`. The one-point promotion rule only applies
 * when peer evidence is supplied and a human approves.
 */
export async function evaluateMatch(
  candidate: SolverCandidate,
  vacancy: SolverVacancy,
  options: MatchOptions = {},
): Promise<MatchDecision> {
  const base = await buildBaseDecision(candidate, vacancy, options);

  const eligiblePeerScores = options.peers
    ?.filter((peer) => peer.failedConstraints.length === 0)
    .map((peer) => peer.score);

  const approval = options.approval;
  const approved =
    approval?.approved === true &&
    approval.candidateId === candidate.candidateId &&
    approval.vacancyId === vacancy.vacancyId;

  const decision = applyPromotion(base, {
    peerScores: options.peers === undefined ? undefined : eligiblePeerScores,
    approved,
  });

  if (!validateMatchDecision(decision)) {
    throw new InvalidMatchDecisionError(validateMatchDecision.errors);
  }
  return decision;
}
