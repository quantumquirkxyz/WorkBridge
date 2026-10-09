# Design Token Formats Reference

## JSON Format (Style Dictionary)
```json
{
  "color": {
    "brand": {
      "primary": { "value": "#141413" },
      "secondary": { "value": "#6a9bcc" }
    },
    "text": {
      "primary": { "value": "{color.brand.primary.value}" }
    }
  }
}
```

## CSS Custom Properties
```css
:root {
  --color-brand-primary: #141413;
  --color-text-primary: var(--color-brand-primary);
  --spacing-unit: 8px;
}
```

## SCSS Variables
```scss
$color-brand-primary: #141413;
$color-text-primary: $color-brand-primary;
$spacing-unit: 8px;
```

## Figma Variables
- Published via Figma plugin API.
- Supports modes and collections.
- Can be synced to code via MCP or API.

## Token Naming Conventions
- Use kebab-case for token names.
- Use hierarchical namespaces: category.subcategory.property.state.
- Avoid abbreviations unless widely understood.
- Use semantic names over visual descriptions: `color-text-primary` instead of `color-black`.

## Token Transformation
- **Cloning:** copy value from another token.
- **Referencing:** alias another token.
- **Transforming:** apply mathematical transformation (e.g., darken, lighten).

## Platform Considerations
- Web: CSS custom properties or JSON tokens.
- iOS: JSON or SwiftUIColor.
- Android: XML or Jetpack Compose.
- Design tools: Figma variables, Sketch shared styles.
