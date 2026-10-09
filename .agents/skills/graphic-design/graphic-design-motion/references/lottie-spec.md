# Lottie Specification

## Overview

Lottie (Bodymovin) exports After Effects compositions as JSON. This reference covers export settings, layer constraints, asset management, and optimization for web and mobile delivery.

## Bodymovin Export Settings

### Composition
- Set composition frame rate to match intended playback (usually 30 or 60 fps).
- Trim work area to animation bounds; avoid exporting empty frames.
- Enable "Include in XMB" only if needed for localization.

### Render Settings
- Use "Fly on the fly" rather than pre-rendered frames.
- Enable "Glyphs" for dynamic text only if font subsetting is unavailable.
- Disable "Hidden" layers from export unless they drive expressions.

### Checker
Run Bodymovin checker before export. Fix warnings for:
- Unsupported effects
- Missing fonts
- Expressions that may fail

## Layer Types and Limitations

### Supported Layers
- Shape layers (preferred)
- Pre-compositions (nested)
- Text layers (with glyphs or font references)
- Image layers (avoid for UI icons)

### Unsupported or Problematic
- 3D layers (flatten to 2D or use shape layers)
- Adjustment layers (use shape-based alternatives)
- Raster effects (gaussian blur, noise) — vector approximations preferred
- Video layers

### Layer Naming
Use clear, lowercase names with hyphens. Avoid duplicate names; they can cause merge conflicts.

## Asset Management

### Images
- Avoid embedding images in UI icon animations.
- For illustrations, use SVG assets rather than PNG/JPG.
- If images are required, export at 1x scale and no larger than 200 px on longest side.

### Fonts
- Convert text to outlines before export to eliminate font dependencies.
- If dynamic text is required, subset fonts to used glyphs only.

### References
- Link external assets rather than embed when Bodymovin supports linking.
- Validate that linked assets resolve in the target runtime.

## Optimization Rules

### Merge Shapes
Combine multiple shape groups into single paths where possible. Use "Merge Paths" compound shape.

### Trim Paths
Use trim paths for line-drawing effects. Animate "End" property only; avoid animating "Start" and "End" simultaneously unless intentional.

### Reduce Dimensions
Resize composition to smallest bounding box that contains all motion. Remove excess transparent space.

### Avoid Raster Effects
Replace gaussian blur, noise, and fractal noise with animated opacity masks, duplicated vector layers, or gradient overlays.

### Simplify Keyframes
Remove redundant keyframes with identical values. Reduce keyframe count on properties that do not need it.

### Remove Hidden Layers
Delete or disable layers that are not visible for any portion of the animation.

## Size Budgets

| Animation Type | Target JSON Size | Notes |
|---------------|------------------|-------|
| UI Icon | < 100 KB | Simple shape animation, no images |
| Icon Set | < 300 KB total | Shared assets, frame range reuse |
| Illustration | < 500 KB | Complex vector art with motion |
| Hero / Background | < 2 MB | Video fallback recommended above 500 KB |

## Performance Tips

- Target 30–60 fps; 60 fps requires simpler shapes.
- Use `lottie-web` with `renderer: 'svg'` for crisp scaling; `renderer: 'canvas'` for particle-heavy scenes.
- Set `loop: false` when possible; enable `autoplay: false` for below-the-fold animations.
- Destroy Lottie instances on component unmount to free memory.
