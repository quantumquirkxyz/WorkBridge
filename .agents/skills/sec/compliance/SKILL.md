---
name: "compliance"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Compliance (SOC2, ISO27001, GDPR, HIPAA, PCI DSS, audits, evidence, remediation)"
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Gap analysis complete; evidence pack assembled; remediation roadmap accepted."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "sec"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/compliance.json"
diataxis: "how-to"
tags: ["sec"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: system description, applicable frameworks, existing policies and evidence.
- Output: gap analysis + evidence pack + remediation roadmap + control matrix.
- Scope: assesses readiness and documents evidence; does not perform certification or legal attestation.
- Rule: assesses readiness and documents evidence; does not perform certification or legal attestation.
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

Emit `ComplianceArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/compliance/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Compliance

Assess **compliance posture** across SOC2, ISO27001, GDPR, HIPAA, and PCI DSS — with explicit control mapping, evidence collection, gap analysis, and remediation planning.

## Process

### 1. Frameworks and scope
- Which frameworks apply? (SOC2 Type I/II, ISO27001:2022, GDPR, HIPAA, PCI DSS v4.0)
- What is in scope? (systems, data types, cloud regions, subsidiaries, vendors)
- What is out of scope? (non-regulated products, legacy systems being decommissioned)

**Completion criterion:** scope and framework list saved.

### 2. Control mapping
Map each framework's required controls to current controls:
- SOC2: CC1–CC7 (Control Environment through Encryption, Incident Response)
- ISO27001: Annex A controls (A.5–A.8: organisational, people, physical, technological)
- GDPR: Art. 5 (principles), Art. 24 (responsibility), Art. 32 (security of processing), Art. 33–34 (breach notification)
- HIPAA: Administrative (Security Rule), Physical, Technical safeguards
- PCI DSS: 12 requirements (build/maintain secure network, protect cardholder data, vulnerability management, access control, monitoring, testing)

**Completion criterion:** control matrix (framework control → current control → status) saved.

### 3. Evidence collection
For each control, collect evidence:
- Policies and procedures (approved, reviewed, versioned)
- Configuration snapshots (encryption settings, access controls, network segmentation)
- Logs (access, authentication, change, audit)
- Process records (onboarding/offboarding, vendor reviews, risk assessments, training)
- Test results (vulnerability scans, penetration tests, DR drills)
- Third-party attestations (vendor SOC2, BAA, DPA)

**Completion criterion:** evidence indexed by control; gaps in evidence flagged.

### 4. Gap analysis
For each control:
- **Present:** control exists, evidence is sufficient → pass.
- **Partial:** control exists but evidence is incomplete or implementation is inconsistent → partial.
- **Missing:** no control or no evidence → gap.

For each gap: root cause (no policy, no enforcement, no evidence), risk (likelihood × impact), and regulatory consequence (fine, certification loss, audit finding).

**Completion criterion:** gap register with severity and regulatory impact saved.

### 5. Remediation planning
For each gap:
- Remediation action (policy, tool, process, training)
- Owner (team or individual)
- Effort (low / medium / high)
- Timeline (sprint, quarter)
- Verification method (re-audit, scan, attestation, self-assessment)
- Dependencies (budget, vendor, legal review)

Prioritise by: regulatory deadline × risk × effort. Quick wins first (high impact, low effort).

**Completion criterion:** remediation roadmap with owners and milestones saved.

### 6. Continuous compliance
Design ongoing monitoring:
- Automated checks (configuration drift, policy violations, unpatched CVEs)
- Periodic evidence refresh (quarterly access reviews, annual policy review)
- Change management (new services assessed before production)
- Incident response integration (breach timelines aligned with notification requirements)
- Training and awareness cadence

**Completion criterion:** continuous compliance plan saved.

### 7. Audit readiness package
Assemble final package:
- Executive summary (posture, critical gaps, timeline to readiness)
- Control matrix with evidence links
- Gap register with remediation status
- Policies and procedures repository
- Evidence pack (organised by framework and control)
- Open items and escalation paths

**Completion criterion:** audit-ready package saved and reviewed.

## Rules

- Rule: map every control to a specific piece of evidence; do not accept verbal assurances as evidence.
- Rule: treat evidence as immutable once collected; version and timestamp all artifacts.
- Rule: classify gaps by regulatory severity (reportable vs. internal) and timeline (immediate vs. planned).
- Rule: assign a single owner to every remediation item; no unowned items in the roadmap.
- Rule: separate "control exists but undocumented" from "control does not exist" — they require different remediation.
- Rule: verify remediation effectiveness with objective evidence (re-scan, re-test, re-attest), not self-declaration alone.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml