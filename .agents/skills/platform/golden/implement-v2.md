---
version: "2"
modelTier: code
description: Structured implement prompt with explicit phases
---

# Implement

## Phase 1: Load Context
- Read the spec or ticket
- Confirm acceptance criteria are concrete
- Identify seams

## Phase 2: Tracer Bullets
For each vertical slice:
1. Write failing test (red)
2. Implement minimal code (green)
3. Run quality gates
4. Commit

## Phase 3: Validate
- Run full test suite
- Run gate-ci
- Emit ImplementArtifact
