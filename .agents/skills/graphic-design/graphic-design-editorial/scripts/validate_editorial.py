#!/usr/bin/env python3
"""Validate an HTML editorial template for layout and accessibility rules."""

import re
import sys
from pathlib import Path


def load_html(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def check_heading_hierarchy(html: str) -> list[str]:
    issues = []
    headings = re.findall(r"<h([1-6])", html)
    prev = 0
    for level in headings:
        lvl = int(level)
        if lvl > prev + 1 and prev != 0:
            issues.append(f"Heading level skipped: h{prev} to h{lvl}")
        prev = lvl
    return issues


def check_font_scale_consistency(html: str) -> list[str]:
    issues = []
    sizes = sorted(set(re.findall(r"font-size:\s*([0-9]+(?:\.[0-9]+)?)(pt|px|rem|em)", html)))
    if not sizes:
        issues.append("No font-size declarations found")
        return issues
    # Editorial templates legitimately use many sizes; flag only extreme cases
    if len(sizes) > 14:
        issues.append(f"Excessive font-size variety ({len(sizes)}); consider tighter modular scale")
    return issues


def check_line_length(html: str) -> list[str]:
    issues = []
    # Check paragraph text blocks for excessive word count per paragraph
    paragraphs = re.findall(r"<p[^>]*>(.*?)</p>", html, re.DOTALL)
    for p in paragraphs:
        text = re.sub(r"<[^>]+>", "", p).strip()
        words = text.split()
        if len(words) > 120:
            issues.append(
                f"Paragraph too long ({len(words)} words); target shorter blocks for readability"
            )
    return issues


def check_image_alt(html: str) -> list[str]:
    issues = []
    images = re.findall(r"<img[^>]*>", html)
    if not images:
        return issues
    for img in images:
        if "alt=" not in img:
            issues.append("Image missing alt attribute")
        elif re.search(r"alt\s*=\s*['\"][^'\"]*['\"]", img):
            pass
        else:
            issues.append("Image alt attribute malformed")
    return issues


def check_color_contrast(html: str) -> list[str]:
    issues = []
    # Extract inline color declarations (rudimentary)
    colors = re.findall(r"color:\s*#([0-9a-fA-F]{6})", html)
    backgrounds = re.findall(r"background(?:-color)?:\s*(?:#([0-9a-fA-F]{6})|rgba?\([^)]+\)|transparent)", html)
    # Note: full WCAG contrast requires luminance math; this is a placeholder pass
    if colors and not backgrounds:
        issues.append("Text colors declared without explicit backgrounds; verify contrast")
    return issues


def validate(path: str) -> bool:
    html = load_html(path)
    all_issues: list[str] = []
    all_issues.extend(check_heading_hierarchy(html))
    all_issues.extend(check_font_scale_consistency(html))
    all_issues.extend(check_line_length(html))
    all_issues.extend(check_image_alt(html))
    all_issues.extend(check_color_contrast(html))

    if all_issues:
        print(f"FAIL: {path}")
        for issue in all_issues:
            print(f"  - {issue}")
        return False
    print(f"PASS: {path}")
    return True


if __name__ == "__main__":
    files = sys.argv[1:] if len(sys.argv) > 1 else [
        "assets/editorial-templates/magazine-spread.html",
        "assets/editorial-templates/book-chapter.html",
    ]
    base = Path(__file__).resolve().parent.parent
    results = [validate(str(base / f)) for f in files]
    sys.exit(0 if all(results) else 1)
