# Integration Points

Use this map after writing the viability report to decide which follow-up skill to recommend. The recommendation is based on the combination of dimension ratings, numeric scores, risk levels, and the nature of the findings.

## Numeric Score Interpretation

Use numeric scores to prioritize action when categorical ratings are tied:

| Numeric score range | Interpretation | Recommended action |
|---------------------|----------------|---------------------|
| 4–5 | Strong | Maintain or grow |
| 3 | Adequate | Targeted investment |
| 2 | Poor | Intervention required |
| 1 | Critical | Block or redefine scope |

When two dimensions have the same categorical rating, prioritize the one with the lower numeric score.

## Risk Level Interpretation

- **High risk:** Must be addressed before further investment. P0 or P1 in the priority matrix.
- **Medium risk:** Plan for intervention. P1 or P2 in the priority matrix.
- **Low risk:** Backlog. P2 or P3 in the priority matrix.

## Derivation Rules

### When the project is healthy

| Condition | Recommended skill |
|-----------|-------------------|
| All dimensions score 4–5 | `/implement` to execute the next planned feature |
| Viable + Complete + Bounded | `/codebase-design` to prepare for architectural investment before scaling |
| Viable + Complete + Scalable | `/implement` or continue planned roadmap |

### When functionality is broken or partial

| Condition | Recommended skill | Rationale |
|-----------|-------------------|-----------|
| Broken + any viability | `/codebase-design` | Architecture is producing wrong behavior; redesign before fixing |
| Partial + Viable + Fragile | `/implement` + `/codebase-design` | Fix gaps while preparing to improve seams |
| Partial + Not viable | `/docs-management` first | Clarify whether CONTEXT.md or ADRs are wrong before coding |

### When scalability is fragile or bounded

| Condition | Recommended skill | Rationale |
|-----------|-------------------|-----------|
| Fragile + Partial | `/codebase-design` | Coupling and missing behavior reinforce each other; restructure first |
| Fragile + Complete | `/codebase-design` | Behavior works but architecture cannot absorb growth |
| Bounded + Viable | `/domain-modeling` if vocabulary is drifting; otherwise `/implement` with architectural runway |

### When viability is conditional or not viable

| Condition | Recommended skill | Rationale |
|-----------|-------------------|-----------|
| Conditional + blocker is architectural | `/codebase-design` to unblock |
| Conditional + blocker is unclear goals | `/grill-with-docs` to sharpen the project model |
| Conditional + blocker is missing ADRs | `/docs-management` to recover decision history |
| Not viable + ADR contradictions | `/docs-management` to reconcile or supersede |
| Not viable + goal-code mismatch | `/grill-with-docs` or `/domain-modeling` to redefine scope |

### When findings are contradictory

| Condition | Recommended skill | Rationale |
|-----------|-------------------|-----------|
| Viable says Conditional, Functionality says Broken | `/grill-with-docs` to resolve whether goals or code are wrong |
| Scalability says Fragile, Viability says Viable | `/codebase-design` to improve seams without changing goals |
| All three disagree | `/grill-with-docs` to force a structured interview and produce a new ADR |

### When risk levels are high

| Condition | Recommended skill | Rationale |
|-----------|-------------------|-----------|
| Any dimension has High risk findings | `/sec-security-audit` if security-related; otherwise `/implement` with remediation plan |
| High risk + Broken or Fragile | `/codebase-design` to address structural risk before implementation |

## Priority Matrix Interpretation

When the report includes a priority matrix (Impact × Effort), use it to order recommendations:

| Impact \ Effort | Low | High |
|-----------------|-----|------|
| **High** | P0 — do first | P1 — plan carefully |
| **Low** | P2 — backlog | P3 — defer or reject |

Recommend the highest-priority item first. If multiple items share P0, recommend the one that unblocks the others.

## User Prompt Template

After presenting the report, ask the user to choose:

```
Based on the assessment:

- Viability: <categorical rating> (score: <1–5>)
- Functionality: <categorical rating> (score: <1–5>)
- Scalability: <categorical rating> (score: <1–5>)

Recommended next step: <skill> — <one-line reason>

Choose:
1. Address the top findings via /implement or /codebase-design
2. Sharpen the project model via /grill-with-docs or /domain-modeling
3. Revisit ADRs via /docs-management
4. Abandon or pause the assessment
```
