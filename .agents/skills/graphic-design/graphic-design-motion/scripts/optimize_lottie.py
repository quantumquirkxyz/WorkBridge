#!/usr/bin/env python3
"""
Lottie optimization analysis script.

Reads a Lottie JSON file, detects common bloat, and prints an optimization
report with size reduction estimates.

Usage:
    python optimize_lottie.py input.json [--minify] [--strip-comments]
"""

import argparse
import copy
import json
import os
import re
import sys
from pathlib import Path


def load_lottie(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def file_size_bytes(path: str) -> int:
    return os.path.getsize(path)


def human_size(num_bytes: int) -> str:
    if num_bytes < 1024:
        return f"{num_bytes} B"
    if num_bytes < 1024 * 1024:
        return f"{num_bytes / 1024:.1f} KB"
    return f"{num_bytes / (1024 * 1024):.1f} MB"


def count_layers(data: dict) -> int:
    return len(data.get("layers", []))


def count_shapes(data: dict) -> int:
    total = 0
    for layer in data.get("layers", []):
        total += len(layer.get("shapes", []))
    return total


def find_unused_assets(data: dict) -> list:
    names = set()
    for layer in data.get("layers", []):
        nm = layer.get("nm")
        if nm:
            names.add(nm)

    unused = []
    for idx, asset in enumerate(data.get("assets", [])):
        ref = asset.get("id") or asset.get("nm") or f"asset_{idx}"
        if ref not in names:
            unused.append({"index": idx, "id": ref})
    return unused


def find_redundant_keyframes(data: dict) -> list:
    findings = []
    for layer in data.get("layers", []):
        ks = layer.get("ks")
        if not ks:
            continue
        for prop_key, prop_val in ks.items():
            if not isinstance(prop_val, dict):
                continue
            anim = prop_val.get("a")
            if anim != 1:
                continue
            keyframes = prop_val.get("k", [])
            if len(keyframes) < 2:
                continue
            for i in range(1, len(keyframes)):
                prev = keyframes[i - 1].get("s")
                curr = keyframes[i].get("s")
                if prev is not None and curr is not None and prev == curr:
                    findings.append({
                        "layer": layer.get("nm", "unknown"),
                        "property": prop_key,
                        "index": i,
                    })
    return findings


def find_excessive_layers(data: dict, threshold: int = 20) -> list:
    return [
        {"name": layer.get("nm", f"layer_{i}"), "index": i}
        for i, layer in enumerate(data.get("layers", []))
        if layer.get("ty") == 4  # shape layers
    ][:max(0, threshold - 1)] if count_layers(data) > threshold else []


def find_hidden_layers(data: dict) -> list:
    hidden = []
    for layer in data.get("layers", []):
        ks = layer.get("ks", {})
        opacity = ks.get("o", {})
        if isinstance(opacity, dict) and opacity.get("a") == 0:
            val = opacity.get("k", 0)
            if val == 0:
                hidden.append({"name": layer.get("nm", "unknown"), "index": layer.get("ind")})
    return hidden


def find_raster_effects(data: dict) -> list:
    findings = []
    for layer in data.get("layers", []):
        for effect in layer.get("ef", []):
            name = effect.get("nm", "")
            if "blur" in name.lower() or "noise" in name.lower():
                findings.append({"layer": layer.get("nm", "unknown"), "effect": name})
    return findings


def estimate_savings(data: dict, findings: dict) -> tuple[int, str]:
    size = len(json.dumps(data, separators=(",", ":")).encode("utf-8"))
    reduction = 0

    # Unused assets
    reduction += len(findings["unused_assets"]) * 500

    # Hidden layers
    reduction += len(findings["hidden_layers"]) * 300

    # Redundant keyframes
    reduction += len(findings["redundant_keyframes"]) * 80

    # Raster effects
    reduction += len(findings["raster_effects"]) * 400

    # Excessive layers
    reduction += max(0, count_layers(data) - 20) * 200

    # Dimensions
    w = data.get("w", 0)
    h = data.get("h", 0)
    if w > 500 or h > 500:
        reduction += int(size * 0.15)

    estimated = max(0, size - reduction)
    return estimated, human_size(estimated)


def suggest_optimizations(findings: dict) -> list:
    suggestions = []
    if findings["unused_assets"]:
        suggestions.append("Remove unused assets to reduce JSON size.")
    if findings["hidden_layers"]:
        suggestions.append("Delete hidden layers or set their opacity to null if driven by expressions.")
    if findings["redundant_keyframes"]:
        suggestions.append("Remove redundant keyframes that repeat the same value.")
    if findings["raster_effects"]:
        suggestions.append("Replace raster effects (blur, noise) with vector alternatives or animated opacity masks.")
    if findings["excessive_layers"] > 20:
        suggestions.append("Merge overlapping shape groups to reduce layer count.")
    return suggestions


def minify_json(data: dict) -> str:
    return json.dumps(data, separators=(",", ":"))


def strip_json_comments(text: str) -> str:
    # Remove single-line // comments
    text = re.sub(r"//.*?(?=\n|$)", "", text)
    # Remove multi-line /* */ comments
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    return text


def write_report(path: str, report: str, minify: bool = False, strip_comments: bool = False) -> None:
    with open(path, "w", encoding="utf-8") as f:
        f.write(report)

    data = load_lottie(path)
    if minify:
        content = minify_json(data)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
    elif strip_comments:
        with open(path, "r", encoding="utf-8") as f:
            raw = f.read()
        cleaned = strip_json_comments(raw)
        try:
            parsed = json.loads(cleaned)
            with open(path, "w", encoding="utf-8") as f:
                json.dump(parsed, f, separators=(",", ":"))
        except json.JSONDecodeError:
            pass


def main() -> int:
    parser = argparse.ArgumentParser(description="Analyze and optimize Lottie JSON files.")
    parser.add_argument("input", help="Path to Lottie JSON file")
    parser.add_argument("--minify", action="store_true", help="Minify JSON output")
    parser.add_argument("--strip-comments", action="store_true", help="Strip comments from JSON")
    parser.add_argument("--report", help="Write optimization report to file")
    args = parser.parse_args()

    if not os.path.isfile(args.input):
        print(f"Error: file not found: {args.input}", file=sys.stderr)
        return 1

    original_size = file_size_bytes(args.input)
    data = load_lottie(args.input)

    findings = {
        "unused_assets": find_unused_assets(data),
        "redundant_keyframes": find_redundant_keyframes(data),
        "hidden_layers": find_hidden_layers(data),
        "raster_effects": find_raster_effects(data),
        "excessive_layers": count_layers(data),
    }

    estimated_size, estimated_human = estimate_savings(data, findings)
    suggestions = suggest_optimizations(findings)
    savings_bytes = max(0, original_size - estimated_size)
    savings_pct = (savings_bytes / original_size * 100) if original_size else 0

    lines = [
        "Lottie Optimization Report",
        "=" * 40,
        f"File:            {args.input}",
        f"Original size:   {human_size(original_size)}",
        f"Estimated size:  {estimated_human}",
        f"Estimated save:  {human_size(savings_bytes)} ({savings_pct:.1f}%)",
        "",
        "Findings:",
    ]

    lines.append(f"  Unused assets:       {len(findings['unused_assets'])}")
    lines.append(f"  Redundant keyframes: {len(findings['redundant_keyframes'])}")
    lines.append(f"  Hidden layers:       {len(findings['hidden_layers'])}")
    lines.append(f"  Raster effects:      {len(findings['raster_effects'])}")
    lines.append(f"  Total layers:        {findings['excessive_layers']}")
    lines.append("")

    if suggestions:
        lines.append("Suggestions:")
        for suggestion in suggestions:
            lines.append(f"  - {suggestion}")
    else:
        lines.append("No obvious bloat detected.")

    report_text = "\n".join(lines) + "\n"
    print(report_text, end="")

    if args.report:
        write_report(args.input, report_text, minify=args.minify, strip_comments=args.strip_comments)

    return 0


if __name__ == "__main__":
    sys.exit(main())
