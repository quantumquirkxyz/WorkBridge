---
description: "Scan a codebase for deepening opportunities and present candidates as a visual HTML report, then grill through the selected one."
---
# improve-codebase-architecture

When to use: Scan a codebase for deepening opportunities and present candidates as a visual HTML report, then grill through the selected one.

## Workflow

1. Scan the target directory for module structures
2. Compute depth and dependency metrics
3. Identify candidates with high complexity or shallow interfaces
4. Generate HTML/JSON report
5. Present candidates; user selects one or defers
6. If selected, initiate a grilling session for the module

## Deliverables

- pull-request artifact

## Guardrails

- risk: low; trust tier: 2; approval required: no
- side effects: none
- isolation: none; model tier: fast

Stop when: Report generated and a candidate is selected or explicitly deferred.
