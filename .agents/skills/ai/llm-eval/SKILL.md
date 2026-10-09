---
name: "llm-eval"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Design LLM evaluation harnesses — benchmark design, model comparison, automated evals — with reproducible scoring, confidence intervals, and regression detection."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Benchmark suite defined; comparison protocol documented; harness configuration complete."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "ai"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/llm-eval.json"
diataxis: "how-to"
tags: ["ai"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: model list or candidate, task description, quality bar, budget constraints.
- Output: benchmark suite + comparison report + harness configuration.
- Scope: designs and documents evaluation; does not approve production model changes unless explicitly instructed.
- Rule: designs and documents evaluation; does not approve production model changes unless explicitly instructed.
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

Emit `LlmEvalArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/llm-eval/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# LLM Evaluation Harness

Design an **LLM evaluation harness** — benchmark design, model comparison, automated evals — with reproducible scoring, confidence intervals, and regression detection.

## Process

### 1. Define evaluation scope
- Task types (classification, generation, reasoning, coding, tool use).
- Model candidates (base, instruct, fine-tuned, RAG-augmented).
- Success criteria (accuracy threshold, cost ceiling, latency ceiling).
- Evaluation audience (internal review, external publication, regulatory).

**Completion criterion:** evaluation scope and success criteria documented.

### 2. Benchmark design
- Task set (size, difficulty distribution, contamination checks).
- Prompt templates (system, few-shot, chain-of-thought variants).
- Golden answers or reference outputs (human-written or high-quality model outputs).
- Input formatting and sanitisation.

**Completion criterion:** benchmark tasks, prompts, and golden answers defined.

### 3. Scoring rubrics
- Automatic metrics (exact match, F1, BLEU, ROUGE, BERTScore, code pass rate).
- LLM-as-judge (structured rubric, pairwise comparison, calibration).
- Human-in-the-loop (sampling plan, adjudication rules, inter-annotator agreement).
- Confidence intervals and statistical tests (t-test, bootstrap, ANOVA).

**Completion criterion:** scoring rubric with calibration plan defined.

### 4. Model comparison protocol
- Paired evaluation (same prompts, same order, same grader).
- Blind or anonymised labels to reduce bias.
- Cost and latency tracking (tokens, wall time, $/1K tokens).
- Regression detection (delta thresholds, alerting rules).

**Completion criterion:** comparison protocol with regression rules defined.

### 5. Harness configuration
- Runner (local, distributed, CI-triggered).
- Model access (API keys, rate limiting, retries, fallback models).
- Result storage (database, artifact store, versioned dataset).
- CI integration (PR gating, scheduled runs, diff alerts).

**Completion criterion:** harness configuration with CI integration defined.

### 6. Reporting
- Leaderboard (primary metric, secondary metrics, cost/latency columns).
- Statistical significance (p-values, confidence intervals, effect sizes).
- Error analysis (failure modes, prompt sensitivity, edge cases).
- Reproducibility checklist (seeds, versions, environment).

**Completion criterion:** report template with reproducibility checklist defined.

## Rules

- Rule: separate test set from development set; never tune prompts on test data.
- Rule: report variance across runs (temperature, sampling, seeds) alongside point estimates.
- Rule: track cost and latency as first-class metrics, not afterthoughts.
- Rule: version prompts, datasets, and model snapshots together for reproducibility.
- Rule: define regression thresholds before running experiments to avoid p-hacking.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml