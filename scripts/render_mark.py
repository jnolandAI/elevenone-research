#!/usr/bin/env python3
"""
Eleven One Research - mark generator.

The mark is V1, "Resolve": an unbounded halftone field on the imagery engine's
own staggered lattice at 15 degrees, where the lattice is scattered wherever the
field is open and locks into the screen wherever it is dense. Noise resolving
into order.

The drawing is deterministic. The same constants always produce the same file,
which is why the mark lives in a script rather than in a drawing application.

    python scripts/render_mark.py            # writes public/assets/mark/
    python scripts/render_mark.py --check    # verifies nothing has drifted

Raster output needs Playwright. Without it, the SVGs are still written.
"""

from __future__ import annotations
import argparse, json, math, pathlib, sys

VERSION = "1.0"
OUT = pathlib.Path(__file__).resolve().parents[1].joinpath("public", "assets", "mark")

# --------------------------------------------------------------------- constants
# Shared with the imagery engine. A change here is a change to the mark and
# must bump VERSION.
ANGLE = 15.0            # screen angle, degrees
S = 100.0               # drawing units, square
JITTER = 0.85           # disorder at the open end, in units of pitch
GAMMA = 1.20            # curve from field value to dot area
EDGE = 0.13             # fraction of the frame over which the field dissolves
LO, SPAN = 0.06, 0.90   # the diagonal ramp's foot and range
RMIN = 0.22             # below this radius a dot is not drawn at all
INK = "#131312"
INK_INVERSE = "#FAFAF9"

# Two cuts, not one drawing scaled. A halftone changes line screen for
# newsprint; a mark changes it for a favicon.
CUTS = {
    "display": dict(pitch=9.50, rmax=3.70),   # 25px and above
    "small":   dict(pitch=21.38, rmax=7.77),  # below 25px
}

I32 = 0xFFFFFFFF


def _i32(v: int) -> int:
    v &= I32
    return v - 0x100000000 if v & 0x80000000 else v


def _imul(a: int, b: int) -> int:
    return _i32((a & I32) * (b & I32))


def rnd(i: int, j: int, s: int) -> float:
    """The browser prototype's hash PRNG, reproduced exactly so the shipped
    SVG is the drawing that was approved rather than a lookalike."""
    h = _i32(i * 73856093) ^ _i32(j * 19349663) ^ _i32(s * 83492791)
    h = _imul(h ^ ((h & I32) >> 15), 2246822507)
    h = _imul(h ^ ((h & I32) >> 13), 3266489909)
    return ((h ^ ((h & I32) >> 16)) & I32) / 4294967296.0


def field(u: float, v: float) -> float:
    """Density runs corner to corner. The only field the mark uses."""
    return (0.5 * u + 0.5 * v - LO) / SPAN


def dots(pitch: float, rmax: float):
    ang = math.radians(ANGLE)
    cs, sn = math.cos(ang), math.sin(ang)
    row_h = pitch * 0.866
    d = S * 1.5
    n = math.ceil(d / pitch) + 2
    m = math.ceil(d / row_h) + 2
    out = []
    for i in range(-m, m + 1):
        sy = i * row_h
        for j in range(-n, n + 1):
            sx = j * pitch + (pitch / 2 if i & 1 else 0)
            x = sx * cs - sy * sn + S / 2
            y = sx * sn + sy * cs + S / 2
            if x < -pitch * 2 or x > S + pitch * 2 or y < -pitch * 2 or y > S + pitch * 2:
                continue
            t = min(1.0, max(0.0, field(x / S, y / S)))
            # the field dissolves at the frame, it never stops against it
            e = min(1.0, min(x, S - x, y, S - y) / (S * EDGE))
            t *= max(0.0, e)
            # disorder decays as density rises: this is the whole idea
            a = rnd(i, j, 1) * math.pi * 2
            mag = JITTER * pitch * ((1 - t) ** 1.7) * rnd(i, j, 2)
            x += math.cos(a) * mag
            y += math.sin(a) * mag
            r = rmax * (t ** GAMMA)
            if r > RMIN:
                out.append((x, y, r))
    return out


def svg(cut: str, ink: str = INK) -> str:
    c = CUTS[cut]
    body = "".join(
        f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{r:.2f}"/>'
        for x, y, r in dots(c["pitch"], c["rmax"])
    )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S:.0f} {S:.0f}" '
        f'role="img" aria-label="Eleven One Research">'
        f'<title>Eleven One Research</title>'
        f'<g fill="{ink}">{body}</g></svg>'
    )


FILES = [
    ("mark.svg",            "display", INK),
    ("mark-small.svg",      "small",   INK),
    ("mark-inverse.svg",    "display", INK_INVERSE),
    ("mark-small-inverse.svg", "small", INK_INVERSE),
]

RASTER = [("favicon-16.png", "small", 16), ("favicon-32.png", "small", 32),
          ("icon-180.png", "small", 180), ("icon-512.png", "display", 512)]


def rasterise(verbose: bool = True) -> bool:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        if verbose:
            print("  playwright not installed, skipping raster output")
        return False
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, cut, px in RASTER:
            pg = b.new_page(viewport={"width": px, "height": px},
                            device_scale_factor=1)
            pg.set_content(
                f'<body style="margin:0;background:transparent">'
                f'<div style="width:{px}px;height:{px}px">{svg(cut)}</div></body>')
            pg.wait_for_timeout(80)
            pg.screenshot(path=str(OUT / name), omit_background=True)
            pg.close()
            if verbose:
                print(f"  {name:18s} {px}x{px}")
        b.close()
    return True


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true",
                    help="fail if the written files would differ from what is on disk")
    ap.add_argument("--no-raster", action="store_true")
    args = ap.parse_args()

    built = {name: svg(cut, ink) for name, cut, ink in FILES}

    if args.check:
        bad = []
        for name, content in built.items():
            p = OUT / name
            if not p.exists() or p.read_text(encoding="utf-8") != content:
                bad.append(name)
        if bad:
            print("DRIFT: " + ", ".join(bad))
            return 1
        print(f"mark {VERSION}: {len(built)} files match")
        return 0

    OUT.mkdir(parents=True, exist_ok=True)
    print(f"mark {VERSION}")
    for name, content in built.items():
        (OUT / name).write_text(content, encoding="utf-8")
        n = content.count("<circle")
        print(f"  {name:24s} {n:4d} dots  {len(content)/1024:5.1f} KB")

    if not args.no_raster:
        rasterise()

    (OUT / "manifest.json").write_text(json.dumps({
        "version": VERSION,
        "field": "diagonal ramp, jitter decaying with density",
        "angle": ANGLE, "jitter": JITTER, "gamma": GAMMA, "edge": EDGE,
        "ink": INK, "ink_inverse": INK_INVERSE,
        "cuts": CUTS,
        "files": sorted(list(built) + [n for n, _, _ in RASTER]),
    }, indent=2), encoding="utf-8")
    print(f"  manifest.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
