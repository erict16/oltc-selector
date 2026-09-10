# 2026 OS replay

Source: `2026-os-sales.json`
Rows: 675. Judged: 388. Skipped: 287.

| verdict | n | % of judged | meaning |
|---|---:|---:|---|
| exact | 310 | 79.9% | engine #1 = sold type (selector letter / 3× prefix ignored) |
| family-i-um | 9 | 2.3% | #1 same family / I / Um (tap or grade differs) |
| family | 30 | 7.7% | #1 same family, different I or Um |
| eligible | 36 | 9.3% | sold type is in the list, not #1 |
| oil-vs-vac | 0 | 0.0% | sold oil (CM/CV/CMD), engine vacuum twin |
| miss | 3 | 0.8% | sold type not produced |

**#1 family+I+Um or better:** 82.2%
**sold type or vacuum twin eligible:** 99.2%

## Misses

| serial | folder | sold | engine #1 | I | Um | Ust |
|---|---|---|---|---:|---:|---:|
| E-CM2260210-213 | VCM | `CM2I-1500/170D-22433W` | `` | 1030 | 170 | 0 |
| E-CV2260116-117 | VCV | `CV2III-350D/145-12233W` | `CM2III-500D/170D-12233W` | 96.6 | 145 | 1725 |
| E-CV2260297 | VCV | `CV2III-600D/725-10193W` | `` | 411.66 | 725 | 952.63 |

## By family (judged)

| family | judged | exact | miss |
|---|---:|---:|---:|
| CM | 42 | 29 | 0 |
| CM2 | 51 | 27 | 1 |
| CMD | 7 | 5 | 0 |
| CV | 77 | 71 | 0 |
| CV2 | 147 | 141 | 2 |
| CVT | 2 | 0 | 0 |
| CZ | 6 | 6 | 0 |
| HWV | 5 | 4 | 0 |
| SHZV | 23 | 11 | 0 |
| SV | 7 | 7 | 0 |
| WDL | 2 | 1 | 0 |
| WSL | 19 | 8 | 0 |
