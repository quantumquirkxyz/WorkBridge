---
name: "os-processes"
category: "os"
maturity: "stable"
version: "1"
description: "Design operating system process management — scheduling, signals, process states, concurrency, and inter-process communication — with explicit isolation boundaries."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Process states, scheduling assumptions, IPC, and failure behavior are explicit."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "pull-request"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/os-processes.json"
diataxis: "how-to"
tags: ["os"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: OS context, process model, workload, synchronization needs, and observed symptoms or design goal.
- Output: process-state analysis, scheduling/IPC design, and failure or race-condition notes.
- Scope: distinguish process behavior, thread behavior, and application-level task scheduling.
- Rule: distinguish process behavior, thread behavior, and application-level task scheduling.
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

Emit `OsProcessesArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/os-processes/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# os-processes

Use this skill when reasoning about process lifecycle, scheduling, signals, forks, exec, IPC, synchronization, process isolation, or OS-level concurrency behavior.


## Rules

- Rule: name process states and transitions before explaining lifecycle behavior.
- Rule: identify ownership of file descriptors, signals, child processes, and exit status.
- Rule: separate CPU scheduling, blocking I/O, locks, and IPC delays.
- Rule: treat signal handling and process cleanup as failure paths, not afterthoughts.
- Rule: call out isolation boundaries for privileges, namespaces, cgroups, and resources when relevant.

## Steps

1. Identify processes, parents/children, threads, and resource ownership.
2. Trace lifecycle: start, fork/exec, wait, signal, termination, and cleanup.
3. Analyze scheduling, blocking points, IPC channels, and synchronization.
4. Identify races, deadlocks, orphan/zombie risks, and resource leaks.
5. Recommend design or diagnostic steps.
6. Define tests or observations that would confirm the process behavior.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml