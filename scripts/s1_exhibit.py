"""Regenerate an exhibit from an S1, S2 or S3 statistics manifest, or check that the committed one matches.

    python scripts/s1_exhibit.py exhibits/s1/<name>/manifest.json            # write exhibit.json
    python scripts/s1_exhibit.py exhibits/s1/<name>/manifest.json --check    # prove it is current

The manifest holds an S1 spec, or with "engine": "s2" an S2 (staggered DiD) spec or "s3" an S3 (survey) spec or "s5" an S5 (forecasting) spec (its data path relative to the manifest), the clock, the expected
output hash, the figure ids the exhibit uses, and the claims the piece makes about them. The script
runs the S1 engine from the Noland Advisory Analysis checkout (NA_ANALYSIS_REPO, else the sibling
folder), reviews the claims with the engine's own claim check, and writes exhibit.json beside the
manifest: each figure's full value, display string and unit, the run's hashes and rows, and the
claim reviews (each with its drafted "Rests on" and "Assumes" rows and a standing ceiling).

--check regenerates in memory and fails if the output hash differs from the manifest, if any claim
is refused, or if exhibit.json on disk differs by a single byte. The same pattern as render_field.mjs
--check: the shipped file is provably what the source produces.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def analysis_repo() -> Path:
    env = os.environ.get("NA_ANALYSIS_REPO")
    return Path(env) if env else ROOT.parent / "Noland Advisory Analysis"


def stats_python(repo: Path) -> Path:
    venv = repo / "stats" / ".venv"
    exe = venv / "Scripts" / "python.exe" if os.name == "nt" else venv / "bin" / "python"
    if not exe.exists():
        sys.exit(f"S1 interpreter not found at {exe}; run `uv sync` in {repo / 'stats'} or set NA_ANALYSIS_REPO")
    return exe


def run_s1(exe: Path, args: list[str], cwd: Path, engine: str = "s1") -> dict:
    proc = subprocess.run([str(exe), "-m", "na_stats", "--engine", engine, *args], cwd=cwd, capture_output=True,
                          text=True, timeout=600)
    lines = [ln for ln in proc.stdout.splitlines() if ln.strip()]
    if len(lines) != 1:
        sys.exit(f"S1 printed {len(lines)} lines (exit {proc.returncode}): {proc.stderr.strip()[-600:]}")
    return json.loads(lines[0])


def build(manifest_path: Path) -> tuple[str, dict]:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    exe = stats_python(analysis_repo())
    here = manifest_path.parent
    engine = manifest.get("engine", "s1")
    with tempfile.TemporaryDirectory(prefix="s1-exhibit-") as tmp:
        spec_path = Path(tmp) / "spec.json"
        spec_path.write_text(json.dumps(manifest["spec"]), encoding="utf-8")
        out = run_s1(exe, ["--input-json", str(spec_path), "--now", manifest["now"]], cwd=here, engine=engine)
        if out["status"] != "ok":
            sys.exit(f"S1 did not fit: {json.dumps(out.get('errors', out))[:800]}")
        art = out["artifact"]
        art_path, claims_path = Path(tmp) / "artifact.json", Path(tmp) / "claims.json"
        art_path.write_text(json.dumps(art), encoding="utf-8")
        claims_path.write_text(json.dumps(manifest["claims"]), encoding="utf-8")
        reviews = run_s1(exe, ["--check-claims", str(claims_path), "--artifact-json", str(art_path)], cwd=here,
                         engine=engine)["reviews"]
    figs = {f["id"]: f for f in art["figures"]}
    missing = [i for i in manifest["figures"] if i not in figs]
    if missing:
        sys.exit(f"the run has no figures {missing}")
    exhibit = {
        "exhibit": manifest["exhibit"],
        "engine": {"name": engine, "method": art["meta"]["method"], "method_version": art["meta"]["method_version"]},
        "now": art["meta"]["now"],
        "input_hash": art["meta"]["input_hash"],
        "output_hash": art["meta"]["output_hash"],
        "rows": art["lineage"]["rows"],
        "figures": {i: {"value": figs[i]["value"], "display": figs[i]["display"], "unit": figs[i]["unit"]}
                    for i in manifest["figures"]},
        "claims": reviews,
    }
    text = json.dumps(exhibit, indent=2, ensure_ascii=False) + "\n"
    return text, {"manifest": manifest, "exhibit": exhibit}


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("manifest")
    p.add_argument("--check", action="store_true")
    a = p.parse_args()
    manifest_path = Path(a.manifest).resolve()
    text, ctx = build(manifest_path)
    target = manifest_path.parent / "exhibit.json"
    problems = []
    if ctx["exhibit"]["output_hash"] != ctx["manifest"]["expected_output_hash"]:
        problems.append(f"output hash {ctx['exhibit']['output_hash']} differs from the manifest's "
                        f"{ctx['manifest']['expected_output_hash']}")
    refused = [c["id"] for c in ctx["exhibit"]["claims"] if c["verdict"] == "refused"]
    if refused:
        problems.append(f"claims refused: {refused}")
    if a.check:
        if not target.exists() or target.read_text(encoding="utf-8") != text:
            problems.append(f"{target.relative_to(ROOT)} is not what the manifest produces; regenerate it")
        for msg in problems:
            print(f"s1 exhibit check: {msg}", file=sys.stderr)
        print("s1 exhibit check: " + ("FAILED" if problems else "ok, exhibit.json is current"))
        return 1 if problems else 0
    if problems:
        for msg in problems:
            print(f"s1 exhibit: {msg}", file=sys.stderr)
        return 1
    target.write_text(text, encoding="utf-8", newline="\n")
    print(f"wrote {target.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
