# Correctness — `feat/anthony-replay-list-price`

**Not 100%.** `runOrderReplay()` is zero FAIL. 36 rows are still skip.

Measured 2026-08-19 against SHA `98551c7` plus tester-only assertions. `replaySummary()`:

| bucket | n |
|---|---|
| match (min-adequate, #1 = quote) | **42** |
| eligible-different (customer-specified, quote still in list) | **23** |
| skip | **36** |
| fail | **0** |
| replay total (not skip) | **65** |

65 + 36 = 101 recorded cases. 36/101 skipped → do not call this complete.

Split: Qu-ET260001–013 + signed OS = 16 replay / 3 skip. Anthony latest-R = 49 replay (33 match + 16 eligible-different) / 33 skip. 82 unique Anthony QS.

## HWV

| | n |
|---|---|
| replay rows | **6** (all min-adequate, all pass) |
| skip | **0** |
| 2025 list rows (`family=HWV`) | **36** |
| price-row hits on the 6 replay types | **6 / 6** |

- 175 A / 72.5 Y ±8 on-tank → `HWVIII-400Y/72.5-10193W`, list **225000**.
- 523 A D 40.5 → `HWVIII-800D/40.5-10193W`, list 247500.
- Also: QS2602102 / 4137 / 6173 / 8214.

## WSL / OCTC

| | n |
|---|---|
| replay rows (`dutyKind=octc`) | **12** (9 match + 3 eligible-different, all pass) |
| leftover OCTC skip | **2** |
| 2025 list rows | **420** WSL + **31** WDL |
| price-row hits on the 12 expected types | **8 / 12** |

- `dutyKind=octc`, 800 A Y 170, ~6x5 → engine `#1` is `WSLIV-800Y/170-6x5B` (list 97500). QS260183 is customer-specified `…6x5A` (buyer letter; no 170 A-row).
- `dutyKind` unset on the same 800 A / 170 Y duty does **not** emit WSL.
- Leftover skip: Qu-ET260010 WDL (no recoverable duty), QS2607203 WSG (no series this cycle).

WSL list misses among the 12: `WSLIV-800Y/170-6x5A`, `WSLIV-600Y/72.5-7x6E`, `WSLII-2000D/126-6x5B`, `WSLII-600D/72.5-12x11D`. Not invented.

## Price-row hits (all replay)

`lookupListPrice` on shipped `#1` / expected type: **57 / 65**. Eight types have no 2025 row (do not invent):

- `SHZVGIII-1500Y/72.5C-10193W` (Qu-ET260013)
- `SHZVGIII-1300Y/126DE-18353W` (QS2608216)
- `SHZVIII-1000Y/72.5B-18353W` (QS2606180)
- `SHZVIII-1000Y/72.5D-12110` / engine `#1` `CM2III-600Y/72.5D-12110` (QS2607190, non-catalogue tap)
- four WSL grades above

Spot checks: `CV2III-350D/40.5-10193W` = 148700. `HWVIII-400Y/72.5-10193W` = 225000 (bare = +CMA7). `WSLIV-800Y/170-6x5B` = 97500.

Catalogue JSON: 8376 rows, 2026-08-19, CNY FOB Shanghai.

## 2025 OLTC invariants (still green)

- No CV2-500. CV2 III currents stay `[350, 600]`.
- CM2 ranks over SHZV when both cover (400 A / 72.5, 600 A / 126).
- Single III over 3× (SHZV-1000 beats 3×CM2I; SHZVG-1300, not SHZV-1300).
- Qu-ET260001–013 + signed OS still pass.

## Remaining skips (36) — why this is not 100%

| reason | n | ids |
|---|---|---|
| incomplete duty (no recoverable Iᵤ / Ust) | 12 | Qu-ET260008, QS2603118, 4139, 5156, 5161, 5166, 6168, 6171, 7198, 7210, 8215, 8219 |
| 3× / multi when a III cover exists | 4 | QS2603130, 7195, 7207, 8217 |
| quoted Iᵤ below transformer duty | 4 | QS2603114, 5150, 6175, 7182 |
| non-catalogue tap (10181W / 10192G / 10213G) | 4 | QS260192, 187, 4134, 5160 |
| two+ transformers / types on one QS | 3 | QS2603127, 4138, 7184 |
| MDU-only | 3 | Qu-ET260009, QS260193, 196 |
| leftover OCTC (WDL / WSG) | 2 | Qu-ET260010, QS2607203 |
| CV2-500 not a 2025 row | 2 | QS2607181, 8213 |
| CZ dry / reactor | 2 | QS2602101, 4133 |

## Verify

| check | result |
|---|---|
| `npm test` | **68** passed (45 engine + 10 replay + 13 list/FX) |
| `npx tsc --noEmit` | 0 |
| `npm run build` | Next 15 static export, 0 |
| `replaySummary()` | 42 / 23 / 36 / 0 |
| Playwright `http://127.0.0.1:3000` | pass (see below) |

Playwright (headless, 1280×900): idle currency select = **0**; after 选型, price block `2025 目录价 · FOB 上海` exists (1) and currency select appears (1); 6 lang buttons **36×28**; 3 example chips **108×28**. Same width / same height.

`docs/anthony-qs-mismatches.md` counts (23 / 12 / 47) are stale — written before OCTC promote and two mail-duty rows (QS2607199, QS2607208).
