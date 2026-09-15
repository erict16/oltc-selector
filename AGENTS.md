# Agent notes — OLTC Selector

## Icons

**Do not invent or hand-draw icons** (Unicode glyphs like `▾`/`→`, DIY SVGs, emoji decoys, Imagine-drawn icons). They look wrong in this UI. **2026-09-11 Eric: 记死了. Match the app or use an open-source set already in the repo. Native `<select>` keeps the system arrow.**

Use **[@heroicons/react](https://heroicons.com/)** (official Tailwind CSS icon set):

```tsx
import { ChevronDownIcon } from "@heroicons/react/24/outline";
// <ChevronDownIcon className="h-4 w-4" />
```

Prefer `24/outline` for chrome; keep stroke consistent with surrounding muted ink.

## OCTC wiring

When `dutyKind=octc`, the form swaps **调压方式** (W/G/0) for **接线方式** (WSL/WSG roman II/IV/V/VI/VII/VIII). Option labels follow WSL brochure 表1: II 正反调, IV 线性调, V 单桥跨接, VI Y-D转换, VII 双桥跨接, VIII 串并联. On-load puts 调压方式 back. Y/D is a separate field and does not pick the roman. Default roman is IV. I and III are not in the 2025 list — do not invent them.

Result card **开关结构** (not 工作位置): CV/CV2/SV/CVT/CZ → 复合式; CM/CM2/SHZV/CMD/HWV → 组合式; WSL/WDL → 笼式; WSG → 鼓式. Positions stay in the type string (`10193W` = 19 mech / 17 transformer steps).

## Tap codes

Brochure Fig. 3-3: `P = 2 × (±N) + mid`. See `lib/tapCode.ts`. Never invent non-catalogue codes; mid and ±N are paired connection diagrams.
