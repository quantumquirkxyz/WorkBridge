# Adobe Integration Reference

## Adobe I/O
- Adobe's developer platform for integrating with Creative Cloud.
- OAuth 2.0 authentication.
- Access to: Photoshop, Illustrator, InDesign, After Effects, Premiere, Lightroom, XD.
- REST APIs and event-driven integrations.

## UXP Automation
- Unified Extensibility Platform for Adobe apps.
- Plugins execute within the host application.
- Batch operations, preflight checks, asset organization.
- Suitable for: automated export, batch processing, preflight validation.

## Key APIs

### Photoshop API
- Document creation and manipulation.
- Layer and adjustment operations.
- Export to PNG, JPG, PDF, PSD.
- Generative fill via Firefly API.

### Illustrator API
- Document creation and manipulation.
- Path and shape operations.
- Export to SVG, PDF, EPS, PNG.
- Variable data and batch processing.

### InDesign API
- Document creation and layout automation.
- Text and paragraph styles.
- Export to PDF, IDML, EPUB.
- Data merge for variable data printing.

## Firefly Generative APIs
- Text-to-image, text-fill, generative recolor.
- Requires Adobe I/O project with Firefly access.
- Commercial use terms apply.
- Rate limits and content policies apply.

## Authentication
- OAuth 2.0 via Adobe I/O.
- Service accounts for server-to-server integrations.
- Refresh token rotation for long-lived access.

## Safety Considerations
- Do not overwrite source files without explicit approval.
- Do not use generative APIs for copyrighted or trademarked content without rights.
- Log all API calls for audit.
- Use least-privilege access tokens.
