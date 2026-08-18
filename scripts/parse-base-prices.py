#!/usr/bin/env python3
"""Parse OneDrive Base Price List 2025.xlsx → lib/basePrices.data.json.

Never commit the xlsx. Safe to re-run whenever the list is updated.
"""
from __future__ import annotations

import json
import re
import sys
from datetime import date
from pathlib import Path

try:
    import openpyxl
except ImportError:
    sys.exit("need openpyxl (use /tmp/oltc-extract or pip install openpyxl)")

ONEDRIVE = (
    Path.home()
    / "Library/CloudStorage/OneDrive-上海华明电力设备制造有限公司"
    / "QS"
    / "a. Base Price List 2025.xlsx"
)
OUT = Path(__file__).resolve().parents[1] / "lib" / "basePrices.data.json"

# Sheets we care about for the public selector (standard OLTC sets).
# Skip extras / OCTC / MDU-only.
KEEP_SHEETS = {
    "CV & SV",
    "CV2",
    "CM2III",
    "CM2 II",
    "CM2 I",
    "CMIII",
    "CMII",
    "CMI",
    "SHZVIII",
    "SHZVII",
    "SHZVI",
    "SHZVG III",
    "SHZVG II",
    "SHZVG I",
    "CZ & CVT",
    "CMDIII",
    "CMDII",
    "CMDI",
    "HWV",
    "HWDK",
}

# Longest family first so CV2/CM2/SHZVG/CVIII do not split as CV+II / CVI+I.
FAM = r"(?P<family>SHZVG|SHZV|HWDK|HWV|CMD|CV2|CM2|CVT|CV|SV|CM|CZ)"
PHASE = r"(?P<phases>III|II|I)"
TAIL = (
    r"-"
    r"(?P<current>\d+)"
    r"(?P<conn>[YD])?"
    r"/"
    r"(?P<um>\d+(?:\.\d+)?)"
    r"(?P<grade>DE|B|C|D|E)?"
)

# Family, phases, current, optional Y/D, Um, optional grade, pitch dots, optional W/G/0
ROW_RE = re.compile(
    rf"^{FAM}{PHASE}{TAIL}"
    r"(?:-"
    r"(?P<pitch>\d{2})"
    r"(?:\.{2,3}|…)"
    r"(?P<reg>[WG0])?"
    r")?"
    r"$",
    re.I,
)

# HWV / HWDK list rows carry a full tap code (usually 18353W)
FULL_RE = re.compile(
    rf"^{FAM}{PHASE}{TAIL}"
    r"-"
    r"(?P<tap>\d{5}[WG0]?)$",
    re.I,
)

# CZ list is 3× singles with a linear position count, not pitch-dots.
CZ_RE = re.compile(
    r"^(?:(?P<units>\d+)[x×])?CZ(?P<phases>III|II|I)-"
    r"(?P<current>\d+)/"
    r"(?P<um>\d+(?:\.\d+)?)-"
    r"(?P<pos>\d+)$",
    re.I,
)

# CVT list uses a bare position count (7/9/13).
CVT_RE = re.compile(
    r"^CVT(?P<phases>III|II|I)-"
    r"(?P<current>\d+)"
    r"(?P<conn>[YD])?/"
    r"(?P<um>\d+(?:\.\d+)?)-"
    r"(?P<pos>\d+)$",
    re.I,
)


def cells(row) -> list:
    return [c.value for c in row]


def first_str(vals) -> str | None:
    for v in vals:
        if isinstance(v, str) and v.strip():
            return v.strip()
    return None


def first_num(vals) -> float | None:
    for v in vals:
        if isinstance(v, (int, float)) and not isinstance(v, bool):
            if v > 0:
                return float(v)
    return None


def parse_label(raw: str) -> dict | None:
    s = re.sub(r"\s+", "", raw)
    s = s.replace("×", "x")
    s = s.replace("…", "...").replace("..", "...")
    s = re.sub(r"\.{2,}", "...", s)
    m = CZ_RE.match(s)
    if m:
        d = m.groupdict()
        return {
            "family": "CZ",
            "phases": d["phases"].upper(),
            "currentA": int(d["current"]),
            "connection": "",
            "umKv": float(d["um"]),
            "selectorSize": "",
            "pitch": None,
            "changeOver": "0",
            "listKey": s,
            "tapCode": d["pos"],
            "unitCount": int(d["units"] or 1),
        }
    m = CVT_RE.match(s)
    if m:
        d = m.groupdict()
        return {
            "family": "CVT",
            "phases": d["phases"].upper(),
            "currentA": int(d["current"]),
            "connection": (d.get("conn") or "").upper(),
            "umKv": float(d["um"]),
            "selectorSize": "",
            "pitch": None,
            "changeOver": "0",
            "listKey": s,
            "tapCode": d["pos"],
            "unitCount": 1,
        }
    m = FULL_RE.match(s) or ROW_RE.match(s)
    if not m:
        return None
    d = m.groupdict()
    family = d["family"].upper()
    pitch = None
    change_over = None
    tap = d.get("tap")
    if tap:
        pitch = int(tap[:2])
        last = tap[-1].upper()
        # 10070 / 18353W / missing letter: linear is 0, never leave null
        change_over = last if last in "WG0" else "0"
    else:
        if d.get("pitch"):
            pitch = int(d["pitch"])
        reg = (d.get("reg") or "").upper()
        if reg in ("W", "G", "0"):
            change_over = reg
        elif pitch is not None:
            # CV2 writes linear as 10... (no trailing 0)
            change_over = "0"
        else:
            change_over = None
    return {
        "family": family,
        "phases": d["phases"].upper(),
        "currentA": int(d["current"]),
        "connection": (d.get("conn") or "").upper(),
        "umKv": float(d["um"]),
        "selectorSize": (d.get("grade") or "").upper(),
        "pitch": pitch,
        "changeOver": change_over,
        "listKey": s,
        "tapCode": tap or "",
        "unitCount": 1,
    }


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else ONEDRIVE
    if not src.exists():
        sys.exit(f"missing price list: {src}")

    wb = openpyxl.load_workbook(src, data_only=True, read_only=True)
    rows: list[dict] = []
    skipped_sheets: list[str] = []
    unread_labels = 0

    for name in wb.sheetnames:
        if name not in KEEP_SHEETS:
            skipped_sheets.append(name)
            continue
        ws = wb[name]
        for row in ws.iter_rows(max_col=8):
            vals = cells(row)
            label = first_str(vals)
            if not label:
                continue
            parsed = parse_label(label)
            if not parsed:
                continue
            price = first_num(vals[1:])  # never treat the model cell as the price
            if price is None:
                unread_labels += 1
                continue
            parsed["listRmb"] = int(round(price))
            parsed["sheet"] = name
            parsed["includesMdu"] = True  # standard set; HWV already includes MDU
            rows.append(parsed)
    wb.close()

    # Dedupe exact listKey, keep first
    seen: set[str] = set()
    unique: list[dict] = []
    for r in rows:
        k = r["listKey"]
        if k in seen:
            continue
        seen.add(k)
        unique.append(r)

    payload = {
        "source": "QS/a. Base Price List 2025.xlsx",
        "generatedOn": date.today().isoformat(),
        "currency": "CNY",
        "incoterm": "FOB Shanghai",
        "includesMdu": True,
        "rowCount": len(unique),
        "skippedSheets": skipped_sheets,
        "headerRowsWithoutPrice": unread_labels,
        "rows": unique,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    print(f"wrote {OUT} ({len(unique)} rows, {unread_labels} headers, skipped {skipped_sheets})")


if __name__ == "__main__":
    main()
