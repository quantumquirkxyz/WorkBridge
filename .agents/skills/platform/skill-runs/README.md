# Skill Runs

Structured, append-only observability for skill execution in the quirk bundle. A
skill run is the ordered set of events one skill emits between the moment it is
selected and the moment it closes, plus the replay, integrity, and export tooling
that makes those events useful after the fact.

This directory is the sink for the **Skill Run Record** format. The sink files
themselves are generated data (`<YYYY-MM-DD>.jsonl`); this page is the contract.

## What a Skill Run Record is

A Skill Run Record is one event of one skill run. It answers, in a closed and
machine-checkable shape:

- **which skill ran**, under which skill and prompt version (`skill`,
  `skillVersion`, `promptVersion`), and on which input (`inputHash`, a sha256 of
  the canonicalized input, so a run can be replayed without storing the input);
- **where it sits in the run** (`traceId`, `spanId`, `parentSpanId`, `ts`);
- **what happened** (`event`, `evidence`, `tools`, `artifacts`, `sideEffects`);
- **what it cost and what it decided** (`durationMs`, `cost`, `verdict`,
  `failureMode`);
- **which model produced it** (`model` with `provider`, `model`, `tier`).

Only six fields are required: `schemaVersion`, `traceId`, `spanId`, `ts`,
`event`, and `skill`. Everything else is optional and omitted when unknown, so a
record never carries fabricated zeros. The root object is closed
(`additionalProperties: false`) and `event` and `verdict` are typed enums, which
keeps the log stable enough to diff across replays.

The full definition lives in
[`schema/skill-run.schema.json`](../../../../schema/skill-run.schema.json).

## Event lifecycle

`event` is one of ten values, and the replay order below is the order
`replay-skill-run.mjs` enforces (exported as `ORDER`):

| # | event | meaning |
| - | ----- | ------- |
| 1 | `route.started` | a routing request entered the bundle; the root span of the trace |
| 2 | `route.selected` | one skill was selected, with the reasons in `evidence` |
| 3 | `context.loaded` | the context pack, references, or graph slice the skill needs were resolved |
| 4 | `tool.called` | a tool ran; `tools` carries its name and hashes, never its arguments or output |
| 5 | `artifact.created` | an artifact was produced or read; `artifacts` carries its path and sha256 |
| 6 | `gate.executed` | a quality gate ran over the artifact |
| 7 | `verification.result` | the verification outcome of that gate |
| 8 | `handoff.created` | the run handed work to another consumer |
| 9 | `failure.classified` | a failure was classified, with the class in `failureMode` |
| 10 | `run.completed` | the run closed, with the terminal `verdict` |

Events 4 to 9 may repeat and interleave. A trace that never emits
`run.completed` is incomplete, and a trace that jumps to a different `skill`
without a declared `handoff.created` is a finding, not a silent rename.

## Append-only sink

Records land in `.agents/skills/platform/skill-runs/<YYYY-MM-DD>.jsonl`, one JSON
object per line, in emission order. The sink is append-only: records are never
rewritten, compacted, or reordered, because the log is the audit trail. Correct a
wrong record by appending the correcting record, and correct a wrong run by
replaying it.

Each line is self-describing: `traceId` groups a run, `spanId` identifies one
event inside it, and `parentSpanId` links an event to the span it belongs to
(`null` on the root event). `SkillRunSession` assigns both automatically and
chains them, so a session never has to hand-manage identifiers.

## Redaction policy

Every record passes through `redact()` before it is persisted and before it is
returned to a caller, and every export passes through the same function again on
its way out. The function walks objects, arrays, and nested arrays recursively
and replaces the value of a sensitive key with `[REDACTED]`:

`authorization`, `api_key`, `apiKey`, `token`, `secret`, `password`, `cookie`,
`set-cookie` (exported as `REDACT_KEYS`, matched case-insensitively).

The policy is deliberately structural rather than heuristic: the key names are
the contract, so a caller never has to guess whether a payload was safe to pass.
Sensitive material belongs in a secret manager, referenced by name, never in a
trace; `outputHash` and `inputHash` are the fields that let a consumer verify
content without ever reading it.

## Recording

### Command line

```bash
node .agents/skills/platform/scripts/skill-run-recorder.mjs --demo --json
node .agents/skills/platform/scripts/skill-run-recorder.mjs --validate <file.jsonl>
node .agents/skills/platform/scripts/skill-run-recorder.mjs --record-events '<json-array>' [--out FILE] [--bridge]
```

`--demo` writes a five-event demo trace under the operating system temporary
directory and validates it, so it never touches this repository. `--validate`
reports every line that fails the schema and exits 1 when at least one does.
`--record-events` records a whole run from a JSON array of partial events; the
recorder shares one `traceId` across them and appends `run.completed` when the
array did not include it.

### Programmatic

```js
import { createSession } from '../scripts/skill-run-recorder.mjs';

const session = createSession({ bridge: true });
await session.start('delivery/review-pr', inputHash);
await session.emit('route.selected', { evidence: ['skill-graph ranked this skill first'] });
await session.emit('tool.called', { tools: [{ name: 'Read', durationMs: 12 }] });
await session.finish('pass', { cost: { inputTokens: 0, outputTokens: 0, costUsd: 0 } });
```

`createSession()` returns a `SkillRunSession`; `start`, `emit`, and `finish` are
async because the sink is an append. `record()`, `newSkillRun()`,
`validateSkillRun()`, and `redact()` are pure, so they are safe to call from
tests without touching the file system. `finish()` appends `run.completed` at the
end of the trace and returns a summary with the `traceId`, the emitted event
types, the run duration, the verdict, and the path that was written.

## Replaying

```bash
node .agents/skills/platform/scripts/replay-skill-run.mjs <file.jsonl> [--json] [--out FILE] [--strict]
node .agents/skills/platform/scripts/replay-skill-run.mjs --verify <file.jsonl> [--json]
node .agents/skills/platform/scripts/replay-skill-run.mjs --compare <a.jsonl> <b.jsonl> [--json]
```

`replay()` reconstructs the trace (`traceId`, ordered `events`, `skills`,
`artifacts`, `tools`, `sideEffects`, summed `cost`, `verdict`, `failureMode`,
`startedAt`, `endedAt`, `durationMs`). `analyzeIntegrity()` then reports the
findings the format promises:

- `out-of-order`, an event that moved backwards against the lifecycle order (a
  `tool.called` before `route.selected`, an event after `run.completed`);
- `incomplete-trace`, a trace with no `run.completed`;
- `skill-jump`, more than one skill under a single `traceId` with no declared
  handoff;
- `duplicate-span`, a `spanId` used by two records;
- `dangling-parent`, a `parentSpanId` that is not a span of the trace, or that
  only appears later than its child;
- `invalid-record`, a line that fails the schema, and `unknown-event` for an
  event outside the enum.

`--verify` exits 3 when the trace is incomplete or carries a severe finding,
which is the divergence convention of the repository. `--compare` diffs two
traces and exits 3 when they diverge: it reports `sameEvents`, `differingEvents`
(with the fields that differ), `onlyInA`, `onlyInB`, `verdictChanged`,
`costDelta`, `artifactDelta`, and `durationDelta`. The comparison excludes
`traceId`, `spanId`, `parentSpanId`, `ts`, `durationMs`, and `cost` from the
event projection, because a replay re-derives them on every run; the two deltas
report them explicitly instead.

## Exporting

```bash
node .agents/skills/platform/scripts/export-traces.mjs --format otel --since 2026-10-01 --skill delivery/review-pr
node .agents/skills/platform/scripts/export-traces.mjs --format langsmith --out datasets.json
node .agents/skills/platform/scripts/export-traces.mjs --format braintrust
node .agents/skills/platform/scripts/export-traces.mjs --format jsonl
```

`export-traces.mjs` is an exporter, not a collector. It reads the two stores
below, reshapes them for an external backend, and writes the payload to stdout or
to `--out`; it never opens a network connection, never calls a vendor endpoint,
and never mutates the stores it reads. Every payload passes through `redact()`
first. stdout carries the payload alone, so it stays pipeable: JSONL lines for
`jsonl`, a JSON array for every other format. A one-line JSON summary (count, per
source, per skill) goes to stderr, where it cannot corrupt the stream.

- `jsonl` is a passthrough of the redacted records, one object per line.
- `langsmith` emits dataset examples with `inputs`, `outputs`, and `metadata`.
- `braintrust` emits events with `input`, `output`, `metadata`, and a `verdict`
  score.
- `otel` emits OTLP-shaped spans with `traceId`, `spanId`, `parentSpanId`,
  `name`, `startTimeUnixNano`, `endTimeUnixNano`, `attributes`, and `status`.
  Timestamps are emitted in nanoseconds; a nanosecond field is an IEEE-754
  double, so it keeps a full integer at current epochs within the precision a
  double holds at that magnitude.

## Coexistence during migration

Two trace formats are recorded in this repository and both are intentional:

- `../traces/README.md` — the legacy `ExecutionTrace` format written by
  [`../record-execution.mjs`](../record-execution.mjs). It is one object per
  skill invocation, with `input`, `output`, `execution`, `quality`, and `result`.
  Six tools of the gate already write here, and the store is append-only.
- `skill-runs/` — the Skill Run Record format on this page. It is event-shaped,
  so a run is a sequence instead of a single summary object, and it is what the
  replay and comparison tooling works on.

The two coexist while consumers migrate. A `SkillRunSession` created with
`bridge: true` mirrors the finished run into `traces/` through
`record-execution.mjs`, keeping the legacy store complete until every consumer
reads the new format; without the flag only the new store is written.
`export-traces.mjs` reads both stores, so an exporter can serve either format
without knowing which producer wrote the line.

## Command reference

| command | purpose |
| ------- | ------- |
| `skill-run-recorder.mjs --demo --json` | write and validate a demo trace in the temporary directory |
| `skill-run-recorder.mjs --validate <file>` | validate every line of a skill-run file |
| `skill-run-recorder.mjs --record-events '<json>'` | record a run from a JSON array of events |
| `replay-skill-run.mjs <file>` | replay a trace and report its integrity findings |
| `replay-skill-run.mjs --verify <file>` | exit 3 unless the trace is complete and clean |
| `replay-skill-run.mjs --compare <a> <b>` | diff two traces, exit 3 on divergence |
| `export-traces.mjs --format otel` | export both stores as OTLP-shaped spans |

## Further reading

- [Skill Run Record schema](../../../../schema/skill-run.schema.json) — the contract.
- [`../scripts/skill-run-recorder.mjs`](../scripts/skill-run-recorder.mjs) — recorder and session API.
- [`../scripts/replay-skill-run.mjs`](../scripts/replay-skill-run.mjs) — replay, integrity, and comparison.
- [`../scripts/export-traces.mjs`](../scripts/export-traces.mjs) — external format exporter.
- [`../traces/README.md`](../traces/README.md) — the legacy trace format.
- [`../../../../AGENTS.md`](../../../../AGENTS.md) — repository conventions.
