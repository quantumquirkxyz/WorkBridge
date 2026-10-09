# Canva Integration Reference

## Canva API
- REST API for design creation and management.
- Endpoints: designs, assets, folders, comments, exports.
- Authentication: OAuth 2.0.
- Rate limits: requests per minute depending on plan.
- Suitable for: automated design generation, brand asset management, bulk export.

## Canva MCP Server
- Remote MCP server at https://mcp.canva.com/mcp.
- Tools: design creation, editing, asset management, exports, comments.
- OAuth authentication.
- Suitable for: agent-driven design workflows.

## Brand Kit
- Centralized brand assets: logos, colors, fonts.
- Applied across designs automatically.
- Ensures brand consistency.

## Design Automation
- Create designs from templates.
- Populate templates with data.
- Batch export designs in multiple formats.
- Suitable for: social media automation, marketing campaigns, personalized documents.

## Safety Considerations
- Do not publish designs without human review.
- Do not overwrite brand assets without approval.
- Log all API calls for audit.
- Use least-privilege access tokens.
