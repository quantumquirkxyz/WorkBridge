---
description: "Blackbox-verify a delegated worker's claim before it is accepted, using the artifact, the declared success criteria, and the tools needed to re-check them - never the worker's implementation narrative."
---
# verify-delegation

When to use: Blackbox-verify a delegated worker's claim before it is accepted, using the artifact, the declared success criteria, and the tools needed to re-check them - never the worker's implementation narrative.

## Workflow

1. **Receive the brief.** Validate it against `DelegationBrief`. Reject a brief with no `boundaries`, no `stopCondition`, or `readOnly: false` without a declared mutating side effect on the caller
2. **Split context-centrically.** One artifact, one verifier. Never split one artifact across phases of delegation - that is the documented telephone-game failure
3. **Scale effort.** Simple objective: one worker, 3-10 tool calls. Comparison: 2-4 workers. Complex: more than 10 tool calls or several independent sources, with an explicit `effortBudget`
4. **Hand over a clean room.** Give the verifier the artifact, the criteria, and the read-only tools. Withhold the implementation context
5. **Run the checks.** Re-run each criterion, run the negative tests, then run the full suite
6. **Emit the verdict.** Write the `DelegationVerdict` artifact, return the bounded summary plus `artifactRef`, and stop

## Deliverables

- agent artifact

## Guardrails

- risk: low; trust tier: 2; approval required: no
- side effects: write-temp-file
- isolation: none; model tier: reasoning

Stop when: Every declared success criterion is re-checked against the artifact with evidence, negative tests were run, and a bounded DelegationVerdict plus artifact reference is returned to the caller.
