# OLTC Selector — GitHub Repo & Product Plan

> **For Hermes:** Execute repo creation immediately after this plan; further product tasks can use subagent-driven-development.

**Goal:** Put the bilingual OLTC type-designation web tool on GitHub under `erict16`, ready for deploy and iterative hardening against real quotes.

**Architecture:** Client-only Vite + React + TypeScript app. Selection engine is pure functions (`catalog` + `tapCode` + `engine`). No backend, no prices on the public surface. Data derived from published technical brochures and type-designation rules.

**Tech stack:** Vite 6, React 19, TypeScript, Vitest. Deploy target: Vercel or GitHub Pages (`base: "./"`).

---

## Current context

| Item | Status |
|------|--------|
| Local path | `~/Github/oltc-selector` |
| Local git | `master` @ `38353ee` (Eric Tan \<eric.tan.sydney@gmail.com\>) |
| Remote | **none yet** |
| Tests | `npm test` 6/6 |
| Build | `npm run build` OK |
| Dev | `http://127.0.0.1:5173/` |

**Users:** Eric, colleagues, customers (EN + 中文).  
**Non-goal for public page:** selling prices, country coefficients, multi-tenant auth (later optional “internal mode”).

---

## Proposed approach

1. **GitHub:** create **private** repo `erict16/oltc-selector` (company-adjacent; same pattern as `sc-generator-pro`). Push existing `master`.
2. **Hygiene:** ensure `.gitignore` excludes `node_modules` / `dist`; keep `docs/` tech extracts for engine reference (no price list xlsx in repo).
3. **Product plan (post-push):** harden models against 5–10 real Qu-ET cases; then Vercel; then optional OS export / internal pricing mode.

---

## Step-by-step — repo (execute now)

### Task 1: Verify identity

```bash
gh api user --jq .login   # must be erict16
git -C ~/Github/oltc-selector config user.email  # eric.tan.sydney@gmail.com
```

### Task 2: Create remote + push

```bash
cd ~/Github/oltc-selector
gh repo create oltc-selector \
  --private \
  --source=. \
  --remote=origin \
  --description "OLTC bilingual selector — precise type designation (Y/D, Um, selector size, tap code)" \
  --push
```

If name taken: `oltc-type-selector` or `oltc-type-selector`.

### Task 3: Confirm

```bash
gh repo view erict16/oltc-selector --json url,visibility,defaultBranchRef
git remote -v
git status -sb
```

### Task 4: Topics (optional)

```bash
gh repo edit erict16/oltc-selector --add-topic oltc,selector,typescript,vite
```

---

## Product roadmap (after repo exists)

### Phase A — correctness (P0)

| Task | What | Done when |
|------|------|-----------|
| A1 | Replay 5 real quotes (UE HWV, Wilson SHZV, VN CM2, CV2, etc.) | Engine model matches issued Qu-ET string or documented delta |
| A2 | Expand SHZV Um+size matrix from tech PDF table 4.x | Auto size matches engineering practice for 72.5/126/170/252 |
| A3 | Tap-code table for common ±N → positions | Fixtures for 10191W / 10193W / 18353W / 10193G |
| A4 | Unit tests per fixture | `npm test` green |

**Files:** `src/lib/catalog.ts`, `src/lib/tapCode.ts`, `src/lib/engine.ts`, `src/lib/engine.test.ts`

### Phase B — ship (P1)

| Task | What |
|------|------|
| B1 | Vercel project → production URL |
| B2 | README: how colleagues use + disclaimer |
| B3 | Optional GitHub Pages Actions if no Vercel |

### Phase C — workflow glue (P2)

| Task | What |
|------|------|
| C1 | Export JSON / prefill fields for `sc-generator-pro` |
| C2 | Internal-only pricing mode (not public): list × coeff × FX worksheet |
| C3 | Link technical PDF paths (local/OneDrive) for “open brochure” |

---

## Files in repo (keep / avoid)

**Keep**

- `src/**` app + engine
- `README.md`, `package.json`, configs
- `docs/*.txt` extracted brochure text (reference)
- lightweight `docs/select-pages/*.png` if useful for QA

**Avoid committing**

- `QS/a. Base Price List 2025.xlsx` (commercial)
- OneDrive customer folders
- `.env` with any secrets
- `node_modules/`, `dist/` (gitignore)

---

## Validation

```bash
cd ~/Github/oltc-selector
npm test          # expect 6+ passed
npm run build     # expect dist/
gh repo view erict16/oltc-selector
curl -sI https://github.com/erict16/oltc-selector | head -5
```

---

## Risks & decisions

| Risk | Mitigation |
|------|------------|
| Public leak of internal pricing | Repo **private**; no prices in UI |
| Model wrong vs engineering | Disclaimer + fixture tests from real quotes |
| Branding on personal GitHub | Private + “personal sales tool” README; escalate if company wants org repo |
| Large PDF binaries in git | Prefer text extracts; prune `docs/source` heavy binaries later if needed |

**Open questions (non-blocking for repo create)**

1. Public vs private → **default private**
2. Vercel under Eric personal vs company — later
3. Rename product to something less brand-forward for public — only if visibility becomes public

---

## Success criteria (this session)

- [ ] Plan saved under `.hermes/plans/`
- [ ] `erict16/oltc-selector` exists on GitHub (private)
- [ ] `origin` points to it; `master` pushed
- [ ] Author identity erict16 / Gmail
- [ ] Local tests still green
