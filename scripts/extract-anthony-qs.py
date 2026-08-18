#!/usr/bin/env python3
"""Extract Anthony QS PDFs into structured JSON (scratch + fixture source).

Does not commit OneDrive files. Writes /tmp/anthony-extract/*.json.
"""
from __future__ import annotations

import json
import math
import re
import unicodedata
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from pypdf import PdfReader

SRC = Path(
    "/Users/youming/Library/CloudStorage/"
    "OneDrive-上海华明电力设备制造有限公司/QS/Anthony"
)
OUT = Path("/tmp/anthony-extract")
RAW = OUT / "raw"
INDEX = SRC / "_index-2026.json"

SQRT3 = math.sqrt(3)

# Catalogue tap diagrams the engine can emit (lib/tapCode.ts).
W_TAPS = {
    "10091W": (4, 1),
    "12111W": (5, 1),
    "14131W": (6, 1),
    "16151W": (7, 1),
    "18171W": (8, 1),
    "10191W": (9, 1),
    "12231W": (11, 1),
    "14271W": (13, 1),
    "16311W": (15, 1),
    "18351W": (17, 1),
    "10193W": (8, 3),
    "12233W": (10, 3),
    "14273W": (12, 3),
    "16313W": (14, 3),
    "18353W": (16, 3),
}
G_TAPS = {
    "10191G": (9, 1),
    "12231G": (11, 1),
    "14271G": (13, 1),
    "16311G": (15, 1),
    "18351G": (17, 1),
    "10193G": (8, 3),
    "12233G": (10, 3),
    "14273G": (12, 3),
    "16313G": (14, 3),
    "18353G": (16, 3),
}

# Catalogue I / Ust maxima that must not be treated as transformer duty.
CAT_I = {350, 400, 500, 600, 700, 800, 1000, 1200, 1300, 1500, 1600, 2000, 2400, 3000}
CAT_UST = {525, 660, 700, 800, 1000, 1400, 1500, 1600, 2000, 2200, 2600, 3000, 3300, 3500, 4000}

FAMILIES = (
    "SHZVG",
    "SHZV",
    "HWDK",
    "HWV",
    "CMD",
    "CM2",
    "CM",
    "CVT",
    "CV2",
    "CV",
    "SV",
    "CZ",
    "WSL",
    "WDL",
    "WSG",
)

MODEL_RE = re.compile(
    r"(?i)(?:(\d+)\s*[x×X]\s*)?"
    r"(SHZVG|SHZV|HWDK|HWV|CMD|CM2|CM|CVT|CV2|CV|SV|CZ|WSL|WDL|WSG)"
    r"\s*(IV|III|II|I)?"
    r"\s*-?\s*"
    r"(\d+(?:\.\d+)?)"
    r"\s*([YDyd])?"
    r"\s*/?\s*"
    r"(\d+(?:[.,]\d+)?)?"
    r"\s*([BCDE]{1,2})?"
    r"\s*-?\s*"
    r"(\d{4,5}[WG0]?|\d{1,2}(?:x\d{1,2}[A-Z]?)?)?",
)

QS_BODY_RE = re.compile(
    r"Quotation\s*No\.?\s*:?\s*QS\s*-?\s*(\d{6,7})\s*(?:[-–]?\s*R\s*(\d+)|[-–]?\s*(Budgetary))?",
    re.I,
)
QS_ANY_RE = re.compile(r"QS\s*-?\s*(\d{6,7})\s*(?:[-–_]?\s*R\s*(\d+))?", re.I)
QS_FILE_RE = re.compile(r"QS\s*-?\s*(\d{6,7})\s*(?:[-–_]?\s*R\s*(\d+))?", re.I)


def nfkc(s: str) -> str:
    s = unicodedata.normalize("NFKC", s)
    # Sinhala-looking PDF encoding of ASCII i/I
    s = s.replace("ඈ", "i").replace("ඉ", "I")
    s = s.replace("\u00a0", " ").replace("\u200b", "")
    s = s.replace("∗", "x").replace("×", "x").replace("*", "x")
    s = s.replace("–", "-").replace("—", "-").replace("−", "-")
    return s


def model_blob(s: str) -> str:
    """Normalize a type string; 72,5 → 72.5 but keep thousands out of this path."""
    s = nfkc(s)
    s = s.replace(",", ".")
    return s


def extract_text(path: Path) -> tuple[str, str | None]:
    try:
        reader = PdfReader(str(path))
        pages = []
        for pg in reader.pages:
            pages.append(pg.extract_text() or "")
        text = "\n".join(pages)
        if not text.strip():
            return "", "empty text (likely scan)"
        return text, None
    except Exception as e:  # noqa: BLE001
        return "", f"{type(e).__name__}: {e}"


def parse_qs_from_name(name: str) -> tuple[str, int]:
    m = QS_FILE_RE.search(name.replace(" ", ""))
    if not m:
        m = QS_FILE_RE.search(name)
    if not m:
        return "", 0
    qs = m.group(1)
    rev = int(m.group(2)) if m.group(2) else 0
    # Filename like QS-260183R1 (rev glued)
    glued = re.search(rf"QS-?{qs}R(\d+)", name.replace(" ", ""), re.I)
    if glued and not m.group(2):
        rev = int(glued.group(1))
    return qs, rev


def file_date(name: str, mtime: float) -> str:
    m = re.match(r"(20\d{2}-\d{2}-\d{2})", name)
    if m:
        return m.group(1)
    return datetime.fromtimestamp(mtime).strftime("%Y-%m-%d")


def file_uid(name: str) -> int:
    m = re.search(r"UID(\d+)", name, re.I)
    return int(m.group(1)) if m else 0


def strip_mdu(model: str) -> str:
    s = re.sub(
        r"\s*\+\s*(CMA7|CMA\s*7|SHM-?D|SHM-?DA|SHM-?KX|HMIET|HMJK-?II|ET-SZ6)\b",
        "",
        model,
        flags=re.I,
    )
    s = re.sub(r"\s*c/?w\s+.*$", "", s, flags=re.I)
    return s.strip(" -+/")


def normalize_model(raw: str) -> str | None:
    if not raw:
        return None
    s = model_blob(raw)
    s = strip_mdu(s)
    s = re.sub(r"\s+", "", s)
    s = s.replace("CM2-III", "CM2III").replace("CV2-III", "CV2III")
    s = s.replace("CM-III", "CMIII").replace("CV-III", "CVIII")
    s = s.replace("SHZV-III", "SHZVIII").replace("HWV-III", "HWVIII")
    s = re.sub(r"(III|II|I)(\d)", r"\1-\2", s)
    s = re.sub(r"(\d(?:\.\d+)?)([BCDE]{1,2})-", r"\1\2-", s)
    s = re.sub(
        r"(CV2|CV|SV|CM2|CM|SHZV|SHZVG|HWV)(III|II|I)-(\d+)([YD])(\d)",
        r"\1\2-\3\4/\5",
        s,
    )
    return s or None


# Strict commercial type (requires Um and a 4–5 digit tap).
STRICT_MODEL_RE = re.compile(
    r"(?i)(?:(\d+)\s*[x×X]\s*)?"
    r"(SHZVG|SHZV|HWDK|HWV|CMD|CM2|CM|CVT|CV2|CV|SV|CZ)"
    r"\s*-?\s*(III|II|I)"
    r"\s*-?\s*"
    r"(\d{2,5})"
    r"\s*([YDyd])?"
    r"\s*/\s*"
    r"(\d+(?:[.,]\d+)?)"
    r"\s*([BCDE]{1,2})?"
    r"\s*-\s*"
    r"(\d{4,5}[WG0]?)",
)

# Filename style without slash: CV2III350D-40.5-10193W
FILE_MODEL_RE = re.compile(
    r"(?i)(?:(\d+)\s*[x×X]\s*)?"
    r"(SHZVG|SHZV|HWDK|HWV|CMD|CM2|CM|CVT|CV2|CV|SV|CZ)"
    r"\s*-?\s*(III|II|I)"
    r"\s*-?\s*"
    r"(\d{2,5})"
    r"\s*([YDyd])"
    r"\s*-\s*"
    r"(\d+(?:[.,]\d+)?)"
    r"\s*([BCDE]{1,2})?"
    r"\s*-\s*"
    r"(\d{4,5}[WG0]?)",
)

OCTC_RE = re.compile(
    r"(?i)(?:(\d+)\s*[x×X]\s*)?"
    r"(WSL|WDL|WSG)\s*(IV|III|II|I)?"
    r"\s*-?\s*(\d+)\s*([YDyd])?\s*/?\s*(\d+(?:[.,]\d+)?)?",
)


def parse_model_string(raw: str) -> dict | None:
    if not raw:
        return None
    s = model_blob(strip_mdu(raw))
    m = STRICT_MODEL_RE.search(s)
    if not m:
        m = FILE_MODEL_RE.search(s)
    if m:
        unit = int(m.group(1)) if m.group(1) else 1
        fam = m.group(2).upper()
        phases = (m.group(3) or "").upper()
        current = float(m.group(4))
        conn = (m.group(5) or "").upper()
        um = float(m.group(6).replace(",", ".")) if m.group(6) else None
        grade = (m.group(7) or "").upper()
        tap = (m.group(8) or "").upper()
        return {
            "unitCount": unit,
            "family": fam,
            "phases": phases,
            "currentA": int(current) if current == int(current) else current,
            "connection": conn,
            "umKv": um,
            "selectorSize": grade,
            "tapCode": tap,
            "raw": raw,
        }
    m = OCTC_RE.search(s)
    if m:
        return {
            "unitCount": int(m.group(1)) if m.group(1) else 1,
            "family": m.group(2).upper(),
            "phases": (m.group(3) or "").upper(),
            "currentA": float(m.group(4)),
            "connection": (m.group(5) or "").upper(),
            "umKv": float(m.group(6).replace(",", ".")) if m.group(6) else None,
            "selectorSize": "",
            "tapCode": "",
            "raw": raw,
        }
    # Loose fallback only for CZ position-count types (3xCZI-500-40.5-17)
    m = re.search(
        r"(?i)(?:(\d+)\s*[x×X]\s*)?(CZ)\s*(I|III)\s*-?\s*(\d+)\s*-?\s*/?\s*(\d+(?:[.,]\d+)?)\s*-?\s*(\d{1,2})\b",
        s,
    )
    if not m:
        return None
    return {
        "unitCount": int(m.group(1)) if m.group(1) else 1,
        "family": "CZ",
        "phases": m.group(3).upper(),
        "currentA": int(float(m.group(4))),
        "connection": "",
        "umKv": float(m.group(5).replace(",", ".")),
        "selectorSize": "",
        "tapCode": m.group(6),
        "raw": raw,
    }


def commercial_style(p: dict) -> str | None:
    fam = p["family"]
    if fam in {"WSL", "WDL", "WSG"}:
        return None
    phases = p["phases"] or "III"
    cur = p["currentA"]
    conn = p["connection"]
    um = p["umKv"]
    grade = p["selectorSize"]
    tap = p["tapCode"] or ""
    if um is None:
        return None
    um_s = str(int(um)) if float(um) == int(um) else str(um)
    token = f"{um_s}{grade}" if grade else um_s
    if fam == "CZ":
        core = f"{fam}{phases}-{cur}/{um_s}-{tap}" if tap else f"{fam}{phases}-{cur}/{um_s}"
    elif conn:
        core = f"{fam}{phases}-{cur}{conn}/{token}-{tap}" if tap else f"{fam}{phases}-{cur}{conn}/{token}"
    else:
        core = f"{fam}{phases}-{cur}/{token}-{tap}" if tap else f"{fam}{phases}-{cur}/{token}"
    if p["unitCount"] > 1:
        return f"{p['unitCount']}x{core}"
    return core


def header_block(text: str) -> str:
    # First page-ish until PRICE / TECHNICAL DATA
    cut = re.search(
        r"(1\.\s*(PRICE|The price)|OLTC TECHNICAL DATA|PRICE SCHEDULE|PRICE OF OLTC)",
        text,
        re.I,
    )
    return text[: cut.start()] if cut else text[:2500]


def model_rank(p: dict) -> tuple:
    tap = (p.get("tapCode") or "").upper()
    good_tap = tap in W_TAPS or tap in G_TAPS or bool(re.fullmatch(r"\d{4,5}0", tap))
    return (
        0 if p.get("commercial") else 1,
        0 if good_tap else 1,
        0 if p.get("umKv") else 1,
        0 if p["family"] not in {"WSL", "WDL", "WSG"} else 1,
        0 if p["currentA"] >= 50 else 1,
    )


def find_models(text: str, filename: str) -> list[dict]:
    found: list[dict] = []
    seen = set()
    header = header_block(text)
    labeled = []
    for rx in (
        r"(?:OLTC\s+)?Models?\s*:?\s*([^\n]+(?:\n[^\n]+)?)",
        r"HM OLTC MODELS:\s*([^\n]+(?:\n[^\n]+)?)",
        r"MODEL:\s*([^\n]+)",
    ):
        for m in re.finditer(rx, header, re.I):
            labeled.append(m.group(1))
    search_blobs = labeled + [header[:2000], filename]
    tm = re.search(r"No\.\s*Model\s+([A-Z0-9xX /.\-+]+)", text)
    if tm:
        search_blobs.append(tm.group(1))
    for blob in search_blobs:
        for raw_line in re.split(r"[\n;]", blob):
            p = parse_model_string(raw_line)
            if not p:
                continue
            if p["family"] in {"CV", "CM", "SV", "CV2", "CM2"} and p["currentA"] < 50:
                continue
            key = (
                p["family"],
                p["phases"],
                p["currentA"],
                p["connection"],
                p["umKv"],
                p["tapCode"],
                p["unitCount"],
            )
            if key in seen:
                continue
            seen.add(key)
            p["commercial"] = commercial_style(p)
            found.append(p)
    found.sort(key=model_rank)
    return found


def _floats_from_slash(g0, g1, g2) -> list[float]:
    out = []
    for g in (g0, g1, g2):
        if g:
            out.append(float(g.replace(",", ".")))
    return out


def parse_kva_mva(blob: str) -> list[float]:
    mvas: list[float] = []
    # 50,000 kVA / 18500kVA / 7 000 kVA
    for mm in re.finditer(
        r"(\d{1,3}(?:,\d{3})+|\d{4,7}|\d+(?:\.\d+)?)\s*kVA\b",
        blob,
        re.I,
    ):
        raw = mm.group(1).replace(",", "")
        kva = float(raw)
        if 200 <= kva <= 2_000_000:
            mvas.append(kva / 1000.0)
    for mm in re.finditer(
        r"(\d+(?:\.\d+)?)\s*(?:/\s*(\d+(?:\.\d+)?))?(?:\s*/\s*(\d+(?:\.\d+)?))?\s*MVA\b",
        blob,
        re.I,
    ):
        mvas.extend(_floats_from_slash(*mm.groups()))
    return mvas


def parse_step(blob: str) -> tuple[float | None, float | None]:
    step_pct = None
    plus_minus = None
    # 17 positions x 1.65% per step   /  21 steps x 1.25% per step
    mm = re.search(
        r"(\d+(?:[.,]\d+)?)\s*%\s*per\s*step",
        blob,
        re.I,
    )
    if mm:
        step_pct = float(mm.group(1).replace(",", "."))
    # ±8 x 1.25%   +/-8 x 1.25%   +8/-8 x 1.25%   +8%-16% x 1.25%
    if step_pct is None:
        mm = re.search(
            r"(?:±|\+/-|\+/?-|plus/?minus)?"
            r"\s*\d+(?:[.,]\d+)?\s*%?"
            r"(?:\s*/\s*-?\s*\d+(?:[.,]\d+)?\s*%?)?"
            r"\s*[xX]\s*(\d+(?:[.,]\d+)?)\s*%",
            blob,
        )
        if mm:
            step_pct = float(mm.group(1).replace(",", "."))
    mm = re.search(
        r"(?:±|\+/-|\+/?-)\s*(\d+(?:[.,]\d+)?)\s*[xX]",
        blob,
    )
    if mm:
        plus_minus = float(mm.group(1).replace(",", "."))
    if plus_minus is None:
        mm = re.search(r"(\d+(?:[.,]\d+)?)\s*[xX]\s*\d+(?:[.,]\d+)?\s*%", blob)
        if mm:
            plus_minus = float(mm.group(1).replace(",", "."))
    # +/-16 x 0.625   (missing % sign)
    if step_pct is None:
        mm = re.search(
            r"(?:±|\+/-|\+/?-)\s*(\d+)\s*[xX]\s*(0\.\d+)\b",
            blob,
        )
        if mm:
            plus_minus = plus_minus or float(mm.group(1))
            step_pct = float(mm.group(2))
    # ±10% over N positions/steps (no per-step stated): +/- x 10%, 17 steps
    if step_pct is None:
        mm = re.search(
            r"(?:±|\+/-|\+/?-)\s*[xX]?\s*(\d+(?:[.,]\d+)?)\s*%[^%]{0,30}?(\d+)\s*(?:steps|positions)",
            blob,
            re.I,
        )
        if mm:
            span = 2 * float(mm.group(1).replace(",", "."))
            n = int(mm.group(2))
            step_pct = round(span / max(n - 1, 1), 4)
    # +15%-10%, 11 positions
    if step_pct is None:
        mm = re.search(
            r"\+(\d+(?:[.,]\d+)?)\s*%\s*-\s*(\d+(?:[.,]\d+)?)\s*%"
            r"[^%]{0,40}?(\d+)\s*(?:positions|steps)",
            blob,
            re.I,
        )
        if mm:
            span = float(mm.group(1).replace(",", ".")) + float(
                mm.group(2).replace(",", ".")
            )
            n = int(mm.group(3))
            step_pct = round(span / max(n - 1, 1), 4)
    # Range + step count: -20% to +6%, 27 steps → 26 intervals
    if step_pct is None:
        mm = re.search(
            r"([+\-]?\s*\d+(?:[.,]\d+)?)\s*%\s*to\s*([+\-]?\s*\d+(?:[.,]\d+)?)\s*%"
            r"[^%]{0,40}?(\d+)\s*(?:steps|positions)",
            blob,
            re.I,
        )
        if not mm:
            mm = re.search(
                r"-\s*(\d+(?:[.,]\d+)?)\s*%\s*to\s*\+\s*(\d+(?:[.,]\d+)?)\s*%"
                r"[^%]{0,40}?(\d+)\s*(?:steps|positions)",
                blob,
                re.I,
            )
            if mm:
                lo, hi, n = float(mm.group(1).replace(",", ".")), float(
                    mm.group(2).replace(",", ".")
                ), int(mm.group(3))
                span = lo + hi
                intervals = max(n - 1, 1)
                step_pct = round(span / intervals, 4)
        else:
            a = float(re.sub(r"\s+", "", mm.group(1)).replace(",", "."))
            b = float(re.sub(r"\s+", "", mm.group(2)).replace(",", "."))
            n = int(mm.group(3))
            span = abs(a) + abs(b) if a * b <= 0 else abs(a - b)
            intervals = max(n - 1, 1)
            step_pct = round(span / intervals, 4)
    return step_pct, plus_minus


def parse_transformer(text: str, filename: str) -> dict:
    header = header_block(text)
    tline = ""
    for rx in (
        r"Auot-?Transformer\s*:?\s*([^\n]+)",
        r"Auto-?Transformer\s*:?\s*([^\n]+)",
        r"TRANSFORMER\s*:?\s*([^\n]+)",
        r"Transformer\s*:?\s*([^\n]+)",
    ):
        m = re.search(rx, header, re.I)
        if m:
            tline = m.group(1).strip()
            if tline and tline.upper() not in {"TBA", "N/A", "-", "TBA."}:
                break
    # Second transformer line (e.g. 10 MVA sister unit)
    extra_lines = [tline]
    for m in re.finditer(
        r"(?:Transformer|MVA)[^\n]{0,80}",
        header,
        re.I,
    ):
        extra_lines.append(m.group(0))
    duty_blob = nfkc(" ".join(extra_lines))
    # Do NOT mine Inquiry Ref for MVA when a real transformer line exists
    # (Inquiry "20MVA Cambodia" overstated a 7 MVA unit).
    if not tline or tline.upper() in {"TBA", "N/A", "-"}:
        duty_blob = nfkc(header[:1800] + " " + filename)

    mvas = parse_kva_mva(duty_blob)
    # "200MVA, 225kVA" is a 225 kV typo, not 0.225 MVA
    for mm in re.finditer(
        r"(\d+(?:\.\d+)?)\s*MVA\s*[,/]\s*(\d+(?:\.\d+)?)\s*kVA\b",
        duty_blob,
        re.I,
    ):
        kv = float(mm.group(2))
        if 10 <= kv <= 800:
            # strip the bogus kVA-as-MVA
            mvas = [x for x in mvas if abs(x - kv / 1000.0) > 1e-6]
    from_mva_token = bool(re.search(r"\bMVA\b", duty_blob, re.I))
    if from_mva_token:
        mvas = [x for x in mvas if x >= 1.0]
    mvas = [x for x in mvas if 0.2 <= x <= 2000]

    kvs: list[float] = []
    for mm in re.finditer(
        r"(\d+(?:\.\d+)?)\s*(?:/\s*(\d+(?:\.\d+)?))?(?:\s*/\s*(\d+(?:\.\d+)?))?\s*kV\b",
        duty_blob,
        re.I,
    ):
        for g in mm.groups():
            if g:
                v = float(g)
                if 3 <= v <= 800:
                    kvs.append(v)
    # (33-11) kV
    for mm in re.finditer(
        r"\((\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\)\s*kV",
        duty_blob,
        re.I,
    ):
        kvs.extend([float(mm.group(1)), float(mm.group(2))])
    # 35±8x1.25%/6.3kV  or  35kV±8
    for mm in re.finditer(
        r"(\d+(?:\.\d+)?)\s*(?:kV)?\s*(?:±|\+/-)",
        duty_blob,
        re.I,
    ):
        v = float(mm.group(1))
        if 6 <= v <= 800:
            kvs.append(v)
    # 200MVA, 225kVA (kV mistype)
    for mm in re.finditer(
        r"(\d+(?:\.\d+)?)\s*MVA\s*[,/]\s*(\d+(?:\.\d+)?)\s*kVA\b",
        duty_blob,
        re.I,
    ):
        kv = float(mm.group(2))
        if 10 <= kv <= 800:
            kvs.append(kv)

    step_pct, plus_minus = parse_step(duty_blob)
    return {
        "line": tline,
        "mvas": mvas,
        "kvs": kvs,
        "stepPct": step_pct,
        "plusMinusFromDuty": plus_minus,
    }


def pick_winding_kv(kvs: list[float], um: float | None, conn: str) -> float | None:
    if not kvs:
        return None
    uniq = sorted(set(kvs), reverse=True)
    if um is None:
        return uniq[0]
    if conn == "D":
        below = [v for v in uniq if v <= um + 0.1]
        return below[0] if below else uniq[0]
    # Y: HV (largest)
    return uniq[0]


def compute_duty(tr: dict, model: dict | None, phases: str) -> dict:
    s = max(tr["mvas"]) if tr["mvas"] else None
    um = model["umKv"] if model else None
    conn = (model["connection"] if model else "") or "Y"
    u = pick_winding_kv(tr["kvs"], um, conn)
    i = None
    ust = None
    if s and u:
        # 3-phase bank current (also the per-phase I for 3× singles on a 3ph transformer)
        i = (s * 1e6) / (SQRT3 * u * 1000)
    if tr["stepPct"] is not None and u:
        if conn == "D":
            ust = (tr["stepPct"] / 100.0) * u * 1000
        else:
            ust = (tr["stepPct"] / 100.0) * (u * 1000 / SQRT3)
    return {
        "sMva": s,
        "uKv": u,
        "iA": round(i, 1) if i else None,
        "ustV": round(ust, 1) if ust else None,
        "stepPct": tr["stepPct"],
        "plusMinusDuty": tr["plusMinusFromDuty"],
    }


def tap_geometry(tap: str) -> dict | None:
    if not tap:
        return None
    t = tap.upper()
    if t in W_TAPS:
        n, mid = W_TAPS[t]
        return {"plusMinus": n, "mid": mid, "regulation": "reversing", "tap": t}
    if t in G_TAPS:
        n, mid = G_TAPS[t]
        return {"plusMinus": n, "mid": mid, "regulation": "coarse_fine", "tap": t}
    m = re.fullmatch(r"(\d{2})(\d{2})(\d)([WG0]?)", t)
    if m:
        pitch, pos, mid_s, co = m.groups()
        mid = int(mid_s)
        if co == "0" or (co == "" and mid == 0):
            return {
                "plusMinus": None,
                "mid": 0,
                "regulation": "linear",
                "tap": t,
                "positions": int(pos),
                "pitch": int(pitch),
            }
    # linear short codes 10070 / 10090 / 12120 / 12110
    m = re.fullmatch(r"(\d{2})(\d{2})0", t)
    if m:
        return {
            "plusMinus": None,
            "mid": 0,
            "regulation": "linear",
            "tap": t,
            "positions": int(m.group(2)),
            "pitch": int(m.group(1)),
        }
    return None


def customer_project(text: str) -> tuple[str, str]:
    header = header_block(text)
    inquiry = ""
    project = ""
    m = re.search(r"Inquiry\s+from\s*:?\s*([^\n]+?)(?:\s+Date of|$)", header, re.I)
    if m:
        inquiry = re.sub(r"\s+", " ", m.group(1)).strip(" :")
        inquiry = re.split(r"\s+Date\b", inquiry, maxsplit=1)[0].strip()
    m = re.search(r"Project\s*:?\s*([^\n]+)", header, re.I)
    if m:
        project = re.sub(r"\s+", " ", m.group(1)).strip(" :")
    if not project:
        m = re.search(r"Inquiry\s+Ref\s*:?\s*([^\n]+)", header, re.I)
        if m:
            project = re.sub(r"\s+", " ", m.group(1)).strip(" :")
    return inquiry, project


def is_budgetary(name: str, text: str) -> bool:
    blob = name + " " + header_block(text)
    return bool(re.search(r"budgetary", blob, re.I))


def skip_reason(models: list[dict], duty: dict, text: str, filename: str) -> str | None:
    blob = (filename + " " + header_block(text)).upper()
    fams = {m["family"] for m in models}
    if any(f in {"WSL", "WDL", "WSG"} for f in fams) or re.search(
        r"\b(WSL|WDL|WSG|OCTC)\b", blob
    ):
        return "WSL/WDL/OCTC (de-energized). Out of OLTC engine scope."
    if re.search(r"CMA7.?REPLACEMENT|MDU REPLACEMENT|SHM-KX AVR", blob) and not any(
        m["family"] in {"CV2", "CV", "CM2", "CM", "SHZV", "SHZVG", "HWV", "SV"}
        for m in models
    ):
        return "MDU-only (CMA7/SHM-D/SHM-KX replacement). Selector does not pick drives."
    if not models:
        if re.search(r"\b(CMA7|SHM-D|SHM-KX)\b", blob) and not re.search(
            r"\b(CV2|CM2|SHZV|HWV|CVIII|SVIII)\b", blob
        ):
            return "MDU-only (CMA7/SHM-D/SHM-KX replacement). Selector does not pick drives."
        return "incomplete duty / no OLTC model parsed"
    if any(m["family"] in {"CZ", "CVT", "HWDK"} for m in models) and all(
        m["family"] in {"CZ", "CVT", "HWDK"} for m in models
    ):
        fam = next(iter(fams))
        return f"{fam} dry/reactor — engine coverage not asserted."
    if any(m["family"] == "CV2" and m["currentA"] == 500 for m in models) and all(
        m["family"] == "CV2" and m["currentA"] == 500 for m in models
    ):
        return "CV2-500 is not a 2025 catalogue row."
    return None


def classify(
    model: dict,
    duty: dict,
    geom: dict | None,
) -> tuple[str, str]:
    """Return (tag, note). Prefer customer-specified when unsure."""
    fam = model["family"]
    cur = model["currentA"]
    i = duty.get("iA")
    ust = duty.get("ustV")
    phases = model["phases"] or "III"
    unit = model["unitCount"]

    if fam in {"CV", "SV", "CM", "CMD"}:
        return (
            "customer-specified",
            f"Buyer locked oil {fam}-{cur}; vacuum CV2/CM2 may be min-adequate.",
        )
    if unit > 1 and phases == "I":
        return (
            "customer-specified",
            "Quoted 3× singles; a III cover may exist. Keep quoted type eligible.",
        )
    if fam in {"SHZV", "SHZVG"} and i is not None and i <= 600 * 0.97:
        return (
            "customer-specified",
            f"I={i} A fits CV2/CM2; buyer locked {fam}-{cur}.",
        )
    if fam == "SHZV" and i is not None and i <= 600:
        return (
            "customer-specified",
            f"I={i} A; CM2/CV2 likely cheaper. Buyer locked SHZV-{cur}.",
        )
    if fam == "CV2" and cur == 350:
        if i is not None and i > 350 * 0.97:
            return (
                "customer-specified",
                f"I={i} A sits above 350×0.97; engine min-adequate is CV2-600. Buyer quoted CV2-350.",
            )
        return (
            "min-adequate",
            f"Quoted CV2-350. I={i} A, Ust={ust} V. Smallest 2025 vacuum compound.",
        )
    if fam == "CV2" and cur == 600 and i is not None and i > 350 * 0.97:
        return (
            "min-adequate",
            f"I={i} A sits above CV2-350; CV2-600 is min-adequate.",
        )
    if fam == "CV2" and cur == 600:
        return (
            "customer-specified",
            f"Quoted CV2-600 but duty I={i} A may fit CV2-350. Keep eligible.",
        )
    if fam == "CM2" and i is not None:
        # CM2 if Ust or Um or positions exclude CV2
        if (ust and ust > 1500) or (model["umKv"] and model["umKv"] > 145):
            if cur == 500 and i <= 500:
                return (
                    "min-adequate",
                    f"I={i} A, Ust={ust} V, Um={model['umKv']} — CV2 out; CM2-500 floor.",
                )
            if cur == 600 and i > 500 * 0.97:
                return (
                    "min-adequate",
                    f"I={i} A > CM2-500; CM2-600 is min-adequate.",
                )
        return (
            "customer-specified",
            f"Quoted CM2-{cur}; may not be the cheapest vacuum path. I={i} A.",
        )
    if fam == "HWV":
        return (
            "min-adequate" if (i is None or i <= cur) else "customer-specified",
            f"On-tank HWV lock. I={i} A, quoted HWV-{cur}.",
        )
    if fam == "SHZV" and i is not None and i > 600:
        if cur == 1000 and i <= 1000:
            return (
                "min-adequate",
                f"I={i} A > CM2 600; SHZV-1000 is min-adequate.",
            )
        return (
            "customer-specified",
            f"Quoted SHZV-{cur} at I={i} A; confirm vs SHZVG. Keep eligible.",
        )
    return (
        "customer-specified",
        f"Quoted {fam}-{cur}; unsure vs cheaper 2025 path. Keep eligible.",
    )


def medium_for(model: dict) -> dict:
    fam = model["family"]
    if fam == "HWV":
        return {
            "mounting": "on_tank",
            "medium": "oil_vacuum",
            "preferVacuum": True,
        }
    if fam in {"CV", "SV", "CM", "CMD"}:
        return {
            "mounting": "in_tank",
            "medium": "oil",
            "preferVacuum": False,
        }
    if fam in {"CZ", "CVT"}:
        return {
            "mounting": "dry_type",
            "medium": "dry",
            "preferVacuum": True,
        }
    return {
        "mounting": "in_tank",
        "medium": "oil_vacuum",
        "preferVacuum": True,
    }


def select_input(model: dict, duty: dict, geom: dict | None) -> dict | None:
    if duty.get("iA") is None or duty.get("ustV") is None:
        return None
    if not geom:
        return None
    phases = model["phases"] or "III"
    if phases == "IV":
        return None
    conn = model["connection"] or "Y"
    if conn not in {"Y", "D"}:
        conn = "Y"
    um = model["umKv"]
    if um is None:
        return None
    med = medium_for(model)
    inp: dict = {
        **med,
        "phases": "I" if phases == "I" else "III",
        "connection": conn,
        "throughCurrentA": duty["iA"],
        "umKv": um,
        "stepVoltageV": duty["ustV"],
        "regulation": geom["regulation"],
        "mdu": "none",
    }
    if geom["regulation"] == "linear":
        inp["positions"] = geom.get("positions")
        if geom.get("pitch") in {10, 12, 14, 16, 18}:
            inp["pitch"] = geom["pitch"]
        inp["midPositions"] = 0
    else:
        inp["plusMinusSteps"] = geom["plusMinus"]
        if geom["mid"] in (1, 3):
            # only set mid when not the commercial default (even N → 3)
            n = geom["plusMinus"]
            default_mid = 3 if n % 2 == 0 else 1
            # 10191W is ±9 mid1 (odd default is 1) — omit
            # 10193W is ±8 mid3 (even default is 3) — omit
            if geom["mid"] != default_mid:
                inp["midPositions"] = geom["mid"]
            # actually both 10191 and 10193 need the correct mid:
            # ±8 default mid3; ±9 default mid1. Matches brochure preferredMid.
            # For 18171W (±8 mid1) we MUST set mid 1.
            if geom["mid"] != default_mid:
                inp["midPositions"] = geom["mid"]
    if model["selectorSize"] and model["family"] not in {"CV2", "CV", "SV", "HWV"}:
        inp["selectorSize"] = model["selectorSize"]
    return inp


def parse_one(file: str, text: str, unread: str | None, meta: dict) -> dict:
    qs, rev_fn = parse_qs_from_name(file)
    rev = rev_fn
    m = QS_BODY_RE.search(text)
    if m:
        body_qs, body_rev = m.group(1), m.group(2)
        if not qs:
            qs = body_qs
        if body_qs == qs and body_rev:
            rev = int(body_rev)
    elif not qs:
        m2 = QS_ANY_RE.search(text) or QS_ANY_RE.search(file)
        if m2:
            qs = m2.group(1)
            if m2.group(2):
                rev = int(m2.group(2))
    models = find_models(text, file) if text else []
    primary = models[0] if models else None
    tr = parse_transformer(text, file) if text else {
        "line": "",
        "mvas": [],
        "kvs": [],
        "stepPct": None,
        "plusMinusFromDuty": None,
    }
    phases = (primary["phases"] if primary else "III") or "III"
    duty = compute_duty(tr, primary, phases)
    geom = tap_geometry(primary["tapCode"]) if primary else None
    inquiry, project = customer_project(text) if text else ("", "")
    budgetary = is_budgetary(file, text) if text else "budgetary" in file.lower()
    reason = unread
    if not reason:
        reason = skip_reason(models, duty, text, file)
    return {
        "file": file,
        "qs": qs,
        "rev": rev,
        "date": meta["date"],
        "uid": meta["uid"],
        "unread": bool(unread),
        "unreadReason": unread,
        "budgetary": budgetary,
        "inquiry": inquiry,
        "project": project,
        "transformer": tr,
        "models": models,
        "primary": primary,
        "duty": duty,
        "geom": geom,
        "skipReason": reason,
        "header": header_block(text)[:1500] if text else "",
    }


def load_index() -> dict[str, dict]:
    if not INDEX.exists():
        return {}
    rows = json.loads(INDEX.read_text())
    return {r["file"]: r for r in rows}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    RAW.mkdir(parents=True, exist_ok=True)
    idx = load_index()
    pdfs = sorted(
        [p for p in SRC.iterdir() if p.suffix.lower() in {".pdf", ".PDF"}],
        key=lambda p: p.name,
    )
    parsed = []
    for i, p in enumerate(pdfs, 1):
        cache = RAW / (p.name + ".txt")
        unread = None
        if cache.exists():
            text = cache.read_text(encoding="utf-8", errors="replace")
            if text.startswith("<<UNREAD:"):
                unread = text[len("<<UNREAD:") :].split(">>", 1)[0]
                text = ""
        else:
            text, unread = extract_text(p)
            if unread:
                cache.write_text(f"<<UNREAD:{unread}>>\n", encoding="utf-8")
            else:
                cache.write_text(text, encoding="utf-8")
        meta = {
            "date": (idx.get(p.name) or {}).get("date")
            or file_date(p.name, p.stat().st_mtime),
            "uid": (idx.get(p.name) or {}).get("uid") or file_uid(p.name),
        }
        rec = parse_one(p.name, text, unread, meta)
        parsed.append(rec)
        print(f"[{i}/{len(pdfs)}] QS{rec['qs'] or '?':<8} R{rec['rev']} {p.name[:70]}")

    (OUT / "parsed.json").write_text(
        json.dumps(parsed, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    # Collapse to latest R per QS (then latest date/uid)
    by_qs: dict[str, list] = defaultdict(list)
    no_qs = []
    for r in parsed:
        if r["qs"]:
            by_qs[r["qs"]].append(r)
        else:
            no_qs.append(r)

    latest = {}
    for qs, rows in by_qs.items():
        rows_sorted = sorted(
            rows, key=lambda r: (r["rev"], r["date"], r["uid"])
        )
        latest[qs] = rows_sorted[-1]

    (OUT / "latest.json").write_text(
        json.dumps(latest, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(
        f"files={len(parsed)} unique_qs={len(by_qs)} no_qs={len(no_qs)} unread="
        f"{sum(1 for r in parsed if r['unread'])}"
    )
    emit_corpus(parsed, latest, by_qs)


def js_str(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def decide_latest(r: dict) -> dict:
    """Classify a latest-R row into replay or skip."""
    p = r.get("primary")
    d = r.get("duty") or {}
    g = r.get("geom")
    qs = r["qs"]
    src_bits = [r["file"]]
    who = " / ".join(x for x in (r.get("inquiry"), r.get("project")) if x)
    if who:
        src_bits.append(who)
    if r.get("transformer", {}).get("line"):
        src_bits.append(r["transformer"]["line"])
    source = "Anthony/" + " | ".join(src_bits)

    if r.get("unread"):
        return {"kind": "skip", "reason": r.get("unreadReason") or "unread"}
    if r.get("skipReason"):
        return {"kind": "skip", "reason": r["skipReason"], "source": source}
    if not p or not p.get("commercial"):
        return {"kind": "skip", "reason": "incomplete duty / no OLTC model parsed", "source": source}
    if p["family"] == "CV2" and p["currentA"] == 500:
        return {
            "kind": "skip",
            "reason": "CV2-500 is not a 2025 catalogue row.",
            "source": source,
        }
    if p["family"] == "SHZV" and p["currentA"] not in {400, 600, 1000, 1500, 1600, 2400}:
        return {
            "kind": "skip",
            "reason": f"SHZV-{p['currentA']} is not a 2025 catalogue current.",
            "source": source,
        }
    if p["unitCount"] > 1:
        return {
            "kind": "skip",
            "reason": "3× singles; engine will not list 3× when a III cover exists.",
            "source": source,
        }
    if not g:
        return {
            "kind": "skip",
            "reason": f"non-catalogue tap {p.get('tapCode') or '(none)'} — engine cannot emit.",
            "source": source,
        }
    if d.get("iA") is None or d.get("ustV") is None:
        return {
            "kind": "skip",
            "reason": "incomplete duty (no recoverable Iᵤ/Ust from QS header).",
            "source": source,
        }
    if d["iA"] > p["currentA"] + 0.5:
        return {
            "kind": "skip",
            "reason": f"quoted Iᵤ {p['currentA']} A below transformer duty I={d['iA']} A; do not invent a cover.",
            "source": source,
        }
    if p["family"] == "CV2" and p["currentA"] == 350 and d["iA"] > 350 * 0.97:
        return {
            "kind": "skip",
            "reason": f"quoted CV2-350; duty I={d['iA']} A > 350×0.97 so CV2-350 is not eligible.",
            "source": source,
        }
    inp = select_input(p, d, g)
    if not inp:
        return {
            "kind": "skip",
            "reason": "incomplete duty (cannot build SelectInput).",
            "source": source,
        }
    tag, note = classify(p, d, g)
    return {
        "kind": "replay",
        "source": source,
        "tag": tag,
        "note": note,
        "input": inp,
        "expectPrimary": p["commercial"],
        "qs": qs,
    }


def fmt_input(inp: dict) -> str:
    order = [
        "mounting",
        "medium",
        "preferVacuum",
        "phases",
        "connection",
        "throughCurrentA",
        "umKv",
        "stepVoltageV",
        "regulation",
        "plusMinusSteps",
        "positions",
        "midPositions",
        "pitch",
        "selectorSize",
        "mdu",
    ]
    lines = ["    input: {"]
    for k in order:
        if k not in inp:
            continue
        v = inp[k]
        if isinstance(v, bool):
            js = "true" if v else "false"
        elif isinstance(v, str):
            js = js_str(v)
        elif isinstance(v, float) and v == int(v):
            js = str(int(v))
        else:
            js = str(v)
        lines.append(f"      {k}: {js},")
    lines.append("    },")
    return "\n".join(lines)


def emit_corpus(parsed: list, latest: dict, by_qs: dict) -> None:
    files_rows = []
    inv_rows = []
    replay = []
    skipped = []
    decisions = {}

    for qs, rec in latest.items():
        decisions[qs] = decide_latest(rec)

    for r in parsed:
        qs = r["qs"] or ""
        lat = latest.get(qs)
        is_latest = bool(lat) and lat["file"] == r["file"]
        dec = decisions.get(qs) or {"kind": "skip", "reason": "no QS"}
        files_rows.append(
            {
                "file": r["file"],
                "qsNo": f"QS{qs}" if qs else "",
                "revision": f"R{r['rev']}",
                "superseded": (not is_latest) if qs else False,
                "unread": r["unread"],
                "unreadReason": r.get("unreadReason"),
            }
        )
        p = r.get("primary") or {}
        model = p.get("commercial") or (p.get("raw") or "").strip() or "—"
        who = " / ".join(x for x in (r.get("inquiry"), r.get("project")) if x) or "—"
        if is_latest:
            if dec["kind"] == "replay":
                tag = dec["tag"]
            else:
                tag = f"skip: {dec.get('reason', '')}"
            superseded_by = ""
        else:
            tag = "superseded"
            superseded_by = f"QS{qs}-R{lat['rev']}" if lat else ""
        inv_rows.append(
            {
                "file": r["file"],
                "qs": f"QS{qs}" if qs else "—",
                "rev": f"R{r['rev']}",
                "date": r["date"],
                "model": model.replace("|", "/"),
                "who": who.replace("|", "/"),
                "budgetary": "yes" if r["budgetary"] else "no",
                "tag": tag.replace("|", "/"),
                "superseded_by": superseded_by,
            }
        )

    for qs, dec in sorted(decisions.items()):
        if dec["kind"] == "replay":
            replay.append(dec)
        else:
            skipped.append(
                {
                    "id": f"QS{qs}",
                    "source": dec.get("source") or latest[qs]["file"],
                    "reason": dec.get("reason") or "skip",
                }
            )

    # TypeScript
    ts = [
        "/**",
        " * Anthony QS gold corpus. Latest-R only; older revs are inventory/superseded.",
        " * orderReplay concatenates these onto Qu-ET260001–013 — do not drop those.",
        " */",
        'import type { ReplayCase } from "./orderReplay";',
        "",
        "export type AnthonyFileRow = {",
        "  file: string;",
        "  qsNo: string;",
        "  revision: string;",
        "  /** Latest R kept; older revisions collapsed. */",
        "  superseded?: boolean;",
        "  unread?: boolean;",
        "  unreadReason?: string;",
        "};",
        "",
        "export const ANTHONY_FILES: AnthonyFileRow[] = [",
    ]
    for fr in files_rows:
        extra = []
        if fr["superseded"]:
            extra.append("superseded: true")
        if fr["unread"]:
            extra.append("unread: true")
            if fr["unreadReason"]:
                extra.append(f"unreadReason: {js_str(fr['unreadReason'])}")
        extra_s = (", " + ", ".join(extra)) if extra else ""
        ts.append(
            f"  {{ file: {js_str(fr['file'])}, qsNo: {js_str(fr['qsNo'])}, "
            f"revision: {js_str(fr['revision'])}{extra_s} }},"
        )
    ts.append("];")
    ts.append("")
    ts.append("export const ANTHONY_REPLAY: ReplayCase[] = [")
    for c in replay:
        ts.append("  {")
        ts.append(f"    id: {js_str('QS' + c['qs'])},")
        ts.append(f"    source: {js_str(c['source'])},")
        ts.append(f"    tag: {js_str(c['tag'])},")
        ts.append(f"    note: {js_str(c['note'])},")
        ts.append(fmt_input(c["input"]))
        ts.append(f"    expectPrimary: {js_str(c['expectPrimary'])},")
        ts.append("  },")
    ts.append("];")
    ts.append("")
    ts.append("export const ANTHONY_REPLAY_SKIPPED: Array<{")
    ts.append("  id: string;")
    ts.append("  source: string;")
    ts.append("  reason: string;")
    ts.append("}> = [")
    for s in skipped:
        ts.append("  {")
        ts.append(f"    id: {js_str(s['id'])},")
        ts.append(f"    source: {js_str(s['source'])},")
        ts.append(f"    reason: {js_str(s['reason'])},")
        ts.append("  },")
    ts.append("];")
    ts.append("")

    repo_ts = Path("/Users/youming/Github/oltc-selector/lib/anthonyQs.fixtures.ts")
    repo_ts.write_text("\n".join(ts) + "\n", encoding="utf-8")

    # Inventory
    n_files = len(parsed)
    n_qs = len(latest)
    n_replay = len(replay)
    n_skip = len(skipped)
    n_unread = sum(1 for r in parsed if r["unread"])
    from collections import Counter

    tag_c = Counter(c["tag"] for c in replay)
    skip_c = Counter(s["reason"] for s in skipped)

    md = [
        "# Anthony QS inventory",
        "",
        "Every PDF under `QS/Anthony/`. Same QS number collapsed to **latest R**",
        "(filename with no R = R0). Older revs are superseded, not replay cases.",
        "Duty Iᵤ/Ust from transformer MVA/kV/step % only — catalogue max is not used.",
        "",
        f"- files: **{n_files}**",
        f"- unique QS: **{n_qs}**",
        f"- replay: **{n_replay}** (min-adequate {tag_c.get('min-adequate', 0)}, "
        f"customer-specified {tag_c.get('customer-specified', 0)})",
        f"- skip (latest R): **{n_skip}**",
        f"- unread: **{n_unread}**",
        "",
        "## Skip reasons (latest R)",
        "",
    ]
    for reason, n in skip_c.most_common():
        md.append(f"- {n} — {reason}")
    md += [
        "",
        "## Files",
        "",
        "| qs | rev | date | model | customer/project | budgetary | tag / skip | superseded-by |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for row in sorted(inv_rows, key=lambda x: (x["qs"], x["rev"], x["date"], x["file"])):
        md.append(
            f"| {row['qs']} | {row['rev']} | {row['date']} | `{row['model']}` | "
            f"{row['who']} | {row['budgetary']} | {row['tag']} | {row['superseded_by']} |"
        )
    md += [
        "",
        "## Counts",
        "",
        f"| metric | n |",
        f"|---|---|",
        f"| files | {n_files} |",
        f"| unique QS | {n_qs} |",
        f"| replay | {n_replay} |",
        f"| skip | {n_skip} |",
        f"| unread | {n_unread} |",
        "",
    ]
    repo_md = Path("/Users/youming/Github/oltc-selector/docs/anthony-qs-inventory.md")
    repo_md.write_text("\n".join(md) + "\n", encoding="utf-8")
    print(f"wrote {repo_ts} replay={n_replay} skip={n_skip}")
    print(f"wrote {repo_md}")


if __name__ == "__main__":
    main()

