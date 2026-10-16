---
description: "Extract and classify rules across Skills by type, frequency, and application area; use when auditing the repository's shared guidance."
---
# rule-cataloger

When to use: Extract and classify rules across Skills by type, frequency, and application area; use when auditing the repository's shared guidance.

## Workflow

1. Run the rule extraction command against the canonical Skills directory
2. Compare extractor output against a sample of manually observed `Rule:` lines
3. Classify rules by type, source domain, and action area
4. Identify duplicated, conflicting, or under-specified rules
5. Publish the catalog with caveats about extraction coverage

## Deliverables

- skill-dev artifact

## Guardrails

- risk: low; trust tier: 2; approval required: no
- side effects: none
- isolation: none; model tier: fast

Stop when: Every discovered rule is listed with its source Skill, type, and frequency.
