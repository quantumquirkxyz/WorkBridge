# WCAG Criteria for Visual Design

## WCAG 2.1 / 2.2 Level AA Requirements

### Contrast Ratios

- **Normal text**: minimum 4.5:1 contrast ratio against background
- **Large text** (18pt / 24px or 14pt bold / 18.5px): minimum 3:1 contrast ratio
- **Non-text contrast** (UI components, graphs, charts): minimum 3:1 against adjacent colors

### Text Spacing

- Line height (line spacing) at least 1.5 times the font size
- Paragraph spacing at least 2 times the font size
- Letter spacing (tracking) at least 0.12 times the font size
- Word spacing at least 0.16 times the font size

### Non-Text Contrast

- User interface components and graphical objects must have 3:1 contrast against adjacent colors
- Charts and graphs must maintain distinguishable series even in grayscale

### Focus Indicators

- Focus indicators must have at least 3:1 contrast against adjacent colors
- Interactive graphics must be operable via keyboard
- Visible focus ring or equivalent must be present

### Animation and Motion

- Respect `prefers-reduced-motion` media query
- Avoid flashing content (more than 3 flashes per second)
- Provide mechanisms to pause, stop, or hide moving content

### Keyboard Navigation

- All interactive graphic elements must be keyboard accessible
- Logical tab order must be preserved
- Skip links and landmarks must be provided for complex graphics

### Text Resizing

- Text must be resizable up to 200% without loss of content or functionality
- No horizontal scrolling at 320px viewport width with 200% text resize

### Orientation

- Content must not restrict view to a single orientation unless essential
