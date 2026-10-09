---
name: "networking-protocols"
category: "networking"
maturity: "stable"
version: "1"
description: "Analyze network protocols — packet formats, handshakes, congestion control, routing, and transport behavior — with explicit timing and failure assumptions."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Protocol state, message flow, and failure assumptions are explicit."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "pull-request"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/networking-protocols.json"
diataxis: "how-to"
tags: ["networking"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: protocol, actors, message sequence, network assumptions, captures/logs if available, and observed behavior.
- Output: protocol explanation, state machine or flow, timing assumptions, and likely failure modes.
- Scope: distinguish what the protocol guarantees from what an implementation happens to do.
- Rule: distinguish what the protocol guarantees from what an implementation happens to do.
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

Emit `NetworkingProtocolsArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/networking-protocols/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# networking-protocols

Use this skill when analyzing packet formats, handshakes, transport behavior, routing interactions, congestion control, or protocol-level failure scenarios.


## Rules

- Rule: identify actors, state, and message direction before explaining behavior.
- Rule: separate transport, session, application, and routing concerns.
- Rule: call out retransmission, timeout, ordering, fragmentation, and congestion effects when relevant.
- Rule: use packet captures or logs as evidence, not as a substitute for a protocol model.
- Rule: state security assumptions such as authentication, encryption, and downgrade resistance.

## Steps

1. Define endpoints, intermediaries, protocol layer, and expected state transitions.
2. Trace the normal message flow and handshake.
3. Identify timing, retry, congestion, and ordering behavior.
4. Compare observed packets or logs against expected flow.
5. Analyze failure cases: loss, reordering, MTU, DNS, routing, TLS, and connection resets.
6. Summarize root cause candidates or design implications.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml