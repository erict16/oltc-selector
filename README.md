# OLTC Selector

Minimum-adequate on-load tap-changer **type designation** helper.

**Live:** https://erict16.github.io/oltc-selector/

## Stack

- **Next.js 15** (static export) + **React 19** + **Tailwind CSS v4**
- Engine: pure TS in `lib/` (`catalog`, `engine`, `tapCode`)
- Hosted on **GitHub Pages** (Actions → `out/`)

## Dev

```bash
npm install
npm run dev       # http://127.0.0.1:3000
npm test
npm run build     # local static export → out/
npm run build:gh  # export with /oltc-selector basePath (Pages)
```

## Form semantics

| Field | Meaning |
|-------|---------|
| **调压方式** | Tap-winding scheme: linear (0) / reversing (W) / coarse-fine (G) |
| **开关连接方式** | OLTC application: Y star-neutral / D delta-or-any — **not** Dyn11 |
| **Iᵤ / Um / Ust** | Catalogue dropdowns (Iᵤ has Custom for calculated Imax) |
| **± 级数** | Only for W/G; linear uses **positions** only |

## Selection rule

Lowest catalogue type that meets the duty (compound before combined, CM2 before SHZV when both fit).
