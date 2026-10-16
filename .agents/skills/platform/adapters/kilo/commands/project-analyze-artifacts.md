---
description: "Analyze the spec, plan, and ticket artifacts of one work item for consistency: conflicts, gaps, ambiguities, and dead references, each marked [NEEDS CLARIFICATION] when the artifacts cannot resolve it. Use when a spec and its tickets drifted apart, before to-tickets slices work, or when review-pr needs a spec-side verdict. Never edits the artifacts it reads."
---
# analyze-artifacts

When to use: Analyze the spec, plan, and ticket artifacts of one work item for consistency: conflicts, gaps, ambiguities, and dead references, each marked [NEEDS CLARIFICATION] when the artifacts cannot resolve it. Use when a spec and its tickets drifted apart, before to-tickets slices work, or when review-pr needs a spec-side verdict. Never edits the artifacts it reads.

## Workflow

1. **Load the artifact set.** Read the spec artifact, the plan, every ticket sliced from it, and the work-item metadata. Record each artifact's revision or link in `artifactsRead` so the report states exactly what was compared. When an arti...
2. **Index the requirements.** Give every requirement a stable id: acceptance criteria from the spec, steps from the plan, and acceptance criteria from each ticket. The index is what makes a missing row visible — a requirement that exists i...
3. **Cross-check the joins.** Compare spec against plan, plan against tickets, and tickets against spec, using the checklist in `references/analyze-checklist.md`. Compare requirement by requirement, not document by document
4. **Resolve every reference.** Follow each file path, issue, pull request, branch, skill, and artifact link the artifacts name and confirm it still exists and still means what the artifact claims
5. **Classify each finding.** Assign one of the four classes below with its evidence, then mark the finding `[NEEDS CLARIFICATION]` when the artifacts alone cannot settle it, naming the owner and the decision it blocks
6. **Emit the report.** Return the findings ordered by severity, then state the verdict. The verdict reflects the artifacts, not the implementation

## Deliverables

- project artifact

## Guardrails

- risk: low; trust tier: 2; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Artifact consistency analysis complete; every finding classified with evidence; clarification markers carry an owner; report returned read-only; completion criteria checked.
