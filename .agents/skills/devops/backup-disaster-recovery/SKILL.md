---
name: "backup-disaster-recovery"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Design backup and disaster recovery — RPO/RTO, backup strategies, restore testing, cross-region — with explicit recovery objectives and validation."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Architecture diagram saved; recovery objectives matrix complete; backup strategy documented; restore testing plan filled."
risk: "medium"
trustTier: "3"
maxIterations: "7"
promptVersion: "2.0"
artifactType: "devops"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/backup-disaster-recovery.json"
diataxis: "how-to"
tags: ["devops"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: service inventory, data criticality, compliance requirements, current backup posture, recovery time targets.
- Output: backup and DR architecture + recovery objectives matrix + backup strategy + restore testing plan.
- Scope: designs backup and DR strategy; does not execute production failover or data deletion unless explicitly instructed.
- Rule: designs backup and DR strategy; does not execute production failover or data deletion unless explicitly instructed.
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

Emit `BackupDisasterRecoveryArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/backup-disaster-recovery/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Backup and Disaster Recovery

Design a **backup and disaster recovery** strategy with explicit recovery objectives (RPO/RTO), backup strategies, restore testing, and cross-region resilience.

## Process

### 1. Frame the backup and DR problem
- Service inventory: databases, object storage, message queues, configuration, secrets, container images.
- Data criticality: tier 1 (transactional, revenue-generating), tier 2 (operational), tier 3 (analytics, logs).
- Compliance: retention requirements (legal, regulatory, contractual), data sovereignty, encryption.
- Current posture: existing backup tools, schedules, retention, restore history, known gaps.

**Completion criterion:** service inventory documented; criticality tiers defined; compliance requirements stated.

### 2. Recovery objectives
- RPO (Recovery Point Objective): maximum acceptable data loss per service.
- RTO (Recovery Time Objective): maximum acceptable downtime per service.
- RSL (Recovery Service Level): acceptable degraded mode during recovery.
- Per-service matrix: database RPO/RTO, object storage RPO/RTO, configuration RPO/RTO, message queue RPO/RTO.
- Alignment with business: acceptable downtime per revenue impact; SLA commitments.

**Completion criterion:** recovery objectives matrix saved with per-service RPO, RTO, and RSL.

### 3. Backup strategy
- Backup types: full, incremental, differential, continuous (WAL archiving, change data capture).
- Backup scope: data only, data + configuration + secrets, full system snapshot.
- Storage: local (same region), cross-region, off-site, immutable (object lock, WORM).
- Retention: short-term (daily, weekly), long-term (monthly, yearly); legal hold; automated expiry.
- Encryption: encryption at rest; key management; access control for backup storage.

**Completion criterion:** backup strategy documented with types, scope, storage locations, and retention policy.

### 4. Cross-region and multi-cloud DR
- Topology: active-active, active-passive, pilot light, warm standby, cold standby.
- Replication: synchronous (zero RPO, high latency), asynchronous (low latency, non-zero RPO), hybrid.
- DNS and traffic routing: failover DNS, anycast, load balancer health checks, split-horizon DNS.
- Data consistency: eventual consistency tolerance; conflict resolution; last-write-wins vs CRDT.
- Cloud provider diversification: multi-cloud DR to avoid single-provider outages.

**Completion criterion:** cross-region DR topology documented with replication mode and failover trigger.

### 5. Restore testing and validation
- Testing cadence: quarterly full restore, monthly critical service restore, weekly automated backup verification.
- Test scope: restore to isolated environment; verify data integrity, application functionality, performance.
- Automation: automated restore jobs with pass/fail reporting; synthetic transactions post-restore.
- Documentation: restore runbooks with step-by-step commands, expected duration, rollback on failure.

**Completion criterion:** restore testing plan documented with cadence, scope, automation, and pass/fail criteria.

### 6. Failover and runbooks
- Failover triggers: RTO breach, data corruption, regional outage, manual decision.
- Failover process: DNS switch, traffic routing, database promotion, cache warm-up, health checks.
- Communication: incident commander, stakeholder notifications, status page updates.
- Rollback: criteria for returning to primary; data reconciliation post-failback; learning review.

**Completion criterion:** failover runbook saved with triggers, process, communication plan, and rollback criteria.

## Rules

- Rule: define RPO and RTO per service before designing backup or DR topology.
- Rule: store backups in at least two locations, one off-site or cross-region; use immutable storage where possible.
- Rule: test restores regularly; untested backups are not backups.
- Rule: automate backup verification with integrity checks and synthetic post-restore validation.
- Rule: document failover and rollback runbooks with explicit triggers, steps, and communication plans.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml