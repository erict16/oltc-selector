# Changelog

## Unreleased

- Skill pack prepped for marketplace upload: MIT license, `manifest.yaml` in the zip, Huaming-branded display name (华明分接开关选型) with vendor scope stated up front.
- /agents guide examples are chat cards: 示例 1 on-load and 示例 2 一拖二, each with the selected type strings as chips (有载/无载 tagged).
- Skill pack covers 一拖二 (无载带有载) duties: split into an on-load run and an `--octc` run, brochure-check both type strings. Zip is rebuilt with `npm run pack:skill` and a test keeps it in sync with the source.
- Home dock: hand selection to an AI assistant (scheme A). Closed state is WorkBuddy + 选型助手. Tutorial at `/agents/` with a downloadable WorkBuddy skill zip (CLI + brochure check, no prices).
- CLI package `oltc-selector` (`npm i -g oltc-selector`), command `oltc`. Same `selectOltc` engine, no prices. `--octc`, `--structure`, `--series`.
- WSL/WDL existence uses priceless 2025-list keys, not list RMB.
- 2025 and 2026 OS Excel replay: emitted models must exist; legal sold types stay in the ranked list.
- Engine drops commercial strings the brochure / 2025 list does not have (combined III-D, CV2-500, compound grade letters, WSL rows missing from the list). CV2/HWV/CV/SV III-D still emit.

- More options: 选择器绝缘等级 is now 开关结构 (auto / compound / combined). OCTC keeps 接线方式 only.
- Safety factor on MVA duty defaults to ×1.0.
- Field captions (Imax / Um / Ust) are one step larger.
- Combined in-tank III (CM / CM2 / CMD / SHZV / SHZVG) is star-point only. Delta / line-end selects `3xCM2I-…`, not `CM2III-…D`. Compound CV/CV2/SV and on-tank HWV III still allow D.
- Result card shows construction (combined / compound / cage / drum) instead of repeating positions already in the tap code.
- Off-circuit wiring options show the brochure name (II reversing, IV linear, V single bridge, VI Y-D, VII double bridge, VIII series-parallel).
- Capacity menu is 14 steps (6.3–500 MVA). Custom still covers the rest.
- Safety factor only appears when entering transformer MVA. Typing Imax is used as-is.
- Current field is Imax / 最大通过电流, not Iᵤ.
- Off-circuit: the tap-winding control becomes wiring II / IV / V / VI / VII / VIII. On-load puts reversing / coarse-fine / linear back. Y/D stays its own field.
- Default voltage is tap-side rated kV (132 / 110 / 66…). Star 110–330 → switch Um 72.5; line-end keeps winding class. Switch Um stays as a toggle beside it.
- WSL/WDL: 2025-list contacts (8x7/10x9/5x2/3x2…), series roman VIII/VI/V, Um 252/363. HWDK I / 40.5. CVT 9-position linear.
- Drop the 高一档 badge on alternates (it only appeared on some rows).
- Custom position count picks a brochure mid; ±N still snaps to Fig. 3-3 preferred mid.
- Um menu is just `72.5 kV` — no transformer-class parentheses.
- Guest selector has no prices. Viewport-corner avatar for internal login; admin sees list RMB, a market coefficient, then FX.
- Laptop/wide: form and result sit side by side from 768px; vertical padding is tighter so a 13–14\" screen does not need to scroll before Select.
- Tap-side rated voltage defaults to 110 kV (star still Um 72.5). Rated tab still does not submit Um.
- Copy type always shows Copied / 已复制, including on narrow phones; clipboard falls back when the API rejects.
- Other options (3): skip a second current of the same family at the same Um so oil shows CMD instead of two CM rows.
- Safe through-current = Imax × factor (default 1.2, 1.1–1.8 or custom) in More. Linear taps use +/−. BIL/PF share one column.
- ± and the “19 位” hint use the same UI face as the labels (Noto Sans for Latin, not mono / SC symbols).
- Rated-kV tab does not submit Um; 220 kV star stays 252, not CV2 / 72.5. Login has Remember me; fields are 40px.
- Language choice is stored (cookie + localStorage) so the next visit opens in that language.
- Mobile: the corner avatar overlays; it no longer reserves a right gutter on the form.
- Voltage mode is a small 额定 / Um pill on the field label. Login is Tailwind Plus Sign-in Simple; back sits under the form.
- Hosted on Vercel (`oltc-selector.vercel.app`) as well as GitHub Pages.
- 中间位 stays on the form when ±N has only one brochure mid. Lower ± no longer hides it; returning to ±8 still offers 3 and 1.
- CZ dry primary is `3xCZI-…` (2025 list / 2026 OS). Do not invent `CZIII`.
- Um dropdown: drop 35 / 69; labels show transformer class (`72.5 kV（66 kV）`).
- More-options lead: 调压绕组, not 级间绝缘.
- Field label: 设备最高电压 Um (highest voltage for equipment).
- Catalogue menus print the number (`400 A`, `72.5 kV`, `1500 V`). No ≤ / ≥ / >. Current list includes 600 A.
- Field labels: switch through-current, switch highest voltage, step voltage (max stays on the spec plate).
- Hairline above More options has matching space above and below.
- Scrollbar gutter is reserved on both edges so the workbench does not sit left of center.
- More options no longer nudges the workbench left when the page starts scrolling.
- Privacy / Terms contact is `eric.tan.dev@outlook.com` (no repository link).
- Docs: replay files under `docs/replay/`; dropped stale overnight notes and duplicate extracts.

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

- 2026 sold OS extract and replay vs min-adequate select. Numbers in `docs/replay/2026-os-replay.md`.

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
