# OLTC Selector — minimum-adequate + UI refresh

> **For Hermes:** Implement task-by-task; verify with `npm test` and localhost :5173.

**Goal:** Select the **lowest catalogue type that meets the duty** (not “SHZV by default”), grounded in training cases + calculation sheet; catalogue fields as **dropdowns** where discrete; Hallmark Cobalt workbench UI.

**Architecture:** Engine ranks by adequacy (compound → smaller combined → larger); UI exposes standard Um / ±N / position lists; visual system = Workbench + Cobalt tokens.

**Tech stack:** React + Vite + Vitest; CSS tokens in `styles.css`.

**Training ground truth:**
- `docs/training/选型案例-答案.docx`
- `docs/training/OLTC type selection calculation.xlsx`

### Case answers (must pass as fixtures)

| # | Duty gist | Answer |
|---|-----------|--------|
| 1 | 10 MVA 33 kV Δ, ±8×1.25% G, I≈112 A, Ust≈412 V | `CV2III-350D/40.5-10193G` |
| 2 | 103 MVA 138 kV Y, ±8 W, I≈490 A, across BIL 285 | `CM2III-600Y/72.5C-10193W` |
| 5 | 120 MVA 132 kV Δ mid, I≈346 A, earth BIL 650 → Um 145 | `CV2III-600D/145-12233W` |
| 7 | 220 MVA Δ end, I≈626 A > CM2 III max | `3xCM2I-800/72.5B-10191W` |

### Ranking rule (critical)

Among electrically eligible models, primary = **minimum adequate**:

1. Meets Iᵤ (ceil to catalogue), Um, Ust, positions, step capacity when known.
2. Prefer **compound** (CV2/CV/SV) when in range over combined.
3. Prefer **CM2** over **SHZV** when CM2 current/Um/pos fit.
4. Prefer **single III unit** over `3x` single-phase unless III current unavailable or D-end high-I path needs multi.
5. Prefer **smallest catalogue current** and **smallest Um** that still pass.
6. Prefer vacuum when `preferVacuum` — but never skip a fitting compound vacuum for SHZV.
7. Selector grade = **smallest** B→DE that covers Um map **and** optional across-tap BIL/PF.

### UI

- Um: dropdown of catalogue values
- ± steps: dropdown of common N + derived positions
- Positions: dropdown common service positions
- Iᵤ / step V: number (from calc) + live “rounds to …” hint
- Hallmark Cobalt workbench: hairlines, mono model string, no 华明 chrome

### Files

- `src/lib/engine.ts` — ranking, multi-unit, fixtures
- `src/lib/catalog.ts` — export UM_OPTIONS etc.
- `src/lib/types.ts` — across-tap fields, unitCount
- `src/lib/engine.test.ts` — case fixtures
- `src/App.tsx` + `src/styles.css` + `src/i18n/messages.ts`
- skill + `docs/catalog-source.md` notes

### Verify

```bash
cd ~/Github/oltc-selector && npm test && npm run build
# localhost :5173 — case 1 preset → CV2-350 first, not SHZV
```
