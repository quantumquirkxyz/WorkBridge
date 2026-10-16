---
description: "Design payment flows as a high-trust seam with explicit failure, reconciliation, webhooks, idempotency, PCI DSS, and rollback posture — with Stripe, Adyen, or equivalent."
---
# payments

When to use: Design payment flows as a high-trust seam with explicit failure, reconciliation, webhooks, idempotency, PCI DSS, and rollback posture — with Stripe, Adyen, or equivalent.

## Workflow

1. Map the payment flow
2. Choose the payment provider
3. Design webhooks and events
4. Idempotency and retries
5. Reconciliation and reporting
6. PCI DSS compliance
7. Fraud and risk management
8. Rollback and compensation

## Deliverables

- payment artifact

## Guardrails

- risk: medium; trust tier: 3; approval required: yes
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Payment design complete; flows, webhooks, and reconciliation explicit; PCI and fraud controls named.
