# Catalogue source notes

`src/lib/catalog.ts` current axes are **not invented**. They come from:

1. **Technical brochures** (OneDrive `Attachments/Techincal Brochure/`)
2. **Commercial model headers** in `QS/a. Base Price List 2025.xlsx`

Text extracts of brochures live in `docs/brochure-extracts/` for offline grep.

## Critical correction (2026-07)

Early scaffold put **CV2 currents = 350 / 500 / 600**.  
**CV2-500 does not exist.**

| Family | III currents (catalogue) | Notes |
|--------|--------------------------|--------|
| **CV2** | **350, 600 only** | Um 40.5 / 72.5 / 126 / 145; positions 12 / 23; step 2000 V (10 ct) / 1500 V (12 ct); step capacity 700 / 800 kVA |
| CV | 350 (I also 700) | Um 40.5 / 72.5 |
| **SV** | **500** | Oil compound 500 A — not CV/CV2 |
| CM / CM2 | III/II **500, 600**; I 500/600/800/1200/1500 | Um 72.5 / 126 / 170 / 252 |
| SHZV | III/II 400/600/1000; I +1200/1500/1600/2400 | Um to 252 commercially; brochure also 300/363. SHZVG = 1300/1500 separate |
| CMD | III 400/600/1000; I +1600/2400 | Positions 14 / 27 |
| HWV | 400 / **800** / 1000 | No 600 A; Um 17.5 / 40.5 / 72.5 |
| CVT | 160 / 200 | Um **12** only |
| CZ | 500 / 600 | Um 40.5 / 72.5; often `3×CZI-…` |
| HWDK | 1500 / 2000 / 2500 | 35 / 69 kV |

## Compound vs combined

- **Combined** (SHZV/CM/CM2/CMD/HWV): model may include selector grade `B|C|D|DE` after Um.
- **Compound** (CV/CV2/SV/CVT/CZ): **no** grade letter. Connection Y/D sits after current (`CV2III-350Y/40.5-…`).

## Ranking (training cases)

Minimum adequate — see `选型案例-答案.docx` in `docs/training/`:

| Case | Answer |
|------|--------|
| 10 MVA 33 kV Δ CF | `CV2III-350D/40.5-10193G` |
| 103 MVA 138 kV Y W, across BIL 285 | `CM2III-600Y/72.5C-10193W` |
| 120 MVA 132 kV Δ, Um 145 | `CV2III-600D/145-12233W` |
| 220 MVA Δ, I≈626 > CM2 III | `3xCM2I-800/72.5B-…` |

Compound fails when across-tap LI ≳ 200 kV (CV2 internal a). Then combined + grade letter.

## Do not

- Invent intermediate currents (especially **CV2-500**).
- Put selector grade on CV/CV2.
- Use CM III 800/1000 — three-phase CM/CM2 stop at 600 A; go SHZV/CMD or single-phase for higher I.
- Default-rank SHZV when CV2/CM2 already meet the duty.
