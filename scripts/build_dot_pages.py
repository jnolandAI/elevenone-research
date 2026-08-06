"""
Build the dot imagery pages.

Both the tuning foundry and the headless render page are assembled from the same
prototypes/dot-engine.js, so a scene added in one place appears in both. Three.js
ships as an ES module with a single trailing export block and no aliases, which
converts cleanly to a classic script; inlining it removes every subresource
request, so the pages work from disk and behind the brainstorm server alike.

    python scripts/build_dot_pages.py
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROTO = os.path.join(ROOT, "prototypes")
ENGINE = os.path.join(PROTO, "dot-engine.js")


def find_three():
    for base in (PROTO, os.path.join(ROOT, ".superpowers")):
        for root, _dirs, files in os.walk(base):
            if "three.module.js" in files:
                return os.path.join(root, "three.module.js")
    return None


def three_classic(path):
    src = open(path, encoding="utf-8").read()
    m = re.search(r"^export \{(.+?)\};\s*$", src, re.M | re.S)
    if not m:
        sys.exit("three.module.js: expected exactly one trailing export block")
    names = [n.strip() for n in m.group(1).split(",") if n.strip()]
    if any(" as " in n for n in names):
        sys.exit("three.module.js: aliased exports need different handling")
    return ("(function(){\n" + src[: m.start()]
            + "\nwindow.THREE = {" + ", ".join(names) + "};\n})();\n"), len(names)


def build(template_path, out_path, three_js, engine_js):
    tpl = open(template_path, encoding="utf-8").read()
    payload = "<script>\n" + three_js + "</script>\n<script>\n" + engine_js + "</script>"
    if "<!--__ENGINE__-->" in tpl:
        page = tpl.replace("<!--__ENGINE__-->", payload)
    else:
        sys.exit(f"{os.path.basename(template_path)}: no <!--__ENGINE__--> marker")
    open(out_path, "w", encoding="utf-8").write(page)
    return len(page.encode("utf-8"))


def main():
    tp = find_three()
    if not tp:
        sys.exit("three.module.js not found. Download it into prototypes/ first:\n"
                 "  curl -sL https://unpkg.com/three@0.160.0/build/three.module.js "
                 "-o prototypes/three.module.js")
    three_js, n = three_classic(tp)
    engine_js = open(ENGINE, encoding="utf-8").read()
    print(f"three.js exports converted: {n}")

    here = os.path.dirname(os.path.abspath(__file__))
    targets = [
        (os.path.join(here, "templates", "dot-foundry.tpl.html"),
         os.path.join(PROTO, "dot-foundry.html")),
        (os.path.join(here, "templates", "dot-render.tpl.html"),
         os.path.join(PROTO, "dot-render.html")),
    ]
    for tpl, out in targets:
        if not os.path.exists(tpl):
            print(f"  skip (no template): {os.path.basename(tpl)}")
            continue
        size = build(tpl, out, three_js, engine_js)
        print(f"  wrote {os.path.relpath(out, ROOT)}  {size/1024/1024:.2f} MB")


if __name__ == "__main__":
    main()
