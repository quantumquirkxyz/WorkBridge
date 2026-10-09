---
name: "os-memory"
category: "os"
maturity: "stable"
version: "1"
description: "Design operating system memory systems — virtual memory, paging, allocation, swapping, and protection — with explicit resource accounting and locality assumptions."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Memory layout, resource limits, and protection/locality trade-offs are explicit."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "os"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/os-memory.json"
diataxis: "how-to"
tags: ["os"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: workload, memory layout, allocation pattern, OS constraints, resource limits, and observed metrics or symptoms.
- Output: memory-behavior analysis with protection, paging, allocation, locality, and mitigation options.
- Scope: separate virtual address space, resident memory, committed memory, and physical memory pressure.
- Rule: separate virtual address space, resident memory, committed memory, and physical memory pressure.
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

Emit `OsMemoryArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/os-memory/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# os-memory

Use this skill when reasoning about virtual memory, paging, allocation, swapping, address spaces, memory protection, locality, or OS-level memory pressure.


## Rules

- Rule: define which memory metric is being discussed before drawing conclusions.
- Rule: distinguish fragmentation, leaks, cache growth, swapping, and expected working-set size.
- Rule: include page size, locality, NUMA, mmap, copy-on-write, or overcommit when they matter.
- Rule: treat memory protection and privilege boundaries as part of the design.
- Rule: verify pressure with representative workload data when possible.

## Steps

1. Identify process memory layout, allocation pattern, limits, and workload shape.
2. Separate virtual, resident, shared, heap, stack, mapped, and cached memory concerns.
3. Analyze paging, locality, fragmentation, copy-on-write, and swapping behavior.
4. Identify protection and isolation assumptions.
5. Recommend mitigation: allocation strategy, batching, limits, pooling, profiling, or architecture change.
6. Define measurements that would validate the recommendation.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml