# 2025 OS replay

Source: `2025-os-sales.json`
Rows: 910. Judged: 563. Skipped: 347.

| verdict | n | % of judged | meaning |
|---|---:|---:|---|
| exact | 433 | 76.9% | engine #1 = sold type (selector letter / 3× prefix ignored) |
| family-i-um | 12 | 2.1% | #1 same family / I / Um (tap or grade differs) |
| family | 49 | 8.7% | #1 same family, different I or Um |
| eligible | 48 | 8.5% | sold type is in the list, not #1 |
| oil-vs-vac | 0 | 0.0% | sold oil (CM/CV/CMD), engine vacuum twin |
| miss | 21 | 3.7% | sold type not produced |

**#1 family+I+Um or better:** 79.0%
**sold type or vacuum twin eligible:** 96.3%

## Misses

| serial | folder | sold | engine #1 | I | Um | Ust |
|---|---|---|---|---:|---:|---:|
| E-M250118-119 | CM | `3xCMI-1200/72.5B-10191W` | `CMDI-2400/72.5B-10191W` | 1674 | 72.5 | 172.5 |
| E-M250122 | CM | `3xCMI-1200/72.5B-14271W` | `CMDI-1600/72.5B-14271W` | 1562 | 72.5 | 266 |
| E-V250157-160 | CV | `CVIII-350D/40.5-1223W` | `3xCMI-500/72.5B-18353W` | 216.5 | 40.5 | 250 |
| E-V250173-186 | CV | `CVIII-350Y/10-090` | `` | 181.3 | 10 | 454.7 |
| E-SHZV250001-003 | SHZV | `SHZVI-1500/420D-18353W` | `` | 1100.9 | 420 | 1428.9 |
| E-SHZV250049 | SHZV | `SHZVIII-1000Y/725D-18170` | `` | 801.9 | 725 | 952.6 |
| E-SHZV250050 | SHZV | `SHZVIII-1000Y/725D-18170` | `` | 801.9 | 725 | 952.6 |
| E-SHZVG250001 | SHZVG | `SHZVI-1300/126DE-18353W` | `` | 508.8 | 126 | 5176.1 |
| E-CM2250075 | VCM | `3xCM2I-1500/72.5D-12231` | `` | 904.8 | 72.5 | 2555 |
| E-CM2250195 | VCM | `CM2III-600Y/145C-1223` | `CV2III-350Y/145-10193W` | 218.7 | 145 | 763 |
| E-CM2250220 | VCM | `CM2III-300Y/145B-12233W` | `CV2III-350Y/145-12233W` | 109.9 | 145 | 1082 |
| E-CM2250230 | VCM | `CM2III-500Y/72.5C-10191` | `` | 200.82 | 72.5 | 2047 |
| E-CV2250179-180 | VCV | `CV2III-350D/145-12233W` | `3xCM2I-500/170D-12233W` | 48.31 | 145 | 1725 |
| E-CV2250303 | VCV | `CV2III-350D/145-12231W` | `3xCM2I-500/170D-12231W` | 36.23 | 145 | 1725 |
| E-CV2250414 | VCV | `CV2III-350D/145-1223` | `3xCM2I-500/170D-10193W` | 217.4 | 145 | 2070 |
| E-W250001-002 | W□L | `WSLV-1000D/145-5x4E` | `` | 1000 | 145 | 0 |
| E-W250009 | W□L | `WSLV-600D/126-5x4D` | `` | 600 | 126 | 0 |
| E-W250012 | W□L | `WSLV-1000Y/126-6x5A` | `` | 804 | 126 | 0 |
| E-W250024 | W□L | `3xWDLV-1000/363-3x2E` | `` | 2228.42 | 363 | 0 |
| E-W250030 | W□L | `WSLVII-600D/12-12x12D` | `WSGVII-300D/40.5-12x12D` | 288.7 | 12 | 0 |
| E-W250055 | W□L | `WDLV-600/170-4x3A` | `` | 454.7 | 170 | 0 |

## By family (judged)

| family | judged | exact | miss |
|---|---:|---:|---:|
| CM | 45 | 31 | 2 |
| CM2 | 105 | 55 | 4 |
| CMD | 6 | 6 | 0 |
| CV | 91 | 86 | 2 |
| CV2 | 231 | 200 | 3 |
| CVT | 4 | 0 | 0 |
| CZ | 7 | 7 | 0 |
| HWDK | 1 | 1 | 0 |
| HWV | 5 | 4 | 0 |
| SHZV | 22 | 9 | 4 |
| SHZVG | 3 | 2 | 0 |
| SV | 12 | 10 | 0 |
| WDL | 3 | 1 | 2 |
| WSL | 28 | 21 | 4 |
