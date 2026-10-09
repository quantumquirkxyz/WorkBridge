# A2A Protocol Overview

Agent-to-Agent (A2A) is an interoperability protocol that enables autonomous agents to discover each other, negotiate capabilities, and invoke services across organizational boundaries.

## Agent Card

An Agent Card is a self-describing JSON document that an agent publishes to declare its identity, capabilities, and contact endpoint. It is the discovery primitive of the A2A protocol.

### Core Fields

| Field | Type | Purpose |
|---|---|---|
| `name` | string | Unique agent identifier |
| `description` | string | Human-readable summary of the agent |
| `url` | string | Endpoint where the agent accepts requests |
| `version` | string | Semantic version of the agent interface |
| `capabilities` | object | Declared abilities such as `streaming`, `pushNotifications` |
| `authentication` | object | Required auth schemes (API key, OAuth, mTLS) |
| `skills` | array | List of skills the agent can perform |

## Discovery Flow

1. Agent publishes its Agent Card to a well-known directory or registry.
2. Consumer agents query the directory by capability or name.
3. Consumer validates the Agent Card against the schema.
4. Consumer invokes the agent at the declared `url` using the protocol negotiated in the card.

## Versioning

- Agent Cards follow semantic versioning.
- Breaking changes to the card schema require a major version bump.
- Consumers must handle unknown fields gracefully.

## Security

- Agent Cards must be signed or served over TLS in production.
- The `authentication` object must declare the minimum required auth scheme.
- Consumers should verify the card signature before trusting capability claims.

## Runtime Integration

- `a2a-router.mjs` reads Agent Cards from `.agents/skills/platform/agent-cards/` and routes requests.
- `mcp-server` exposes `a2a/discover` and `a2a/invoke` endpoints that filter cards by capability.
