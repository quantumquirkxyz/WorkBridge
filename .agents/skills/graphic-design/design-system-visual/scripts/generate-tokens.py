#!/usr/bin/env python3
"""Generate a minimal design-token JSON skeleton from a brand palette."""

import json
import sys


def generate_tokens(primary, secondary, accent, neutral):
    """Generate a token structure from color values."""
    return {
        "color": {
            "brand": {
                "primary": {"value": primary},
                "secondary": {"value": secondary},
                "accent": {"value": accent}
            },
            "neutral": {
                "value": neutral
            },
            "text": {
                "primary": {"value": primary},
                "secondary": {"value": secondary},
                "inverse": {"value": "#ffffff" if primary != "#ffffff" else primary}
            },
            "background": {
                "default": {"value": "#ffffff"},
                "inverse": {"value": primary}
            }
        },
        "spacing": {
            "unit": {"value": "8px"},
            "xs": {"value": "4px"},
            "sm": {"value": "8px"},
            "md": {"value": "16px"},
            "lg": {"value": "24px"},
            "xl": {"value": "32px"}
        },
        "typography": {
            "fontFamily": {
                "display": {"value": "system-ui, sans-serif"},
                "body": {"value": "system-ui, sans-serif"}
            },
            "fontSize": {
                "xs": {"value": "12px"},
                "sm": {"value": "14px"},
                "md": {"value": "16px"},
                "lg": {"value": "18px"},
                "xl": {"value": "24px"},
                "display": {"value": "32px"}
            }
        }
    }


def main():
    if len(sys.argv) != 5:
        print("Usage: generate-tokens.py <primary_hex> <secondary_hex> <accent_hex> <neutral_hex>")
        print("Example: generate-tokens.py #141413 #6a9bcc #d97757 #faf9f5")
        sys.exit(1)
    primary = sys.argv[1]
    secondary = sys.argv[2]
    accent = sys.argv[3]
    neutral = sys.argv[4]
    tokens = generate_tokens(primary, secondary, accent, neutral)
    print(json.dumps(tokens, indent=2))


if __name__ == "__main__":
    main()
