import type { PhaseCode, SeriesDef, SelectorSize } from "./types";

/**
 * Catalogue axes grounded in:
 *  - Technical brochures
 *  - QS/a. Base Price List 2025.xlsx
 *  - **2025** sales reference (HM reference list year=2025) — not 2024
 *
 * Ranking: minimum adequate (not SHZV-by-default).
 */

/** Earth insulation (to ground) per Um — SHZV Table 2-1 / HWV Table 1 / CV2 Table 2-1 */
export const EARTH_INSULATION: Record<
  number,
  { pf: number; bil: number }
> = {
  12: { pf: 35, bil: 75 },
  17.5: { pf: 45, bil: 105 },
  40.5: { pf: 90, bil: 250 },
  72.5: { pf: 140, bil: 350 },
  126: { pf: 230, bil: 550 },
  145: { pf: 275, bil: 650 },
  170: { pf: 325, bil: 750 },
  252: { pf: 460, bil: 1050 },
  300: { pf: 480, bil: 1100 },
  363: { pf: 510, bil: 1175 },
};

/** Discrete Um choices for UI dropdown (calculation sheet + brochures) */
export const UM_OPTIONS_KV = [
  12, 17.5, 35, 40.5, 69, 72.5, 126, 145, 170, 252, 300, 363,
] as const;

/** Common max step voltage (Ust) picks — from calc sheet / quotes / brochure ceilings */
export const STEP_VOLTAGE_OPTIONS_V = [
  500, 800, 1000, 1200, 1400, 1500, 1650, 1800, 2000, 2200, 2500, 3000, 3300, 4000,
] as const;

/** Common ± step counts for reversing / coarse-fine */
export const PM_STEP_OPTIONS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] as const;

/** Linear service positions (no change-over) — brochure maxima vary by family */
export const LINEAR_POSITION_OPTIONS = [7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 30, 32, 34] as const;

/** Service positions with change-over (W/G) */
export const POSITION_OPTIONS = [
  9, 10, 12, 14, 16, 17, 18, 19, 21, 23, 27, 31, 33, 35,
] as const;

/**
 * Selector sizes per Um.
 * Price-list headers + 2025 shipments (e.g. CM2III-500Y/72.5DE exists in 2025 sales).
 * Auto still picks the *smallest* that meets stress.
 */
export const SELECTOR_SIZES_BY_UM: Record<number, SelectorSize[]> = {
  40.5: ["B", "C"],
  72.5: ["B", "C", "D", "DE"],
  126: ["B", "C", "D", "DE"],
  145: ["C", "D", "DE"],
  170: ["B", "C", "D", "DE"],
  252: ["C", "D", "DE"],
  300: ["DE"],
  363: ["DE"],
};

/** Rank selector sizes weakest → strongest */
export const SIZE_ORDER: SelectorSize[] = ["B", "C", "D", "DE"];

/**
 * Internal insulation withstand (kV) by selector size — SHZV Table 4-2 (a / b distances).
 * Used for across-tap winding stress → grade letter.
 */
export const INTERNAL_INSULATION: Record<
  SelectorSize,
  { a_li: number; a_pf: number; b_li: number; b_pf: number }
> = {
  "": { a_li: 0, a_pf: 0, b_li: 0, b_pf: 0 },
  B: { a_li: 265, a_pf: 50, b_li: 265, b_pf: 50 },
  C: { a_li: 365, a_pf: 82, b_li: 350, b_pf: 82 },
  D: { a_li: 460, a_pf: 105, b_li: 460, b_pf: 146 },
  DE: { a_li: 550, a_pf: 120, b_li: 550, b_pf: 160 },
};

/**
 * Family preference when vacuum preferred / in-tank (lower = more preferred as minimum path).
 * Training: CV2 before CM2 before SHZV when each is eligible.
 */
export const FAMILY_MIN_RANK: Record<string, number> = {
  cv2: 10,
  cv: 18,
  sv: 19,
  cm2: 25,
  shzv: 40,
  shzvg: 45, // high-current vacuum after standard SHZV
  cm: 50,
  cmd: 55,
  hwv: 15, // only wins on on-tank path
  cvt: 12,
  cz: 14,
  hwdk: 80,
};

export const SERIES: SeriesDef[] = [
  {
    id: "shzv",
    code: "SHZV",
    nameEn: "SHZV in-tank vacuum OLTC (combined)",
    nameZh: "SHZV 箱内真空有载开关（组合式）",
    mounting: ["in_tank"],
    medium: "oil_vacuum",
    structure: "combined",
    vacuum: true,
    currents: {
      I: [400, 600, 1000, 1200, 1500, 1600, 2400],
      II: [400, 600, 1000],
      III: [400, 600, 1000],
    },
    umKv: [72.5, 126, 170, 252, 300, 363],
    usesSelectorSize: true,
    maxStepVoltageV: 4000,
    stepCapacityByCurrent: {
      400: 1500,
      600: 1600,
      1000: 3000,
      1200: 3000,
      1500: 3000,
      1600: 4400,
      2400: 5600,
    },
    connections: ["Y", "D"],
    maxPositionsLinear: 18,
    maxPositionsWithChangeOver: 35,
    defaultMdu: "CMA7",
    notesEn:
      "In-tank vacuum combined. Use when compound / CM2 cannot cover current, Um, step voltage or positions. For Iᵤ≫1000 A III see SHZVG.",
    notesZh:
      "箱内真空组合式。当复合式/CM2 不够时用。三相电流显著大于 1000 A 见 SHZVG。",
    rank: 40,
  },
  {
    id: "shzvg",
    code: "SHZVG",
    nameEn: "SHZVG in-tank vacuum OLTC (high current)",
    nameZh: "SHZVG 箱内真空有载开关（大电流）",
    mounting: ["in_tank"],
    medium: "oil_vacuum",
    structure: "combined",
    vacuum: true,
    // 2025 sales + price list: III 1300/1500; I 1300 (3000 special)
    currents: {
      I: [1300, 3000],
      II: [1300],
      III: [1300, 1500],
    },
    umKv: [72.5, 126, 170, 252, 300],
    usesSelectorSize: true,
    maxStepVoltageV: 4000,
    stepCapacityByCurrent: {
      1300: 3000,
      1500: 3500,
      3000: 5600,
    },
    connections: ["Y", "D"],
    maxPositionsLinear: 18,
    maxPositionsWithChangeOver: 35,
    defaultMdu: "CMA7",
    notesEn:
      "High-current vacuum combined (2025 shipments). Prefer only when SHZV III max 1000 A is short.",
    notesZh:
      "大电流真空组合式（2025 出货有量）。仅当 SHZV 三相 1000 A 不够时选用。",
    rank: 45,
  },
  {
    id: "hwv",
    code: "HWV",
    nameEn: "HWV externally-mounted vacuum OLTC",
    nameZh: "HWV 箱外真空有载开关",
    mounting: ["on_tank", "external_compartment"],
    medium: "oil_vacuum",
    structure: "combined",
    vacuum: true,
    currents: {
      I: [400, 800, 1000],
      III: [400, 800, 1000],
    },
    umKv: [17.5, 40.5, 72.5],
    usesSelectorSize: false,
    maxStepVoltageV: 3300,
    stepCapacityByCurrent: {
      400: 1200,
      800: 2200,
      1000: 2600,
    },
    connections: ["Y", "D", "any"],
    maxPositionsLinear: 18,
    maxPositionsWithChangeOver: 35,
    defaultMdu: "CMA7",
    notesEn:
      "Side-mounted independent oil compartment — retrofit / side tank. Commercial string usually omits selector grade.",
    notesZh: "侧面独立油室，改造常用。商务型号通常不写选择器字母。",
    rank: 15,
  },
  {
    id: "cm2",
    code: "CM2",
    nameEn: "CM2 in-tank vacuum OLTC (combined)",
    nameZh: "CM2 箱内真空有载开关（组合式）",
    mounting: ["in_tank"],
    medium: "oil_vacuum",
    structure: "combined",
    vacuum: true,
    currents: {
      I: [500, 600, 800, 1200, 1500],
      II: [500, 600],
      III: [500, 600],
    },
    umKv: [72.5, 126, 170, 252],
    usesSelectorSize: true,
    maxStepVoltageV: 3300,
    stepCapacityByCurrent: {
      500: 1400,
      600: 1500,
      800: 2000,
      1200: 3100,
      1500: 3500,
    },
    connections: ["Y", "D"],
    maxPositionsLinear: 18,
    maxPositionsWithChangeOver: 35,
    defaultMdu: "CMA7",
    notesEn:
      "Vacuum combined. Prefer over SHZV when III ≤600 A (or single-phase ratings) and Um/positions fit.",
    notesZh:
      "真空组合式。三相 ≤600 A 且 Um/档位满足时优先于 SHZV。",
    rank: 25,
  },
  {
    id: "cm",
    code: "CM",
    nameEn: "CM in-tank oil OLTC (combined)",
    nameZh: "CM 箱内油浸有载开关（组合式）",
    mounting: ["in_tank"],
    medium: "oil",
    structure: "combined",
    vacuum: false,
    currents: {
      I: [500, 600, 800, 1200, 1500],
      II: [500, 600],
      III: [500, 600],
    },
    umKv: [72.5, 126, 170, 252],
    usesSelectorSize: true,
    maxStepVoltageV: 3300,
    stepCapacityByCurrent: {
      500: 1400,
      600: 1500,
      800: 2000,
      1200: 3100,
      1500: 3500,
    },
    connections: ["Y", "D"],
    maxPositionsLinear: 18,
    maxPositionsWithChangeOver: 35,
    defaultMdu: "CMA7",
    notesEn: "Oil combined. Prefer vacuum when switching is frequent.",
    notesZh: "油切换组合式。切换频繁时优先真空。",
    rank: 50,
  },
  {
    id: "cmd",
    code: "CMD",
    nameEn: "CMD in-tank oil OLTC (combined, high current)",
    nameZh: "CMD 箱内油浸有载开关（大电流）",
    mounting: ["in_tank"],
    medium: "oil",
    structure: "combined",
    vacuum: false,
    currents: {
      // 2025 sales: CMDI-1200 common (indirect export); price list also 400/600/1000/1600/2400
      I: [400, 600, 1000, 1200, 1600, 2400],
      II: [400, 600, 1000],
      III: [400, 600, 1000],
    },
    umKv: [72.5, 126, 170, 252, 300, 363],
    usesSelectorSize: true,
    maxStepVoltageV: 4000,
    stepCapacityByCurrent: {
      400: 1320,
      600: 1600,
      1000: 3000,
      1200: 3000,
      1600: 4400,
      2400: 5600,
    },
    connections: ["Y", "D"],
    maxPositionsLinear: 14,
    maxPositionsWithChangeOver: 27,
    defaultMdu: "CMA7",
    notesEn: "Higher through-current oil combined type.",
    notesZh: "更大额定电流的油浸组合式。",
    rank: 55,
  },
  {
    id: "cv2",
    code: "CV2",
    nameEn: "CV2 in-tank vacuum compound OLTC (selector switch)",
    nameZh: "CV2 箱内真空复合式有载开关（选择开关）",
    mounting: ["in_tank"],
    medium: "oil_vacuum",
    structure: "compound",
    vacuum: true,
    currents: {
      I: [350, 600],
      II: [350, 600],
      III: [350, 600],
    },
    umKv: [40.5, 72.5, 126, 145],
    usesSelectorSize: false,
    maxStepVoltageV: 2000,
    stepCapacityByCurrent: {
      350: 700,
      600: 800,
    },
    connections: ["Y", "D"],
    maxPositionsLinear: 12,
    maxPositionsWithChangeOver: 23,
    defaultMdu: "CMA7",
    notesEn:
      "Compound vacuum. 2025 sales: III 350/600 only (no 500). Prefer when I≤600 A, Um≤145 kV, positions≤23.",
    notesZh:
      "真空复合式。2025 出货三相仅 350/600 A（无 500）。I≤600、Um≤145、档位≤23 时优先。",
    rank: 10,
  },
  {
    id: "cv",
    code: "CV",
    nameEn: "CV in-tank oil compound OLTC",
    nameZh: "CV 箱内油浸复合式有载开关",
    mounting: ["in_tank"],
    medium: "oil",
    structure: "compound",
    vacuum: false,
    currents: {
      I: [350, 700],
      III: [350],
    },
    umKv: [40.5, 72.5],
    usesSelectorSize: false,
    maxStepVoltageV: 1500,
    stepCapacityByCurrent: {
      350: 525,
      700: 660,
    },
    connections: ["Y", "D"],
    maxPositionsLinear: 14,
    maxPositionsWithChangeOver: 27,
    defaultMdu: "CMA7",
    notesEn: "Oil compound. 500 A oil compound is SV, not CV.",
    notesZh: "油浸复合式。500 A 油浸复合为 SV。",
    rank: 18,
  },
  {
    id: "sv",
    code: "SV",
    nameEn: "SV in-tank oil compound OLTC",
    nameZh: "SV 箱内油浸复合式有载开关",
    mounting: ["in_tank"],
    medium: "oil",
    structure: "compound",
    vacuum: false,
    currents: {
      III: [500],
    },
    umKv: [40.5, 72.5],
    usesSelectorSize: false,
    maxStepVoltageV: 1500,
    stepCapacityByCurrent: {
      500: 525,
    },
    connections: ["Y", "D"],
    maxPositionsLinear: 12,
    maxPositionsWithChangeOver: 23,
    defaultMdu: "CMA7",
    notesEn: "Oil compound 500 A (SVIII-500).",
    notesZh: "油浸复合式 500 A（SVIII-500）。",
    rank: 19,
  },
  {
    id: "cvt",
    code: "CVT",
    nameEn: "CVT dry-type vacuum OLTC",
    nameZh: "CVT 干式真空有载开关",
    mounting: ["dry_type"],
    medium: "dry",
    structure: "compound",
    vacuum: true,
    currents: {
      I: [160, 200],
      III: [160, 200],
    },
    umKv: [12],
    usesSelectorSize: false,
    maxStepVoltageV: 500,
    stepCapacityByCurrent: {
      160: 80,
      200: 80,
    },
    connections: ["Y", "D", "any"],
    maxPositionsLinear: 9,
    maxPositionsWithChangeOver: 9,
    defaultMdu: "CMA7",
    notesEn: "Dry-type CVTIII-160/200 / 12 kV.",
    notesZh: "干式 CVTIII-160/200，12 kV。",
    rank: 12,
  },
  {
    id: "cz",
    code: "CZ",
    nameEn: "CZ dry-type vacuum OLTC",
    nameZh: "CZ 干式真空有载开关",
    mounting: ["dry_type"],
    medium: "dry",
    structure: "compound",
    vacuum: true,
    currents: {
      I: [500, 600],
      III: [500, 600],
    },
    umKv: [40.5, 72.5],
    usesSelectorSize: false,
    maxStepVoltageV: 950,
    stepCapacityByCurrent: {
      500: 325,
      600: 325,
    },
    connections: ["Y", "D", "any"],
    maxPositionsLinear: 17,
    maxPositionsWithChangeOver: 17,
    defaultMdu: "CMA7",
    notesEn: "Dry-type; commercial often 3×CZI-500/…",
    notesZh: "干式；商务常写 3×CZI-500/…",
    rank: 14,
  },
  {
    id: "hwdk",
    code: "HWDK",
    nameEn: "HWDK reactor-type OLTC",
    nameZh: "HWDK 电抗式有载开关",
    mounting: ["reactor"],
    medium: "oil",
    structure: "combined",
    vacuum: false,
    currents: {
      III: [1500, 2000, 2500],
    },
    umKv: [35, 69],
    usesSelectorSize: false,
    maxStepVoltageV: 6000,
    connections: ["Y", "D", "any"],
    maxPositionsLinear: 18,
    maxPositionsWithChangeOver: 35,
    defaultMdu: "CMA7",
    notesEn: "Reactor family — confirm with engineering.",
    notesZh: "电抗器系列，需工程确认。",
    rank: 80,
  },
];

export function nearestUm(wanted: number, allowed: number[]): number | null {
  if (!allowed.length) return null;
  const sorted = [...allowed].sort((a, b) => a - b);
  const ge = sorted.find((u) => u >= wanted - 0.01);
  return ge ?? sorted[sorted.length - 1];
}

export function nearestCurrent(
  wanted: number,
  allowed: number[] | undefined,
): number | null {
  if (!allowed?.length) return null;
  const sorted = [...allowed].sort((a, b) => a - b);
  const ge = sorted.find((c) => c >= wanted - 0.01);
  return ge ?? null;
}

export function phaseToken(p: PhaseCode): string {
  return p;
}

/**
 * Commercial default selector grade from Um (training calc sheet + HOW TO SELECT).
 *   ≤72.5 (≤115 kV class) → B
 *   126 / 145 (~110–150 kV) → C
 *   170 / 252 (~170–220 kV) → D
 *   ≥300 → DE
 * Across-tap a/b stress can only raise this, never lower it.
 */
export function defaultSelectorSizeForUm(um: number): SelectorSize {
  if (um <= 72.5 + 0.1) return "B";
  if (um <= 145 + 0.1) return "C";
  if (um <= 252 + 0.1) return "D";
  return "DE";
}

function firstAllowedAtOrAbove(
  min: SelectorSize,
  allowed: SelectorSize[],
): SelectorSize {
  const minIdx = SIZE_ORDER.indexOf(min);
  for (let i = Math.max(0, minIdx); i < SIZE_ORDER.length; i++) {
    if (allowed.includes(SIZE_ORDER[i])) return SIZE_ORDER[i];
  }
  return allowed[allowed.length - 1] ?? "B";
}

/**
 * Smallest selector grade that covers Um commercial default + optional across-tap / earth stresses.
 */
export function pickSelectorSize(
  um: number,
  requested: SelectorSize | "auto" | undefined,
  bilKv?: number,
  pfKv?: number,
  acrossTapBilKv?: number,
  acrossTapPfKv?: number,
): SelectorSize {
  const allowed = SELECTOR_SIZES_BY_UM[um] ?? ["B", "C", "D", "DE"];
  if (requested && requested !== "auto") {
    if (allowed.includes(requested)) return requested;
    return firstAllowedAtOrAbove(requested, allowed);
  }

  // Floor = commercial Um default (not always the weakest letter for that Um row)
  let floor = defaultSelectorSizeForUm(um);
  floor = firstAllowedAtOrAbove(floor, allowed);

  const earth = EARTH_INSULATION[um];
  // Earth withstand above catalogue for this Um → bump one step
  if (earth && bilKv && bilKv > earth.bil + 1) {
    const i = SIZE_ORDER.indexOf(floor);
    floor = firstAllowedAtOrAbove(
      SIZE_ORDER[Math.min(SIZE_ORDER.length - 1, i + 1)] ?? "DE",
      allowed,
    );
  }
  if (earth && pfKv && pfKv > earth.pf + 1) {
    const i = SIZE_ORDER.indexOf(floor);
    floor = firstAllowedAtOrAbove(
      SIZE_ORDER[Math.min(SIZE_ORDER.length - 1, i + 1)] ?? "DE",
      allowed,
    );
  }

  // Across-tap winding (a distance) — training case 2: BIL 285 → C
  const needALi = acrossTapBilKv ?? 0;
  const needAPf = acrossTapPfKv ?? 0;
  const floorIdx = SIZE_ORDER.indexOf(floor);

  for (let i = floorIdx; i < SIZE_ORDER.length; i++) {
    const cand = SIZE_ORDER[i];
    if (!allowed.includes(cand)) continue;
    const ins = INTERNAL_INSULATION[cand];
    if (needALi <= 0 && needAPf <= 0) return cand;
    if (ins.a_li + 0.5 >= needALi && ins.a_pf + 0.5 >= needAPf) return cand;
  }

  // Across-tap may force above Um floor
  for (const cand of SIZE_ORDER) {
    if (!allowed.includes(cand)) continue;
    const ins = INTERNAL_INSULATION[cand];
    if (ins.a_li + 0.5 >= needALi && ins.a_pf + 0.5 >= needAPf) return cand;
  }
  return allowed[allowed.length - 1];
}
