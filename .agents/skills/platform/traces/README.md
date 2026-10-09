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
