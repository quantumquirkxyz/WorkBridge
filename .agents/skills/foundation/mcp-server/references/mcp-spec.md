# MCP Protocol Overview

The Model Context Protocol (MCP) is an open standard that enables seamless integration between AI assistants and external data sources and tools. It defines a standardized way for agents to discover, invoke, and manage capabilities exposed by servers.

## Transport

MCP supports two transport mechanisms:

- **stdio**: Local integration using standard input/output streams. Ideal for same-machine agent-server communication with low latency.
- **sse**: Remote integration using Server-Sent Events over HTTP. Enables agent-server communication across network boundaries.

## Message Types

| Direction | Type | Purpose |
|---|---|---|
| Client → Server | `initialize` | Negotiate protocol version and capabilities |
| Client → Server | `tools/call` | Invoke an exposed tool with arguments |
| Client → Server | `tools/list` | Discover available tools |
| Client → Server | `resources/read` | Read a static resource |
| Client → Server | `resources/list` | List available resources |
| Client → Server | `prompts/get` | Retrieve a prompt template |
| Server → Client | `result` | Return tool output, resource content, or error |

## Lifecycle

1. Client sends `initialize` with supported protocol version and capabilities.
2. Server responds with its supported version and capabilities.
3. Client may send `initialized` notification to complete handshake.
4. Subsequent messages follow the negotiated protocol version.

## Schema Requirements

- Tool input and output schemas must be valid JSON Schema (draft 07).
- Resources must declare a stable URI and MIME type.
- Prompts must be versioned and argument-validated.

## Security Boundaries

- Servers must validate all incoming arguments against declared schemas.
- Servers must not expose secrets, credentials, or environment variables.
- Clients should verify server identity for remote (sse) transports.
- Tools with side effects require explicit allow-listing by the client.
