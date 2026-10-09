---
name: "ai-model-evaluation"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Evaluate ML / LLM models — accuracy, fairness, robustness, explainability, drift — with explicit metrics, subgroup analysis, and failure-mode reporting."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Report saved; subgroup analysis complete; failure modes documented; recommendation made."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "model"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/ai-model-evaluation.json"
diataxis: "how-to"
tags: ["ai"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: model predictions, ground truth, subgroup labels, feature data.
- Output: evaluation report with recommendation.
- Scope: evaluates; does not deploy.
- Rule: evaluates; does not deploy.
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

Emit `AiModelEvaluationArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/ai-model-evaluation/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Model Evaluation

Evaluate a **machine-learning or LLM model** with metrics, subgroup fairness, robustness, and explainability — and recommend deployment or revision.

## Process

### 1. Define metrics
Select metrics aligned with the problem:
- Classification: accuracy, precision, recall, F1, ROC-AUC, PR-AUC, log-loss, Cohen's kappa.
- Regression: MAE, RMSE, MAPE, R², explained variance.
- Ranking / recommendation: NDCG, MAP, hit-rate, lift.
- LLM: BLEU, ROUGE, BERTScore (not just human preference).

**Completion criterion:** metrics named; justification stated.

### 2. Subgroup / fairness analysis
Split predictions by subgroup: gender, age, race, region, income, language.
Compute:
- Demographic parity (P(pred=1 | group))
- Equalised odds (TPR/FPR equality)
- Calibration (predicted probability matches observed rate)
- Performance gap (F1 difference between groups)

Report the largest gap and whether it exceeds an acceptable threshold.

**Completion criterion:** subgroup tables saved; largest gap reported.

### 3. Robustness
Test under perturbation:
- Adversarial examples (FGSM, PGD for images; word substitution for text).
- Noise (Gaussian, dropout, label noise).
- Distribution shift (test on a different domain / time period).

**Completion criterion:** robustness results with failure examples.

### 4. Explainability
- Feature importance (SHAP, permutation, mutual information).
- Counterfactual: what minimal change flips the prediction?
- Attention maps / saliency (for vision / NLP).

**Completion criterion:** explanation method applied to worst-case examples.

### 5. Failure-mode analysis
From confusion matrix or error set:
- Which cases are wrong? (false positives, false negatives, outliers)
- Is the error systematic (bias) or random?
- What does the failure reveal about model limits?

**Completion criterion:** failure-mode section with examples.

### 6. Recommendation
- Deploy if: metrics exceed thresholds; fairness gaps below threshold; robustness acceptable; failure modes understood and mitigated.
- Revise if: weak on one dimension but fixable.
- Do not deploy if: large fairness gap; brittle to shift; failure modes dangerous.

**Completion criterion:** recommendation with explicit conditions.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml