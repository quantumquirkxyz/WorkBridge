---
name: "incident-forensics"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Incident forensics (evidence collection, timeline reconstruction, root cause, reporting)"
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Evidence collected and hashed; timeline complete; root cause identified; report reviewed."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "sec"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/incident-forensics.json"
diataxis: "how-to"
tags: ["sec"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: incident description, affected systems, time window, evidence sources.
- Output: evidence inventory + timeline + root cause analysis + forensic report.
- Scope: investigates and documents; does not remediate, contain, or communicate the incident.
- Rule: investigates and documents; does not remediate, contain, or communicate the incident.
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

Emit `IncidentForensicsArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/incident-forensics/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Incident Forensics

Conduct a **digital forensic investigation** — evidence collection, timeline reconstruction, root cause analysis, and formal reporting — with integrity and chain-of-custody discipline.

## Process

### 1. Scope and authorisation
- Incident description: what happened, when, systems affected, suspected cause.
- Authorisation: legal / management approval to collect evidence; jurisdiction considerations.
- Scope: which systems, networks, accounts, time window, and data types are in scope.
- Preservation order: identify volatile data first (RAM, network connections, running processes) before touching disks.

**Completion criterion:** scope and authorisation documented.

### 2. Evidence collection
Collect with integrity:
- **Live system:** running processes, network connections, open files, memory dump, ARP/cache tables.
- **Disk / storage:** bit-level images (not file copies); use write blockers; verify image hash matches source.
- **Logs:** operating system (auditd, Sysmon, Windows Event Logs), application, network (flow, PCAP), cloud (CloudTrail, Audit Logs), SIEM alerts.
- **Artifacts:** browser history, download cache, prefetch / Shimcache, LNK files, registry hives, email headers, USB device history.
- **Metadata:** file timestamps (MACB), EXIF, email headers, DNS query logs, VPN logs.
- **Cloud / SaaS:** API audit logs, IAM access logs, S3 access logs, VPC flow logs, tenant admin actions.

For each item: source, collection method, collector, date/time (UTC), hash (SHA-256), storage location, chain of custody log.

**Completion criterion:** evidence inventory with hashes and chain-of-custody log saved.

### 3. Timeline reconstruction
Build a master timeline across all evidence sources:
- Normalise timestamps to UTC; account for timezone offsets and clock skew.
- Correlate events: log entry ↔ network flow ↔ file modification ↔ process creation.
- Identify gaps (missing logs, deleted events, overwritten data) and note uncertainty.
- Flag anomalies: logins at unusual times, mass data transfers, privilege escalations, failed authentications before success.

**Completion criterion:** chronological timeline with source citations saved.

### 4. Root cause analysis
Determine:
- **Trigger:** what initiated the incident? (phishing email, unpatched vulnerability, misconfiguration, stolen credential, supply chain compromise)
- **Attack path:** step-by-step from initial access to impact. Map to MITRE ATT&CK tactics and techniques where applicable.
- **Exploited vulnerability:** which CVE, misconfiguration, or control failure enabled the attack?
- **Contributing factors:** why did existing controls fail? (alert fatigue, coverage gap, delayed patching, missing segmentation)
- **Impact:** data accessed or exfiltrated, systems affected, services disrupted, regulatory notification obligations triggered.

**Completion criterion:** root cause documented with evidence links; contributing factors listed.

### 5. Indicator of compromise (IOC) extraction
Extract IOCs for detection and hunting:
- IP addresses, domains, URLs, hashes (MD5, SHA-1, SHA-256), email addresses, user agents, registry keys, file paths, mutex names, YARA / Sigma rules.
- Rate IOCs by confidence (confirmed, high, medium, low) and context (observed in this incident, variant of known TTPs).

**Completion criterion:** IOC list with confidence ratings saved.

### 6. Reporting
Produce a forensic report:
- **Executive summary:** what happened, impact, root cause, key recommendations (non-technical audience).
- **Scope and methodology:** systems examined, tools used, limitations (what could not be examined).
- **Evidence summary:** how evidence was collected and preserved.
- **Timeline:** detailed chronological event list.
- **Technical findings:** root cause, attack path, exploited vulnerabilities, IOCs.
- **Contributing factors:** control or process failures.
- **Recommendations:** immediate containment, short-term fixes, long-term improvements (preventive, detective, corrective controls).
- **Appendices:** evidence inventory, hashes, raw log excerpts, chain of custody, glossary.

**Completion criterion:** report reviewed for accuracy and completeness; peer review if required.

### 7. Legal and regulatory considerations
- Chain of custody: document every transfer of evidence; maintain integrity for admissibility.
- Notification triggers: GDPR (72 hours), HIPAA (60 days), state breach laws, PCI DSS (forensic investigation before chargeback disputes).
- Preservation letters / litigation hold: if legal action is anticipated, issue hold notices and suspend deletion policies.
- Privacy: redact personal data not relevant to the investigation from reports; minimise exposure.

**Completion criterion:** legal and regulatory checklist completed; hold notices issued if required.

## Rules

- Rule: collect volatile evidence first (RAM, network state) before touching disks or shutting down systems.
- Rule: always capture a cryptographic hash of every evidence item at collection time; verify before and after transfer.
- Rule: maintain a chain-of-custody log for every piece of evidence; gaps in custody weaken admissibility.
- Rule: normalise all timestamps to UTC and record timezone offsets; never rely on local system time alone.
- Rule: distinguish confirmed facts from inferences; label hypotheses as such and do not present them as findings.
- Rule: do not remediate or alter production systems during investigation unless authorised for containment; document any changes separately.
- Rule: extract IOCs in machine-readable form (STIX, JSON, Sigma, YARA) to enable automated detection and sharing.
- Rule: report findings with explicit evidence citations (log line, artifact hash, screenshot timestamp) so reviewers can verify independently.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml