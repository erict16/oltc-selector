# 2026 OS replay

Source: `2026-os-sales.json`
Rows: 675. Judged: 403. Skipped: 272.

| verdict | n | % of judged | meaning |
|---|---:|---:|---|
| exact | 329 | 81.6% | engine #1 = sold type (selector letter / 3× prefix ignored) |
| family-i-um | 8 | 2.0% | #1 same family / I / Um (tap or grade differs) |
| family | 26 | 6.5% | #1 same family, different I or Um |
| eligible | 35 | 8.7% | sold type is in the list, not #1 |
| oil-vs-vac | 0 | 0.0% | sold oil (CM/CV/CMD), engine vacuum twin |
| miss | 5 | 1.2% | sold type not produced |

**#1 family+I+Um or better:** 83.6%
**sold type or vacuum twin eligible:** 98.8%

## Misses

| serial | folder | sold | engine #1 | I | Um | Ust |
|---|---|---|---|---:|---:|---:|
| E-CM2260210-213 | VCM | `CM2I-1500/170D-22433W` | `` | 1030 | 170 | 0 |
| E-CV2260116-117 | VCV | `CV2III-350D/145-12233W` | `3xCM2I-500/170D-12233W` | 96.6 | 145 | 1725 |
| E-CV2260297 | VCV | `CV2III-600D/725-10193W` | `` | 411.66 | 725 | 952.63 |
| E-W260008-009 | WL | `WDLIV-600/72.5-17x16E` | `` | 150 | 72.5 | 0 |
| E-W260039 | WL | `WSLIV-1600D/72.5-7x6D` | `` | 1217.4 | 72.5 | 0 |

## By family (judged)

| family | judged | exact | miss |
|---|---:|---:|---:|
| CM | 42 | 30 | 0 |
| CM2 | 51 | 28 | 1 |
| CMD | 7 | 5 | 0 |
| CV | 77 | 71 | 0 |
| CV2 | 147 | 138 | 2 |
| CVT | 2 | 1 | 0 |
| CZ | 6 | 6 | 0 |
| HWV | 5 | 4 | 0 |
| SHZV | 23 | 10 | 0 |
| SV | 7 | 7 | 0 |
| WDG | 15 | 15 | 0 |
| WDL | 2 | 0 | 1 |
| WSL | 19 | 14 | 1 |

## OCTC without the answer

No sold contact, roman auto, structure from the folder (drum / cage), ±N from the OS (5 positions when blank), Um from rated kV through `deriveDuty`.

| family | judged | exact as-is | exact honest | honest skipped |
|---|---:|---:|---:|---:|
| WDG | 15 | 15 | 7 | 0 |
| WDL | 2 | 0 | 0 | 0 |
| WSL | 19 | 14 | 8 | 2 |
