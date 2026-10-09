---
name: "networking-security"
category: "networking"
maturity: "stable"
version: "1"
description: "Design network security — segmentation, firewalls, VPNs, TLS, authentication, and threat boundaries — with explicit trust zones."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Trust zones, allowed flows, controls, and residual risks are explicit."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "security"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/networking-security.json"
diataxis: "how-to"
tags: ["networking"]
compatibility: []
approvalRequired: "false"
approvalFor: []
---

## Contract

- Input: network topology, assets, identities, allowed flows, threat model, and operational constraints.
- Output: trust-zone model, allowed/blocked flows, control recommendations, and residual risk.
- Scope: prefer deny-by-default flow definitions and call out where business needs require exposure.
- Rule: prefer deny-by-default flow definitions and call out where business needs require exposure.
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

Emit `NetworkingSecurityArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/networking-security/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# networking-security

Use this skill when designing or reviewing segmentation, firewall rules, VPN access, TLS posture, ingress/egress controls, or service-to-service network trust.


## Rules

- Rule: define trust zones before discussing individual firewall rules.
- Rule: map allowed flows by source, destination, port/protocol, identity, and purpose.
- Rule: separate ingress, egress, lateral movement, and administrative access.
- Rule: include TLS, certificate, key rotation, and authentication assumptions where traffic crosses boundaries.
- Rule: document logging and alerting for policy violations and unexpected exposure.

## Steps

1. Inventory assets, zones, entry points, identities, and administrative paths.
2. Draw or describe current allowed flows and default-deny posture.
3. Identify exposed services, lateral movement paths, and weak trust assumptions.
4. Recommend segmentation, firewall, VPN, TLS, and access-control changes.
5. Define monitoring for denied traffic, anomalous egress, and admin actions.
6. Summarize residual risk and rollout considerations.

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml