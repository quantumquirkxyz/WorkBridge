---
description: "Structured output for LLMs (JSON mode, function calling, constrained decoding, validation)"
---
# structured-output

When to use: Structured output for LLMs (JSON mode, function calling, constrained decoding, validation)

## Workflow

1. Output schema
2. Prompt and contract
3. Constrained decoding
4. Validation harness
5. Retry and fallback

## Deliverables

- ai artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Structured output green on acceptance suite with validation harness.
