---
name: "distributed-tracing"
category: "backend"
maturity: "stable"
version: "1"
description: "Distributed tracing (OpenTelemetry, W3C TraceContext, sampling, instrumentation)."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Distributed tracing design complete; artifact saved; completion criteria checked."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "backend"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/distributed-tracing.json"
diataxis: "how-to"
tags: ["backend"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: service inventory, request topology, observability requirements, and privacy constraints.
- Output: tracing architecture with instrumentation plan, sampling strategy, and backend configuration.
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

Emit `DistributedTracingArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/distributed-tracing/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Distributed Tracing

Use this skill when designing distributed tracing for a service-oriented system — OpenTelemetry, W3C TraceContext, sampling strategies, instrumentation, and trace-based debugging.


## Process

### 1. Map request topology
- Identify service boundaries, synchronous and asynchronous hops, and external calls.
- Document critical paths and high-latency boundaries where tracing adds the most value.
- Define trace ownership: which service creates the root span and which propagate context.

**Completion criterion:** request topology documented with critical paths and ownership model.

### 2. Configure context propagation
- Choose propagation format: W3C TraceContext (default), B3, or Jaeger.
- Define how trace context is injected and extracted across HTTP, gRPC, messaging, and task queues.
- Handle cross-boundary propagation for asynchronous flows (message headers, job metadata).

**Completion criterion:** context propagation rules documented per transport and boundary.

### 3. Plan instrumentation strategy
- Identify auto-instrumentation candidates: HTTP servers, HTTP clients, gRPC, database drivers, messaging clients.
- Define manual instrumentation for business-critical spans where auto-instrumentation is insufficient.
- Plan span attributes: standard (http.method, http.status_code) and semantic (db.system, messaging.system).

**Completion criterion:** instrumentation plan documented per service and transport.

### 4. Design sampling strategy
- Choose sampling mode: head-based (probability, rate limiting) or tail-based (collect all, sample in backend).
- Define sampling rates per environment: higher in staging, cost-managed in production.
- Plan root span sampling and always-sample rules for critical paths or error traces.

**Completion criterion:** sampling strategy documented with rates and environment overrides.

### 5. Configure trace storage and backend
- Choose backend: Jaeger, Tempo, Zipkin, Datadog, or OpenSearch.
- Define retention policy, index strategy, and access controls.
- Plan trace-to-logs correlation via trace ID injection into log records.

**Completion criterion:** backend configuration and retention policy documented.

### 6. Plan trace-based analysis and alerting
- Define service-level latency and error rate objectives visible via trace analytics.
- Configure alerts on span error rate, latency spikes, and dropped traces.
- Document root cause analysis procedure using trace waterfall and span attributes.

**Completion criterion:** trace-based alerting rules and root cause analysis procedure documented.

## Rules

- Rule: generate trace IDs at the edge; propagate them unconditionally across all hops.
- Rule: keep span attributes bounded; avoid unbounded cardinality (user IDs, request IDs without hashing).
- Rule: redact secrets, tokens, and PII from span attributes and tags before export.
- Rule: instrument both successes and failures; errors without traces are hard to debug.
- Rule: define span ownership: one team owns instrumentation for each service; do not silently drop spans.
- Rule: validate trace completeness in CI using synthetic traffic or integration tests.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml