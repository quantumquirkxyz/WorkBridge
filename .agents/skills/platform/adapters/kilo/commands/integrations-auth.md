---
description: "Design authentication and authorization as a small, explicit seam — with OAuth2/OIDC, MFA, passkeys, JWT, session management, and clear caller and operator responsibilities."
---
# auth

When to use: Design authentication and authorization as a small, explicit seam — with OAuth2/OIDC, MFA, passkeys, JWT, session management, and clear caller and operator responsibilities.

## Workflow

1. Identify the identity source, trust boundary, and actors
2. Choose authentication flows
3. Design token and session model
4. Define authorization model
5. MFA and passwordless design
6. Security assessment
7. Provider and protocol selection

## Deliverables

- authentication artifact

## Guardrails

- risk: medium; trust tier: 3; approval required: yes
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Auth design complete; flows documented; security assessment explicit.
