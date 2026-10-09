---
name: "devops-k8s-orchestration"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Design and configure Kubernetes orchestration — cluster architecture, deployment strategies, service mesh, observability, auto-scaling, security policies — with reproducible infrastructure."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Manifests saved; architecture documented; monitoring rules defined."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "devops"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/devops-k8s-orchestration.json"
diataxis: "how-to"
tags: ["devops"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: application architecture, traffic patterns, availability target, resource constraints.
- Output: Kubernetes manifests + architecture documentation + monitoring rules.
- Scope: produces manifests and design; deployment only when explicitly executed.
- Rule: produces manifests and design; deployment only when explicitly executed.
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

Emit `DevopsK8sOrchestrationArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/devops-k8s-orchestration/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Kubernetes Orchestration Design

Design a **Kubernetes deployment** — architecture, deployment strategy, service mesh, observability — with reproducible manifests.

## Process

### 1. Architecture design
- **Namespaces:** production, staging, development, monitoring.
- **Node pools:** compute-optimised vs memory-optimised; spot instances.
- **Control plane:** managed (GKE/EKS/AKS) vs self-hosted.
- **Networking:** CNI (Calico, Cilium, Flannel); ingress controller (NGINX, Traefik); service mesh (Istio / Linkerd).

**Completion criterion:** architecture diagram saved.

### 2. Deployment strategy
- **Rolling update:** incremental; safe for stateless.
- **Blue/Green:** instant switch; requires double capacity during transition.
- **Canary:** small percentage to new version; automatic rollback on error rate.
- **A/B:** split traffic by feature flags.

State which fits the service (stateless / stateful / critical / experimental).

**Completion criterion:** strategy selected with justification.

### 3. Resource and scaling
- Resource requests/limits (CPU / memory) per container.
- Horizontal Pod Autoscaler (HPA) based on CPU / memory / custom metrics.
- Vertical Pod Autoscaler (VPA) for right-sizing.
- Cluster autoscaler for node scaling.

**Completion criterion:** resource specs defined; scaling rules saved.

### 4. Security policies
- Pod Security Standards (restricted / privileged / baseline).
- Network policies (deny all; allow only required ports / sources).
- RBAC: least-privilege service accounts; no root containers.
- Secret management: Kubernetes secrets / external (Vault / AWS Secrets Manager / GCP Secret Manager).
- Image scanning: vulnerability scanning in CI.

**Completion criterion:** security policies defined.

### 5. Observability
- **Metrics:** Prometheus / Grafana (custom metrics, SLIs).
- **Logs:** structured logs (JSON); centralised (ELK / Loki / CloudWatch).
- **Tracing:** Jaeger / OpenTelemetry for distributed traces.
- **Alerts:** alert on error rate, latency, resource exhaustion, security events.

**Completion criterion:** monitoring rules defined.

### 6. Deliver

Manifests (YAML) + architecture diagram + monitoring rules + deployment runbook (how to roll back).

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml