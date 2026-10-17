import type { ReviewItem, VacancyStatus } from "@workbridge/domain";

/**
 * Derive the vacancy status from its blockers and pending reviews. A blocked
 * vacancy takes precedence: it cannot be ranked until the blocker is resolved.
 */
export function resolveStatus(
  blockingReasons: readonly string[],
  reviewQueue: readonly ReviewItem[],
): VacancyStatus {
  if (blockingReasons.length > 0) return "blocked";
  if (reviewQueue.length > 0) return "requires_human_review";
  return "accepted";
}
