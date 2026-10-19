/** Closed set. A new failure needs a named code, not an open string. */
export const APPLICATION_ERROR_CODES = [
  "already_submitted",
  "candidate_approval_required",
  "counselor_approval_required",
  "draft_closed",
  "draft_rejected",
  "employer_approval_required",
  "expired_session",
  "forbidden",
  "guardrail_blocked",
  "idempotency_conflict",
  "inconsistent_match",
  "internal_error",
  "invalid_envelope",
  "invalid_input",
  "invalid_json",
  "invalid_match",
  "invalid_session",
  "invented_evidence",
  "interview_decided",
  "not_found",
  "payload_too_large",
  "secret_rejected",
  "shortlist_unavailable",
  "trace_mismatch",
  "unknown_evidence",
  "ownership_unavailable",
  "decision_unavailable",
  "unknown_role",
  "internal_error",
] as const;

export type ApplicationErrorCode = (typeof APPLICATION_ERROR_CODES)[number];

export type ApplicationErrorStatus = 400 | 401 | 403 | 404 | 409 | 413 | 422 | 500 | 503;

export class ApplicationError extends Error {
  readonly status: ApplicationErrorStatus;
  readonly code: ApplicationErrorCode;

  constructor(message: string, status: ApplicationErrorStatus, code: ApplicationErrorCode) {
    super(message);
    this.name = "ApplicationError";
    this.status = status;
    this.code = code;
  }
}
