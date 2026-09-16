#!/usr/bin/env python3
"""Build lib/listIndex.data.json from the 2025 price list: WSL/WDL keys, no RMB."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "lib" / "basePrices.data.json"
OUT = ROOT / "lib" / "listIndex.data.json"


def main() -> None:
    data = json.loads(SRC.read_text(encoding="utf-8"))
    keys: list[str] = []
    octc: list[dict] = []
    seen: set[str] = set()
    for r in data["rows"]:
        if r.get("family") not in ("WSL", "WDL"):
            continue
        key = (r.get("listKey") or "").replace(" ", "")
        if not key or key in seen:
            continue
        seen.add(key)
        keys.append(key)
        octc.append(
            {
                "family": r["family"],
                "phases": r["phases"],
                "currentA": r["currentA"],
                "connection": r.get("connection") or "",
                "umKv": r["umKv"],
                "selectorSize": r.get("selectorSize") or "",
                "tapCode": r.get("tapCode") or "",
                "listKey": key,
            }
        )
    payload = {
        "source": "QS/a. Base Price List 2025.xlsx (WSL/WDL keys only, no RMB)",
        "generatedOn": data.get("generatedOn"),
        "keyCount": len(keys),
        "keys": keys,
        "octc": octc,
    }
    text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    if "listRmb" in text:
        raise SystemExit("refusing to write listRmb into listIndex")
    OUT.write_text(text, encoding="utf-8")
    print(f"wrote {OUT} keys={len(keys)}")


if __name__ == "__main__":
    main()
