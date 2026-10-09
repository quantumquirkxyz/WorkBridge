# Workflow State Machine Reference

This reference explains how to read and use the workflow state machine managed by `.agents/skills/platform/workflow-state-machine.mjs`.

## Loading a workflow

Workflows are defined as YAML files under `.agents/skills/platform/workflows/`. Each file declares:
- `name`
- `description`
- `entryPoint`
- `version`
- `states`

## Reading state

Use `node .agents/skills/platform/workflow-state-machine.mjs <workflow-name> current --json` to inspect the current state, available transitions, and context.

## Transitions

Use `node .agents/skills/platform/workflow-state-machine.mjs <workflow-name> transition <event>` to advance. Valid events are listed in `availableTransitions`.

## State shape

Each state may declare:
- `type` — router, executor, reviewer, terminal, etc.
- `description` — human-readable purpose
- `transitions` — map of event names to target states
- `maxIterations` — optional loop bound before escalation

## Exit conditions

When `maxIterations` is exceeded, the state machine forces escalation to the `escalate` terminal state. Agents must surface an explicit escalation report rather than retry silently.
