# MCP Tool Definition Best Practices

## Naming

- Use kebab-case for tool names: `expose-skills-as-mcp-tools`.
- Tool names must be unique within a server.
- Names should be stable across versions to avoid breaking clients.

## Description

- Write clear, action-oriented descriptions.
- Include side-effect warnings when applicable.
- State required permissions or allow-lists.

## Input Schema

- Define all required parameters explicitly.
- Use JSON Schema types that match the runtime data.
- Provide descriptions for every parameter.
- Enumerate allowed values with `enum` where applicable.
- Set sensible defaults when safe.

## Output Schema

- Declare the shape of the successful return value.
- Use `additionalProperties: false` to prevent contract drift.
- Document error cases separately in the description.

## Versioning

- Version tool definitions alongside the skill.
- Deprecate tools by setting `deprecated: true` before removal.
- Maintain backward compatibility for at least one major version.

## Side Effects

- Declare side effects in tool metadata.
- Require explicit allow-listing for mutating operations.
- Separate read-only tools from mutating tools.

## Idempotency

- Design tools to be idempotent where possible.
- Document retry behavior for network-bound operations.
