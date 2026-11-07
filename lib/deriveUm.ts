import type { SelectInput } from "./types";

/**
 * Tap-side *rated* voltage Un (调压侧，接在开关上的那档)，不是变压器高压，也不是开关 Um。
 *
 * Menu is nameplate kV people actually see (33 / 69 / 115 / 138 / 230), not only IEC round numbers.
 */
export const WINDING_RATED_KV = [
  33, 35, 66, 69, 110, 115, 132, 138, 150, 220, 230, 330,
] as const;

/** First-paint tap-side Un. 110 kV is the common HV class; star still → Um 72.5. */
export const DEFAULT_WINDING_RATED_KV = 110;

/**
 * System nominals a nameplate kV steps down to (nominalSystemKv).
 * 2026-11-04 audit UM-7: the second Um rule that used the old
 * RATED_TO_WINDING_UM map (220 kV star → 252) is gone; deriveDuty is the
 * one rule, and deriveUm.os.test.ts now checks it.
 */
const SNAP_UN = [33, 35, 66, 69, 110, 115, 132, 138, 150, 220, 230, 330] as const;

/**
 * Calculated Um the form shows and sends. Catalogue snap is the engine.
 * D (line end): the tap-side rated voltage as entered.
 * Y (and any): that voltage / √3.
 */
export function calculatedUm(
  ratedKv: number,
  connection: SelectInput["connection"],
): number {
  if (!(ratedKv > 0)) return NaN;
  if (connection === "D") return ratedKv;
  return ratedKv / Math.sqrt(3);
}

/** One decimal. Whole numbers stay without a trailing .0. */
export function formatUmKv(um: number): string {
  if (!Number.isFinite(um) || !(um > 0)) return "";
  const r = Math.round(um * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/** IEC 60038 highest voltages for equipment (kV). */
const IEC_UM = [
  3.6, 7.2, 12, 17.5, 24, 36, 40.5, 52, 72.5, 100, 123, 145, 170, 245, 300,
  362, 420, 550, 800,
] as const;

/** Huaming catalogue Um classes (kV). */
const CATALOGUE_UM = [12, 17.5, 40.5, 72.5, 126, 145, 170, 252, 300, 363] as const;

/**
 * Nameplate kV often sits above its system's nominal (121 on 110, 242 on
 * 220, 38.5 on 35). Step down to that nominal when it is within 12%.
 * 400 and 500 take a 5% window: 420 → 400 (Um 420, not 550), while 440 kV
 * (Brazil, Um 460, not an IEC value) still rounds up to 550 (audit UM-8).
 */
function nominalSystemKv(ratedKv: number): number {
  let best = ratedKv;
  for (const u of [...SNAP_UN, 400, 500]) {
    const win = u >= 400 ? 0.05 : 0.12;
    if (u <= ratedKv && (ratedKv - u) / ratedKv <= win) best = u;
  }
  return best;
}

/**
 * Actual Um of the system the tap side sits on, before any snap to a
 * Huaming catalogue class: the lowest IEC Um at least 4% above the
 * system nominal. 22 → 24, 35 → 40.5, 110/115/121 → 123, 225/230/242 → 245.
 */
export function iecUmFromRatedKv(ratedKv: number): number {
  if (!(ratedKv > 0)) return NaN;
  const un = nominalSystemKv(ratedKv);
  return IEC_UM.find((u) => u >= un * 1.04) ?? NaN;
}

/** Lowest catalogue class covering the actual Um (22 kV → 40.5). */
export function catalogueUmFromRatedKv(ratedKv: number): number {
  const um = iecUmFromRatedKv(ratedKv);
  if (!Number.isFinite(um)) return NaN;
  return CATALOGUE_UM.find((c) => c >= um - 1e-9) ?? um;
}

/**
 * Brochure 开关选型: star I = P/(√3 U), delta I = P/(3 U).
 * P in MVA, U in kV → A.
 */
export function throughCurrentFromRated(
  mva: number,
  ratedKv: number,
  connection: SelectInput["connection"],
): number {
  if (!(mva > 0) || !(ratedKv > 0)) return NaN;
  if (connection === "D") return (mva * 1000) / (3 * ratedKv);
  return (mva * 1000) / (Math.sqrt(3) * ratedKv);
}

/** Step voltage from Un and %: delta Un×%; star (Un/√3)×%. */
export function stepVoltageFromPercent(
  ratedKv: number,
  stepPercent: number,
  connection: SelectInput["connection"],
): number {
  if (!(ratedKv > 0) || !(stepPercent > 0)) return NaN;
  const windingV =
    connection === "D"
      ? ratedKv * 1000
      : (ratedKv * 1000) / Math.sqrt(3);
  return windingV * stepPercent;
}

/** Step as a fraction of winding voltage. Delta: Un; star: Un/√3. */
export function stepPercentFromUst(
  stepVoltageV: number,
  ratedKv: number,
  connection: SelectInput["connection"],
): number {
  if (!(stepVoltageV > 0) || !(ratedKv > 0)) return NaN;
  const windingV =
    connection === "D"
      ? ratedKv * 1000
      : (ratedKv * 1000) / Math.sqrt(3);
  return stepVoltageV / windingV;
}

/**
 * OLTC Iu is the current at the lowest tap (constant MVA), not rated I.
 * drop = minusSteps × stepPercent; Imax = Irated / (1 − drop).
 */
export function maxThroughCurrent(
  ratedA: number,
  minusSteps: number,
  stepPercent: number,
): number {
  if (!(ratedA > 0)) return NaN;
  if (!(minusSteps > 0) || !(stepPercent > 0)) return ratedA;
  const drop = minusSteps * stepPercent;
  if (drop <= 0) return ratedA;
  // 2026-11-04 r3 ENGINE-8: a silent 45% cap sized −48% at 490.9 A, not 519.2 A
  // (below the CM2-500 rating). deriveDuty refuses ≥ 100% and flags > 45%.
  if (drop >= 1) return NaN;
  return ratedA / (1 - drop);
}

/**
 * True when OS through-current matches I from this kV — then the kV is the
 * winding the OLTC sits on, not the other side of the transformer.
 *
 * Allows min-tap current rise (about −12.5% voltage → ×1.14).
 */
export function isTapSideRatedKv(opts: {
  mva: number;
  ratedKv: number;
  dutyA: number;
  connection: SelectInput["connection"];
}): boolean {
  const i = throughCurrentFromRated(opts.mva, opts.ratedKv, opts.connection);
  if (!Number.isFinite(i) || !(opts.dutyA > 0)) return false;
  const ratio = opts.dutyA / i;
  return ratio >= 0.88 && ratio <= 1.22;
}
