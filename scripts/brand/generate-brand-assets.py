#!/usr/bin/env python3
"""Generate the WorkBridge brand assets (SVG marks, outlined lockups, favicon and PWA icons).

The text of the lockups is converted to outlines with fontTools so the SVG files do not
depend on an installed font. Archivo Black is licensed under the SIL OFL; pass the path of
ArchivoBlack-Regular.ttf (https://github.com/google/fonts/tree/main/ofl/archivoblack).

Usage (from the repository root):
    python scripts/brand/generate-brand-assets.py path/to/ArchivoBlack-Regular.ttf

Requires: fonttools, cairosvg.
"""
import sys
from pathlib import Path

import cairosvg
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

INK, BLUE, PINK, YELLOW, CREAM = "#111111", "#2457F0", "#FF5EA8", "#FFE14D", "#F3EFE6"

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "apps" / "web"
BRAND = WEB / "public" / "brand"


def mark_body(shadow: str) -> str:
    """The mark in a 64x64 box: an arch bridge with a person crossing it."""
    return (
        f'<rect x="9" y="9" width="54" height="54" rx="7" fill="{shadow}"/>'
        f'<rect x="3" y="3" width="54" height="54" rx="7" fill="{BLUE}" stroke="{INK}" stroke-width="3.5"/>'
        f'<path d="M11 40C11 8 49 8 49 40" fill="none" stroke="{INK}" stroke-width="9"/>'
        f'<path d="M11 40C11 8 49 8 49 40" fill="none" stroke="{YELLOW}" stroke-width="3.5"/>'
        f'<rect x="6.5" y="39" width="47" height="8" fill="{INK}"/>'
        f'<path d="M23 39C23 32.5 37 32.5 37 39Z" fill="{PINK}" stroke="{INK}" stroke-width="2"/>'
        f'<circle cx="30" cy="27.5" r="4.3" fill="{PINK}" stroke="{INK}" stroke-width="2"/>'
    )


def svg(width: float, height: float, inner: str, label: str = "WorkBridge") -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:g} {height:g}" '
        f'width="{width:g}" height="{height:g}" role="img" aria-label="{label}">'
        f"<title>{label}</title>{inner}</svg>\n"
    )


class Face:
    def __init__(self, path: Path):
        self.font = TTFont(path)
        self.glyphs = self.font.getGlyphSet()
        self.cmap = self.font.getBestCmap()
        self.upm = self.font["head"].unitsPerEm
        os2 = self.font["OS/2"]
        self.cap = getattr(os2, "sCapHeight", 0) or int(self.upm * 0.7)

    def outline(self, text: str, size: float, x: float, baseline: float, tracking: float):
        scale = size / self.upm
        parts, cursor = [], x
        for ch in text:
            name = self.cmap[ord(ch)]
            pen = SVGPathPen(self.glyphs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
            self.glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, cursor, baseline)))
            parts.append(pen.getCommands())
            cursor += self.glyphs[name].width * scale + tracking
        return " ".join(p for p in parts if p), cursor - x - tracking


def lockup(face: Face, dark: bool) -> str:
    text_color = CREAM if dark else INK
    edge = CREAM if dark else INK  # border and hard shadow of the pink block
    size, tracking = 40.0, -0.8
    cap = face.cap * size / face.upm
    baseline = 32 + cap / 2
    work, work_w = face.outline("WORK", size, 82, baseline, tracking)
    gap, pad, shadow = 10.0, 7.0, 4.0
    block_x = 82 + work_w + gap
    bridge, bridge_w = face.outline("BRIDGE", size, block_x + pad, baseline, tracking)
    block_w, block_h = bridge_w + 2 * pad, cap + 2 * pad
    block_y = 32 - block_h / 2
    cx, cy = block_x + block_w / 2, 32
    total = block_x + block_w + shadow + 6
    block = (
        f'<g transform="rotate(-2 {cx:.2f} {cy})">'
        f'<rect x="{block_x + shadow:.2f}" y="{block_y + shadow:.2f}" width="{block_w:.2f}" height="{block_h:.2f}" fill="{edge}"/>'
        f'<rect x="{block_x:.2f}" y="{block_y:.2f}" width="{block_w:.2f}" height="{block_h:.2f}" fill="{PINK}" stroke="{edge}" stroke-width="3"/>'
        f'<path d="{bridge}" fill="{INK}"/></g>'
    )
    inner = mark_body(CREAM if dark else INK) + f'<path d="{work}" fill="{text_color}"/>' + block
    return svg(round(total), 64, inner)


def png(svg_markup: str, out: Path, size: int) -> None:
    cairosvg.svg2png(bytestring=svg_markup.encode(), write_to=str(out), output_width=size, output_height=size)


def padded_icon(size: int, scale: float) -> str:
    """Mark centred on a cream square (maskable and Apple icons need an opaque, safe-zone layout)."""
    offset = size * (1 - scale) / 2
    s = size * scale / 64
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">'
        f'<rect width="{size}" height="{size}" fill="{CREAM}"/>'
        f'<g transform="translate({offset:.2f} {offset:.2f}) scale({s:.4f})">{mark_body(INK)}</g></svg>'
    )


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    face = Face(Path(sys.argv[1]))
    BRAND.mkdir(parents=True, exist_ok=True)

    mark_light = svg(64, 64, mark_body(INK))
    (BRAND / "workbridge-mark.svg").write_text(mark_light, encoding="utf8")
    (BRAND / "workbridge-mark-dark.svg").write_text(svg(64, 64, mark_body(CREAM)), encoding="utf8")
    (BRAND / "workbridge-logo.svg").write_text(lockup(face, dark=False), encoding="utf8")
    (BRAND / "workbridge-logo-dark.svg").write_text(lockup(face, dark=True), encoding="utf8")

    (WEB / "app" / "icon.svg").write_text(mark_light, encoding="utf8")
    png(mark_light, WEB / "public" / "icon-192.png", 192)
    png(mark_light, WEB / "public" / "icon-512.png", 512)
    png(padded_icon(512, 0.62), WEB / "public" / "icon-maskable-512.png", 512)
    png(padded_icon(180, 0.78), WEB / "app" / "apple-icon.png", 180)
    print("brand assets written to", BRAND, "and apps/web/{app,public}")


if __name__ == "__main__":
    main()
