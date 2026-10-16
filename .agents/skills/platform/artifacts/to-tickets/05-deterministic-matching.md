# Build deterministic geographic matching

**Owner:** KerubeDev  
**Parent spec:** #2  
**Labels:** `ready-for-agent`  
**Metadata:** work_type=Ticket; repo_scope=application; phase=build; priority=high; risk=high; sprint=hackathon

## Acceptance Criteria
- [ ] Use HiGHS MILP with deterministic greedy fallback.
- [ ] Apply weights: technical requirements 30%, experience/evidence 25%, availability 15%, transport/accessibility 20%, salary/conditions 10%.
- [ ] Enforce mandatory skills, schedule, salary, capacity, and geographic hard constraints.
- [ ] Use Google Maps for routing and the local matrix when unavailable.
- [ ] Produce `apt`, `apt_with_gaps`, or `not_currently_apt` at thresholds 75–100, 50–74, and 0–49.
- [ ] Apply the one-point promotion rule only when no better eligible candidate exists and a human approves.
- [ ] Resolve ties deterministically without protected attributes or randomness.
- [ ] Produce a valid `MatchDecision` with score breakdown and reasons.

## Validation
Run solver fixtures for all three aptitude states, infeasible transport, schedule conflict, mandatory credential gap, tie-breaking, and protected-attribute invariance.

## Blocked By
- #4 — Requires candidate profile and preferences.
- #5 — Requires normalized vacancy requirements.
