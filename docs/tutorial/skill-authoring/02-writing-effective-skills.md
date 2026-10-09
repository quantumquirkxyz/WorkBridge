# Writing Effective quirk Skills

## Learning Path Level 2: Skill Authoring

Creating effective quirk skills is about predictable agent behavior, not prose volume.

### The Predictability Principle

Predictability means the agent follows the same _process_ every run, not that it produces identical output. Every lever below serves that goal.

### Core Authoring Principles

#### 1. Front-Load the Leading Word
A **leading word** is the compact concept the model should carry while running the skill.

Examples of effective leading words: _relentless_, _tight_, _fog of war_, _tracer bullets_, _leverage_, _locality_

- Put the leading word early in the description.
- Repeat it only where it changes behavior.

#### 2. Embrace Progressive Disclosure
Keep `SKILL.md` lean by pushing details behind context pointers:

- **In-skill step**: Primary tier - what the agent does, in order
- **In-skill reference**: Consulted on demand - definitions, rules, facts
- **External reference**: Loaded only when pointer fires - detailed examples, schemas

Linked files should be named for what they hold.

#### 3. Practice Ruthless Pruning
- Keep each meaning in a single source of truth.
- Check every line for relevance.
- Delete sentences that do not change behavior.

#### 4. Master Information Hierarchy
Use the ladder of immediate need:

1. In-skill step - ordered actions.
2. In-skill reference - definitions, rules, facts.
3. External reference - separate files loaded on demand.

### Advanced Contract Design

#### Inputs and Outputs Semantics
Design inputs and outputs for meaningful composition:

- Inputs should represent what the skill truly needs.
- Outputs should represent what the skill genuinely produces.
- Design for the next consumer of the artifact.

#### Dependencies as Trust Boundaries
- Dependencies declare what other skills you trust to provide certain capabilities.
- Keep them minimal and intentional.
- Circular dependencies indicate design problems.

#### Side Effects as Honesty Contracts
Side effects declare what repository state the skill modifies:

- Be exhaustive and honest about modifications.
- Categorize actions with the execution-policy framework.
- Align declared risk with actual potential impact.

### The Art of the Description

Your skill's description serves two jobs when model-invoked:
1. State what the skill is.
2. List the branches that should trigger it.

#### Description Writing Rules:
- Front-load the skill's leading word.
- Use one trigger per branch.
- Keep the description to triggers plus any reach clause.

### Designing for Evaluation

Think about how your skill will be evaluated from the start:

#### For Scenario Testing:
- What are the expected routes through skills for common use cases?
- What static assertions can validate skill behavior?
- What would constitute a regression in your skill's behavior?

#### For Behavioral Testing:
- What artifact formats should your skill consistently produce?
- What sections are required in those artifacts?
- What placeholder text should be forbidden?

### Common Pitfalls and How to Avoid Them

#### Pitfall 1: The Kitchen Sink Skill
**Problem**: Trying to do too much in one skill.
**Solution**: Split by invocation or by sequence.

#### Pitfall 2: The Vague Stop Condition
**Problem**: The agent cannot tell when the skill is done.
**Solution**: Make completion criteria checkable.

#### Pitfall 3: The Hidden Dependency
**Problem**: The skill relies on something not declared.
**Solution**: Make all dependencies explicit in the frontmatter.

#### Pitfall 4: The Narrative Trap
**Problem**: Writing prose that does not change behavior.
**Solution**: Apply the no-op test and delete lines that do not change behavior.

### Template for Effective Skills

An effective quirk skill looks like:

```
---
name: my-skill
description: Clear, leading-word-rich description that states what it does and when to use it.
version: 1
capabilities:
  - specific-capability-name
  - another-capability
inputs:
  - clear-input-description
  - another-input
outputs:
  - clear-output-description
  - another-output
dependencies:
  - only-what-you-truly-need
sideEffects:
  - honest-modifications-only
stopCondition: Clear, checkable completion criteria that ties to observable outcomes.
risk: honest-assessment
---

# Skill Name

Start with purpose and boundary.

## Contract

Explicitly state:
- Input: what the skill consumes
- Output: what the skill produces
- Scope: what the skill does and does not do
- Rules: specific constraints that govern the skill's behavior

[Optional: Sections specific to your skill's purpose]

## Completion Criteria

Clear, observable criteria that tell when the skill is done.
Each criterion should be checkable by the agent.
```

### Exercises

1. Leading word hunt.
2. No-op application.
3. Contract design.
4. Evaluation planning.

### Next Steps

Proceed to:
- Level 3: Building implementation skills that create lasting value
- Level 4: Creating platform skills that shape technical decisions
- Level 5: Designing workflow patterns that orchestrate complex processes

Goal: skills should be reliable, not verbose.
