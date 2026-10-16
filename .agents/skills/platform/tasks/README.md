# Task fixtures for the miniature SWE-bench runner

`scripts/run-skill-task.mjs` replays a task fixture against an isolated workspace
and judges the outcome by the **final state of the workspace**, never by the
transcript of what was executed. A task is a deterministic, dependency-free
regression scenario: seed a mini repository, inject a defect, repair it with a
declared action, then assert what the workspace looks like.

Every task declares which bundle skill it exercises, so a task run is recorded
in the platform trace log under that skill and shows up next to skill runs.

## Running tasks

```bash
# list every task
node .agents/skills/platform/scripts/run-skill-task.mjs --list --json

# run one task (machine-readable report on stdout)
node .agents/skills/platform/scripts/run-skill-task.mjs task-lockfile-integrity --json

# run one task in an empty workspace, keeping the workspace when it does not pass
node .agents/skills/platform/scripts/run-skill-task.mjs task-lockfile-integrity --sandbox tmpdir --keep
```

Exit codes: `0` pass, `1` fail or error, `2` usage or schema error, `3` blocked
by the command allowlist.

The report carries `task`, `status`, `steps`, `stateChecks`,
`forbiddenViolations`, `durationMs`, `workspace`, `cleanup` and `tracePath`.

## Task schema

A task file is a JSON object with these keys.

| Key | Required | Meaning |
|---|---|---|
| `id` | yes | Unique kebab-case identifier. The file is normally `tasks/<id>.json`. |
| `title` | yes | One-line human summary. |
| `skill` | yes | Canonical bundle skill the task exercises, as `<domain>/<name>`. Validated against the bundle. |
| `difficulty` | no | `easy` or `medium`. `easy` is solvable with the obvious repair; `medium` requires picking the right tool and not touching protected content. |
| `prompt` | yes | The statement a solver receives. |
| `workspace` | yes | How the workspace is seeded, see below. |
| `setup` | yes | Ops that seed the workspace and inject the defect. |
| `actions` | yes | Ops that repair the workspace. |
| `verification` | yes | Final-state checks. |

### `workspace`

| `kind` | Additional key | Effect in `copy` sandbox mode |
|---|---|---|
| `fixture-copy` | `source` | A directory source seeds the workspace root with its own contents. A file source keeps its repository-relative path inside the workspace. |
| `repo-minimal` | `paths` (optional) | Copies the listed repository-relative paths, or the documented default set: the task skill directory, `skills-lock.json`, `schema/`, `policy/`. |
| `empty` | none | Nothing is seeded; the setup has to build the workspace itself. |

### Ops

`setup[]` and `actions[]` are arrays executed in order. `actions[]` steps are the
ones a state check of kind `exit-was-zero` / `exit-was-nonzero` refers to, via
their index inside `actions`.

| Op | Fields | Effect |
|---|---|---|
| `copy` | `from`, `to` | Copy a tree or a file into the workspace. Symlinks stay symlinks. `to` must be workspace-relative. |
| `write` | `path`, `content` | Create or overwrite a file. A string content is written verbatim; an object or array is written as pretty JSON. |
| `remove` | `path` | Delete a file or a tree. |
| `run` | `command`, `expectExit`, `timeoutMs` | Execute a command with the workspace as the working directory. `expectExit` defaults to `0`. |
| `assert` | `stateChecks` | Inline state checks evaluated at that point in the run. |

Sources for `copy` resolve against the repository root first, then
`.agents/skills/platform/fixtures/`, then the workspace itself. Repository
paths are never copied into a workspace wholesale: `.claude/`, `.git/`,
`node_modules/`, `site/` and `dist/` are refused as copy sources, so a task
cannot silently drag the whole generated view or a dependency tree into its
sandbox.

### Command allowlist

Only `node`, `npm`, `git` and `bash` may be declared (see `COMMAND_ALLOWLIST`).
For `node` and `bash` the target script must resolve to a file inside the
workspace, and inline evaluation flags are refused. A command outside the
allowlist is never executed: it marks the task `blocked` and stops the run.
Every command a task executes must be declared in its own `setup` or `actions`;
the runner never invents a step.

Step failure policy: a blocked or erroring step stops the run immediately. A
setup step that fails its declared exit code also stops the run, because the
defect the task declares could not be injected. An action step that fails its
exit code is recorded and the run continues, because the verdict belongs to the
final state check.

### `verification`

| Key | Meaning |
|---|---|
| `stateChecks[]` | Final-state assertions. At least one is required. |
| `forbiddenPaths[]` | Workspace-relative regular files that the repair must not touch. They are hashed once the workspace is fully prepared (seeded and with the defect injected), and compared at the end; a path whose hash changed, appeared, or disappeared is a violation, so a repair cannot hide inside an undeclared edit. Symlinks are not hashable as forbidden paths. Taking the baseline at that point, rather than before setup, keeps the rule identical in every sandbox mode, because a task in `worktree` mode legitimately rewrites the repository paths it borrows as its seed. |

State check kinds:

| Kind | Fields | Passes when |
|---|---|---|
| `file-exists` | `path` | The path exists. |
| `file-missing` | `path` | The path does not exist. |
| `file-contains` | `path`, `value` | The file text contains `value`. |
| `file-not-contains` | `path`, `value` | The file text does not contain `value`. |
| `json-field-equals` | `path`, `field`, `value` | The dotted `field` of the parsed JSON equals `value`. |
| `file-min-lines` | `path`, `value` | The file has at least `value` lines. |
| `exit-was-zero` | `step` | The action at that index exited `0`. |
| `exit-was-nonzero` | `step` | The action at that index exited with a non-zero code. |
| `regex-matches` | `path`, `value` | The file text matches the regular expression in `value`. No flags are applied, so anchor with explicit newline escapes. |

`json-field-equals` walks a dotted path through objects and arrays, so
`skills.review-pr.hash` and `entries.0.absolute` both work.

## Sandbox modes

| Mode | Workspace |
|---|---|
| `copy` (default) | A `mkdtemp` directory under the system temporary directory, seeded from `workspace`. |
| `worktree` | `git worktree add` of `HEAD` in a temporary directory, removed on cleanup. Falls back to `copy` with a recorded warning when git is unavailable. |
| `tmpdir` | An empty temporary directory. Tasks whose setup seeds everything they need behave identically in this mode. |

`--keep` preserves the workspace of a run that did not pass, for inspection.
Every other run is cleaned up, including the git worktree registration.

## Shipped tasks

| Task | Skill | Difficulty | Scenario |
|---|---|---|---|
| `task-lockfile-integrity` | `skill-dev/lockfile-maintenance` | easy | An edited `SKILL.md` leaves the lockfile stale; detect the drift, then re-lock the working tree. |
| `task-schema-consistency` | `skill-dev/skill-testing-framework` | medium | A `SKILL.md` drifts from its declared contract; detect the drift, then restore the contract. |
| `task-compatibility-view` | `skill-dev/skill-audit` | medium | The generated view carries an absolute link and a dangling link; repair the view without touching canonical content. |

## Fixture layout

```text
fixtures/repos/mini-bundle/            deterministic mini repository used as a seed
  .agents/skills/delivery/review-pr/SKILL.md   reduced copy of the canonical skill
  skills-lock.json                     lock entry with the correct hash
  schema/review-findings-schema.json   copy of the bundle schema
  fixtures/behavioral/review-pr.json   reduced evaluator fixture
  .claude/skills/review-pr             relative link into the canonical bundle
fixtures/tasks/schema-consistency/     contract checker the task runs
fixtures/tasks/compat-view/            view drift seeder and view inspector
tasks/                                 this directory
```

The mini repository lives at the repository root, outside `.agents/skills/`, on
purpose. Anything named `SKILL.md` under `.agents/skills/` is counted as a
bundle skill by the repo tooling, and the audit that pins the 253 bundle / 265
repo counts would treat a fixture skill as a real one. Keeping the fixture
outside the skills tree keeps those counts honest while still letting the
lockfile, contract, and view scenarios hash real skill content.

## Tests

`tests/skill-task-runner.test.mjs` covers loading and schema-validating every
shipped task, each state check kind, forbidden path detection, an end-to-end
run in `tmpdir` mode, the command allowlist, and the difference between `fail`
and `error`.
