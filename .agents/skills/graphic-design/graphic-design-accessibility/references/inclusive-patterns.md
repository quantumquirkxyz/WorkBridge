# Inclusive Design Patterns

## Designing for Low Vision

- Support browser zoom up to 200% without horizontal scrolling
- Provide high contrast mode or high contrast CSS alternative
- Ensure text and UI elements scale proportionally
- Use relative units (em, rem) instead of fixed pixels
- Avoid light gray text on white backgrounds
- Provide text alternatives for images conveying information

## Designing for Cognitive Disabilities

- Use simple, clear layouts with ample white space
- Provide consistent navigation and predictable interactions
- Break complex information into small chunks
- Use plain language and avoid jargon
- Provide multiple ways to access information (text, audio, visual)
- Avoid time limits or provide user-controlled timing
- Use visual hierarchy to guide attention

## Designing for Motor Impairments

- Minimum touch target size of 44x44 CSS pixels
- Provide adequate spacing between interactive elements (8px minimum)
- Avoid gestures that require precise timing or movement
- Support keyboard-only navigation
- Provide clickable areas larger than visual elements
- Avoid drag-and-drop as the only interaction method

## Designing for Photosensitive Epilepsy

- Avoid flashing content (more than 3 flashes per second)
- Avoid large areas of rapid contrast changes
- Provide warning before auto-playing animations
- Use `prefers-reduced-motion` media query
- Avoid red flashing (most provocative for photosensitive epilepsy)
- Provide mechanism to pause or stop animations

## Cultural Accessibility and Symbolism

- Avoid culturally specific symbols without explanation
- Provide text alternatives for culturally specific imagery
- Consider right-to-left language support in layouts
- Use universally recognized icons when possible
- Provide localization hooks for text content
- Avoid color associations that vary by culture

## General Principles

- Design for the edges to benefit the center
- Test with users who have disabilities
- Provide multiple means of representation
- Ensure compatibility with assistive technologies
- Follow universal design principles
