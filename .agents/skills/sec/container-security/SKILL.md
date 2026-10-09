---
name: "container-security"
category: "sec"
maturity: "stable"
version: "1"
description: "Container security (Docker, Kubernetes, image scanning, runtime security, pod security policies)"
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Container baseline saved; image scan policy defined; runtime rules documented; K8s security policies complete."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "security"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/container-security.json"
diataxis: "how-to"
tags: ["sec"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: container runtime (Docker, Kubernetes, ECS, GKE), workload architecture, compliance requirements.
- Output: container security baseline + image scan policy + runtime rules + K8s security policies.
- Scope: designs and audits container security; does not deploy or patch workloads.
- Rule: designs and audits container security; does not deploy or patch workloads.
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

Emit `ContainerSecurityArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/container-security/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Container Security

Secure **container workloads** — image hygiene, runtime protection, Kubernetes policies, and orchestration controls — for Docker and Kubernetes.

## Process

### 1. Image security baseline
- **Base image:** use minimal, distroless, or scratch images; pin digests (not tags) in production.
- **Non-root:** run containers as non-root user (USER directive); avoid running as root in Dockerfile or pod spec.
- **Read-only filesystem:** mount root filesystem read-only where possible; use emptyDir for writable paths.
- **Capabilities:** drop ALL Linux capabilities; add back only what is required (NET_BIND_SERVICE for port < 1024).
- **Privileged mode:** never run privileged containers in production; use specific capabilities instead.
- **Resource limits:** set CPU and memory limits; enable QoS class for critical workloads.

**Completion criterion:** image baseline documented; Dockerfile template created.

### 2. Image scanning and CI/CD gate
- **Scan types:** vulnerability (CVE), secrets (API keys, tokens), malware, license compliance.
- **Tooling:** Trivy, Grype, Snyk, Anchore, Docker Scout; integrate into CI/CD pipeline.
- **Gate policy:** block critical and high-severity CVEs; medium requires approval with justification; low tracked in backlog.
- **SBOM:** generate Software Bill of Materials (SPDX, CycloneDX) for each image; store in registry or artifact store.
- **Signing and verification:** sign images (Cosign, Notary); enforce signature verification in admission controller.

**Completion criterion:** scan policy defined; CI/CD gate implemented; SBOM generation automated.

### 3. Pod Security Standards (Kubernetes)
- **Restricted (production default):** must run as non-root; no privilege escalation; read-only root filesystem; drop all capabilities; seccomp profile RuntimeDefault.
- **Baseline:** prevents known privilege escalations; allows more flexibility than restricted.
- **Privileged:** unrestricted; only for system / infrastructure namespaces with explicit approval.
- **Enforcement:** use Pod Security Admission (enforce / audit / warn); migrate from PodSecurityPolicy (deprecated).
- **Namespace labels:** set pod-security.kubernetes.io/{enforce,audit,warn} labels per namespace.

**Completion criterion:** Pod Security Standards configured; production namespaces enforce restricted; exceptions documented.

### 4. Runtime security
- **Seccomp profiles:** apply RuntimeDefault or custom seccomp profiles; block dangerous syscalls (mount, ptrace, kexec).
- **AppArmor / SELinux:** apply mandatory access control profiles; use container-default profiles and customise for workload needs.
- **Falco / runtime detection:** deploy Falco for runtime anomaly detection (unexpected process execution, file modification, network connections).
- **Admission control:** enforce policies at admission time (Kyverno, OPA Gatekeeper); validate image provenance, resource limits, security context.

**Completion criterion:** runtime security rules documented; admission control configured; Falco rules deployed.

### 5. Kubernetes access control
- **RBAC:** least-privilege roles; avoid cluster-admin; use namespace-scoped roles; bind service accounts to specific roles.
- **Service accounts:** disable automountServiceAccountToken where not needed; use distinct service accounts per workload.
- **Network policies:** default-deny ingress and egress; allow only required traffic; use namespace-scoped policies.
- **API server hardening:** enable RBAC, Node Authorization, AlwaysPullImages; disable anonymous auth; enable audit logging.

**Completion criterion:** RBAC and NetworkPolicy templates created; cluster hardening checklist complete.

### 6. Secrets management in containers
- **Avoid env vars:** do not pass secrets via environment variables; use mounted secrets or volume projection.
- **External Secrets Operator:** sync secrets from Vault / AWS Secrets Manager / GCP Secret Manager into Kubernetes secrets.
- **CSI volume drivers:** mount secrets as files via CSI (secrets-store.csi.k8s.io); in-memory or encrypted volume.
- **KMS integration:** use envelope encryption for etcd; encrypt Kubernetes secrets at rest with KMS.

**Completion criterion:** secrets management design documented; injection method defined.

### 7. Monitoring and compliance
- **Audit logging:** enable Kubernetes audit logs; log to immutable storage; alert on suspicious RBAC changes.
- **Image attestation:** verify image provenance in admission control; reject unsigned or untrusted images.
- **Compliance checks:** CIS Kubernetes Benchmark; NSA / CISA Kubernetes Hardening Guide; SOC 2 controls.
- **Vulnerability management:** track CVEs by image and namespace; prioritise by severity and exploitability.

**Completion criterion:** monitoring and compliance runbook saved.

## Rules

- Rule: never run containers as root; enforce non-root in Pod Security Standards and Dockerfile.
- Rule: pin image digests in production; block mutable tags (latest, stable) in deployment pipelines.
- Rule: scan every image before it reaches production; block critical and high-severity findings automatically.
- Rule: default-deny all network traffic; allow only required ingress and egress paths with NetworkPolicy.
- Rule: store secrets in external secret stores (Vault, KMS, cloud secret manager); never embed secrets in images, ConfigMaps, or env vars.
- Rule: enable runtime security (Falco, Seccomp, AppArmor) and admission control for production clusters.
- Rule: apply least-privilege RBAC; review role bindings and service accounts quarterly; remove unused permissions.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml