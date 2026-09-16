---
name: oltc-selector
display_name: OLTC Selector
display_name_en: OLTC Selector
description: >
  Select an on-load or off-circuit tap-changer type with the oltc CLI.
  TRIGGER when the user asks for 选型, OLTC, OCTC, type designation, CV2, CM2,
  SHZV, HWV, WSL, Imax, Um, or to check whether a model exists.
  DO NOT TRIGGER for quotation, price, OS commercial terms, or shipping docs.
description_zh: 用 oltc 命令选型，并对照样本册检查型号是否存在、说明为何正确。
description_en: Run oltc to pick a tap-changer type, then check the brochure and explain why.
version: 1.0.0
author: Eric Tan
license: UNLICENSED
category: engineering
---

# OLTC Selector (CLI)

Turn transformer duty into a **commercial type string** with the published CLI `oltc` (`npm i -g oltc-selector`). Same engine as https://oltc-selector.vercel.app/

**No prices. No quotation. No inventing types.**

## Must

1. If `oltc` is on PATH, **run it**. Do not guess a model from memory.
2. If `oltc` is missing, **run** `npm i -g oltc-selector` yourself (Node 20+), then run `oltc`. Do not ask the user to install it first. If `npm` is missing, stop and tell them to install Node 20+. Do not fabricate CV2-500 or combined III-D.
3. After the CLI prints a model, **check it** against the brochure rules below. If it fails, say so and do not dress it as OS.
4. After a pass, explain **why this type is correct** in 3–6 short sentences (family, Ium, Um, Y/D or 3×, tap code, construction). No essays.
5. Output the model **without** `+CMA7` unless the user asked for a drive. Three single-phase poles → **1× CMA7**, not three.

## How to run

```
oltc --iu 350 --um 40.5 --conn D --reg W --pm 8
oltc --mva 25 --kv 110 --conn Y --reg W --pm 8
oltc --octc --iu 800 --um 72.5 --conn D --series II --contact 6x5
oltc --iu 600 --um 72.5 --conn Y --reg W --pm 8 --structure combined
```

| Flag | Meaning |
|------|---------|
| `--iu` | Imax (lowest-tap through-current). **No** safety factor. |
| `--mva` `--kv` | Capacity path. Safety `--k` (default 1.2) only here. |
| `--um` | Equipment Um (kV), catalogue step. |
| `--conn Y\|D` | OLTC application: star-point vs line-end. **Not** transformer Dyn11. |
| `--reg W\|G\|0` | Reversing / coarse-fine / linear. |
| `--pm` | ± steps (W/G). Linear uses `--positions`. |
| `--octc` | Off-circuit (WSL/WSG). |
| `--structure` | `auto` / `combined` / `compound` / `cage` / `drum` |
| `--series` | OCTC wiring II IV V VI VII VIII |

`--json` still has no prices.

## Reading transformer data

A pasted nameplate or spec line is enough. Map it like this:

- `25 MVA 110±8×1.25%/10.5 kV` → `--mva 25 --kv 110 --pm 8 --step-pct 1.25 --reg W`. The `±N×x%` part is the tap range: N is `--pm`, x is `--step-pct`. A `±` range around a mid position is reversing (`--reg W`); a plain 0..N range is linear (`--reg 0 --positions`).
- `--kv` is the **tap-side** rated voltage, the winding the switch sits on. In `110±8×1.25%/10.5`, the taps are on 110; ignore 10.5 unless the taps are on the LV side.
- kVA → MVA: divide by 1000 (31500 kVA = 31.5 MVA).
- Rated current given instead of MVA: Imax ≈ Irated ÷ (1 − N×x%). Prefer `--mva --kv` and let the CLI do this math.
- **Dyn11 / YNd1 is the transformer vector group, not `--conn`.** `--conn Y` means the switch sits at the star point; `--conn D` means line-end delta duty. If the spec only shows the vector group and not where the taps sit, ask one short question instead of guessing.
- Um: with `--mva --kv` the CLI derives it (35 → 40.5, 66 → 72.5, 110 Y → 72.5, 110 D → 126, 220 → 252). Pass `--um` only when the user states the equipment class directly.
- `--iu` is the transformer max through-current at the lowest tap. Never add a safety factor to it. `--k` exists only on the capacity path.

Missing one of current, voltage, or tap range? Ask for that one thing. Do not fill gaps from memory.

> Spec line: `SFZ11-25000/110, 110±8×1.25%/10.5 kV, Dyn11, taps at HV neutral, vacuum`
> → `oltc --mva 25 --kv 110 --conn Y --reg W --pm 8 --step-pct 1.25`

## Brochure check (after CLI)

See `references/brochure-check.md`. Fail the type if any of these hit:

- **CV2-500** — 2025 CV2 III is 350 and 600 only. 500 A oil compound is SV.
- **Combined III-D** — no `CM2III-…D`, `CMIII-…D`, `SHZVIII-…D`. Cover with `3x…I-` when that I type exists. **CV2 / CV / SV / HWV III-D exist.**
- **Compound grade letter** — no `CV2III-350Y/40.5B`. Combined in-tank may have B/C/D/DE.
- **Missing WSL row** — cage types must exist as a 2025-list key, not a cartesian invention.
- **Star-point Um** — Y jobs at winding ≥145 kV usually take switch **72.5**, not 145.
- **10193W operating steps** — 19 is mechanical; transformer voltage steps = **17**.

## Deep OLTC (use when explaining)

- **Iu** brochure = rated through-current of the switch. **Ium** = max of those, the number in the type (`CV2III-600`). **Imax** on the form = transformer current at lowest tap. The CLI input is Imax; the type number is Ium ≥ that duty (with ~97% headroom).
- **Combined** = diverter + tap selector (CM, CM2, SHZV, CMD). **Compound** = selector switch (CV, CV2, SV). **Cage** WSL/WDL, **drum** WSG.
- Ranking is **minimum-adequate**: CV2 → CM2 → SHZV → SHZVG. Prefer one III unit over 3× I when a legal III exists.
- Selector grade floor by Um: ≤72.5 B, 126/145 C, 170/252 D, ≥300 DE. Across-tap BIL can only raise.
- Tap code `P = 2×(±N)+mid`. Three mids share one voltage.

## After a good pick — explain like this

> `CV2III-350D/40.5-10193W` — vacuum compound covers 350 A at 40.5 kV line-end. III-D exists for CV2. ±8 mid-3 reversing is 10193W. No selector letter on compound. Lowest catalogue family that fits.

Then stop. Engineering still confirms before OS.
