---
name: "ai-ml-pipeline"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Design ML pipelines — data ingestion, preprocessing, training, evaluation, deployment, monitoring — with reproducibility, fairness, and version control."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Pipeline architecture saved; training report complete; deployment checklist filled."
risk: "medium"
trustTier: "3"
maxIterations: "8"
promptVersion: "2.0"
artifactType: "ai"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/ai-ml-pipeline.json"
diataxis: "how-to"
tags: ["ai"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: dataset description, problem type, performance target.
- Output: pipeline architecture + training report + deployment checklist.
- Scope: designs pipeline; does not train production models unless explicitly executed.
- Rule: designs pipeline; does not train production models unless explicitly executed.
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

Emit `AiMlPipelineArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/ai-ml-pipeline/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# ML Pipeline Design

Build a **machine-learning pipeline** from data to deployed model with reproducibility and fairness checks.

## Process

### 1. Frame the problem
State: supervised / unsupervised / reinforcement; classification / regression / clustering; time-series / tabular / image / text / tabular-time-series.

**Completion criterion:** problem type named; target metric defined.

### 2. Data design
- Source (database, API, file store, synthetic).
- Schema (features, target, weights, time stamps).
- Preprocessing (imputation, encoding, scaling, feature engineering, augmentation).
- Train / validation / test split; stratification if needed.

**Completion criterion:** data schema and split strategy documented.

### 3. Model selection
- Baseline (simple: logistic regression, linear, random forest, XGBoost).
- Advanced (deep learning, transformers, ensembles).
- Selection criteria: interpretability vs performance vs resource cost.

**Completion criterion:** model family selected with justification.

### 4. Training design
- Loss function; optimiser; learning rate schedule.
- Cross-validation strategy (k-fold, time-series split, stratified).
- Regularisation (L2, dropout, early stopping, data augmentation).
- Reproducibility: seed, versioned library, container.

**Completion criterion:** training plan documented with seeds and versions.

### 5. Evaluation
- Metrics aligned with business goal (accuracy / F1 / ROC-AUC / MAE / RMSE / log-loss / lift / ranking metrics).
- Validation vs test distinction; no lookahead.
- Error analysis (confusion matrix, worst-case examples, subgroup differences / fairness audit).

**Completion criterion:** evaluation report with subgroup fairness check.

### 6. Deployment and monitoring
- Model registry (MLflow, DVC, Weights & Biases).
- Container (Docker / Kubernetes) with pinned versions.
- Monitoring: drift (data / concept / performance), latency, error rate.
- Rollback plan.

**Completion criterion:** deployment checklist complete; monitoring rules defined.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml