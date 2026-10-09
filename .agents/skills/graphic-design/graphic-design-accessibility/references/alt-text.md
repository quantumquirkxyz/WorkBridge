# Alternative Text and Descriptions

## Effective Alt Text for Images

- Convey the purpose and content of the image, not a literal description
- Keep alt text concise (125 characters or fewer for simple images)
- Leave alt text empty (`alt=""`) for decorative images
- Avoid phrases like "image of" or "picture of"
- Include text that appears in the image if it is meaningful

## Long Descriptions for Complex Visuals

- Use adjacent text or a details/summary element for lengthy descriptions
- Describe trends, comparisons, and key data points for charts
- Include axis labels, units, and data values in description
- Describe spatial relationships and layout for infographics

## Text Alternatives for Non-Text Content

- Provide text transcript for audio and video content
- Describe the content and function of icons and symbols
- Include meaningful labels for SVG icons and diagrams
- Provide data tables as text alternatives for complex charts

## ARIA Labels for Interactive Graphics

- Use `aria-label` or `aria-labelledby` for interactive SVG elements
- Provide role attributes (button, link, slider) for interactive graphics
- Use `aria-describedby` to link to detailed instructions
- Ensure all interactive elements are focusable and keyboard operable

## Caption and Transcript Best Practices

- Synchronized captions for video content (99% accuracy minimum)
- Transcripts for audio-only content
- Describe relevant sound effects and speaker identification
- Provide transcripts for podcasts and audio descriptions

## Best Practices

- Test alt text with screen readers (NVDA, VoiceOver, JAWS)
- Ensure alt text adds information not already in surrounding text
- Update alt text when image content changes
- Provide multiple formats when possible (text, audio, visual)
