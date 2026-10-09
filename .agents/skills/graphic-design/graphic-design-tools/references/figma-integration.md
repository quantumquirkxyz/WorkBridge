# Figma Integration Reference

## Plugin API
- Executes JavaScript within the Figma editor.
- Access to document nodes, properties, and user interface.
- Limited network access; most operations are local.
- Suitable for: component generation, token extraction, automated layout adjustments.

## REST API
- HTTP API for file and comment access.
- Endpoints: GET /v1/files/:key, GET /v1/images/:key, GET /v1/comments, POST /v1/comments.
- Authentication: personal access token or OAuth.
- Rate limits: requests per minute depending on plan.
- Suitable for: design-to-code handoff, asset export, design review automation.

## MCP Server
- Official Figma MCP server exposes tools to agents.
- Transport: HTTP or STDIO.
- Tools: figma-use, figma-generate-design, figma-use-slides, figma-swiftui, cc-figma-component, apply-design-system, rad-spacing, edit-figma-design, sync-figma-token.
- Authentication: OAuth or personal access token.
- Suitable for: design context extraction, component generation, design system sync.

## Variables and Design Tokens
- Figma variables support color, number, string, and boolean types.
- Variables can be published and consumed by plugins and APIs.
- Modes allow light/dark and brand variations.
- Sync tokens from Figma to code using MCP or REST API.

## Components and Auto Layout
- Components are reusable node instances.
- Auto layout provides responsive behavior within Figma.
- Properties and variants enable component customization.
- Export component metadata for design-to-code workflows.

## Safety Considerations
- Do not overwrite source files without explicit approval.
- Do not share file access with unauthorized users.
- Log all API calls for audit.
- Use least-privilege access tokens.
