# 2025 OS replay

Source: `2025-os-sales.json`
Rows: 910. Judged: 580. Skipped: 330.
Tapped-winding kV = OS rated kV, as the app passes it (no OS field marks an autotransformer, so every row is read as two-winding); 252 kV class and above is combined only. Cut-off sold tap codes (`1`, `12231` without W/G) are skipped; 10181G / 10183W go in as positions + mid, as `--range` does. Since 2026-11-04 r2 this changed engine #1 on 26 rows (15 in 2026, 11 in 2025, cut-off codes now skipped included), mostly CM2 → SHZV on 225–400 kV windings.

| verdict | n | % of judged | meaning |
|---|---:|---:|---|
| exact | 461 | 79.5% | engine #1 = sold type (selector letter / 3× prefix ignored) |
| family-i-um | 6 | 1.0% | #1 same family / I / Um (tap or grade differs) |
| family | 51 | 8.8% | #1 same family, different I or Um |
| eligible | 41 | 7.1% | sold type is in the list, not #1 |
| oil-vs-vac | 0 | 0.0% | sold oil (CM/CV/CMD), engine vacuum twin |
| miss | 21 | 3.6% | sold type not produced |

**#1 family+I+Um or better:** 80.5%
**sold type or vacuum twin eligible:** 96.4%
**grade (engine #1 vs sold letter):** match 49 / weaker than sold 29 / stronger 62

| sold Um | match | weaker than sold | stronger |
|---:|---:|---:|---:|
| 12 | 1 | 0 | 0 |
| 40.5 | 1 | 0 | 0 |
| 72.5 | 32 | 26 | 0 |
| 126 | 11 | 3 | 18 |
| 170 | 1 | 0 | 40 |
| 252 | 2 | 0 | 4 |
| 300 | 1 | 0 | 0 |

## Misses

| serial | folder | sold | engine #1 | I | Um | Ust |
|---|---|---|---|---:|---:|---:|
| E-M250118-119 | CM | `3xCMI-1200/72.5B-10191W` | `CMDI-2400/72.5B-10191W` | 1674 | 72.5 | 172.5 |
| E-M250122 | CM | `3xCMI-1200/72.5B-14271W` | `CMDI-1600/72.5B-14271W` | 1562 | 72.5 | 266 |
| E-V250157-160 | CV | `CVIII-350D/40.5-1223W` | `3xCMI-500/72.5B-18353W` | 216.5 | 40.5 | 250 |
| E-V250173-186 | CV | `CVIII-350Y/10-090` | `` | 181.3 | 10 | 454.7 |
| E-V250432-433 | CV | `SVIII-500Y/72.5-10191W` | `CMIII-500Y/72.5B-10191W` | 351 | 72.5 | 1182 |
| E-SHZV250001-003 | SHZV | `SHZVI-1500/420D-18353W` | `` | 1100.9 | 420 | 1428.9 |
| E-SHZV250049 | SHZV | `SHZVIII-1000Y/725D-18170` | `` | 801.9 | 725 | 952.6 |
| E-SHZV250050 | SHZV | `SHZVIII-1000Y/725D-18170` | `` | 801.9 | 725 | 952.6 |
| E-SHZVG250001 | SHZVG | `SHZVI-1300/126DE-18353W` | `` | 508.8 | 126 | 5176.1 |
| E-CM2250195 | VCM | `CM2III-600Y/145C-1223` | `CV2III-350Y/145-10193W` | 218.7 | 145 | 763 |
| E-CM2250220 | VCM | `CM2III-300Y/145B-12233W` | `CV2III-350Y/145-12233W` | 109.9 | 145 | 1082 |
| E-CV2250179-180 | VCV | `CV2III-350D/145-12233W` | `3xCM2I-500/170D-12233W` | 48.31 | 145 | 1725 |
| E-CV2250303 | VCV | `CV2III-350D/145-12231W` | `3xCM2I-500/170D-12231W` | 36.23 | 145 | 1725 |
| E-CV2250307 | VCV | `CV2III-600D/40.5-10193W` | `3xCM2I-800/72.5B-10193W` | 603.86 | 40.5 | 172.5 |
| E-CV2250414 | VCV | `CV2III-350D/145-1223` | `3xCM2I-500/170D-10193W` | 217.4 | 145 | 2070 |
| E-W250001-002 | W□L | `WSLV-1000D/145-5x4E` | `` | 1000 | 145 | 0 |
| E-W250009 | W□L | `WSLV-600D/126-5x4D` | `` | 600 | 126 | 0 |
| E-W250012 | W□L | `WSLV-1000Y/126-6x5A` | `` | 804 | 126 | 0 |
| E-W250024 | W□L | `3xWDLV-1000/363-3x2E` | `` | 2228.42 | 363 | 0 |
| E-W250030 | W□L | `WSLVII-600D/12-12x12D` | `` | 288.7 | 12 | 0 |
| E-W250055 | W□L | `WDLV-600/170-4x3A` | `` | 454.7 | 170 | 0 |

## By family (judged)

| family | judged | exact | miss |
|---|---:|---:|---:|
| CM | 45 | 34 | 2 |
| CM2 | 102 | 55 | 2 |
| CMD | 6 | 6 | 0 |
| CV | 90 | 85 | 2 |
| CV2 | 231 | 201 | 4 |
| CVT | 4 | 2 | 0 |
| CZ | 7 | 7 | 0 |
| HWDK | 1 | 1 | 0 |
| HWV | 5 | 4 | 0 |
| SHZV | 22 | 11 | 4 |
| SHZVG | 3 | 2 | 0 |
| SV | 12 | 10 | 1 |
| WDG | 20 | 20 | 0 |
| WDL | 3 | 1 | 2 |
| WLG | 1 | 1 | 0 |
| WSL | 28 | 21 | 4 |

## OCTC without the answer

No sold contact, roman auto, structure from the folder (drum / cage), ±N from the OS (5 positions when blank), Um from rated kV through `deriveDuty`.

| family | judged | exact as-is | exact honest | honest skipped |
|---|---:|---:|---:|---:|
| WDG | 20 | 20 | 10 | 0 |
| WDL | 3 | 1 | 0 | 1 |
| WLG | 1 | 1 | 0 | 1 |
| WSL | 28 | 21 | 9 | 4 |
