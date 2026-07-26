/** Shared types for Huaming OLTC selection */

export type Lang = "en" | "zh";

export type Mounting =
  | "in_tank"
  | "on_tank"
  | "external_compartment"
  | "dry_type"
  | "reactor";

export type SwitchingMedium = "oil" | "oil_vacuum" | "dry";

export type StructureKind =
  | "combined" // diverter + tap selector
  | "compound"; // selector switch style (CV family)

export type PhaseCode = "I" | "II" | "III";
export type Connection = "Y" | "D" | "any";
export type Regulation =
  | "linear"
  | "reversing"
  | "coarse_fine";

export type ChangeOver = "0" | "W" | "G"; // linear / reversing / coarse-fine
export type SelectorSize = "B" | "C" | "D" | "DE" | "";

export interface SelectInput {
  /** Application filters */
  mounting: Mounting;
  medium: SwitchingMedium;
  preferVacuum: boolean;

  phases: PhaseCode;
  connection: Connection;
  /** Required through-current (A) — engine picks next catalogue Ium ≥ this */
  throughCurrentA: number;
  /** Highest voltage for equipment Um (kV) */
  umKv: number;
  /** Max step voltage (V) */
  stepVoltageV: number;
  /** Step capacity check optional: I × U */
  regulation: Regulation;
  /** Desired max service positions (e.g. 19). If set with ±steps, positions win. */
  positions?: number;
  /** ±N steps (e.g. 8 → often 19 positions with reversing) */
  plusMinusSteps?: number;
  /** Mid-position code 0 | 1 | 3 — default inferred */
  midPositions?: 0 | 1 | 3;
  /** Tap selector pitch 10|12|14|16|18 — default inferred from positions */
  pitch?: 10 | 12 | 14 | 16 | 18;
  /**
   * Required internal insulation class (tap selector size).
   * Leave empty to auto-pick smallest size that supports Um.
   */
  selectorSize?: SelectorSize | "auto";
  /** Optional transformer BIL (kV) to earth — helps size grade */
  bilKv?: number;
  /** Optional PF withstand to earth (kV) */
  pfKv?: number;
  /** Switching frequency times/day */
  switchesPerDay?: number;
  /** MDU preference */
  mdu?: "CMA7" | "SHM-D" | "SHM-DA" | "none" | "auto";
}

export interface SeriesDef {
  id: string;
  /** Display / model prefix e.g. SHZV, HWV, CM2, CV2 */
  code: string;
  nameEn: string;
  nameZh: string;
  mounting: Mounting[];
  medium: SwitchingMedium;
  structure: StructureKind;
  vacuum: boolean;
  /** Catalogue max rated through currents by phase */
  currents: Partial<Record<PhaseCode, number[]>>;
  /** Allowed Um values (kV) without size letter — size attached separately if usesSelectorSize */
  umKv: number[];
  /** If true, model includes B/C/D/DE after Um */
  usesSelectorSize: boolean;
  /** Valid Um+size pairs when usesSelectorSize; if empty, any size from SELECTOR_SIZES_BY_UM */
  umSizePairs?: string[]; // e.g. "72.5B", "126C"
  maxStepVoltageV: number;
  stepCapacityByCurrent?: Record<number, number>; // Ium -> Psin kVA
  connections: Connection[];
  maxPositionsLinear: number;
  maxPositionsWithChangeOver: number;
  /** Default MDU bundled / recommended */
  defaultMdu: string;
  notesEn: string;
  notesZh: string;
  /** Priority when multiple match (lower = preferred for vacuum in-tank etc.) */
  rank: number;
}

export interface ModelResult {
  seriesId: string;
  seriesCode: string;
  /** Full commercial string without MDU */
  model: string;
  /** With +MDU if applicable */
  modelWithMdu: string;
  phases: PhaseCode;
  currentA: number;
  connection: Connection;
  umKv: number;
  selectorSize: SelectorSize;
  umToken: string; // "72.5" or "72.5B" or "126C"
  tapCode: string; // "10193W"
  regulation: Regulation;
  changeOver: ChangeOver;
  pitch: number;
  positions: number;
  mid: number;
  mdu: string;
  reasonsEn: string[];
  reasonsZh: string[];
  warningsEn: string[];
  warningsZh: string[];
  /** Confidence 0-1 */
  confidence: number;
}

export interface SelectOutput {
  ok: boolean;
  results: ModelResult[];
  errorsEn: string[];
  errorsZh: string[];
}
