---
name: "ux-research"
category: "ux"
maturity: "stable"
version: "1"
description: "Conduct user research — interviews, surveys, usability testing, personas, journey mapping — to ground design decisions in real user behavior."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Conduct user research complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "research"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/ux-research.json"
diataxis: "how-to"
tags: ["ux"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: skill invocation with the user's request and available context.
- Output: a structured artifact or guidance aligned to the skill's declared outputs.
- Scope: stay within the skill's declared boundaries; do not broaden without explicit direction.
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

Emit `UxResearchArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/ux-research/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# ux-research

Conduct user research — interviews, surveys, usability testing, personas, journey mapping — to ground design decisions in real user behavior.

## Goals
- Understand user needs, mental models, and pain points
- Create actionable personas and journey maps
- Generate testable hypotheses from qualitative data
- Communicate findings to the team


## Methods

| Method | Best for | Output |
|---|---|---|
| User interview | Discovering needs and mental models | Quotes, themes |
| Usability test | Evaluating existing solutions | Task success, friction points |
| Survey | Quantifying attitudes at scale | Statistical patterns |
| Card sorting | Information architecture | Category structures |
| Journey map | End-to-end experience | Touchpoint analysis |

## Steps

1. **Define research questions** — what do we need to know and why
2. **Choose methods** — match method to question and timeline
3. **Recruit participants** — target the right user segments
4. **Conduct research** — follow ethical guidelines, take notes
5. **Analyze findings** — affinity mapping, theme extraction
6. **Synthesize** — personas, journey maps, insights
7. **Share** — present to stakeholders with evidence

## Rules

- Rule: define the research question before selecting methods.
- Rule: recruit participants who match the target behavior or decision context.
- Rule: separate observed behavior, direct quotes, interpretation, and recommendations.
- Rule: protect participant privacy and avoid collecting unnecessary sensitive data.
- Rule: tie design implications back to evidence strength and sample limits.

## References
- `../interaction-design/SKILL.md` — design from research
- `../../frontend/frontend-design/SKILL.md` — translating research to UI

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml