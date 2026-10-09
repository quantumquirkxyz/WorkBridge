#!/usr/bin/env python3
"""
validate_image.py

Validates an image file against print or web requirements.

Checks:
- Resolution (minimum 300 PPI for print, 72 PPI for web)
- Color mode (RGB for web, CMYK for print)
- File format suitability (TIFF/PNG for print, JPEG/WebP for web)
- File size within reasonable bounds

Usage:
    python validate_image.py <image_path> [--print|--web]

Exit code is 0 for PASS, 1 for FAIL.
"""

import argparse
import os
import sys

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

FORMAT_PRINT = {"print", "tiff", "png"}
FORMAT_WEB = {"web", "jpeg", "jpg", "webp"}

PRINT_MIN_PPI = 300
WEB_MIN_PPI = 72

MAX_FILE_SIZE_MB = 100
MIN_FILE_SIZE_KB = 1


def parse_args():
    parser = argparse.ArgumentParser(description="Validate an image for print or web use.")
    parser.add_argument("image_path", help="Path to the image file")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--print", action="store_true", help="Validate for print use")
    group.add_argument("--web", action="store_true", help="Validate for web use")
    return parser.parse_args()


def check_file_size(path):
    size_bytes = os.path.getsize(path)
    size_kb = size_bytes / 1024
    size_mb = size_bytes / (1024 * 1024)
    issues = []
    recommendations = []

    if size_kb < MIN_FILE_SIZE_KB:
        issues.append(f"File size is very small ({size_kb:.1f} KB); file may be corrupt or empty.")
    if size_mb > MAX_FILE_SIZE_MB:
        issues.append(f"File size exceeds {MAX_FILE_SIZE_MB} MB ({size_mb:.1f} MB); may be too large for delivery.")
        recommendations.append("Consider exporting with compression or reducing resolution.")

    return size_kb, size_mb, issues, recommendations


def validate_with_pil(path, target):
    issues = []
    recommendations = []

    try:
        with Image.open(path) as img:
            width, height = img.size
            dpi = img.info.get("dpi", (72, 72))
            if isinstance(dpi, (list, tuple)):
                x_dpi, y_dpi = dpi[0], dpi[1]
            else:
                x_dpi = y_dpi = dpi

            if target == "print":
                min_ppi = PRINT_MIN_PPI
                required_mode = "CMYK"
                acceptable_formats = {"TIFF", "PNG"}
            else:
                min_ppi = WEB_MIN_PPI
                required_mode = "RGB"
                acceptable_formats = {"JPEG", "JPG", "PNG", "WEBP"}

            if x_dpi < min_ppi or y_dpi < min_ppi:
                issues.append(f"Resolution is {x_dpi} x {y_dpi} PPI; minimum {min_ppi} PPI required for {target}.")
                recommendations.append(f"Increase image resolution to at least {min_ppi} PPI in both dimensions.")

            if img.mode != required_mode:
                issues.append(f"Color mode is '{img.mode}'; '{required_mode}' is required for {target}.")
                recommendations.append(f"Convert image to {required_mode} color mode before delivery.")

            ext = os.path.splitext(path)[1].lstrip(".").upper()
            if ext not in acceptable_formats:
                issues.append(
                    f"File format is '{ext}'; acceptable formats for {target} are: {', '.join(sorted(acceptable_formats))}."
                )
                recommendations.append(f"Export as one of: {', '.join(sorted(acceptable_formats))}.")

            size_kb, size_mb, size_issues, size_recs = check_file_size(path)
            issues.extend(size_issues)
            recommendations.extend(size_recs)

            return {
                "path": path,
                "format": ext,
                "mode": img.mode,
                "size": f"{width} x {height} px",
                "dpi": f"{x_dpi} x {y_dpi}",
                "size_kb": f"{size_kb:.1f}",
                "size_mb": f"{size_mb:.1f}",
                "issues": issues,
                "recommendations": recommendations,
            }

    except Exception as exc:
        return {
            "path": path,
            "format": "unknown",
            "mode": "unknown",
            "size": "unknown",
            "dpi": "unknown",
            "size_kb": "unknown",
            "size_mb": "unknown",
            "issues": [f"Failed to read image with PIL: {exc}"],
            "recommendations": ["Ensure the file is a valid image and PIL/Pillow is installed."],
        }


def validate_basic(path, target):
    issues = []
    recommendations = []

    if not os.path.isfile(path):
        return {
            "path": path,
            "format": "unknown",
            "mode": "unknown",
            "size": "unknown",
            "dpi": "unknown",
            "size_kb": "unknown",
            "size_mb": "unknown",
            "issues": ["File does not exist or is not accessible."],
            "recommendations": ["Verify the file path and permissions."],
        }

    ext = os.path.splitext(path)[1].lstrip(".").lower()
    size_kb, size_mb, size_issues, size_recs = check_file_size(path)
    issues.extend(size_issues)
    recommendations.extend(size_recs)

    if target == "print":
        acceptable_formats = {"tiff", "png", "tif"}
        if ext not in acceptable_formats:
            issues.append(
                f"File format is '{ext}'; acceptable formats for print are: TIFF, PNG."
            )
            recommendations.append("Export as TIFF or PNG for print use.")
    else:
        acceptable_formats = {"jpeg", "jpg", "png", "webp"}
        if ext not in acceptable_formats:
            issues.append(
                f"File format is '{ext}'; acceptable formats for web are: JPEG, PNG, WebP."
            )
            recommendations.append("Export as JPEG, PNG, or WebP for web use.")

    return {
        "path": path,
        "format": ext,
        "mode": "unchecked (PIL not installed)",
        "size": "unchecked (PIL not installed)",
        "dpi": "unchecked (PIL not installed)",
        "size_kb": f"{size_kb:.1f}",
        "size_mb": f"{size_mb:.1f}",
        "issues": issues,
        "recommendations": recommendations,
    }


def main():
    args = parse_args()
    path = args.image_path
    target = "print" if args.print else "web"

    if PIL_AVAILABLE:
        result = validate_with_pil(path, target)
    else:
        result = validate_basic(path, target)

    passed = len(result["issues"]) == 0
    status = "PASS" if passed else "FAIL"

    print(f"Image Validation: {status}")
    print(f"Path:      {result['path']}")
    print(f"Format:    {result['format']}")
    print(f"Mode:      {result['mode']}")
    print(f"Size:      {result['size']}")
    print(f"DPI:       {result['dpi']}")
    print(f"File Size: {result['size_kb']} KB ({result['size_mb']} MB)")

    if result["issues"]:
        print("\nIssues:")
        for issue in result["issues"]:
            print(f"  - {issue}")

    if result["recommendations"]:
        print("\nRecommendations:")
        for rec in result["recommendations"]:
            print(f"  - {rec}")

    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()
