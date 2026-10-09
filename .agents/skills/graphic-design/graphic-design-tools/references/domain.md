# Graphic Design Tools Domain Reference

## Tool Categories

### Design Platforms
- **Figma:** collaborative interface and graphic design, plugin API, REST API, variables, components, auto layout.
- **Adobe Creative Cloud:** Photoshop, Illustrator, InDesign, After Effects, Premiere; UXP automation, Adobe I/O.
- **Canva:** online design platform, brand kit, API, MCP server, design automation.
- **Sketch:** macOS-only design tool, plugins, mirror, cloud sync.
- **Affinity:** Designer, Photo, Publisher; one-time purchase, no subscription.
- **Penpot:** open-source Figma alternative, SVG-based, self-hostable.

### Production Tools
- **GIMP:** open-source raster graphics editor.
- **Inkscape:** open-source vector graphics editor.
- **Scribus:** open-source desktop publishing.
- **ImageMagick:** command-line image processing.
- **Sharp:** Node.js image processing library.

### Asset Management
- **Adobe Bridge:** asset browser and manager.
- **Bynder:** digital asset management.
- **Cloudinary:** image and video management, transformations.
- **Git LFS:** version control for large binary assets.

## API Patterns

### REST APIs
- Standard HTTP methods: GET, POST, PUT, DELETE.
- JSON request and response bodies.
- OAuth 2.0 or API key authentication.
- Rate limits and pagination.

### Plugin APIs
- Sandboxed execution within the host application.
- Access to document model and user interface.
- Limited or no network access depending on host.

### MCP Servers
- Model Context Protocol servers expose tools to agents.
- STDIO or HTTP transport.
- OAuth or API key authentication.
- Tool definitions describe inputs, outputs, and side effects.

## Authentication Methods

### OAuth 2.0
- Authorization code flow for user-facing integrations.
- Client credentials flow for service accounts.
- Refresh token rotation for long-lived access.

### API Keys
- Simple key-based authentication.
- Suitable for server-to-server integrations.
- Requires secure storage and rotation.

### Personal Access Tokens
- User-generated tokens with scoped permissions.
- Suitable for personal automation and prototyping.
- Not suitable for production multi-user systems.

## Data Flow Patterns

### Read-Only
- Agent reads design files, metadata, or assets.
- No modifications to source files.
- Lowest risk, easiest to approve.

### Supervised Write
- Agent proposes changes; human reviews and approves.
- Changes are applied only after explicit approval.
- Moderate risk, suitable for production.

### Autonomous Write
- Agent writes changes without human review.
- Highest risk, suitable only for non-critical automation.
- Requires strong safety boundaries and audit logging.
