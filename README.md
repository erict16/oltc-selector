# OLTC Selector

Fill in the transformer duty. Click Select. You get the lowest catalogue type that covers it, plus the 2025 base quotation price in RMB FOB Shanghai (and 14 other currencies).

Live: https://erict16.github.io/oltc-selector/

This is a private helper. It is not an official manufacturer page. The type is a starting point. Confirm with engineering before an OS.

## What it does

You enter through-current, Um, Y or D, reversing / coarse-fine / linear, ± steps, and max step voltage. The engine walks the 2025 catalogue (CV2, CM2, SHZV, SHZVG, HWV, CZ, WSL, WSG, …) and ranks **minimum adequate**:

1. Family: CV2, then CM2, then SHZV, then SHZVG.
2. One three-phase unit beats three single-phase units when both cover the duty.
3. No invented rows. There is no CV2-500 in 2025 (oil 500 A is SV).

On-tank duty picks HWV. Under More options, switch to off-circuit (OCTC) for WSL / WSG.

After Select, the result shows the 2025 base quotation price. Pick a currency. That is base price × mid-market FX only. No regional sales coefficient.

## Use it

```bash
npm install
npm run dev      # http://127.0.0.1:3000
npm test
npm run build
```

GitHub Pages build: `npm run build:gh`.

Languages: 中文, English, Tiếng Việt, Español, Türkçe, Русский.

## Field names

| Field | Means |
|---|---|
| Regulation | Tap winding: linear 0, reversing W, coarse-fine G |
| Connection | Where the switch sits: Y neutral, or D / line end |
| Iᵤ / Um / Ust | Catalogue menus. Custom Iᵤ is for a calculated Imax |
| ± steps | W/G only. Linear uses positions |

Idle result pane stays empty until you click Select. If you change inputs after a run, the old type stays on screen until you Select again.

## Tests

`npm test` runs the engine, the 2025 price lookup, and a replay of real Qu-ET / Anthony QS cases (84 replay rows, 0 fail). Closed skips (MDU-only, CV2-500, two transformers on one sheet) are listed with a reason.

See `docs/GOAL.md` and `docs/CORRECTNESS.md`.

## License

[Terms](https://erict16.github.io/oltc-selector/terms/) · [Privacy](https://erict16.github.io/oltc-selector/privacy/). Reference only.
