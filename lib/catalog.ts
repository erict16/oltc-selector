import type {
  Connection,
  PhaseCode,
  SeriesDef,
  SelectorSize,
} from "./types";

/**
 * Catalogue axes grounded in:
 *  - Technical brochures
 *  - QS/a. Base Price List 2025.xlsx
 *  - **2025** sales reference (year filter = 2025) — not 2024
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

/** Discrete Um choices for UI dropdown (brochure + 2025 sales). No 35 / 69 — those are HWDK Un. */
export const UM_OPTIONS_KV = [
  12, 17.5, 40.5, 72.5, 126, 145, 170, 252, 300, 363,
] as const;

/** UI menu row. Labels are the catalogue number + unit — no ≤ / ≥ / >. */
export type CatalogueMenuItem = {
  value: number;
  labelZh: string;
  labelEn: string;
};

function catalogueMenu(
  steps: readonly number[],
  unit: string,
): CatalogueMenuItem[] {
  return steps.map((v) => {
    const label = `${v} ${unit}`;
    return { value: v, labelZh: label, labelEn: label };
  });
}

export const UM_MENU: CatalogueMenuItem[] = catalogueMenu(UM_OPTIONS_KV, "kV");

/**
 * Through-current UI menu. Exact catalogue Iᵤ (mobile picker).
 * Engine still covers upward from the selected value.
 */
export const CURRENT_OPTIONS_A = [
  160, 200, 350, 400, 500, 600, 700, 800, 1000, 1200, 1300, 1500, 1600, 2000,
  2400, 2500, 3000,
] as const;

export const CURRENT_MENU: CatalogueMenuItem[] = catalogueMenu(
  CURRENT_OPTIONS_A,
  "A",
);

/** Um-mode fallback Ust picks (calc sheet / quotes / brochure ceilings).
 *  Default form derives Ust from tap % × Un — this list is not first-paint. */
export const STEP_VOLTAGE_OPTIONS_V = [
  500, 800, 1000, 1200, 1400, 1500, 1650, 1800, 2000, 2200, 2500, 3000, 3300,
  4000, 4500, 5000, 6000,
] as const;

export const STEP_VOLTAGE_MENU: CatalogueMenuItem[] = catalogueMenu(
  STEP_VOLTAGE_OPTIONS_V,
  "V",
);

/**
 * Across-tap winding insulation menus (training cases + brochure a-distance ladder).
 * Empty selection = size selector from Um only.
 */
export const ACROSS_BIL_OPTIONS_KV = [
  75, 95, 105, 120, 150, 170, 200, 250, 285, 320, 350, 450, 520, 550, 650, 750,
] as const;

export const ACROSS_PF_OPTIONS_KV = [
  20, 30, 38, 45, 50, 65, 70, 80, 85, 95, 100, 110, 125, 140, 150,
] as const;

export const ACROSS_BIL_MENU: CatalogueMenuItem[] = catalogueMenu(
  ACROSS_BIL_OPTIONS_KV,
  "kV",
);

export const ACROSS_PF_MENU: CatalogueMenuItem[] = catalogueMenu(
  ACROSS_PF_OPTIONS_KV,
  "kV",
);

/** Re-export ± options (brochure W/G geometry lives in tapCode) */
export { PM_STEP_OPTIONS } from "./tapCode";

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
  // 252 B and 300 D: sold (3× 252B, e.g. CM2III-500Y/252B on E-CM2250216;
  // 3xSHZVI-1200/300D on E-SHZV260102). The Um default stays the auto floor.
  252: ["B", "C", "D", "DE"],
  300: ["D", "DE"],
  363: ["DE"],
};

/** Rank selector sizes weakest → strongest */
export const SIZE_ORDER: SelectorSize[] = ["B", "C", "D", "DE"];

export type InternalInsulation = {
  a_li: number;
  a_pf: number;
  b_li: number;
  b_pf: number;
};

/**
 * Internal insulation withstand (kV) by selector size — SHZV Table 4-2 (a / b distances).
 * Used for across-tap winding stress → grade letter. Default for every
 * combined family; see INTERNAL_INSULATION_BY_FAMILY for brochure overrides.
 */
export const INTERNAL_INSULATION: Record<SelectorSize, InternalInsulation> = {
  "": { a_li: 0, a_pf: 0, b_li: 0, b_pf: 0 },
  A: { a_li: 0, a_pf: 0, b_li: 0, b_pf: 0 },
  B: { a_li: 265, a_pf: 50, b_li: 265, b_pf: 50 },
  C: { a_li: 365, a_pf: 82, b_li: 350, b_pf: 82 },
  D: { a_li: 460, a_pf: 105, b_li: 460, b_pf: 146 },
  DE: { a_li: 550, a_pf: 120, b_li: 550, b_pf: 160 },
  E: { a_li: 0, a_pf: 0, b_li: 0, b_pf: 0 },
};

/**
 * Grades where a family's own brochure table differs from SHZV Table 4-2.
 *  - CM2 Table 2 (HM0.154.5701) and CM Table 2 (HM0.154.301): C a = 350 kV LI (SHZV 365).
 *  - CMD Table 2 (HM0.154.1901): D a / b = 490 kV LI (SHZV 460).
 * SHZV / SDZV / SHZVG keep the default table.
 */
export const INTERNAL_INSULATION_BY_FAMILY: Record<
  string,
  Partial<Record<SelectorSize, InternalInsulation>>
> = {
  cm2: { C: { a_li: 350, a_pf: 82, b_li: 350, b_pf: 82 } },
  cm: { C: { a_li: 350, a_pf: 82, b_li: 350, b_pf: 82 } },
  cmd: { D: { a_li: 490, a_pf: 105, b_li: 490, b_pf: 146 } },
};

/** Internal insulation of this grade on this family (default: SHZV table). */
export function internalInsulation(
  seriesId: string | undefined,
  size: SelectorSize,
): InternalInsulation {
  const own = seriesId ? INTERNAL_INSULATION_BY_FAMILY[seriesId]?.[size] : undefined;
  return own ?? INTERNAL_INSULATION[size];
}

/** Smallest listed pitch at or above `pitch`; past the last one, the last one. */
function atPitch<T>(table: Record<number, T>, pitch: number): T | undefined {
  const pitches = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b);
  const at = pitches.find((p) => p >= pitch) ?? pitches[pitches.length - 1];
  return at != null ? table[at] : undefined;
}

/**
 * Rated step capacity (kVA) at this Iᵤ and contact pitch.
 * A per-pitch table (CV / SV) uses the smallest listed pitch at or above
 * the asked pitch; above the last listed pitch it keeps the last value.
 * With `dutyA`, a brochure footnote rating for a reduced current applies
 * (SV 525 kVA when the duty is ≤350 A). Null when the brochure gives no
 * step capacity for this current.
 */
export function stepCapacityKva(
  s: Pick<
    SeriesDef,
    "stepCapacityByCurrent" | "stepCapacityByPitch" | "stepCapacityReduced"
  >,
  current: number,
  pitch: number,
  dutyA?: number,
): number | null {
  const byPitch = s.stepCapacityByPitch?.[current];
  const rated =
    (byPitch ? atPitch(byPitch, pitch) : undefined) ??
    s.stepCapacityByCurrent?.[current] ??
    null;
  const reduced = s.stepCapacityReduced
    ? atPitch(s.stepCapacityReduced, pitch)
    : undefined;
  // Strict like a catalogue rating (engine ratingCoversDuty, 2026-11-04
  // audit D2). 351 A at 1182 V (E-V250432-433, sold SVIII-500) is 0.3% over
  // the ≤350 A row, so it now goes to the next family, not a silent overrun.
  if (
    rated != null &&
    reduced &&
    dutyA != null &&
    dutyA <= reduced.currentA + 0.01
  ) {
    return Math.max(rated, reduced.kva);
  }
  return rated;
}

/**
 * Family preference when vacuum preferred / in-tank (lower = more preferred as minimum path).
 * Training: CV2 before CM2 before SHZV when each is eligible.
 */
/**
 * Does a brochure III type exist for this connection?
 * CM2III-…D is not a type (III is star-point only) → false.
 * CV2III-…D and HWVIII-…D exist → true.
 * 3× I is a different type, decided separately when I ratings exist.
 */
export function iiiTypeAllowsConnection(
  s: Pick<SeriesDef, "connections" | "iiiConnections">,
  phases: PhaseCode,
  conn: Connection,
): boolean {
  if (phases !== "III") return true;
  const allowed = s.iiiConnections ?? s.connections;
  if (conn === "any") return true;
  return allowed.includes(conn) || allowed.includes("any");
}

export const FAMILY_MIN_RANK: Record<string, number> = {
  cv2: 10,
  cv: 18,
  sv: 19,
  cm2: 25,
  shzv: 40,
  sdzv: 42, // dual-break vacuum; only when SHZV Ust / step capacity is short
  shzvg: 45, // high-current vacuum after standard SHZV
  cm: 50,
  cmd: 55,
  hwv: 15, // only wins on on-tank path
  cvt: 12,
  cz: 14,
  wsg: 6,
  hwdk: 80,
  wsl: 5, // OCTC-only list (never mixed into CV2→CM2→SHZV)
  wdl: 6,
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
    // List 72.5/126/170/252. 300 from 2026 OS. 363 brochure-only (no 2025 list row).
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
    iiiConnections: ["Y"],
    maxPositionsLinear: 18,
    maxPositionsWithChangeOver: 35,
    defaultMdu: "CMA7",
    notesEn:
      "In-tank vacuum combined. Brochure III type is star-point only (no SHZVIII-…D). Use when compound / CM2 cannot cover. For Iᵤ≫1000 A III see SHZVG.",
    notesZh:
      "箱内真空组合式。样本三相型号只给星点（没有 SHZVIII-…D）。当复合式/CM2 不够时用。三相电流显著大于 1000 A 见 SHZVG。",
    rank: 40,
  },
  {
    id: "sdzv",
    code: "SDZV",
    nameEn: "SDZV in-tank dual-break vacuum OLTC (combined)",
    nameZh: "SDZV 箱内双断口真空有载开关（组合式）",
    mounting: ["in_tank"],
    medium: "oil_vacuum",
    structure: "combined",
    vacuum: true,
    // 2024-11-13 技术数据 / 样本: III 400/600/1000; I 400/600/1000/1600/2400.
    // No II, no I-1200/1500, no III-1300 (old type-test only).
    currents: {
      I: [400, 600, 1000, 1600, 2400],
      III: [400, 600, 1000],
    },
    umKv: [72.5, 126, 170, 252, 300, 363],
    usesSelectorSize: true,
    maxStepVoltageV: 6000,
    stepCapacityByCurrent: {
      400: 2250,
      600: 2400,
      1000: 4500,
      1600: 6600,
      2400: 8400,
    },
    connections: ["Y", "D"],
    iiiConnections: ["Y"],
    maxPositionsLinear: 14,
    maxPositionsWithChangeOver: 27,
    defaultMdu: "CMA7",
    notesEn:
      "Dual-break vacuum combined (two interrupters in series). Brochure III is star-point only (no SDZVIII-…D). Use when SHZV 4000 V / step capacity is short. Standard positions 14 / 27; do not invent 18-contact or III-1300.",
    notesZh:
      "双断口真空组合式。样本三相只给星点（没有 SDZVIII-…D）。仅当 SHZV 级电压 4000 V 或级容量不够时选用。常规档位 14 / 27，不要编 18 触头或 III-1300。",
    rank: 42,
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
    // 2025 list: III 1300/1500; I 1300/2000/3000. Um 72.5/126/170/252 only.
    currents: {
      I: [1300, 2000, 3000],
      II: [1300],
      III: [1300, 1500],
    },
    umKv: [72.5, 126, 170, 252],
    usesSelectorSize: true,
    maxStepVoltageV: 4000,
    stepCapacityByCurrent: {
      1300: 3000,
      1500: 3500,
      2000: 4400,
      3000: 5600,
    },
    connections: ["Y", "D"],
    iiiConnections: ["Y"],
    maxPositionsLinear: 18,
    maxPositionsWithChangeOver: 35,
    defaultMdu: "CMA7",
    notesEn:
      "High-current vacuum combined (2025 shipments). Brochure III type is star-point only (no SHZVGIII-…D). Prefer when SHZV III max 1000 A is short.",
    notesZh:
      "大电流真空组合式（2025 出货有量）。样本三相型号只给星点（没有 SHZVGIII-…D）。仅当 SHZV 三相 1000 A 不够时选用。",
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
    iiiConnections: ["Y"],
    maxPositionsLinear: 18,
    maxPositionsWithChangeOver: 35,
    defaultMdu: "CMA7",
    notesEn:
      "Vacuum combined. Brochure III type is star-point only (no CM2III-…D). Prefer over SHZV when III ≤600 A (or single-phase ratings) and Um/positions fit.",
    notesZh:
      "真空组合式。样本三相型号只给星点（没有 CM2III-…D）。三相 ≤600 A 且 Um/档位满足时优先于 SHZV。",
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
    iiiConnections: ["Y"],
    maxPositionsLinear: 18,
    maxPositionsWithChangeOver: 35,
    defaultMdu: "CMA7",
    notesEn:
      "Oil combined. Brochure III type is star-point only (no CMIII-…D). Prefer vacuum when switching is frequent.",
    notesZh:
      "油切换组合式。样本三相型号只给星点（没有 CMIII-…D）。切换频繁时优先真空。",
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
    umKv: [72.5, 126, 170, 252],
    usesSelectorSize: true,
    maxStepVoltageV: 4000,
    // TD-CMD Table 1: 3300 V at 400/600 A, 4000 V from 1000 A.
    maxStepVoltageByCurrent: { 400: 3300, 600: 3300 },
    stepCapacityByCurrent: {
      400: 1320,
      600: 1600,
      1000: 3000,
      1200: 3000,
      1600: 4400,
      2400: 5600,
    },
    connections: ["Y", "D"],
    iiiConnections: ["Y"],
    maxPositionsLinear: 14,
    maxPositionsWithChangeOver: 27,
    defaultMdu: "CMA7",
    notesEn:
      "Higher through-current oil combined type. Brochure III type is star-point only (no CMDIII-…D).",
    notesZh:
      "更大额定电流的油浸组合式。样本三相型号只给星点（没有 CMDIII-…D）。",
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
    // TD-CV&SV (HM0.154.001) Table 1 row 7, by contacts 10 / 12 / 14.
    stepCapacityByPitch: {
      350: { 10: 525, 12: 420, 14: 350 },
      700: { 10: 660, 12: 520, 14: 450 },
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
      500: 400,
    },
    // TD-CV&SV Table 1 gives SV "400~525* / 325~420*" (10 / 12 contacts, no 14).
    // Footnote *: 525 / 420 kVA only with through-current cut to 350 / 300 A.
    // Conservative reading: 400 / 325 kVA at any duty above 350 / 300 A
    // (no interpolation between the two brochure points).
    stepCapacityByPitch: {
      500: { 10: 400, 12: 325 },
    },
    stepCapacityReduced: {
      10: { currentA: 350, kva: 525 },
      12: { currentA: 300, kva: 420 },
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
    maxPositionsLinear: 10,
    maxPositionsWithChangeOver: 10,
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
    notesEn: "Dry-type; 2025 list and 2026 OS are 3×CZI only (no CZIII row).",
    notesZh: "干式；价表和 2026 实单只有 3×CZI，没有 CZIII。",
    rank: 14,
  },
  {
    id: "hwdk",
    code: "HWDK",
    nameEn: "HWDK reactor-type OLTC",
    nameZh: "HWDK 电抗式有载开关",
    mounting: ["reactor", "on_tank"],
    medium: "oil",
    structure: "combined",
    vacuum: false,
    currents: {
      I: [1500, 2000, 2500],
      III: [1500, 2000, 2500],
    },
    umKv: [35, 40.5, 69],
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
  {
    id: "wsl",
    code: "WSL",
    nameEn: "WSL in-tank de-energized tap changer (OCTC)",
    nameZh: "WSL 箱内无载分接开关（OCTC）",
    mounting: ["in_tank"],
    medium: "oil",
    structure: "cage",
    vacuum: false,
    dutyKind: "octc",
    // Regular WSL(WDL) 2025 blocks only — no one-off 350/400/3500 rows.
    currents: {
      I: [600, 800, 1000, 1200, 1600, 2000, 2400],
      II: [600, 800, 1000, 1200, 1600, 2000, 2400],
      III: [600, 800, 1000, 1200, 1600, 2000, 2400],
    },
    umKv: [12, 40.5, 72.5, 126, 145, 170, 252, 363],
    usesSelectorSize: false,
    maxStepVoltageV: 10000,
    connections: ["Y", "D"],
    maxPositionsLinear: 18,
    maxPositionsWithChangeOver: 18,
    defaultMdu: "CMA7",
    notesEn:
      "Cage OCTC. Eligible only when dutyKind=octc. Wiring roman II/IV/V/VI/VII/VIII is a form field, independent of Y/D. Unset auto is linear IV for Y and D; 5x2→VIII, 3x2→VI, 5x4→V, 12x12→VII. Reversing II only when asked. Contact from P or OS. WDL aliases the same list.",
    notesZh:
      "笼式无载开关。仅 dutyKind=octc 时入选。接线方式 II/IV/V/VI/VII/VIII 与 Y/D 分开选。未指定时星接和角接都是线性 IV；5x2→VIII，3x2→VI，5x4→V，12x12→VII。正反调 II 要单独指定。档位映射触头 6x5/7x6/12x11/18x17。WDL 走同一价目表。",
    rank: 5,
  },
  {
    id: "wsg",
    code: "WSG",
    nameEn: "WSG off-circuit tap changer (OCTC)",
    nameZh: "WSG 无载分接开关（OCTC）",
    mounting: ["in_tank"],
    medium: "oil",
    structure: "drum",
    vacuum: false,
    dutyKind: "octc",
    currents: {
      I: [250, 300, 400, 600, 800, 1000, 1250],
      II: [250, 300, 400, 600, 800, 1000, 1250],
      III: [300, 600, 800],
    },
    umKv: [40.5],
    usesSelectorSize: false,
    maxStepVoltageV: 10000,
    connections: ["Y", "D"],
    maxPositionsLinear: 12,
    maxPositionsWithChangeOver: 12,
    defaultMdu: "CMA7",
    notesEn:
      "Drum OCTC (WG sheet). dutyKind=octc only. Wiring roman follows octcSeries (form default IV). Auto D → WSGII (Anthony WSG II-800D/40.5-4x5A).",
    notesZh:
      "鼓式无载（WG 价目表）。仅 dutyKind=octc。接线方式跟 octcSeries（页面默认 IV）。未指定时 D → WSGII。",
    rank: 6,
  },
];

export function nearestUm(wanted: number, allowed: number[]): number | null {
  if (!allowed.length) return null;
  const sorted = [...allowed].sort((a, b) => a - b);
  const ge = sorted.find((u) => u >= wanted - 0.01);
  return ge ?? sorted[sorted.length - 1];
}

/**
 * Covering Um plus the next catalogue step (2025 list / 2026 OS).
 * 72.5 duty → 72.5 and 126, not 170/252. 145 (CV2) has no next combined twin.
 */
export function coveringUms(wanted: number, allowed: number[]): number[] {
  if (!allowed.length) return [];
  const sorted = [...allowed].sort((a, b) => a - b);
  const ge = sorted.filter((u) => u >= wanted - 0.01);
  if (!ge.length) return [];
  return ge.length > 1 ? [ge[0], ge[1]] : [ge[0]];
}

export function nearestCurrent(
  wanted: number,
  allowed: number[] | undefined,
): number | null {
  if (!allowed?.length) return null;
  const sorted = [...allowed].sort((a, b) => a - b);
  // No tolerance above the top rating (2026-11-04 audit D2, IEC "not less than").
  return sorted.find((c) => c >= wanted - 0.01) ?? null;
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
 * Across-tap stress raises it; a stated stress on a star point or a
 * single-phase unit may also lower it (resolveSelectorSize, GRADE-2).
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

function coversAcrossTap(
  size: SelectorSize,
  needALi: number,
  needAPf: number,
  seriesId?: string,
): boolean {
  const ins = internalInsulation(seriesId, size);
  return ins.a_li + 0.5 >= needALi && ins.a_pf + 0.5 >= needAPf;
}

export type SelectorSizePick = {
  /** Null when no grade on this Um row covers the across-tap stress. */
  size: SelectorSize | null;
  /** The typed grade, when the engine had to raise it. */
  raisedFrom?: SelectorSize;
};

/**
 * Smallest selector grade that covers the Um commercial default and a typed
 * across-tap stress. Earth insulation is the Um class, not the grade
 * (see `umForEarthInsulation`).
 * A typed grade stays when it is legal on this Um and covers the stress.
 * Otherwise it is raised and `raisedFrom` says so.
 * Stress above DE returns null. Never hand back a grade that does not cover.
 * `seriesId` picks that family's own withstand table (CM2 C is 350, not 365).
 * `statedFloor`: a star point or single-phase unit with a stated across-tap
 * stress starts from the weakest grade on the Um row, not the Um default.
 * 2026-11-04 audit GRADE-2: A01 (PLN, OS "across tap winding AC82/LI350",
 * Um 170) was sold 3xCM2I-600/170C; the Um map alone gave D. Only distance
 * a is checked, so three-phase line-end / delta units keep the Um default.
 */
export function resolveSelectorSize(
  um: number,
  requested: SelectorSize | "auto" | undefined,
  acrossTapBilKv?: number,
  acrossTapPfKv?: number,
  seriesId?: string,
  statedFloor = false,
): SelectorSizePick {
  const allowed = SELECTOR_SIZES_BY_UM[um] ?? ["B", "C", "D", "DE"];
  const needALi = acrossTapBilKv ?? 0;
  const needAPf = acrossTapPfKv ?? 0;
  const typed = requested && requested !== "auto" ? requested : null;
  const stated = statedFloor && (needALi > 0 || needAPf > 0);

  // Floor = typed grade, else the commercial Um default
  // (not always the weakest letter for that Um row).
  const floor = firstAllowedAtOrAbove(
    typed ?? (stated ? allowed[0]! : defaultSelectorSizeForUm(um)),
    allowed,
  );
  for (let i = SIZE_ORDER.indexOf(floor); i < SIZE_ORDER.length; i++) {
    const cand = SIZE_ORDER[i];
    if (!allowed.includes(cand)) continue;
    // Across-tap winding (a distance) — training case 2: BIL 285 → C
    if (!coversAcrossTap(cand, needALi, needAPf, seriesId)) continue;
    return typed && cand !== typed ? { size: cand, raisedFrom: typed } : { size: cand };
  }
  return { size: null };
}

/** Grade only. Null when the across-tap stress is above every grade on this Um. */
export function pickSelectorSize(
  um: number,
  requested: SelectorSize | "auto" | undefined,
  acrossTapBilKv?: number,
  acrossTapPfKv?: number,
  seriesId?: string,
  statedFloor = false,
): SelectorSize | null {
  return resolveSelectorSize(um, requested, acrossTapBilKv, acrossTapPfKv, seriesId, statedFloor).size;
}

/**
 * Lowest catalogue Um whose earth withstand covers a typed transformer
 * BIL / PF to earth. A neutral or line end above the class is a higher Um,
 * not a stronger selector grade. Null when nothing in the table covers it.
 */
export function umForEarthInsulation(
  umKv: number,
  bilKv?: number,
  pfKv?: number,
): number | null {
  const needBil = bilKv ?? 0;
  const needPf = pfKv ?? 0;
  const classes = Object.keys(EARTH_INSULATION)
    .map(Number)
    .sort((a, b) => a - b);
  for (const u of classes) {
    if (u < umKv - 0.01) continue;
    const e = EARTH_INSULATION[u]!;
    if (e.bil + 0.5 >= needBil && e.pf + 0.5 >= needPf) return u;
  }
  return null;
}
