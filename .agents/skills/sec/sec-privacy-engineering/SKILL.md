---
name: "sec-privacy-engineering"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Design privacy-protecting systems — GDPR / CCPA / HIPAA compliance, data minimisation, anonymisation, consent management, data retention, breach notification — with explicit privacy impact assessments."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "PIA saved; data-flow map complete; compliance checklist filled."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "pull-request"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/sec-privacy-engineering.json"
diataxis: "how-to"
tags: ["sec"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: system architecture, data types, users, jurisdictions.
- Output: Privacy Impact Assessment + data-flow map + compliance checklist.
- Scope: designs privacy controls and documents compliance gaps; does not provide legal advice.
- Rule: designs privacy controls and documents compliance gaps; does not provide legal advice.
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

Emit `SecPrivacyEngineeringArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/sec-privacy-engineering/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Privacy Engineering

Design **privacy-protecting systems** — GDPR / CCPA / HIPAA — with explicit data minimisation, anonymisation, consent, and breach-notification controls.

## Process

### 1. Data inventory
- What data is collected? (PII, health data, financial, behavioural, biometric, location)
- Source (user input, sensors, third party, derived).
- Classification (public, internal, confidential, restricted, secret).

**Completion criterion:** inventory saved.

### 2. Purpose and legal basis
- Why is each data needed? Can the purpose be achieved with less data?
- Legal basis: consent, contract, legal obligation, vital interest, public task, legitimate interest (with balance test).
- Users must be informed clearly.

**Completion criterion:** purpose and basis stated per data type.

### 3. Data-flow mapping
Map flows: collection → processing → storage → sharing → archive → deletion.
Mark where data crosses borders (jurisdiction change) or enters third-party systems.

**Completion criterion:** data-flow diagram saved.

### 4. Controls
- **Minimisation:** collect only needed fields; use pseudonymisation where possible.
- **Encryption:** at rest (AES-256), in transit (TLS 1.3), in use (homomorphic / secure enclaves if required).
- **Access:** least-privilege; role-based; audit logs.
- **Retention:** define retention period per data type; automatic deletion after period.
- **Consent:** explicit, granular, revocable; record consent state.
- **Breach notification:** 72-hour notification for GDPR; process for detection, containment, notification, remediation.

**Completion criterion:** controls matched to risks; gaps documented.

### 5. Impact assessment
Identify high-risk processing (systematic profiling, large-scale sensitive data, automated decision-making with legal effects). For high-risk: conduct Data Protection Impact Assessment (DPIA / PIA).

**Completion criterion:** PIA completed for high-risk processing; justification if low-risk.

### 6. Checklists and compliance
- GDPR: lawful basis, consent, data subject rights (access / rectification / erasure / portability / restriction / objection), DPO, breach notification, transfer safeguards.
- CCPA: notice at collection, opt-out of sale, non-discrimination, service-provider contracts.
- HIPAA: PHI safeguards (administrative, physical, technical), business associate agreements.

**Completion criterion:** checklist filled; gaps flagged for legal review.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml