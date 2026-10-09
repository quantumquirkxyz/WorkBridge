# Accessibility Criteria for Data Visualizations

These criteria are derived from WCAG 2.1 Level AA and extended to cover data visualization-specific requirements. Every artifact must satisfy all applicable criteria before delivery.

---

## 1. Contrast Ratios

### Text Contrast
- **Body text and data labels:** Minimum 4.5:1 against the immediate background.
- **Large text (≥18pt or ≥14pt bold):** Minimum 3:1.
- **Chart titles and axis labels:** Treat as body text (4.5:1 minimum).

### Data Mark Contrast
- **Data marks (bars, lines, points, slices) against background:** Minimum 3:1.
- **Data marks against grid lines:** Minimum 2.5:1 (grid lines are decorative and may be lighter).

### Validation
Run `scripts/validate_chart.py` to simulate contrast checks. For manual review, use browser DevTools or a contrast-checking tool.

---

## 2. Pattern Fills for Colorblind Users

Never rely on color alone to encode data. Every color-encoded dimension must have a redundant encoding.

### Required Pattern Fill Usage
- **Bar charts:** Add diagonal hatching or dot patterns when bars are grouped by a second dimension.
- **Line charts:** Use distinct line styles (solid, dashed, dotted) in addition to color when showing >2 series.
- **Scatter / bubble:** Use distinct shapes (circle, square, triangle, diamond) in addition to color.
- **Pie / donut:** Add pattern fills (stripes, dots, crosshatch) to each slice.
- **Heatmaps:** Ensure adjacent color steps differ by ≥30 in luminance; supplement with numeric labels.

### Pattern Accessibility
- Patterns must have sufficient contrast against both the mark color and background.
- Avoid patterns with very fine lines (line width < 1px) that may alias or disappear at small sizes.
- Patterns should not reduce the effective contrast ratio of the mark below 3:1.

---

## 3. Text Alternatives

### Accessible Names
Every meaningful visual element must have an accessible name.

- **SVG charts:** Include `<title>` and `<desc>` elements inside the root `<svg>`.
  - `<title>`: Brief summary (e.g., "Monthly Revenue 2024").
  - `<desc>`: Detailed description including data summary, axes, and trends.
- **Interactive elements:** Use `aria-label` or `aria-labelledby` for buttons, toggles, and filter controls.
- **Data points:** Use `aria-label` on individual marks or provide a hidden data table.

### Data Table Alternative
Provide a hidden but screen-reader-accessible HTML table that mirrors the chart data.

```html
<table class="sr-only" aria-label="Data table for Monthly Revenue 2024">
  <thead>...</thead>
  <tbody>...</tbody>
</table>
```

Use `.sr-only` (screen-reader-only) CSS to hide the table visually while keeping it accessible.

---

## 4. Keyboard-Accessible Interactive Charts

If the chart includes interactive features (tooltips, zoom, filters, brushing):

- **All interactive elements must be focusable** via keyboard (Tab, arrow keys).
- **Focus indicators must be visible** (minimum 2px outline, high contrast).
- **Tooltips must appear on focus** in addition to hover.
- **Zoom and pan controls** must have keyboard equivalents and `aria-label` descriptions.
- **No keyboard traps:** Users must be able to Tab out of the chart at any point.
- **Live regions:** If tooltip content changes dynamically, use `aria-live="polite"` to announce updates.

---

## 5. Screen Reader Announcements

### Chart Summary
Before the chart, provide a concise summary for screen reader users:

```html
<p class="sr-only" aria-label="Chart summary">
  Monthly Revenue 2024. Revenue peaked at $52,000 in December and was lowest at $18,000 in January.
  Overall trend is upward with a dip in July.
</p>
```

### Data Table
The hidden data table (see Section 3) is the primary mechanism for detailed data access.

### Axis and Scale Announcements
- **SVG axes:** Use `<g aria-label="X-axis: Months">` and `<g aria-label="Y-axis: Revenue in USD">`.
- **Scale changes:** Announce if the chart uses a logarithmic or broken axis.

### Dynamic Updates
For real-time or animated charts, use `aria-live` regions to announce data changes. Do not announce every frame; throttle to meaningful changes (e.g., new data point every 5 seconds).

---

## 6. Additional Criteria

### Colorblind-Safe Palettes
- Use palettes documented in `references/color-palettes.md`.
- Validate with a colorblind simulator (e.g., Coblis, Color Blindness Simulator) during design review.

### Text on Data Marks
- If labels are placed directly on bars or slices, ensure the label color contrasts with the mark color (minimum 4.5:1).
- Use a subtle text shadow, halo, or semi-transparent background to improve readability.

### Print and High-Contrast Modes
- Charts must remain legible when printed in grayscale. Use patterns and line styles as redundant encodings.
- Test in Windows High Contrast Mode and browser forced-colors modes.

### Minimum Interaction Target Size
- Clickable or tappable elements must be at least 24x24 CSS pixels (WCAG 2.5.5) or 44x44 points (iOS HIG).

---

## Validation Checklist

Use `scripts/validate_chart.py` to automate checks. Manual review is required for:

- [ ] Colorblind simulation (use Coblis or similar)
- [ ] Screen reader test (NVDA, JAWS, VoiceOver)
- [ ] Keyboard-only navigation test
- [ ] Print / grayscale preview test
- [ ] High-contrast mode test
