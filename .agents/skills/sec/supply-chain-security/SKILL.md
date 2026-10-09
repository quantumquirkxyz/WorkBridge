---
name: "supply-chain-security"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Design supply chain security — SBOM, Sigstore, SLSA, provenance, signing — with explicit trust tiers, artifact verification, and incident response for compromised dependencies."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "SBOM policy defined; signing policy defined; SLSA target and attestation documented."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "security"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/supply-chain-security.json"
diataxis: "how-to"
tags: ["sec"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: software bill of materials (existing or target), build system, deployment pipeline, threat model.
- Output: SBOM policy + signing policy + SLSA target + vulnerability response runbook.
- Scope: designs security policy; does not patch dependencies or re-sign artifacts unless explicitly instructed.
- Rule: designs security policy; does not patch dependencies or re-sign artifacts unless explicitly instructed.
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

Emit `SupplyChainSecurityArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/supply-chain-security/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Supply Chain Security

Design **supply chain security** — SBOM, Sigstore, SLSA, provenance, signing — with explicit trust tiers, artifact verification, and incident response for compromised dependencies.

## Process

### 1. Inventory and SBOM policy
- Artifact types (container images, binaries, packages, libraries, firmware).
- SBOM format (SPDX, CycloneDX) and minimum granularity (package, file, container).
- Generation cadence (per-build, per-release, continuous).
- Storage and access (artifact registry, versioning, retention).
- Verification rules (SBOM present, signed, matches artifact hash).

**Completion criterion:** SBOM policy with format, cadence, and storage defined.

### 2. Artifact signing
- Signing authority (machine identity, build service, developer keys).
- Signing tool (Sigstore / Cosign, keyless vs key-based).
- Verification enforcement (admission controller, CI gate, deployment policy).
- Key rotation and revocation process.

**Completion criterion:** signing policy with enforcement points defined.

### 3. SLSA build tiers
- SLSA level target (L2: hosted build platform; L3: hard and hermetic).
- Build platform requirements (isolated, reproducible, ephemeral).
- Provenance attestation generation (SLSA provenance, in-toto).
- Verification by consumers (registry, deployment pipeline).

**Completion criterion:** SLSA target and build platform requirements documented.

### 4. Dependency management
- Dependency allow-list and deny-list (internal, open source, critical CVE history).
- Update policy (automated Dependabot / Renovate, review cadence).
- Lock files and pinned versions enforced.
- Transitive dependency visibility (SBOM includes transitive deps).

**Completion criterion:** dependency management policy with update and pinning rules defined.

### 5. Vulnerability response
- Scanning cadence (per-build, nightly, on CVE publication).
- SLA by severity (critical: 24h; high: 7d; medium: 30d; low: 90d).
- Triage and patch process (upstream fix, patch release, CVE acceptance).
- Communication plan (security advisories, customer notifications).

**Completion criterion:** vulnerability SLA and response runbook defined.

### 6. Audit and compliance
- Attestation verification in CI/CD and runtime.
- Periodic audit of signing keys, SBOM accuracy, and SLSA compliance.
- Evidence collection for compliance (SOC 2, FedRAMP, ISO 27001).
- Incident response for compromised artifacts (revocation, re-sign, customer notification).

**Completion criterion:** audit schedule and incident response runbook defined.

## Rules

- Rule: generate SBOM for every artifact; never ship without it.
- Rule: verify signatures at every stage: build, registry, deploy, runtime.
- Rule: target SLSA L3 for production artifacts; document exceptions with risk acceptance.
- Rule: automate dependency updates and vulnerability scanning; manual review only for exceptions.
- Rule: maintain an incident response runbook for supply chain compromise.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml