---
name: mcp-server
category: foundation
maturity: beta
version: 2
description: Define an MCP server that exposes quirk Skills as tools, resources, and prompts to external LLM agents via the Model Context Protocol.
capabilities:
  - expose-skills-as-mcp-tools
  - generate-skill-resources
  - generate-workflow-prompts
  - configure-transport
inputs:
  - "skill-registry-paths: .agents/skills/ and .claude/skills/"
  - "transport: stdio or sse"
  - "endpoint: for sse transport"
outputs:
  - type: object
    name: McpServerArtifact
    properties:
      tools:
        type: array
        items:
          type: object
      resources:
        type: array
        items:
          type: object
      prompts:
        type: array
        items:
          type: object
      transport:
        type: string
        enum: [stdio, sse]
      endpoint:
        type: string
      skillsExposed:
        type: array
        items:
          type: string
    required: [tools, resources, prompts, transport, skillsExposed]
sideEffects:
  - write-files
dependencies: []
stopCondition: MCP server configured with tools, resources, and prompts generated; transport exposed; artifact saved; completion criteria checked.
risk: low
trustTier: 1
maxIterations: 5
modelTier: router
promptVersion: "2.0"
artifactType: plan
evaluators: [behavioral, traceability]
fixturesPath: .agents/skills/platform/fixtures/regression/mcp-server.json
diataxis: how-to
tags:
  - mcp
  - protocol
  - tools
  - resources
  - prompts
  - agent-discovery
compatibility:
  - all skills
approvalRequired: false
approvalFor: []
---

# MCP Server

## Why

The Model Context Protocol (MCP) enables agent interoperability by providing a standardized contract between AI agents and external capabilities. Without a shared protocol, each agent runtime would require custom adapters for every tool, resource, and prompt source. MCP eliminates this fragmentation by defining a single discovery and invocation surface that any compliant agent can consume. This means quirk Skills can be exposed once and consumed by Claude Code, Kilo, or any future MCP-compatible runtime without rewriting skill logic.

## Contract

- Input: skill registry paths (`.agents/skills/` and `.claude/skills/`), transport selection (`stdio` or `sse`), optional endpoint for `sse`.
- Output: `McpServerArtifact` with typed schema for `tools`, `resources`, `prompts`, `transport`, `endpoint`, and `skillsExposed`.
- Scope: expose quirk Skills via Model Context Protocol; do not modify skill source files or consume external data sources.
- Rule: every exposed tool maps to a skill capability with explicit input and output schemas.
- Rule: resources must point to static skill documentation; do not expose mutable state.
- Rule: prompts must be versioned and tied to specific workflow combinations.
- Rule: transport selection must match the deployment context — `stdio` for local, `sse` for remote.
- Rule: exclude skills with `trustTier > 3` from automatic exposure; require explicit allow-list.
- Rule: do not expose secrets, credentials, or environment variable values in any generated artifact.

## Provenance

| Quality-Bar Question | Evidence |
|---|---|
| **Intent** | Define an MCP server that exposes quirk Skills as tools, resources, and prompts to external LLM agents via the Model Context Protocol. |
| **Input** | skill registry paths, transport selection, endpoint configuration. |
| **Output** | `McpServerArtifact` with typed schema for `tools`, `resources`, `prompts`, `transport`, `endpoint`, and `skillsExposed`. |
| **Side effects** | writes server configuration files to disk. |
| **Boundaries** | exposes skills via MCP; does not modify skill source files or consume external data sources. |
| **Completion criteria** | all discovered skills are mapped to MCP tools, resources, and prompts; transport is configured and validated; artifact is saved; completion criteria are checked. |

## Artifact

Emit `McpServerArtifact` as both:
- JSON: `.agents/skills/foundation/mcp-server/artifacts/{request-id}.json`
- Markdown view: same filename with `.md` extension

Observability: the artifact must include a `traceId` field for correlating MCP server invocations with downstream skill executions. Each tool entry must record the `skillName` it maps to, enabling downstream metrics to attribute latency and errors to specific skills.


The `traceId` in each artifact entry lets operators trace a single MCP session through multiple tool calls and downstream skill executions. This makes it possible to measure per-skill latency and error rates in production observability tools.
The artifact must include the typed schema for `McpServerArtifact`:

- `tools`: array of MCP tool definitions generated from skill frontmatter capabilities. Each tool must include `name`, `description`, `inputSchema`, and `outputSchema`.
- `resources`: array of MCP resource definitions pointing to skill documentation. Each resource must include `uri`, `name`, `description`, and `mimeType`.
- `prompts`: array of MCP prompt templates for common workflows. Each prompt must include `name`, `description`, `arguments`, and `messages`.
- `transport`: enum `[stdio, sse]`
- `endpoint`: string (required for `sse` transport)
- `skillsExposed`: array of skill names exposed through the server

## Process

### Step 1: Load skill registry from `.agents/skills/` and `.claude/skills/`

Scan both canonical and compatibility view directories for `SKILL.md` files. Build a registry of available skills with their names, categories, capabilities, and frontmatter metadata. Validate each skill's frontmatter before inclusion. Skip skills missing required fields and log warnings for incomplete entries.

### Step 2: Generate MCP tool definitions from skill frontmatter

For each skill in the registry, generate an MCP tool definition using the format in `references/tool-schema.md`. Map skill capabilities to tool names. Include `inputSchema` and `outputSchema` based on the skill's inputs and outputs. Enforce the rule that tools with side effects require explicit allow-list.

### Step 3: Generate MCP resource definitions for skill documentation

For each skill, generate an MCP resource definition that exposes the `SKILL.md` content. Resources should be read-only and point to the canonical skill path. Include the skill name, description, and MIME type `text/markdown`. Do not expose mutable state through resources.

### Step 4: Generate MCP prompt templates for common workflows

Generate prompt templates for common workflow combinations:
- skill discovery: list and filter available skills by category or tag
- skill execution: invoke a skill by name with arguments
- workflow chaining: combine multiple skills in sequence

Each prompt template must include a version, description, and argument schema. Version all prompts to support future updates without breaking existing consumers.

### Step 5: Expose via stdio or SSE transport

Configure the MCP server transport based on deployment context:
- `stdio`: for local agent integration, reads from stdin and writes to stdout
- `sse`: for remote agent integration, requires endpoint configuration and HTTP server

Write the server configuration to disk and validate the transport connection. Default to `stdio` when transport is unspecified. For `sse`, ensure the endpoint is reachable and returns valid MCP handshake responses.

## Completion Criteria

- all discovered skills are mapped to MCP tools, resources, and prompts
- transport is configured and validated
- artifact is saved
- completion criteria are checked

@include .agents/skills/platform/contract-base.xml

## Reference

- `references/mcp-spec.md` — MCP protocol overview, transport mechanisms, message types, and security boundaries.
- `references/tool-design.md` — tool definition best practices for naming, schemas, versioning, and side-effect declaration.
- `scripts/validate-schema.mjs` — minimal JSON Schema validator used during artifact emission.

## Validation

Before emitting the artifact, run `scripts/validate-schema.mjs` against the generated JSON to ensure the artifact conforms to the declared schema. If validation fails, fix the artifact generation logic rather than suppressing errors.
This skill follows the Model Context Protocol specification and integrates with the quirk Skills bundle without modifying source files.

