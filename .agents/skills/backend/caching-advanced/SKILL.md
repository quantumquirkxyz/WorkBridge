---
name: "caching-advanced"
category: "backend"
maturity: "stable"
version: "1"
description: "Advanced caching strategies (Redis, Memcached, CDN, cache invalidation, stampede prevention)."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Cache architecture, invalidation strategy, stampede prevention, and consistency model are explicit."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "backend"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/caching-advanced.json"
diataxis: "how-to"
tags: ["backend"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: data access patterns, read/write ratio, latency requirements, consistency needs, traffic profile, and failure tolerance.
- Output: advanced caching design with store selection, key strategy, invalidation policy, stampede prevention, consistency model, and operational runbook.
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

Emit `CachingAdvancedArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/caching-advanced/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Advanced Caching

Use this skill when designing, reviewing, or optimizing advanced caching systems — Redis, Memcached, CDN, cache invalidation patterns, stampede prevention, consistency models, and multi-tier cache hierarchies.


## Process

### 1. Analyze access patterns and requirements
- Catalog data: size, shape, read/write ratio, hot keys, and churn rate.
- Classify data by consistency requirement: strong, eventual, or best-effort.
- Identify latency and throughput targets per data class.

**Completion criterion:** data catalog and consistency requirements documented.

### 2. Select cache stores and layers
- Choose store per data class: in-process (Caffeine, Go cache), Redis (cluster or sentinel), Memcached, or CDN.
- Design multi-tier hierarchy: L1 local, L2 shared, L3 CDN or edge.
- Plan eviction policy per tier: LRU, LFU, TTL, or size-based.

**Completion criterion:** store selection and tier hierarchy documented with eviction policy.

### 3. Design key strategy and data shape
- Define key format: stable identity, versioning, and response-affecting dimensions.
- Choose value serialization and compression: JSON, Protobuf, MessagePack, or binary.
- Plan key lifecycle, rotation, and bulk invalidation approach.

**Completion criterion:** key format, value shape, and serialization strategy documented.

### 4. Plan invalidation and consistency
- Choose invalidation strategy: TTL, write-through, write-behind, or explicit invalidation.
- Define consistency model: cache-aside, read-through, write-through, or refresh-ahead.
- Plan handling for stale data, thundering herds, and cache outages.

**Completion criterion:** invalidation strategy and consistency model documented with failure behavior.

### 5. Implement stampede prevention
- Design stampede prevention: probabilistic early expiration, request coalescing, or jittered TTLs.
- Plan request mutex or single-flight for expensive regenerations.
- Define fallback behavior when regeneration fails or times out.

**Completion criterion:** stampede prevention mechanism documented with regeneration and fallback behavior.

### 6. Configure observability and operations
- Define metrics: hit rate, latency, eviction count, memory usage, key count, and error rate.
- Configure alerts for cache outage, high eviction, or degradation.
- Document operational runbook for scaling, failover, and cache warming.

**Completion criterion:** observability and operational runbook documented.

## Rules

- Rule: never cache data without understanding its mutation rate and consistency requirements.
- Rule: name the cache's job explicitly: latency reduction, load shedding, availability, or cost control.
- Rule: set explicit TTL bounds; avoid unbounded or infinite caching without review.
- Rule: test invalidation and stampede behavior under load before production deployment.
- Rule: encrypt sensitive cache data at rest and in transit.
- Rule: treat cache configuration as code; version control and review changes.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml