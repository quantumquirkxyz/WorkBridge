---
description: "Test security posture — auth flows, authorization boundaries, injection paths, session handling, and misconfiguration checks — with adversarial scenarios."
---
# qa-security-testing

When to use: Test security posture — auth flows, authorization boundaries, injection paths, session handling, and misconfiguration checks — with adversarial scenarios.

## Workflow

1. Identify assets, roles, trust boundaries, and security assumptions
2. Define test scenarios for auth, authorization, input handling, sessions, and configuration
3. Exercise positive and negative paths with controlled accounts and data
4. Capture evidence safely: request shape, response, logs, and redacted identifiers
5. Rate findings by impact, likelihood, and affected boundary
6. Recommend remediation and retest criteria

## Deliverables

- test-strategy artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Security boundaries, findings, and responsible next steps are documented.
