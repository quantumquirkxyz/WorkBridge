# Skills Platform

Shared resources for the repository-local Skills platform.

- `schemas/implement-schema.json` defines the implementation artifact contract.
- `schemas/publish-open-pr-schema.json` defines the PR publication artifact contract.
- `schemas/` contains the remaining cross-skill artifact contracts, including review, handoff, ticket, delegation, and agent-card schemas.
- `context-packs.md` defines the context-pack concept and read-order rules.
- `execution-policy.md` defines the side-effect policy surface.
- `registry.md` defines the canonical registry vocabulary.
- `validate-skills.mjs` checks `.agents/` canonicality, `.claude/` parity, and lock coverage.
- `audit-semantics.mjs` checks retired names, weak template markers, dependencies, Markdown links, and lock drift.
- `evaluate-scenarios.mjs` checks scenario fixtures for route, phrase, reference, and side-effect expectations.
- `evaluate-behavioral-fixtures.mjs` checks representative artifact outputs for required sections.
- `check-all.mjs` runs the full validation gate.
- `sync-bundle.mjs` dry-runs or applies bundle sync into another repository.
- `mcp-server/` hosts the Model Context Protocol servers; see [the MCP server README](mcp-server/README.md) for transports, tools, and security rules.

## The local gate

`check-all.mjs` runs the full gate (`node .agents/skills/platform/check-all.mjs`). Besides the bundle audits listed above, it wires the new infrastructure checkers in two tiers: gating entries fail the gate, report-only entries can only annotate it.

### Gating checks (a non-zero exit fails the gate)

| Command | What it catches |
| --- | --- |
| `node .agents/skills/platform/validate-runtime-manifests.mjs --check --json` | All 246 runtime manifests: JSON-Schema conformance, exact bundle coverage (no missing or orphaned manifest), and drift from the current frontmatter (stale hashes, guardrail or execution inconsistencies). Regenerate with `scripts/build-runtime-manifests.mjs`. |
| `node .agents/skills/platform/scripts/run-skill-task.mjs task-lockfile-integrity --json` | An end-to-end run of the miniature SWE-bench harness: the mini-bundle workspace is seeded, the lockfile-drift defect is injected and repaired, and the final state is verified by state checks, never by transcript. One task runs in the gate to bound its wall time; run `--list` to see the rest. |
| `node .agents/skills/platform/scripts/build-skill-index.mjs --json` | Dry run (no `--write`): the BM25 index builder parses and indexes the whole bundle, so a broken frontmatter read or a failing derivation fails the gate. The index is deterministic; regenerate the committed one with `--write` after bundle changes. |

### Report-only checks (reported, never fail the gate)

| Command | What it catches |
| --- | --- |
| `node .agents/skills/platform/check-tool-risk-policy.mjs --json` | The tool-risk policy (`policy/tool-risk.yaml`) evaluated against every shippable skill: unapproved side effects, high-risk skills with approval-gated tools, undocumented untrusted input, MCP exposure allow-lists, allow/deny overlap. It currently reports 84 error-severity findings of real bundle debt, so it reports through the shared manifest instead of gating; its entry keeps the CLI's own exit condition (errors report, warnings never do, because the CLI is not `--strict`). |
| `node .agents/skills/platform/scripts/generate-adapters.mjs --json` | Adapter drift: all 1484 committed adapters are regenerated in memory and compared byte for byte, and stale generated files are listed. The CLI's dry run always exits 0, so drift is reported through the gate's report-only entry instead of failing it. Repair with `--write`. |
| `node .agents/skills/platform/fix-compatibility-view.mjs --json` | Compatibility-view drift: `.claude/skills/` is scanned for dangling links and absolute symlink targets. Dry-run mode does not mutate the working tree and normally exits 0, so `check-all.mjs` reports pending repairs without making it a gating subprocess. Repair with `--write`. |

Every report-only entry keeps the command string, exit code, and report shape of its CLI, so the gate's JSON stays comparable with a direct run of the same command.
