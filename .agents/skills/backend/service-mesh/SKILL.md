---
name: "service-mesh"
category: "backend"
maturity: "stable"
version: "1"
description: "Service mesh (Istio, Linkerd, Cilium, mTLS, traffic splitting, observability)."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Service mesh design complete; artifact saved; completion criteria checked."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "backend"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/service-mesh.json"
diataxis: "how-to"
tags: ["backend"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: service inventory, traffic topology, security requirements, and observability needs.
- Output: mesh architecture with trust model, traffic policies, and observability configuration.
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

Emit `ServiceMeshArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/service-mesh/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Service Mesh

Use this skill when designing or reviewing a service mesh — Istio, Linkerd, Cilium, or similar — for mTLS, traffic management, observability, and zero-trust networking.


## Process

### 1. Map service topology
- Inventory all services, their namespaces, communication patterns, and dependencies.
- Identify critical paths, latency-sensitive services, and blast-radius concerns.
- Define namespace and mesh boundary strategy.

**Completion criterion:** service topology documented with critical paths and mesh boundary.

### 2. Design zero-trust security
- Define mTLS policy: permissive, strict, or per-service migration strategy.
- Plan authorization policies: which services can call which, with what method/path constraints.
- Define certificate rotation and external CA integration if needed.

**Completion criterion:** mTLS and authorization policy documented with migration strategy.

### 3. Configure traffic management
- Define routing rules, retries, timeouts, and circuit breakers per service.
- Plan canary releases, A/B testing, and traffic splitting via header or weight routing.
- Design fault injection rules for resilience testing in staging.

**Completion criterion:** traffic management rules documented with rollout and rollback behavior.

### 4. Plan observability
- Configure automatic metric emission: request rate, error rate, latency (RED metrics).
- Enable distributed tracing with W3C TraceContext propagation.
- Define access logging policy and sampling rate.

**Completion criterion:** RED metrics, tracing, and access log policy documented.

### 5. Design ingress and egress
- Configure ingress gateway for north-south traffic with TLS termination.
- Define egress policy: which services may call external endpoints and through which egress gateway.
- Plan DNS resolution and service entry configuration for external services.

**Completion criterion:** ingress/egress policy documented with TLS and access control.

### 6. Plan operations and rollout
- Define sidecar injection strategy (automatic namespace-wide or manual per pod).
- Plan mesh upgrade procedure with canary control plane and data plane validation.
- Document rollback triggers and mesh-aware debugging procedures.

**Completion criterion:** rollout and rollback procedure documented.

## Rules

- Rule: never disable mTLS in production without an explicit, time-boxed exception.
- Rule: keep mesh configuration in Git; use progressive rollout for policy changes.
- Rule: define retry budgets; unlimited retries amplify failures.
- Rule: scope authorization policies to least privilege; default deny.
- Rule: instrument mesh metadata carefully; avoid logging request/response bodies in production.
- Rule: validate mesh config in staging with production traffic mirrors before promoting.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml