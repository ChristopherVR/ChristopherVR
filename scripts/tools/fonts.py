"""One-off font preparation for the profile graphics.

The build itself (scripts/build.mjs) has no dependencies: it only reads what
this tool writes into assets/fonts. Run this again only to change a typeface.

    pip install fonttools brotli uharfbuzz
    python scripts/tools/fonts.py <dir with Fraunces.ttf and PlexMono.ttf> assets/fonts

Inputs are the upstream files from github.com/google/fonts (both SIL OFL 1.1):
    ofl/fraunces/Fraunces[SOFT,WONK,opsz,wght].ttf  -> Fraunces.ttf
    ofl/ibmplexmono/IBMPlexMono-Regular.ttf         -> PlexMono.ttf

Outputs (renamed, because a modified font may not carry a reserved name):
    display.woff2   Fraunces at its big optical size, for names and headlines
    text.woff2      Fraunces at its small optical size, for running text
    mono.woff2      IBM Plex Mono, for bytes, offsets and code
    atlas.json      metrics, advances and kerning for measuring text at
                            build time, plus the display face's TrueType points
                            (on- and off-curve) for the glyph-outline drawings
"""

import json
import sys
from io import BytesIO
from pathlib import Path

import uharfbuzz as hb
from fontTools import subset
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

src = Path(sys.argv[1])
out = Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)

ASCII = [chr(c) for c in range(0x20, 0x7F)]
EXTRA = list("°·–—×→←↑↓’‘“”…✓▸●■□▲│─┌└├µ±≈")
CHARS = ASCII + EXTRA


def make_subset(font: TTFont) -> TTFont:
    opts = subset.Options()
    opts.layout_features = ["kern", "liga"]
    opts.ignore_missing_unicodes = True
    opts.notdef_outline = True
    opts.name_IDs = [1, 2, 4, 6]
    opts.hinting = False
    s = subset.Subsetter(opts)
    s.populate(unicodes=[ord(c) for c in CHARS])
    s.subset(font)
    return font


def rename(font: TTFont, family: str) -> TTFont:
    """Give the subset its own name; the originals keep theirs."""
    for rec in font["name"].names:
        if rec.nameID in (1, 3, 4, 6, 16):
            rec.string = family.replace(" ", "") if rec.nameID == 6 else family
    return font


def to_bytes(font: TTFont, flavor=None) -> bytes:
    buf = BytesIO()
    font.flavor = flavor
    font.save(buf)
    return buf.getvalue()


def metrics(font: TTFont, ttf: bytes, outlines: bool) -> dict:
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    os2 = font["OS/2"]
    glyphs = font.getGlyphSet()
    info = {
        "upm": font["head"].unitsPerEm,
        "ascender": font["hhea"].ascent,
        "descender": font["hhea"].descent,
        "capHeight": getattr(os2, "sCapHeight", 0),
        "xHeight": getattr(os2, "sxHeight", 0),
        "adv": {},
        "kern": {},
    }
    present = [c for c in CHARS if ord(c) in cmap]
    for c in present:
        info["adv"][c] = hmtx[cmap[ord(c)]][0]

    # Kerning for every pair, as the browser's shaper will apply it.
    face = hb.Face(ttf)
    hbfont = hb.Font(face)
    for a in present:
        for b in present:
            buf = hb.Buffer()
            buf.add_str(a + b)
            buf.guess_segment_properties()
            hb.shape(hbfont, buf, {"kern": True, "liga": False})
            if len(buf.glyph_positions) != 2:
                continue
            delta = buf.glyph_positions[0].x_advance - info["adv"][a]
            if delta:
                info["kern"][a + b] = delta

    if outlines:
        glyf = font["glyf"]
        info["glyphs"] = {}
        for c in present:
            name = cmap[ord(c)]
            pen = SVGPathPen(glyphs, lambda v: str(int(round(v))))
            glyphs[name].draw(pen)
            coords, ends, flags = glyf[name].getCoordinates(glyf)
            info["glyphs"][c] = {
                "d": pen.getCommands(),
                "pts": [[int(x), int(y), int(f & 1)] for (x, y), f in zip(coords, flags)],
                "ends": [int(e) for e in ends],
            }
    return info


atlas = {}

fraunces = TTFont(src / "Fraunces.ttf")
for key, axes, outlines in [
    ("display", {"opsz": 144, "wght": 560, "SOFT": 0, "WONK": 1}, True),
    ("text", {"opsz": 22, "wght": 430, "SOFT": 0, "WONK": 0}, False),
]:
    inst = instancer.instantiateVariableFont(TTFont(src / "Fraunces.ttf"), axes)
    inst = rename(make_subset(inst), f"CVR {key.title()}")
    ttf = to_bytes(inst)
    (out / f"{key}.woff2").write_bytes(to_bytes(TTFont(BytesIO(ttf)), "woff2"))
    atlas[key] = metrics(TTFont(BytesIO(ttf)), ttf, outlines)

mono = rename(make_subset(TTFont(src / "PlexMono.ttf")), "CVR Mono")
ttf = to_bytes(mono)
(out / "mono.woff2").write_bytes(to_bytes(TTFont(BytesIO(ttf)), "woff2"))
m = metrics(TTFont(BytesIO(ttf)), ttf, False)
m["kern"] = {}
atlas["mono"] = m

(out / "atlas.json").write_text(json.dumps(atlas, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
for f in sorted(out.iterdir()):
    print(f"{f.name:28} {f.stat().st_size:>8,} bytes")
print({k: (len(v["adv"]), len(v["kern"])) for k, v in atlas.items()})
