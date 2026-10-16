# Build candidate intake and profile

**Owner:** MateoDG2006  
**Parent spec:** #1  
**Labels:** `ready-for-agent`  
**Metadata:** work_type=Ticket; repo_scope=application; phase=build; priority=high; risk=medium; sprint=hackathon

## Acceptance Criteria
- [ ] Accept PDF, image, pasted text, and pre-transcribed audio.
- [ ] Extract formal and informal experience, projects, family work, volunteering, and academic work.
- [ ] Classify experience as relevant, partially relevant, not relevant, or requires additional evidence.
- [ ] Produce technical and soft skills with level 0–4, evidence, source, and confidence.
- [ ] Keep declared-only skills at level 1 or below.
- [ ] Persist a valid `CandidateProfile` JSON document using JSON Schema 2020-12 and Ajv.

## Validation
Run Vitest unit tests and Ajv contract fixtures, then verify a candidate CV plus family-business experience through the intake UI.

## Blocked By
- None.
