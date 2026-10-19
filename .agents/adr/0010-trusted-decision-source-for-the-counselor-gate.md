# ADR-0010: Resolve the counselor gate from a trusted decision source

## Status

Accepted — 2026-10-18. Maintainer chose the fail-closed policy (refuse on an
unavailable decision). Implementation lands through the linked tracer-bullet
tickets, not in this record.

## Context

ADR-0002 and ADR-0003 make the **counselor gate** a human trust boundary: a
counselor must approve any application that carries a critical gap, an unverified
credential, a bias alert, or infeasible transport. `docs/arquitectura.md` §6
presents it as an enforced layer.

In the running system it is enforced from caller-supplied data.
`ApplicationService.createDraft` builds the draft from the request body and
`counselorGateReasons` reads four signals out of it:

| Signal | Source today |
|---|---|
| `critical_gap` | `match.gaps[].severity` from the request body |
| `unverified_credential` | `evidence[].credentialStatus` from the request body |
| `bias_alert` | `match.biasAlerts` from the request body |
| `infeasible_transport` | `match.transport.feasible` from the request body |

Two defects follow:

1. **The gate is bypassable.** A caller that posts a clean `match` and clean
   evidence gets an empty gate. Verified at the `ApplicationService` seam: a draft
   with an empty gate submitted straight to `pending_employer_approval` with no
   counselor approval.
2. **The gate is blind even for honest callers.** The counterfactual auditor never
   runs on the UI match path, so `biasAlerts` is projected from the vacancy
   document and the seed catalog hard-codes `alerts: []`. The `bias_alert` reason
   can therefore never fire in production, whatever the auditor would say.

A trusted seam that already does this work exists, but only serves the employer
shortlist: `ShortlistSource.match` loads the profile and preferences, re-runs the
solver, runs `auditCounterfactuals`, and derives alerts from the auditor. Its own
contract comment reads "Neither ownership nor match scores come from application
bodies."

## Decision

- **One widened seam, renamed to what it does.** `ShortlistSource` becomes
  `ApplicationDecisionSource`, still with a single adapter
  (`createApplicationDecisionSource`). No second seam is introduced; the existing
  one already varies across consumers.
- **The seam reports facts; consumers apply policy.** Reading the adapter showed
  that "no decision" currently conflates several unrelated causes — a vacancy
  outside the catalog, a candidate with no persisted profile, a deployment with no
  persistence, and an audit that blocked the vacancy — behind a single `undefined`.
  They must not share a policy, so the outcome is explicit:

  ```
  ownerOf(vacancyId: string): string | undefined

  decisionFor(candidateId, vacancyId): Promise<
    | { kind: "decision"; decision: MatchDecision; biasBlocked: boolean }
    | { kind: "blocked" }          // the counterfactual audit blocked this candidate from this vacancy
    | { kind: "unavailable"; reason: "not_applicable" | "no_profile" | "not_configured" | "no_decision" }
  >
  ```

  `not_applicable` is a vacancy outside our catalog, `no_profile` is a catalog
  vacancy with no persisted profile or preferences for this candidate,
  `not_configured` is a deployment with no persistence at all, and `no_decision` is
  a candidate the solver produced no decision for (for example one excluded by hard
  constraints even though the audit did not block the vacancy).
- **Each consumer maps the outcome to its own policy**, which is what keeps the
  interface from smuggling a policy into the seam:

  | Outcome | Employer shortlist (today, unchanged) | Draft creation (new) |
  |---|---|---|
  | `decision` | rank it (`biasBlocked` yields an empty list) | gate from the decision |
  | `blocked` | empty list | gate with `bias_alert` |
  | `unavailable` / `not_applicable` | skip the submission | no owner, no gate (invisible) |
  | `unavailable` / `no_profile` | skip the submission | **refuse 503 `decision_unavailable`** |
  | `unavailable` / `no_decision` | skip the submission | **refuse 503 `decision_unavailable`** |
  | `unavailable` / `not_configured` | **throw 503 `shortlist_unavailable`** | **refuse 503 `decision_unavailable`** |

- **The counselor gate consumes the seam, never the body.** `createDraft` resolves
  the decision through `decisionFor` and computes the gate from it. A `match` in
  the request body may remain as an advisory echo for display, but it must not be
  able to influence the gate.
- **Ownership is unchanged.** `ownerOf` stays the only source of vacancy
  ownership, as already implemented; a body value is used only when the seam has
  no owner, which keeps non-catalog drafts invisible rather than rejected.
- **Fail-closed is an explicit choice, not a default.** When a catalog vacancy
  cannot be resolved to a trusted decision (`no_profile` or `not_configured`),
  `createDraft` refuses with **503** `decision_unavailable` rather than creating a
  draft with an empty gate. Forcing the counselor gate instead was considered and
  rejected (see Alternatives). `not_applicable` keeps today's behaviour: a vacancy
  outside the catalog still produces a draft with no owner and no gate, because
  ownership already makes it invisible.

## Consequences

- The counselor gate becomes a real boundary: it cannot be cleared by request
  content, and `bias_alert` becomes reachable because the auditor is now on the
  path that feeds the gate.
- `createDraft` must become asynchronous, because a trusted decision requires I/O.
  The HTTP dispatch and every direct caller in the tests must follow.
- Draft creation now depends on persisted candidate records. Deployments without
  persistence lose the ability to create drafts for catalog vacancies (503) —
  accepted deliberately, since without persistence there is no trusted decision
  and a gate that cannot be computed must not read as "no gate".
- The seam grows a third consumer (draft creation, counselor queue, employer
  shortlist) without adding a trust argument, which is the point of widening
  rather than duplicating.
- The rename touches the shortlist tests; the first migration slice is
  behaviour-preserving so it can be reviewed on its own.

## Alternatives considered

- **Run the auditor on the UI match path and keep the body as the gate source.**
  Rejected: it fixes honest blindness but leaves the gate caller-controlled, and it
  pays the counterfactual cost per vacancy on every page view.
- **Sign the decision in the BFF and verify it in the runtime.** Rejected for now:
  adds key management and a trust token without settling who may decide, and the
  BFF would still need a trusted decision from somewhere.
- **Evaluate the gate only at submit time.** Rejected: the draft view and the
  counselor queue would present an untrusted gate as if it were real, and the
  candidate would see "no gate" until the last moment.
- **Force the counselor gate on every `unavailable` decision instead of refusing.**
  Rejected by the maintainer: refusing is simpler to reason about, and forcing
  would gate every draft in modes that have no persistence at all.

## Links

- Design document: `.agents/skills/platform/artifacts/codebase-design/counselor-gate-trust-seam.md`
- Assessment that surfaced it: issue #18 and its accepted design record
- Tracker: issue #18, implemented through tickets #19, #20 and #21
- Related: ADR-0002 (employability system boundaries), ADR-0003 (verification and
  human approval), ADR-0008 (ownership bound to the seeded organization)
- Code: `apps/agent-runtime/src/application/gates.ts`,
  `apps/agent-runtime/src/application/shortlist.ts`,
  `apps/agent-runtime/src/application/service.ts`
