# Build vacancy normalization and fairness checks

**Owner:** KerubeDev  
**Parent spec:** #2  
**Labels:** `ready-for-agent`  
**Metadata:** work_type=Ticket; repo_scope=application; phase=build; priority=high; risk=high; sprint=hackathon

## Acceptance Criteria
- [ ] Accept manual, JSON, PDF, and image vacancy inputs.
- [ ] Separate mandatory and desirable requirements.
- [ ] Map requirements to the ESCO-based Panamanian skills taxonomy while preserving original wording.
- [ ] Classify alerts as ambiguous, potentially discriminatory, or prohibited.
- [ ] Block clearly prohibited requirements.
- [ ] Route ambiguous or potentially discriminatory requirements to human review.
- [ ] Exclude flagged requirements from ranking until resolved.
- [ ] Produce valid `JobRequirements` JSON.

## Validation
Use fixtures containing “good appearance”, unjustified age limits, and valid objective requirements. Verify Ajv output and ranking exclusion behavior.

## Blocked By
- None.
