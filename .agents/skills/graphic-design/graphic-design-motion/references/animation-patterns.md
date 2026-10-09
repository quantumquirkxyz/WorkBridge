# Animation Patterns

## Loading and Skeleton States

### Trigger
Content is pending fetch or render.

### Duration
- Skeleton shimmer: 1.5–2.5 s loop.
- Spinner: infinite loop with 600–1200 ms rotation period.
- Progress bar: 0.5–3 s depending on expected load time.

### Easing
- Shimmer: linear or ease-in-out with hard stops.
- Spinner: linear rotation or ease-in-out pulse.

### Accessibility
- Hide decorative animation from assistive tech (`aria-hidden="true"`).
- Provide text alternative (loading status text).
- Honor `prefers-reduced-motion`: reduce or eliminate motion.

---

## Page Transitions

### Fade
Simple opacity change.

- **Trigger**: Route change or view swap.
- **Duration**: 200–400 ms.
- **Easing**: Ease out for enter, ease in for exit.
- **Accessibility**: Respect `prefers-reduced-motion: reduce` → skip fade or use instant swap.

### Slide
Panoramic or directional movement.

- **Trigger**: Forward/back navigation, tab change.
- **Duration**: 300–500 ms.
- **Easing**: Ease out for entering panel, ease in for exiting panel.
- **Accessibility**: Ensure content does not clip during slide; provide focus management after transition.

### Shared Element
A single element visually travels between two states.

- **Trigger**: Selecting a list item, opening detail view.
- **Duration**: 400–600 ms.
- **Easing**: Ease in out with slight deceleration at end.
- **Accessibility**: Maintain focus on the shared element; announce state change.

---

## Microinteractions

### Button Hover and Active
Subtle scale, lift, or color shift.

- **Trigger**: Hover, focus, active (press).
- **Duration**: 100–200 ms hover, 80–150 ms active.
- **Easing**: Ease out for hover enter, ease in for hover leave. Ease in for active press.
- **Accessibility**: Match focus-visible styles to hover styles. Do not rely on hover alone for feedback.

### Toggle and Switch
Sliding thumb with state color change.

- **Trigger**: Click or keyboard activation.
- **Duration**: 200–300 ms.
- **Easing**: Ease in out for thumb, ease out for color.
- **Accessibility**: Use live region or ARIA to announce state change. Honor `prefers-reduced-motion`.

### Checkbox and Radio
Scale or checkmark draw.

- **Trigger**: Selection.
- **Duration**: 150–250 ms.
- **Easing**: Ease out for checkmark draw, ease in out for container.
- **Accessibility**: Ensure reduced-motion fallback shows instant state change.

### Slider and Range
Thumb drag with fill animation.

- **Trigger**: Drag or input.
- **Duration**: 0 ms (follow input) for drag. 200–300 ms for value-change feedback.
- **Easing**: Linear for drag, ease out for feedback.
- **Accessibility**: Announce value changes. Provide keyboard fallback.

---

## Error and Success Feedback

### Toast and Snackbar
Slide in from edge with icon animation.

- **Trigger**: Action result.
- **Duration**: Enter 300–400 ms, exit 200–300 ms. Auto-dismiss 4–6 s.
- **Easing**: Ease out enter, ease in exit.
- **Accessibility**: Use role="status" or role="alert". Respect reduced motion.

### Inline Validation
Shake or color shift on invalid input.

- **Trigger**: Blur or submit on invalid field.
- **Duration**: 300–500 ms shake, 200 ms color transition.
- **Easing**: Ease in out for shake, ease out for color.
- **Accessibility**: Provide text error message. Do not rely on color alone.

### Success State
Checkmark draw, card highlight, or confetti burst.

- **Trigger**: Completed action.
- **Duration**: 300–600 ms for checkmark, 600–1200 ms for celebration.
- **Easing**: Ease out.
- **Accessibility**: Honor `prefers-reduced-motion` → use instant highlight without decoration.

---

## Scroll-Driven Animations

### Trigger
Element enters or exits viewport.

### Duration
Tied to scroll position rather than clock time. Use 300–600 px of scroll distance for full motion.

### Easing
Map scroll velocity to animation progress. Do not add additional clock-based easing on top of scroll unless intentional.

### Accessibility
- Use `prefers-reduced-motion: reduce` to disable or reduce scroll-driven motion.
- Provide alternative progressive disclosure (static layout) when motion is disabled.

---

## Gesture-Driven Animations

### Trigger
User drag, swipe, pinch, or press.

### Duration
Follow input in real time. Release animation: 200–400 ms to settle or return to origin.

### Easing
- Drag: linear 1:1 mapping.
- Release: spring or ease out for settling.
- Cancel: ease in to origin.

### Accessibility
- Ensure all gesture-triggered actions have non-gesture equivalents (button, keyboard).
- Announce state changes. Do not require precise gesture for essential functionality.
