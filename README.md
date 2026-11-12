# OLTC Selector / 有载开关选型

Enter the transformer duty and get the smallest tap-changer type in the 2025 catalogue that covers it. The web page and the `oltc` command use the same engine (`selectOltc`).

- **Web:** [oltc-selector.vercel.app](https://oltc-selector.vercel.app/) (mirror: [erict16.github.io/oltc-selector](https://erict16.github.io/oltc-selector/))
- **CLI:** `npx -y oltc-selector@2.3.0`. The command is `oltc`.

This is a private helper, not a manufacturer's site. The type is a starting point. Get engineering confirmation before an order.

![The page: the form on the left, the result card on the right](docs/assets/readme.png)

## Web page

The page works on a phone and on a laptop. Every field is a dropdown; "Custom" in a dropdown opens a typed field.

**Paste a line.** The box at the top of the form takes a nameplate or tender line, for example `220/110/35kV-125MVA 225±8x1,25%/115/35kV YNa0d11`, and fills the form from it. Full-width punctuation is read too.

**Form (left).** Three cards:

| Card | Fields |
|------|--------|
| Transformer | Type (two-winding / autotransformer), where the switch sits, winding connection, rated voltage, insulation to earth |
| Duty | Capacity or through-current, regulation, ± steps, step size, mid positions, phases |
| Switch | On-load / off-circuit, arc medium, structure, mounting, impulse and power-frequency levels, safety factor |

**Result (right).** The type updates as you change a field.

- The type string, with a button to copy it.
- **Copy link**: the form is kept in the address (after `#`), so the link opens the same selection on another computer. A reload keeps it too. A pasted line is part of the link.
- One cell for each coded part of the type: family, phases, current, connection, Um, tap code.
- Loads as bars: duty / rating and the share used, for through-current, step voltage and step capacity.
- Insulation to earth as the type's own level, for example `Um 72.5 · 140 / 350 kV`. At the line end it also has a bar, system Um against the type's Um; at a star neutral it is not compared with the duty.
- Notes you must act on, in a yellow band.
- Other types that also cover the duty.

On a phone the type stays in a bar at the bottom; the arrow jumps to the full result.

Printing the page gives the result card only.

Languages: 中文, English, Tiếng Việt, Español, Türkçe, Bahasa Indonesia. The first visit follows the browser language (English when it is none of the six); after that the page remembers your choice.

The links under the form open the release notes, the guide for AI assistants, the terms and the privacy page.

## CLI

You do not need to clone this repository.

```bash
npm i -g oltc-selector

oltc --iu 350 --um 40.5 --conn D --reg W --pm 8
# CV2III-350D/40.5-10193W

oltc --octc --iu 800 --um 72.5 --conn D --series II --contact 6x5
oltc --iu 600 --um 72.5 --conn Y --reg W --pm 8 --structure combined
oltc --mva 25 --kv 110 --tap neutral --reg W --pm 8
oltc --mva 16 --kv 22 --tap line --winding star
# CV2III-600D/40.5-10193W

# Autotransformer tapped at the series/common junction (sized on the HV side)
oltc --mva 125 --kind auto --hv 225 --mv 115 --tap junction
# 3xCM2I-500/252D-10193W

# Or paste the tender line: YNa0 makes it an autotransformer
oltc --line "220/110/35kV-125MVA 225±8x1,25%/115/35kV YNa0d11"
# 3xCM2I-500/252D-10193W, plus the type at Um 126 / 170 / 252
```

| Flag | Meaning | Default |
|------|---------|---------|
| `--line "text"` | Tender line: MVA, kV ratio with ±N×x%, vector group. Flags given beside it win. | |
| `--iu` / `--imax` | Max through-current Imax (A). **No** safety factor. | required unless `--mva` |
| `--mva` `--kv` | Transformer MVA + tap-side kV → Imax (min tap + `--k`). With `--iu`, `--kv` alone sets the winding voltage for the 220/330 kV and `--market` rules | |
| `--k` | Safety factor ≥ 1, **capacity path only** | 1.0 |
| `--step-pct` | Step as a percent (1.25 means 1.25 %), capacity path only | 1.25 |
| `--os-imax` | Capacity path: the Imax the OS or maker states at the lowest tap (`--imax` beside `--mva` means this) | |
| `--kind two\|auto` | Transformer kind (`--auto` = `--kind auto`) | two-winding |
| `--tap` | Where the OLTC sits: `neutral` / `line` (two-winding), `junction` / `mv-line` (autotransformer). Sets current, Ust and Um. | neutral |
| `--winding star\|delta` | Tapped winding connection (two-winding) | star |
| `--hv` `--mv` | Autotransformer HV / MV rated kV | |
| `--earth-um` | OLTC insulation to earth from the OS; overrides the rule | |
| `--market` | Buyer's country for a neutral's assumed Um. Rules exist for `IT` and `TR`; another code prints a note and is not used | |
| `--across-li` `--across-ac` | Stated LI / AC withstand across the tap winding (kV): sets the selector grade B/C/D/DE | |
| `--um` | Equipment Um (kV) | derived from `--kv` if omitted |
| `--ust` | Step voltage (V) | 0, or derived on MVA path |
| `--conn Y\|D` | Switch star / delta on the `--iu` path (with `--mva`, use `--tap`) | Y |
| `--reg W\|G\|0` | Reversing / coarse-fine / linear | W |
| `--pm` | ± steps, a whole number | 8 |
| `--pos` / `--positions` | Operating positions (linear and off-circuit; on W/G the Fig. 3-3 row with that count) | |
| `--phases` | `I` / `II` / `III` | III |
| `--range +a/-b[xs%]` | Uneven range. W/G takes the Fig. 3-3 row the maker sells (+4/-12 → 10193W); the lowest tap uses −b | |
| `--minus` | Minus steps for the lowest-tap current, beside `--pm` / `--pos` | ± steps |
| `--mid 1\|3` | Mid positions of the W/G diagram, when Fig. 3-3 has the pair | brochure |
| `--octc` | Off-circuit 无载 (WSL cage; WDG/WLG/WSG drum). `--duty octc` is the same | on-load |
| `--structure` | `auto` / `combined` 组合式 / `compound` 复合式 / `cage` 笼式 / `drum` 鼓式 | `auto` |
| `--series` | OCTC wiring II IV V VI VII VIII | auto is linear IV for Y and D |
| `--mount` | `in-tank` / `on-tank` / `dry` / `reactor` (oil HWDK) | in-tank |
| `--oil` / `--vacuum` | Switching medium | vacuum (on-load) |
| `--contact` | OCTC contact e.g. `6x5` | |
| `--json` | Machine output (see below) | |
| `--lang en\|zh` | Output language. `OLTC_LANG=en` also works | zh |
| `--version` / `-v` | Print the version | |
| `--help` / `-h` | The flag list. Also shown when no flag is given | |
| `--no-update-check` | Skip the daily npm check. A newer version only prints a notice on stderr; nothing is installed. `OLTC_NO_UPDATE_CHECK=1` or `CI=1` also skip it. | check on |

`--structure auto` and omitting `--octc` match the web first paint: on-load, in-tank vacuum, minimum-adequate ranking.

Every flag with a value also takes `--flag=value`. A flag that cannot take effect is an error, not a silent default: `--series` or `--contact` without `--octc`, `--conn D` with `--tap neutral`, `--pm` and `--pos` that disagree, `--vacuum` with `--octc`, a flag given twice.

**Exit code:** `0` a type was found (or help / version); `1` no type, or bad input.

**`--json`** prints one object. For bad input (a flag that cannot be read) the object holds only `ok`, `version`, `model` and `errors`.

| Key | Holds |
|-----|-------|
| `ok` | `true` when `model` is a type |
| `version` | The CLI version |
| `model`, `why`, `alts` | The type, one line of reason, other types that cover the duty |
| `cautions` | Notes you must act on |
| `resolved` | What the engine was asked, as numbers: `throughCurrentA`, `umKv`, `stepVoltageV`, `connection`, `phases`, `regulation`, `plusMinusSteps`, `positions`, `dutyKind`, `mounting`, `medium` |
| `line` | The `--line` read-back: `kind`, `mva`, `voltagesKv`, `vectorGroup`, `warnings` (or `null`) |
| `basis` | Where current, Ust and Um came from on the capacity path (or `null`) |
| `umChoices` | The type at each Um class when the insulation to earth is open |
| `assumptions` | Every default that was applied, as text |
| `errors` | Why there is no type |

## Selection rules

1. **Minimum-adequate, not SHZV-by-default.** Rank **CV2 → CM2 → SHZV → SDZV → SHZVG**. SDZV (dual-break, Ust 6000 V) only when SHZV step voltage or step capacity is short. Prefer one three-phase unit over `3×` singles when a brochure III type exists.
2. **OLTC existence comes from brochure / catalogue axes** (`lib/catalog.ts`), **not price-list Y/D twins**. A 2025 list row that prices `CM2III-…D` the same as Y does **not** make `CM2III-…D` a type.
3. **No CV2-500.** CV2 III currents are 350 and 600 only.
4. **No combined III-D.** CM / CM2 / CMD / SHZV / SDZV / SHZVG three-phase strings are star-point Y. Cover delta with `3x…I-` when that I type exists. Compound **CV / CV2 / SV** and on-tank **HWV** III-D **do** exist. No SDZV II, I-1200/1500, or III-1300.
5. **Compound has no selector grade letter.** No `CV2III-350Y/40.5B-…`. Combined in-tank may have B/C/D/DE after Um.
6. **WSL / WDL existence is 2025-list row keys without prices** (`lib/listIndex.data.json`). Missing rows (no `WSLIV-2000D/126`, no `7x6E` @ 72.5) are not emitted.
7. **Drum OCTC is the sold WDG / WLG** (single-phase, `3x` per three-phase set, no Y/D in the string). Existence is the distinct sold OS rows (`DRUM_SOLD_ROWS` in `lib/listIndex.ts`). WDG IV is 5x5 up to 5 positions, V is 6x5 up to 6; no WDG on D. **WSG** is catalogue axes only (II/IV/V, 4x5/6x5, up to 6 positions) and stays for the D quote `WSGII-800D/40.5-4x5A`.
8. **Typing Imax (`--iu`) does not apply a safety factor.** `--k` only applies on the transformer-capacity (`--mva`) path.
9. **Um is set where the tap changer sits** (`lib/transformer.ts`). Line end: the winding system's class (132 kV → 145, 220 kV → 252). Neutral: the full class up to 72.5; above that 72.5 is assumed and flagged. Autotransformer: the HV system's class, combined types only (no CV / CV2 / SV).
10. **Tapped windings on 220 kV class and above take combined types only.** 2025–2026 OS: 67 of 67 were CM / CM2 / SHZV.
11. **An open Um is shown as a choice.** Star points above 72.5 and autotransformers list the type at each Um class; the tender's insulation picks one (`--earth-um`, or a row on the card).

## Develop

```bash
npm install
npm run dev      # http://127.0.0.1:3000
npm test
npm run lint
npm run build    # static export to out/
npm run pack:cli
```

| Path | What it holds |
|------|---------------|
| `lib/` | The engine, catalogue data, tap codes, translations, tests |
| `lib/formState.ts`, `lib/formEdits.ts`, `lib/formUrl.ts` | The form: its state, each edit, and the link format |
| `components/SelectorApp.tsx`, `components/selector/` | The page and its parts |
| `app/globals.css` | Styles |
| `scripts/oltc.ts` | CLI entry |

Every push to `master` deploys to Vercel and to GitHub Pages. Both run `npm test` before the build. A pull request runs lint, the type check, the tests and the build (`.github/workflows/test.yml`).

## OS regression

`docs/replay/` is not in the repository: it holds sold-order data (buyer names, serials) and stays on the maintainer's disk. The tests that read it skip when it is absent. There, `2025-os-sales.xlsx` and `2026-os-sales.xlsx` hold sold type plus duty (Imax, Um, Ust, ±, Y/D, phases, serial). Rebuild from JSON:

```bash
python scripts/os-to-excel.py
```

With the data on disk, `npm test` runs shipped `selectOltc` on every complete row: no illegal type out; a legal sold type that covers the duty must appear in ranked results. CI and a fresh clone do not have the data, so these replay tests are skipped there.

## Terms

[Terms](https://oltc-selector.vercel.app/terms/) · [Privacy](https://oltc-selector.vercel.app/privacy/). For reference only.
