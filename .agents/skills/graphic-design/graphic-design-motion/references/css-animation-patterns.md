# CSS Animation Patterns

## @keyframes Structure

Use descriptive names and animate only `transform` and `opacity` for performance.

```css
@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

Guidelines:
- Prefer `transform: translate3d(...)` or `translate(...)` over positional properties.
- Animate `opacity` rather than `visibility` or `display`.
- Avoid animating `width`, `height`, `margin`, `padding`, `top`, `left`, `right`, `bottom`.

## transition vs animation

### transition
Use for state changes with known start and end values.

```css
.button {
  transition: transform 150ms cubic-bezier(0.16, 1, 0.3, 1),
              background-color 200ms ease;
}
.button:active {
  transform: scale(0.96);
}
```

Guidelines:
- Define transitions on the base state, not the active state.
- List the longest-duration property first for readability.

### animation
Use for keyframe sequences, loops, or chained effects.

```css
.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

Guidelines:
- Use `animation-fill-mode: forwards` for one-shot enter animations.
- Use `animation-play-state: paused` to pause without removing.

## View Transitions API

Use `document.startViewTransition()` for page navigation animations in supported browsers.

```js
document.startViewTransition(() => {
  // Update DOM
  updateContent();
});
```

Pair with CSS:

```css
::view-transition-old(root) {
  animation: fade-out 200ms ease-out forwards;
}
::view-transition-new(root) {
  animation: fade-in 300ms ease-out forwards;
}
```

Guidelines:
- Provide fallback for browsers without View Transitions.
- Use named view transitions for shared-element motion.
- Avoid animating large images in view transitions; use low-res placeholders or CSS-only effects.

## Intersection Observer for Scroll-Triggered Animations

Use `IntersectionObserver` to add classes when elements enter the viewport.

```js
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
```

Pair with CSS:

```css
.animate-on-scroll {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 400ms ease-out, transform 400ms ease-out;
}
.animate-on-scroll.in-view {
  opacity: 1;
  transform: translateY(0);
}
```

Guidelines:
- Use `threshold` between 0.1 and 0.3 for early trigger.
- Unobserve after animation to avoid retrigger.
- Provide instant reveal fallback for `prefers-reduced-motion`.

## Performance Properties

### transform and opacity
Animatable on the compositor thread without paint or layout.

```css
.element {
  will-change: transform, opacity;
}
```

Use `will-change` sparingly and only on elements actively animating. Remove after animation completes.

### containment
Use CSS containment to isolate animated elements.

```css
.animated-card {
  contain: layout style paint;
}
```

Guidelines:
- Prefer `contain: layout style paint` for cards, modals, and drawers.
- Do not use containment on elements that rely on inherited sizing or overflow.

### prefers-reduced-motion
Respect user motion preferences globally.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Guidelines:
- Provide reduced-motion styles in a single media query block.
- Ensure functionality remains intact when motion is removed.
- Use reduced motion to test whether animation conveys essential information.
