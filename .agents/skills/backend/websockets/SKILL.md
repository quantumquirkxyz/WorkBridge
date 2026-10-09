---
name: "websockets"
category: "backend"
maturity: "stable"
version: "1"
description: "WebSockets and real-time (Socket.IO, WS, SSE, pub/sub, scaling, reconnection, backpressure)."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "WebSocket/SSE architecture, connection lifecycle, scaling topology, and failure handling are explicit."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "backend"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/websockets.json"
diataxis: "how-to"
tags: ["backend"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: real-time use case, message rate, client count, latency requirements, scaling constraints, and failure tolerance.
- Output: real-time architecture with connection strategy, scaling topology, reconnection logic, pub/sub design, backpressure handling, and monitoring.
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

Emit `WebsocketsArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/websockets/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# WebSockets and Real-Time

Use this skill when designing, reviewing, or debugging real-time systems — WebSockets (WS), Server-Sent Events (SSE), Socket.IO, pub/sub messaging, connection scaling, reconnection logic, backpressure, and long-lived connection management.


## Process

### 1. Assess real-time requirements
- Classify use case: bi-directional chat, live feed, collaborative editing, notifications, or telemetry.
- Define message direction, frequency, payload size, and latency targets.
- Identify client diversity: browsers, mobile, IoT, or server-to-server.

**Completion criterion:** real-time requirements documented with traffic profile and client inventory.

### 2. Choose transport and protocol
- Select transport per use case: WebSocket for full-duplex, SSE for server-to-client, or long-polling fallback.
- Evaluate Socket.IO, raw WS, or framework-specific solutions against client and infrastructure constraints.
- Plan protocol versioning and backward compatibility.

**Completion criterion:** transport and protocol selection documented with compatibility strategy.

### 3. Design connection lifecycle
- Define connection establishment, authentication, and authorization flow.
- Plan reconnection strategy: exponential backoff, jitter, session resumption, and message replay.
- Handle connection drop, stale connections, and cleanup.

**Completion criterion:** connection lifecycle documented with auth, reconnection, and cleanup behavior.

### 4. Plan scaling topology
- Design connection scaling: single-node, load-balanced sticky sessions, or shared-nothing with pub/sub.
- Choose message broker or coordination layer: Redis, NATS, Kafka, or cloud-native.
- Plan horizontal scaling, connection limits, and session affinity.

**Completion criterion:** scaling topology documented with broker selection and connection limits.

### 5. Implement pub/sub and backpressure
- Design pub/sub topology: per-room channels, topic-based, or broadcast.
- Define backpressure signals: flow control, buffering, throttling, and drop behavior.
- Plan message ordering, deduplication, and exactly-once delivery where required.

**Completion criterion:** pub/sub design and backpressure behavior documented.

### 6. Design observability and operations
- Define metrics: connection count, message rate, latency, error rate, and reconnection rate.
- Configure tracing, structured logging, and client-side diagnostics.
- Document operational runbook for broker failure, capacity planning, and incident response.

**Completion criterion:** observability and operational runbook documented.

## Rules

- Rule: authenticate connections before allowing subscription or message send.
- Rule: set explicit read and write timeouts to detect dead connections quickly.
- Rule: apply backpressure at the source; never let unbounded buffering exhaust memory.
- Rule: version message schemas and handle unknown message types gracefully.
- Rule: log connection lifecycle events and message metadata, not sensitive payload content.
- Rule: test scaling behavior with production-like connection counts and message rates.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml