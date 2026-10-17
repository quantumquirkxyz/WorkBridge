import type { TrainingCatalog } from "./types";
import { assertTrainingCatalog } from "./validate";

/**
 * Load and validate the last valid cached snapshot. The Training Agent treats a
 * catalog that fails validation as unusable rather than partially trusting it.
 *
 * The 15–30 entry bound is part of the schema contract, so a snapshot outside
 * that range fails validation here too.
 */
export function loadCatalog(snapshot: unknown): TrainingCatalog {
  assertTrainingCatalog(snapshot);
  return snapshot;
}
