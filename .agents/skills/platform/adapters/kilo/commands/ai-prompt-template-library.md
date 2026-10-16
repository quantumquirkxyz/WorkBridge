---
description: "Prompt template library (versioned templates, A/B testing, composition, evaluation)"
---
# prompt-template-library

When to use: Prompt template library (versioned templates, A/B testing, composition, evaluation)

## Workflow

1. Template manifest
2. A/B experiment
3. Composition library
4. Evaluation suite
5. Fallback and escalation

## Deliverables

- pull-request artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Templates green on acceptance suite with evaluation and fallback.
