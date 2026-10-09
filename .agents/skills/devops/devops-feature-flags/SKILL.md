---
name: "devops-feature-flags"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Design feature flag systems — gradual rollouts, A/B experiments, kill switches, targeting rules — with lifecycle management and operational runbooks."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Lifecycle documented; targeting rules defined; flag inventory saved."
risk: "medium"
trustTier: "3"
maxIterations: "4"
promptVersion: "2.0"
artifactType: "feature-flag"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/devops-feature-flags.json"
diataxis: "how-to"
tags: ["devops"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: features to control, rollout requirements, environments.
- Output: flag lifecycle + targeting rules + inventory.
- Scope: designs flag system; does not deploy flags unless explicitly instructed.
- Rule: designs flag system; does not deploy flags unless explicitly instructed.
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

Emit `DevopsFeatureFlagsArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/devops-feature-flags/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Feature Flag System Design

Design a **feature flag system** — rollouts, targeting, kill switches — with lifecycle management and operational runbooks.

## Process

### 1. Flag types
- **Release flag:** hide unfinished features from users; enable in dev/staging.
- **Experiment flag:** A/B test; percentage split; metric tracking.
- **Ops flag:** kill switch / circuit breaker (e.g. disable expensive recommendation engine).
- **Permission flag:** gradual rollout to user segments (beta users, tiers, regions).

**Completion criterion:** flag types mapped to features.

### 2. Lifecycle design
Every flag goes through:
1. **Created:** default off.
2. **Gradual rollout:** 1% → 10% → 50% → 100%.
3. **Full release:** flag kept for quick rollback or removed if not needed.
4. **Retired:** removed from code within N sprints.

**Completion criterion:** lifecycle documented per flag type.

### 3. Targeting rules
- Percentage-based (random or deterministic).
- User segment (tier, region, language, plan type).
- Environment (dev / staging / prod).
- Custom rules (date-based, device type, account age).

**Completion criterion:** targeting rules template saved.

### 4. Kill switches and emergency rollback
- Ops flags: what to do if the flag causes an outage? (disable immediately; have runbook)
- Rollback time: must be < 5 minutes for critical paths.
- Alert: flag change should trigger an alert to on-call.

**Completion criterion:** kill switch runbook saved.

### 5. Flag inventory
Per flag: name, owner, purpose, type, created date, retirement date, dependencies.

**Completion criterion:** inventory saved and reviewed quarterly.

### 6. Deliver
Flag lifecycle document + targeting rules template + flag inventory.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml