import type { AjvError } from "@puente/domain";

/** Ajv 2020-12 error shape, re-exported through `@puente/domain`. */
export type TrainingAjvError = AjvError;

function describe(
  contract: string,
  errors: readonly TrainingAjvError[] | null | undefined,
): string {
  return `Invalid ${contract}: ${(errors ?? [])
    .map((error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`)
    .join("; ")}`;
}

export class InvalidTrainingCatalogError extends Error {
  readonly errors: readonly TrainingAjvError[] | null | undefined;

  constructor(errors: readonly TrainingAjvError[] | null | undefined) {
    super(describe("TrainingCatalog", errors));
    this.name = "InvalidTrainingCatalogError";
    this.errors = errors;
  }
}

export class InvalidRoadmapError extends Error {
  readonly errors: readonly TrainingAjvError[] | null | undefined;

  constructor(errors: readonly TrainingAjvError[] | null | undefined) {
    super(describe("Roadmap", errors));
    this.name = "InvalidRoadmapError";
    this.errors = errors;
  }
}

/** The request is structurally unusable (missing candidate id, malformed gaps). */
export class TrainingInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrainingInputError";
  }
}
