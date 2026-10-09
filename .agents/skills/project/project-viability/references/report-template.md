# Report Template

Use this structure when writing `.reports/<YYYYMMDD>-viability.md`. Keep the report under 2000 words.

```markdown
# Project Viability Assessment

**Repository:** <repo name or path>
**Date:** <YYYY-MM-DD>
**Assessed against:** CONTEXT.md, docs/adr/

## Pre-flight Summary

- CONTEXT.md: <present / missing — impact: ...>
- docs/adr/: <present with N ADRs / missing — impact: ...>
- Assessment confidence: <High / Medium / Low — reason>

## Executive Summary

| Dimension | Categorical rating | Numeric score (1–5) | One-line reason | Confidence |
|-----------|--------------------|---------------------|-----------------|------------|
| Viability | Viable / Conditional / Not viable | <1–5> | <reason> | <High/Med/Low> |
| Functionality | Complete / Partial / Broken | <1–5> | <reason> | <High/Med/Low> |
| Scalability | Scalable / Bounded / Fragile | <1–5> | <reason> | <High/Med/Low> |

Overall posture: <one sentence based on conflict resolution matrix>

## Delta from Previous Assessment

- Previous report: <path or N/A>
- Previous date: <YYYY-MM-DD or N/A>
- Changes since last assessment: <bullet list or N/A>
- Score deltas: <dimension: previous_score → current_score or N/A>

## Viability

<2-4 sentences summarizing the rating.>

### Findings

- <Finding with citation, confidence, and risk: file path, ADR path, or CONTEXT.md section. Confidence: High/Med/Low. Risk: High/Med/Low.>
- <Finding with citation, confidence, and risk.>

### Recommendations

| Recommendation | Impact | Effort | Priority | Risk |
|----------------|--------|--------|----------|------|
| <Highest-priority action.> | High/Med/Low | High/Med/Low | P0/P1/P2 | High/Med/Low |

## Functionality

<2-4 sentences summarizing the rating.>

### Findings

- <Finding with citation, confidence, and risk.>
- <Finding with citation, confidence, and risk.>

### Recommendations

| Recommendation | Impact | Effort | Priority | Risk |
|----------------|--------|--------|----------|------|
| <Highest-priority action.> | High/Med/Low | High/Med/Low | P0/P1/P2 | High/Med/Low |

## Scalability

<2-4 sentences summarizing the rating.>

### Findings

- <Finding with citation, confidence, and risk.>
- <Finding with citation, confidence, and risk.>

### Recommendations

| Recommendation | Impact | Effort | Priority | Risk |
|----------------|--------|--------|----------|------|
| <Highest-priority action.> | High/Med/Low | High/Med/Low | P0/P1/P2 | High/Med/Low |

## Validation Notes

- Quality gate passed: <Yes / No — if No, explain which check failed and how it was resolved.>
- All findings cited: <Yes / No — count of uncited findings, if any.>
- Conflict resolution applied: <Yes / No — describe any dimension conflicts and resolution.>
- Pre-flight gaps addressed: <Yes / No / N/A — describe if gaps affected the assessment.>
- Numeric score consistency: <Yes / No — describe any mismatch between categorical rating and numeric score.>
- Automated baseline signals: <list key signals or N/A>

## Next Steps

Ask the user to choose one path:

- Address the top findings via `/implement` or `/codebase-design`.
- Sharpen the project model via `/grill-with-docs` or `/domain-modeling`.
- Revisit ADRs via `/docs-management`.
- Abandon or pause the assessment.
```

## JSON Artifact Schema

Write `.reports/<YYYYMMDD>-viability.json` with the following schema:

```json
{
  "schema_version": "1.0",
  "repository": "<repo name or path>",
  "date": "<YYYY-MM-DD>",
  "preflight": {
    "context_md": "<present / missing>",
    "adr_dir": "<present / missing>",
    "gaps": ["<gap descriptions or empty array>"]
  },
  "baseline": {
    "loc": "<number or N/A>",
    "module_count": "<number or N/A>",
    "dependency_health": "<summary or N/A>",
    "test_loc_ratio": "<ratio or N/A>",
    "ci_present": "<true / false / N/A>",
    "cross_import_count": "<number or N/A>",
    "config_drift": "<summary or N/A>"
  },
  "dimensions": {
    "viability": {
      "categorical_rating": "<Viable | Conditional | Not viable>",
      "numeric_score": "<1–5>",
      "findings": [
        {
          "statement": "<finding>",
          "citation": "<CONTEXT.md / ADR / code>",
          "confidence": "<High | Medium | Low>",
          "risk": "<High | Medium | Low>",
          "type": "<positive | blocker | missing | contradiction>"
        }
      ],
      "recommendations": [
        {
          "action": "<recommendation>",
          "impact": "<High | Medium | Low>",
          "effort": "<High | Medium | Low>",
          "priority": "<P0 | P1 | P2>",
          "risk": "<High | Medium | Low>"
        }
      ]
    },
    "functionality": { "<same structure>" },
    "scalability": { "<same structure>" }
  },
  "overall": {
    "posture": "<one sentence>",
    "conflict_resolution": "<applied / N/A>",
    "recommended_skill": "<skill name or N/A>"
  },
  "validation": {
    "quality_gate_passed": "<true / false>",
    "all_findings_cited": "<true / false>",
    "score_consistency": "<true / false>",
    "preflight_gaps_addressed": "<true / false / N/A>"
  },
  "delta": {
    "previous_report": "<path or N/A>",
    "previous_date": "<YYYY-MM-DD or N/A>",
    "score_deltas": {
      "viability": "<previous → current or N/A>",
      "functionality": "<previous → current or N/A>",
      "scalability": "<previous → current or N/A>"
    }
  }
}
```
