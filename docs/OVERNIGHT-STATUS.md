# Overnight status — `feat/anthony-replay-list-price`

- **SHA:** `009bb7e4977f377e7bee172cd896d2e429388544`
- **When:** 2026-08-18 23:52 CST
- **Stopped:** cycle 1. No new failing replay row, `npm test` and `npm run build` both exit 0. Cap was 8 cycles or 06:00.

## Verify

| Check | Result |
|---|---|
| `npm test` | 56 passed (36 engine + 8 order-replay + 12 list-price/FX) |
| `npm run build` | Next 15 static export, 0 |
| Replay (`scripts/write-order-replay.ts`) | 51 rows, **0 failed** (Qu-ET260001–013 + signed OS + Anthony) |

## Anthony corpus

- 171 PDFs, 82 unique QS, unread **0**
- Latest-R: **23** min-adequate match · **12** customer-specified (eligible, different #1) · **47** skip
- Engine-bug-fixed: **2** (QS2602105, QS2607183)
- Inventory: `docs/anthony-qs-inventory.md`
- Decisions: `docs/anthony-qs-mismatches.md`

## Engine

- Ranking unchanged: CV2 → CM2 → SHZV → SHZVG; single III over 3×; no CV2-500; no SHZV-1300 (QS2608216 → SHZVG-1300).
- 97% headroom now needs `duty + 1 A < rating` before bumping. 349.9 A stays CV2-350. Case 2 (489.7 → 600) still bumps.

## List price (after 选型 only)

- 7925 rows from Base Price List 2025 (JSON committed; xlsx not).
- UI: RMB FOB Shanghai + 15-currency select, list × FX only, dated fallback 2026-08-18.
- HWV list includes MDU; no CMA7 add-on. Missing row says so.
- Currency in `localStorage` `oltc-selector:list-currency`. Idle form has no price.

## Not finished

- Exmail IMAP hung (~45s); no mail used. 17 latest-R still lack a recoverable Iᵤ (listed at the end of `docs/anthony-qs-mismatches.md`).
- Non-catalogue taps 10181W / 10192G / 10213G stay skip.
- WSL/WDL/OCTC, MDU-only, CZ dry, CV2-500 stay out of engine scope.
- Not merged to `master`. No GitHub Pages deploy.
