# Color Grading

## Color Theory for Photography

### Complementary Colors
- Colors opposite each other on the color wheel (e.g., blue and orange, red and green)
- Creates maximum contrast and visual tension
- Common in cinematic grading: warm skin tones against cool backgrounds
- Use for campaigns requiring bold, memorable visuals

### Analogous Colors
- Colors adjacent on the color wheel (e.g., blue, blue-green, green)
- Creates harmony, cohesion, and a unified visual temperature
- Ideal for brand campaigns requiring subtlety and elegance
- Effective for seasonal campaigns (autumn oranges, spring greens)

### Triadic Colors
- Three colors equally spaced on the color wheel (e.g., red, yellow, blue)
- High visual interest while maintaining balance
- Use one as dominant, one as secondary, one as accent to avoid chaos
- Effective for youthful, energetic brand positioning

### Split-Complementary and Tetradic
- Split-complementary: one color plus the two adjacent to its complement
- Tetradic (double complementary): two complementary pairs
- Use when primary complementary contrast is too aggressive but visual variety is needed

## Color Grading Styles

### Cinematic
- Teal and orange base split
- Crushed blacks, lifted shadows with color cast
- Increased contrast, reduced saturation in midtones
- Letterbox aspect ratio crop (2.35:1 or 2.39:1) for full cinematic effect
- Grain overlay for filmic texture

### Natural
- Minimal color manipulation
- Preserve original white balance and skin tones
- Subtle contrast curve for clarity without artificiality
- Preferred for documentary, lifestyle, and authentic brand storytelling

### High-Key
- Bright, airy, predominantly light tones
- Lifted blacks, compressed highlights
- Low contrast, high brightness
- Pastel or white-dominant color palette
- Effective for beauty, wellness, and minimal luxury brands

### Low-Key
- Dominated by shadows and dark tones
- Crushed blacks, selective highlight reveal
- High contrast, moody atmosphere
- Single color accent or warm highlight to create focal point
- Effective for premium, nocturnal, and dramatic brand positioning

### Vintage / Film Emulation
- Faded blacks, reduced contrast
- Warm color cast or cross-processed color shift
- Subtle grain and vignette
- Specific to brand nostalgia or heritage positioning

## LUTs and Presets

### Using LUTs Effectively

- **Technical LUTs:** Camera-to-rec709, log-to-rec709, or S-Log3-to-Rec709 conversion LUTs — apply first
- **Creative LUTs:** Applied after technical conversion; define the visual style
- **LUT strength:** Start at 60-80% opacity and adjust to taste; full strength often oversaturates

### Building Custom Presets

1. Grade one hero image to the exact target look
2. Save adjustment layers or LUT with intensity at 70%
3. Apply to representative samples across the campaign
4. Adjust globally rather than per-image to maintain consistency
5. Document preset parameters: lift/gamma/gain values, color wheels, HSL adjustments

### Preset Management

- Organize presets by brand, campaign, and image type
- Version control presets when they are part of a shared brand asset library
- Export LUTs (.cube format) for cross-software compatibility (Photoshop, Premiere, DaVinci Resolve)

## Skin Tone Preservation

Skin tone is the most scrutinized element in brand and portrait photography. Poor skin rendering destroys credibility.

### Skin Tone Targeting

- **Ideal skin chrominance:** In a vectorscope, skin tones fall along the skin tone line at approximately 120 degrees (between red and yellow)
- **Luminance target:** Skin should sit in the upper-midtone range (60-70 IRE) for natural brightness
- **Avoid:** Oversaturating reds and oranges, which shifts skin toward ruddy or sunburned

### Selective Skin Adjustments

- Use HSL or Color Selection tools to isolate skin from clothing and background
- Adjust hue, saturation, and luminance independently for skin tones
- Maintain slight variation across different models to avoid an artificial, uniform look
- Preserve natural texture through careful sharpening masks — do not flatten skin completely

### Ethnicity-Inclusive Grading

- Test color grades on a diverse range of skin tones before finalizing campaign look
- Avoid one-size-fits-all skin adjustments; create per-subject refinement layers
- Reference calibrated monitor profiles for accurate skin rendering

## Brand Color Matching

### Matching Workflow

1. Extract brand color values from brand guidelines (hex, RGB, CMYK, PANTONE if available)
2. Convert to the target color space (RGB for screen, CMYK for print)
3. Use a color sampler on the graded image to verify brand color accuracy
4. Adjust selectively using Hue/Saturation targeted to brand color ranges
5. Validate on multiple displays and in target output format

### Brand Color Integration Strategies

- **Dominant brand color:** Use as primary background, key lighting gel, or dominant surface color
- **Accent brand color:** Use in small doses for call-to-action elements, product highlights, or model wardrobe
- **Tinted lighting:** Use colored gels or post-production color overlays matched to brand palette
- **Consistency check:** All campaign images should pass a side-by-side brand color match test before delivery

### Common Pitfalls

- Desaturating brand colors during contrast or luminance adjustments
- Allowing environmental colors to overpower brand colors
- Failing to account for monitor calibration differences between team members
