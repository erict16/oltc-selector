# Changelog

## 1.1.0 — 2026-08-20

Workbench after 1.0.0: oil vs vacuum, estimated list prices, a spec plate, and the layout Eric actually uses.

### Type

- Interrupter is a choice (vacuum or oil). Oil ranking keeps CM / CV / SV ahead of CV2 when oil families exist.
- Presets 66 / 110 / 220 kV. Click the same chip again to restore the previous inputs.
- Other options stay open independently. Spec plate: interrupter, max step voltage, step capacity, positions, earth PF/LI, mounting. Rated current, Um, and selector letter stay in the type string.

### Price

- Catalogue rows with no list price get a neighbour estimate (`~`). Still FOB Shanghai, no country coefficient.
- Amounts read `RMB 160,800`, not 人民币.

### Replay

- 2026 sold OS extract and replay vs min-adequate select. Numbers in `docs/2026-os-replay.md`.

### UI

- Last language is stored locally.
- Footer is a quiet line (disclaimer + Privacy / Terms). Hidden on the legal pages.
- Privacy / Terms: English and Chinese in two columns, wider page.
- Default layout: left and right the same height. Spare space sits empty inside the result card, under Other options. The quote block is not stretched to fill it.
- More options: phases III / II / I (II noted as common on OCTC D). Interrupter above mounting. BIL and PF on one row.
- Connection labels: Y 中性点 / 星接, D 角接 / 线端.
- Native `<select>` lists are no longer clipped inside More options.
- Page shell: main scrolls, footer stays on screen.

## 1.0.0 — 2026-08-19

Shipped the selector people can actually use for a first type and a first list number.

### Type

- Lowest-fit ranking: CV2 → CM2 → SHZV → SHZVG. One III unit before 3×.
- HWV when the duty is on-tank.
- Off-circuit path (More options → OCTC): WSL and WSG.
- Dry CZ (`3xCZI-…`).
- 97% current headroom keeps 349.9 A on CV2-350. 489.7 A still steps to 600.

### Price

- After Select: 2025 Base Price List, RMB FOB Shanghai.
- 15 currencies. One amount on screen (the currency you picked).
- Other options show a list figure too.
- No country coefficient. One line: base quotation price, no regional sales coefficient.

### Replay

- Qu-ET260001–013 plus Anthony latest-R QS.
- 84 replay rows, 0 fail. 17 closed skips (MDU-only, CV2-500, under-duty, multi-QS).

### UI

- Empty result until Select. Stale banner if you edit after a run.
- Equal-width language chips. 中文 / EN / VI / ES / TR / RU.
