# Retouching Workflow

## Non-Destructive Editing

Non-destructive editing is the foundation of professional retouching. Every adjustment must be reversible.

### Core Non-Destructive Tools

- **Adjustment Layers:** Hue/Saturation, Curves, Levels, Color Balance, Photo Filter
- **Layer Masks:** Paint black to hide, white to reveal; use low opacity brushes for gradual transitions
- **Smart Objects:** Convert layers to Smart Objects before applying filters (Camera Raw, Gaussian Blur, etc.) to preserve editability
- **Clipping Masks:** Apply adjustments to a single layer without affecting layers below

### Workflow Structure

1. **Base correction layer group:** Exposure, white balance, lens correction
2. **Global color grading layer group:** Curves, color balance, HSL adjustments
3. **Local correction layer group:** Dodge and burn, frequency separation, detail enhancement
4. **Output preparation layer group:** Sharpening, output resize, format-specific adjustments

### Saving and Versioning

- Save as layered PSD or TIFF with all layers intact
- Create a flattened copy for client review
- Version naming convention: `project_retouch_v001.psd`, `project_retouch_v002.psd`
- Archive final layered file and flattened delivery version separately

## Frequency Separation for Skin Retouching

Frequency separation separates texture (high frequency) from tone and color (low frequency), allowing independent editing.

### Two-Pass Frequency Separation

**Low Frequency (Tone and Color)**
- Duplicate base layer twice
- Apply Gaussian Blur to top duplicate: 10-20 pixels for portrait, 5-10 pixels for product skin
- Set blend mode to Linear Light
- Add layer mask and paint with low opacity to blend blur naturally
- Edit this layer for skin tone evenness, redness reduction, and color correction

**High Frequency (Texture)**
- Duplicate the low-frequency result
- Apply Image > Apply Image using the low-frequency layer as source with Linear Light blend mode
- Or manually subtract low-frequency using the Apply Image dialog
- Edit this layer for skin texture, blemishes, and pores

### Frequency Separation Best Practices

- Use a low-opacity healing brush on the high-frequency layer for spot removal
- Use a color sampler on the low-frequency layer to match skin tone across the face
- Do not blur the low-frequency layer to the point where edges disappear; preserve natural skin transitions
- For darker skin tones, use a lower blur radius to preserve texture detail

## Dodge and Burn Techniques

Dodge and burn manually sculpt light and shadow to add dimension and correct tonal imbalance.

### Method: 50% Gray Dodge and Burn Layer

1. Create a new layer filled with 50% gray
2. Set blend mode to Overlay or Soft Light
3. Use a soft round brush with low opacity (5-15%) and flow
4. Paint with white to dodge (lighten), black to burn (darken)
5. Build tone gradually; multiple light passes are better than one heavy stroke

### Dodge and Burn Application

- **Eye brightening:** Dodge the catchlight area and under-eye region subtly
- **Cheekbone definition:** Burn the shadow area under the cheekbone
- **Jawline and neck:** Even out shadow transition between face and neck
- **Product form:** Enhance highlights and shadows to define three-dimensional form
- **Fabric and texture:** Dodge highlights on texture to bring out weave or material quality

### Modern Dodge and Burn (Frequency-Aware)

- Perform dodge and burn on a duplicated high-frequency layer to affect texture without altering tone
- Alternatively, use a curves adjustment layer masked to specific tonal ranges

## Background Removal and Compositing

### Selection Methods

- **Pen tool:** Most precise for clean product silhouettes; anchor-point accuracy matters
- **Select Subject (AI):** Fast for clean studio shots; verify edges manually
- **Channel masking:** Best for complex edges like hair, fur, or transparent products
- **Color range selection:** Effective when subject is isolated by strong color contrast from background

### Edge Refinement

- Refine Edge or Select and Mask to smooth, contract, or feather edges
- Use Decontaminate Colors to remove background color spill on edges
- For hair: use the Output to Layers feature with a layer mask for manual edge painting
- Zoom to 100% or 200% to inspect edge quality before finalizing

### Compositing Considerations

- Match lighting direction and quality between foreground and new background
- Add contact shadow or reflection to ground the subject in the new environment
- Match color temperature and perspective to avoid visible seams
- Use adjustment layers clipped to the subject for final color matching

## Sharpening and Output Resolution

### Sharpening Strategy

- **Capture sharpening:** Applied early in the workflow to compensate for lens and sensor softness
- **Creative sharpening:** Applied selectively to draw attention to focal points (eyes, product logo, texture)
- **Output sharpening:** Applied as the final step, tailored to the output medium and resolution

### Output Sharpening Guidelines

| Output Medium | Method | Amount |
|--------------|--------|--------|
| Web (72 PPI) | Unsharp Mask or Smart Sharpen | Low radius (0.3-0.5px), low amount |
| Print (300 PPI) | Unsharp Mask | Medium radius (1.0-1.5px), medium amount |
| Large format (150+ PPI) | Unsharp Mask | Higher radius (2.0+ px), lower amount |

### Resolution and Resampling

- **Upsampling for print:** Use Preserve Details 2.0 or Gigapixel AI when source resolution is below target
- **Downsampling for web:** Resize to target dimensions, then apply output sharpening
- **Always work in the highest resolution source file**; resize as the final step before delivery
- Maintain aspect ratio; do not stretch or distort to fill non-matching output dimensions

### Final Output Checklist

- [ ] Image is at target resolution and color mode for delivery medium
- [ ] Sharpening is applied at correct output size (not upscaled then sharpened)
- [ ] No visible halos around high-contrast edges from over-sharpening
- [ ] File is saved in correct format with appropriate compression settings
- [ ] Metadata and copyright information embedded where required
