# OLTC Selector

Personal **type-designation helper** for on-load tap changers (OLTC).

Enter duty parameters (through-current, Um, connection, regulation, step voltage, …) and get a **lowest-fit catalogue model string**. Results are **indicative only** — confirm with engineering before any OS or commercial commitment.

**Live:** https://erict16.github.io/oltc-selector/

This is a **private project**, not an official manufacturer tool.

## Stack

- **Next.js 15** (static export) + **React 19** + **Tailwind CSS v4**
- Engine: pure TypeScript in `lib/` (`catalog`, `engine`, `tapCode`, `i18n`)
- Hosted on **GitHub Pages** (Actions → `out/`)

## Dev

```bash
npm install
npm run dev       # http://127.0.0.1:3000
npm test
npm run build     # local static export → out/
npm run build:gh  # export with /oltc-selector basePath (Pages)
```

## Form fields

| Field | Meaning |
|-------|---------|
| **Regulation** | Tap winding: linear (0) / reversing (W) / coarse–fine (G) |
| **Connection** | OLTC application: Y neutral / D delta or line end |
| **Iᵤ / Um / Ust** | Catalogue dropdowns (Iᵤ has Custom for calculated Imax) |
| **± steps** | For W/G only; linear uses positions only |

## Selection rule

Lowest catalogue type that meets the duty (compound before combined when both fit; single III before 3× when a single unit covers Iᵤ).

## Languages

中文 · English · Tiếng Việt · Español · Türkçe

## License / use

See [Terms](https://erict16.github.io/oltc-selector/terms/) and [Privacy](https://erict16.github.io/oltc-selector/privacy/). Reference only.
