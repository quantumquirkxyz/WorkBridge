# Merge multiple intake sources into one candidate profile on the server

**Issue:** #34

**Owner:** MateoDG2006
**Parent spec:** #32
**Labels:** `ready-for-agent`
**Metadata**

- Project: none
- Milestone: none
- Fields: `work_type` = Ticket; `repo_scope` = profile; `phase` = build; `priority` = high; `risk` = medium; `sprint` = hackathon  ; `release_train` = none
- Todo: none
**Docs:** [Spec (AC-07, R2)](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/spec.md) · [OQ-2 decision](https://github.com/HackathonFISC/equipo-02/blob/docs/frontend-spec/docs/reference/frontend/open-questions.md#oq-2--combining-chat-and-cv)

## Context
Data-plane slice for OQ-2. Today `/api/intake` takes one source per call and `profileStore.save` replaces the stored profile, so a CV upload followed by chat text loses the first source. The chat (later slices) sends one intake per source under the same candidate id; the server must merge them.

## Acceptance Criteria
- [ ] When `/api/intake` runs for a `candidateId` that already has a profile, the result is a merge, not a replacement.
- [ ] Skills are deduplicated by `skill_id`; the merged skill keeps the higher `level` and the union of `evidence_ids`.
- [ ] Experiences, education, and certifications are deduplicated by a stable key (type + normalised title + organization); evidence is appended, never dropped.
- [ ] `sources` accumulates every `IntakeSource`; `updated_at` changes and `created_at` is preserved.
- [ ] The merged profile validates against the `CandidateProfile` JSON Schema before it is stored.
- [ ] Intake for a candidate with no stored profile behaves exactly as today.

## Validation
Unit tests for the merge (duplicate skill with different levels, overlapping experiences, disjoint sources) plus a handler test calling `handleIntake` twice with the same candidate id (text, then PDF fixture) asserting both sources are present.

## Blocked By
- None — can start immediately.

## Risks
Experience dedup keys can over-merge similar titles; prefer under-merging (keep both) when the organization differs.
