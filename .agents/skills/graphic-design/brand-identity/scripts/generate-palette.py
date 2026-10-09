#!/usr/bin/env python3
"""Generate a color palette from a primary hue."""

import math
import sys


def hsl_to_hex(h, s, l):
    """Convert HSL to HEX."""
    c = (1 - abs(2 * l - 1)) * s
    x = c * (1 - abs((h / 60) % 2 - 1))
    m = l - c / 2
    if 0 <= h < 60:
        r, g, b = c, x, 0
    elif 60 <= h < 120:
        r, g, b = x, c, 0
    elif 120 <= h < 180:
        r, g, b = 0, c, x
    elif 180 <= h < 240:
        r, g, b = 0, x, c
    elif 240 <= h < 300:
        r, g, b = x, 0, c
    else:
        r, g, b = c, 0, x
    r = int((r + m) * 255)
    g = int((g + m) * 255)
    b = int((b + m) * 255)
    return f"#{r:02x}{g:02x}{b:02x}"


def generate_palette(base_hue):
    """Generate a 5-color palette from a base hue."""
    palette = []
    for i in range(5):
        hue = (base_hue + i * 30) % 360
        saturation = 0.6
        lightness = 0.9 - (i * 0.15)
        palette.append(hsl_to_hex(hue, saturation, lightness))
    return palette


def main():
    if len(sys.argv) != 2:
        print("Usage: generate-palette.py <base_hue_0-360>")
        print("Example: generate-palette.py 210")
        sys.exit(1)
    base_hue = int(sys.argv[1])
    palette = generate_palette(base_hue)
    print("Generated palette:")
    for i, color in enumerate(palette):
        print(f"  {i+1}. {color}")
    print("\nHEX values:")
    print(", ".join(palette))


if __name__ == "__main__":
    main()
