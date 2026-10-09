---
name: "accessibility-testing"
category: "accessibility"
maturity: "stable"
version: "1"
description: "Test web interfaces for accessibility compliance — automated scans, manual keyboard navigation, screen reader validation — with explicit barrier detection and remediation evidence."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Test web interfaces for accessibility compliance complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "test-strategy"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/accessibility-testing.json"
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

Emit `AccessibilityTestingArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/accessibility-testing/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# accessibility-testing

Test web interfaces for accessibility compliance — automated scans, manual keyboard navigation, screen reader validation — so barriers are found and fixed before users encounter them.

## Goals
- Catch WCAG violations automatically where possible
- Validate manually what automation cannot detect
- Produce a ranked issue list by severity (A, AA, AAA)
- Verify fixes with re-testing and regression checks


## Tools

| Tool | Type | What it catches |
|---|---|---|
| `axe` / `axe-core` | Automated | Contrast, missing labels, invalid ARIA |
| `Lighthouse` | Automated | WCAG summary, accessibility score |
| `WAVE` | Automated | Errors, alerts, features, structural issues |
| `Colour Contrast Analyser` | Manual | Text/background contrast ratios |
| Keyboard (Tab/Enter/Escape) | Manual | Focus traps, missing focus styles |
| Screen reader (NVDA/VoiceOver) | Manual | Announcements, reading order |

## Process

### 1. Automated Scan

Run at least two automated tools in parallel:
```bash
# axe via CLI
npx @axe-core/cli https://example.com

# Lighthouse in CI
lighthouse https://example.com --only-categories=accessibility
```
Collect violations and deduplicate. Ignore known-false-positives with documented rationale.

### 2. Keyboard Navigation Test

Step through every interactive flow manually:
- `Tab` forward through all focusable elements
- `Shift+Tab` backward
- `Enter` activate buttons and links
- `Space` activate buttons
- `Escape` close modals and dropdowns
- `Arrow keys` navigate menus and radio groups
- Check that focus indicator is always visible (not `outline: none` without alternative)

Document: which element failed, what expected behavior is, what the page should do.

### 3. Screen Reader Test

Test with at least one screen reader on one target platform:
- **Windows**: NVDA + Firefox (most tested combo)
- **macOS / iOS**: VoiceOver + Safari
- **Android**: TalkBack + Chrome

Check:
- All images have meaningful `alt` text (or `alt=""` for decorative)
- Form inputs have associated labels
- Buttons announce their role, name, and state
- Modal/dialog announces on open and traps focus inside
- Page regions have landmarks (`<main>`, `<nav>`, `<aside>`)

### 4. Color Contrast Check

Use Colour Contrast Analyser or WebAIM Contrast Checker for every text/background pair:
- Normal text: ≥ 4.5:1 (AA), ≥ 7:1 (AAA)
- Large text (≥18pt regular or ≥14pt bold): ≥ 3:1 (AA), ≥ 4.5:1 (AAA)
- UI components and graphical objects: ≥ 3:1

### 5. Document and Prioritize

Build the issue list:

| # | Issue | Element | WCAG | Severity | Fix |
|---|---|---|---|---|---|
| 1 | Missing alt | `img[src="logo.svg"]` | 1.1.1 | A | Add `alt="Company name"` |
| 2 | Low contrast | `.error-text` | 1.4.3 | AA | Change color to `#c00` |
| 3 | Focus lost | Modal close | 2.1.2 | A | Return focus to trigger |

Fix A first, then AA. Track each fix with a re-test step.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml