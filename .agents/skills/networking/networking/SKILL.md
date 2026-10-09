---
name: "networking"
category: "networking"
maturity: "stable"
version: "1"
description: "Design and analyze network infrastructure — TCP/IP, routing, DNS, load balancing, firewalls, VPNs, network security — with explicit assumptions about latency, bandwidth, and failure modes."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Design and analyze network infrastructure complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "networking"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/networking.json"
diataxis: "how-to"
tags: ["networking"]
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

Emit `NetworkingArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/networking/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# networking

Design and analyze network infrastructure — TCP/IP, routing, DNS, load balancing, firewalls, VPNs, network security — with explicit assumptions about latency, bandwidth, and failure modes.

## Goals
- Design network topology with explicit redundancy
- Choose protocols appropriate to latency and reliability requirements
- Plan for network security (segmentation, firewalls, monitoring)
- Diagnose connectivity issues systematically


## Layers

| Layer | Protocol examples | Focus |
|---|---|---|
| Application | HTTP, gRPC, MQTT, WebSocket | Business logic |
| Transport | TCP, UDP, QUIC | Reliability vs. speed |
| Internet | IP, ICMP, BGP | Routing, addressing |
| Link | Ethernet, WiFi, LTE | Physical delivery |

## Common Patterns

| Pattern | Use case | Trade-off |
|---|---|---|
| Load balancer | Distribute traffic | Latency, cost |
| CDN | Static content, low latency | Cache invalidation |
| VPN tunnel | Secure remote access | Encryption overhead |
| Reverse proxy | SSL termination, caching | Single point of failure |

## Steps

1. **Map the network topology** — who talks to whom, where
2. **Profile traffic** — latency, bandwidth, burst patterns
3. **Choose protocols** — TCP for reliability, UDP for speed
4. **Design security** — segmentation, firewall rules, monitoring
5. **Plan for failure** — redundancy, failover, disaster recovery
6. **Document** — topology, IP ranges, DNS, routing rules

## Rules

- Rule: map who talks to whom before choosing protocols or appliances.
- Rule: state latency, bandwidth, reliability, and security assumptions.
- Rule: separate topology, routing, DNS, load balancing, and firewall concerns.
- Rule: include redundancy, failover, and monitoring for critical paths.
- Rule: document IP ranges, ownership, and change-control expectations.

## References
- `../os/SKILL.md` — network stack in OS
- `../../devops/devops-k8s-orchestration/SKILL.md` — k8s networking
- `../../sec/sec-threat-modeling/SKILL.md` — network threats

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml