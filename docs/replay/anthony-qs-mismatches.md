# Anthony QS mismatches

Decisions on latest-R Anthony quotes vs shipped `selectOltc` (min-adequate:
CV2 → CM2 → SHZV → SHZVG; single III over 3×; no CV2-500; no SHZV-1300).

Duty: transformer MVA/kV/step % when printed; otherwise QS tech-table **I**
(not catalogue-max Ust — that over-rejects via Psin). Do not invent Iᵤ.

Engine change this pass: ~1 A epsilon on the 97% headroom rule so 349.9 A
still accepts CV2-350. Case 2 (489.7 → 600) unchanged.

| qs | quoted | engine #1 | decision | why |
|---|---|---|---|---|
| QS260181 | `CV2III-350D/126-10193G` | `CV2III-350D/126-10193G` | promote min-adequate | 60 MVA / 115 kV Δ → I=301.2 A; 10193G ±8 × 1.25% D → Ust=1437.5 V. CV2-350 covers. |
| QS260183 | WSL IV-800 | — | keep skip | WSL/OCTC. |
| QS260184 | `CV2III-350Y/72.5-10193W` | `CV2III-350Y/72.5-10193W` | promote min-adequate | 30 MVA / 66 kV Y → I=262.4 A; Ust=476.3 V. |
| QS260186 | `CV2III-350D/72.5-10193W` | `CV2III-350D/72.5-10193W` | promote min-adequate | 30 MVA / 66 kV Δ → I=262.4 A; Ust=825 V. |
| QS260187 | `CM2III-600Y/170D-10192G` | — | keep skip | Non-catalogue tap 10192G. Do not invent 10192. |
| QS260188 | `CV2III-350Y/72.5-10193W` | `CV2III-350Y/72.5-10193W` | min-adequate | Existing. I=192.5 A. |
| QS260192 | `SHZVIII-1000Y/72.5C-10181W` | `SHZVIII-1000Y/72.5C-10193W` | skip tap | I=635.1 A (165 MVA / 150 kV Y) → SHZV-1000 is min-adequate family. Tap 10181W is not a brochure code; do not add it. |
| QS260193 | CMA7 replacement | — | keep skip | MDU-only. |
| QS260196 | SHM-KX AVR | — | keep skip | MDU-only. |
| QS2602101 | `3xCZI-500/40.5-17` | — | keep skip | CZ dry. |
| QS2602102 | `HWVIII-400Y/40.5-10193W` | `HWVIII-400Y/40.5-10193W` | promote min-adequate | On-tank; printed I=400 A. |
| QS2602103 | `CVIII-350D/40.5-10193W` | CV2/CM2 vacuum | customer-specified | Existing. Oil lock; quoted type stays eligible. |
| QS2602104 | `CVIII-350D/40.5-12231W` | CV2/CM2 vacuum | customer-specified | Existing. |
| QS2602105 | `CV2III-350D/40.5-10193W` | `CV2III-350D/40.5-10193W` | promote min-adequate; **engine-bug-fixed** | I=349.9 A is S/√3U rounding of 350. Old 97% bump to 600 was commercially wrong. |
| QS2602107 | `CV2III-350Y/72.5-10193W` | `CV2III-350Y/72.5-10193W` | promote min-adequate | Same 30 MVA / 66 kV Y as 184. |
| QS2602108 | `CM2III-500Y/170D-12233W` | `CM2III-500Y/170D-12233W` | min-adequate | Existing. Um 170 / Ust 1660 exclude CV2. |
| QS2602110 | `CVI-700/72.5-10070` | `CVI-700/72.5-10070` (oil path) | promote customer-specified | Printed I=700 A, linear 7. Vacuum min-adequate is CM2I-800; buyer locked oil CV. Catalogue-max Ust 1400 exceeds CV I-700 Psin 660 — not used as duty. |
| QS2603114 | `SVIII-500D/40.5-10193W` | — | keep skip | Quoted 500 A < transformer I=721.7 A. |
| QS2603118 | `CV2III-350Y/72.5-10191W` | — | keep skip | Standard-model inquiry; no transformer Iᵤ. |
| QS2603127 | `CM2III-500Y/72.5C-10191W` | — | keep skip | No transformer Iᵤ (tech-table I is catalogue 500). |
| QS2603129 | `CVIII-350Y/40.5-10193W` | CV2 vacuum | customer-specified | Existing. |
| QS2603130 | `3xSHZVI-1000/170C-10193W` | SHZV III 1000 | keep skip | 3× when a III cover exists. |
| QS2604133 | `3xCZI-500/40.5-9` | — | keep skip | CZ dry. |
| QS2604134 | `SHZVIII-1000Y/72.5B-10213G` | — | keep skip | Non-catalogue tap 10213G. |
| QS2604135 | `CV2III-600Y/72.5-10193W` | `CV2III-600Y/72.5-10193W` | promote min-adequate | 140 MVA, no winding kV. Printed I=600 A. Printed Ust 1500 is catalogue max (600 A × 1500 V > CV2-600 Psin 800) — not used as duty. |
| QS2604137 | `HWVIII-400D/40.5-10191W` | `HWVIII-400D/40.5-10191W` | promote min-adequate | On-tank. 10 MVA / 20 kV Δ → I=288.7 A. |
| QS2604138 | CM-500 + CV-350 | — | keep skip | Two transformers (75 MVA 220 kV / 25 MVA 60 kV) on one QS. |
| QS2604139 | `SVIII-500Y/40.5-10193W` | — | keep skip | 35 kV only; no MVA. |
| QS2604141 | `CV2III-600D/40.5-10193W` | `CV2III-350D/40.5-10193W` | promote customer-specified | 10 MVA / 33 kV Δ → I=175 A fits CV2-350. Buyer locked 600. Quoted type stays eligible. |
| QS2604142 | `CVIII-350D/40.5-14271W` | CV2/CM2 | customer-specified | Existing. |
| QS2604146 | `CV2III-350D/72.5-12233W` | `CV2III-350D/72.5-12233W` | promote min-adequate | 24 MVA / 60 kV Δ → I=230.9 A. |
| QS2604148 | `SHZVIII-1000Y/72.5C-10193W` | `SHZVIII-1000Y/72.5C-10193W` | promote min-adequate | Auto-transformer; Um 72.5 so 225 kV is not the OLTC winding. Printed I=1000 A > CM2 600. |
| QS2605150 | `CVIII-350D/40.5-10091W` | — | keep skip | Quoted 350 A < transformer I=355.6 A. Epsilon does not raise a rating. |
| QS2605151 | `CVIII-350Y/40.5-10091W` | CV2 vacuum | customer-specified | Existing. |
| QS2605152 | `CV2III-350Y/72.5-10193W` | `CV2III-350Y/72.5-10193W` | min-adequate | Existing. |
| QS2605155 | `SHZVIII-1000Y/72.5C-10193W` | `SHZVIII-1000Y/72.5C-10193W` | min-adequate | Existing. I=656.1 A. |
| QS2605156 | `SHZVIII-600Y/72.5C-18353W` | — | keep skip | TBA; no transformer Iᵤ. |
| QS2605160 | `CM2III-500Y/72.5B-10181W` | — | keep skip | Non-catalogue tap 10181W. |
| QS2605161 | `SHZVIII-600Y/72.5C-10193W` | — | keep skip | TBA. |
| QS2605166 | `SVIII-500D/40.5-10193W` | — | keep skip | TBA. |
| QS2606167 | `HWVIII-800D/40.5-10193W` | `HWVIII-800D/40.5-10193W` | min-adequate | Existing. I=523 A. |
| QS2606168 | `CVIII-350D/40.5-10091W` | — | keep skip | TBA. |
| QS2606169 | `SHZVIII-1000Y/72.5C-10193W` | `SHZVIII-1000Y/72.5C-10193W` | promote min-adequate | Printed I=1000 A on 250 MVA line (Um 72.5). Sister 80 MVA is CM2-500, not this row. |
| QS2606170 | `SHZVIII-1000Y/72.5C-10193W` | `SHZVIII-1000Y/72.5C-10193W` | promote min-adequate | MEE copy of 6169. |
| QS2606171 | `SHZVIII-1000Y/72.5C-10091W` | — | keep skip | TBA. |
| QS2606173 | `HWVIII-400Y/72.5-10191W` | `HWVIII-400Y/72.5-10191W` | promote min-adequate | On-tank retrofit; printed I=400 A. Tap from model 10191W (±9), not tech-table 9 pos. |
| QS2606175 | `CV2III-600D/40.5-10193W` | — | keep skip | Quoted 600 A < transformer I=682.3 A. |
| QS2606180 | `SHZVIII-1000Y/72.5B-18353W` | `SHZVIII-1000Y/72.5B-18353W` | promote min-adequate | 15.8 MVA / 13.8 kV Y → I=661 A > CM2 600. ±16 → 18353W. |
| QS2607181 | `CV2III-500Y/72.5-10191W` | — | keep skip | CV2-500 is not a 2025 row. |
| QS2607182 | `CM2I-1500/72.5B-10191W` | — | keep skip | 40 MVA at 13.8 / 24.9 / 34.5 kV — winding for Iᵤ ambiguous. |
| QS2607183 | `CV2III-350D/40.5-10193W` | `CV2III-350D/40.5-10193W` | promote min-adequate; **engine-bug-fixed** | Same 349.9 A duty as 2105. |
| QS2607184 | CV2-350 D and Y | — | keep skip | Two types / three transformer ratings on one QS. |
| QS2607186 | `CM2III-500Y/170D-14273G` | `CM2III-500Y/170D-14273G` | min-adequate | Existing. |
| QS2607190 | `SHZVIII-1000Y/72.5D-12110` | CV2/CM2 | customer-specified | Existing. I=568.6 A fits CV2-600; buyer locked SHZV-1000. |
| QS2607195 | `3xSHZVI-1000/170C-10193W` | SHZV III | keep skip | 3× when a III cover exists. |
| QS2607196 | `CVIII-350D/40.5-14271W` | CV2/CM2 | customer-specified | Existing. |
| QS2607197 | `CMIII-600Y/72.5B-10193W` | CV2/CM2 | customer-specified | Existing. Oil CM-600; I=502 A. |
| QS2607198 | `SHZVIII-1000Y/72.5C-10191W` | — | keep skip | 145 MVA, kV TBA. |
| QS2607199 | `CV2III-600D/40.5-10091W` | — | keep skip | TBA. |
| QS2607201 | `SVIII-500D/40.5-12231W` | CV2-600 oil-off | customer-specified | Existing. |
| QS2607204 | `SHZVIII-600Y/72.5C-18353W` | CV2-350 | customer-specified | Existing. I=320.8 A. |
| QS2607207 | `2xSVIII-500D/40.5-10193W` | SV III | keep skip | Multi-unit when a III cover exists. |
| QS2607208 | `CVIII-350D/40.5-10193W` | — | keep skip | TBA. |
| QS2607210 | `CV2III-350Y/72.5-10193W` | — | keep skip | No transformer line. |
| QS2608213 | `CV2III-500Y/72.5-10191W` | — | keep skip | CV2-500 is not a 2025 row. |
| QS2608214 | `HWVIII-400D/72.5-18353W` | `HWVIII-400D/72.5-18353W` | min-adequate | Existing. |
| QS2608215 | `CM2III-500Y/126C-10191W` | — | keep skip | TBA. |
| QS2608216 | `SHZVIII-1300Y/126DE-18353W` | `SHZVGIII-1300Y/126DE-18353W` | promote min-adequate; **engine-correct** | Printed I=1300 A. SHZV III is 400/600/1000 only — do not add SHZV-1300. Min-adequate is SHZVG-1300. |
| QS2608217 | `3xCMI-500/72.5B-18353W` | CM/CM2 III or SHZV | keep skip | 3× when a III cover exists. I=836.7 A also exceeds quoted 500 A. |
| QS2608219 | `CV2III-600Y/72.5-10191W` | — | keep skip | TBA. |

## Counts (Anthony latest-R)

| bucket | n |
|---|---|
| match (min-adequate, #1 = quote) | 23 |
| eligible-different (customer-specified) | 12 |
| skip | 47 |
| engine-bug-fixed | 2 (QS2602105, QS2607183 — 97% epsilon) |

Qu-ET260001–013 and signed OS rows are unchanged.

## Leftover skips that still lack duty Iᵤ

QS2603118, QS2603127, QS2604138, QS2604139, QS2605156, QS2605161, QS2605166, QS2606168, QS2606171, QS2607182, QS2607184, QS2607198, QS2607199, QS2607208, QS2607210, QS2608215, QS2608219.

No email receive: every promote above has either computed I or printed tech-table I.
