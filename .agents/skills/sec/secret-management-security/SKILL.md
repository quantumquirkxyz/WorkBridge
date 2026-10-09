---
name: "secret-management-security"
category: "sec"
maturity: "stable"
version: "1"
description: "Secrets management (Vault, KMS, rotation, injection, external secrets operator)"
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Secrets architecture saved; rotation schedule defined; injection design documented; audit complete."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "security"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/secret-management-security.json"
diataxis: "how-to"
tags: ["sec"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: secret types (API keys, database credentials, certificates, tokens), runtime environments (Kubernetes, VMs, serverless), compliance requirements.
- Output: secrets management architecture + rotation schedule + injection design + audit findings.
- Scope: designs and audits secrets management; does not rotate live production secrets without explicit approval.
- Rule: designs and audits secrets management; does not rotate live production secrets without explicit approval.
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

Emit `SecretManagementSecurityArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/secret-management-security/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Secret Management Security

Design and audit **secrets management** — Vault, KMS, rotation, injection, and External Secrets Operator — with explicit lifecycle controls and leakage prevention.

## Process

### 1. Secrets inventory and classification
- Enumerate all secrets: API keys, database credentials, TLS certificates, OAuth tokens, service account keys, signing keys.
- Classify by sensitivity: low (public API key with rate limit), medium (internal service key), high (database root, signing key).
- Map secret owners, rotation schedules, and storage locations.

**Completion criterion:** secrets inventory and classification saved.

### 2. Secrets management architecture
- **Vault (HashiCorp):** dynamic secrets (database, cloud), transit secrets engine, key versioning, audit logging, HSM backing.
- **Cloud KMS:** AWS Secrets Manager / KMS, GCP Secret Manager / Cloud KMS, Azure Key Vault; use for cloud-native workloads.
- **Hybrid approach:** Vault for dynamic secrets and complex policies; cloud KMS for envelope encryption and workload-specific secrets.
- **High availability:** Vault cluster (3+ nodes); cloud KMS is managed and HA by default.
- **Access control:** policies restricting who can read / write / rotate each secret; break-glass access for emergencies.

**Completion criterion:** architecture diagram saved; tool selection justified.

### 3. Secrets injection methods
- **Kubernetes:**
  - External Secrets Operator (ESO): sync secrets from Vault / cloud manager into Kubernetes Secrets; watch for changes.
  - CSI Secrets Store: mount secrets as files via volume; in-memory tmpfs; no etcd persistence for sensitive values.
  - Workload Identity / IRSA: use short-lived cloud credentials instead of long-lived keys.
- **VMs and serverless:**
  - Vault Agent: sidecar or init container injecting secrets into process environment or file.
  - Cloud-init / metadata service: avoid IMDSv1; use IMDSv2 with token; restrict metadata access via network policy.
  - Environment variables: avoid for high-sensitivity secrets; use file-based injection with restricted permissions.
- **CI/CD:**
  - Short-lived credentials from Vault or cloud IAM; never hardcode secrets in pipeline definitions.
  - Use OIDC federation (GitHub Actions, GitLab CI) to assume roles without long-lived keys.

**Completion criterion:** injection design documented per runtime; least-leakage method selected.

### 4. Rotation strategy
- **Automatic rotation:** use Vault dynamic secrets (database, cloud) for automatic rotation without downtime; short TTL (e.g., 1 hour) with renewal.
- **Scheduled rotation:** static secrets (API keys, certificates) on fixed schedule (90 days for API keys; annual for certificates; 30 days for high-sensitivity).
- **Rotation procedures:** playbook for manual rotation; coordinate with dependent services to avoid downtime.
- **Versioning:** keep previous secret version available during rotation window; revoke old version after confirmation.
- **Emergency rotation:** break-glass procedure for suspected compromise; revoke and regenerate immediately.

**Completion criterion:** rotation schedule saved per secret type; playbook documented.

### 5. Encryption at rest for secrets stores
- **etcd encryption:** enable KMS envelope encryption for Kubernetes secrets at rest; use cloud KMS or Vault as KMS provider.
- **Vault storage:** encrypted at rest (AES-256-GCM); seal / unseal with Shamir's secret sharing or cloud KMS auto-unseal.
- **Backup encryption:** encrypt secret store backups; store in separate location with separate access controls.

**Completion criterion:** encryption at rest design documented; key management for secrets store defined.

### 6. Audit and leakage prevention
- **Static analysis:** scan code, IaC, and container images for hardcoded secrets (git-secrets, truffleHog, gitleaks, detect-secrets).
- **Vault audit logs:** log all secret access (read, write, delete); alert on unusual patterns (bulk reads, access from new IPs).
- **Cloud audit logs:** log access to Secrets Manager / Key Vault; correlate with IAM activity.
- **Leak response:** runbook for exposed secrets (rotate, revoke, audit access logs, notify owners, assess blast radius).

**Completion criterion:** audit findings documented; leakage prevention controls in place; runbook saved.

### 7. Compliance mapping
- **SOC 2:** CC6.1 (logical access), CC6.7 (restrict transmission), CC6.8 (prevent unauthorised software).
- **PCI-DSS:** req 3 (protect stored cardholder data), req 7 (restrict access), req 8 (identify and authenticate).
- **HIPAA:** 164.312(a) (access control), 164.312(c) (integrity), 164.312(e)(1) (transmission security).
- **CIS Controls:** Control 4 (secure configuration), Control 6 (access control), Control 16 (application software security).

**Completion criterion:** compliance checklist complete; gaps documented.

## Rules

- Rule: never hardcode secrets in source code, IaC, container images, or environment variables; use a central secrets store.
- Rule: use short-lived dynamic secrets wherever possible; static secrets require explicit justification and rotation schedule.
- Rule: enforce least-privilege access to secrets stores; audit all secret reads and writes; alert on anomalies.
- Rule: encrypt secrets at rest in etcd, Vault storage, and backups; use KMS envelope encryption with separate key per environment.
- Rule: scan all code, IaC, and images for hardcoded secrets before merge; block if critical secrets found.
- Rule: rotate all static secrets on a defined schedule; emergency rotation runbook tested quarterly.
- Rule: avoid IMDSv1 and metadata service access from containers; use workload identity and short-lived tokens instead.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml