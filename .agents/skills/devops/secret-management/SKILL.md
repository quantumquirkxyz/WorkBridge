---
name: "secret-management"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Design secret management — Vault, SOPS, SealedSecrets, rotation, external secrets — with encryption, access control, and auditability."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Architecture diagram saved; access policy documented; rotation runbook complete; integration plan filled."
risk: "medium"
trustTier: "3"
maxIterations: "7"
promptVersion: "2.0"
artifactType: "devops"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/secret-management.json"
diataxis: "how-to"
tags: ["devops"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: application secrets inventory, compliance requirements, infrastructure environment, team structure.
- Output: secret management architecture + access policy + rotation runbook + integration plan.
- Scope: designs secret management; does not provision production secrets or policies unless explicitly instructed.
- Rule: designs secret management; does not provision production secrets or policies unless explicitly instructed.
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

Emit `SecretManagementArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/secret-management/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Secret Management

Design a **secret management** strategy using HashiCorp Vault, SOPS, SealedSecrets, or cloud KMS with encryption, access control, rotation, and auditability.

## Process

### 1. Frame the secret management problem
- Secret inventory: database credentials, API keys, TLS certificates, cloud provider keys, service accounts, encryption keys.
- Compliance requirements: PCI-DSS, SOC 2, HIPAA, GDPR; encryption at rest and in transit; key rotation frequency.
- Environment separation: dev / staging / production isolation; secret namespacing.
- Threat model: insider threat, supply chain compromise, cluster compromise, exfiltration paths.

**Completion criterion:** secret inventory documented; compliance requirements stated; threat model defined.

### 2. Secret store selection and architecture
- Store options: HashiCorp Vault (full-featured, dynamic secrets, HSM backing), cloud KMS (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault), SOPS + age/GPG (encrypted files in Git), SealedSecrets (Kubernetes-native, Git-friendly).
- Architecture: where secrets live (central Vault, per-environment, per-cluster); how workloads access them (sidecar, init container, CSI driver, SDK).
- Encryption: envelope encryption; key hierarchy (master key, data encryption key, per-secret key); HSM or cloud KMS backing.
- Backup and recovery: Vault snapshots, cloud KMS redundancy, recovery procedures.

**Completion criterion:** secret store selected with architecture diagram; encryption strategy defined.

### 3. Access policies and authentication
- Authentication methods: Kubernetes service account, cloud IAM, LDAP, OIDC, AppRole, GitHub Actions OIDC.
- Authorisation: path-based policies, least-privilege, namespace isolation, time-bound tokens (TTL).
- Service accounts: per-service identity; short-lived dynamic credentials where possible.
- Audit logging: who accessed which secret, when, from where; log retention and alerting.

**Completion criterion:** access policy and authentication matrix saved.

### 4. Secret rotation and lifecycle
- Rotation triggers: time-based (90 days for TLS, 30 days for API keys), event-based (employee offboarding, suspected compromise).
- Rotation process: generate new secret, update workload config, verify health, revoke old secret.
- Lifecycle: creation, rotation, expiration, revocation; stale secret cleanup.
- Zero-downtime rotation: rolling restart, dual-credential period, health checks during rotation.

**Completion criterion:** rotation and lifecycle runbook saved with zero-downtime procedure.

### 5. CI/CD and runtime integration
- CI/CD injection: GitHub Actions OIDC to Vault; no long-lived CI secrets; ephemeral credentials.
- Runtime injection: CSI driver (Secrets Store CSI), init container, sidecar, or Vault Agent Injector.
- Config management: distinguish config (non-sensitive) from secrets; use ConfigMap + Secret pattern.
- Development workflow: local secret mocking (env vars, file-based Vault dev mode); never commit real secrets.

**Completion criterion:** integration plan saved with CI/CD and runtime patterns.

## Rules

- Rule: treat secrets as high-value assets; apply least-privilege access and time-bound tokens.
- Rule: never store plaintext secrets in Git; use encryption (SOPS, SealedSecrets) or external stores (Vault, cloud KMS).
- Rule: implement automated rotation for all long-lived secrets; document zero-downtime rotation procedure.
- Rule: enable audit logging for all secret access; retain logs per compliance requirement; alert on anomalous access patterns.
- Rule: separate dev, staging, and production secrets; never reuse production secrets in lower environments.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml