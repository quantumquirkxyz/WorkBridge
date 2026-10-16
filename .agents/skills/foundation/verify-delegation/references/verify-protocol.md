# Delegation Verification Protocol

Research basis for `verify-delegation`. Citations at the end; every rule below traces to one of them.

## 1. Brief anatomy — the six required fields

A delegation brief is the only thing a worker sees. It is not a summary of a conversation; it is a
work order. Six fields are mandatory (see `delegation-brief.schema.json`):

| Field | Answers | Failure when missing |
|---|---|---|
| `objective` | What single outcome must exist when this run ends? | The worker invents its own goal. |
| `outputFormat` | `summary`, `artifact-reference`, or `findings-only` | Caller receives prose where a verdict was needed. |
| `toolGuidance` | Which tools and sources, in what order, and what to do when a source is missing | The worker guesses, then reports a guess with confidence. |
| `boundaries` | What the worker must NOT do (at least one) | Two workers do the same thing and disagree. |
| `stopCondition` | The observable condition that ends the run | The worker runs until the budget dies. |
| `effortBudget` | `maxToolCalls`, `maxSubagents`, `maxMinutes` | Effort is not scaled to complexity. |

### Worked example — the vague brief

Failure. The orchestrator writes: *"Research the semiconductor shortage and tell me what it means
for our supply contracts."*

Three workers, three different products: one reads news, one reads trade law, one reads nothing and
reasons from the phrase itself. The aggregator receives three incommensurable summaries, spends a
fourth agent reconciling them, and ships a conclusion nobody sourced. The delegation cost more than
the task.

Repair. Same objective, canonical brief:

- `objective`: "List the contractual clauses in `contracts/silicon-*.pdf` exposed to a 12-week lead-time increase, one row per clause."
- `outputFormat`: `artifact-reference` — write `findings/silicon-exposure.md`, return its path plus a 120-word summary.
- `toolGuidance`: "Read only `contracts/` and the lead-time series in `data/leadtimes.csv`. If a contract has no lead-time clause, record `none` rather than inferring."
- `boundaries`: ["Do not read or summarise news, analyst reports, or anything outside `contracts/` and `data/`.", "Do not recommend a renegotiation strategy.", "Do not contact external sources."]
- `stopCondition`: "Every file matching `contracts/silicon-*.pdf` has a row or an explicit `none`."
- `effortBudget`: `{ maxToolCalls: 40, maxSubagents: 1, maxMinutes: 20 }`

Same objective, bounded output, no duplicated work. That is the whole difference.

## 2. Context-centric decomposition, not problem-centric

Decompose by **what context the worker needs**, not by which adjective of the problem it owns.
Splitting one artifact across phases is the documented telephone-game failure: each hop rewrites the
previous claim, and the final consumer cannot tell which claim was original.

| Split | Verdict | Why |
|---|---|---|
| One artifact, one objective, one worker | Allowed | The worker holds everything it needs. |
| Three artifacts, same artifact type, three workers | Allowed | Independent sources, later aggregated. |
| One artifact split across phase A → phase B | **Prohibited** | Phase B never sees phase A's context; the seam rewrites the claim. |
| Same-role reviewers debating in rounds | **Prohibited** | Homogeneous debate; see §6. |
| One verifier over each worker's artifact | Allowed and required | Clean context is the verifier's strength. |

## 3. Effort scales with complexity

| Complexity | Shape | Tool calls |
|---|---|---|
| Simple | One worker, one objective | 3-10 |
| Comparison | 2-4 workers, each on its own artifact | per worker, budgeted |
| Complex | More than 10 tool calls, or several independent sources | explicit `effortBudget`, one owner for integration |

Record `tokensUsed` and `durationMs` on the verdict so the next brief of the same shape can be
budgeted from evidence instead of intuition.

## 4. Early victory — the anti-pattern

A worker runs one check, it passes, and it declares done. The caller accepts, because the summary
sounds finished. Three mitigations, all mandatory in this bundle:

1. **Concrete criteria.** Every success criterion must name an observable check. "Works correctly" is
   not a criterion; "the suite for `delegation-brief` passes and rejects a brief without `boundaries`" is.
2. **Negative tests.** At least one check that must fail before the artifact can be trusted — a
   schema rejection, a missing input, a deliberately broken case. `negativeTestsRun` is recorded on the
   verdict; a pass over a mutating artifact with zero negative tests is invalid.
3. **The full suite must run.** `fullSuiteRun: true` is required for any `pass`. If the suite cannot
   run, the verdict is `blocked`, not `pass`.

## 5. The bounded-summary rule

Subagent output goes to the filesystem; what returns to the caller is a bounded summary plus a
reference to it. Never a transcript. A summary that is not bounded is a transcript with fewer words,
and a transcript is the game of telephone re-encoded. Bound it: a word limit, a fixed set of fields
(`DelegationVerdict`), and an `artifactRef` the caller can open when it needs the detail.

## 6. When NOT to delegate — and the anti-debate rule

Do not delegate when:

- the task is a single step that fits in the caller's context — delegation costs more than it saves;
- the worker would need the caller's implementation context to proceed — that is context the caller
  already has, and copying it out and back is the telephone game;
- the objective cannot be checked by someone who did not do the work — write the criterion first, or
  do not delegate;
- no boundary can be stated — an unbounded worker invents scope;
- the "comparison" is one artifact passed between peers in sequence — that is one artifact split
  across phases, prohibited in §2.

**Anti-debate rule.** Do not break a tie by running same-role reviewers in debate rounds. Measured
cost: homogeneous multi-agent debate spends 2.1-3.4x the tokens and exhibits sycophantic conformity up
to 85.5% — the agents converge on each other, not on the artifact. The cheaper and stronger move is
one reviewer with a different role, a clean context, the artifact, and the criteria.

## Citations

- Anthropic, *How we built our multi-agent research system* — https://www.anthropic.com/engineering/multi-agent-research-system — brief anatomy (objective, output format, tool and source guidance, task boundaries), effort scaled to complexity, subagent output to the filesystem with a bounded summary and reference instead of a transcript.
- Anthropic, *Building multi-agent systems: when and how to use them* — https://www.claude.com/blog/building-multi-agent-systems-when-and-how-to-use-them — context-centric decomposition, splitting one artifact across phases as the documented failure, the verification subagent holding artifact, success criteria, and tools but no implementation context, and the early-victory mitigations (concrete criteria, negative tests, running the full suite).
- Claude Code subagents documentation — https://docs.claude.com/en/docs/claude-code/subagents — tool restrictions make isolation safe; subagents are read-only by default.
- LangChain deepagents documentation — https://docs.langchain.com/deepagents — subagent isolation and the "when not to delegate" list (§6).
- arXiv:2605.00914 — homogeneous multi-agent debate costs 2.1-3.4x tokens with up to 85.5% sycophantic conformity; role-diverse single reviewer with clean context is the better trade.
