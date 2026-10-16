---
description: "Evaluate whether a project is viable, functional, and scalable by analyzing its codebase against CONTEXT.md and ADRs. Use when the user wants a structured assessment of project health, architectural soundness, and growth boundaries before committing to further work."
---
# project-viability

When to use: Evaluate whether a project is viable, functional, and scalable by analyzing its codebase against CONTEXT.md and ADRs. Use when the user wants a structured assessment of project health, architectural soundness, and growth boundaries before committing to further work.

## Workflow

1. Pre-flight check
2. Gather context
3. Map the codebase
4. Automated baseline
5. Spawn parallel sub-agents
6. Quality gate
7. Aggregate findings
8. Write the report

## Deliverables

- pull-request artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Pre-flight checks resolved; automated baseline completed; three parallel sub-agents executed; quality gate passed; Viability Assessment saved to .reports/; JSON structured result returned; completion criteria verified; user asked how to proceed.
