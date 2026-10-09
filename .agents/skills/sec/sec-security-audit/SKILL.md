---
name: "sec-security-audit"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Audit software/security posture — code review, dependency scanning, secret detection, access control, audit logging — with explicit findings and remediation priorities."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Audit report complete; findings classified by severity; recommendations made."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "security"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/sec-security-audit.json"
diataxis: "how-to"
tags: ["sec"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: code repository or system description, threat model (optional).
- Output: audit report with severity-classified findings.
- Scope: finds and classifies; does not patch or deploy fixes (remediation is separate).
- Rule: finds and classifies; does not patch or deploy fixes (remediation is separate).
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

Emit `SecSecurityAuditArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/sec-security-audit/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Security Audit

Audit a **system or codebase** for security vulnerabilities — with explicit findings, severity, and remediation priorities.

## Process

### 1. Scope
State: codebase / service / infrastructure / policy; what is in scope (all code, specific module, API, database); what is out of scope (third-party SaaS, physical security).

**Completion criterion:** scope saved.

### 2. Threat model (optional but recommended)
Identify assets (data, services, credentials), threats (unauthorised access, data breach, denial of service), vulnerabilities, and mitigations.

**Completion criterion:** threat model saved if used.

### 3. Code review
Review for:
- Input validation (SQL injection, XSS, command injection, path traversal).
- Authentication / authorisation (broken access control, privilege escalation).
- Cryptography (weak algorithms, hardcoded keys, improper IV).
- Sensitive data exposure (logs, error messages, API responses).
- Dependency vulnerabilities (outdated libraries, known CVEs).

**Completion criterion:** review notes saved; findings linked to CWE / OWASP categories.

### 4. Dependency / secret scan
- Scan dependencies for CVEs.
- Search for secrets (API keys, passwords, tokens) in source.
- Check for hardcoded credentials.

**Completion criterion:** dependency and secret scan results saved.

### 5. Classify findings
For each finding: severity (Critical / High / Medium / Low / Informational); evidence (line, snippet); recommendation (fix, architecture change, process change).

**Completion criterion:** findings table complete.

### 6. Remediation priorities
Prioritise by: severity × likelihood × business impact. Suggest quick wins (low effort, high impact) first.

**Completion criterion:** remediation checklist with priority.

### 7. Report
Markdown artifact with: scope, methodology, findings table, recommendations, and a note on limitations (what was not tested).

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml