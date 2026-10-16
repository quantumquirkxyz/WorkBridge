# Build no-match exploration and saved alerts

**Owner:** MateoDG2006  
**Parent spec:** #1  
**Labels:** `ready-for-agent`  
**Metadata:** work_type=Ticket; repo_scope=application; phase=build; priority=medium; risk=low; sprint=hackathon

## Acceptance Criteria
- [ ] Explain why no viable vacancy was found.
- [ ] Show near matches with explicit warnings.
- [ ] Never relax hard constraints silently.
- [ ] Trigger the training-roadmap path when no viable match exists.
- [ ] Save a search and display future matches in the dashboard.
- [ ] Allow candidate data and preference deletion.
- [ ] Never submit an application from this slice.

## Validation
Run a fixture with no eligible vacancy, verify each stated cause, save an alert, and confirm no external submission tool is called.

## Blocked By
- #7 — Requires the preferences and exploration flow.
