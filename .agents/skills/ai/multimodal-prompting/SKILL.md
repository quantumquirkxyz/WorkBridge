---
name: "multimodal-prompting"
category: "ai"
maturity: "stable"
version: "1"
description: "Multimodal prompting (vision, audio, video, image generation, vision-language models)"
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Each modality green on acceptance suite with validation and fallback."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "pull-request"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/multimodal-prompting.json"
diataxis: "how-to"
tags: ["ai"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: task description, modality specs, acceptance criteria, edge cases.
- Output: prompt library + generation contract + validation suite + fallback discipline.
- Scope: designs and validates multimodal prompts; does not deploy to production.
- Rule: designs and validates multimodal prompts; does not deploy to production.
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

Emit `MultimodalPromptingArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/multimodal-prompting/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Multimodal Prompting

Compose prompts and contracts for vision, audio, video, and image generation with discipline.

## Process

### 1. Modality specs
Vision: image size, format, color space, resolution, compression; chart, diagram, document.
Audio: sample rate, channels, format, duration, noise floor, transcript.
Video: frame rate, resolution, duration, codec, keyframe interval; event, action, scene.
Image generation: size, format, style, subject, background, composition.

**Completion criterion:** modality specs with acceptance and edge cases.

### 2. Prompt design
Vision: intent, image, OCR, diagram, chart, focus, attention.
Audio: intent, transcript, event, focus, attention.
Video: intent, event, action, scene, focus, attention.
Image generation: intent, style, composition, subject, background, reference.

**Completion criterion:** prompt design with examples and acceptance.

### 3. Chain-of-thought and RAG
Chain-of-thought: reasoning with image, audio, video, generation.
RAG: retrieval from image, audio, video, generation corpus.
Composition: prompt chain, retrieval, generation, validation.

**Completion criterion:** chain-of-thought or RAG with composition and validation.

### 4. Validation suite
Acceptance: human check, machine check, acceptance metric.
Edge: edge cases with acceptance and edge checks.
Fallback: fallback with acceptance and escalation checks.
Escalation: human, circuit breaker, pager.

**Completion criterion:** validation suite with acceptance, edge, fallback, escalation checks.

### 5. Fallback and escalation
Parse failure: retry with repair, fallback to simpler model, circuit breaker, pager.
Fallback: simpler output, human, template, or rule.
Retry: exponential backoff, retry budget, circuit breaker, pager.

**Completion criterion:** fallback and escalation discipline with retry, fallback, circuit breaker, pager.

## Rules

- No modality accepted without acceptance suite green.
- No generation contract accepted without edge cases green.
- No fallback accepted without escalation path tested.
- No human check omitted for high-stakes or safety-critical modalities.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml