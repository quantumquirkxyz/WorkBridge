---
description: "Analyze network protocols — packet formats, handshakes, congestion control, routing, and transport behavior — with explicit timing and failure assumptions."
---
# networking-protocols

When to use: Analyze network protocols — packet formats, handshakes, congestion control, routing, and transport behavior — with explicit timing and failure assumptions.

## Workflow

1. Define endpoints, intermediaries, protocol layer, and expected state transitions
2. Trace the normal message flow and handshake
3. Identify timing, retry, congestion, and ordering behavior
4. Compare observed packets or logs against expected flow
5. Analyze failure cases: loss, reordering, MTU, DNS, routing, TLS, and connection resets
6. Summarize root cause candidates or design implications

## Deliverables

- pull-request artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Protocol state, message flow, and failure assumptions are explicit.
