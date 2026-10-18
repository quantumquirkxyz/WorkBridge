# Grill with docs — competition documentation

## Status

Refined after confirming the demo scope, evidence-first claims, official Panamanian sources, and safe cleanup boundary.

## Decisions

- The official demo is a complete candidate-to-application flow.
- Only code and tests verifiable on `main` may be described as implemented.
- Official sources are recorded with URL, consultation date, and purpose.
- Cleanup removes only generated artifacts; source, tests, configuration, and documentation remain untouched.

## Changes

- Updated `docs/competition/README.md` with the five-agent workflow, local sources, implementation limits, and delivery checklist.
- Updated `docs/reference/agents/architecture.md` to include the shipped Bias Auditor.
- Updated the root README's agent count.
- Removed `.reports/` and `test-results/`.

## Remaining evidence

- Attach the final video URL.
- Verify `final-24h` and record final evaluation output.
- Select an official operational transport source; fixtures remain the reproducible demo source until then.

## Next consumer

`implement` should validate the documentation links and produce the final demo/evaluation evidence without changing essential application code.
