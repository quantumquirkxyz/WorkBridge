# Build the multi-agent workflow, safety, and observability plane

**Owner:** quantumquirkxyz  
**Parent spec:** #3  
**Labels:** `ready-for-agent`  
**Metadata:** work_type=Ticket; repo_scope=application; phase=build; priority=high; risk=high; sprint=hackathon

## Acceptance Criteria
- [ ] Coordinate Exploration, Profile and Evidence, Market and Matching, and Training agents through Mastra.
- [ ] Use internal REST/SSE with JSON Schema and Ajv, required `trace_id`, and `idempotency_key`.
- [ ] Configure OpenRouter capability-based model chains, budgets, fallbacks, and preflight.
- [ ] Apply input, tool-result, permission, and output guardrails.
- [ ] Block prompt injection, PII leakage, invalid schemas, invented credentials, and unauthorized tools.
- [ ] Record Langfuse traces, append-only `audit_events`, DQL states, and dead-letter events.
- [ ] Pass the 10 guardrail fixtures and demonstrate model fallback.

## Validation
Run the complete workflow with fixtures, inject malicious instructions through a CV and scraped vacancy, force a model failure, and inspect the resulting trace and event lifecycle.

## Blocked By
- #4 — Candidate profile contract is required.
- #5 — Vacancy contract is required.
- #6 — Credential contract is required.
