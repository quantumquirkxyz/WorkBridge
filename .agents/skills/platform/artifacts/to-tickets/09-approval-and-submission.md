# Build role-based approval and safe application submission

**Owner:** quantumquirkxyz  
**Parent spec:** #3  
**Labels:** `ready-for-agent`  
**Metadata:** work_type=Ticket; repo_scope=application; phase=build; priority=high; risk=critical; sprint=hackathon

## Acceptance Criteria
- [ ] Implement Better Auth roles: candidate, employer, and counselor.
- [ ] Generate an adapted CV, cover letter, and application draft without inventing evidence.
- [ ] Require candidate approval before submitting their application.
- [ ] Require counselor approval for critical gaps, unverified credentials, bias alerts, or infeasible transport.
- [ ] Require employer approval before interview progression.
- [ ] Block unauthorized submission and protect the Certo token and provider keys.
- [ ] Use idempotency for the submission action.
- [ ] Record actor, role, timestamp, reason, and `trace_id` for every approval, correction, rejection, and submission.
- [ ] Demonstrate local Docker Alpine execution and Vercel/Neon backup configuration.

## Validation
Use Playwright to exercise draft, correction, approval, rejection, retry, and successful submission paths for all three roles.

## Blocked By
- #8 — Requires match and aptitude output.
- #9 — Requires workflow, guardrails, and traceability.
