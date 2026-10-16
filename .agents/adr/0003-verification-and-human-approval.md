# ADR-0003: Use layered credential verification and human-gated applications

## Status

Accepted with technical integration pending

## Context

Credential claims affect aptitude decisions and must be distinguished from declared evidence.
The system must also perform a real action while preventing unauthorized or inaccurate job
applications.

## Decision

Verify credentials in this order:

1. Certo, using Open Badges 3.0 and W3C Verifiable Credentials proof and revocation checks;
2. Accredible when Certo cannot verify;
3. Credly when the previous providers cannot verify.

The system records provider, evidence, status, and fallback reason. It uses `verified`,
`partially_verified`, `declared`, `unverified`, and `rejected` states. `partially_verified`,
recorded for issue #6, means the proof passed while issuer trust, revocation, or holder
binding is incomplete. A holder id that does not match is `rejected`, not `partially_verified`.
If the real Certo deployment or contract is
unavailable, the system uses a common adapter and a deterministic mock without claiming external verification.

Applications move through `draft`, `pending_human_approval`, `approved`, or `rejected`.
Only `approved` applications may be submitted by an authorized tool.

## Consequences

- The system satisfies the action and human-in-the-loop requirements.
- Verification errors can be measured against at least 15 labelled ground-truth cases.
- Provider integration details and credentials remain an explicit implementation dependency.
- Certo is deployed separately from the application monorepo, preserving a clear service boundary.
- Its AGPL-3.0 license must be respected and reviewed before modification or distribution.
