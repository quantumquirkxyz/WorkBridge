# Build candidate preferences and vacancy exploration

**Owner:** MateoDG2006  
**Parent spec:** #1  
**Labels:** `ready-for-agent`  
**Metadata:** work_type=Ticket; repo_scope=application; phase=build; priority=high; risk=medium; sprint=hackathon

## Acceptance Criteria
- [ ] Capture target roles, modality, maximum location, travel time, transport budget, minimum salary, schedule, contract type, transport modes, and course/internship willingness.
- [ ] Persist preferences without inferring them through the LLM.
- [ ] Query the cached vacancy catalog and return provenance and freshness.
- [ ] Preserve `jobUrl`, `jobId`, query date, and `scrapingInfo`.
- [ ] Exclude vacancies older than 72 hours from automatic recommendation.
- [ ] Display results in Spanish through the candidate dashboard.

## Validation
Run Playwright with explicit preferences and verify the returned vacancies, freshness labels, and Ajv-validated profile/preferences payload.

## Blocked By
- #4 — Requires the candidate profile contract and intake output.
