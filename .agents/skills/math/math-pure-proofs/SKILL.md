---
name: "math-pure-proofs"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Write and verify pure-math proofs (number theory, algebra, analysis, combinatorics) with rigorous step-by-step reasoning and explicit proof strategies."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Markdown artifact exists with all five sections (statement, strategy, steps, verification, cited theorems); every proof step is justified with a named rule."
risk: "low"
trustTier: "1"
maxIterations: "5"
promptVersion: "2.0"
artifactType: "pull-request"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/math-pure-proofs.json"
diataxis: "how-to"
tags: ["math"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: a mathematical statement to prove (or a set of statements to evaluate).
- Output: a Markdown proof artifact saved to the repo, with statement, strategy, steps, verification, and theorem citations.
- Scope: generates reasoning only; no code execution, no file system writes beyond the Markdown artifact.
- Rule: generates reasoning only; no code execution, no file system writes beyond the Markdown artifact.
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

Emit `MathPureProofsArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/math-pure-proofs/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Pure-Math Proofs

Construct a **proof** — an airtight argument from accepted axioms to a stated statement — using the strategy that fits the shape of the claim.

## When to use

- User asks to "prove", "demonstrate", "show rigorously" a mathematical statement.
- The statement lives in number theory, algebra, analysis, combinatorics, or topology.
- A claim from another skill (e.g. `cs-formal-methods`) needs a mathematical underpinning.

## Process

### 1. Diagnose the claim

State the claim in your own words; identify its **shape** — universal (∀), existential (∃), implication, equivalence — and the **domain** (ℕ, ℤ, ℝ, groups, rings, vector spaces, metric spaces). A wrong diagnosis wastes every step after.

**Completion criterion:** the claim is restated with shape, domain, and the smallest hypothesis set that makes it true.

### 2. Pick the proof strategy

Choose the strategy that matches the shape:

- **Direct** — chain of implications.
- **Contradiction** — for "no such object exists" / "P implies Q" when direct fails.
- **Contrapositive** — for implications whose converse is easier.
- **Induction** — for statements indexed by ℕ; check base and inductive step explicitly.
- **Strong induction** — when the inductive step needs more than one previous case.
- **Construction** — for existential claims; exhibit the witness and verify.
- **Pigeonhole / extremal / counting** — for combinatorial statements.
- **Diagonalisation** — for non-constructive existence.

**Completion criterion:** strategy is named and one sentence justifies it.

### 3. Build the argument

Write the proof as numbered steps. Each step carries one logical move. State the rule you used (e.g. "by the axiom of choice", "since G is a group, inverses exist"). No gaps; a reader with the prerequisites should follow without filling in.

**Completion criterion:** every step is justified; no step is hand-waved with "clearly" or "obviously" on a non-trivial claim.

### 4. Verify

Sanity-check the proof three ways:

- **Substitute a small instance** (n = 1, 2, 3) and confirm the claim holds and the proof still applies.
- **Look for the contrapositive / converse** — does the proof accidentally prove something stronger or weaker?
- **Adversarial pass** — try to break it: find an edge case the proof ignores, a quantifier flip, an off-by-one.

**Completion criterion:** at least one verification pass completed; any flaw found is fixed before delivery.

### 5. Deliver

Produce the proof in a Markdown file with: statement, strategy, steps, verification notes, and any assumptions called out. Cite definitions or theorems used by name.

**Completion criterion:** Markdown artifact exists; statement, strategy, steps, verification all present; no step is unjustified.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml