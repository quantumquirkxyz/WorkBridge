---
description: "Design embedded/IoT systems — firmware, sensors, edge computing, device connectivity, OTA updates — with reliability, security, and constrained resource awareness."
---
# iot-embedded

When to use: Design embedded/IoT systems — firmware, sensors, edge computing, device connectivity, OTA updates — with reliability, security, and constrained resource awareness.

## Workflow

1. **Profile the device** — understand constraints upfront
2. **Choose communication protocol** — MQTT (pub/sub), CoAP (constrained), HTTP (request/response)
3. **Split processing** — edge (real-time, low latency) vs. cloud (batch, storage)
4. **Design the protocol** — message schemas, QoS, retain, last-will
5. **Plan OTA updates** — secure boot, delta updates, rollback
6. **Add observability** — device health, connectivity, firmware version

## Deliverables

- iot artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Design embedded/IoT systems complete; artifact saved; completion criteria checked.
