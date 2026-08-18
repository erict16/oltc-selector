# Anthony QS inventory

Every PDF under `QS/Anthony/`. Same QS number collapsed to **latest R**
(filename with no R = R0). Older revs are superseded, not replay cases.
Duty Iᵤ/Ust from transformer MVA/kV/step % only — catalogue max is not used.

- files: **171**
- unique QS: **82**
- replay: **35** (min-adequate 23, customer-specified 12)
- skip (latest R): **47**
- unread: **0**

## Skip reasons (latest R)

- 14 — incomplete duty (no recoverable Iᵤ from transformer or a single-row tech table).
- 13 — WSL/WDL/OCTC (de-energized). Out of OLTC engine scope.
- 4 — 3× singles; engine will not list 3× when a III cover exists.
- 4 — non-catalogue tap (10181W / 10192G / 10213G) — engine cannot emit.
- 3 — quoted Iᵤ below transformer duty; do not invent a cover.
- 2 — MDU-only (CMA7/SHM-D/SHM-KX replacement). Selector does not pick drives.
- 2 — CZ dry/reactor — engine coverage not asserted.
- 2 — CV2-500 is not a 2025 catalogue row.
- 1 — two transformers on one QS.
- 1 — two OLTC types / three transformer ratings on one QS.
- 1 — 40 MVA at 13.8 / 24.9 / 34.5 kV — winding for Iᵤ ambiguous.

## Files

| qs | rev | date | model | customer/project | budgetary | tag / skip | superseded-by |
|---|---|---|---|---|---|---|---|
| QS260181 | R2 | 2026-02-13 | `CV2III-350D/126-10193G` | TIRATHAI TRANSFORMER / Unimicron (Thailand) Project | no | min-adequate |  |
| QS260183 | R1 | 2026-01-29 | `WSL IV-800Y/170-6x5A` | GE (UTR) / OCTC PLTGU GRATI 153.75MVA | no | superseded | QS260183-R2 |
| QS260183 | R2 | 2026-02-10 | `WSL IV-800Y/170-6x5A` | GE (UTR) / OCTC PLTGU GRATI 153.75MVA | no | skip: WSL/WDL/OCTC (de-energized). Out of OLTC engine scope. |  |
| QS260184 | R0 | 2026-02-09 | `CV2III-350Y/72.5-10193W` | AGT / Solar Project | no | min-adequate |  |
| QS260186 | R0 | 2026-02-02 | `CV2III-350D/72.5-10193W` | AGT / Amarapura Project | no | min-adequate |  |
| QS260187 | R0 | 2026-02-16 | `CM2III-600Y/170D-10192G` | GE (UNINDO) / OLTC GAIA2 Datacentre 90MVA | yes | superseded | QS260187-R0 |
| QS260187 | R0 | 2026-02-26 | `CM2III-600Y/170D-10192G` | GE (UNINDO) / OLTC GAIA2 Datacentre 90MVA | yes | skip: non-catalogue tap 10192G — engine cannot emit. |  |
| QS260188 | R0 | 2026-01-30 | `CVIII-350Y/72.5-10193W` | GE (UTR) / OLTC TRANSCOAL MINING TCM 50 MVA | no | superseded | QS260188-R2 |
| QS260188 | R1 | 2026-02-11 | `CV2III-350Y/72.5-10193W` | GE / OLTC TRANSCOAL MINING TCM 50 MVA | no | superseded | QS260188-R2 |
| QS260188 | R2 | 2026-03-09 | `CV2III-350Y/72.5-10193W` | GE / OLTC TRANSCOAL MINING TCM 50 MVA | no | min-adequate |  |
| QS260192 | R0 | 2026-02-09 | `SHZVIII-1000Y/170B-10191W` | Bambang Djaja | no | superseded | QS260192-R2 |
| QS260192 | R1 | 2026-03-05 | `SHZVIII-1000Y/170C-10191W` | Bambang Djaja | no | superseded | QS260192-R2 |
| QS260192 | R2 | 2026-04-24 | `SHZVIII-1000Y/72.5C-10181W` | Bambang Djaja | no | skip: non-catalogue tap 10181W — engine cannot emit. |  |
| QS260192 | R2 | 2026-04-24 | `SHZVIII-1000Y/170C-10191W` | Bambang Djaja | no | superseded | QS260192-R2 |
| QS260193 | R0 | 2026-02-09 | `—` | HL-Global / PTC1 - M08305 MDU replacement | no | skip: MDU-only (CMA7/SHM-D/SHM-KX replacement). Selector does not pick drives. |  |
| QS260196 | R0 | 2026-03-11 | `—` | GE (UNINDO) / PLN GI BALONGAN 971 | no | skip: MDU-only (CMA7/SHM-D/SHM-KX replacement). Selector does not pick drives. |  |
| QS2602101 | R0 | 2026-02-24 | `3xCZI-500/40.5-17` | Bambang Djaja / 2600059 // OHOV.500.407 and AVHM.080.450 | no | superseded | QS2602101-R0 |
| QS2602101 | R0 | 2026-03-11 | `3xCZI-500/40.5-17` | Bambang Djaja / 2600059 // OHOV.500.407 and AVHM.080.450 | no | skip: CZ dry/reactor — engine coverage not asserted. |  |
| QS2602102 | R0 | 2026-02-25 | `HWVIII-400Y/40.5-10193W` | PT Bambang Djaja / 20260672 // OHOH.400.400 | no | min-adequate |  |
| QS2602103 | R1 | 2026-04-28 | `CVIII-350D/40.5-10193W` | Bambang Djaja / 20260445-2600149 // AVHM.080.450 and OHOV.350.400 | no | superseded | QS2602103-R1 |
| QS2602103 | R1 | 2026-04-29 | `CVIII-350D/40.5-10193W` | Bambang Djaja / 20260445-2600149 // AVHM.080.450 and OHOV.350.400 | no | superseded | QS2602103-R1 |
| QS2602103 | R1 | 2026-04-30 | `CVIII-350D/40.5-10193W` | Bambang Djaja / 20260445-2600149 // AVHM.080.450 and OHOV.350.400 | no | customer-specified |  |
| QS2602104 | R0 | 2026-02-28 | `CVIII-350D/40.5-12231W` | HAVEC / Transformer: 7000kVA, 22kV, YNa0, OLTC on 22kV side, - 17% to +5%, 23 steps | no | customer-specified |  |
| QS2602105 | R0 | 2026-04-02 | `CV2III-350D/40.5-10193W` | AGT / Transformer: 20MVA, 33kV, +6%-10%, 17 positions x 1.65% per step, Dyn11 | no | superseded | QS2602105-R0 |
| QS2602105 | R0 | 2026-05-06 | `CV2III-350D/40.5-10193W` | AGT / Transformer: 20MVA, 33kV, +6%-10%, 17 positions x 1.65% per step, Dyn11 | no | min-adequate |  |
| QS2602107 | R0 | 2026-04-02 | `CV2III-350Y/72.5-10193W` | AGT / Transformer: 30MVA 66/11kV | no | min-adequate |  |
| QS2602108 | R0 | 2026-03-02 | `CM2III-500Y/170D-12233W` | AGT / Transformer: 50,000kVA, 230kV, +5%-15%, 21 steps x 1.25% per step, YNyn0d11 | no | superseded | QS2602108-R1 |
| QS2602108 | R1 | 2026-03-05 | `CM2III-500Y/170D-12233W` | AGT / Transformer: 50,000kVA, 230kV, +5%-15%, 21 steps x 1.25% per step, YNyn0d11 | no | min-adequate |  |
| QS2602110 | R0 | 2026-03-11 | `CVI-700/72.5-10070` | SANAKY EMC / Transformer: 18500kVA (60075) | no | superseded | QS2602110-R4 |
| QS2602110 | R0 | 2026-03-12 | `CVI-700/72.5-10070` | SANAKY EMC / Transformer: 18500kVA (60075) | no | superseded | QS2602110-R4 |
| QS2602110 | R2 | 2026-03-03 | `CVI-700/72.5-10070` | SANAKY / Transformer: 18500kVA (60075) | no | superseded | QS2602110-R4 |
| QS2602110 | R2 | 2026-03-11 | `CVI-700/72.5-10070` | SANAKY / Transformer: 18500kVA (60075) | no | superseded | QS2602110-R4 |
| QS2602110 | R3 | 2026-03-23 | `CVI-700/72.5-10070` | SANAKY / Transformer: 18500kVA (60075) | no | superseded | QS2602110-R4 |
| QS2602110 | R4 | 2026-04-20 | `CVI-700/72.5-10070` | SANAKY / Transformer: 18500kVA (60075) | no | customer-specified |  |
| QS2603114 | R0 | 2026-03-10 | `SVIII-500D/40.5-10193W` | Bambang Djaja | no | skip: quoted Iᵤ 500 A below transformer duty I=721.7 A; do not invent a cover. |  |
| QS2603117 | R0 | 2026-03-06 | `WSLIV-600Y/72.5-7*6E` | MEE / OCTC | no | skip: WSL/WDL/OCTC (de-energized). Out of OLTC engine scope. |  |
| QS2603118 | R0 | 2026-03-10 | `CV2III-350Y/72.5-10191W` | EEMC / s - Inquiry for standard OLTC models | no | skip: incomplete duty (no recoverable Iᵤ/Ust from QS header). |  |
| QS2603120 | R0 | 2026-03-13 | `WSL IV-600D/72.5 - 6x5A` | HLG-VEE / VEE 26_Inquiry OCTC WSL IV-600D/72.5-6x5 | no | skip: WSL/WDL/OCTC (de-energized). Out of OLTC engine scope. |  |
| QS2603121 | R0 | 2026-03-16 | `WSLIV-2000D/126-6X5 (B)` | Thu Duc Trafo | no | superseded | QS2603121-R1 |
| QS2603121 | R1 | 2026-03-17 | `WSLIV-2000D/126-6X5 (B)` | HLG / OCTC replacement for Thu Duc Transformer Company | no | skip: WSL/WDL/OCTC (de-energized). Out of OLTC engine scope. |  |
| QS2603122 | R0 | 2026-03-16 | `WSL II-800D/72.5 - 6x5A` | EEMC / EEMC PO26-631. EED2603_12 | no | skip: WSL/WDL/OCTC (de-energized). Out of OLTC engine scope. |  |
| QS2603127 | R0 | 2026-04-08 | `CV2III-350Y/72.5-10191W` | HANAKA / – Std OLTC models | yes | superseded | QS2603127-R1 |
| QS2603127 | R0 | 2026-07-03 | `CV2III-350Y/72.5-10191W` | HANAKA / – Std OLTC models | yes | superseded | QS2603127-R1 |
| QS2603127 | R0 | 2026-07-09 | `CM2III-500Y/72.5C-10191W` | HANAKA / OLTC Model: CM2III-500Y/72.5C-10191W | no | superseded | QS2603127-R1 |
| QS2603127 | R1 | 2026-07-14 | `CM2III-500Y/72.5C-10191W` | HANAKA / OLTC Model: CM2III-500Y/72.5C-10191W | no | skip: incomplete duty (no recoverable Iᵤ/Ust from QS header). |  |
| QS2603129 | R0 | 2026-03-24 | `CVIII-350Y/40.5-10193W` | HLG / TRANSFORMER: 18000kVA - 35±8x1,25%/6.3kV, Yd11 | yes | customer-specified |  |
| QS2603130 | R0 | 2026-03-26 | `3xSHZVI-1000/170C-10193W` | EEMC | no | skip: 3× singles; engine will not list 3× when a III cover exists. |  |
| QS2603131 | R0 | 2026-03-30 | `WSLIV-600Y/72.5- 6x5A with hand wheel` | MEE | no | skip: WSL/WDL/OCTC (de-energized). Out of OLTC engine scope. |  |
| QS2603132 | R0 | 2026-04-06 | `WSLIV-600Y/72.5- 6x5A with hand wheel` | MEE | no | superseded | QS2603132-R0 |
| QS2603132 | R0 | 2026-04-07 | `WSLIV-600Y/72.5- 6x5A with hand wheel` | MEE | no | skip: WSL/WDL/OCTC (de-energized). Out of OLTC engine scope. |  |
| QS2604133 | R0 | 2026-04-10 | `3xCZI-500/40.5-9` | Bambang Djaja / Dry Type OLTC Inquiry - Ref. 20242414 | no | skip: CZ dry/reactor — engine coverage not asserted. |  |
| QS2604134 | R0 | 2026-04-07 | `SHZVIII-1000Y/72.5B-10213G` | GE (UTR) / 26_02_UTR_06_E - SYD02 | yes | skip: non-catalogue tap 10213G — engine cannot emit. |  |
| QS2604135 | R0 | 2026-04-07 | `CV2III-600Y/72.5-10193W` | GE (UNINDO) / OLTC RIAU GFPP 140 MVA | yes | superseded | QS2604135-R1 |
| QS2604135 | R0 | 2026-04-10 | `CV2III-600Y/72.5-10193W` | GE (UNINDO) / OLTC RIAU GFPP 140 MVA | no | superseded | QS2604135-R1 |
| QS2604135 | R1 | 2026-04-20 | `CV2III-600Y/72.5-10193W` | GE (UNINDO) / OLTC RIAU GFPP 140 MVA | no | min-adequate |  |
| QS2604137 | R0 | 2026-04-10 | `HWVIII-400D/40.5-10191W` | PT Bambang Djaja / Type HWV_ Ref. 20260243 | yes | min-adequate |  |
| QS2604138 | R0 | 2026-04-29 | `CMIII-500Y/126B-14273W` | GE (UNINDO) / ANGOLA 75 MVA & 25 MVA | yes | superseded | QS2604138-R0 |
| QS2604138 | R0 | 2026-07-10 | `CMIII-500Y/126DE-14273W` | GE (UNINDO) / ANGOLA 75 MVA & 25 MVA | no | skip: two transformers on one QS. |  |
| QS2604139 | R0 | 2026-04-09 | `SVIII-500Y/40.5-10193W` | MEE / Haiphong Aquaculture Factory | no | skip: incomplete duty (no recoverable Iᵤ/Ust from QS header). |  |
| QS2604141 | R0 | 2026-05-08 | `CV2III-600D/40.5-10193W` | PT Bambang Djaja | yes | customer-specified |  |
| QS2604142 | R0 | 2026-04-20 | `CVIII-350D/40.5-14271W` | HL-G (HBT) / Transformer: 10MVA 36kV +6/-20 x 1.0%/22kV | no | customer-specified |  |
| QS2604144 | R0 | 2026-04-30 | `WDL IV- 1000Y/126-06x05B with hand wheel` | EEMC / Transformer: 72 MVA, 303kV | no | skip: WSL/WDL/OCTC (de-energized). Out of OLTC engine scope. |  |
| QS2604146 | R0 | 2026-04-29 | `CV2III-350D/72.5-12233W` | GE / OLTC CORMIDON 24 MVA | no | superseded | QS2604146-R1 |
| QS2604146 | R1 | 2026-06-05 | `CV2III-350D/72.5-12233W` | GE / OLTC CORMIDON 24 MVA | no | min-adequate |  |
| QS2604148 | R0 | 2026-04-29 | `SHZVIII-1000Y/72.5C-10193W` | EEMC / VIN SPP project | no | superseded | QS2604148-R1 |
| QS2604148 | R1 | 2026-05-19 | `SHZVIII-1000Y/72.5C-10193W` | EEMC / VinEnergo SPP project | no | min-adequate |  |
| QS2605150 | R0 | 2026-05-04 | `CVIII-350D/40.5-10091W` | Bambang Djaja | no | superseded | QS2605150-R0 |
| QS2605150 | R0 | 2026-05-04 | `CVIII-350D/40.5-10091W` | Bambang Djaja | no | skip: quoted Iᵤ 350 A below transformer duty I=355.6 A; do not invent a cover. |  |
| QS2605151 | R0 | 2026-05-08 | `CVIII-350Y/40.5-10091W` | Bambang Djaja | no | superseded | QS2605151-R0 |
| QS2605151 | R0 | 2026-05-26 | `CVIII-350Y/40.5-10091W` | Bambang Djaja | no | superseded | QS2605151-R0 |
| QS2605151 | R0 | 2026-05-26 | `CVIII-350Y/40.5-10091W` | Bambang Djaja | no | customer-specified |  |
| QS2605152 | R0 | 2026-05-18 | `CV2III-350Y/72.5-10193W` | Bambang Djaja | no | min-adequate |  |
| QS2605153 | R0 | 2026-05-08 | `WSL II-800D/72.5 - 6x5A` | EEMC / EEMC PO26-661. EED2605_05 | no | skip: WSL/WDL/OCTC (de-energized). Out of OLTC engine scope. |  |
| QS2605154 | R0 | 2026-05-19 | `WSLII-600D/72.5-12x11C` | Sanaky / DETC 11 pos 66kV | no | superseded | QS2605154-R1 |
| QS2605154 | R1 | 2026-05-28 | `WSLII-600D/72.5-12x11C` | Sanaky / DETC 11 pos 66kV | no | superseded | QS2605154-R1 |
| QS2605154 | R1 | 2026-06-15 | `WSLII-600D/72.5-12x11C` | Sanaky / DETC 11 pos 66kV | no | superseded | QS2605154-R1 |
| QS2605154 | R1 | 2026-06-16 | `WSLII-600D/72.5-12x11D` | Sanaky / DETC 11 pos 66kV | no | skip: WSL/WDL/OCTC (de-energized). Out of OLTC engine scope. |  |
| QS2605155 | R0 | 2026-05-12 | `SHZVIII-1000Y/72.5C-10193W` | PTE | yes | superseded | QS2605155-R0 |
| QS2605155 | R0 | 2026-06-19 | `SHZVIII-1000Y/72.5C-10193W` | PTE | no | min-adequate |  |
| QS2605156 | R0 | 2026-05-12 | `SHZVIII-600Y/72.5C-18353W` | EEMC | yes | skip: incomplete duty (no recoverable Iᵤ/Ust from QS header). |  |
| QS2605160 | R0 | 2026-05-19 | `CM2III-500Y/72.5B-10181W` | PT Bambang Djaja | no | skip: non-catalogue tap 10181W — engine cannot emit. |  |
| QS2605161 | R0 | 2026-05-19 | `SHZVIII-600Y/72.5C-10193W` | MEE / Soc Trang | yes | superseded | QS2605161-R0 |
| QS2605161 | R0 | 2026-06-03 | `SHZVIII-600Y/72.5C-10193W` | MEE / Soc Trang | yes | skip: incomplete duty (no recoverable Iᵤ/Ust from QS header). |  |
| QS2605166 | R0 | 2026-05-26 | `SVIII-500D/40.5-10193W` | Bambang Djaja | no | skip: incomplete duty (no recoverable Iᵤ/Ust from QS header). |  |
| QS2606167 | R0 | 2026-06-17 | `HWVIII-800D/40.5-10193W` | PT Bambang Djaja / PHE OSES 5MVA & 10MVA - HWVIII | yes | superseded | QS2606167-R1 |
| QS2606167 | R1 | 2026-08-07 | `HWVIII-800D/40.5-10193W` | PT Bambang Djaja / PHE OSES 5MVA & 10MVA - HWVIII | no | min-adequate |  |
| QS2606168 | R0 | 2026-06-03 | `CVIII-350D/40.5-10091W` | HLG | no | skip: incomplete duty (no recoverable Iᵤ/Ust from QS header). |  |
| QS2606169 | R0 | 2026-06-04 | `SHZVIII-1000Y/72.5C-10193W` | EEMC / Transformer: 250MVA-220kV, | yes | superseded | QS2606169-R0 |
| QS2606169 | R0 | 2026-06-04 | `SHZVIII-1000Y/72.5C-10193W` | MEE / Transformer: 250MVA-220kV, | yes | superseded | QS2606169-R0 |
| QS2606169 | R0 | 2026-06-05 | `SHZVIII-1000Y/72.5C-10193W` | EEMC / Transformer: 250MVA-220kV, 80MVA-220kV | yes | min-adequate |  |
| QS2606170 | R0 | 2026-06-05 | `SHZVIII-1000Y/72.5C-10193W` | MEE / Transformer: 250MVA-220kV, 80MVA-220kV | yes | min-adequate |  |
| QS2606171 | R0 | 2026-06-12 | `SHZVIII-1000Y/72.5C-10091W` | EEMC / Dong Phat Hai Ha 1 Thermal Power Plant | no | superseded | QS2606171-R0 |
| QS2606171 | R0 | 2026-06-17 | `SHZVIII-1000Y/72.5C-10091W` | HLG / Dong Phat Hai Ha 1 Thermal Power Plant | no | skip: incomplete duty (no recoverable Iᵤ/Ust from QS header). |  |
| QS2606173 | R0 | 2026-06-17 | `HWVIII-400D/72.5-10191W` | HLG / EVN substation UZF retrofit job | yes | superseded | QS2606173-R2 |
| QS2606173 | R0 | 2026-06-18 | `HWVIII-400D/72.5-10191W` | HLG / EVN substation UZF retrofit job | yes | superseded | QS2606173-R2 |
| QS2606173 | R0 | 2026-06-22 | `HWVIII-400D/72.5-10191W` | HLG / EVN substation UZF retrofit job | no | superseded | QS2606173-R2 |
| QS2606173 | R0 | 2026-06-24 | `HWVIII-400D/72.5-10193W` | HLG / EVN substation UZF retrofit job | no | superseded | QS2606173-R2 |
| QS2606173 | R1 | 2026-06-30 | `HWVIII-400D/72.5-10193W` | HLG / EVN substation UZF retrofit job | no | superseded | QS2606173-R2 |
| QS2606173 | R2 | 2026-07-09 | `HWVIII-400Y/72.5-10191W` | HLG / EVN substation UZF retrofit job | no | min-adequate |  |
| QS2606175 | R0 | 2026-06-23 | `SVIII-500D/40.5-10193W` | SANAKY / Transformer: 26 MVA, 22 kV (+8/-8 × 1.25%) / 6.6 kV, Dyn11 | yes | superseded | QS2606175-R2 |
| QS2606175 | R0 | 2026-06-29 | `CV2III-600D/40.5-10193W` | SANAKY / Transformer: 26 MVA, 22 kV (+8/-8 × 1.25%) / 6.6 kV, Dyn11 | no | superseded | QS2606175-R2 |
| QS2606175 | R1 | 2026-07-09 | `CV2III-600D/40.5-10193W` | SANAKY / Transformer: 26 MVA, 22 kV (+8/-8 × 1.25%) / 6.6 kV, Dyn11 | no | superseded | QS2606175-R2 |
| QS2606175 | R2 | 2026-07-13 | `CV2III-600D/40.5-10193W` | SANAKY / Transformer: 26 MVA, 22 kV (+8/-8 × 1.25%) / 6.6 kV, Dyn11 | no | superseded | QS2606175-R2 |
| QS2606175 | R2 | 2026-07-23 | `CV2III-600D/40.5-10193W` | SANAKY / Transformer: 26 MVA, 22 kV (+8/-8 × 1.25%) / 6.6 kV, Dyn11 | no | superseded | QS2606175-R2 |
| QS2606175 | R2 | 2026-07-27 | `CV2III-600D/40.5-10193W` | SANAKY / Transformer: 26 MVA, 22 kV (+8/-8 × 1.25%) / 6.6 kV, Dyn11 | no | superseded | QS2606175-R2 |
| QS2606175 | R2 | 2026-08-05 | `CV2III-600D/40.5-10193W` | SANAKY / Transformer: 26 MVA, 22 kV (+8/-8 × 1.25%) / 6.6 kV, Dyn11 | no | superseded | QS2606175-R2 |
| QS2606175 | R2 | 2026-08-13 | `CV2III-600D/40.5-10193W` | SANAKY / Transformer: 26 MVA, 22 kV (+8/-8 × 1.25%) / 6.6 kV, Dyn11 | no | superseded | QS2606175-R2 |
| QS2606175 | R2 | 2026-08-13 | `CV2III-600D/40.5-10193W` | SANAKY / Transformer: 26 MVA, 22 kV (+8/-8 × 1.25%) / 6.6 kV, Dyn11 | no | superseded | QS2606175-R2 |
| QS2606175 | R2 | 2026-08-13 | `CV2III-600D/40.5-10193W` | SANAKY / Transformer: 26 MVA, 22 kV (+8/-8 × 1.25%) / 6.6 kV, Dyn11 | no | superseded | QS2606175-R2 |
| QS2606175 | R2 | 2026-08-13 | `CV2III-600D/40.5-10193W` | SANAKY / Transformer: 26 MVA, 22 kV (+8/-8 × 1.25%) / 6.6 kV, Dyn11 | no | skip: quoted Iᵤ 600 A below transformer duty I=682.3 A; do not invent a cover. |  |
| QS2606180 | R0 | 2026-07-01 | `SHZVIII-1000Y/72.5C-18353W` | Bambang Djaja | no | superseded | QS2606180-R1 |
| QS2606180 | R0 | 2026-07-03 | `SHZVIII-1000Y/72.5C-18353W` | Bambang Djaja | no | superseded | QS2606180-R1 |
| QS2606180 | R0 | 2026-07-06 | `SHZVIII-1000Y/72.5B-18353W` | Bambang Djaja | no | superseded | QS2606180-R1 |
| QS2606180 | R1 | 2026-07-16 | `SHZVIII-1000Y/72.5B-18353W` | Bambang Djaja | no | min-adequate |  |
| QS2607181 | R0 | 2026-07-02 | `CV2III-500Y/72.5-10191W` | MEE / erence: OLTC for 40 & 63MVA transformer - EVNCPC | no | superseded | QS2607181-R0 |
| QS2607181 | R0 | 2026-07-02 | `CV2III-500Y/72.5-10191W` | MEE / erence: OLTC for 40 & 63MVA transformer - EVNCPC | no | skip: CV2-500 is not a 2025 catalogue row. |  |
| QS2607182 | R0 | 2026-07-08 | `CM2I-1500/72.5B-10191W` | HLG (MBT) / for Australia market | yes | skip: 40 MVA at 13.8 / 24.9 / 34.5 kV — winding for Iᵤ ambiguous. |  |
| QS2607183 | R0 | 2026-07-03 | `CV2III-350D/40.5-10193W` | AGT / CV2III350D-40.5-10193W/ESE Tender/FY 2026-27 | no | superseded | QS2607183-R2 |
| QS2607183 | R0 | 2026-07-03 | `CV2III-350D/40.5-10193W` | AGT / CV2III350D-40.5-10193W/ESE Tender/FY 2026-27 | no | superseded | QS2607183-R2 |
| QS2607183 | R1 | 2026-07-16 | `CV2III-350D/40.5-10193W` | AGT / CV2III350D-40.5-10193W/ESE Tender/FY 2026-27 | no | superseded | QS2607183-R2 |
| QS2607183 | R2 | 2026-07-30 | `CV2III-350D/40.5-10193W` | AGT / CV2III350D-40.5-10193W/ESE Tender/FY 2026-27 | no | superseded | QS2607183-R2 |
| QS2607183 | R2 | 2026-07-31 | `CV2III-350D/40.5-10193W` | AGT / CV2III350D-40.5-10193W/ESE Tender/FY 2026-27 | no | min-adequate |  |
| QS2607184 | R0 | 2026-07-06 | `CV2III-350D/40.5-10193W` | Hitachi Soe / OLTC for 3T ESE -2026-2027 Tender | no | superseded | QS2607184-R1 |
| QS2607184 | R0 | 2026-07-06 | `CV2III-350D/40.5-10193W` | Hitachi Soe / OLTC for 3T ESE -2026-2027 Tender | no | superseded | QS2607184-R1 |
| QS2607184 | R1 | 2026-07-06 | `CV2III-350D/40.5-10193W` | Hitachi Soe / OLTC for 3T ESE -2026-2027 Tender | no | skip: two OLTC types / three transformer ratings on one QS. |  |
| QS2607186 | R0 | 2026-07-01 | `CM2III-500Y/170D-14273W` | AGT / DPTSC Project | yes | superseded | QS2607186-R1 |
| QS2607186 | R0 | 2026-07-02 | `CM2III-500Y/170D-14273G` | AGT | yes | superseded | QS2607186-R1 |
| QS2607186 | R0 | 2026-07-16 | `CM2III-500Y/170D-14273G` | AGT | no | superseded | QS2607186-R1 |
| QS2607186 | R1 | 2026-08-17 | `CM2III-500Y/170D-14273G` | AGT | no | min-adequate |  |
| QS2607190 | R0 | 2026-07-22 | `SHZVIII-1000Y/72.5B-12120` | GE (UTR) / RFQ - OLTC CLOUGH KWINANA 120 MVA | yes | superseded | QS2607190-R1 |
| QS2607190 | R0 | 2026-07-27 | `SHZVIII-1000Y/72.5D-12120` | GE (UTR) / RFQ - OLTC CLOUGH KWINANA 120 MVA | no | superseded | QS2607190-R1 |
| QS2607190 | R0 | 2026-07-29 | `SHZVIII-1000Y/72.5D-12110` | GE (UTR) / RFQ - OLTC CLOUGH KWINANA 120 MVA | no | superseded | QS2607190-R1 |
| QS2607190 | R1 | 2026-08-03 | `SHZVIII-1000Y/72.5D-12110` | GE (UTR) / RFQ - OLTC CLOUGH KWINANA 120 MVA | no | customer-specified |  |
| QS2607193 | R0 | 2026-07-15 | `WSL II-800D/72.5 - 6x5A` | EEMC / EEMC PO26-025. EED2607_09 | no | skip: WSL/WDL/OCTC (de-energized). Out of OLTC engine scope. |  |
| QS2607195 | R0 | 2026-07-15 | `3xSHZVI-1000/170C-10193W` | MEE | yes | skip: 3× singles; engine will not list 3× when a III cover exists. |  |
| QS2607196 | R0 | 2026-07-20 | `CVIII-350D/40.5-14271W` | HAVEC / in Cambodia | no | superseded | QS2607196-R1 |
| QS2607196 | R0 | 2026-07-20 | `CVIII-350D/40.5-14271W` | HAVEC / in Cambodia | no | superseded | QS2607196-R1 |
| QS2607196 | R1 | 2026-07-21 | `CVIII-350D/40.5-14271W` | HAVEC / in Cambodia | no | superseded | QS2607196-R1 |
| QS2607196 | R1 | 2026-07-22 | `CVIII-350D/40.5-14271W` | HAVEC / in Cambodia | no | superseded | QS2607196-R1 |
| QS2607196 | R1 | 2026-07-23 | `CVIII-350D/40.5-14271W` | HAVEC / in Cambodia | no | customer-specified |  |
| QS2607197 | R0 | 2026-07-21 | `CMIII-600Y/72.5B-10193W` | HLG | yes | superseded | QS2607197-R0 |
| QS2607197 | R0 | 2026-07-23 | `CMIII-600Y/72.5B-10193W` | HLG | yes | customer-specified |  |
| QS2607198 | R0 | 2026-07-23 | `SHZVIII-1000Y/72.5C-10191W` | MEE / Nam Manh SPP | yes | skip: incomplete duty (no recoverable Iᵤ/Ust from QS header). |  |
| QS2607199 | R0 | 2026-07-23 | `CV2III-600D/40.5-10091W` | HLG (MBT) / Transformer | yes | superseded | QS2607199-R0 |
| QS2607199 | R0 | 2026-07-24 | `CV2III-600D/40.5-10091W` | HLG (MBT) / Transformer | yes | skip: incomplete duty (no recoverable Iᵤ/Ust from QS header). |  |
| QS2607201 | R0 | 2026-07-24 | `SVIII-500D/40.5-12231W` | HAVEC | no | superseded | QS2607201-R0 |
| QS2607201 | R0 | 2026-08-06 | `SVIII-500D/40.5-12231W` | HAVEC | no | superseded | QS2607201-R0 |
| QS2607201 | R0 | 2026-08-07 | `SVIII-500D/40.5-12231W` | HAVEC | no | superseded | QS2607201-R0 |
| QS2607201 | R0 | 2026-08-11 | `SVIII-500D/40.5-12231W` | HAVEC | no | customer-specified |  |
| QS2607203 | R0 | 2026-07-24 | `WSG II-800D/40.5-4x5A` | EEMC / EEMC PO26-028 - OCTC WSG II -800D/40.5-4x5A | no | skip: WSL/WDL/OCTC (de-energized). Out of OLTC engine scope. |  |
| QS2607204 | R0 | 2026-07-24 | `SHZVIII-600Y/72.5C-18353W` | EEMC | yes | customer-specified |  |
| QS2607207 | R0 | 2026-07-29 | `SVIII-500D/40.5-10193W` | Bambang Djaja | yes | superseded | QS2607207-R0 |
| QS2607207 | R0 | 2026-08-04 | `2xSVIII-500D/40.5-10193W` | Bambang Djaja | yes | skip: 3× singles; engine will not list 3× when a III cover exists. |  |
| QS2607208 | R0 | 2026-07-29 | `CVIII-350D/40.5-10193W` | HLG | no | skip: incomplete duty (no recoverable Iᵤ/Ust from QS header). |  |
| QS2607210 | R0 | 2026-07-31 | `CV2III-350Y/72.5-10193W` | EEMC / EEMC PO26-033. OLTC CV2-III-350Y-72.5-10193W | no | skip: incomplete duty (no recoverable Iᵤ/Ust from QS header). |  |
| QS2608212 | R0 | 2026-08-04 | `WSLIV-600Y/72.5- 6x5A with manual drive` | MEE | no | superseded | QS2608212-R1 |
| QS2608212 | R1 | 2026-08-12 | `WSLIV-600Y/72.5- 6x5A with manual drive` | MEE | no | skip: WSL/WDL/OCTC (de-energized). Out of OLTC engine scope. |  |
| QS2608213 | R0 | 2026-08-03 | `CV2III-600Y/72.5-10191W` | MEE / erence: EVNNPC 110kV Substation | no | superseded | QS2608213-R0 |
| QS2608213 | R0 | 2026-08-04 | `CV2III-500Y/72.5-10191W` | MEE / erence: EVNNPC 110kV Substation | no | superseded | QS2608213-R0 |
| QS2608213 | R0 | 2026-08-18 | `CV2III-600Y/72.5-10191W` | MEE / erence: EVNNPC 110kV Substation | no | superseded | QS2608213-R0 |
| QS2608213 | R0 | 2026-08-18 | `CV2III-500Y/72.5-10191W` | MEE / erence: EVNNPC 110kV Substation | no | skip: CV2-500 is not a 2025 catalogue row. |  |
| QS2608214 | R0 | 2026-08-05 | `HWVIII-400D/72.5-18353W` | SANAKY / Transformer: 25MVA, 69/13.8kV, +/-16 x 0.625% | yes | superseded | QS2608214-R0 |
| QS2608214 | R0 | 2026-08-13 | `HWVIII-400D/72.5-18353W` | SANAKY / Transformer: 25MVA, 69/13.8kV, +/-16 x 0.625% | yes | min-adequate |  |
| QS2608215 | R0 | 2026-08-14 | `CM2III-500Y/126C-10191W` | EVNNPC / EVNNPC OLTC Retrofit | yes | superseded | QS2608215-R0 |
| QS2608215 | R0 | 2026-08-17 | `CM2III-500Y/126C-10191W` | HLG (EVNNPC) / EVNNPC OLTC Retrofit | no | skip: incomplete duty (no recoverable Iᵤ/Ust from QS header). |  |
| QS2608216 | R0 | 2026-08-17 | `SHZVGIII-1300Y/126DE-18353W` | Bambang Djaja | no | min-adequate |  |
| QS2608217 | R0 | 2026-08-12 | `3xCMI-500/72.5B-18353W` | Bambang Djaja | yes | skip: 3× singles; engine will not list 3× when a III cover exists. |  |
| QS2608219 | R0 | 2026-08-14 | `CV2III-600Y/72.5-10191W` | MEE / erence: Yen Bai & Tuyen Quang Biomass Power Plant | yes | superseded | QS2608219-R0 |
| QS2608219 | R0 | 2026-08-14 | `CV2III-600Y/72.5-10191W` | MEE / erence: Yen Bai & Tuyen Quang Biomass Power Plant | yes | superseded | QS2608219-R0 |
| QS2608219 | R0 | 2026-08-18 | `CV2III-600Y/72.5-10191W` | MEE / erence: Yen Bai & Tuyen Quang Biomass Power Plant | yes | superseded | QS2608219-R0 |
| QS2608219 | R0 | 2026-08-18 | `CV2III-600Y/72.5-10191W` | MEE / erence: Yen Bai & Tuyen Quang Biomass Power Plant | yes | skip: incomplete duty (no recoverable Iᵤ/Ust from QS header). |  |

## Counts

| metric | n |
|---|---|
| files | 171 |
| unique QS | 82 |
| replay | 35 |
| skip | 47 |
| unread | 0 |

