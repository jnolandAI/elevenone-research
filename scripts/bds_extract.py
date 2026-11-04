"""Build exhibits/s6/demo-firm-survival/bds-firm-cohorts.csv from the Census Bureau's Business Dynamics Statistics.

    python scripts/bds_extract.py <path to bds2023_fa.csv>

Source: https://www2.census.gov/programs-surveys/bds/tables/time-series/2023/bds2023_fa.csv (US Census Bureau, public
domain), firms by year and firm age for the whole economy. The file is not committed; its sha256 is pinned here. Firm
age is reported one year at a time from 0 to 5, so a cohort born in year Y is the count at age 0 in Y, age 1 in Y + 1,
up to age 5 in Y + 5.
"""

from __future__ import annotations

import csv
import hashlib
import sys
from pathlib import Path

SHA256 = "52a36e61791aacfaedc0466a4d9b8c1c94a8b0dfbe05e967840119bf6d5695a1"
COHORTS = (2005, 2010, 2015, 2018)
AGES = ("a) 0", "b) 1", "c) 2", "d) 3", "e) 4", "f) 5")
OUT = Path(__file__).resolve().parents[1] / "exhibits" / "s6" / "demo-firm-survival" / "bds-firm-cohorts.csv"


def main(path: str) -> None:
    digest = hashlib.sha256(Path(path).read_bytes()).hexdigest()
    if digest != SHA256:
        raise SystemExit(f"the file has changed: sha256 {digest}")
    with open(path, encoding="utf-8-sig", newline="") as f:
        firms = {(int(r["year"]), r["fage"]): int(r["firms"]) for r in csv.DictReader(f) if r["firms"].isdigit()}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", newline="\n", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["cohort", "age", "firms"])
        for y in COHORTS:
            for k, age in enumerate(AGES):
                w.writerow([y, k, firms[(y + k, age)]])


if __name__ == "__main__":
    main(sys.argv[1])
