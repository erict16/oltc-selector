# Goal — stop only at 100% decided

`feat/anthony-replay-list-price`. Do not stop on “pretty good”.

## 100% means all of these

1. `runOrderReplay()` **fail = 0**.
2. Every latest-R Anthony QS + Qu-ET260001–013 is either
   - a passing replay row, or
   - a **closed skip** with a vitest that the reason still holds.
3. No skip whose only reason is “TBA / incomplete” if the QS tech table or transformer line has Iᵤ (or MVA+kV).
4. Engine paths that exist on 2025 list must be selectable: OLTC families already in, plus **WSL/WDL, WSG, CZ**.
5. Customer-locked 3× must stay **eligible** (not #1 if a III covers).
6. `npm test`, `npx tsc --noEmit`, `npm run build` all exit 0.

## Closed skips (count as correct, not as gaps)

- MDU-only (CMA7 / SHM-D / SHM-KX replacement)
- CV2-500 (not a 2025 row; SV is 500 A oil)
- Quoted Iᵤ **below** computed transformer current (do not invent a cover)
- No MVA/kV **and** no printed I after mail+PDF

## Not 100% until

`docs/CORRECTNESS.md` prints `decided=100%` and `fail=0` and lists only closed skips.
