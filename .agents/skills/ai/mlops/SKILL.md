---
name: "mlops"
category: "ai"
maturity: "stable"
version: "1"
description: "MLOps (feature stores, model registry, data versioning, pipeline orchestration, monitoring, retraining)"
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Registry green; pipelines passing; model validated; monitoring active."
risk: "medium"
trustTier: "3"
maxIterations: "8"
promptVersion: "2.0"
artifactType: "ai"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/mlops.json"
diataxis: "how-to"
tags: ["ai"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: dataset description, model class, performance target, operational constraint.
- Output: feature store contract + model registry + data version + pipeline manifest + monitoring + trigger policy.
- Scope: manages ML operations; does not build model weights from scratch.
- Rule: manages ML operations; does not build model weights from scratch.
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

Emit `MlopsArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/mlops/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# MLOps

Operate ML systems with reproducibility, validation, and monitoring.

## Process

### 1. Feature store contract
Schema: feature names, types, units, null policy, default.
Point-in-time rules: avoid leakage with event time and processing time.
Window specs: tumbling, sliding, session; aggregation; late arrival policy.
Validation: on write, on read, on retraining.

**Completion criterion:** feature store contract with lineage and reproduction steps.

### 2. Model registry
Run metadata: git sha, docker image, dataset version, hyperparameters, env.
Artifacts: model weights, tokenizer, config, card.
Promotion: staging -> production after acceptance suite green.
Rollback: prior tagged version with reproduction and reconciliation.

**Completion criterion:** registry manifest with validation result and promotion state.

### 3. Data version and lineage
Manifest: dataset hash, split ratios, timestamp, license, source.
Lineage: upstream tables, joins, filters, aggregation.
Reproduction: command, docker image, env vars, secrets, output path.

**Completion criterion:** data version manifest with lineage and reproduction steps.

### 4. Pipeline orchestration
Trigger: schedule, webhook, or retraining policy.
Steps: build, validate, train, evaluate, register, deploy.
Artifacts: images, weights, metrics, cards.
Rollback: prior tagged deploy with reconciliation.

**Completion criterion:** pipeline manifest with schedule, image, secrets, rollback, alert.

### 5. Monitoring
Drift: feature, label, concept; method: KS test, PSI, DDM.
Performance: latency, error rate, business metric, token usage.
Regression gate: no metric drops beyond threshold.
Alert: pager, slack, or runbook link.

**Completion criterion:** monitoring config with drift, latency, error, regression gate, alert.

### 6. Retraining triggers
Metric: acceptance metric, drift, latency, error, token budget.
Threshold: absolute or relative; window: day, week, month.
Approval: data QA, model QA, security, SRE, product.
Backfill: retrain from scratch or incremental; lineage preserved.

**Completion criterion:** trigger policy with metric, threshold, window, approval, backfill.

## Rules

- No deploy without acceptance suite green.
- No retrain without data QA and model QA green.
- No backfill without lineage preserved and validation green.
- No drift ignored without regression gate and rollback tested.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml