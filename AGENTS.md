# Agent notes — OLTC Selector

## Icons

**Do not invent or hand-draw icons** (Unicode glyphs like `▾`/`→`, DIY SVGs, emoji decoys). They look wrong in this UI.

Use **[@heroicons/react](https://heroicons.com/)** (official Tailwind CSS icon set):

```tsx
import { ChevronDownIcon } from "@heroicons/react/24/outline";
// <ChevronDownIcon className="h-4 w-4" />
```

Prefer `24/outline` for chrome; keep stroke consistent with surrounding muted ink.

## Tap codes

Brochure Fig. 3-3: `P = 2 × (±N) + mid`. See `lib/tapCode.ts`. Never invent non-catalogue codes; mid and ±N are paired connection diagrams.
