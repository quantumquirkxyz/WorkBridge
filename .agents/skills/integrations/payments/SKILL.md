---
name: "payments"
category: "integrations"
maturity: "stable"
version: "2"
description: "Design payment flows as a high-trust seam with explicit failure, reconciliation, webhooks, idempotency, PCI DSS, and rollback posture — with Stripe, Adyen, or equivalent."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Payment design complete; flows, webhooks, and reconciliation explicit; PCI and fraud controls named."
risk: "medium"
trustTier: "3"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "payment"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/payments.json"
diataxis: "how-to"
tags: ["integrations"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: payments brief, money flow, provider options, and compliance constraints.
- Output: payment design covering flows, webhooks, idempotency, reconciliation, PCI, fraud, and provider evaluation.
- Scope: stay within the skill's declared boundaries; do not broaden without explicit direction.
- Rule: documented standards override defaults; explicit project rules take precedence.
- Rule: if blocked by missing context or dependencies, surface the blocker before proceeding.

## Provenance

| Question | Answer |
|---|---|
| What is the source of truth? | The user's request, originating spec/issue, and the skill's declared outputs |
| What is in scope? | Work covered by the skill's acceptance criteria and completion rules |
| What is explicitly out of scope? | Files, behaviors, and decisions outside the skill's declared boundary |
| Who or what consumes this artifact afterward? | The next skill in the workflow or the user |
| What evidence proves it is done? | Completion criteria met, artifact saved, validation passed |
| What risk remains? | Subjective judgment calls, missing context, or external dependency failures


## Artifact

Emit `PaymentsArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/payments/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# Payments

Use this skill when money moves through the system. It should keep the seam small, the trust boundary explicit, and the failure, reconciliation, and compliance story visible before implementation begins.


## Process

### 1. Map the payment flow

- **Authorization:** hold funds without capturing; authorization validity window.
- **Capture:** full vs partial; automatic vs manual capture; capture timing.
- **Void:** cancel authorization before capture; void vs refund distinction.
- **Refund:** full vs partial; refund timing; refund idempotency.
- **Dispute / chargeback:** evidence requirements, timeline, operator workflow.
- **Recurring:** subscriptions, invoicing, usage-based billing; proration.

**Completion criterion:** flow diagram or description saved.

### 2. Choose the payment provider

- **Stripe:** Payment Intents, Connect, Sigma, Radar; strongest developer experience.
- **Adyen:** enterprise-grade, global coverage, risk management; complex integration.
- **PayPal / Braintree:** consumer trust, PayPal checkout, Venmo.
- **Square:** in-person + online, POS integration.
- **Custom / ledger:** internal ledger, wallet, or ledger-backed payment; full control.

**Completion criterion:** provider chosen with rationale; lock-in risks named.

### 3. Design webhooks and events

- **Event types:** payment_intent.succeeded, payment_intent.failed, charge.dispute.created, invoice.payment_succeeded.
- **Webhook security:** signature verification, replay protection, idempotent handling.
- **Retry behavior:** exponential backoff, dead-letter queue, manual retry.
- **Event ordering:** idempotency keys, idempotency window, out-of-order handling.

**Completion criterion:** webhook strategy and event handling explicit.

### 4. Idempotency and retries

- **Idempotency keys:** client-generated keys; idempotency window; key rotation.
- **Retry policy:** retryable errors (network, 5xx); non-retryable errors (4xx, validation); max retries.
- **Duplicate detection:** database constraints, unique keys, deduplication logic.

**Completion criterion:** idempotency and retry strategy named.

### 5. Reconciliation and reporting

- **Daily reconciliation:** match provider transactions to internal ledger; discrepancy handling.
- **Settlement:** payout schedule, currency conversion, fees; settlement reports.
- **Balance tracking:** available balance, pending balance, reserved balance; ledger entries.
- **Operator workflow:** dispute investigation, refund approval, manual adjustment.

**Completion criterion:** reconciliation process and operator workflow named.

### 6. PCI DSS compliance

- **Scope reduction:** use hosted payment pages (Stripe Checkout, Elements) to minimize PCI scope.
- **Card data handling:** never store full card numbers; use tokens; PCI DSS SAQ A vs SAQ D.
- **Transmission:** TLS 1.2+; certificate pinning if applicable.
- **Vulnerability management:** quarterly scans, penetration testing, ASV scanning.

**Completion criterion:** PCI scope and controls named.

### 7. Fraud and risk management

- **Rules-based:** velocity limits, geolocation, AVS/CVV checks, blocklists.
- **ML-based:** Stripe Radar, Adyen Risk; custom models for fraud detection.
- **3D Secure:** SCA compliance, frictionless flow, challenge flow; exemption handling.
- **Dispute management:** evidence collection, timeline, auto-response rules.

**Completion criterion:** fraud controls and dispute workflow named.

### 8. Rollback and compensation

- **Failure handling:** payment failure → graceful degradation → retry → fallback payment method.
- **Compensation:** refund, credit, or store credit; partial compensation rules.
- **Idempotent rollback:** reverse ledger entries; reconciliation after rollback.

**Completion criterion:** rollback and compensation posture explicit.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml