# Platform schemas

Machine-readable contracts for the artifacts the skills produce and consume.
Every file here is hand-authored (no generation step) and is loaded by its
consumer at validation time, so a schema edit is a contract change: update the
citing skills and fixtures in the same change.

## Unified review-findings-schema.json

The `review-findings-schema.json` contract has one canonical source and local
copies for consumers that need repository-local fixtures:
- `schema/review-findings-schema.json` (repository root) - the canonical schema
- `.agents/skills/platform/schemas/review-findings-schema.json` - regular-file copy for platform-local consumers
- `fixtures/repos/mini-bundle/schema/review-findings-schema.json` - regular-file fixture copy for task-runner tests

This unified schema uses draft 2020-12 and defines the enveloped, versioned
durable artifact with `schemaVersion` 2.0 envelope containing:
- `input` (fixedPoint, diffCommand, commits, specSource)
- `output` (standardsFindings, specFindings, summary)
- `provenance` (sourceOfTruth, scope, outOfScope, nextConsumer, etc.)
- `evaluation` (qualityBarScore, evaluators: behavioral, regression, review-effectiveness)

This schema is used by:
- Canonical skills: `.agents/skills/delivery/review-pr/SKILL.md` and `.agents/skills/delivery/code-review/SKILL.md`
- Behavioral fixtures: `evals/behavioral/review-pr.json` and `evals/behavioral/code-review.json`
- Test validation: `.agents/skills/platform/tests/schemas.test.mjs`
- Task fixtures: `fixtures/repos/mini-bundle/schema/review-findings-schema.json`
- Runtime validators and platform tooling

## Why unification

Previously two variants existed for different consumers. Unification simplifies
the schema landscape by providing a single canonical contract that serves all
consumers:
- Skills and behavioral evals use the canonical contract
- Task fixtures now validate against the same schema
- No contract drift between locations

## Rules for changing the unified schema

- All consumers must be updated in the same change:
  - Skills that produce/consume the artifact
  - Behavioral test fixtures
  - Platform tooling that validates artifacts
  - Task fixture copies (mini-bundle and any others)
- The schema uses JSON Schema draft 2020-12
- Changes must maintain backward compatibility where possible
