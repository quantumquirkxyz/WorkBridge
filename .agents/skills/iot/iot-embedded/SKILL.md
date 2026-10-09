---
name: "iot-embedded"
category: "iot"
maturity: "stable"
version: "1"
description: "Design embedded/IoT systems — firmware, sensors, edge computing, device connectivity, OTA updates — with reliability, security, and constrained resource awareness."
capabilities: ""
outputs: ""
sideEffects: []
dependencies: []
stopCondition: "Design embedded/IoT systems complete; artifact saved; completion criteria checked."
risk: "low"
trustTier: "1"
maxIterations: "6"
promptVersion: "2.0"
artifactType: "iot"
modelTier: "reasoning"
evaluators: ["behavioral", "regression"]
fixturesPath: ".agents/skills/platform/fixtures/behavioral/iot-embedded.json"
diataxis: "how-to"
tags: ["iot"]
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

Emit `IotEmbeddedArtifact` as both:
- JSON: `.agents/skills/platform/artifacts/iot-embedded/{identifier}.json`
- Markdown view: same filename with `.md` extension


# 
# 
# iot-embedded

Design embedded/IoT systems — firmware, sensors, edge computing, device connectivity, OTA updates — with reliability, security, and constrained resource awareness.

## Goals
- Design for constrained hardware (RAM, CPU, power)
- Plan secure device communication and firmware updates
- Define edge vs. cloud processing split
- Ensure observability of distributed devices


## Device Constraints

| Resource | Microcontroller | Edge Device | Edge Server |
|---|---|---|---|
| RAM | 2–512 KB | 256 MB–2 GB | 4–64 GB |
| Storage | 16 KB–8 MB | 8–256 GB | 100 GB+ |
| Power | Battery/solar | Plugged | Plugged |
| Connectivity | LoRa, BLE, WiFi | WiFi/Cellular | Ethernet |

## Steps

1. **Profile the device** — understand constraints upfront
2. **Choose communication protocol** — MQTT (pub/sub), CoAP (constrained), HTTP (request/response)
3. **Split processing** — edge (real-time, low latency) vs. cloud (batch, storage)
4. **Design the protocol** — message schemas, QoS, retain, last-will
5. **Plan OTA updates** — secure boot, delta updates, rollback
6. **Add observability** — device health, connectivity, firmware version

## Security Checklist

- [ ] Secure boot with signed firmware
- [ ] TLS/DTLS for data in transit
- [ ] Device authentication (certificates or keys)
- [ ] OTA updates with rollback capability
- [ ] No hardcoded credentials

## Rules

- Rule: design from device constraints: CPU, memory, storage, power, and connectivity.
- Rule: choose protocol and QoS based on latency, bandwidth, reliability, and power budget.
- Rule: require secure boot, signed firmware, device identity, and OTA rollback for managed fleets.
- Rule: define offline behavior, retry policy, and data buffering explicitly.
- Rule: include fleet observability: health, firmware version, connectivity, and error telemetry.

## References
- `../../networking/networking/SKILL.md` — network protocols
- `../../sec/sec-cryptography-applied/SKILL.md` — device security
- `../../foundation/observability/SKILL.md` — device observability

## Completion

- the skill's completion criteria are explicitly checked
- the artifact is saved and validated
- any blockers or skipped validations are documented
- the next consumer is identified or the work is handed off
---
@include .agents/skills/platform/contract-base.xml