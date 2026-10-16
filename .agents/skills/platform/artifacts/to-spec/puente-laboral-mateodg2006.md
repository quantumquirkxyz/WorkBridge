# Puente Laboral Panamá — Candidate Exploration and Evidence

**Owner:** MateoDG2006  
**Work type:** Epic slice  
**Scope:** Candidate intake, preference capture, profile normalization, and exploration.

## Goals

- Let a young candidate submit a CV as PDF, image, text, or a pre-transcribed audio description.
- Capture formal and informal experience, projects, family work, volunteering, and academic work.
- Normalize technical and soft skills against the ESCO-based taxonomy and preserve evidence provenance.
- Let the candidate explicitly select work preferences before vacancy search.
- Return compatible vacancies without submitting an application.

## Non-Goals

- Determining final aptitude or ranking candidates.
- Verifying credentials against Certo, Accredible, or Credly.
- Live audio transcription.
- Automatic application submission.

## Acceptance Criteria

- [ ] A candidate can submit PDF, image, pasted text, or pre-transcribed audio through the intake API.
- [ ] The intake pipeline preserves whether each fact is declared, extracted, verified, or inferred.
- [ ] Experiences are classified as `relevant`, `partially_relevant`, `not_relevant`, or `requires_additional_evidence`.
- [ ] Extracted skills include canonical skill ID, original term, level 0–4, evidence, source, and confidence.
- [ ] A declared-only skill cannot receive a level above 1.
- [ ] The candidate can select target roles, modality, maximum travel time, transport budget, minimum salary, availability, contract type, transport modes, and willingness to take courses or internships.
- [ ] Preferences are persisted as a validated `CandidateProfile` JSON document and are not inferred by the LLM.
- [ ] The Exploration Agent returns cached vacancies matching the candidate preferences and includes vacancy freshness and provenance.
- [ ] The workflow never submits an application from this slice.

## Risks and Open Questions

- OCR quality may be poor — retain original input and request correction when confidence is low.
- ESCO may miss local terminology — maintain a versioned Panamanian synonym dictionary.
- Sensitive data may reach the LLM — apply PII vault pseudonymization before model calls.

## Decisions

- **Seam:** `apps/web` intake API to `packages/domain` JSON Schemas and `apps/agent-runtime` Profile/Exploration agents. This keeps the candidate data plane separate from the matching execution plane.
- **Contracts:** JSON Schema 2020-12 validated with Ajv; no Zod.
- **Stack:** Next.js, Mastra, OpenRouter, `unpdf`, vision model, and `tesseract.js` fallback.
- **Testing:** Vitest unit tests, Ajv contract tests, and Playwright candidate flow tests using JSON fixtures.

## Validation Notes

- SC-01–SC-14 applied to this slice; criteria are bounded to candidate intake and exploration.
- No unresolved requirement blocks this slice; external vacancy refresh failures use the cached catalog.
