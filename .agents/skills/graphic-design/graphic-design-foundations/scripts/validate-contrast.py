#!/usr/bin/env python3
"""Validate color contrast ratios against WCAG 2.2."""

import math
import sys


def relative_luminance(r, g, b):
    """Calculate relative luminance per WCAG 2.2."""
    def channel(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)


def contrast_ratio(hex1, hex2):
    """Calculate contrast ratio between two hex colors."""
    def hex_to_rgb(hex_color):
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    rgb1 = hex_to_rgb(hex1)
    rgb2 = hex_to_rgb(hex2)
    l1 = relative_luminance(*rgb1)
    l2 = relative_luminance(*rgb2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


def wcag_level(ratio, is_large_text=False):
    """Return WCAG compliance level."""
    if is_large_text:
        if ratio >= 3:
            return "AA"
        return "Fail"
    else:
        if ratio >= 4.5:
            return "AA"
        if ratio >= 3:
            return "AA Large"
        return "Fail"


def main():
    if len(sys.argv) != 3:
        print("Usage: validate-contrast.py <foreground_hex> <background_hex>")
        print("Example: validate-contrast.py #141413 #faf9f5")
        sys.exit(1)
    fg = sys.argv[1]
    bg = sys.argv[2]
    ratio = contrast_ratio(fg, bg)
    print(f"Contrast ratio: {ratio:.2f}:1")
    print(f"Normal text: {wcag_level(ratio, False)}")
    print(f"Large text: {wcag_level(ratio, True)}")
    if ratio < 4.5:
        print("WARNING: Does not meet WCAG 2.2 AA for normal text")
        sys.exit(1)
    print("OK: Meets WCAG 2.2 AA for normal text")


if __name__ == "__main__":
    main()
