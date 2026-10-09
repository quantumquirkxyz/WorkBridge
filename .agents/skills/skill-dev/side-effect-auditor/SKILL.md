---
name: "side-effect-auditor"
category: "skill-dev"
maturity: "stable"
version: "1"
description: "Audit skill side-effect, risk, trust tier, dependency, and boundary metadata against the actual workflow so mutating skills declare their operational authority honestly."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: ""
stopCondition: "Side-effect mismatches are classified with recommended frontmatter changes or the audited skills are confirmed consistent."
risk: "low"
trustTier: "1"
maxIterations: "5"
promptVersion: "2.0"
artifactType: "skill-dev"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/side-effect-auditor.json"
diataxis: "how-to"
tags: ["skill-dev"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: skill invocation with the user's request and available context.
- Output: a structured artifact or guidance aligned to the skill's declared outputs.
- Scope: stay within the skill's declared boundaries; do not broaden without explicit direction.
- Rule: follow the skill's completion criteria and stop condition exactly.

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

Emit `SideEffectAuditorArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/side-effect-auditor/{identifier}.json`
- Markdown view: same filename with `.md` extension


## 
## 
## Rules

- Rule: inspect both frontmatter and body instructions before deciding whether side effects are accurate.
- Rule: treat create, update, delete, publish, send, schedule, deploy, commit, push, comment, assign, label, close, merge, and external-notification actions as side effects.
- Rule: identify under-declared side effects as blockers for promotion because they can cause unsafe automation.
- Rule: identify over-declared side effects as quality debt because they make safe skills appear riskier than necessary.
- Rule: compare risk and trust tier to the strongest declared or implied mutation, not the most common path.
- Rule: when a skill delegates mutation to another skill, verify whether that delegation is optional guidance or part of the required workflow.
- Rule: recommend exact frontmatter field changes instead of vague "tighten metadata" guidance.
- Rule: use `references/side-effect-matrix.md` to map detected operations to expected side effects, risk, trust tier, and dependencies.

## Workflow

1. Select the skills in scope from git status, a release list, or a category requested by the user.
2. Read each skill's frontmatter, contract, rules, workflow, and completion criteria.
3. Extract implied operations and compare them with declared `sideEffects`, `risk`, `trustTier`, and dependencies.
4. Classify each mismatch by severity: blocker, warning, or informational.
5. Recommend exact frontmatter updates and, when needed, body rule changes that make operational authority explicit.
6. Return a concise audit table or grouped list with paths and suggested changes.

## References

- `references/side-effect-matrix.md` - expected metadata for common mutating and diagnostic operations.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml