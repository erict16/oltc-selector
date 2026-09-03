# 2026 OS replay

Source: `2026-os-sales.json`
Rows: 675. Judged: 388. Skipped: 287.

| verdict | n | % of judged | meaning |
|---|---:|---:|---|
| exact | 308 | 79.4% | engine #1 = sold type (selector letter / 3× prefix ignored) |
| family-i-um | 10 | 2.6% | #1 same family / I / Um (tap or grade differs) |
| family | 28 | 7.2% | #1 same family, different I or Um |
| eligible | 36 | 9.3% | sold type is in the list, not #1 |
| oil-vs-vac | 0 | 0.0% | sold oil (CM/CV/CMD), engine vacuum twin |
| miss | 6 | 1.5% | sold type not produced |

**#1 family+I+Um or better:** 82.0%
**sold type or vacuum twin eligible:** 98.5%

## Misses

| serial | folder | sold | engine #1 | I | Um | Ust |
|---|---|---|---|---:|---:|---:|
| E-CVT260006 | CVT | `CVTIII-200D/12-0909` | `` | 88.88 | 12 | 500 |
| E-CM2260210-213 | VCM | `CM2I-1500/170D-22433W` | `` | 1030 | 170 | 0 |
| E-CV2260116-117 | VCV | `CV2III-350D/145-12233W` | `CM2III-500D/170D-12233W` | 96.6 | 145 | 1725 |
| E-CV2260297 | VCV | `CV2III-600D/725-10193W` | `` | 411.66 | 725 | 952.63 |
| E-W260008-009 | WL | `WDLIV-600/72.5-17x16E` | `` | 150 | 72.5 | 0 |
| E-W260022-023 | WL | `WDLIV-1200/72.5-9x8E` | `WSLIV-1000Y/72.5-18x17E` | 1000 | 72.5 | 0 |
