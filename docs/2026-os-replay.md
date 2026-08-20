# 2026 OS replay

Source: `2026-os-sales.json`
Rows: 675. Judged: 388. Skipped: 287.

| verdict | n | % of judged | meaning |
|---|---:|---:|---|
| exact | 171 | 44.1% | engine #1 = sold type |
| family-i-um | 31 | 8.0% | #1 same family / I / Um (tap or grade differs) |
| family | 23 | 5.9% | #1 same family, different I or Um |
| eligible | 153 | 39.4% | sold type is in the list, not #1 |
| oil-vs-vac | 1 | 0.3% | sold oil (CM/CV/CMD), engine vacuum twin |
| miss | 9 | 2.3% | sold type not produced |

**#1 family+I+Um or better:** 52.1%
**sold type or vacuum twin eligible:** 97.7%

Duty input = transformer I / Ust / ±N from the sold tap code + sold Um / Y-D / phases. Family and current rating are the *answer*, not the input. Selector letter is auto (OS often writes C when B covers).

Skipped 287: 134 no type in the PDF (cover/PO scan), 123 type but no transformer I, 30 unparsed (SY cage, odd taps).

`eligible` is mostly Russian oil CM/CV when the engine #1 is vacuum CM2/CV2 — sold type is still on the list. That is the min-adequate design, not a bug.

## Misses (9)

| serial | sold | engine #1 | why |
|---|---|---|---|
| E-CMD260001 | `CMDIII-1000Y/72.5C` | `SHZVGIII-1300Y` | I=983, oil CMD; vacuum path is SHZVG |
| E-CVT260006 | `CVTIII-200D/12-0909` | — | tap `0909` not catalogue |
| E-SHZV260049 | `SHZVIII-1300Y` | `SHZVGIII-1300Y` | III 1300 is SHZVG; sold used old name |
| E-CM2260210-213 | `CM2I-1500/170D-22433W` | — | pitch 22 does not exist |
| E-CV2260116-117 | `CV2III-350D/145-12233W` | `CM2III-500D/170` | Ust 1725 > CV2 12-pitch 1500 V |
| E-CV2260277 | `CV2III-600D` | `SHZVIII-1000D` | I=603.75 > CV2 III 600 |
| E-CV2260297 | `CV2III-600D/725` | — | Um parsed 725 (72.5 glued) |
| E-W260008-009 | `WDLIV-600 … 17x16E` | — | contact 17x16 not in list |
| E-W260022-023 | `WDLIV-1200 … 9x8E` | `WSLIV-1000 … 18x17E` | contact 9x8 not catalogue |
