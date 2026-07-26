# 2025 sales calibration

Source (year **2025 only**):

- `Attachments/Excel/Sales/HM reference list -2019-2025.xlsx` → sheet `2019-2025 `, Year=2025  
- Cross-check: `直接出口数据.xlsx` 2025 column, `间接出口数据.xlsx` 2025 by-model  

**Do not calibrate on 2024 rows.**

## 2025 volume family mix (reference list, qty)

| Family | ~qty | Notes |
|--------|------|--------|
| CV | 589 | Oil compound still #1 unit volume |
| CV2 | 510 | Vacuum compound — growing |
| CM2 | 439 | Vacuum combined mid |
| CM | 425 | Oil combined |
| SHZV | 292 | Not default when CM2/CV2 fit |
| CMD | 78 | High current oil |
| SV | 68 | Oil compound 500 A |
| CZ | 48 | Dry 3× common |
| SHZVG | 34 | High-current vacuum |
| HWV | 18 | On-tank |
| CVT | 16 | Dry 12 kV |

## Currents that matter (2025)

| Family | III | I |
|--------|-----|---|
| CV | **350 only** | — |
| **CV2** | **350, 600 only** (no 250/500 in 2025) | rare |
| SV | 500 | — |
| CM / CM2 | 500, 600 | 500/600/800/1200/1500 |
| SHZV | 400/600/1000 | +1500/1600/2400 |
| **SHZVG** | **1300, 1500** | 1300, 3000 |
| CMD | 400/1000 | +**1200**/1600/2400 |
| HWV | 400/800/1000 | — |
| CVT | 160 | — |
| CZ | — | 500 (often 3×) |

## Um (2025)

CV2: 40.5 / 72.5 / 126 / **145** (145 is real volume, e.g. `CV2III-600D/145-10193W`).  
CM2/SHZV: 72.5 / 126 / 170 / 252 (+300/363 SHZV).

## Selector grade

2025 ships **C > B > D > DE**.  
`CM2III-500Y/72.5DE-…` appears in 2025 shipments → allow **DE at 72.5**.

**Auto floor (not always weakest letter):**

| Um | Auto |
|----|------|
| ≤72.5 | B |
| 126 / 145 | C |
| 170 / 252 | D |
| ≥300 | DE |

Across-tap LI/PF only raises the floor (e.g. 72.5 + BIL 285 → C).

## Top tap codes (2025)

`10193W` > `10191W` > `12233W` > linear `10090` / `10070` > `14273W/G` > `18351W`.

## Engine changes from this pass

1. **SHZVG** family added (after SHZV in min-adequate rank).  
2. **CMD I +1200**.  
3. **72.5 → B/C/D/DE**.  
4. **CV2 stays 350/600** (confirmed by 2025, not older 250/500 rows).  
5. Fixtures: `sales2025Cv2_145`, `sales2025Cm2_500`, `sales2025Shzvg`.

## 3× single-phase vs one III (Base Price List 2025)

| Option | Example base (FOB RMB, 10…W / 72.5B) |
|--------|--------------------------------------|
| CM2III-600Y | ~194k |
| SHZVIII-1000Y | ~219k |
| CM2I-800 × **3** | ~174k × 3 ≈ **522k** |
| CM2I-1200 × **3** | ~188k × 3 ≈ **564k** |
| SHZVGIII-1300Y | ~385k |

**Rule:** if a **single III** covers Iᵤ (SHZV ≤1000, SHZVG ≤1500), never pick 3× as primary.  
3× only when **no** III family covers (e.g. Iᵤ > SHZVG III max, or true single-phase transformer poles).
