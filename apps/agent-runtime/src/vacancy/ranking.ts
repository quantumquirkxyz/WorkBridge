import {
  validateJobRequirements,
  type JobRequirements,
  type Requirement,
  type ReviewItem,
} from "@puente/domain";
import { InvalidJobRequirementsError, ReviewNotFoundError } from "./errors";
import { resolveStatus } from "./status";
import type { ReviewDecision } from "./types";

/**
 * Requirements cleared for the deterministic ranking solver. Flagged
 * requirements stay out until a human resolves their alert.
 */
export function getRankableRequirements(document: JobRequirements): Requirement[] {
  return document.requirements.filter((requirement) => requirement.rankingEligible);
}

export function getExcludedRequirements(document: JobRequirements): Requirement[] {
  return document.requirements.filter((requirement) => requirement.excludedFromRanking);
}

export function getPendingReviews(document: JobRequirements): ReviewItem[] {
  return document.reviewQueue;
}

/** A blocked vacancy cannot be ranked at all until the blocker is resolved. */
export function isVacancyRankable(document: JobRequirements): boolean {
  return document.status !== "blocked";
}

function revalidate(document: JobRequirements): JobRequirements {
  if (!validateJobRequirements(document)) {
    throw new InvalidJobRequirementsError(validateJobRequirements.errors);
  }
  return document;
}

/**
 * Resolve a pending review. An `approved` decision reinstates the requirement
 * for ranking; a `rejected` decision keeps it excluded. The alert is marked
 * resolved and the audit record (reviewer, decision, timestamp) is stored on
 * the alert.
 */
export function resolveReview(
  document: JobRequirements,
  decision: ReviewDecision,
): JobRequirements {
  const review = document.reviewQueue.find((item) => item.reviewId === decision.reviewId);
  if (!review) throw new ReviewNotFoundError(decision.reviewId);

  const resolvedAt = decision.resolvedAt ?? new Date().toISOString();
  const approved = decision.decision === "approved";

  const requirements = document.requirements.map((requirement) => {
    if (requirement.id !== review.requirementId) return requirement;
    if (!approved) return requirement;
    return {
      ...requirement,
      rankingEligible: true,
      excludedFromRanking: false,
    };
  });

  const alerts = document.alerts.map((alert) =>
    alert.id === review.alertId
      ? {
          ...alert,
          resolved: true,
          resolution: {
            decision: decision.decision,
            reviewer: decision.reviewer,
            resolvedAt,
          },
        }
      : alert,
  );

  const reviewQueue = document.reviewQueue.filter(
    (item) => item.reviewId !== decision.reviewId,
  );

  return revalidate({
    ...document,
    requirements,
    alerts,
    reviewQueue,
    status: resolveStatus(document.blockingReasons, reviewQueue),
  });
}
