"""Build exhibits/s5/demo-retail/mrts-retail-food.csv from the Census Bureau's Monthly Retail Trade workbook.

    python scripts/mrts_extract.py <path to mrtssales92-present.xlsx>

Source: https://www.census.gov/retail/mrts/www/mrtssales92-present.xlsx (US Census Bureau, public domain). The
workbook is not committed; its sha256 is pinned here. The series is "Retail and food services sales, total", NOT
ADJUSTED, in millions of dollars, monthly from January 1992. The workbook has one sheet per year.
"""

from __future__ import annotations

import csv
import hashlib
import re
import sys
from pathlib import Path

import openpyxl

SHA256 = "190d718b853613163d3e9c3b5fe4444966ac3a7d908b60f0526df8692ccb6119"
ROW = "Retail and food services sales, total"
MONTHS = {m: i + 1 for i, m in enumerate(("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov",
                                          "Dec"))}
OUT = Path(__file__).resolve().parents[1] / "exhibits" / "s5" / "demo-retail" / "mrts-retail-food.csv"


def main(path: str) -> None:
    digest = hashlib.sha256(Path(path).read_bytes()).hexdigest()
    if digest != SHA256:
        raise SystemExit(f"the workbook has changed: sha256 {digest}")
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    rows: list[tuple[str, float]] = []
    for name in wb.sheetnames:
        header = None
        adjusted = None
        for r in wb[name].iter_rows(values_only=True):
            if header is None and any(isinstance(c, str) and re.match(r"^[A-Z][a-z]{2}\.? ?\d{4}", c) for c in r):
                header = r
            label = r[1] if len(r) > 1 else None
            if label == "NOT ADJUSTED":
                adjusted = False
            elif label == "ADJUSTED(2)" or (isinstance(label, str) and label.startswith("ADJUSTED")):
                adjusted = True
            if label == ROW and adjusted is False:
                for head, v in zip(header, r):
                    m = re.match(r"^([A-Z][a-z]{2})\.? ?(\d{4})", head) if isinstance(head, str) else None
                    if m and isinstance(v, (int, float)):
                        rows.append((f"{m[2]}-{MONTHS[m[1]]:02d}", float(v)))
                break
    rows.sort()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, "w", newline="\n", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["month", "sales"])
        w.writerows((p, repr(v)) for p, v in rows)
    print(len(rows), rows[0], rows[-1])


if __name__ == "__main__":
    main(sys.argv[1])
