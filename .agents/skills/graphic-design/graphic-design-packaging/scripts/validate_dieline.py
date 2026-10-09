#!/usr/bin/env python3
"""
validate_dieline.py

Reads an SVG dieline file and validates:
- Bleed boundary exists (outermost path)
- Cut line exists
- Fold lines exist
- Glue tab markers exist
- Critical content does not overlap safety zones
- Dimensions are reasonable for packaging

Outputs PASS/FAIL with specific issues.
"""

import sys
import xml.etree.ElementTree as ET
from typing import List, Tuple, Optional

# SVG namespace
NS = {"svg": "http://www.w3.org/2000/svg"}


def get_color(element) -> Optional[str]:
    stroke = element.get("stroke")
    if stroke and stroke.startswith("#"):
        return stroke.lower()
    if stroke and stroke.startswith("rgb"):
        return stroke.lower()
    return None


def get_rect_bounds(element) -> Tuple[float, float, float, float]:
    x = float(element.get("x", 0))
    y = float(element.get("y", 0))
    width = float(element.get("width", 0))
    height = float(element.get("height", 0))
    return x, y, width, height


def get_path_bounds(element) -> Tuple[float, float, float, float]:
    """Very rough bounding box from path d attribute."""
    import re
    d = element.get("d", "")
    nums = [float(n) for n in re.findall(r"[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?", d)]
    if len(nums) < 4:
        return 0, 0, 0, 0
    # assume x,y pairs
    xs = nums[0::2]
    ys = nums[1::2]
    return min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys)


def parse_svg(path: str):
    tree = ET.parse(path)
    root = tree.getroot()
    return root


def find_elements_by_color(root, color_hex: str) -> List[ET.Element]:
    results = []
    for elem in root.iter():
        stroke = get_color(elem)
        if stroke == color_hex:
            results.append(elem)
    return results


def find_elements_by_class(root, class_name: str) -> List[ET.Element]:
    results = []
    for elem in root.iter():
        classes = elem.get("class", "")
        if class_name in classes.split():
            results.append(elem)
    return results


def check_bleed(root) -> Tuple[bool, str]:
    """Bleed boundary: magenta (#ff00ff) long-dashed rect or path."""
    elems = find_elements_by_color(root, "#ff00ff")
    if not elems:
        return False, "No bleed boundary found (expected magenta #ff00ff stroke)"
    # verify it is dashed
    for elem in elems:
        dash = elem.get("stroke-dasharray", "")
        if dash and len(dash.split()) >= 2:
            return True, "Bleed boundary found"
    return False, "Bleed boundary element found but stroke-dasharray missing or invalid"


def check_cut_line(root) -> Tuple[bool, str]:
    """Cut line: red (#ff0000) solid rect or path."""
    elems = find_elements_by_color(root, "#ff0000")
    if not elems:
        return False, "No cut line found (expected red #ff0000 stroke)"
    for elem in elems:
        dash = elem.get("stroke-dasharray", "")
        if not dash:
            return True, "Cut line found"
    return False, "Cut line element found but appears to be dashed (expected solid)"


def check_fold_lines(root) -> Tuple[bool, str]:
    """Fold lines: blue (#0066ff) dashed rect or path."""
    elems = find_elements_by_color(root, "#0066ff")
    if not elems:
        return False, "No fold lines found (expected blue #0066ff stroke)"
    for elem in elems:
        dash = elem.get("stroke-dasharray", "")
        if dash:
            return True, "Fold lines found"
    return False, "Fold line elements found but stroke-dasharray missing"


def check_glue_tab(root) -> Tuple[bool, str]:
    """Glue tab: green (#00aa00) solid rect or path."""
    elems = find_elements_by_color(root, "#00aa00")
    if not elems:
        return False, "No glue tab found (expected green #00aa00 stroke)"
    for elem in elems:
        dash = elem.get("stroke-dasharray", "")
        if not dash:
            return True, "Glue tab found"
    return False, "Glue tab element found but appears to be dashed (expected solid)"


def check_safety_zone(root) -> Tuple[bool, str]:
    """Safety zone: orange (#ffaa00) dotted rect or path."""
    elems = find_elements_by_color(root, "#ffaa00")
    if not elems:
        return False, "No safety zone found (expected orange #ffaa00 stroke)"
    for elem in elems:
        dash = elem.get("stroke-dasharray", "")
        if dash:
            return True, "Safety zone found"
    return False, "Safety zone element found but stroke-dasharray missing"


def check_dimensions(root) -> Tuple[bool, str, List[str]]:
    """Validate that the main cut-line dimensions are reasonable."""
    issues = []
    elems = find_elements_by_color(root, "#ff0000")
    if not elems:
        return False, "Cannot check dimensions without cut line", issues

    for elem in elems:
        dash = elem.get("stroke-dasharray", "")
        if dash:
            continue
        if elem.tag.endswith("rect"):
            x, y, w, h = get_rect_bounds(elem)
        elif elem.tag.endswith("path"):
            x, y, w, h = get_path_bounds(elem)
        else:
            continue
        if w < 50 or h < 50:
            issues.append(f"Cut line too small: {w:.1f} x {h:.1f} mm (min 50 x 50 mm)")
        if w > 1200 or h > 1200:
            issues.append(f"Cut line unusually large: {w:.1f} x {h:.1f} mm (max 1200 x 1200 mm)")
        if w < 1 or h < 1:
            issues.append("Cut line has zero or negative dimensions")
        if issues:
            return False, "Dimension issues found", issues
        return True, f"Dimensions OK: {w:.1f} x {h:.1f} mm", issues
    return False, "Could not determine cut-line dimensions", issues


def check_safety_overlap(root) -> Tuple[bool, str]:
    """Check that critical content is not placed inside safety zone.
    This is a heuristic check: ensure no elements have positions inside
    the safety-zone rect bounds if those elements are text or image-heavy.
    """
    safety_elems = find_elements_by_color(root, "#ffaa00")
    if not safety_elems:
        return False, "Cannot check safety overlap without safety zone"

    for se in safety_elems:
        if se.tag.endswith("rect"):
            sx, sy, sw, sh = get_rect_bounds(se)
            break
    else:
        return True, "Safety zone present (overlap heuristic skipped for paths)"

    # Heuristic: look for text elements fully inside safety zone
    issues = []
    for elem in root.iter():
        if elem.tag.endswith("text"):
            x = float(elem.get("x", 0))
            y = float(elem.get("y", 0))
            if sx < x < sx + sw and sy < y < sy + sh:
                issues.append(f"Text at ({x}, {y}) appears inside safety zone")

    if issues:
        return False, "Safety zone overlap detected: " + "; ".join(issues[:3])
    return True, "No obvious safety-zone overlap detected"


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python validate_dieline.py <path-to-dieline.svg>")
        return 2

    svg_path = sys.argv[1]
    try:
        root = parse_svg(svg_path)
    except Exception as exc:
        print(f"FAIL: Could not parse SVG: {exc}")
        return 2

    checks = [
        ("Bleed boundary", check_bleed(root)),
        ("Cut line", check_cut_line(root)),
        ("Fold lines", check_fold_lines(root)),
        ("Glue tab", check_glue_tab(root)),
        ("Safety zone", check_safety_zone(root)),
        ("Dimensions", check_dimensions(root)),
        ("Safety overlap", check_safety_overlap(root)),
    ]

    all_pass = True
    print(f"Validating: {svg_path}\n")
    for name, result in checks:
        if len(result) == 3:
            passed, message, _ = result
        else:
            passed, message = result
        status = "PASS" if passed else "FAIL"
        print(f"[{status}] {name}: {message}")
        if not passed:
            all_pass = False

    print()
    if all_pass:
        print("OVERALL: PASS")
        return 0
    else:
        print("OVERALL: FAIL")
        return 1


if __name__ == "__main__":
    sys.exit(main())
