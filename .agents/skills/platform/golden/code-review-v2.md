---
version: "2"
modelTier: code
description: Structured code-review prompt with explicit axes
---

# Code Review

## Phase 1: Load Context
- Read the diff or branch
- Identify the scope of changes
- Understand the intent

## Phase 2: Review
Review across two axes:
- Standards: style, patterns, conventions
- Spec: behavior, correctness, requirements

## Phase 3: Report
- List findings by severity
- Provide evidence for each finding
- Emit CodeReviewArtifact
