---
name: "agent-orchestration"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Design agent orchestration — multi-agent patterns, tool use, memory, handoffs, evaluation — with explicit coordination boundaries and observability."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Architecture diagram saved; capability matrix complete; handoff contracts defined; evaluation rubric present."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "agent"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/agent-orchestration.json"
diataxis: "how-to"
tags: ["ai"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: task description requiring multiple agents, available tools, quality requirements, latency constraints.
- Output: orchestration architecture + capability matrix + handoff contracts + evaluation rubric.
- Scope: designs orchestration patterns; does not execute multi-agent workflows unless explicitly instructed.
- Rule: designs orchestration patterns; does not execute multi-agent workflows unless explicitly instructed.
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

Emit `AgentOrchestrationArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/agent-orchestration/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Agent Orchestration

Design a **multi-agent orchestration** system with clear coordination boundaries, tool use contracts, memory architecture, and observability.

## Process

### 1. Frame the orchestration problem
- Task decomposition: which parts of the workflow need separate agents?
- Agent count and types: supervisor, specialist workers, validator, synthesizer.
- Latency and throughput requirements: sequential vs parallel execution.
- Failure modes: agent timeout, tool failure, ambiguous output, hallucination.

**Completion criterion:** task decomposition documented; agent count and types defined; latency requirements stated.

### 2. Agent roles and tool use
- Role definition: name, responsibility, success criteria, failure handling.
- Tool allocation: which tools each agent can use; least-privilege principle.
- Tool contracts: input schema, output schema, retry policy, timeout, idempotency.
- Context scoping: what context each agent receives; minimisation to reduce noise and cost.

**Completion criterion:** capability matrix saved with roles, tools, and contracts.

### 3. Memory architecture
- Short-term memory: conversation history, scratchpad, working state within a single agent run.
- Long-term memory: knowledge graph, vector store, file system for cross-session persistence.
- Shared memory: state visible to multiple agents (board, queue, registry).
- Episodic memory: execution traces for debugging and improvement.
- Memory access policy: read/write permissions, retention, summarisation strategy.

**Completion criterion:** memory architecture documented with access policies.

### 4. Coordination patterns and handoffs
- Patterns: supervisor / worker, peer collaboration, pipeline / DAG, router / classifier.
- Handoff contracts: trigger conditions, payload schema, timeout, retry, fallback agent.
- Escalation paths: when to escalate to human or fallback agent; circuit breakers.
- Idempotency: how to handle duplicate or out-of-order messages.

**Completion criterion:** handoff contracts and escalation policy saved.

### 5. Evaluation and observability
- Coordination quality metrics: task completion rate, handoff success rate, agent latency distribution, tool call accuracy.
- End-to-end tracing: span per agent, per tool call, per handoff.
- Logging: structured logs with correlation IDs; redaction of sensitive data.
- Feedback loops: human-in-the-loop checkpoints, self-correction triggers, continuous improvement signals.

**Completion criterion:** evaluation rubric and observability plan saved.

## Rules

- Rule: define explicit handoff contracts with schema, timeout, and fallback; never assume implicit coordination.
- Rule: apply least-privilege tool access per agent; document capability matrix.
- Rule: include circuit breakers and escalation paths for agent failures and ambiguous outputs.
- Rule: instrument every agent run with tracing, structured logging, and quality metrics.
- Rule: document memory access policies (read/write permissions, retention, summarisation) for each memory tier.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml