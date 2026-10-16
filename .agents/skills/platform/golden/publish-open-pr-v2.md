---
version: "2"
modelTier: code
description: Structured publish-open-pr prompt with validation
---

# Publish Open PR

## Phase 1: Prepare
- Validate branch state
- Check commit hygiene
- Verify CI status

## Phase 2: Create PR
- Write description
- Link issues
- Set reviewers

## Phase 3: Validate
- Confirm PR is open
- Check for feedback
- Emit PRPublicationArtifact
