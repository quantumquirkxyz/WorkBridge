---
name: "research-data-archiving"
category: "research"
maturity: "stable"
version: "1"
description: "Archive research data — metadata, storage, preservation, provenance, and reuse planning — with reproducibility and access controls."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Data, metadata, provenance, access controls, and preservation plan are explicit."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "research"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/research-data-archiving.json"
diataxis: "how-to"
tags: ["research"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: dataset inventory, file formats, provenance, privacy/compliance constraints, repository target, and reuse goals.
- Output: archive plan with metadata schema, storage layout, provenance, access policy, retention, and reproducibility checks.
- Scope: do not expose restricted data; document de-identification, embargo, or controlled access when needed.
- Rule: do not expose restricted data; document de-identification, embargo, or controlled access when needed.
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

Emit `ResearchDataArchivingArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/research-data-archiving/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# research-data-archiving

Use this skill when preparing research data, code, notebooks, instruments outputs, or derived datasets for preservation, publication, review, or reuse.


## Rules

- Rule: inventory raw, processed, derived, code, environment, and documentation artifacts separately.
- Rule: preserve provenance from collection through processing and analysis.
- Rule: choose open, documented formats unless domain standards require otherwise.
- Rule: include metadata sufficient for discovery, interpretation, reuse, and citation.
- Rule: define access controls, licenses, retention, and sensitive-data handling explicitly.

## Steps

1. Inventory data, code, environments, instruments, and documentation.
2. Identify provenance, transformations, versions, and quality-control checks.
3. Choose archive structure, formats, metadata schema, identifiers, and citation method.
4. Define access policy, license, embargo, privacy, and retention rules.
5. Add reproducibility checks for loading, running, and interpreting the archive.
6. Document maintenance and long-term preservation responsibilities.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml