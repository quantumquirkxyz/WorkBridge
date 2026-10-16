# Puente Laboral Panamá — Agent Runtime, Verification, and Safety

**Owner:** quantumquirkxyz  
**Work type:** Epic slice  
**Scope:** Mastra workflow graph, model routing, credential verification adapters, approvals, observability, security, and deployment.

## Goals

- Coordinate four specialized agents through a stateful Mastra workflow graph.
- Verify credentials through Certo first, then Accredible and Credly fallbacks.
- Require role-based human approval before sensitive actions.
- Provide complete traces, event states, retries, and dead-letter handling.
- Protect PII, prompt boundaries, tools, credentials, and external actions.
- Run locally with Docker Alpine and provide Vercel/Neon backup deployment.

## Non-Goals

- Copying Certo into the application monorepo.
- Treating a mock verification as external verification.
- Allowing agents to submit applications without approval.
- Exposing private chain-of-thought.
- Building Kafka, WebSockets, gRPC, email, WhatsApp, or SMS for the MVP.

## Acceptance Criteria

- [ ] The workflow graph coordinates Exploration, Profile and Evidence, Market and Matching, and Training agents.
- [ ] Agent-to-agent requests and responses use JSON Schema 2020-12 validated by Ajv.
- [ ] OpenRouter uses per-agent capability registries, ordered fallbacks, token budgets, and preflight checks.
- [ ] Certo is accessed through a separate HTTPS deployment using `CERTO_BASE_URL` and `CERTO_API_TOKEN`; the token never reaches the browser.
- [ ] Certo, Accredible, and Credly adapters emit the same normalized verification contract.
- [ ] A mandatory credential counts only when credential validity and holder binding are both verified.
- [ ] Missing Certo access uses deterministic fixtures and marks `externally_verified: false`.
- [ ] Candidate approval is required before submitting the candidate's application; counselor review is required for critical gaps, unverified credentials, bias alerts, or infeasible transport; employer approval is required before interview progression.
- [ ] Critical tools enforce role, agent, schema, risk, trace, idempotency, and approval permissions.
- [ ] Input, tool-result, and output guardrails block injection, unsafe content, PII leaks, invalid schemas, invented credentials, and unauthorized actions.
- [ ] Langfuse and append-only `audit_events` record agent, tool, evidence, constraints, model fallback, actor, role, timestamp, and `trace_id`.
- [ ] The DQL event store supports `pending`, `success`, `failed`, `rejected`, `retrying`, and `dead_letter` states.
- [ ] The primary deployment runs with Docker Compose and Alpine images; the backup runs with Vercel and Neon.
- [ ] The 15 credential ground-truth cases and 10 guardrail cases are executable through Vitest/Playwright fixtures.

## Risks and Open Questions

- Certo deployment/API availability may differ — preflight it before the event and retain the mock adapter.
- Certo is AGPL-3.0 — preserve attribution and review obligations before deployment or modification.
- Model availability may change — disable failed models during preflight and promote compatible fallbacks.

## Decisions

- **Seam:** internal REST + SSE between `apps/web` and `apps/agent-runtime`, with `trace_id` and `idempotency_key` required.
- **Runtime:** TypeScript, Mastra, Next.js, Better Auth, PostgreSQL/Prisma, OpenRouter, Langfuse, Ajv.
- **Verification:** Certo primary; Accredible then Credly; deterministic mock when unavailable.
- **Testing:** Vitest, Playwright, JSON Schema contract tests, eval fixtures, and model preflight.

## Validation Notes

- SC-01–SC-14 applied to this slice; criteria are bounded to execution-plane, safety, and observability behavior.
- Certo's exact deployed API contract remains a pre-event validation, not a design blocker because the mock boundary is explicit.
