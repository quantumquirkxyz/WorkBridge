# Typography for Charts

Fonts and text formatting directly affect chart readability. Follow these guidelines to ensure charts are legible at any size and on any device.

---

## Font Families

Choose fonts that are widely available, highly legible, and optimized for screen rendering.

### System Fonts (no download required)
- **-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif**
  - Pros: Instant load, native rendering, familiar to users.
  - Cons: Rendering varies by OS.
- **Use case:** Web dashboards, internal tools, rapidly delivered artifacts.

### Open Source Fonts (embed via @font-face or rely on common bundling)

**Inter**
- Weights: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)
- Pros: Designed for screens, excellent legibility at small sizes, variable font support.
- Use case: Web dashboards, infographics, long-form data stories.

**Roboto**
- Weights: 300, 400, 500, 700
- Pros: Ubiquitous on Android and Google services, familiar to broad audiences.
- Use case: Mobile-first dashboards, Google ecosystem integration.

**Atkinson Hyperlegible**
- Weights: 400, 700
- Pros: Designed specifically for low-vision users, distinguishable characters (e.g., 0 vs O, 1 vs l).
- Use case: Accessibility-first products, public-facing government or healthcare data.

### Monospace (for numerical data)

**JetBrains Mono, SF Mono, Menlo, Consolas, monospace**
- Use case: Axis labels with numbers, data tables, annotation of exact values.
- Rule: Use monospace only for data values, not for titles or body text.

---

## Size Hierarchy

Define a consistent type scale for chart elements. Use relative units (rem, em, %) where possible.

| Element | Recommended Size | Weight | Notes |
|---|---|---|---|
| Chart title | 1.25rem – 1.5rem (20–24px) | 600–700 | One chart, one title. No all-caps. |
| Subtitle / caption | 0.875rem – 1rem (14–16px) | 400 | Context, source, date. |
| Axis title | 0.875rem (14px) | 500–600 | Concise, units included. |
| Axis tick labels | 0.75rem – 0.875rem (12–14px) | 400 | Readable at arm’s length. |
| Data labels | 0.75rem (12px) | 500 | Use sparingly; avoid clutter. |
| Annotations | 0.75rem – 0.875rem (12–14px) | 500 | Callouts, thresholds, highlights. |
| Legend | 0.75rem – 0.875rem (12–14px) | 400 | Position close to data; avoid horizontal legends if possible. |

**Minimum text size:** 12px (0.75rem) for any text that conveys meaning. Captions and source notes may be 11px but should not contain critical data.

---

## Readability Rules

1. **No all-caps body text** — All-caps reduces legibility by ~15% for body-sized text. Use sentence case or title case. All-caps is acceptable only for very short labels (<3 characters) if absolutely necessary.

2. **Adequate line height** — For multi-line labels and annotations, use line-height ≥ 1.4.

3. **Text-background contrast** — All text must meet WCAG 2.1 AA (4.5:1 for body, 3:1 for large text). Validate with `scripts/validate_chart.py`.

4. **Avoid text overlap** — Use collision detection or stagger labels. Overlapped text is unreadable for screen readers and low-vision users.

5. **Avoid text on data marks when possible** — If labels must sit on bars or slices, use a semi-transparent background or halo to ensure contrast.

6. **Horizontal text preferred** — Rotated axis labels should be limited to ≤45 degrees. Vertical text (90 degrees) is acceptable only for very long category labels and should be avoided when possible.

---

## Number Formatting

### Scale Abbreviations

Use locale-aware abbreviations for large numbers.

- **Thousands:** K (e.g., 12.5K)
- **Millions:** M (e.g., 3.2M)
- **Billions:** B (e.g., 1.1B)
- **Trillions:** T (e.g., 0.8T)

**Rules:**
- Always use one decimal place when the value is not a whole number: `12.5K`, not `12K`.
- Do not mix scales in the same axis (e.g., do not show `1K` and `500` on the same tick series).

### Decimal Places

- **Currency:** 2 decimal places (e.g., `$1,234.56`).
- **Percentages:** 0–1 decimal place (e.g., `42%`, `42.5%`).
- **Rates / ratios:** 1–2 decimal places depending on scale.
- **Large counts:** 0 decimal places when using K/M/B.

### Locale-Aware Formatting

- Use `toLocaleString()` in JavaScript or equivalent in your toolchain.
- Respect user locale for decimal separators (`.` vs `,`) and thousand separators.
- Include units inline with numbers (e.g., `42 kg`, `$1,200`, `12.5%`) rather than relying solely on axis titles.
