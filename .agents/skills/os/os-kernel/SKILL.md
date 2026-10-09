---
name: "os-kernel"
category: "os"
maturity: "stable"
version: "1"
description: "Design and analyze operating system internals — process management, memory management, file systems, scheduling, system calls, concurrency — with explicit resource accounting and failure boundaries."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Design and analyze operating system internals complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "os"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/os-kernel.json"
diataxis: "how-to"
tags: ["os"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: skill invocation with the user's request and available context.
- Output: a structured artifact or guidance aligned to the skill's declared outputs.
- Scope: stay within the skill's declared boundaries; do not broaden without explicit direction.
- Rule: documented standards override defaults; explicit project rules take precedence.
- Rule: if blocked by missing context or dependencies, surface the blocker before proceeding.

## Provenance

| Question | Answer |
|---|---|
| What is the source of truth? | The user's request, originating spec/issue, and the skill's declared outputs |
| What is in scope? | Work covered by the skill's acceptance criteria and completion rules |
| What is explicitly out of scope? | Files, behaviors, and decisions outside the skill's declared boundary |
| Who or what consumes this artifact afterward? | The next skill in the workflow or the user |
| What evidence proves it is done? | Completion criteria met, artifact saved, validation passed |
| What risk remains? | Subjective judgment calls, missing context, or external dependency failures


## Artifact

Emit `OsKernelArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/os-kernel/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# os-kernel

Design and analyze operating system internals — process management, memory management, file systems, scheduling, system calls, concurrency — with explicit resource accounting and failure boundaries.

## Goals
- Understand OS abstractions and their implementation trade-offs
- Design system interfaces that are minimal and composable
- Plan for concurrency, scheduling, and resource isolation
- Debug OS-level issues systematically


## Core Subsystems

| Subsystem | Responsibility | Key algorithms |
|---|---|---|
| Process management | Create, schedule, terminate | O(1) scheduler, CFS, EDF |
| Memory management | Allocate, virtualize, protect | Paging, slab allocator, GC |
| File system | Persist, organize, retrieve | Ext4, Btrfs, ZFS, FUSE |
| I/O | Device abstraction, buffering | Polling, interrupts, DMA |
| Concurrency | Synchronization, IPC | Mutex, semaphores, RCU |

## Steps

1. **Define the abstraction** — what does the OS expose to programs
2. **Analyze trade-offs** — performance, fairness, complexity, power
3. **Compare implementations** — how does Linux, BSD, or an RTOS do it
4. **Design the interface** — system call design, ioctl conventions
5. **Consider security** — privilege levels, isolation, capability model
6. **Test edge cases** — race conditions, deadlock, resource exhaustion

## Rules

- Rule: define the OS abstraction and resource ownership before discussing implementation.
- Rule: compare fairness, throughput, latency, power, and complexity trade-offs.
- Rule: include concurrency, race, deadlock, and resource-exhaustion failure modes.
- Rule: state privilege, isolation, and capability boundaries explicitly.
- Rule: ground claims in real kernel designs when possible.

## References
- `../networking/networking/SKILL.md` — OS networking stack
- `../compilers/compilers/SKILL.md` — code generation for OS targets
- `../../cs/cs-algorithms/SKILL.md` — scheduling, memory algorithms

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml