# Motion Principles

## Disney Animation Principles

Apply these twelve principles selectively to UI motion. Not every animation needs all of them; use them as a vocabulary rather than a checklist.

### Squash and Stretch
Give animated objects a sense of weight and flexibility. A button press can squash slightly on Y and stretch on X to feel physical. Keep volume illusion consistent (if an object squashes to 80% height, stretch to 125% width).

### Anticipation
Prepare the audience for an action. Before a card expands, it may contract 10–20% and pause for 50–100 ms. Anticipation typically uses 10–20% of the total animation duration.

### Follow-Through and Overlapping Action
Not everything stops at once. Leading elements stop first; trailing elements ease out later with a 50–150 ms delay. Use separate easing curves per element rather than a single timeline delay.

### Arcs
Natural motion follows arcs rather than straight lines. For modal and drawer transitions, prefer curved transforms (e.g., cubic-bezier paths) over linear interpolation.

### Slow In and Slow Out
Ease into and out of motion. Use cubic-bezier curves with asymmetrical control points rather than linear timing.

### Timing and Spacing
Control speed and weight through frame count or duration. Use the table below as a starting point:

| Weight | Duration (ms) | Use Case |
|--------|---------------|----------|
| Feather | 80–150 | Microfeedback (icon, toggle) |
| Light | 150–250 | Button, link, tooltip |
| Medium | 250–400 | Card expand, modal enter |
| Heavy | 400–600 | Page transition, drawer |

### Exaggeration
Push motion further than real life to communicate clearly. Use exaggeration for success states and errors, not for microinteractions.

### Secondary Action
Support the main action with a subtle secondary motion. A submit button might trigger a subtle icon pulse after the primary scale feedback.

### Timing Beats and BPM Mapping
Map motion to musical tempo when appropriate:

- 60 BPM → 1000 ms per beat
- 120 BPM → 500 ms per beat
- 140 BPM → 429 ms per beat

Use beat-aligned timing for branded animations and loading sequences. For UI microinteractions, stay within 150–400 ms regardless of BPM.

## Easing Curves

### Cubic Bezier
Standard CSS `cubic-bezier(x1, y1, x2, y2)` syntax. Control points must be in [0, 1] for standard easing.

| Curve | Values | Feel |
|-------|--------|------|
| Ease out | `cubic-bezier(0.16, 1, 0.3, 1)` | Decelerates; good for entrances |
| Ease in | `cubic-bezier(0.7, 0, 0.84, 0)` | Accelerates; good for exits |
| Ease in out | `cubic-bezier(0.65, 0, 0.35, 1)` | Symmetric; good for state changes |
| Sharp | `cubic-bezier(0.4, 0, 0.2, 1)` | Material-style deceleration |

### Step
Discrete jumps with no interpolation. Use for discrete state changes (tabs, stepper) where smooth motion would imply continuity that does not exist.

### Bounce / Elastic
Overshoot and settle. Use only for playful microinteractions and branded moments. Avoid in data-dense interfaces.

## Choreography Principles

### Stagger
Introduce sequential delay per element. Typical stagger interval: 30–80 ms. More than 200 ms total stagger feels sluggish.

### Overlap
Allow motion phases to intersect rather than sequence strictly. Use overlapping motion for related elements in a group (list items, form fields).

### Contrast
Vary speed and distance to direct attention. Fast, close motion attracts attention; slow, long motion implies background. Use contrast to separate primary actions from secondary actions.

### Sequencing
Choose serial or parallel choreography based on dependency:
- **Serial**: Elements animate one after another (wizard steps).
- **Parallel**: Elements animate together (button group, icon set).
- **Leader–Follower**: A primary element moves, secondary elements follow with offset.

## Performance Budgets

### Frame Budget
Target 60 fps → 16.67 ms per frame. Aim for animation work to complete within 8–10 ms to leave headroom for layout and paint.

### Main-Thread Work
Keep JavaScript animation work under 4 ms per frame. Prefer CSS transforms and opacity for GPU acceleration. Avoid animating width, height, top, left, or margin.

### GPU Acceleration
Use `transform` and `opacity` exclusively for animated properties. These can run on the compositor thread without main-thread involvement.

### Memory
Lottie animations should target:
- UI icons: < 100 KB JSON
- Illustrations: < 500 KB JSON
- Complex scenes: < 2 MB JSON

Avoid embedding raster images in Lottie unless absolutely necessary. Prefer vector shapes.
