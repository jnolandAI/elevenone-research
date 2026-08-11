#!/usr/bin/env python3
"""
Eleven One Research - mark generator.

The mark is V1, "Resolve": an unbounded halftone field on the imagery engine's
own staggered lattice at 15 degrees, where the lattice is scattered wherever the
field is open and locks into the screen wherever it is dense. Noise resolving
into order.

The drawing is deterministic. The same constants always produce the same file,
which is why the mark lives in a script rather than in a drawing application.

    python scripts/render_mark.py              # writes public/assets/mark/
    python scripts/render_mark.py --check      # re-derives every tracked file and
                                               # compares it against what is on disk
    python scripts/render_mark.py --metrics    # scores the shipped cuts against BAR

--check covers every generated file this repo tracks: the seven SVGs, the four
PNGs, manifest.json and prototypes/marks-micro.html, thirteen in all. Adding
--no-raster drops the four PNGs and says so in the output, so the count printed
is always the count verified.

Raster output needs Playwright. Without it the SVGs are still written, and
--check without --no-raster fails rather than passing on a partial verification.
"""

from __future__ import annotations
import argparse, json, math, pathlib, shutil, sys, tempfile

VERSION = "1.1"
ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT.joinpath("public", "assets", "mark")

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

# Three cuts, not one drawing scaled. A halftone changes line screen for
# newsprint; a mark changes it for a favicon. display and small carry only a
# pitch and a radius, so they draw from the module constants and stay
# byte-identical to what shipped at 1.0. A cut dict and a candidate dict are
# the same contract: pitch and rmax are required, everything else falls back
# to the module constant, so dots_for() and metrics() accept either family.
CUTS = {
    "display": dict(pitch=9.50, rmax=3.70),    # 33px and above
    "small":   dict(pitch=21.38, rmax=7.77),   # 21 to 32px
    "micro":   dict(pitch=30.0, rmax=11.0, rmax_inv=9.68,
                    gamma=1.20, jitter=0.45,
                    lo=0.00, span=0.78, edge=0.06),  # 16 to 20px
}

# Candidates for the micro cut, for prototypes/marks-micro.html. Not shipped.
# A is the small cut unchanged, as the control: every other row has to beat the
# drawing that is failing at 16px today.
CANDIDATES = [
    dict(id='A', pitch=21.38, rmax=7.77,  gamma=1.20, jitter=0.85, lo=.06, span=.90, edge=.13,
         note='control: the small cut as it ships'),
    dict(id='B', pitch=30.0,  rmax=11.0,  gamma=1.20, jitter=0.85, lo=.06, span=.90, edge=.13,
         note='coarse, everything else held'),
    dict(id='C', pitch=30.0,  rmax=11.0,  gamma=1.20, jitter=0.00, lo=.06, span=.90, edge=.13,
         note='coarse, no jitter: is scatter legible at a dozen dots?'),
    dict(id='D', pitch=30.0,  rmax=11.0,  gamma=1.20, jitter=0.45, lo=.06, span=.90, edge=.13,
         note='coarse, half jitter'),
    dict(id='E', pitch=30.0,  rmax=12.6,  gamma=1.20, jitter=0.45, lo=.06, span=.90, edge=.13,
         note='coarse, fatter dots'),
    dict(id='F', pitch=30.0,  rmax=11.0,  gamma=0.90, jitter=0.45, lo=.06, span=.90, edge=.13,
         note='coarse, low gamma: mid-field dots survive RMIN'),
    dict(id='G', pitch=30.0,  rmax=11.0,  gamma=1.20, jitter=0.45, lo=.06, span=.90, edge=.04,
         note='coarse, edge almost off'),
    dict(id='H', pitch=30.0,  rmax=11.0,  gamma=1.20, jitter=0.45, lo=.06, span=.90, edge=.00,
         note='coarse, edge off: dissolving 13% of a 4-dot drawing costs a ring'),
    dict(id='I', pitch=30.0,  rmax=11.0,  gamma=1.20, jitter=0.45, lo=.00, span=.78, edge=.06,
         note='coarse, shorter ramp: less open end'),
    dict(id='J', pitch=34.0,  rmax=13.0,  gamma=1.10, jitter=0.35, lo=.02, span=.82, edge=.06,
         note='coarsest'),
    dict(id='K', pitch=27.0,  rmax=10.2,  gamma=1.05, jitter=0.50, lo=.04, span=.86, edge=.08,
         note='between small and coarse'),
    dict(id='L', pitch=27.0,  rmax=11.4,  gamma=0.95, jitter=0.00, lo=.02, span=.82, edge=.06,
         note='between, fat, ordered'),
]

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


def field(u: float, v: float, lo: float = LO, span: float = SPAN) -> float:
    """Density runs corner to corner. The only field the mark uses."""
    return (0.5 * u + 0.5 * v - lo) / span


def dots(pitch: float, rmax: float, *, gamma: float = GAMMA, jitter: float = JITTER,
         edge: float = EDGE, lo: float = LO, span: float = SPAN):
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
            t = min(1.0, max(0.0, field(x / S, y / S, lo, span)))
            # the field dissolves at the frame, it never stops against it
            e = 1.0 if edge <= 0 else min(1.0, min(x, S - x, y, S - y) / (S * edge))
            t *= max(0.0, e)
            # disorder decays as density rises: this is the whole idea
            a = rnd(i, j, 1) * math.pi * 2
            mag = jitter * pitch * ((1 - t) ** 1.7) * rnd(i, j, 2)
            x += math.cos(a) * mag
            y += math.sin(a) * mag
            r = rmax * (t ** gamma)
            if r > RMIN:
                out.append((x, y, r))
    return out


def resolve(c: dict) -> dict:
    """Every parameter the drawing needs, with the module constant standing in
    wherever the cut is silent. CUTS['display'] and CANDIDATES[0] are the same
    kind of thing read through this: a cut that omits gamma draws at GAMMA,
    which is exactly what svg() has always done for display and small."""
    return dict(pitch=c['pitch'], rmax=c['rmax'],
                rmax_inv=c.get('rmax_inv', c['rmax']),
                gamma=c.get('gamma', GAMMA), jitter=c.get('jitter', JITTER),
                edge=c.get('edge', EDGE),
                lo=c.get('lo', LO), span=c.get('span', SPAN))


def dots_for(c: dict, rmax: float | None = None):
    """The cut's or candidate's drawing. rmax is separable so the inverse
    polarity can be drawn a shade smaller: light dots on a dark ground read
    visually larger than dark on light at the same radius."""
    p = resolve(c)
    return dots(p['pitch'], rmax if rmax is not None else p['rmax'],
                gamma=p['gamma'], jitter=p['jitter'], edge=p['edge'],
                lo=p['lo'], span=p['span'])


def metrics(c: dict) -> dict:
    """The four things that decide legibility at 16px, measured rather than judged."""
    d = dots_for(c)
    area = sum(math.pi * r * r for _, _, r in d)
    biggest = max((r for _, _, r in d), default=0.0) * 2
    # a dot is legible at 16px if its diameter reaches a device pixel there
    scale = 16.0 / S
    return {
        'count': len(d),
        'max_d_ratio': biggest / c['pitch'],
        'coverage': area / (S * S),
        'legible_at_16': sum(1 for _, _, r in d if 2 * r * scale >= 1.0),
    }


SHEET = ROOT.joinpath("prototypes", "marks-micro.html")

# What a winner has to do. Printed beside every candidate so the choice is
# argued rather than asserted.
BAR = {'count': (9, 16), 'max_d_ratio': (0.55, 1.10), 'coverage': (0.14, 0.26),
       'legible_at_16': (7, 99)}


def _cells(c: dict, ink: str, ground: str | None, rmax: float | None, tag: str) -> str:
    body = "".join(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{r:.2f}"/>'
                   for x, y, r in dots_for(c, rmax))
    bg = f'<rect width="{S:.0f}" height="{S:.0f}" fill="{ground}"/>' if ground else ''
    art = (f'<svg viewBox="0 0 {S:.0f} {S:.0f}" data-candidate="{c["id"]}-{tag}">'
           f'{bg}<g fill="{ink}">{body}</g></svg>')
    sizes = "".join(f'<div class="t" style="width:{px}px;height:{px}px">{art}</div>'
                    for px in (16, 19, 20))
    # 96px is 6x the 16px cut, which is the size the decision is actually about
    return (f'<div class="cell"><div class="true">{sizes}</div>'
            f'<div class="zoom" style="width:96px;height:96px">{art}</div></div>')


def sheet_html() -> str:
    rows = []
    for c in CANDIDATES:
        m = metrics(c)
        flags = "".join(
            f'<b class="{"ok" if BAR[k][0] <= m[k] <= BAR[k][1] else "no"}">{label} '
            f'{m[k]:.3g}</b>'
            for k, label in (('count', 'dots'), ('max_d_ratio', 'densest'),
                             ('coverage', 'coverage'), ('legible_at_16', 'legible at 16')))
        rows.append(
            f'<section><h2>{c["id"]}<span>{c["note"]}</span></h2>'
            f'<p class="m">{flags}</p><div class="pair">'
            f'{_cells(c, INK, None, None, "pos")}'
            f'{_cells(c, INK_INVERSE, INK, c["rmax"] * 0.92, "inv")}'
            f'</div></section>')
    return f"""<!doctype html><meta charset="utf-8">
<title>Mark: micro cut candidates</title>
<style>
 body{{font:13px/1.5 ui-sans-serif,system-ui;margin:40px;color:#131312;background:#FAFAF9}}
 h1{{font-size:19px;font-weight:600;margin:0 0 4px}}
 h1+p{{color:#6C6C6A;margin:0 0 30px;max-width:66ch}}
 section{{border-top:1px solid #DEDEDD;padding:18px 0}}
 h2{{font-size:14px;font-weight:600;margin:0 0 4px}}
 h2 span{{font-weight:400;color:#6C6C6A;margin-left:10px}}
 .m{{margin:0 0 12px;font-size:11.5px}}
 .m b{{font-weight:500;margin-right:14px}}
 .ok{{color:#4A4A48}} .no{{color:#131312;background:#EBEBEA;padding:1px 5px;border-radius:3px}}
 .pair{{display:flex;gap:44px;align-items:flex-start}}
 .cell{{display:flex;gap:18px;align-items:flex-start}}
 .true{{display:flex;gap:12px;align-items:flex-start}}
 .t svg,.zoom svg{{display:block;width:100%;height:100%}}
</style>
<h1>Micro cut candidates</h1>
<p>Left column of each pair is ink on light, right is light on ink at 0.92 of the
radius. Judge at true size: every one of these looks resolved at 6x. A boxed
number is outside the bar. The bar is a filter, not the decision.</p>
{''.join(rows)}
"""


def write_sheet(path: pathlib.Path = SHEET) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(sheet_html(), encoding="utf-8")
    print(f"  {path}  {len(CANDIDATES)} candidates")


def svg(cut: str, ink: str = INK, ground: str | None = None) -> str:
    c = CUTS[cut]
    inverse = ink == INK_INVERSE
    rmax = resolve(c)["rmax_inv"] if inverse else c["rmax"]
    body = "".join(
        f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{r:.2f}"/>'
        for x, y, r in dots_for(c, rmax)
    )
    # full bleed to the file's edge. Nothing is drawn around the mark and there
    # is no inset shape it sits inside, so rule 1 survives: the file has a
    # ground, the mark is not on a plate.
    plate = f'<rect width="{S:.0f}" height="{S:.0f}" fill="{ground}"/>' if ground else ''
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S:.0f} {S:.0f}" '
        f'role="img" aria-label="Eleven One Research">'
        f'<title>Eleven One Research</title>'
        f'{plate}<g fill="{ink}">{body}</g></svg>'
    )


# name, cut, ink, ground. A ground is an icon-file property and never a page one.
FILES = [
    ("mark.svg",               "display", INK,         None),
    ("mark-small.svg",         "small",   INK,         None),
    ("mark-micro.svg",         "micro",   INK,         None),
    ("mark-inverse.svg",       "display", INK_INVERSE, None),
    ("mark-small-inverse.svg", "small",   INK_INVERSE, None),
    ("mark-micro-inverse.svg", "micro",   INK_INVERSE, None),
    ("icon.svg",               "micro",   INK_INVERSE, INK),
]

# Raster icons are the icon family: light dots on an ink ground, full bleed.
# icon-180 was drawn from the small cut, which the doc reserves for below 25px:
# 23 dots at 180px was the sparse-specks problem at large size, on the home
# screen and in the store.
#
# favicon-32 is drawn from micro, not from small, even though 32px sits in the
# small cut's band. It shares the tab-icon slot with icon.svg, and which of the
# two a reader gets is the browser's decision, not ours: Chromium and Firefox
# take the SVG, Safari falls back to the PNG. Rule 7 says a mark that exists in
# two versions in the wild is two marks, so the slot gets one drawing. This is
# what leaves the small cut with no icon consumer.
RASTER = [("favicon-16.png", "micro",   16),
          ("favicon-32.png", "micro",   32),
          ("icon-180.png",   "display", 180),
          ("icon-512.png",   "display", 512)]


def have_playwright() -> bool:
    try:
        import playwright.sync_api  # noqa: F401
    except ImportError:
        return False
    return True


def rasterise(dest: pathlib.Path = OUT, verbose: bool = True) -> bool:
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        if verbose:
            print("  playwright not installed, skipping raster output")
        return False
    dest.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, cut, px in RASTER:
            pg = b.new_page(viewport={"width": px, "height": px},
                            device_scale_factor=1)
            pg.set_content(
                f'<body style="margin:0;background:{INK}">'
                f'<div style="width:{px}px;height:{px}px">'
                f'{svg(cut, INK_INVERSE, INK)}</div></body>')
            pg.wait_for_timeout(80)
            pg.screenshot(path=str(dest / name))
            pg.close()
            if verbose:
                print(f"  {name:18s} {px}x{px}")
        b.close()
    return True


def manifest_json() -> str:
    """A machine-readable record of which drawing a deployed file is. Rule 7
    turns on being able to tell one version of the mark from another in the
    wild, and this is the only artifact that carries the parameters.

    Every cut is written out resolved. Jitter, gamma, edge, lo and span were
    top-level keys at 1.0, when all three cuts drew from them; micro carries
    its own from 1.1, so a top-level jitter would read as the mark's jitter
    while being untrue of the cut a reader most often sees. Only what is
    genuinely global stays at the top."""
    return json.dumps({
        "version": VERSION,
        "field": "diagonal ramp, jitter decaying with density",
        "angle": ANGLE,
        "rmin": RMIN,
        "ink": INK, "ink_inverse": INK_INVERSE,
        "cuts": {name: resolve(c) for name, c in CUTS.items()},
        "raster_ground": INK,
        # which cut each file was drawn from. icon.svg and favicon-32.png share
        # the tab-icon slot, so a reader can check here that they agree.
        "drawn_from": {**{n: cut for n, cut, _, _ in FILES},
                       **{n: cut for n, cut, _ in RASTER}},
        "files": sorted([n for n, _, _, _ in FILES] + [n for n, _, _ in RASTER]),
    }, indent=2)


def tracked() -> dict[str, str]:
    """Every generated text file that is committed, keyed by repo path."""
    out = {str(OUT / name): svg(cut, ink, ground) for name, cut, ink, ground in FILES}
    out[str(OUT / "manifest.json")] = manifest_json()
    out[str(SHEET)] = sheet_html()
    return out


def check(no_raster: bool) -> int:
    """Re-derive every tracked generated file and compare it against disk.

    The rasters matter here more than they look. render_mark.py runs without
    Playwright, so retuning a cut on a machine with no browser writes the SVGs
    and the manifest and silently leaves the PNGs on the previous drawing. That
    is the exact failure this branch is about: favicon-16.png and icon.svg both
    serve the tab strip and must agree. So a raster check that cannot run is an
    error, never a pass."""
    bad, n = [], 0
    for path, content in tracked().items():
        p = pathlib.Path(path)
        n += 1
        if not p.exists() or p.read_text(encoding="utf-8") != content:
            bad.append(p.relative_to(ROOT).as_posix())

    note = ""
    if no_raster:
        note = f", {len(RASTER)} rasters not checked (--no-raster)"
    elif not have_playwright():
        print("CANNOT CHECK: the rasters need Playwright. Install it, or pass "
              "--no-raster to verify the text files only.")
        return 1
    else:
        tmp = pathlib.Path(tempfile.mkdtemp(prefix="mark-check-"))
        try:
            rasterise(tmp, verbose=False)
            for name, _, _ in RASTER:
                n += 1
                p = OUT / name
                if not p.exists() or p.read_bytes() != (tmp / name).read_bytes():
                    bad.append(p.relative_to(ROOT).as_posix())
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    if bad:
        print("DRIFT: " + ", ".join(bad))
        print("  rebuild with: python scripts/render_mark.py"
              "   (the contact sheet needs --sheet)")
        return 1
    print(f"mark {VERSION}: {n} files match{note}")
    return 0


def print_metrics() -> int:
    """Score the shipped cuts the way the candidates were scored. The bar was
    written for the micro cut at 16px, so display and small are expected to
    miss it: the point is that a maintainer retuning any cut can measure it."""
    print(f"mark {VERSION}: shipped cuts against the micro bar")
    for name, c in CUTS.items():
        m = metrics(c)
        cells = "  ".join(
            f'{label} {m[k]:.3g}{"" if BAR[k][0] <= m[k] <= BAR[k][1] else "*"}'
            for k, label in (('count', 'dots'), ('max_d_ratio', 'densest'),
                             ('coverage', 'coverage'), ('legible_at_16', 'legible at 16')))
        print(f"  {name:9s} {cells}")
    print("  * outside the bar, which was set for micro at 16px")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true",
                    help="fail if any tracked generated file differs from what "
                         "the current code produces")
    ap.add_argument("--no-raster", action="store_true",
                    help="skip the four PNGs, when writing and when checking")
    ap.add_argument("--sheet", action="store_true",
                    help="write the micro-cut contact sheet and exit")
    ap.add_argument("--out", type=pathlib.Path, default=SHEET,
                    help="with --sheet, write somewhere other than prototypes/")
    ap.add_argument("--metrics", action="store_true",
                    help="score the three shipped cuts against BAR and exit")
    args = ap.parse_args()

    if args.sheet:
        print(f"mark {VERSION} candidates")
        write_sheet(args.out)
        return 0

    if args.metrics:
        return print_metrics()

    if args.check:
        return check(args.no_raster)

    OUT.mkdir(parents=True, exist_ok=True)
    print(f"mark {VERSION}")
    for name, cut, ink, ground in FILES:
        content = svg(cut, ink, ground)
        (OUT / name).write_text(content, encoding="utf-8")
        n = content.count("<circle")
        print(f"  {name:24s} {n:4d} dots  {len(content)/1024:5.1f} KB")

    if not args.no_raster:
        rasterise()

    (OUT / "manifest.json").write_text(manifest_json(), encoding="utf-8")
    print("  manifest.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
