# quirk Method Fundamentals

## Learning Path Level 1: Core Principles

### Principles of the quirk Method

1. **Context before action**
   - Always build a fresh context pack before engaging in broad work
   - Prefer repository documentation, ADRs, issue tracker state, and direct code evidence over memory
   - Prevent stale or incorrect assumptions

2. **Questions before commitments**
   - Use grill or grill-with-docs when work is ambiguous
   - Decisions are made with the user, not guessed
   - Prevent building the wrong thing

3. **Artifacts over vibes**
   - Specs, tickets, PR bodies, review plans, implementation notes, ADRs, and handoffs must be durable
   - Each artifact shape should belong to the skill that emits it
   - Make work resumable by other agents or humans

4. **Vertical slices over horizontal dumps**
   - Tickets should be narrow, complete paths through behavior, validation, and delivery
   - Enable parallelism and reduce blocking dependencies
   - Each ticket should be independently claimable and completable

5. **Measurement before repair**
   - review-pr measures Standards and Spec separately
   - plan-review-fixes plans
   - implement-review-fixes executes
   - ship-subissue ships
   - Prevent conflating measurement with repair activities

6. **Branch-state before repair**
   - If a PR branch is conflicted, resolve that branch-state problem first with resolving-merge-conflicts
   - Then return to review and repair
   - Ensure we're working with a clean base

7. **Repo-local specialization**
   - Each project owns its own domain language, tracker configuration, commands, and risk boundaries
   - Prevent leaking another project's domain into the current context
   - Specialization happens through CONTEXT.md, ADRs, issue tracker docs, validation commands, and stack-specific skills

8. **Fail closed on uncertainty**
   - Missing fixed points, stale plans, unclear issue traceability, unresolved blockers, and skipped validation must be surfaced
   - Rather than making assumptions, the system stops and requests clarification
   - Prevent silent failures and wrong directions

### Core Vocabulary

Key terms:

- **Context pack**: A bounded set of fresh reads and provenance that gives the next skill enough evidence to act
- **Domain language**: The project's chosen terms, recorded in CONTEXT.md and ADRs
- **Seam**: The public boundary where design, implementation, testing, or operations become explicit
- **Tracer bullet**: A ticket that makes one narrow end-to-end behavior work
- **Frontier**: Tickets that are unblocked and claimable now
- **Review axis**: One of the two independent review dimensions: Standards and Spec
- **Repair plan**: A durable PR comment that converts findings into scoped, validated fixes
- **Ship state**: The state where review is clean, validation is known, and linked work can be merged or completed

### Canonical Flow

Standard workflow for feature development:

```
setup-quirk-skills
→ ask-to
→ grill-with-docs
→ to-spec
→ to-tickets
→ implement
→ publish-open-pr
→ review-pr
→ review-fix-loop (when needed)
→ ship-subissue (after clean review)
```

### Quality Bar

A quirk artifact is acceptable when it answers:

1. What is the source of truth?
2. What is in scope?
3. What is explicitly out of scope?
4. Who or what consumes this artifact next?
5. What evidence proves it is done?
6. What risk remains?

If an artifact cannot answer these questions, improve it before routing it downstream.

### Exercises

1. Context pack practice.
2. Grilling practice.
3. Artifact analysis.
4. Principle identification.

### Next Steps

Proceed to:
- Level 2: Writing effective skills (using writing-great-skills)
- Level 3: Building implementation skills (using tdd and implement)
- Level 4: Creating platform and stack specialized skills
- Level 5: Designing new workflow patterns

Goal: internalize the principles, not memorize them.
