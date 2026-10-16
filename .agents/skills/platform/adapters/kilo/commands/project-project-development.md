---
description: "Evaluate a project's shape, agent fit, and architectural starting point — before the main workflow begins."
---
# project-development

When to use: Evaluate a project's shape, agent fit, and architectural starting point — before the main workflow begins.

## Workflow

1. Read the minimum repo context needed to understand the stack and current constraints
2. Classify the project shape: interactive app, batch pipeline, agentic system, library, backend service, or hybrid
3. Identify whether the first useful seam is in UI, API, data, execution, or governance
4. Recommend the next workflow skill and explain why it is the thinnest safe path

## Deliverables

- pull-request artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Evaluate a project's shape, agent fit, and architectural starting point complete; structured result returned; completion criteria checked.
