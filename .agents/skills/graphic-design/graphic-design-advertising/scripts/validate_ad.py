#!/usr/bin/env python3
"""
validate_ad.py

Validates an HTML ad template against format dimensions, CTA presence,
WCAG AA contrast, logo placement, and estimated file size limits.
"""

import re
import sys
from pathlib import Path


class AdValidator:
    def __init__(self, html: str, expected_format: str):
        self.html = html
        self.expected_format = expected_format.lower()
        self.issues = []
        self.lower = html.lower()

    def validate(self) -> bool:
        self.check_dimensions()
        self.check_cta()
        self.check_contrast()
        self.check_logo()
        self.check_file_size_estimate()
        return len(self.issues) == 0

    def check_dimensions(self):
        width_match = re.search(r'(?:width|\.creative|#ad|\.banner)\s*[:=]\s*(\d+)\s*px', self.lower)
        height_match = re.search(r'(?:height|\.creative|#ad|\.banner)\s*[:=]\s*(\d+)\s*px', self.lower)
        if not width_match or not height_match:
            self.issues.append("FAIL: Could not parse width/height from HTML/CSS.")
            return
        width = int(width_match.group(1))
        height = int(height_match.group(1))
        allowed = {
            "social-post": (1080, 1080),
            "display-ad": (728, 90),
            "email-banner": (600, 200),
        }
        expected = allowed.get(self.expected_format)
        if expected and (width, height) != expected:
            self.issues.append(
                f"FAIL: Dimensions {width}x{height} do not match expected {expected[0]}x{expected[1]} for format '{self.expected_format}'."
            )

    def check_cta(self):
        if "cta-button" not in self.lower and "cta" not in self.lower:
            self.issues.append("FAIL: No CTA button class or CTA element found.")
        if re.search(r'<a[^>]*class="[^"]*cta[^"]*"', self.lower) is None and "cta-button" not in self.lower:
            self.issues.append("FAIL: CTA button element appears missing or misnamed.")

    def check_contrast(self):
        style_match = re.search(r'<style[^>]*>(.*?)</style>', self.lower, re.DOTALL)
        if not style_match:
            self.issues.append("WARN: No <style> block found for contrast check.")
            return
        css = style_match.group(1)

        bg_hex = None
        text_hex = None

        # Prefer hero text on hero background
        hero_bg = re.search(r'\.hero\s*\{([^{}]+)\}', css, re.DOTALL)
        hero_text = re.search(r'\.hero-text\s*\{([^{}]+)\}', css, re.DOTALL)
        if hero_bg and hero_text:
            bg_m = re.search(r'background[^:]*:\s*(#[0-9a-f]{3,6})', hero_bg.group(1))
            color_m = re.search(r'color\s*:\s*(#[0-9a-f]{3,6})', hero_text.group(1))
            if bg_m and color_m:
                bg_hex = bg_m.group(1)
                text_hex = color_m.group(1)

        # Fallback: headline on ad/container background
        if not bg_hex or not text_hex:
            container = re.search(r'(?:\.ad|\.creative|\.banner)\s*\{([^{}]+)\}', css, re.DOTALL)
            headline = re.search(r'\.headline\s*\{([^{}]+)\}', css, re.DOTALL)
            if container and headline:
                bg_m = re.search(r'background[^:]*:\s*(#[0-9a-f]{3,6})', container.group(1))
                color_m = re.search(r'color\s*:\s*(#[0-9a-f]{3,6})', headline.group(1))
                if bg_m and color_m:
                    bg_hex = bg_m.group(1)
                    text_hex = color_m.group(1)

        # Fallback: CTA button background and text color
        if not bg_hex or not text_hex:
            cta = re.search(r'\.cta-button\s*\{([^{}]+)\}', css, re.DOTALL)
            if cta:
                bg_m = re.search(r'background[^:]*:\s*(#[0-9a-f]{3,6})', cta.group(1))
                color_m = re.search(r'color\s*:\s*(#[0-9a-f]{3,6})', cta.group(1))
                if bg_m and color_m:
                    bg_hex = bg_m.group(1)
                    text_hex = color_m.group(1)

        if not bg_hex or not text_hex:
            self.issues.append("WARN: Could not extract background/text color for contrast check.")
            return
        bg_rgb = self._hex_to_rgb(bg_hex)
        text_rgb = self._hex_to_rgb(text_hex)
        if not bg_rgb or not text_rgb:
            self.issues.append("WARN: Invalid color format for contrast check.")
            return
        ratio = self._contrast_ratio(bg_rgb, text_rgb)
        if ratio < 4.5:
            self.issues.append(
                f"FAIL: WCAG AA contrast ratio is {ratio:.2f}:1 (minimum 4.5:1)."
            )

    def check_logo(self):
        if "logo" not in self.lower:
            self.issues.append("FAIL: No logo placeholder found in template.")

    def check_file_size_estimate(self):
        size_kb = len(self.html.encode("utf-8")) / 1024
        limits = {
            "social-post": 8500,  # KB
            "display-ad": 150,
            "email-banner": 200,
        }
        limit = limits.get(self.expected_format, 1000)
        if size_kb > limit:
            self.issues.append(
                f"FAIL: Estimated file size {size_kb:.1f} KB exceeds platform limit {limit} KB."
            )

    @staticmethod
    def _hex_to_rgb(hex_color):
        hex_color = hex_color.lstrip("#")
        if len(hex_color) == 3:
            hex_color = "".join([c * 2 for c in hex_color])
        if len(hex_color) != 6:
            return None
        try:
            return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
        except ValueError:
            return None

    @staticmethod
    def _luminance(rgb):
        r, g, b = [x / 255.0 for x in rgb]
        def _f(c):
            return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
        return 0.2126 * _f(r) + 0.7152 * _f(g) + 0.0722 * _f(b)

    @classmethod
    def _contrast_ratio(cls, rgb1, rgb2):
        l1 = cls._luminance(rgb1)
        l2 = cls._luminance(rgb2)
        lighter = max(l1, l2)
        darker = min(l1, l2)
        if darker == 0:
            return float("inf")
        return (lighter + 0.05) / (darker + 0.05)


def main():
    if len(sys.argv) < 3:
        print("Usage: python validate_ad.py <html_file> <format_name>")
        print("Formats: social-post, display-ad, email-banner")
        sys.exit(1)

    html_path = Path(sys.argv[1])
    expected_format = sys.argv[2]
    if not html_path.exists():
        print(f"FAIL: File not found: {html_path}")
        sys.exit(1)

    html = html_path.read_text(encoding="utf-8")
    validator = AdValidator(html, expected_format)
    passed = validator.validate()

    if passed:
        print("PASS: All checks passed.")
        sys.exit(0)
    else:
        print("FAIL:")
        for issue in validator.issues:
            print(f"  - {issue}")
        sys.exit(1)


if __name__ == "__main__":
    main()
