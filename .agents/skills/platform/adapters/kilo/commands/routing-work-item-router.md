---
description: "Force reading the canonical work-item governance index before routing specs, tickets, project boards, or publication flows."
---
# work-item-router

When to use: Force reading the canonical work-item governance index before routing specs, tickets, project boards, or publication flows.

## Workflow

1. Read `docs/reference/agents/index.md`
2. Identify whether the request is a spec, ticket, spec completion audit, ticket coverage audit, corrective ticket publication, project board, PR publication, review-fix plan, or closeout
3. Route to the thinnest downstream skill that can finish the work
4. If metadata is involved, preserve the canonical shape from `docs/reference/agents/work-item-format.md`
5. Return the routing decision as structured output in the current response; rely on execution traces for auditability

## Deliverables

- plan artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: router

Stop when: Force reading the canonical work-item governance index before routing specs, tickets, project boards, or publication flows complete; structured result returned; completion criteria checked.
