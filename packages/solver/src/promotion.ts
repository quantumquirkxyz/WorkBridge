import { buildTieBreakKey } from "./ties";
import type { Aptitude, MatchDecision, PromotionRecord } from "./types";
import {
  PROMOTION_BAND,
  PROMOTION_POINTS,
  classifyAptitude,
} from "./weights";

export interface PromotionInput {
  baseScore: number;
  hasFailedConstraints: boolean;
  /**
   * Scores of the other candidates that are eligible for the same vacancy.
   * `undefined` means no peer evidence was supplied; promotion stays
   * ineligible until it is.
   */
  peerScores?: readonly number[];
  approved: boolean;
}

export interface PromotionOutcome {
  score: number;
  aptitude: Aptitude;
  promotion: PromotionRecord;
}

function unchanged(baseScore: number, record: PromotionRecord): PromotionOutcome {
  return { score: baseScore, aptitude: classifyAptitude(baseScore), promotion: record };
}

/**
 * Apply the one-point promotion rule. A promotion is possible only when the
 * score sits one point below a threshold, no hard constraint is violated, no
 * better eligible candidate exists for the vacancy, and a human has approved.
 */
export function resolvePromotion({
  baseScore,
  hasFailedConstraints,
  peerScores,
  approved,
}: PromotionInput): PromotionOutcome {
  if (!PROMOTION_BAND.includes(baseScore)) {
    return unchanged(baseScore, {
      eligible: false,
      applied: false,
      requiresHumanApproval: false,
      reason: "The score is not one point below an aptitude threshold.",
    });
  }

  if (hasFailedConstraints) {
    return unchanged(baseScore, {
      eligible: false,
      applied: false,
      requiresHumanApproval: false,
      reason: "A hard constraint is violated, so promotion is not allowed.",
    });
  }

  if (peerScores === undefined) {
    return unchanged(baseScore, {
      eligible: false,
      applied: false,
      requiresHumanApproval: false,
      reason:
        "Promotion requires evidence that no better eligible candidate exists for this vacancy.",
    });
  }

  const noBetterCandidate = peerScores.every((score) => score <= baseScore);
  if (!noBetterCandidate) {
    return unchanged(baseScore, {
      eligible: false,
      applied: false,
      requiresHumanApproval: false,
      reason: "A better eligible candidate exists for this vacancy.",
    });
  }

  if (!approved) {
    return unchanged(baseScore, {
      eligible: true,
      applied: false,
      requiresHumanApproval: true,
      reason:
        "Eligible for a one-point promotion; awaiting explicit human approval.",
    });
  }

  const score = baseScore + PROMOTION_POINTS;
  return {
    score,
    aptitude: classifyAptitude(score),
    promotion: {
      eligible: true,
      applied: true,
      requiresHumanApproval: false,
      reason: `One-point promotion approved: ${baseScore} → ${score}.`,
    },
  };
}

export interface ApplyPromotionInput {
  peerScores?: readonly number[];
  approved: boolean;
}

/**
 * Finalize a base decision with the promotion rule. Idempotent: re-applying
 * replaces the previous promotion reason rather than appending a duplicate.
 */
export function applyPromotion(
  decision: MatchDecision,
  { peerScores, approved }: ApplyPromotionInput,
): MatchDecision {
  const outcome = resolvePromotion({
    baseScore: decision.baseScore,
    hasFailedConstraints: decision.failedConstraints.length > 0,
    peerScores,
    approved,
  });

  const aptitude =
    decision.failedConstraints.length > 0 ? "not_currently_apt" : outcome.aptitude;

  const baseReasons = decision.reasons.filter(
    (reason) => reason !== decision.promotion.reason,
  );
  const reasons =
    outcome.promotion.eligible || outcome.promotion.applied
      ? [...baseReasons, outcome.promotion.reason]
      : baseReasons;

  return {
    ...decision,
    aptitude,
    score: outcome.score,
    reasons,
    tieBreakKey: buildTieBreakKey({
      score: outcome.score,
      failedCount: decision.failedConstraints.length,
      vacancyId: decision.vacancyId,
      candidateId: decision.candidateId,
    }),
    promotion: outcome.promotion,
  };
}
