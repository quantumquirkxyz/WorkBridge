import { ajv } from "@workbridge/domain";
import type { Roadmap, TrainingCatalog } from "./types";
import catalogSchema from "./schemas/training-catalog.schema.json";
import roadmapSchema from "./schemas/roadmap.schema.json";
import { InvalidRoadmapError, InvalidTrainingCatalogError } from "./errors";

export const TRAINING_CATALOG_SCHEMA_ID = catalogSchema.$id;
export const ROADMAP_SCHEMA_ID = roadmapSchema.$id;

/**
 * Compiled against the shared Ajv 2020-12 instance from `@workbridge/domain`.
 *
 * The catalog schema is compiled first so its `$id` is registered; the roadmap
 * schema then resolves its opportunity `$ref` through that registration. Ajv
 * `compile` registers the schema by `$id` (`addUsedSchema` is on by default), so
 * no separate `addSchema` call is needed.
 */
export const validateTrainingCatalog = ajv.compile<TrainingCatalog>(catalogSchema);

export const validateRoadmap = ajv.compile<Roadmap>(roadmapSchema);

export function assertTrainingCatalog(value: unknown): asserts value is TrainingCatalog {
  if (!validateTrainingCatalog(value)) {
    throw new InvalidTrainingCatalogError(validateTrainingCatalog.errors);
  }
}

export function assertRoadmap(value: unknown): asserts value is Roadmap {
  if (!validateRoadmap(value)) {
    throw new InvalidRoadmapError(validateRoadmap.errors);
  }
}
