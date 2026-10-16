# Runtime manifests (generated)

Every `*.runtime.json` file in this directory is generated. Do not edit these
files by hand; the next regeneration overwrites them.

Each file is a deterministic projection of the frontmatter of one bundle skill:
`<domain>-<skill>.runtime.json` is derived from
`.agents/skills/<domain>/<skill>/SKILL.md`. The platform domain is
infrastructure and is not projected; every bundle skill gets exactly one
manifest.

## Regenerate

Dry run (reports how many manifests would be written):

    node .agents/skills/platform/scripts/build-runtime-manifests.mjs

Write every manifest plus this README:

    node .agents/skills/platform/scripts/build-runtime-manifests.mjs --write

Write a single skill:

    node .agents/skills/platform/scripts/build-runtime-manifests.mjs --write --skill delivery/review-pr

Validate the directory against the schema, the bundle coverage, and the
frontmatter consistency of every manifest:

    node .agents/skills/platform/validate-runtime-manifests.mjs --check --json

## Field derivation

| Field | Rule |
| --- | --- |
| `skill` | Bundle identity `<domain>/<skill>`. |
| `version` | Runtime manifest format version (`1`). |
| `generatedFrom` | Always `frontmatter`; manifests are mechanical projections. |
| `frontmatterHash` | `sha256` of `JSON.stringify` over the frontmatter object with sorted keys; the validator compares it to detect drift. |
| `role` | `workflow` when the frontmatter declares `inputs` or a non-empty `artifactType`; `tool` otherwise. |
| `router` | `{positive: [], negative: [], requiredSignals: []}`; routing signals are filled in a later phase. |
| `execution.defaultAgent` | `explore` when `trustTier` is 1 and `sideEffects` is empty; `general` otherwise. |
| `execution.isolation` | `worktree` when `sideEffects` holds a mutating effect (`write-files`, `write-code`, `post-pr-comment`, `issue-mutation`, `git-mutation`); `none` otherwise. |
| `execution.maxTurns` | The frontmatter `maxIterations`, or `6` when absent or not a positive integer. |
| `execution.modelTier` | The frontmatter `modelTier`; `code` normalizes to `reasoning`; `reasoning` when absent. |
| `execution.tools.allow` | `Read`, `Grep`, `Glob` on every manifest; `Bash` when the description, capabilities, or body match `/run (?:the )?(?:test\|command\|script)\|shell\|npm \|node /i`; `Edit` and `Write` when `sideEffects` include `write-code` or `write-files`; `WebFetch` and `WebSearch` when the text matches `/web\|fetch\|búsqueda\|search/i`. |
| `execution.tools.deny` | Empty, except `Bash`, `WebFetch`, and `WebSearch` for `risk: high` skills. |
| `guardrails.sideEffects` | Copied from the frontmatter; empty when it declares none. |
| `guardrails.approvalRequired` | The frontmatter `approvalRequired` as a boolean. |
| `guardrails.approvalFor` | Copied from the frontmatter. |
| `guardrails.risk` | `low`, `medium`, or `high`; `low` when the frontmatter declares none. |
| `guardrails.trustTier` | Integer 1-4; `1` when the frontmatter declares none. |
| `verification.commands` | `node .agents/skills/platform/check-all.mjs` for the `delivery`, `skill-dev`, and `platform` domains; empty otherwise. |
| `verification.artifactSchema` | `.agents/skills/platform/schemas/<artifactType>-schema.json` when that file exists; `null` otherwise. |
| `observability.traceEvents` | `skill.route`, `skill.execute`, `skill.verify`. |

## Schema

`schema/runtime-manifest.schema.json` (JSON Schema draft-07). The tool risk
vocabulary behind the allow and deny lists lives in
`policy/tool-risk.yaml`.
