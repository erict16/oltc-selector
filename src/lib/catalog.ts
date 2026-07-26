import type { PhaseCode, SeriesDef, SelectorSize } from "./types";

/** Earth insulation (to ground) per Um — SHZV Table 4-1 / HWV Table 1 */
export const EARTH_INSULATION: Record<
  number,
  { pf: number; bil: number }
> = {
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

/**
 * Default allowed selector sizes per Um for in-tank combined types (CM/CM2/SHZV).
 * From price list headers + technical data practice.
 */
export const SELECTOR_SIZES_BY_UM: Record<number, SelectorSize[]> = {
  40.5: ["B", "C"],
  72.5: ["B", "C", "D"],
  126: ["B", "C", "D", "DE"],
  145: ["C", "D", "DE"],
  170: ["D", "DE"],
  252: ["DE"],
  300: ["DE"],
  363: ["DE"],
};

/** Rank selector sizes weakest → strongest */
export const SIZE_ORDER: SelectorSize[] = ["B", "C", "D", "DE"];

/**
 * Internal insulation withstand (kV) by selector size — SHZV Table 4-2 (a / b distances).
 * Used when user supplies winding stress requirements later; for auto size we use Um map.
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
      I: [400, 600, 800, 1000, 1200, 1500, 2400],
      II: [400, 600, 800, 1000],
      III: [400, 600, 800, 1000, 1300],
    },
    umKv: [72.5, 126, 145, 170, 252],
    usesSelectorSize: true,
    maxStepVoltageV: 4000,
    stepCapacityByCurrent: {
      400: 1200,
      600: 1800,
      800: 2200,
      1000: 2600,
      1300: 3000,
    },
    connections: ["Y", "D"],
    maxPositionsLinear: 18,
    maxPositionsWithChangeOver: 35,
    defaultMdu: "CMA7",
    notesEn:
      "Primary in-tank vacuum choice for power transformers. Model includes tap selector insulation grade (B/C/D/DE).",
    notesZh:
      "箱内真空主力系列。型号含分接选择器绝缘等级（B/C/D/DE）。",
    rank: 10,
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
    usesSelectorSize: false, // catalogue / quotes: HWVIII-400Y/72.5-10193W
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
      "Side-mounted independent oil compartment — common for retrofit / conservator tanks. Integrated SHM-DA drive available; CMA7 also used commercially.",
    notesZh:
      "侧面独立油室，改造/带油枕变压器常用。可配 SHM-DA；商务上亦常配 CMA7。",
    rank: 20,
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
      I: [500, 600, 800, 1000, 1500],
      II: [500, 600, 800, 1000],
      III: [500, 600, 800, 1000],
    },
    umKv: [72.5, 126, 145, 170, 252],
    usesSelectorSize: true,
    maxStepVoltageV: 3300,
    connections: ["Y", "D"],
    maxPositionsLinear: 18,
    maxPositionsWithChangeOver: 35,
    defaultMdu: "CMA7",
    notesEn: "Vacuum combined OLTC, CM family vacuum successor (VCM/CM2).",
    notesZh: "CM 系列真空型（VCM/CM2）。",
    rank: 15,
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
      I: [500, 600, 800, 1000, 1500],
      II: [500, 600, 800, 1000],
      III: [500, 600, 800, 1000],
    },
    umKv: [72.5, 126, 145, 170, 252],
    usesSelectorSize: true,
    maxStepVoltageV: 3300,
    connections: ["Y", "D"],
    maxPositionsLinear: 18,
    maxPositionsWithChangeOver: 35,
    defaultMdu: "CMA7",
    notesEn: "Oil-switching combined OLTC. Prefer vacuum (CM2/SHZV) when switching is frequent.",
    notesZh: "油切换组合式。切换频繁时优先真空（CM2/SHZV）。",
    rank: 40,
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
      I: [600, 1000, 1500, 2000],
      III: [600, 1000],
    },
    umKv: [72.5, 126, 145, 170],
    usesSelectorSize: true,
    maxStepVoltageV: 3300,
    connections: ["Y", "D"],
    maxPositionsLinear: 18,
    maxPositionsWithChangeOver: 35,
    defaultMdu: "CMA7",
    notesEn: "Higher through-current oil combined type.",
    notesZh: "更大额定电流的油浸组合式。",
    rank: 45,
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
      I: [350, 500, 600],
      II: [350, 500, 600],
      III: [350, 500, 600],
    },
    umKv: [40.5, 72.5, 126],
    usesSelectorSize: false,
    maxStepVoltageV: 1500,
    connections: ["Y", "D"],
    maxPositionsLinear: 14,
    maxPositionsWithChangeOver: 27,
    defaultMdu: "CMA7",
    notesEn: "Compound / selector-switch vacuum type. Lower max step voltage than combined types.",
    notesZh: "复合式/选择开关真空型。最大级电压低于组合式。",
    rank: 25,
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
      III: [350, 500, 600],
    },
    umKv: [40.5, 72.5, 126],
    usesSelectorSize: false,
    maxStepVoltageV: 1500,
    connections: ["Y", "D"],
    maxPositionsLinear: 14,
    maxPositionsWithChangeOver: 27,
    defaultMdu: "CMA7",
    notesEn: "Oil compound type (CV/SV family).",
    notesZh: "油浸复合式（CV/SV 系列）。",
    rank: 50,
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
      I: [100, 200, 300],
      III: [100, 200, 300],
    },
    umKv: [12, 24, 40.5],
    usesSelectorSize: false,
    maxStepVoltageV: 500,
    connections: ["Y", "D", "any"],
    maxPositionsLinear: 14,
    maxPositionsWithChangeOver: 17,
    defaultMdu: "CMA7",
    notesEn: "For dry-type transformers.",
    notesZh: "用于干式变压器。",
    rank: 30,
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
      I: [100, 200, 300],
      III: [100, 200, 300],
    },
    umKv: [12, 24, 40.5],
    usesSelectorSize: false,
    maxStepVoltageV: 1000,
    connections: ["Y", "D", "any"],
    maxPositionsLinear: 14,
    maxPositionsWithChangeOver: 17,
    defaultMdu: "CMA7",
    notesEn: "Dry-type vacuum alternative.",
    notesZh: "干式真空另一系列。",
    rank: 35,
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
    notesEn: "Reactor application family — confirm with engineering.",
    notesZh: "电抗器应用系列，需工程确认。",
    rank: 60,
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
  return p; // I / II / III
}

export function pickSelectorSize(
  um: number,
  requested: SelectorSize | "auto" | undefined,
  bilKv?: number,
  pfKv?: number,
): SelectorSize {
  const allowed = SELECTOR_SIZES_BY_UM[um] ?? ["B", "C", "D", "DE"];
  if (requested && requested !== "auto") {
    if (allowed.includes(requested)) return requested;
    // bump to next size that exists
    const idx = SIZE_ORDER.indexOf(requested);
    for (let i = idx; i < SIZE_ORDER.length; i++) {
      if (allowed.includes(SIZE_ORDER[i])) return SIZE_ORDER[i];
    }
    return allowed[allowed.length - 1];
  }

  // Auto: start from smallest; bump if user earth BIL/PF exceeds standard for Um
  let size = allowed[0];
  const earth = EARTH_INSULATION[um];
  if (earth && bilKv && bilKv > earth.bil + 1) {
    // need stronger path — pick stronger size if available
    size = allowed[Math.min(allowed.length - 1, 1)] ?? size;
  }
  if (earth && pfKv && pfKv > earth.pf + 1) {
    size = allowed[Math.min(allowed.length - 1, 1)] ?? size;
  }
  // High Um defaults
  if (um >= 170) size = allowed.includes("D") ? "D" : allowed[allowed.length - 1];
  if (um >= 252) size = allowed.includes("DE") ? "DE" : allowed[allowed.length - 1];
  return size;
}
