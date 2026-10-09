#!/usr/bin/env python3
"""
validate_chart.py — Automated validation for self-contained data visualization HTML/SVG artifacts.

Checks:
1. Contrast ratios (text vs background, data marks vs background)
2. No empty or missing labels
3. SVG has proper viewBox and accessible title/desc
4. Interactive elements have aria-labels

Outputs: PASS/FAIL with specific issues found.
"""

import argparse
import re
import sys
from html.parser import HTMLParser
from pathlib import Path


# ---------------------------------------------------------------------------
# Color utilities
# ---------------------------------------------------------------------------

def _hex_to_rgb(hex_str: str):
    hex_str = hex_str.strip().lstrip("#")
    if len(hex_str) == 3:
        hex_str = "".join(c * 2 for c in hex_str)
    try:
        r = int(hex_str[0:2], 16)
        g = int(hex_str[2:4], 16)
        b = int(hex_str[4:6], 16)
        return r, g, b
    except ValueError:
        return None


def _luminance(rgb):
    r, g, b = rgb
    r /= 255
    g /= 255
    b /= 255
    r = r / 12.92 if r <= 0.03928 else ((r + 0.055) / 1.055) ** 2.4
    g = g / 12.92 if g <= 0.03928 else ((g + 0.055) / 1.055) ** 2.4
    b = b / 12.92 if b <= 0.03928 else ((b + 0.055) / 1.055) ** 2.4
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def _contrast_ratio(hex1: str, hex2: str) -> float:
    rgb1 = _hex_to_rgb(hex1)
    rgb2 = _hex_to_rgb(hex2)
    if not rgb1 or not rgb2:
        return 0.0
    l1 = _luminance(rgb1)
    l2 = _luminance(rgb2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    if darker == 0:
        return 21.0
    return (lighter + 0.05) / (darker + 0.05)


# ---------------------------------------------------------------------------
# HTML parser for validation
# ---------------------------------------------------------------------------

class ChartValidator(HTMLParser):
    def __init__(self, file_path: str):
        super().__init__()
        self.file_path = file_path
        self.issues = []
        self.warnings = []

        self._in_svg = False
        self._svg_depth = 0
        self._svg_has_viewbox = False
        self._svg_has_title = False
        self._svg_has_desc = False
        self._text_elements = []
        self._data_marks = []
        self._in_style = False
        self._style_content = ""
        self._css_vars = {}
        self._in_defs = False

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _get_attr(self, attrs, key, default=None):
        """Get attribute value. attrs can be a list of (key, value) tuples or a dict."""
        if isinstance(attrs, dict):
            for k, v in attrs.items():
                if k.lower() == key.lower():
                    return v
            return default
        for k, v in attrs:
            if k.lower() == key.lower():
                return v
        return default

    def _add_issue(self, message: str):
        self.issues.append(f"[FAIL] {message}")

    def _add_warning(self, message: str):
        self.warnings.append(f"[WARN] {message}")

    def _extract_colors_from_style(self, style_content: str):
        colors = {}
        for match in re.finditer(r"--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})", style_content):
            colors[match.group(1)] = match.group(2)
        return colors

    def _get_background_color(self, attrs, style_content: str) -> str:
        inline_style = self._get_attr(attrs, "style", "")
        if inline_style:
            for match in re.finditer(r"background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,8})", inline_style):
                return match.group(1)
        css_colors = self._extract_colors_from_style(style_content)
        if "bg" in css_colors:
            return css_colors["bg"]
        if "background" in css_colors:
            return css_colors["background"]
        return "#ffffff"

    def _get_text_color(self, attrs, style_content: str) -> str:
        inline_style = self._get_attr(attrs, "style", "")
        if inline_style:
            for match in re.finditer(r"color\s*:\s*(#[0-9a-fA-F]{3,8})", inline_style):
                return match.group(1)
        css_colors = self._extract_colors_from_style(style_content)
        if "text" in css_colors:
            return css_colors["text"]
        return "#1a1a2e"

    def _is_decorative(self, attrs) -> bool:
        return self._get_attr(attrs, "aria-hidden") == "true"

    # ------------------------------------------------------------------
    # HTMLParser overrides
    # ------------------------------------------------------------------

    def handle_starttag(self, tag, attrs):
        if tag == "defs":
            self._in_defs = True
            return

        if tag == "svg":
            self._in_svg = True
            self._svg_depth += 1
            viewbox = self._get_attr(attrs, "viewBox")
            if viewbox:
                self._svg_has_viewbox = True
            else:
                self._add_issue("SVG is missing a viewBox attribute.")
            title_ref = self._get_attr(attrs, "aria-labelledby")
            if title_ref:
                self._svg_has_title = True
            else:
                self._add_issue("SVG is missing an accessible title (use aria-labelledby or <title>).")

        elif tag == "title" and self._in_svg:
            self._svg_has_title = True

        elif tag == "desc" and self._in_svg:
            self._svg_has_desc = True

        elif tag in ("button", "a", "input", "select", "textarea"):
            aria_label = self._get_attr(attrs, "aria-label")
            if not aria_label:
                self._add_issue(f"Interactive element <{tag}> is missing an aria-label.")

        elif self._in_svg and not self._in_defs and not self._is_decorative(attrs):
            if tag == "rect":
                self._data_marks.append({"type": "rect", "attrs": dict(attrs) if isinstance(attrs, list) else attrs})
            elif tag == "circle":
                self._data_marks.append({"type": "circle", "attrs": dict(attrs) if isinstance(attrs, list) else attrs})
            elif tag == "path":
                self._data_marks.append({"type": "path", "attrs": dict(attrs) if isinstance(attrs, list) else attrs})
            elif tag == "polyline":
                self._data_marks.append({"type": "polyline", "attrs": dict(attrs) if isinstance(attrs, list) else attrs})

        elif tag == "text":
            self._text_elements.append({"attrs": dict(attrs) if isinstance(attrs, list) else attrs})

        elif tag == "style":
            self._in_style = True

    def handle_endtag(self, tag):
        if tag == "defs":
            self._in_defs = False
            return
        if tag == "svg":
            self._svg_depth -= 1
            if self._svg_depth <= 0:
                self._in_svg = False
                self._svg_depth = 0
        if tag == "style":
            self._in_style = False
            css_colors = self._extract_colors_from_style(self._style_content)
            self._css_vars.update(css_colors)
            self._style_content = ""

    def handle_data(self, data):
        if self._in_style:
            self._style_content += data

    def handle_startendtag(self, tag, attrs):
        if tag == "defs":
            self._in_defs = True
            css_colors = self._extract_colors_from_style(data if isinstance(data, str) else "")
            self._css_vars.update(css_colors)
            return

        if tag == "svg":
            self._in_svg = True
            viewbox = self._get_attr(attrs, "viewBox")
            if viewbox:
                self._svg_has_viewbox = True
            else:
                self._add_issue("SVG is missing a viewBox attribute.")
            title_ref = self._get_attr(attrs, "aria-labelledby")
            if title_ref:
                self._svg_has_title = True
            else:
                self._add_issue("SVG is missing an accessible title (use aria-labelledby or <title>).")
        elif tag in ("button", "a", "input", "select", "textarea"):
            aria_label = self._get_attr(attrs, "aria-label")
            if not aria_label:
                self._add_issue(f"Interactive element <{tag}> is missing an aria-label.")
        elif self._in_svg and not self._in_defs and not self._is_decorative(attrs):
            if tag == "rect":
                self._data_marks.append({"type": "rect", "attrs": dict(attrs) if isinstance(attrs, list) else attrs})
            elif tag == "circle":
                self._data_marks.append({"type": "circle", "attrs": dict(attrs) if isinstance(attrs, list) else attrs})
            elif tag == "path":
                self._data_marks.append({"type": "path", "attrs": dict(attrs) if isinstance(attrs, list) else attrs})
            elif tag == "polyline":
                self._data_marks.append({"type": "polyline", "attrs": dict(attrs) if isinstance(attrs, list) else attrs})
        elif tag == "text":
            self._text_elements.append({"attrs": dict(attrs) if isinstance(attrs, list) else attrs})
        elif tag == "style":
            self._in_style = True
            css_colors = self._extract_colors_from_style(data if isinstance(data, str) else "")
            self._css_vars.update(css_colors)
            self._in_style = False

    # ------------------------------------------------------------------
    # Validation methods
    # ------------------------------------------------------------------

    def validate_labels(self):
        for mark in self._data_marks:
            attrs = mark.get("attrs", {})
            if self._is_decorative(attrs):
                continue
            has_title = self._get_attr(attrs, "title") is not None
            has_aria_label = self._get_attr(attrs, "aria-label") is not None
            if not has_title and not has_aria_label:
                self._add_issue(
                    f"Data mark <{mark['type']}> is missing an accessible label (use <title> or aria-label)."
                )

    def validate_contrast(self):
        style_block = self._style_content
        for text_item in self._text_elements:
            attrs = text_item.get("attrs", {})
            bg_color = self._get_background_color(attrs, style_block)
            text_color = self._get_text_color(attrs, style_block)
            ratio = _contrast_ratio(text_color, bg_color)
            if ratio < 4.5:
                self._add_issue(
                    f"Text contrast ratio is {ratio:.2f}:1 (below 4.5:1 minimum). "
                    f"Text color: {text_color}, background: {bg_color}."
                )

    def validate_svg_structure(self):
        if not self._svg_has_title:
            self._add_issue("SVG is missing a <title> element or aria-labelledby reference.")
        if not self._svg_has_desc:
            self._warnings.append("[WARN] SVG is missing a <desc> element for long description.")

    def run(self) -> bool:
        self.validate_svg_structure()
        self.validate_labels()
        self.validate_contrast()

        passed = len(self.issues) == 0
        if passed:
            print("PASS")
        else:
            print("FAIL")
            for issue in self.issues:
                print(issue)

        if self.warnings:
            for warning in self.warnings:
                print(warning)

        return passed


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Validate a data visualization HTML/SVG artifact for accessibility and structure."
    )
    parser.add_argument("file", type=str, help="Path to the HTML/SVG artifact to validate.")
    args = parser.parse_args()

    file_path = Path(args.file)
    if not file_path.exists():
        print(f"[FAIL] File not found: {file_path}")
        sys.exit(1)

    content = file_path.read_text(encoding="utf-8")
    validator = ChartValidator(str(file_path))
    try:
        validator.feed(content)
        success = validator.run()
    except Exception as e:
        print(f"[FAIL] Parsing error: {e}")
        sys.exit(1)

    sys.exit(0 if success else 2)


if __name__ == "__main__":
    main()
