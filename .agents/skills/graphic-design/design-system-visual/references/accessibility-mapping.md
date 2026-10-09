# Accessibility Mapping Reference

## WCAG 2.2 Requirements

### Perceivable
- Text alternatives for non-text content.
- Captions and audio descriptions for media.
- Content adaptable to different presentations.
- Distinguishable: color contrast, text resize, no reliance on sensory characteristics alone.

### Operable
- Keyboard accessible: all functionality available from keyboard.
- Enough time: users can extend time limits.
- Seizures and physical reactions: no flashing content.
- Navigable: consistent navigation, skip links, focus order.

### Understandable
- Readable: language of page identifiable.
- Predictable: consistent navigation and identification.
- Input assistance: error identification, suggestions, prevention.

### Robust
- Compatible: current and future technologies, including assistive technologies.

## Contrast Requirements

### Normal Text
- Minimum contrast ratio: 4.5:1.
- Applies to text smaller than 24px or not bold.

### Large Text
- Minimum contrast ratio: 3:1.
- Applies to text 24px or larger, or bold 19px or larger.

### UI Components and Graphics
- Minimum contrast ratio: 3:1.
- Applies to active UI elements and meaningful graphics.

## Focus Indicators
- Focus indicator must have a contrast ratio of at least 3:1 against adjacent colors.
- Do not remove focus indicator without providing an alternative.
- Focus indicator must be visible and clearly indicate the focused element.

## Motion Preferences
- Respect prefers-reduced-motion media query.
- Provide non-motion alternatives for critical information.
- Do not auto-play motion longer than 5 seconds without user control.

## Color Blindness
- Approximately 8% of men and 0.5% of women have color vision deficiency.
- Do not rely solely on color to convey information.
- Provide redundant encoding: shape, pattern, text, or icon.
