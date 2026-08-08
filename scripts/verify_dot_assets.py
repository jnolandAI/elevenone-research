"""
Decode every derived WebP against its source PNG and report the pixel-level
facts nothing else can check: Node has no image decoder, and WebP's container
is always ARGB, so "single-channel greyscale" is not an assertable property
of the file. What IS assertable, and what this reports:

  - the WebP's pixel dimensions match its source PNG (webp_derive.py must
    never resample, see its own docstring)
  - for mode "dot" assets, the WebP's darkest pixel is exactly (19, 19, 18),
    the interface ink at #131312. "contour" mode assets (wind's report cover)
    are a different render path with no ink guarantee, so they carry no
    darkest-pixel check.

Prints one JSON object to stdout, keyed by the manifest's PNG filename.
Invoked from tests/assets.test.ts, which owns the actual assertions.

    python scripts/verify_dot_assets.py
"""
import json, os, sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTDIR = os.path.join(ROOT, "public", "assets", "dot")
MANIFEST = os.path.join(OUTDIR, "manifest.json")


def darkest_pixel(im):
    """Per-channel minimum, not a per-pixel min(key=sum) scan: getextrema()
    runs in C and is instant even on a 2880x1200 hero, where a pure-Python
    pixel-by-pixel scan took over ten seconds across the whole library and
    blew past vitest's default test timeout.

    Valid specifically because the ink is the only dark content in these
    renders and is drawn as a flat colour (see docs/dot-imagery.md): nothing
    else in the field goes below the ink in any channel, so each channel's
    independent minimum is reached at an ink pixel, and the three minimums
    coincide on the same colour rather than three different dark pixels.
    """
    rgb = im.convert("RGB")
    return tuple(band.getextrema()[0] for band in rgb.split())


def main():
    manifest = json.load(open(MANIFEST, encoding="utf-8"))
    out = {}
    for key, meta in manifest.items():
        webp = meta.get("webp")
        if not webp:
            continue
        png_path = os.path.join(OUTDIR, key)
        webp_path = os.path.join(OUTDIR, webp)
        with Image.open(png_path) as png_im:
            png_size = list(png_im.size)
        with Image.open(webp_path) as webp_im:
            entry = {"png_size": png_size, "webp_size": list(webp_im.size), "mode": meta.get("mode")}
            if meta.get("mode") == "dot":
                entry["darkest"] = list(darkest_pixel(webp_im))
        out[key] = entry
    json.dump(out, sys.stdout)


if __name__ == "__main__":
    main()
