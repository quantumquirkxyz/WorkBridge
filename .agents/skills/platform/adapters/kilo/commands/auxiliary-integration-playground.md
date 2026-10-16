---
description: "Create a disposable fixture environment for safely exercising Skills against local APIs, data, and files; use when testing a Skill with isolated local fixtures."
---
# integration-playground

When to use: Create a disposable fixture environment for safely exercising Skills against local APIs, data, and files; use when testing a Skill with isolated local fixtures.

## Workflow

1. Define the fixture data and the command to exercise
2. Create the isolated playground under a temporary output path
3. Run the command with the minimal environment required
4. Record stdout, stderr, exit status, and generated files
5. Summarize what the playground proved and what it did not prove

## Deliverables

- auxiliary artifact

## Guardrails

- risk: low; trust tier: 2; approval required: no
- side effects: none
- isolation: none; model tier: fast

Stop when: The command ran in the disposable fixture directory and its exit status and output are recorded.
