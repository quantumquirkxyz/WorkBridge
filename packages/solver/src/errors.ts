import type { AjvError } from "@puente/domain";

export class SolverInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SolverInputError";
  }
}

export class RoutingUnavailableError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "RoutingUnavailableError";
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

export class InvalidMatchDecisionError extends Error {
  readonly errors: AjvError[] | null | undefined;

  constructor(errors: AjvError[] | null | undefined) {
    super(
      `MatchDecision failed validation: ${(errors ?? [])
        .map((error) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`)
        .join("; ")}`,
    );
    this.name = "InvalidMatchDecisionError";
    this.errors = errors;
  }
}
