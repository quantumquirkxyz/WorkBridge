---
name: "devops-ci-cd-pipeline"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Design CI/CD pipelines — build, test, security scan, deploy, rollback — with reproducible steps, environment parity, and deployment gates."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Pipeline file saved; gate rules documented; rollback plan present."
risk: "medium"
trustTier: "3"
maxIterations: "5"
promptVersion: "2.0"
artifactType: "devops"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/devops-ci-cd-pipeline.json"
diataxis: "how-to"
tags: ["devops"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: application architecture, deployment environment, quality requirements.
- Output: pipeline definition + gate rules + rollback plan.
- Scope: defines pipeline; does not execute production deployment unless explicitly instructed.
- Rule: defines pipeline; does not execute production deployment unless explicitly instructed.
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

Emit `DevopsCiCdPipelineArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/devops-ci-cd-pipeline/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# CI/CD Pipeline Design

Design a **CI/CD pipeline** — build, test, security, deploy, rollback — with reproducible steps and deployment gates.

## Process

### 1. Define stages
- **Build:** compile / package / dependency install; reproducible (lock files, container).
- **Test:** unit, integration, contract, performance; must pass before deploy.
- **Security:** dependency scan, secret scan, static analysis (SAST), dynamic (DAST if applicable).
- **Deploy:** to staging first; promotion to prod with gate.
- **Rollback:** automated (revert to previous version) or manual (with decision log).

**Completion criterion:** stages named; order defined; gates stated.

### 2. Environment parity
- Dev / staging / production use identical container images / dependency versions.
- Configuration is externalised (env vars / configmaps / secrets manager), not baked into image.
- Database migrations run before deploy; rollback plan for migration errors.

**Completion criterion:** parity checklist saved.

### 3. Deployment gates
- All tests pass.
- Security scan clean (no critical / high vulnerability unmitigated).
- Approval required for production (manual or automated based on risk).
- Feature flags for gradual rollout.

**Completion criterion:** gate rules saved.

### 4. Rollback
- Previous version kept (blue/green or rolling with old pods)
- Rollback trigger: error rate threshold, latency spike, manual decision.
- Rollback time target (e.g. < 5 minutes for stateless; < 15 minutes for stateful).

**Completion criterion:** rollback plan saved.

### 5. Deliver
Pipeline file (YAML / JSON / script), gate rules, rollback plan, environment parity checklist.

## Rules

- Rule: make build, test, security, deploy, and rollback stages explicit.
- Rule: use reproducible dependencies, pinned tool versions, and consistent runtime images.
- Rule: block promotion on failing tests, critical security findings, or missing artifacts.
- Rule: deploy to lower environments before production and define approval gates.
- Rule: include rollback triggers, rollback target, and expected recovery time.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml