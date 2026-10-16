---
name: "side-effect-auditor"
category: "skill-dev"
maturity: "stable"
version: "1"
description: "Audit skill side-effect, risk, trust tier, dependency, and boundary metadata against the actual workflow so mutating skills declare their operational authority honestly."
license: "MIT"
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
fixturesPath: ""
diataxis: "how-to"
tags: ["skill-dev"]
compatibility: []
approvalRequired: "false"
approvalFor: []
clauses:
  - id: SIDE-EFFECT-AUDITOR-1
    text: "Inspect both frontmatter and body instructions before deciding whether declared side effects are accurate."
    check: "evals/behavioral/side-effect-auditor.json#SIDE-EFFECT-AUDITOR-1"
  - id: SIDE-EFFECT-AUDITOR-2
    text: "Classify under-declared side effects as promotion blockers and over-declared side effects as quality debt."
    check: "evals/behavioral/side-effect-auditor.json#SIDE-EFFECT-AUDITOR-2"
  - id: SIDE-EFFECT-AUDITOR-3
    text: "Compare risk and trust tier against the strongest declared or implied mutation, and recommend exact frontmatter field changes."
    check: "evals/behavioral/side-effect-auditor.json#SIDE-EFFECT-AUDITOR-3"
reloadPolicy: on-trigger
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

## OWASP agentic checklist

Before recommending promotion of a mutating skill, map its side effects against the OWASP Agentic Top 10 and the Agentic Skills Top 10. A side effect is only acceptable when the skill names the risk it touches and states the control that compensates for it.

| Axis | Risk the side effect touches | Compensating control to confirm |
|---|---|---|
| ASI01 goal hijacking | Skill body steers the operator away from their stated goal (vendor mandates, instruction overrides) | `security-scan-skills.mjs` clean under `--strict`; steering directives are promotion blockers |
| ASI02 tool misuse | Skill invokes tools or writes beyond its declared side effects | `approvalRequired` plus `approvalFor` cover every mutating operation in the body |
| ASI03 identity and privilege abuse | Skill inherits the agent's full credential set (cloud, ssh, registry tokens) | no credential reads in any bundled file; least-privilege permissions |
| ASI04 supply chain | Skill installs or executes remote code and configs that can be swapped | pinned hashes or commits; provenance recorded by body fingerprint |
| ASI05 unexpected code execution | Skill executes fetched content, by the agent or by the operator | no fetch-then-run in bundled files; deterministic gate clean |
| ASI06 memory and context poisoning | Skill writes to shared memory or instruction files (`CLAUDE.md`, `AGENTS.md`) | write targets scoped and approval-gated; poisoned entries excised, not only flagged |
| ASI07 insecure inter-agent communication | Skill hands data to another agent without an integrity boundary | signed or scoped artifacts; no unverified remote endpoints |
| AST02 skill supply-chain compromise | Any bundled file is an active execution path, not documentation | full-bundle scan covering `SKILL.md`, `AGENTS.md`, `CLAUDE.md`, and `references/*` |

Rules that bind the audit:

- Rule: every mutating skill must state which ASI rows its side effects touch and the compensating control for each row; an unstated risk is an under-declared side effect and blocks promotion.
- Rule: a poisoned memory or context finding must be excised, not only flagged. The Bad Memory research (arXiv 2607.14611) shows payloads planted in `CLAUDE.md` and `AGENTS.md` persist in the session even when the model refuses to follow them (refusal rate 0%, persistence 100%), so a flag alone leaves the payload live.
- Rule: distinguish guidance from enforcement. Skill bodies and rule files are guidance to the model; permissions, hooks, and validators are what actually bind a mutating skill. When the audit relies on guidance alone to prevent a danger, record that as a finding.
- Rule: run `node .agents/skills/platform/security-scan-skills.mjs --path <skill-dir> --strict` as the deterministic pre-execution gate covering ASI01, ASI02, ASI04, ASI05, ASI06, and AST02 before recommending promotion. Basis: ILION (arXiv 2603.13247) - a deterministic gate scores F1 0.85 on action safety where a text-safety classifier scores 0.01, so moderation models do not substitute for this gate.

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