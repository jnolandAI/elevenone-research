"""Build the S3 exhibit's data from the public NHANES 2017-2018 files.

    python scripts/nhanes_extract.py <folder with DEMO_J.xpt and BMX_J.xpt>

Sources (public domain, NCHS/CDC; cite "National Center for Health Statistics, NHANES 2017-2018"):
    https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/DEMO_J.xpt
    https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/BMX_J.xpt
The XPT files are not committed. Their sha256 below is checked, so the CSV beside the manifest is provably
this script's output from those files.

Kept: examined participants (exam weight WTMEC2YR > 0), with the design variables (SDMVSTRA strata,
SDMVPSU PSUs, two per stratum and numbered 1 and 2 within each) and the variables the exhibit uses. Derived:
obese (BMI of 30 or more, adults only; children's obesity uses growth-chart percentiles, so it is blank for
them), and the domain columns adult, adult_sex and adult_race, which name the child rows "child" so that
every domain estimate on them is a subpopulation of the full design.
"""

from __future__ import annotations

import csv
import hashlib
import sys
from pathlib import Path

import pandas as pd

SHA256 = {"DEMO_J.xpt": "c0b46e0345ea19404928656277c8b0d10b0cca348a9b2fe4fc3c67e8b7ee73ec",
          "BMX_J.xpt": "8d675e42d8826ac98714b2c3dd4c5138a5e353fb4424f7eff5e6db4a01ce838a"}
OUT = Path(__file__).resolve().parents[1] / "exhibits" / "s3" / "demo-nhanes" / "nhanes-2017-2018.csv"
SEX = {1: "male", 2: "female"}
RACE = {1: "Mexican American", 2: "Other Hispanic", 3: "Non-Hispanic White", 4: "Non-Hispanic Black",
        6: "Non-Hispanic Asian", 7: "Other or multiracial"}


def main(folder: Path) -> None:
    for name, want in SHA256.items():
        got = hashlib.sha256((folder / name).read_bytes()).hexdigest()
        if got != want:
            sys.exit(f"{name}: sha256 {got} is not the pinned {want}")
    demo = pd.read_sas(folder / "DEMO_J.xpt", format="xport")
    bmx = pd.read_sas(folder / "BMX_J.xpt", format="xport")
    d = demo.merge(bmx[["SEQN", "BMXBMI"]], on="SEQN", how="left")
    # SAS transport stores 0 as 5.4e-79 once read, so "examined" is a weight above 1, not above 0.
    d = d[d["WTMEC2YR"] > 1].sort_values("SEQN")
    rows = []
    for r in d.itertuples(index=False):
        age = int(r.RIDAGEYR)
        adult = age >= 20
        bmi = None if pd.isna(r.BMXBMI) else round(float(r.BMXBMI), 1)
        rows.append({
            "seqn": int(r.SEQN), "stratum": int(r.SDMVSTRA), "psu": int(r.SDMVPSU),
            "wt_exam": repr(float(r.WTMEC2YR)), "age": age, "sex": SEX[int(r.RIAGENDR)],
            "race": RACE[int(r.RIDRETH3)], "bmi": "" if bmi is None else f"{bmi:.1f}",
            "obese": "" if (bmi is None or not adult) else ("yes" if bmi >= 30 else "no"),
            "adult": "adult" if adult else "child",
            "adult_sex": SEX[int(r.RIAGENDR)] if adult else "child",
            "adult_race": RACE[int(r.RIDRETH3)] if adult else "child",
        })
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]), lineterminator="\n")
        w.writeheader()
        w.writerows(rows)
    print(f"{len(rows)} examined participants -> {OUT}")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
