import type { AjvError } from "@workbridge/domain";

export class VacancyInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VacancyInputError";
  }
}

export class ExtractionUnavailableError extends Error {
  readonly inputKind: string;

  constructor(inputKind: string, cause?: unknown) {
    super(
      `No extraction adapter is available for "${inputKind}" input. Provide one through NormalizeVacancyOptions.extraction or install the default adapter dependency.`,
    );
    this.name = "ExtractionUnavailableError";
    this.inputKind = inputKind;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

export class ReviewNotFoundError extends Error {
  constructor(reviewId: string) {
    super(`No pending review found for id "${reviewId}".`);
    this.name = "ReviewNotFoundError";
  }
}

export class InvalidJobRequirementsError extends Error {
  readonly errors: AjvError[] | null | undefined;

  constructor(errors: AjvError[] | null | undefined) {
    super(
      `Normalized vacancy failed JobRequirements validation: ${(errors ?? [])
        .map((error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`)
        .join("; ")}`,
    );
    this.name = "InvalidJobRequirementsError";
    this.errors = errors;
  }
}
