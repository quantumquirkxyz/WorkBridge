---
description: "Coordinate multiple agent sub-roles (architect, implementer, reviewer, tester) in parallel or sequential swarm mode, with clear handoff contracts and evidence recording."
---
# subagent-swarm

When to use: Coordinate multiple agent sub-roles (architect, implementer, reviewer, tester) in parallel or sequential swarm mode, with clear handoff contracts and evidence recording.

## Workflow

1. Define roles and mode (parallel/sequential)
2. Create swarm plan with task assignments
3. Execute roles (parallel or sequential)
4. Collect evidence from each role
5. Resolve conflicts (if any)
6. Merge outputs with evidence
7. Validate final output against handoff contract

## Deliverables

- agent artifact

## Guardrails

- risk: medium; trust tier: 3; approval required: yes
- side effects: none
- isolation: none; model tier: reasoning

Stop when: All roles completed with valid evidence, conflicts resolved, and merged output validated.
