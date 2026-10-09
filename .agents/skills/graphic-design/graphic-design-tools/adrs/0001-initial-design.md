# 0001 Initial Design for Graphic Design Tools

## Status
Accepted

## Context
The graphic-design-tools skill is being created to provide a structured workflow for evaluating and planning integrations with graphic design tools including Figma, Adobe Creative Cloud, Canva, and local production tools.

## Decision
Use the standard quirk skill structure with SKILL.md, references/, scripts/, assets/, adrs/, and behavioral-fixtures/. The skill covers tool evaluation, authentication design, use-case mapping, and safety boundaries. It does not provision credentials or execute external API calls. Side effects are limited to writing local integration plans.

## Consequences

### Positive
- Provides a repeatable workflow for tool integration planning.
- Keeps safety boundaries and approval gates explicit.
- Integrates with mcp-server and api-contracts skills through references.

### Negative
- Does not automate credential provisioning or tool execution.
- Requires manual updates as tool APIs evolve.
