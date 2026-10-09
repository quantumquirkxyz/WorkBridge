# Color Science Reference

## Color Models

### RGB
- Additive model for screens.
- Values: 0–255 per channel.
- Use for digital only.

### CMYK
- Subtractive model for print.
- Values: 0–100% per channel.
- Use for print only.

### Pantone
- Spot color system for precise print matching.
- Use when brand colors must be reproduced exactly.

### OKLCH
- Perceptually uniform color space.
- Better for generating accessible palettes than HSL or LAB.

## Contrast and Accessibility

### WCAG 2.2 Requirements
- **Normal text (< 24px):** minimum 4.5:1 contrast ratio.
- **Large text (≥ 24px or bold ≥ 19px):** minimum 3:1 contrast ratio.
- **UI components and graphics:** minimum 3:1 contrast ratio.

### Tools
- Use `scripts/validate-contrast.py` for programmatic contrast checks.
- WebAIM Contrast Checker for manual validation.

## Color Harmony
- **Complementary:** opposite on the color wheel.
- **Analogous:** adjacent on the color wheel.
- **Triadic:** three equally spaced hues.
- **Split-complementary:** base hue plus two adjacent to its complement.
- **Tetradic:** two complementary pairs.

## Color Blindness
- Approximately 8% of men and 0.5% of women have color vision deficiency.
- Avoid relying solely on hue to convey information.
- Test palettes with Coblis or Colorblindly.
