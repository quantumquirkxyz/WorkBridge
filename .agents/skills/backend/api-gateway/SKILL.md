---
name: "api-gateway"
category: "backend"
maturity: "stable"
version: "1"
description: "API gateway (Kong, Envoy, AWS API Gateway, rate limiting, auth, routing)."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "API gateway design complete; artifact saved; completion criteria checked."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "plan"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/api-gateway.json"
diataxis: "how-to"
tags: ["backend"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: backend service inventory, traffic profile, auth requirements, and SLA targets.
- Output: gateway architecture with route rules, policies, auth configuration, and observability plan.
- Scope: stay within the skill's declared boundaries; do not broaden without explicit direction.
- Rule: documented standards override defaults; explicit project rules take precedence.
- Rule: if blocked by missing context or dependencies, surface the blocker before proceeding.

## Provenance

| Question | Answer |
|---|---|
| What is the source of truth? | The user's request, originating spec/issue, and the skill's declared outputs |
| What is in scope? | Work covered by the skill's acceptance criteria and completion rules |
| What is explicitly out of scope? | Files, behaviors, and decisions outside the skill's declared boundary |
| Who or what consumes this artifact afterward? | The next skill in the workflow or the user |
| What evidence proves it is done? | Completion criteria met, artifact saved, validation passed |
| What risk remains? | Subjective judgment calls, missing context, or external dependency failures


## Artifact

Emit `ApiGatewayArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/api-gateway/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# API Gateway

Use this skill when designing or reviewing an API gateway layer — Kong, Envoy, AWS API Gateway, or similar — for routing, rate limiting, authentication, and observability.


## Process

### 1. Catalog backend services
- Inventory all internal services, their paths, versions, and owners.
- Define service contract: expected request/response shapes and auth requirements.
- Map dependencies between services and external APIs.

**Completion criterion:** service catalog documented with routes, versions, and owners.

### 2. Design routing rules
- Define path-based, host-based, and header-based routing rules.
- Plan versioning strategy (path prefix, header, or query parameter).
- Configure retries, timeouts, circuit breaking, and fallback routes.

**Completion criterion:** routing rules documented with precedence and fallback behavior.

### 3. Configure rate limiting and quotas
- Set per-client, per-route, or per-user rate limits based on SLA.
- Define burst allowance, quota periods, and limit-by headers.
- Plan graceful degradation when limits are exceeded (429 with Retry-After).

**Completion criterion:** rate limit matrix documented with enforcement strategy.

### 4. Implement authentication and authorization
- Choose auth mechanism per route: API key, JWT, OAuth2, mTLS, or custom.
- Configure upstream credential injection or header transformation.
- Define auth failure behavior (401, 403, redirect) and token validation rules.

**Completion criterion:** auth strategy per route documented with token handling.

### 5. Configure request transformation
- Plan request/response body and header transformation rules.
- Define caching policies for idempotent GET requests.
- Set up CORS, request/response logging, and payload size limits.

**Completion criterion:** transformation and caching rules documented.

### 6. Plan observability and operations
- Design gateway metrics: request rate, error rate, latency, upstream health.
- Configure distributed tracing propagation and log enrichment.
- Document rollout, rollback, and canary routing for gateway config changes.

**Completion criterion:** observability and operational runbook documented.

## Rules

- Rule: enforce TLS termination and HSTS at the gateway edge.
- Rule: reject malformed requests before they reach backend services.
- Rule: keep route rules and policies as code; version control gateway configuration.
- Rule: log request metadata (not sensitive payloads) for audit and debugging.
- Rule: define health check endpoints and upstream failure behavior explicitly.
- Rule: test gateway config changes in staging with production-like traffic before deploy.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml