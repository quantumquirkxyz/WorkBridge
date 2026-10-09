---
name: "localization"
category: "cms"
maturity: "stable"
version: "1"
description: "Design internationalization (i18n) and localization (l10n) — string management, locale handling, RTL support, cultural adaptation — so the product works across languages and regions."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Design internationalization (i18n) and localization (l10n) complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "cms"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/localization.json"
diataxis: "how-to"
tags: ["cms"]
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

Emit `LocalizationArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/localization/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# localization

Design internationalization (i18n) and localization (l10n) — string management, locale handling, RTL support, cultural adaptation — so the product works across languages and regions.

## Goals
- Externalize all user-facing strings from code
- Support locale-aware formatting (dates, numbers, currencies)
- Handle RTL layouts and bidirectional text
- Integrate translation workflow with the development process


## i18n vs. l10n

| Concern | i18n (internationalization) | l10n (localization) |
|---|---|---|
| What | Code structure | Cultural adaptation |
| Who | Developers | Translators, local teams |
| When | Before shipping | Per locale |
| Examples | String IDs, ICU, format APIs | Translation, dates, currency |

## Steps

1. **Audit user-facing strings** — extract from code, templates, DB
2. **Choose a framework** — ICU MessageFormat, gettext, Fluent
3. **Define locale hierarchy** — en → en-GB → en-AU
4. **Handle formatting** — dates (Intl.DateTimeFormat), numbers, currencies
5. **Adapt UI** — text expansion (±30%), RTL layout, icons
6. **Integrate translations** — TMS integration, glossary, placeholders
7. **Test** — pseudolocalization, native speaker review

## Rules

- Rule: externalize all user-facing strings and preserve placeholders with translator context.
- Rule: handle pluralization, gender, date/time, currency, number, and collation rules by locale.
- Rule: design for text expansion, RTL, bidirectional text, and locale-specific layouts.
- Rule: separate source-language content governance from per-locale adaptation.
- Rule: include pseudolocalization and native-speaker review in validation.

## References
- `../cms-architecture/SKILL.md` — content localization
- `../../frontend/frontend-design/SKILL.md` — RTL design
- `../../accessibility/accessibility/SKILL.md` — language in a11y

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml