# Design — counselor gate trust seam

**Status:** accepted — ADR-0010
**Date:** 2026-10-18
**Author:** agent, from the project-viability assessment (`.reports/20261018-viability.md`)
**Related:** ADR-0002 (employability system boundaries), ADR-0003 (verification and human approval), ADR-0008 (role-organization authorization), ADR-0010 (trusted decision source)
**Scope of this document:** the shape of the module and where the seam goes. It does not implement the change.

## Problem

The counselor gate is documented as a trust boundary: ADR-0002 and ADR-0003 require a
human to approve any case with a critical gap, an unverified credential, a bias alert,
or infeasible transport, and `docs/arquitectura.md` §6 advertises it as an enforced
layer. In the running system it is enforced from client-controlled data.

`ApplicationService.createDraft` builds the draft from the request body and the gate is
computed from that body:

```
createDraft(session, body)                       apps/agent-runtime/src/application/service.ts:176
  └─ parseDraftInput(body)                       service.ts:559   ← match, evidence, employerOrgId from the body
  └─ counselorGate(draft)                        service.ts:674
       └─ counselorGateReasons(draft.input.match, selectedEvidence)   gates.ts:9
            ├─ match.gaps[].severity              gates.ts:14-18   ← critical_gap
            ├─ evidence[].credentialStatus        gates.ts:19-23   ← unverified_credential
            ├─ match.biasAlerts                   gates.ts:24-26   ← bias_alert
            └─ match.transport.feasible           gates.ts:27-29   ← infeasible_transport
```

Every one of those four signals is a plain field the caller supplies. There is a second,
quieter facet: even an honest caller produces an empty `biasAlerts`, because the UI match
path never runs the counterfactual auditor — `biasAlerts` is projected from the vacancy
document (`matching/adapt.ts:107`) and the seed catalog hard-codes `alerts: []`
(`matching/catalog-input.ts:46`). So the gate is both bypassable and, in the honest case,
blind.

### Evidence

A throwaway test at the `ApplicationService` seam, with a trusted source that reports a
critical gap, a bias alert and infeasible transport:

| Case | Assertion | Result |
|---|---|---|
| (a) clean body, no gap claimed | `counselorGate == []`, and `submit` reaches `pending_employer_approval` with no counselor approval | **passes today** |
| (b) trusted decision has a critical gap | `counselorGate` contains `critical_gap` | **fails today** (`expected [] to include 'critical_gap'`) |

Case (a) is the exploit: a candidate asserts a clean match and skips the counselor
entirely. Case (b) is the missing behaviour. The runtime never consults any trusted
source for the gate.

## The seam

There is already a trusted server seam that does exactly this work, used only for the
employer shortlist:

```
ShortlistSource                                   apps/agent-runtime/src/application/shortlist.ts:10-13
  ownerOf(vacancyId) -> string | undefined        shortlist.ts:32-34
  match(candidateId, vacancyId) -> { decision?, biasBlocked }   shortlist.ts:35-76
```

`match` already loads the profile and preferences from SQL, re-runs the solver, **runs
the counterfactual auditor**, and derives `biasAlerts` from the auditor rather than the
vacancy document (`shortlist.ts:59-68`). Its doc comment already states the contract:
"Trusted server seam. Neither ownership nor match scores come from application bodies."

The seam is real (one adapter, `createShortlistSource`) and it already varies across
consumers — it is not a hypothetical. The design decision is therefore **to widen the
existing seam rather than add a new one**, and to rename it to what it actually is.

### Interface

```
ApplicationDecisionSource            (renamed from ShortlistSource)
  ownerOf(vacancyId: string): string | undefined
  decisionFor(candidateId, vacancyId): Promise<
    | { kind: "decision"; decision: MatchDecision; biasBlocked: boolean }
    | { kind: "blocked" }
    | { kind: "unavailable"; reason: "not_applicable" | "no_profile" | "not_configured" | "no_decision" }
  >
```

ADR-0010 settles this shape; the design is accepted and implementation is delegated to tickets #19–#21. The outcome is a fact, not a policy, and each consumer maps
it: the employer shortlist keeps today's behaviour exactly (including that a candidate
without a persisted profile is skipped rather than an error), while draft creation refuses
with `503 decision_unavailable` when a catalog vacancy has no trusted decision.

Callers must know exactly three things:

- **Ownership is authoritative.** `ownerOf` is the only source of vacancy ownership; a
  value from a request body is never consulted.
- **`decisionFor` is authoritative and its absence is explicit.** There is no nullable
  decision: `blocked` and the four `unavailable` reasons are distinguished, because they
  do not share a policy. Absence is not success.
- **Absence fails closed for draft creation.** A draft is never created with an empty gate
  when the trusted decision could not be resolved; the runtime refuses instead of trusting
  the body.

### What stays hidden behind the interface

- That the profile and preferences live in Postgres and are read through `SqlQuery`.
- That the solver is re-run, and that the counterfactual auditor runs three extra
  matching passes over protected attributes.
- That `biasAlerts` come from the auditor and not from the vacancy document.
- That `biasBlocked` short-circuits the shortlist to an empty list.
- The catalog lookup, the geocoding fallback, and the matching configuration.

That set of facts is what makes this a deep module rather than a pass-through: callers
get "is this application safe to move forward" without learning any of it.

### Adapter role

`createShortlistSource` (`shortlist.ts:17`) becomes `createApplicationDecisionSource`:
the single adapter, SQL-plus-solver-plus-auditor backed, and the only place a decision
is ever recomputed. The `.reports` seam note: in memory mode (`query === undefined`) the
adapter cannot answer — this is the case that must fail closed rather than degrade.

## Depth analysis

**Deletion test.** Delete `ApplicationDecisionSource` and what happens? Profile loading,
solver re-run, counterfactual audit, alert derivation, ownership resolution and the
fail-closed rule reappear in each caller — `createDraft`, `shortlistForVacancy`, the
counselor queue and any future employer surface. The complexity does not vanish, it
multiplies. The module earns its keep.

**Locality.** Today the trust rule for ownership already lives in one place (after the
previous change, `withTrustedEmployerOrg`), but the trust rule for *aptitude, gaps,
alerts and transport* lives nowhere — it is assumed to arrive in the body. This design
concentrates both in one module, so "what makes an application move" has a single
answer.

**Leverage.** Two consumers become three-four over time (`createDraft`, counselor queue,
shortlist, and the bias gate's audit trail) from one adapter. Each additional consumer
becomes a few lines rather than a new trust argument.

**Risk of widening.** `createDraft` must become asynchronous, because the trusted
decision requires I/O. That is the honest cost and the main reason this deserves a
decision record rather than a drive-by patch.

## Alternatives considered

**A — Keep the body as the source, and make the UI match path run the auditor.**
Rejected. It fixes the "honest caller sees empty alerts" facet but leaves the gate
client-controlled: a crafted body still skips it. It also pays the counterfactual cost
per vacancy on every page view.

**B — Sign the decision in the BFF and verify it in the runtime.**
Rejected for now. It introduces key management and a new trust token to maintain, and it
still requires the BFF to obtain a trusted decision from somewhere. It adds a mechanism
without removing the underlying question of who may decide.

**C — Widen the existing trusted seam and make the gate consume it (recommended).**
Reuses the seam that already does the work and whose contract already forbids
body-sourced truth. Costs an async `createDraft` and an explicit failure mode when
persistence is absent.

**D — Move gate evaluation to `submit` only.**
Rejected. It would make the counselor queue (`listDrafts` filter) and the draft view
show an untrusted gate while claiming to show the real one, and it leaves the candidate
able to see "no gate" until the last moment.

## What has to be true after the change

Testable, at the seam:

1. A draft whose trusted decision has a critical gap, an unverified credential, a bias
   alert or infeasible transport **always** carries the corresponding `counselorGate`
   code, regardless of what the body claims.
2. A body claiming a clean match cannot clear a gate the trusted decision raises.
3. When the trusted decision is unavailable for `no_profile`, `not_configured` or
   `no_decision`, draft creation refuses with `503 decision_unavailable`; `not_applicable`
   preserves the existing invisible-draft behavior. No empty gate is created from an unavailable trusted decision.
4. `submit` still refuses without counselor approval when a trusted gate exists
   (`service.ts` `submit` path), and the counselor queue still lists exactly the gated
   drafts.
5. Ownership resolution is unchanged from the current behaviour (owner from the seam,
   body value only when the seam has no owner).

## Migration outline (slices)

1. Widen and rename the seam; keep `shortlistForVacancy` behaviour identical (no
   observable change).
2. Make `createDraft` async and resolve ownership plus decision through the seam; refuse
   with `503 decision_unavailable` for unavailable trusted decisions. Update the HTTP
   dispatch (`server.ts:116`) and the tests that call `createDraft` directly.
3. Delete the now-dead body-sourced path for `match` on draft creation, or mark it
   explicitly as an advisory echo that cannot influence the gate.
4. Add the regression tests for points 1-3 above.

Slice 1 is a no-op by design, which makes it safe to review on its own.

## Decision record

In memory mode there is no persisted profile, so no trusted decision exists. The
accepted policy is to refuse draft creation with `503 decision_unavailable` for
`no_profile`, `not_configured` or `no_decision`; `not_applicable` preserves the
existing invisible-draft behavior. Forcing the gate was rejected in ADR-0010.
