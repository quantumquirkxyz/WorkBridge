---
name: "gitops"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Design GitOps workflows — ArgoCD, Flux, declarative sync, drift detection, progressive delivery — with explicit reconciliation and safety boundaries."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Architecture diagram saved; sync configuration documented; drift runbook complete; progressive delivery strategy defined."
risk: "medium"
trustTier: "3"
maxIterations: "7"
promptVersion: "2.0"
artifactType: "devops"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/gitops.json"
diataxis: "how-to"
tags: ["devops"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: Kubernetes cluster configuration, Git repository structure, deployment requirements, compliance constraints.
- Output: GitOps architecture + sync policy + drift runbook + progressive delivery strategy.
- Scope: designs GitOps workflow; does not apply configuration to production clusters unless explicitly instructed.
- Rule: designs GitOps workflow; does not apply configuration to production clusters unless explicitly instructed.
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

Emit `GitopsArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/gitops/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# GitOps

Design a **GitOps** workflow using ArgoCD or Flux with declarative sync, drift detection, and progressive delivery.

## Process

### 1. Frame the GitOps problem
- Cluster topology: single cluster, multi-cluster, multi-tenant, staging vs production separation.
- Git repository structure: mono-repo vs multi-repo; environment folders; manifest organisation.
- Team model: who owns which environments; approval workflow for production changes.
- Compliance: audit trail, RBAC, secret management integration, policy enforcement (OPA/Gatekeeper).

**Completion criterion:** cluster topology documented; repo structure defined; team ownership mapped.

### 2. GitOps tool selection and architecture
- Tool comparison: ArgoCD (UI-heavy, ApplicationSet, App of Apps) vs Flux (GitOps Toolkit, Kustomize-native, event-driven).
- Architecture: Git as source of truth; controller cluster-side; webhook or polling for change detection.
- Manifest management: plain YAML, Kustomize, Helm, Jsonnet, or Carvel.
- Secret management: sealed with SOPS, SealedSecrets, or external secrets operator; never plaintext in Git.

**Completion criterion:** GitOps tool selected with architecture diagram; manifest strategy defined.

### 3. Sync and reconciliation policy
- Sync waves: order of application (CRDs first, then operators, then workloads).
- Sync options: automated vs manual; prune, self-heal, allow-empty.
- Health checks: resource health, custom health checks for CRDs and operators.
- Notification: Slack, email, or PagerDuty on sync success / failure / drift.
- RBAC: who can approve, who can sync to production, who can override.

**Completion criterion:** sync policy documented with waves, health checks, and notification rules.

### 4. Drift detection and remediation
- Detection: periodic diff between Git state and live cluster state; alert on drift.
- Drift sources: manual kubectl edit, emergency patches, controller bugs, out-of-band changes.
- Remediation policy: auto-remediate (force sync) vs alert-and-approve vs block on drift.
- Drift investigation: who reviews drift alerts; runbook for common drift causes; escalation path.

**Completion criterion:** drift detection and remediation runbook saved.

### 5. Progressive delivery
- Strategies: canary (traffic shifting), blue/green, rolling update with pause, feature flags (Flagger, Argo Rollouts).
- Analysis metrics: error rate, latency, throughput, custom business metrics; promotion and rollback criteria.
- Promotion gates: automated (metrics pass) or manual (human approval).
- Rollback: automatic on metric threshold breach; manual override; rollback target (previous version).

**Completion criterion:** progressive delivery strategy documented with metrics, gates, and rollback criteria.

## Rules

- Rule: Git is the single source of truth; never modify production cluster state outside Git.
- Rule: define explicit sync waves and health checks; do not sync everything at once.
- Rule: implement drift detection with clear remediation policy; investigate root cause before auto-remediating.
- Rule: use progressive delivery for production changes; do not deploy directly to production without canary or approval gate.
- Rule: keep secrets out of Git; use sealed secrets or external secrets operator with audit logging.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml