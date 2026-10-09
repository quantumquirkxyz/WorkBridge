---
name: "physics-career-postdoc"
category: "skill-dev/sandbox"
maturity: "stable"
version: "1"
description: "Navigate physics career transitions — postdoc applications, faculty applications, letters of recommendation, research statements, teaching statements, grant applications (NSF CAREER, DOE, ERC, Simons), and negotiation."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Application package drafted; timeline saved; negotiation strategy documented."
risk: "low"
trustTier: "1"
maxIterations: "5"
promptVersion: "2.0"
artifactType: "physics"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/physics-career-postdoc.json"
diataxis: "how-to"
tags: ["physics"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: career stage, target positions (postdoc / faculty / institute).
- Output: application package + timeline + negotiation notes.
- Scope: prepares application materials; the human submits.
- Rule: prepares application materials; the human submits.
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

Emit `PhysicsCareerPostdocArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/physics-career-postdoc/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Physics Career — Postdocs, Faculty, Grants

Build a **career application package** for a physics researcher — postdoc, faculty, or early-career grant — with a research statement, teaching philosophy, and timeline.

## When to use

- The user is applying to postdoc positions, faculty jobs, or early-career grants.
- A PI needs to write a NSF CAREER / DOE / ERC proposal.
- A researcher needs to coordinate letters of recommendation.

## Process

### 1. Assess the position

For each target:

- **Fit:** what in the user's research matches the group's interests?
- **Requirements:** research statement length, teaching statement, diversity statement.
- **Deadline:** internal + external; submission system (MathJobs, Interfolio, portal).
- **Market data:** typical number of applicants, success rate (anonymised from mentors).

**Completion criterion:** targets ranked; fit statement per target.

### 2. Research statement

Structure (typically 2–4 pages):

- **Problem:** one central physics question (or two related ones).
- **Progress:** what the user has done; publications, preprints.
- **Future:** what the user will do in the next 3–5 years at this institution.
- **Connection:** how it fits the target group / department.

Be specific: name the physics, not just "study complex systems".

**Completion criterion:** statement drafted; per-target adaptation noted.

### 3. Teaching and diversity statements

- **Teaching statement:** philosophy (active learning, research-based, equity-minded); evidence (courses taught, mentoring, syllabus design).
- **Diversity statement:** experience with DEI; commitment; specific actions.

Both require concrete examples, not generic platitudes.

**Completion criterion:** both statements drafted with specific examples.

### 4. Letters of recommendation

Coordinate:

- **Who:** mentors who know the user's research; at least one from a different institution.
- **What to give letter-writers:** research summary, publications, specific strengths to highlight.
- **Deadline:** at least 3 weeks before submission.

**Completion criterion:** letter-writers contacted; materials sent.

### 5. Grant applications

For NSF CAREER, DOE, ERC, Simons:

- **Read the programme manager's priorities** (not just the solicitation).
- **Budget:** postdoc salary, travel, equipment; justified.
- **Broader impacts / outreach** — concrete, not boilerplate.
- **Timeline** — milestones per year.

**Completion criterion:** draft complete; programme manager contacted if possible.

### 6. Negotiation strategy

If an offer comes:

- Research startup, equipment, space.
- Teaching load (how many courses per year).
- Start date.
- Moving allowance.

Know the range before negotiating.

**Completion criterion:** negotiation notes saved; priorities ranked.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml