import type { TrainingCatalog, TrainingOpportunity } from "./types";
import { assertTrainingCatalog } from "./validate";

/**
 * Load and validate the last valid cached snapshot. The Training Agent treats a
 * catalog that fails validation as unusable rather than partially trusting it.
 */
export function loadCatalog(snapshot: unknown): TrainingCatalog {
  assertTrainingCatalog(snapshot);
  return snapshot;
}

/** Index opportunities by id for lookups during roadmap assembly. */
export function catalogIndex(
  catalog: TrainingCatalog,
): ReadonlyMap<string, TrainingOpportunity> {
  const index = new Map<string, TrainingOpportunity>();
  for (const opportunity of catalog.opportunities) {
    index.set(opportunity.opportunityId, opportunity);
  }
  return index;
}

/** Defensive guard for the fixture contract: the MVP catalog holds 15–30 entries. */
export const CATALOG_MIN_SIZE = 15;
export const CATALOG_MAX_SIZE = 30;

export function catalogSizeWithinBounds(catalog: TrainingCatalog): boolean {
  return (
    catalog.opportunities.length >= CATALOG_MIN_SIZE &&
    catalog.opportunities.length <= CATALOG_MAX_SIZE
  );
}
