# Tool Selection Matrix: GSAP vs Framer Motion vs CSS vs Lottie

## GSAP (GreenSock Animation Platform)

### Strengths
- Complex timelines with precise sequencing.
- SVG animation and morphing.
- ScrollTrigger and ScrollSmoother for scroll-driven motion.
- Legacy browser support (IE 11 with compatibility build).
- Robust performance for long-running timelines.

### Trade-offs
- Requires library dependency (~60–100 KB gzipped for core + plugins).
- Imperative API; steeper learning curve for declarative teams.
- Not React-specific; needs manual cleanup in component unmount.

### Use When
- After Effects export is not used but SVG and timeline control is required.
- Scroll-driven storytelling with precise scrubbing.
- Legacy project without React.
- Sequencing many independent animations into one timeline.

---

## Framer Motion

### Strengths
- React-first API with declarative `motion` components.
- Layout animations (`layout` prop) for shared element transitions.
- Gesture-driven interactions (drag, hover, tap, pan).
- Simple spring and duration-based physics.
- `AnimatePresence` for enter/exit transitions.

### Trade-offs
- Tied to React; not usable in vanilla JS or other frameworks.
- Larger bundle size than CSS-only solutions (~40–70 KB gzipped).
- Complex timeline orchestration is possible but less ergonomic than GSAP.

### Use When
- React project needs layout animations and gesture support.
- Shared element transitions between route views.
- Quick prototypes with spring physics.
- Motion design handoff from After Effects is not required.

---

## CSS

### Strengths
- No runtime dependency; smallest bundle impact.
- Hardware-accelerated for `transform` and `opacity`.
- View Transitions API for page navigation without JS libraries.
- Works with progressive enhancement and no-JS fallbacks.

### Trade-offs
- Limited to declarative state-driven motion.
- No timeline sequencing beyond `animation-delay`.
- No built-in gesture or scroll scrubbing (requires JS observers).

### Use When
- Microinteractions and simple transitions.
- No-JS or low-JS projects.
- Performance-sensitive environments (low-end devices).
- Progressive enhancement and accessibility-first interfaces.

---

## Lottie

### Strengths
- Designer-friendly export from After Effects via Bodymovin.
- Cross-platform (web, iOS, Android, React Native).
- Vector-based; resolution independent.
- Reusable across projects and platforms.

### Trade-offs
- JSON payload size; can exceed performance budgets.
- Limited interactivity without wrappers (lottie-web, lottie-react).
- After Effects skills required for production assets.

### Use When
- Complex illustration or branded animation already designed in After Effects.
- Cross-platform consistency is required.
- Designer-led motion handoff is preferred.
- Animation is non-interactive or lightly interactive.

---

## Decision Matrix

| Criterion | GSAP | Framer Motion | CSS | Lottie |
|-----------|------|---------------|-----|--------|
| React integration | Medium | Excellent | Medium | Medium |
| Timeline control | Excellent | Good | Poor | Poor |
| SVG animation | Excellent | Good | Fair | Good |
| Scroll-driven | Excellent | Fair | Fair | Poor |
| Gesture-driven | Good | Excellent | Poor | Poor |
| Bundle impact | Medium | Medium | None | Medium–High |
| Designer handoff | Poor | Poor | Poor | Excellent |
| Legacy support | Excellent | Poor | Excellent | Good |
