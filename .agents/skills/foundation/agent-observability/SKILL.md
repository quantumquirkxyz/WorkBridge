---
name: "agent-observability"
category: "foundation"
maturity: "stable"
description: "Capture redacted execution records, traces, and quality signals for skill runs with structured data for analysis. Enables full audit of decisions made during agent execution."
version: "1"
capabilities: ""
inputs: ""
outputs: ""
sideEffects: ""
dependencies: []
stopCondition: "Trace recorded, signals captured, and report generated with explicit evidence."
risk: "low"
trustTier: "2"
maxIterations: "3"
promptVersion: "2.0"
artifactType: "agent"
modelTier: "fast"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/agent-observability.json"
diataxis: "how-to"
tags: ["foundation"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: skill execution context and raw execution data
- Output: redacted execution record, structured analysis data, and traceability links
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

Emit `AgentObservabilityArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/agent-observability/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Agent Observability

Use this skill to make Skill runs observable without leaking sensitive data, while providing structured data for later analysis.


## Steps

### 1. Capture Execution Context
- Capture the Skill name, version, context pack used, and tools invoked
- Record timestamp, duration, and compute resources used
- Note the inputs provided to the skill and the triggering context

### 2. Redact Sensitive Data
- Identify and redact secrets (API keys, passwords, tokens)
- Redact personally identifiable information (email addresses, names, internal identifiers)
- Redact sensitive project-specific data that could reveal competitive information
- Use pattern matching and rule-based approaches for reliable redaction
- Preserve non-sensitive structural information for analysis

### 3. Structure Data for Analysis
- Organize data in consistent, analyzable formats (JSON preferred)
- Include standardized fields for common analysis patterns:
  * Skill invocation patterns and parameters
  * Execution timing and resource usage
  * Success/failure outcomes and error types
  * Input/output characteristics and data flow
  * Dependency invocation patterns
- Ensure structure supports aggregation and trend analysis over time

### 4. Link to Outputs and Validation Evidence
- Create traceable links to any artifacts produced by the skill
- Link to validation evidence when available (test results, lint reports, etc.)
- Preserve causality chains for debugging and root cause analysis
- Enable skills to be understood in the context of larger workflows

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml