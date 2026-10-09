---
name: "backend-caching"
category: "backend"
maturity: "stable"
version: "1"
description: "Design backend caching strategies — cache keys, TTLs, invalidation, stale-while-revalidate, and cache coherence — with explicit consistency and failure trade-offs."
capabilities: ""
inputs:
  - type: object
    description: Data source, read/write pattern, freshness requirements, traffic profile, and failure tolerance.
outputs:
  - type: object
    description: Cache strategy, key design, TTL plan, invalidation rules, consistency trade-offs, and monitoring plan.
sideEffects: []
dependencies: []
stopCondition: "Cache purpose, freshness, invalidation, and failure behavior are explicit."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "backend"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/backend-caching.json"
diataxis: "how-to"
tags: ["backend"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: data source, read/write pattern, freshness requirements, traffic profile, failure tolerance, and invalidation triggers.
- Output: cache strategy with keys, TTLs, consistency trade-offs, invalidation rules, and monitoring.
- Scope: do not introduce caching until the source of latency or load is understood.
- Rule: do not introduce caching until the source of latency or load is understood.
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

Emit `BackendCachingArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/backend-caching/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# backend-caching

Use this skill when adding, reviewing, or debugging a backend cache, memoization layer, CDN-backed response cache, read-through cache, or stale-while-revalidate design.


## Rules

- Rule: name the cache's job: latency reduction, load shedding, availability, or cost control.
- Rule: define cache keys from stable identity and all response-affecting dimensions.
- Rule: state freshness guarantees and what stale data can harm.
- Rule: choose explicit invalidation, TTL, write-through, write-behind, or stale-while-revalidate behavior.
- Rule: include fallback behavior for cache outage, stampede, and cold start.

## Why

Caching changes latency and consistency boundaries. Making those trade-offs explicit prevents hidden stale-data bugs and cache storms.

## Steps

1. Identify data, readers, writers, traffic shape, and freshness constraints.
2. Decide cache placement: client, CDN, edge, service, shared store, or local memory.
3. Define key format, value shape, TTL, and invalidation triggers.
4. Analyze consistency risks, stampede risk, and failure behavior.
5. Add observability: hit rate, latency, eviction, stale responses, and backend load.
6. Document rollout, rollback, and cache-warming considerations.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml