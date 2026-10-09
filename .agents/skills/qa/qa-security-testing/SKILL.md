---
name: "qa-security-testing"
category: "qa"
maturity: "stable"
version: "1"
description: "Test security posture — auth flows, authorization boundaries, injection paths, session handling, and misconfiguration checks — with adversarial scenarios."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Security boundaries, findings, and responsible next steps are documented."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "test-strategy"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/qa-security-testing.json"
diataxis: "how-to"
tags: ["qa"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: target scope, allowed test environment, roles/accounts, auth model, and risk areas.
- Output: security test plan or findings with evidence, severity, and remediation guidance.
- Scope: avoid destructive probes and stop when authorization, data exposure, or availability risk becomes unclear.
- Rule: avoid destructive probes and stop when authorization, data exposure, or availability risk becomes unclear.
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

Emit `QaSecurityTestingArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/qa-security-testing/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# qa-security-testing

Use this skill when checking security-sensitive behavior such as authentication, authorization, session handling, injection resistance, rate limits, or configuration exposure.


## Rules

- Rule: confirm test scope and environment before adversarial probing.
- Rule: test vertical and horizontal authorization separately.
- Rule: handle tokens, secrets, and user data as sensitive evidence.
- Rule: include impact and exploitability when assigning severity.
- Rule: prefer minimal proof-of-concept evidence over broad extraction or disruption.

## Steps

1. Identify assets, roles, trust boundaries, and security assumptions.
2. Define test scenarios for auth, authorization, input handling, sessions, and configuration.
3. Exercise positive and negative paths with controlled accounts and data.
4. Capture evidence safely: request shape, response, logs, and redacted identifiers.
5. Rate findings by impact, likelihood, and affected boundary.
6. Recommend remediation and retest criteria.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml