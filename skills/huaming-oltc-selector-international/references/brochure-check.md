# Brochure / catalogue check

Use after `oltc` prints a model. If any row fails, do not treat the string as orderable.

## Existence

| Family | III currents (A) | III-D? | Grade letter? |
|--------|------------------|--------|----------------|
| CV2 | 350, 600 only | yes | no |
| CV | 350 | yes | no |
| SV | 500 | yes | no |
| CM / CM2 | 500, 600 | **no**, use 3× I | yes (in-tank) |
| SHZV | 400, 600, 1000 | **no** | yes |
| SHZVG | 1300, 1500 | **no** | yes |
| CMD | 400, 600, 1000 | **no** | yes |
| HWV | 400, 800, 1000 | yes | no |
| WSL / WDL | 2025-list keys only | wiring roman | cage |
| WSG | catalogue Um/I only | wiring roman | drum |

## Earth (Um → PF / LI)

12→35/75, 40.5→90/250, 72.5→140/350, 126→230/550, 145→275/650, 170→325/750, 252→460/1050.

## Tap code vs transformer steps

`10193W` → 19 mechanical, **17** different voltages (mid 3). `12233W` → 23 mech, **21** voltages.

## Drive

3× single-phase poles: **1× CMA7** unless the RFQ asks for three MDUs.

## 一拖二 (OLTC + OCTC on one transformer)

One transformer with both OLTC and OCTC (无载带有载) → two type strings. Run this check on **both**; the pair is orderable only if each passes.
