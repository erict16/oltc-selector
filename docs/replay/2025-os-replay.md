# 2025 OS replay

Source: `2025-os-sales.json`
Rows: 910. Judged: 563. Skipped: 347.

| verdict | n | % of judged | meaning |
|---|---:|---:|---|
| exact | 428 | 76.0% | engine #1 = sold type (selector letter / 3× prefix ignored) |
| family-i-um | 12 | 2.1% | #1 same family / I / Um (tap or grade differs) |
| family | 59 | 10.5% | #1 same family, different I or Um |
| eligible | 48 | 8.5% | sold type is in the list, not #1 |
| oil-vs-vac | 0 | 0.0% | sold oil (CM/CV/CMD), engine vacuum twin |
| miss | 16 | 2.8% | sold type not produced |

**#1 family+I+Um or better:** 78.2%
**sold type or vacuum twin eligible:** 97.2%

## Misses

| serial | folder | sold | engine #1 | I | Um | Ust |
|---|---|---|---|---:|---:|---:|
| E-M250118-119 | CM | `3xCMI-1200/72.5B-10191W` | `CMDI-2400/72.5B-10191W` | 1674 | 72.5 | 172.5 |
| E-M250122 | CM | `3xCMI-1200/72.5B-14271W` | `CMDI-2400/72.5B-14271W` | 1562 | 72.5 | 266 |
| E-V250157-160 | CV | `CVIII-350D/40.5-1223W` | `CMIII-500D/72.5B-18353W` | 216.5 | 40.5 | 250 |
| E-V250173-186 | CV | `CVIII-350Y/10-090` | `` | 181.3 | 10 | 454.7 |
| E-V250416 | CV | `2xCVIII-350D/40.5-10193W` | `CMIII-600D/72.5B-10193W` | 561 | 40.5 | 412.5 |
| E-SHZV250001-003 | SHZV | `SHZVI-1500/420D-18353W` | `` | 1100.9 | 420 | 1428.9 |
| E-SHZV250049 | SHZV | `SHZVIII-1000Y/725D-18170` | `` | 801.9 | 725 | 952.6 |
| E-SHZV250050 | SHZV | `SHZVIII-1000Y/725D-18170` | `` | 801.9 | 725 | 952.6 |
| E-SHZVG250001 | SHZVG | `SHZVI-1300/126DE-18353W` | `` | 508.8 | 126 | 5176.1 |
| E-CM2250075 | VCM | `3xCM2I-1500/72.5D-12231` | `` | 904.8 | 72.5 | 2555 |
| E-CM2250195 | VCM | `CM2III-600Y/145C-1223` | `CV2III-350Y/145-10193W` | 218.7 | 145 | 763 |
| E-CM2250220 | VCM | `CM2III-300Y/145B-12233W` | `CV2III-350Y/145-12233W` | 109.9 | 145 | 1082 |
| E-CM2250230 | VCM | `CM2III-500Y/72.5C-10191` | `` | 200.82 | 72.5 | 2047 |
| E-CV2250179-180 | VCV | `CV2III-350D/145-12233W` | `CM2III-500D/170D-12233W` | 48.31 | 145 | 1725 |
| E-CV2250303 | VCV | `CV2III-350D/145-12231W` | `CM2III-500D/170D-12231W` | 36.23 | 145 | 1725 |
| E-CV2250414 | VCV | `CV2III-350D/145-1223` | `CM2III-500D/170D-10193W` | 217.4 | 145 | 2070 |

## By family (judged)

| family | judged | exact | miss |
|---|---:|---:|---:|
| CM | 45 | 31 | 2 |
| CM2 | 105 | 55 | 4 |
| CMD | 6 | 6 | 0 |
| CV | 91 | 86 | 3 |
| CV2 | 231 | 199 | 3 |
| CVT | 4 | 0 | 0 |
| CZ | 7 | 7 | 0 |
| HWDK | 1 | 1 | 0 |
| HWV | 5 | 4 | 0 |
| SHZV | 22 | 9 | 4 |
| SHZVG | 3 | 2 | 0 |
| SV | 12 | 10 | 0 |
| WDL | 3 | 2 | 0 |
| WSL | 28 | 16 | 0 |
