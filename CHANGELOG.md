# Changelog

## Unreleased

- Imax / Um / Ust / 19 位 sit on the label row (top-right). Capacity/current pills overlay under the input and do not stretch the grid row.
- Drop list prices, market coefficients, FX conversion, and the internal login. The selector is type-only; no RMB in the repo.
- Changelog popover: 「当前」sits on the version midline; kind chips line up with the version, not the note body.
- Agent dock satellite: DeepSeek whale in place of 智谱.
- `/agents` SkillHub page and zip links both go to `https://skillhub.cn/skills/indiv-erict16/huaming-oltc-selector` (the old `@indiv-erict16` URL and GitHub zip were wrong).
- Desktop changelog popover sits 16px left of the form card, with the same light border as the cards.
- Result card clips the stale banner to the 10px radius so the cream strip no longer pokes out at the corners.
- Drop the false 1.2.9 note that a step-voltage menu gained 4500 / 5000 / 6000 V. First paint uses tap % and derives Ust; the volt picker is the Um-mode fallback only.
- Footer shows `v1.2.9` instead of 仅供参考. Click opens a small changelog popover (scheme A).
- Changelog popover is a timeline with 修正/新增/改进 chips, plain-language copy, and a 全部更新记录 link to the new `/changelog/` page (timeline + sticky version sidebar; major-version tabs appear once a 2.x exists). Release history rebuilt from commits: 1.2.1–1.2.6 are the assistant/CLI line; 1.2.7–1.2.9 were same-day internal numbers never shown publicly, so they merge into 1.2.9 (SDZV + oil/vacuum hard locks + three-step guide). `lib/releaseNotes.ts` is now `RELEASES` (versioned, kind-tagged, six languages).
- Agent dock bubble closes on outside pointer-down and Escape, same contract as the footer popover.
- Safety factor stays visible in More options on the current path (disabled). Imax k labels are explicit in EN / VI / ES / TR / RU.

## 1.2.9

- Vacuum arc is a hard lock too. On-tank vacuum above HWV Ust no longer falls back to oil HWDK. Catalogue pressure grid covers all families (oil/vacuum, Y/D, dry, on-tank, OCTC).

## 1.2.8

- Oil arc (`preferVacuum=false`, medium oil) is a hard lock. Vacuum families (SHZV / SHZVG / SDZV / CM2 / CV2) no longer leak through when Iᵤ exceeds oil max (screenshot: 500 MVA 110 kV oil → was `3xSHZVGI-3000`). Out of catalogue instead.

## 1.2.7

- Catalogue: **SDZV** dual-break in-tank vacuum (Ust 6000 V, step capacity 1.5× SHZV). III 400/600/1000 Y-only; I 400/600/1000/1600/2400; positions 14/27. Ranked after SHZV, before SHZVG — only when SHZV step voltage or step capacity is short. No III-D, no II, no I-1200/1500, no III-1300.
- CLI / skill pin `oltc-selector@1.2.7`.

- `/agents` WorkBuddy search block is Chinese-only. Other locales only get the send-a-line prompt.
- `/agents` step 1 is two paths (WorkBuddy search vs send-a-line). Install prompt is localized. Copy control is a sliding pill, not a whole-block button.
- `/agents` Chinese step 1 shows the WorkBuddy SkillHub search screenshot (搜「华明」点 +). Other locales stay prompt-only.
- `/agents` install prompt points at skillhub.cn `@indiv-erict16/huaming-oltc-selector` (`https://skillhub.cn/install/skillhub.md`).
- `/agents` extra cases drop the why lines under the type chips (CZIII / three-phase vacuum ceiling).
- `/agents` second `+` disclosure (collapsed): 更多选型案例. Dry-type 33/0.4 kV → `3xCZI-500/40.5-9`; 350 MVA star-point → `3xSHZVI-2400/72.5B-12233W`. Transformer data only, no customer names.
- `/agents` install prompt temporarily points at 讯飞 Astron SkillHub (`global/huaming-oltc-selector`) because skillhub.cn is still in review.
- 1.2.6: agent skill leaves this repo. CLI version is `pack-cli.mjs` `VERSION` (1.2.6). Skill lives in `erict16/huaming-oltc-selector` and pins `npx -y oltc-selector@1.2.6` (no `@latest`, no Vercel link, no `npm i -g`) so SkillHub review can reproduce. `/agents` zip points at that GitHub repo.
- 1.2.5 fixes: octc no longer derives 17 positions from the oltc ±8 parser default when --contact defines the steps (only explicit --pm derives). CLI --k default is now 1.0, matching the web first paint (was 1.2), and the capacity path echoes k/step-pct when silent. Assumptions echo also covers phases. Skill rule 7 reworded: no 假定 block only means watched inputs were explicit, not that everything is confirmed; missing current/voltage still asks before running, other gaps may run but must be relayed. brochure-check adds CZ (3× I only, never CZIII). Reason strings round the duty current (no more 174.954…). pack-cli reads the version from the skill manifest so npm and skill share one number. Synced to grok-skills, ~/.grok, Desktop, and the standalone huaming-oltc-selector repo.
- CLI echoes silent defaults: every run ends with a 假定 block (conn / reg / steps / medium / mount, octc shows positions + wiring + mount), defaulted values marked （默认）; block disappears when all watched inputs are explicit. `--json` carries the same as `assumptions`. npm `oltc-selector@1.2.0`. Skills bumped to 1.2.4 with a relay-the-assumptions rule, the new HM icon, and display name 华明分接开关选型助手; published to both SkillHubs (xfyun + skillhub.cn via `scripts/stage-cn.mjs`, which strips the png their package whitelist rejects and adds their slug/displayName/summary frontmatter). /agents install prompt and link now default to skillhub.cn.
- /agents polish: 50rem container, copy affordance is a bordered pill with icon, step-1 names ChatGPT, dual-duty example reads as a full sentence. CLI disclosure renamed 想自己跑 CLI？ with an engine-sharing note (same engine as the web app, the skill runs the oltc CLI) and a 240ms reveal animation. Mobile 375px verified.
- /agents rebuilt as a three-step rail (装 → 发 → 拿型号). Step 1 is assistant-agnostic: the SkillHub install prompt works for WorkBuddy, Claude Code, Cursor alike; zip upload stays as the fallback. The embedded example is now the 一拖二 dual-duty case with both type chips. CLI lives behind a disclosure. Dead guide CSS removed.
- /agents page widened (38rem → 46rem) and gains a WorkBuddy card: copy the one-line install prompt (SkillHub 对话安装 path, no zip needed) plus a link to the SkillHub detail page. Zip download stays as the any-assistant fallback. Six locales. No workbuddy:// deep link exists; the prompt is the supported one-tap path.
- Skill ships the Huaming logo as `assets/icon.png` in both variants. pack-skill only LF-normalizes text files now; binary entries stay byte-identical (a PNG through utf8 read would corrupt). Published as `global/huaming-oltc-selector@1.2.3`.
- Skill SKILL.md rewritten for two audiences: human-readable top (pitch, one in/out example, how to use) above a divider, agent instructions below. Frontmatter trimmed to name/description/allowed-tools/version so the SkillHub page stops rendering metadata as prose. Zero em/en dashes, passes the write-skill punctuation gate (zh + en). /agents guide drops 示例 4. Published as `global/huaming-oltc-selector@1.2.2`.
- Skill docs now cover the full CLI input surface: `--ust` (step voltage in volts, wins over `--step-pct`), `--mount` (in-tank/on-tank/dry, dry changes the family to CVT), `--oil`/`--vacuum`, `--phases`, with a detailed "optional inputs" section; defaults stated as the web first paint. Published as `global/huaming-oltc-selector@1.2.1`.
- Skill renamed to `huaming-oltc-selector` (slug freezes at first publish; renamed while still in review). Published to SkillHub as `global/huaming-oltc-selector@1.2.0` (public, pending review). Description rewritten around the real trigger vocabulary: nameplate-in → catalogue-true type out, 一拖二, WSG/CMD, 星点/线端, regulation modes; negative triggers for pricing/docs. WorkBuddy body and brochure-check reference are fully Chinese; international variant mirrors in English.
- Skill splits into two upload variants: `skills/huaming-oltc-selector` (WorkBuddy SkillHub, Chinese-first) and `skills/huaming-oltc-selector-international` (English-first, OpenSkills/ClawHub-compatible). `npm run pack:skill` builds both zips LF-normalized; tests pin frontmatter, manifest `description`, table sync, and zip freshness. CI runs `npm test` before the Pages build.
- Skill install path is npx-first (`npx -y oltc-selector@latest`), global `npm i -g` optional; notes the same-name package.json shadowing pitfall. Frontmatter declares `allowed-tools: Bash, Read`; manifest adds the plain `description` WorkBuddy requires.
- npm CLI published as `oltc-selector@1.1.0` under MIT (was 1.0.0 UNLICENSED), matching repo and skill versions.
- /agents guide: drop the how-the-CLI-picks lines. Add 示例 3 (350 MVA 132 kV star-point → `3xSHZVI-2400/72.5B-12233W`) and 示例 4 (38 off 33 kV station → `CV2III-350D/40.5-10091W`).
- Skill pack prepped for marketplace upload: MIT license, `manifest.yaml` in the zip, Huaming-branded display name (华明分接开关选型) with vendor scope stated up front.
- /agents guide examples are chat cards: 示例 1 on-load and 示例 2 一拖二, with the selected type strings as chips (有载/无载 tagged).
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
- Amounts used `RMB` plus grouped digits, not 人民币.

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
