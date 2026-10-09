# Changelog

All notable changes to `quirk Skills` are recorded here.

This project follows semantic versioning once releases are cut:

- `MAJOR` for breaking workflow or artifact contract changes.
- `MINOR` for new skills, new validators, new scenarios, or compatible workflow extensions.
- `PATCH` for documentation fixes, template clarifications, and non-breaking validator fixes.

## [2.0.0] - 2026-10-03

### Added

- Artifact-first design: 7 JSON schemas for typed artifacts (spec, ticket, review, adr, handoff, agent-card, trunk-based-workflow, feature-flag)
- Externalized `contract-base.xml` shared contract — eliminates ~19K tokens of duplicated boilerplate
- 4 workflow state machines (standard-feature, bug-fix, operations, repair) in YAML
- `workflow-state-machine.mjs` — executable state machine with persistent checkpoints
- 3 LLM-as-judge evaluators: `evaluate-artifact-quality.mjs`, `evaluate-spec-traceability.mjs`, `evaluate-review-effectiveness.mjs`
- 4 shift-left quality gate skills: `gate-ide`, `gate-pre-commit`, `gate-ci`, `gate-post-merge`
- `trunk-based-workflow` skill — short-lived branches, PR size limits, merge discipline
- `feature-flag` skill — short-lived flags, gradual rollouts, kill switches, cleanup discipline
- `mcp-server` skill + functional stdio JSON-RPC 2.0 server exposing 242 skills as MCP tools
- `agent-card` skill + generator producing 241 Agent Cards for A2A discovery
- 25 versioned prompt templates (v1 + v2) for 12 migrated skills
- `model-rules.yaml` — model tier routing by trust tier and artifact type
- `test-prompt-regression.mjs` — prompt regression testing with golden dataset comparison
- Golden dataset: 3 reference traces for regression testing
- 4 ADRs: artifact-first design, state-machine workflows, shift-left gates, release v2.0
- Diátaxis documentation structure: tutorial/, how-to/, reference/, explanation/
- 3 new GitHub Actions workflows: quality-gates.yml, prompt-regression.yml
- `evaluate-skills-by-domain.mjs` — domain-level skill quality evaluation
- `record-execution.mjs` v2 — emits ExecutionTrace conforming to v2 schema
- `generate-agent-cards.mjs` — batch Agent Card generation
- `migrate-skills-to-v2.mjs` — batch migration script for v2 format

### Changed

- All 241 non-platform skills migrated to v2 format with:
  - Extended frontmatter: `modelTier`, `promptVersion`, `artifactType`, `evaluators`, `fixturesPath`, `diataxis`, `tags`, `compatibility`, `approvalRequired`, `approvalFor`
  - Removed `## Operating Contract` block, replaced with `## Contract` + `@include contract-base.xml`
  - Added `## Provenance`, `## Artifact`, `## Completion` sections
  - Typed outputs as JSON schema objects
- `quality-scorer.mjs` v2: 13 dimensions (was 6), 0-100 scoring, new tiers
- `implement` skill: integrates TDD, quality gates (gate-ide, gate-pre-commit, gate-ci), feature flags, trunk-based workflow
- `publish-open-pr` skill: enforces gate-ci before opening PR
- `ask-to` skill: consumes state machine workflows for routing
- `workflow-item-router` skill: updated for Diátaxis doc paths
- Documentation reorganized from flat structure to 4 Diátaxis quadrants (30 files moved)
- Internal links updated across all docs and SKILL.md files
- Lockfile maintenance expanded to cover 254 skills (was 189)
- `audit-semantics.mjs` whitelist expanded to 20+ side effects
- `validate-skills.mjs` parser handles array frontmatter fields

### Removed

- Duplicated `## Operating Contract` blocks from all skills (moved to shared `contract-base.xml`)
- Flat docs/ structure replaced by Diátaxis quadrants

### Validation

```bash
node .agents/skills/platform/check-all.mjs
```

Expected result: 10/10 checks passing, 0 warnings, 0 errors.

## [2.1.0] - 2026-10-03

### Added

- ADR-005: skills grade elevation via references, scripts, Why sections, observability, and regression fixtures
- 12 skills elevated to grade A/B:
  - Grade A (10): implement (97), code-review (91), review-pr (91), ask-to (90), mcp-server (92), to-spec (93), to-tickets (92), tdd (92)
  - Grade B (2): work-item-router (86), agent-card (89), trunk-based-workflow (89), feature-flag (85)
- 12 new regression fixtures in `.agents/skills/platform/fixtures/regression/`
- 12 new reference files across skills (workflow rules, quality gates, routing, MCP spec, A2A, vertical slicing)
- 4 new script templates (validate-implementation, validate-routing-artifact, validate-schema, validate-router-decision)

### Validation

```bash
node .agents/skills/platform/check-all.mjs
```

Expected result: 10/10 checks passing, 0 warnings, 0 errors.


## [1.0.0] - 2026-08-27

Initial quirk-owned skills bundle baseline.

### Added

- Canonical `.agents/skills/` bundle with `.claude/skills/` compatibility links.
- quirk method, authorship, provenance, adoption, and template-standard docs.
- Scenario evaluation fixtures and deterministic scenario runner.
- Semantic audit runner and unified platform validation commands.
- Internal case-study structure.

### Changed

- Person-branded and retired routing names were removed from active workflow routing.
- `review-fix-loop` became the canonical PR remediation loop between `review-pr` and `ship-subissue`.
- Templates were hardened for traceability, metadata, acceptance criteria, validation, and scope boundaries.

### Validation

```bash
node .agents/skills/platform/check-all.mjs
```
