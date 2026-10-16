# Build specialization-aware training roadmap

**Owner:** KerubeDev  
**Parent spec:** #2  
**Labels:** `ready-for-agent`  
**Metadata:** work_type=Ticket; repo_scope=application; phase=build; priority=high; risk=medium; sprint=hackathon

## Acceptance Criteria
- [ ] Load a cached catalog containing 15–30 courses, certifications, projects, or internships.
- [ ] Filter by specialization and candidate gaps.
- [ ] Rank by gap coverage, specialization fit, cost, duration, modality, geography, schedule, availability, and credential relevance.
- [ ] Use only catalogued opportunities; never invent them through the LLM.
- [ ] Generate a valid `Roadmap` JSON for `apt_with_gaps` and `not_currently_apt`.
- [ ] Explain each recommendation in Spanish with source and freshness.

## Validation
Run roadmap fixtures with missing technical skills, soft-skill gaps, cost limits, schedule conflicts, and no available catalog option.

## Blocked By
- #8 — Requires deterministic score and gap output.
