---
description: "Design network security — segmentation, firewalls, VPNs, TLS, authentication, and threat boundaries — with explicit trust zones."
---
# networking-security

When to use: Design network security — segmentation, firewalls, VPNs, TLS, authentication, and threat boundaries — with explicit trust zones.

## Workflow

1. Inventory assets, zones, entry points, identities, and administrative paths
2. Draw or describe current allowed flows and default-deny posture
3. Identify exposed services, lateral movement paths, and weak trust assumptions
4. Recommend segmentation, firewall, VPN, TLS, and access-control changes
5. Define monitoring for denied traffic, anomalous egress, and admin actions
6. Summarize residual risk and rollout considerations

## Deliverables

- security artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Trust zones, allowed flows, controls, and residual risks are explicit.
