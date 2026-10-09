# MCP Tool Definition Format

Use this schema when generating MCP tool definitions from skill frontmatter capabilities.

## Structure

```json
{
  "name": "tool-name",
  "description": "Human-readable description of the tool",
  "inputSchema": {
    "type": "object",
    "properties": {
      "paramName": {
        "type": "string",
        "description": "Parameter description"
      }
    },
    "required": ["paramName"]
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "result": {
        "type": "object",
        "description": "Output description"
      }
    }
  }
}
```

## Field Reference

| Field | Type | Description |
|---|---|---|
| `name` | string | Tool identifier, typically the skill name hyphenated |
| `description` | string | What the tool does; derived from the skill `description` |
| `inputSchema` | object | JSON Schema object describing input parameters |
| `outputSchema` | object | JSON Schema object describing return value |

## Generation Rules

- Map each skill capability to a separate tool definition.
- Derive `inputSchema` from the skill's `inputs` frontmatter field.
- Derive `outputSchema` from the skill's `outputs` frontmatter field.
- Set `name` to the skill name in kebab-case.
- Set `description` to the skill's `description` frontmatter value.
- If a capability is read-only, omit side-effect warnings in the tool metadata.
- If a capability has side effects, include `sideEffects` in the tool metadata and require an explicit allow-list.
