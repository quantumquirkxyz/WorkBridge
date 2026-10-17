import type { OpportunityFreshness } from "./types";

/** A catalog entry refreshed less than 24 h ago is fresh. */
export const FRESH_HOURS = 24;
/** Between 24 h and 72 h it is stale but still usable; older data is expired. */
export const STALE_HOURS = 72;

const MS_PER_HOUR = 3_600_000;

/** Deterministic freshness of a single catalog entry relative to `now`. */
export function opportunityFreshness(retrievedAt: string, now: Date): OpportunityFreshness {
  const retrieved = Date.parse(retrievedAt);
  if (Number.isNaN(retrieved)) return "expired";
  const ageHours = (now.getTime() - retrieved) / MS_PER_HOUR;
  if (ageHours < FRESH_HOURS) return "fresh";
  if (ageHours <= STALE_HOURS) return "stale";
  return "expired";
}

/** Spanish freshness phrase used in the recommendation explanations. */
export function freshnessLabelEs(freshness: OpportunityFreshness): string {
  switch (freshness) {
    case "fresh":
      return "datos actualizados hace menos de 24 h";
    case "stale":
      return "datos actualizados hace 24–72 h";
    case "expired":
      return "datos vencidos hace más de 72 h";
  }
}
