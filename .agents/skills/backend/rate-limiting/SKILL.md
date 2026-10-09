---
name: "rate-limiting"
category: "backend"
maturity: "stable"
version: "1"
description: "Rate limiting and throttling (token bucket, sliding window, distributed rate limiting, API protection)."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Rate limiting algorithms, limit tiers, distributed coordination, and API protection rules are explicit."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "backend"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/rate-limiting.json"
diataxis: "how-to"
tags: ["backend"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: API inventory, traffic profile, client tiers, SLA targets, abuse patterns, and infrastructure capacity.
- Output: rate limiting design with algorithm selection, limit tiers, distributed coordination, API protection rules, graceful degradation, and monitoring.
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

Emit `RateLimitingArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/rate-limiting/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Rate Limiting and Throttling

Use this skill when designing, reviewing, or implementing rate limiting and throttling systems — token bucket, sliding window, distributed rate limiting, API protection, and overload prevention.


## Process

### 1. Identify protected resources and clients
- Catalog APIs by criticality, cost, and abuse surface.
- Classify clients: anonymous, authenticated, partner, or internal.
- Define traffic baseline, peak load, and growth projections.

**Completion criterion:** API inventory and client classification documented.

### 2. Choose rate limiting algorithms
- Select algorithm per use case: token bucket for bursty traffic, sliding window for strict intervals, fixed window for simplicity, or leaky bucket for steady rate.
- Evaluate distributed vs. local enforcement: edge gateway, service mesh, or application layer.
- Define algorithm parameters: capacity, refill rate, window size, and precision.

**Completion criterion:** algorithm selection documented with parameters and enforcement layer.

### 3. Define limit tiers and rules
- Set limit tiers per client, endpoint, or resource: free, standard, premium, or burst.
- Plan quota periods: per-second, per-minute, per-hour, or daily.
- Define multi-factor limits: requests per IP, per user, per API key, or per resource.

**Completion criterion:** limit tier matrix documented with enforcement granularity.

### 4. Design distributed coordination
- Choose coordination store for distributed limits: Redis, Memcached, or cloud-native.
- Plan consistency model: eventually consistent or strongly consistent counters.
- Handle clock skew, partition tolerance, and store failure behavior.

**Completion criterion:** distributed coordination design documented with failure behavior.

### 5. Plan error handling and graceful degradation
- Define HTTP status and headers for limit breach: 429 Too Many Requests, Retry-After, and X-RateLimit-* headers.
- Plan response degradation: queue requests, serve stale cache, or disable non-critical features.
- Design retry behavior for clients: backoff, jitter, and idempotency.

**Completion criterion:** error handling and degradation strategy documented.

### 6. Configure observability and alerting
- Define metrics: request rate, limit breach rate, 429 count, queue depth, and client impact.
- Configure tracing for rate-limited requests and audit logs for abuse patterns.
- Document operational runbook for false positive tuning and emergency limit changes.

**Completion criterion:** observability and operational runbook documented.

## Rules

- Rule: never rate limit health check or readiness endpoints; they must remain accessible for load balancers and monitoring.
- Rule: set limits conservatively above normal traffic with headroom for legitimate bursts.
- Rule: log limit breach events with client identity and endpoint for audit and tuning.
- Rule: test limit enforcement under load with production-like traffic patterns before deploy.
- Rule: document emergency override procedures for false positives or incidents.
- Rule: apply rate limiting at the edge when possible to protect downstream services.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml