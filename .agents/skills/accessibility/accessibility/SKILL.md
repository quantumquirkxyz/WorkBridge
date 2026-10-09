---
name: "accessibility"
category: "accessibility"
maturity: "stable"
version: "1"
description: "Design inclusive products — WCAG compliance, assistive technology support, keyboard navigation, color contrast — with explicit user access guarantees."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Design inclusive products complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "accessibility"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/accessibility.json"
diataxis: "how-to"
tags: ["accessibility"]
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

Emit `AccessibilityArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/accessibility/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# accessibility

Design inclusive products — WCAG compliance, assistive technology support, keyboard navigation, color contrast — so all users can access the product regardless of ability.

## Goals
- Meet WCAG 2.1 AA as a baseline (AAA where possible)
- Support screen readers (NVDA, JAWS, VoiceOver)
- Ensure keyboard-only navigation
- Design for cognitive and motor accessibility


## WCAG 2.1 Principles

1. **Perceivable** — alternative text, captions, sufficient contrast
2. **Operable** — keyboard navigation, no seizure triggers
3. **Understandable** — clear language, error identification
4. **Robust** — valid HTML, ARIA when needed

## Common Issues

| Issue | Severity | Fix |
|---|---|---|
| Missing alt text | A | Add descriptive alt to all images |
| Low contrast | AA | Use ≥4.5:1 (text) or ≥3:1 (large text) |
| No keyboard focus | A | Ensure all interactive elements are focusable |
| Missing form labels | A | Associate `<label>` with `<input>` |
| Autoplay media | A | Provide pause/stop controls |
| Missing skip links | AA | Add "skip to main content" link |

## Tools

- **Automated**: axe, Lighthouse, WAVE
- **Manual**: keyboard nav, screen reader testing
- **Color**: Colour Contrast Analyser, WebAIM contrast checker

## Steps

1. **Audit with automated tools** — catch low-hanging fruit
2. **Test with keyboard** — tab through every flow
3. **Test with screen reader** — announce each element
4. **Review color contrast** — check all text/background pairs
5. **Fix by severity** — A first, then AA
6. **Document** — accessibility statement and test results

## Rules

- Rule: combine automated checks with manual keyboard and screen-reader testing.
- Rule: prioritize blockers to task completion before cosmetic compliance issues.
- Rule: use semantic HTML before ARIA when native controls can satisfy the interaction.
- Rule: verify focus order, visible focus, labels, errors, contrast, and reduced-motion behavior.
- Rule: document residual barriers and retest criteria after remediation.

## References
- `../../ux/interaction-design/SKILL.md` — interaction patterns
- `../../frontend/frontend-design/SKILL.md` — visual design

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml