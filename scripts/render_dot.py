"""
Render dot imagery to PNG at the locked brand constants.

Role decides the output size and the dot pitch, so the same subject comes out
correctly proportioned whether it is a full-bleed brief header or a figure in the
body. Nothing here is tunable: pitch, gamma, screen angle and dissolve live in
prototypes/dot-engine.js and apply to every render.

    python scripts/render_dot.py --list
    python scripts/render_dot.py --subject port --role hero
    python scripts/render_dot.py --subject wind --role figure --mode contour
    python scripts/render_dot.py --all --role card

Output lands in public/assets/dot/<subject>-<role>-<mode>.png unless --out is given.
"""
import argparse, base64, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
PAGE = os.path.join(ROOT, "prototypes", "dot-render.html")
ENGINE = os.path.join(ROOT, "prototypes", "dot-engine.js")
OUTDIR = os.path.join(ROOT, "public", "assets", "dot")


def engine_facts():
    """Read subjects and roles straight out of the engine so this script can
    never disagree with it about what exists."""
    src = open(ENGINE, encoding="utf-8").read()
    subjects = re.findall(r"\{\s*id:'([a-z0-9_]+)',\s*name:'([^']+)'", src)
    roles = {}
    for m in re.finditer(r"^\s{2}(\w+):\s*\{\s*w:\s*(\d+),\s*h:\s*(\d+),\s*pitch:\s*(\d+)"
                         r",\s*dist:\s*([\d.]+),\s*\n?\s*label:\s*'([^']+)'", src, re.M):
        roles[m.group(1)] = dict(w=int(m.group(2)), h=int(m.group(3)),
                                 pitch=int(m.group(4)), dist=float(m.group(5)),
                                 label=m.group(6))
    modes = re.search(r"const MODES = \[([^\]]+)\]", src)
    modes = [x.strip().strip("'") for x in modes.group(1).split(",")] if modes else ["dot"]
    ver = re.search(r"version:\s*'([^']+)'", src)
    return subjects, roles, modes, (ver.group(1) if ver else "?")


def render(pw_page, subject, role, mode):
    url = "file:///" + PAGE.replace("\\", "/") + f"?subject={subject}&role={role}&mode={mode}"
    pw_page.goto(url)
    pw_page.wait_for_function("window.__renderReady === true", timeout=120000)
    err = pw_page.evaluate("window.__renderError || null")
    if err:
        raise RuntimeError(err)
    meta = pw_page.evaluate("window.__meta")
    if mode == "ascii":
        return pw_page.evaluate("window.__text"), meta, "txt"
    data = pw_page.evaluate("window.__png")
    return base64.b64decode(data.split(",", 1)[1]), meta, "png"


def main():
    subjects, roles, modes, version = engine_facts()
    ap = argparse.ArgumentParser(description="Render Eleven One Research dot imagery.")
    ap.add_argument("--subject")
    ap.add_argument("--role", default="figure")
    ap.add_argument("--mode", default="dot")
    ap.add_argument("--out")
    ap.add_argument("--all", action="store_true", help="render every subject")
    ap.add_argument("--list", action="store_true", help="show subjects, roles and modes")
    a = ap.parse_args()

    if a.list:
        print(f"engine version {version}\n")
        print("subjects")
        for sid, name in subjects:
            print(f"  {sid:<12} {name}")
        print("\nroles")
        for rid, r in roles.items():
            print(f"  {rid:<8} {r['w']}x{r['h']}  pitch {r['pitch']:<3} {r['label']}")
        print("\nmodes\n  " + ", ".join(modes))
        return

    if not a.all and not a.subject:
        ap.error("give --subject, or --all")
    if a.role not in roles:
        ap.error(f"unknown role {a.role!r}. Options: {', '.join(roles)}")
    if a.mode not in modes:
        ap.error(f"unknown mode {a.mode!r}. Options: {', '.join(modes)}")

    ids = [s[0] for s in subjects] if a.all else [a.subject]
    known = {s[0] for s in subjects}
    for sid in ids:
        if sid not in known:
            ap.error(f"unknown subject {sid!r}. Options: {', '.join(sorted(known))}")
    if a.out and len(ids) > 1:
        ap.error("--out only works with a single subject")

    if not os.path.exists(PAGE):
        sys.exit("prototypes/dot-render.html missing. Run: python scripts/build_dot_pages.py")

    from playwright.sync_api import sync_playwright
    os.makedirs(OUTDIR, exist_ok=True)
    manifest_path = os.path.join(OUTDIR, "manifest.json")
    manifest = {}
    if os.path.exists(manifest_path):
        manifest = json.load(open(manifest_path, encoding="utf-8"))

    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-gl=angle", "--use-angle=swiftshader",
                                    "--enable-unsafe-swiftshader"])
        pg = b.new_page(viewport={"width": 1200, "height": 800})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        for sid in ids:
            payload, meta, ext = render(pg, sid, a.role, a.mode)
            name = a.out or os.path.join(OUTDIR, f"{sid}-{a.role}-{a.mode}.{ext}")
            mode_flag = "w" if ext == "txt" else "wb"
            with open(name, mode_flag, **({"encoding": "utf-8"} if ext == "txt" else {})) as f:
                f.write(payload)
            size = os.path.getsize(name) / 1024
            manifest[os.path.basename(name)] = {
                "subject": sid, "role": a.role, "mode": a.mode,
                "w": meta["w"], "h": meta["h"], "pitch": meta["pitch"],
                "engine_version": meta["version"], "source": "procedural",
            }
            if ext == "png":
                from webp_derive import derive
                manifest[os.path.basename(name)]["webp"] = derive(name)
            print(f"  {meta['w']}x{meta['h']}  pitch {meta['pitch']:<3} {size:8.0f} KB  "
                  f"{os.path.relpath(name, ROOT)}")
        b.close()
    if errs:
        print("page errors:", errs[:3])

    json.dump(manifest, open(manifest_path, "w", encoding="utf-8"), indent=2, sort_keys=True)
    print(f"\nmanifest: {os.path.relpath(manifest_path, ROOT)}  ({len(manifest)} assets)")


if __name__ == "__main__":
    main()
