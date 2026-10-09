---
name: "cloud-security"
category: "sec"
maturity: "stable"
version: "1"
description: "Cloud security (AWS, GCP, Azure, IAM, KMS, security groups, compliance, posture management)"
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Security architecture saved; IAM reviewed; compliance matrix complete; posture runbook documented."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "security"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/cloud-security.json"
diataxis: "how-to"
tags: ["sec"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: cloud provider (AWS / GCP / Azure), workload architecture, compliance requirements.
- Output: cloud security architecture + IAM review + compliance matrix + CSPM runbook.
- Scope: designs and audits cloud security; does not provision resources.
- Rule: designs and audits cloud security; does not provision resources.
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

Emit `CloudSecurityArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/cloud-security/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Cloud Security

Design and audit **cloud security** for AWS, GCP, and Azure — IAM, KMS, network controls, compliance, and posture management.

## Process

### 1. Asset and data inventory
- Enumerate cloud resources: compute, storage, databases, networking, serverless, containers.
- Classify data by sensitivity (public, internal, confidential, secret).
- Map data flows across regions and accounts.

**Completion criterion:** cloud asset inventory and data classification saved.

### 2. IAM design and review
- **Identity sources:** IdP (SAML, OIDC, LDAP); avoid local users where possible.
- **Roles and permissions:** least-privilege; separate duties; no wildcard actions on sensitive services.
- **Service accounts:** disable default credentials; use workload identity / IAM roles for service accounts (IRSA / Workload Identity).
- **Cross-account access:** use roles with explicit trust policies; avoid long-lived keys.
- **MFA:** enforce MFA for all human users; MFA-protected API access.
- **Access reviews:** periodic review of unused permissions and stale accounts.

**Completion criterion:** IAM design reviewed; least-privilege gaps documented.

### 3. Key management and encryption
- **KMS:** use cloud KMS (AWS KMS, GCP Cloud KMS, Azure Key Vault); envelope encryption for large datasets.
- **Key rotation:** automatic rotation (annual for data keys; more frequent for session keys).
- **Access control on keys:** restrict key usage to specific roles and services; use key policies / IAM conditions.
- **At-rest encryption:** enable by default for storage (S3, GCS, Blob), databases (RDS, Cloud SQL, Cosmos), block storage.
- **In-transit encryption:** TLS 1.3 for all endpoints; disable unencrypted protocols.

**Completion criterion:** KMS and encryption design documented; rotation schedule defined.

### 4. Network security
- **Security groups / firewall rules:** deny all by default; allow only required ports and sources; avoid 0.0.0.0/0 on sensitive ports.
- **NACLs and network policies:** layer-4 controls for subnet-level restrictions.
- **Private connectivity:** use VPC endpoints / Private Service Connect; avoid public IPs for internal services.
- **DNS security:** enable DNS logging; use private DNS zones; protect against DNS hijacking.
- **DDoS protection:** enable cloud-native DDoS (Shield, Cloud Armor, DDoS Protection Standard).

**Completion criterion:** network security baseline documented; exceptions justified.

### 5. Compliance mapping
- **Frameworks:** SOC 2 (CC6, CC7), PCI-DSS (req 2, 3, 6, 8, 10, 12), HIPAA (164.312), CIS Controls (IG1/IG2), FedRAMP (Moderate / High).
- **Control mapping:** map each cloud control (encryption, logging, IAM, network) to framework requirements.
- **Evidence collection:** enable audit logs (CloudTrail, Cloud Audit Logs, Activity Log); store logs immutably.
- **Gap analysis:** identify controls not met; document compensating controls or remediation plans.

**Completion criterion:** compliance matrix complete; gaps and compensating controls documented.

### 6. Cloud security posture management (CSPM)
- **Tooling:** enable native CSPM (AWS Security Hub, GCP Security Command Center, Azure Defender) and/or third-party (Wiz, Prisma, Lacework).
- **Checks:** misconfigured storage (public S3/GCS/Blob), overly permissive IAM, unencrypted services, exposed secrets.
- **Automation:** auto-remediate low-severity findings (e.g., public bucket alerts); manual review for high-severity.
- **Continuous monitoring:** dashboards for open findings, trend analysis, mean-time-to-remediate (MTTR).

**Completion criterion:** CSPM runbook complete; dashboards and alerting configured.

### 7. Incident response and logging
- **Logging:** enable and centralise audit logs, VPC flow logs, application logs, Kubernetes audit logs.
- **Alerting:** define alert thresholds for anomalous IAM activity, data exfiltration indicators, privilege escalation.
- **Runbooks:** document response playbooks for common incidents (public bucket, compromised IAM key, DDoS, data breach).
- **Forensics:** enable immutable log storage; snapshot capabilities for compute and storage.

**Completion criterion:** incident response runbook saved; logging and alerting verified.

## Rules

- Rule: enforce least-privilege IAM with deny-by-default; review and remove excess permissions quarterly.
- Rule: enable encryption at rest and in transit for all sensitive data; never store secrets in resource names or tags.
- Rule: use cloud-native security tools before third-party solutions; document exceptions.
- Rule: map every compliance requirement to a verifiable control and evidence source.
- Rule: never grant cloud admin / owner role to service accounts or CI/CD pipelines without explicit approval and just-in-time access.
- Rule: enable multi-factor authentication (MFA) for all human identities; use workload identity for machines.
- Rule: implement network segmentation and private connectivity for all internal traffic; public exposure must be explicitly justified.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml