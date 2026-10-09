# Design System Visual Domain Reference

## Core Concepts
- **Design token:** named entity that stores visual design attributes.
- **Global token:** raw value independent of context.
- **Alias token:** semantic name linked to a global token.
- **Component token:** token scoped to a specific component or pattern.
- **Theme:** collection of token values applied to a product or brand.
- **Mode:** variation of a theme, such as light mode or dark mode.

## Token Categories
- **Color:** backgrounds, text, borders, accents, semantic states.
- **Typography:** font family, size, weight, line height, letter spacing.
- **Spacing:** margins, padding, gaps, and layout distances.
- **Elevation:** shadows, z-index layers, and surface hierarchy.
- **Motion:** duration, easing, and transition definitions.
- **Sizing:** width, height, and aspect ratio constraints.
- **Border:** radius, width, and style definitions.

## Component States
- **Default:** resting state.
- **Hover:** pointer over interactive element.
- **Focus:** keyboard focus indicator visible.
- **Active:** element being pressed or activated.
- **Disabled:** element not available for interaction.
- **Error:** validation or failure state.
- **Loading:** async operation in progress.
- **Empty:** no content available.

## Component Anatomy
- **Container:** outer wrapper with layout and spacing.
- **Header:** title, actions, and metadata.
- **Body:** primary content area.
- **Footer:** secondary actions and metadata.
- **Icon:** symbolic indicator.
- **Badge:** status or count indicator.

## Accessibility Mappings
- **Color:** contrast ratio requirements per WCAG 2.2.
- **Typography:** minimum size, line height, and line length.
- **Focus:** visible focus indicator with sufficient contrast.
- **Motion:** reduced motion alternative for animations.

## Channel Adaptations
- **Web:** responsive tokens, hover states, focus management.
- **Mobile:** touch target sizes, platform conventions, safe areas.
- **Print:** static values, CMYK conversion, no interaction states.
- **Outdoor:** simplified palette, large type, high contrast.
