/** Shared types for OLTC selection */

export type { Lang } from "./i18n";

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
export type Regulation = "linear" | "reversing" | "coarse_fine";

export type ChangeOver = "0" | "W" | "G"; // linear / reversing / coarse-fine
export type SelectorSize = "A" | "B" | "C" | "D" | "DE" | "E" | "";
export type DutyKind = "oltc" | "octc";

export interface SelectInput {
  mounting: Mounting;
  medium: SwitchingMedium;
  preferVacuum: boolean;
  /**
   * OLTC (on-load) vs OCTC / 无载 (de-energized).
   * Unset defaults to oltc so in-tank vacuum ranking is unchanged.
   */
  dutyKind?: DutyKind;

  phases: PhaseCode;
  connection: Connection;
  /** Required through-current (A) — engine picks next catalogue Ium ≥ this */
  throughCurrentA: number;
  /** Highest voltage for equipment Um (kV) */
  umKv: number;
  /** Max step voltage (V) */
  stepVoltageV: number;
  regulation: Regulation;
  /** Desired max service positions (e.g. 19). */
  positions?: number;
  /** ±N steps */
  plusMinusSteps?: number;
  midPositions?: 0 | 1 | 3;
  pitch?: 10 | 12 | 14 | 16 | 18;
  /**
   * Required internal insulation class (tap selector size).
   * Leave empty to auto-pick smallest size that supports Um + across-tap stress.
   */
  selectorSize?: SelectorSize | "auto";
  /** Optional transformer BIL (kV) to earth */
  bilKv?: number;
  /** Optional PF withstand to earth (kV) */
  pfKv?: number;
  /** Across tap winding LI (kV) — drives B/C/D grade on combined types */
  acrossTapBilKv?: number;
  /** Across tap winding PF (kV) */
  acrossTapPfKv?: number;
  switchesPerDay?: number;
  mdu?: "CMA7" | "SHM-D" | "SHM-DA" | "none" | "auto";
}

export interface SeriesDef {
  id: string;
  code: string;
  nameEn: string;
  nameZh: string;
  mounting: Mounting[];
  medium: SwitchingMedium;
  structure: StructureKind;
  vacuum: boolean;
  currents: Partial<Record<PhaseCode, number[]>>;
  umKv: number[];
  usesSelectorSize: boolean;
  umSizePairs?: string[];
  maxStepVoltageV: number;
  stepCapacityByCurrent?: Record<number, number>;
  connections: Connection[];
  maxPositionsLinear: number;
  maxPositionsWithChangeOver: number;
  defaultMdu: string;
  notesEn: string;
  notesZh: string;
  /** Base family order for minimum-adequate ranking (lower preferred when eligible) */
  rank: number;
  /** Unset = oltc. WSL/WDL only join the list when input.dutyKind === "octc". */
  dutyKind?: DutyKind;
}

export interface ModelResult {
  seriesId: string;
  seriesCode: string;
  model: string;
  modelWithMdu: string;
  phases: PhaseCode;
  currentA: number;
  connection: Connection;
  umKv: number;
  selectorSize: SelectorSize;
  umToken: string;
  tapCode: string;
  regulation: Regulation;
  changeOver: ChangeOver;
  pitch: number;
  positions: number;
  mid: number;
  mdu: string;
  /** 1 = single unit; 3 = three single-phase units driven together */
  unitCount: number;
  reasonsEn: string[];
  reasonsZh: string[];
  warningsEn: string[];
  warningsZh: string[];
  confidence: number;
  /** Sort key components for debugging */
  adequacyScore: number;
}

export interface SelectOutput {
  ok: boolean;
  results: ModelResult[];
  errorsEn: string[];
  errorsZh: string[];
}
