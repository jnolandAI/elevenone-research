"""
Derive WebP delivery assets beside the canonical dot PNGs.

The PNG stays the render of record. This produces the format the site actually
ships, at the SAME pixel dimensions, losslessly.

Never resize here, and never add a resize flag. The imagery is a halftone
lattice at a fixed 15 degree screen angle. Any resampling grid beats against the
dot grid and moires: the dots clump, adjacent structures lose their separation,
and the file gets BIGGER because clean dots become intermediate greys. Measured
on grid-hero-dot: 2880px wide is 328 KB, the same image resampled to 1920px wide
is 401 KB. If something smaller is needed, render it from the engine at that
size, where role-specific pitch keeps the perceived dot size right.

    python scripts/webp_derive.py --all
    python scripts/webp_derive.py --file public/assets/dot/grid-hero-dot.png
"""
import argparse, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTDIR = os.path.join(ROOT, "public", "assets", "dot")
MANIFEST = os.path.join(OUTDIR, "manifest.json")


def derive(png_path):
    """Write <name>.webp beside <name>.png. Returns the .webp basename.

    Greyscale, because the brand is greyscale absolutely and the source carries
    a fully opaque alpha channel that encodes nothing.
    """
    from PIL import Image

    im = Image.open(png_path)
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGB")
    im = im.convert("L")
    out = os.path.splitext(png_path)[0] + ".webp"
    im.save(out, format="WEBP", lossless=True, method=6)
    return os.path.basename(out)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--all", action="store_true", help="derive for every PNG in the manifest")
    g.add_argument("--file", help="derive for one PNG")
    a = ap.parse_args()

    manifest = {}
    if os.path.exists(MANIFEST):
        manifest = json.load(open(MANIFEST, encoding="utf-8"))

    targets = []
    if a.all:
        targets = [os.path.join(OUTDIR, k) for k in manifest if k.endswith(".png")]
    else:
        targets = [os.path.abspath(a.file)]

    if not targets:
        sys.exit("nothing to derive. Has anything been rendered?")

    for png in targets:
        if not os.path.exists(png):
            sys.exit(f"missing: {png}")
        webp = derive(png)
        key = os.path.basename(png)
        if key in manifest:
            manifest[key]["webp"] = webp
        png_kb = os.path.getsize(png) / 1024
        webp_kb = os.path.getsize(os.path.join(OUTDIR, webp)) / 1024
        print(f"  {key:32s} {png_kb:7.0f} KB -> {webp_kb:7.0f} KB  {webp}")

    json.dump(manifest, open(MANIFEST, "w", encoding="utf-8"), indent=2, sort_keys=True)
    print(f"\nmanifest: {os.path.relpath(MANIFEST, ROOT)}  ({len(manifest)} assets)")


if __name__ == "__main__":
    main()
