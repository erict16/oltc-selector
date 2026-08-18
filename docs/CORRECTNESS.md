# Correctness — `feat/anthony-replay-list-price`

**decided = 100%.** `runOrderReplay()` fail = **0**.

Goal in `docs/GOAL.md`: every latest-R QS + Qu-ET260001–013 is a passing replay **or** a closed skip with a tested reason. No TBA-only skips.

`replaySummary()` (SHA after this commit):

| bucket | n |
|---|---|
| match (min-adequate, #1 = quote) | **46** |
| eligible-different (customer-specified) | **38** |
| fail | **0** |
| replay total | **84** |
| closed skip | **17** |

84 + 17 = 101 recorded. Skip reasons are only: MDU-only, CV2-500, quoted I below duty, multi-QS / price-list, 2-unit set, WDL with no Ust.

## What closed the last gaps

- Printed tech-table I used when transformer MVA is TBA (not invented).
- 3× singles always emitted (low rank) so customer-locked 3× stay eligible.
- CZ dry + WSG OCTC selectable.
- Non-catalogue taps (10181W / 10192G / 10213G) match family / I / Um.

## Verify

| check | result |
|---|---|
| `npm test` | **73** passed |
| `npx tsc --noEmit` | 0 |
| `npm run build` | 0 |

This is **decided 100%**, not “every quote is engine #1”. Buyer-locked oil CV/SV/SHZV and 3× are supposed to differ from min-adequate.

- loop 01:00 still 100% decided, tests 73
