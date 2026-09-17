---
name: huaming-oltc-selector
display_name: Huaming Tap-Changer Selector
display_name_zh: 华明分接开关选型
description: >
  Huaming tap-changer selection: paste a transformer nameplate or give duty
  parameters (MVA, kV, current, regulation, tap range) and get a commercial
  OLTC/OCTC type string that really exists in the Huaming catalogue, with a
  short why. Use for tap-changer selection, 选型, type designation, OLTC,
  OCTC, CV2, CM2, SHZV, HWV, WSL, WSG, CMD, star-point vs line-end duty,
  reversing / coarse-fine / linear regulation, Imax, Um, 一拖二 (OLTC + OCTC
  on one transformer), checking whether a Huaming model exists, or decoding
  a type string. Do not use for quotation, pricing, or shipping documents.
description_en: Paste a nameplate or give duty parameters; get a Huaming tap-changer type that exists in the catalogue, with the reasoning.
description_zh: 贴铭牌或给参数，用 oltc 选华明分接开关型号；只出样本册里存在的型号，并说明理由。
allowed-tools: Bash, Read
version: 1.2.0
author: Eric Tan
license: MIT
category: engineering
---

# Huaming Tap-Changer Selector (oltc CLI)

Turn transformer duty into a **Huaming (华明) commercial type string** with the published CLI `oltc` (`npx -y oltc-selector@latest`, or `npm i -g oltc-selector` for repeat use). Same engine as https://oltc-selector.vercel.app/

**Huaming catalogue only — other vendors are out of scope. No prices. No quotation. No inventing types.**

## Must

1. If `oltc` is on PATH, **run it**. Do not guess a model from memory.
2. If `oltc` is missing, run it through npx yourself: `npx -y oltc-selector@latest <flags>` (Node 20+). Do not ask the user to install anything first. For repeat use you may `npm i -g oltc-selector` to put `oltc` on PATH. If `npm`/`npx` is missing, stop and tell them to install Node 20+. Do not fabricate CV2-500 or combined III-D.
3. After the CLI prints a model, **check it** against the brochure rules below. If it fails, say so and do not dress it up as orderable.
4. After a pass, explain **why this type is correct** in 3–6 short sentences (family, Ium, Um, Y/D or 3×, tap code, construction). No essays.
5. Output the model **without** `+CMA7` unless the user asked for a drive. Three single-phase poles → **1× CMA7**, not three.
6. **一拖二 / 无载带有载** (one transformer with both an on-load and an off-circuit tap-changer) needs **two** selections: a plain run for the on-load part and an `--octc` run for the off-circuit part. Brochure-check **both** type strings and present them together. Never merge the two duties into one run.

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
| `--octc` | Off-circuit (WSL/WSG cage/drum). |
| `--structure` | `auto` / `combined` / `compound` / `cage` / `drum` |
| `--series` | OCTC wiring II IV V VI VII VIII |

`--json` still has no prices.

> npx answers "could not determine executable to run"? The working directory's own `package.json` is named `oltc-selector` and shadows the registry package. Run from another directory, or use the global install.

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

## 一拖二 (OLTC + OCTC on one transformer)

A spec with both an on-load range and an off-circuit range (无载带有载, "one drags two") is **two** switches. Split it and run twice:

- On-load part (有载 ±N×x%) → normal run with that part's `--pm` / `--step-pct`.
- Off-circuit part (无载 positions / wiring) → `--octc` run with `--positions` or `--contact`, plus `--series` when the spec names the wiring.
- Both switches usually sit on the same winding: same `--iu` and `--um` for both runs unless the spec splits them.
- Spec gives only one total range and does not say how it splits between on-load and off-circuit? **Ask.** Do not invent the split.

> Spec line: `110 kV, on-load ±8×1.25% + off-circuit 5 positions (一拖二), 350 A, taps at HV neutral`
> → `oltc --iu 350 --um 72.5 --conn Y --reg W --pm 8 --step-pct 1.25`
> → `oltc --octc --iu 350 --um 72.5 --conn Y --positions 5`
> → e.g. `CV2III-350Y/72.5-10193W` (on-load) + `WSLIV-600Y/72.5-6x5A` (off-circuit). Check both against the brochure, then explain each in one or two sentences.

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

Then stop. Engineering still confirms before ordering.
