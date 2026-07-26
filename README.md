# Huaming OLTC Selector · 华明有载开关选型

Bilingual (EN/中文) web tool that turns transformer / OLTC parameters into a **precise Huaming type designation**, including:

- Product family (SHZV, HWV, CM2, CM, CV2, …)
- Phases · through-current · **Y/D connection**
- **Um** and **tap selector insulation grade** (B / C / D / DE) where the catalogue uses it
- Tap code (`10193W` = pitch · positions · mid · W/G)
- Recommended MDU (CMA7 / SHM-D / …)

Built for **Eric, colleagues, and customers**. **No prices** on the public page.

> Indicative only — final OS / drawings need Huaming engineering confirmation.

## Data sources

- `HOW TO SELECT TAP CHANGER` decision tree  
- Type designation figures in SHZV / HWV technical data (HM0.154…)  
- Catalogue currents & Um from Base Price List structure (models only, not selling prices)

## Dev

```bash
npm install
npm run dev
# http://localhost:5173
```

```bash
npm test
npm run build
```

## Deploy

Static Vite build (`dist/`). GitHub Pages or Vercel both fine. `base: "./"` for project pages.

## Privacy

All selection runs in the browser. No backend, no telemetry.

## License

Private / internal Huaming sales productivity tool unless otherwise approved.
