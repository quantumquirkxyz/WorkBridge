# Sub-agent Prompts

Spawn three parallel sub-agents in a single message using the `general-purpose` subagent type. Pass each sub-agent the shared context plus its focused brief. After all three return, aggregate the findings into the report template.

## Shared context to pass to every sub-agent

- Repository root path.
- `CONTEXT.md` contents or summary.
- ADR paths and one-line summary per ADR.
- Project shape classification and top-level structure map.
- Approximate LOC and module count.
- Dominant language/framework.
- Pre-flight gaps, if any (e.g., missing CONTEXT.md, limited ADR coverage).
- Automated baseline signals from `references/health-baseline.md` (dependency health, test coverage, cross-import count, config drift).

## Output Schema (mandatory for all sub-agents)

Each sub-agent MUST return a structured output with exactly these fields:

```
Categorical rating: <Viable | Conditional | Not viable> | <Complete | Partial | Broken> | <Scalable | Bounded | Fragile>
Numeric score (1–5): <1 | 2 | 3 | 4 | 5>
Evidence:
  - <finding>: <citation> | Confidence: <High | Medium | Low> | Risk: <High | Medium | Low>
  - <finding>: <citation> | Confidence: <High | Medium | Low> | Risk: <High | Medium | Low>
Conditions or blockers: <bullet list if Conditional or Not viable>
Missing or contradictory items: <bullet list if Partial or Broken>
Limiting factor: <one sentence if Bounded or Fragile>
Word count: <under 200 words>
```

**Rules for sub-agents:**
- Do NOT make recommendations for other dimensions. Stay within your assigned axis.
- Do NOT merge findings across dimensions. Each finding stands alone.
- Every finding MUST have a citation. If you cannot cite a source, mark confidence as "Low" and note the gap.
- Every finding MUST have a risk level based on Likelihood × Impact (see `evaluation-criteria.md`).
- If the shared context is insufficient for your dimension, state that explicitly in the Evidence section and assign the lowest viable rating and numeric score.
- Numeric score must be consistent with categorical rating (see mapping in `evaluation-criteria.md`).

## Citation Examples

**Good citations:**
- `CONTEXT.md:12-18` — stated goal of multi-tenant auth
- `docs/adr/0003-storage.md:5` — decision to use PostgreSQL
- `src/auth/engine.py:45` — actual implementation of tenant resolution
- `health-baseline: import-cross-module=47` — automated baseline signal

**Bad citations:**
- `some file` — not specific enough
- `the codebase` — not actionable
- `CONTEXT.md` — no line range, cannot verify

## Confidence Criteria Summary

- **High:** ≥2 independent citations, or 1 citation with automated baseline confirmation.
- **Medium:** 1 citation, no automated confirmation.
- **Low:** No direct citation; inference from structure or naming alone.

## Risk Matrix Summary

- **High risk:** High impact × High likelihood
- **Medium risk:** Medium impact × High likelihood, or High impact × Medium likelihood
- **Low risk:** All other combinations

Findings with `High` risk must be P0 or P1 in the priority matrix.

## Sub-agent 1: Viability

**Prompt:**

```
You are the Viability sub-agent. Your job is to assess whether the project's stated goals are achievable given its current shape and constraints.

Context:
- CONTEXT.md: <contents or summary>
- ADRs: <paths and summaries>
- Project shape: <classification>
- Top-level structure: <map>
- Approximate LOC: <number>
- Module count: <number>
- Dominant language/framework: <language/framework>
- Pre-flight gaps: <none or description>
- Baseline signals: <dependency health, test coverage, cross-import count, config drift>

Brief:
1. Assess alignment between CONTEXT.md goals and actual module boundaries.
2. Identify contradictions between ADR decisions and current implementation.
3. Flag dead code, orphaned modules, or abandoned integration seams.
4. Assign a categorical rating: Viable, Conditional, or Not viable. State the conditions or blockers.
5. Assign a numeric score (1–5) consistent with the categorical rating.

Output format (MUST follow exactly):
Categorical rating: <Viable | Conditional | Not viable>
Numeric score (1–5): <1 | 2 | 3 | 4 | 5>
Evidence:
  - <finding>: <citation> | Confidence: <High | Medium | Low> | Risk: <High | Medium | Low>
  - <finding>: <citation> | Confidence: <High | Medium | Low> | Risk: <High | Medium | Low>
Conditions or blockers: <bullet list if Conditional or Not viable>
Word count: <under 200 words>
```

## Sub-agent 2: Functionality

**Prompt:**

```
You are the Functionality sub-agent. Your job is to assess whether the implementation matches the documented intent.

Context:
- CONTEXT.md: <contents or summary>
- ADRs: <paths and summaries>
- Project shape: <classification>
- Top-level structure: <map>
- Approximate LOC: <number>
- Module count: <number>
- Dominant language/framework: <language/framework>
- Pre-flight gaps: <none or description>
- Baseline signals: <dependency health, test coverage, cross-import count, config drift>

Brief:
1. Cross-reference CONTEXT.md glossary terms and ADR decisions against actual behavior.
2. Identify gaps: documented behavior missing from code, or code behavior not documented.
3. Identify regressions: behavior that contradicts an ADR or CONTEXT.md.
4. Assign a categorical rating: Complete, Partial, or Broken. List missing or contradictory items.
5. Assign a numeric score (1–5) consistent with the categorical rating.

Output format (MUST follow exactly):
Categorical rating: <Complete | Partial | Broken>
Numeric score (1–5): <1 | 2 | 3 | 4 | 5>
Evidence:
  - <finding>: <citation> | Confidence: <High | Medium | Low> | Risk: <High | Medium | Low>
  - <finding>: <citation> | Confidence: <High | Medium | Low> | Risk: <High | Medium | Low>
Missing or contradictory items: <bullet list if Partial or Broken>
Word count: <under 200 words>
```

## Sub-agent 3: Scalability

**Prompt:**

```
You are the Scalability sub-agent. Your job is to assess growth boundaries across technical, team, and domain dimensions.

Context:
- CONTEXT.md: <contents or summary>
- ADRs: <paths and summaries>
- Project shape: <classification>
- Top-level structure: <map>
- Approximate LOC: <number>
- Module count: <number>
- Dominant language/framework: <language/framework>
- Pre-flight gaps: <none or description>
- Baseline signals: <dependency health, test coverage, cross-import count, config drift>

Brief:
1. Technical scalability: evaluate module depth, seam placement, coupling, and duplication.
2. Team scalability: evaluate locality of change, onboarding surface, and abstraction quality.
3. Domain scalability: evaluate model extensibility, vocabulary drift, and ADR coverage.
4. Assign a categorical rating: Scalable, Bounded, or Fragile. State the limiting factor.
5. Assign a numeric score (1–5) consistent with the categorical rating.

Output format (MUST follow exactly):
Categorical rating: <Scalable | Bounded | Fragile>
Numeric score (1–5): <1 | 2 | 3 | 4 | 5>
Evidence:
  - <finding>: <citation> | Confidence: <High | Medium | Low> | Risk: <High | Medium | Low>
  - <finding>: <citation> | Confidence: <High | Medium | Low> | Risk: <High | Medium | Low>
Limiting factor: <one sentence if Bounded or Fragile>
Word count: <under 200 words>
```

## Aggregation

After all three sub-agents return, combine their outputs into the report template from `references/report-template.md`. Do not merge or rerank findings across dimensions — each axis stands on its own. Add a `## Next Steps` section asking the user to choose a path. Include a `## Delta from Previous Assessment` section if a previous report exists in `.reports/`.
