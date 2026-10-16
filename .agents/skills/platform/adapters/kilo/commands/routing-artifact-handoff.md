---
description: "Transfer structured artifacts between Skills and sessions — with explicit provenance and consumer expectations."
---
# artifact-handoff

When to use: Transfer structured artifacts between Skills and sessions — with explicit provenance and consumer expectations.

## Workflow

1. Package the artifact with id, type, producer, status, summary, evidence, and consumers
2. Include the minimal context pointer required by the consumer
3. Preserve provenance and redaction by default

## Deliverables

- routing artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: router

Stop when: Transfer structured artifacts between Skills and sessions complete; structured result returned; completion criteria checked.
