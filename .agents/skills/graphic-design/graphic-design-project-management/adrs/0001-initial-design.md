# 0001 Initial Design for Graphic Design Project Management

## Status
Accepted

## Context
The graphic-design-project-management skill is being created to provide a structured workflow for managing graphic design projects including scope, timelines, iterations, reviews, and asset handoff.

## Decision
Use the standard quirk skill structure with SKILL.md, references/, scripts/, assets/, adrs/, and behavioral-fixtures/. The skill covers project planning, iteration cycles, review gates, asset handoff, and quality checks. It does not execute external project management tools. Side effects are limited to writing local project documentation.

## Consequences

### Positive
- Provides a repeatable workflow for graphic design project management.
- Keeps scope, timeline, and quality gates explicit.
- Integrates with professional-project-management and to-tickets skills through references.

### Negative
- Does not automate project management tool execution.
- Requires manual updates as project management practices evolve.
