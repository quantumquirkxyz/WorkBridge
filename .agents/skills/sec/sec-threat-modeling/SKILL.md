---
name: "sec-threat-modeling"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Design and document threat models for software / systems — assets, threats, vulnerabilities, mitigations — using STRIDE or ATT&CK frameworks."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Threat model saved; all assets mapped; risk register complete."
risk: "low"
trustTier: "1"
maxIterations: "5"
promptVersion: "2.0"
artifactType: "model"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/sec-threat-modeling.json"
diataxis: "how-to"
tags: ["sec"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: system architecture, data flows, users, deployment environment.
- Output: threat model document + risk register.
- Scope: designs threat model; does not implement mitigations.
- Rule: designs threat model; does not implement mitigations.
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

Emit `SecThreatModelingArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/sec-threat-modeling/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Threat Modeling

Build a **threat model** — assets, threats, vulnerabilities, mitigations — using STRIDE or ATT&CK.

## Process

### 1. Define assets
What must be protected? Data (PII, credentials, business data), services (API, database), systems (servers, containers), users.

**Completion criterion:** asset list with value/criticality.

### 2. Map architecture
- Data flow diagram: sources → processes → stores → sinks.
- Trust boundaries: where do privileges change? (user → service → database → external API)
- External dependencies: third-party APIs, SaaS, cloud providers.

**Completion criterion:** diagram saved; trust boundaries marked.

### 3. Identify threats
Use STRIDE per component:
- **Spoofing:** can an attacker impersonate a user / service?
- **Tampering:** can data be altered in transit / at rest?
- **Repudiation:** can actions be denied? (lack of logging / audit)
- **Information Disclosure:** can sensitive data leak (logs, errors, unencrypted storage)?
- **Denial of Service:** can resources be exhausted?
- **Elevation of Privilege:** can a low-privilege user gain admin?

**Completion criterion:** threat table with evidence and likelihood.

### 4. Assess vulnerabilities
How could each threat succeed? Weak authentication? Unvalidated input? Missing encryption? Overly permissive access control?

**Completion criterion:** vulnerability mapped per threat.

### 5. Design mitigations
For each threat-vulnerability pair: what control (preventive / detective / corrective) reduces likelihood or impact? (Encryption, authentication, validation, logging, rate limiting, backup, least privilege).

**Completion criterion:** mitigation table with responsible party.

### 6. Residual risk
After mitigations: is risk acceptable? If not, add more controls or accept with justification.

**Completion criterion:** residual risk stated; justification if accepted.

## Rules

- Rule: define assets, actors, trust boundaries, and data flows before listing threats.
- Rule: evaluate threats per component or flow, not only as a generic checklist.
- Rule: separate vulnerability, threat, impact, likelihood, mitigation, and residual risk.
- Rule: assign owners or follow-up actions for non-accepted risks.
- Rule: include abuse cases and operational controls such as logging, alerting, backup, and recovery.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml