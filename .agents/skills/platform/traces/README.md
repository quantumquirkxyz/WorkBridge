# Traces Skill

Structured execution traces for skill invocations, enabling regression testing and observability across the quirk Skills bundle.

## Trace Schema

The schema (`schema.json`) defines an `ExecutionTrace` object with the following fields:

- **traceId / spanId**: UUIDs for distributed trace correlation. `parentSpanId` links child spans or is null.
- **skill / skillVersion / promptVersion**: Identifies the invoked skill and its versions for reproducibility.
- **model**: The LLM configuration (`provider`, `model`, `tier`), where `tier` is one of `reasoning`, `code`, `fast`, or `router`.
- **input**: Describes the input artifact by `artifactType` and `sizeTokens`, with optional `contextRefs`.
- **output**: Describes the output artifact by `artifactType`, `sizeTokens`, `schemaValid`, and optional `outputRef`.
- **execution**: Timing metadata including `startedAt`, `completedAt`, `durationMs`, `iterations`, and `retries`.
- **tools**: Array of tool invocations with `name` and `calls`.
- **quality**: Quality gate results including `artifactPassedQualityBar`, `artifactScore` (0–100), `evaluators`, and `findingsCount`.
- **result**: Terminal state — `completed`, `blocked`, `failed`, or `escalated`.
- **blockedBy**: Array of reasons or dependencies when result is `blocked`.
- **nextConsumer**: Identifier of the next skill or handoff target.

## Recording Traces

Emit one `ExecutionTrace` per skill invocation. Populate all required fields at the boundaries of the skill lifecycle:

1. **Before execution**: Assign `traceId`, `spanId`, `parentSpanId`, and record `input`.
2. **During execution**: Track tool calls, iterations, and retries.
3. **After execution**: Record `output`, `execution` timing, `quality` scores, and terminal `result`.

Store traces in a structured log sink (e.g., JSON lines file, OpenTelemetry collector, or trace backend) with `traceId` as the partition key.

## Derived Field Semantics

`record-execution.mjs` derives optional fields so a trace never carries fabricated zeros:

- **`input.sizeTokens` / `output.sizeTokens`**: A numeric `sizeTokens` (or `tokens` / `tokenCount`) greater than 0 is used as-is. When the caller supplies `input.content` / `output.content` (a string or object), tokens are estimated as `max(1, ceil(length / 4))`. When neither is given but `outputRef`, `ref`, or `path` names a readable file of at most 2 MB, the estimate is computed from that file. When nothing measurable is available the value stays `0`.
- **`execution.durationMs`**: Computed as `completedAt - startedAt` whenever the caller does not supply `durationMs`. A caller-supplied `durationMs` always wins; `completedAt` defaults to the time of the write when only `startedAt` is given. Missing or unparsable timestamps fall back to "now", never to a negative duration.
- **`quality.artifactScore`**: `null` when the score is unknown. An unknown score is never recorded as `0`, so `0` always means a real zero-score artifact. A score is derived only on request: pass `scoreArtifact: true` together with `quality.artifactPath` (a skill directory) or `quality.artifact` (an object with a `body` / `content` / `text` string). The scorer runs in a child process with a time budget and is fully isolated — any failure leaves `artifactScore` as `null` and never fails the trace write. When a score is derived and the caller did not decide the gate, `artifactPassedQualityBar` is set against the 60-point default bar and the `quality-scorer` evaluator is appended to `evaluators`.
- **Backward compatibility**: Adding `null` to `artifactScore` keeps the key present and keeps every existing trace valid; JSONL readers must treat `null` as "unknown" rather than "zero". All other field names, types, and required keys are unchanged, so readers written against earlier traces keep parsing the log.

## Regression Testing

Compare new traces against baselines to detect regressions:

- **Duration regression**: Assert `durationMs` stays within a tolerance band (e.g., ±20%) of the baseline.
- **Quality regression**: Assert `artifactScore` and `artifactPassedQualityBar` meet or exceed baseline thresholds.
- **Tool regression**: Assert tool `calls` counts and `name` sets are stable; unexpected additions may indicate changed behavior.
- **Result regression**: Assert `result` equals the baseline (`completed` for happy-path skills).
- **Schema drift**: Validate every trace against `schema.json` before comparison; failing traces should fail the regression check.

Use the `traceId` and `spanId` to correlate regressions with specific skill versions and prompt versions.

## Observability

Aggregate traces to monitor skill health:

- **Latency**: Track `durationMs` by `skill`, `model.tier`, and `promptVersion` to spot slow regressions.
- **Quality trends**: Plot `artifactScore` and `findingsCount` over time to detect degradation.
- **Failure modes**: Filter by `result` = `failed` or `escalated` and inspect `blockedBy` for systemic issues.
- **Cost attribution**: Use `input.sizeTokens` + `output.sizeTokens` + `model.tier` to estimate token consumption per skill.
- **Dependency mapping**: Use `nextConsumer` to build a graph of skill handoffs and identify bottlenecks.

## Conventions

- Traces are append-only. Do not mutate recorded traces.
- Every trace must validate against `schema.json`.
- Use UTC timestamps in ISO 8601 format for `startedAt` and `completedAt`.
- Redact secrets from `input` and `output` before recording; reference them by `outputRef` if needed.
