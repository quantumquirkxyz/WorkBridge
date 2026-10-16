---
description: "Design operating system process management — scheduling, signals, process states, concurrency, and inter-process communication — with explicit isolation boundaries."
---
# os-processes

When to use: Design operating system process management — scheduling, signals, process states, concurrency, and inter-process communication — with explicit isolation boundaries.

## Workflow

1. Identify processes, parents/children, threads, and resource ownership
2. Trace lifecycle: start, fork/exec, wait, signal, termination, and cleanup
3. Analyze scheduling, blocking points, IPC channels, and synchronization
4. Identify races, deadlocks, orphan/zombie risks, and resource leaks
5. Recommend design or diagnostic steps
6. Define tests or observations that would confirm the process behavior

## Deliverables

- pull-request artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Process states, scheduling assumptions, IPC, and failure behavior are explicit.
