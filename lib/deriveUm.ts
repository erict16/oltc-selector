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

/** Un → winding highest voltage (IEC / GB equipment class). */
export const RATED_TO_WINDING_UM: Record<number, number> = {
  33: 40.5,
  35: 40.5,
  66: 72.5,
  69: 72.5,
  110: 126,
  115: 126,
  132: 145,
  138: 145,
  150: 170,
  220: 252,
  230: 252,
  330: 363,
};

const SNAP_UN = (Object.keys(RATED_TO_WINDING_UM).map(Number) as number[]).sort(
  (a, b) => a - b,
);

/**
 * Nearest nameplate Un. 138 → 138, 135 → 132, 121 → 115, 158 → 150.
 * Far outliers (10.5, 400, 725) stay as-is so the engine can reject / cover.
 */
export function snapRatedKv(ratedKv: number): number {
  if (!Number.isFinite(ratedKv) || ratedKv <= 0) return ratedKv;
  if (RATED_TO_WINDING_UM[ratedKv] != null) return ratedKv;
  let best = SNAP_UN[0]!;
  let bestDist = Math.abs(ratedKv - best);
  for (const u of SNAP_UN) {
    const d = Math.abs(ratedKv - u);
    if (d < bestDist) {
      best = u;
      bestDist = d;
    }
  }
  const rel = bestDist / Math.max(ratedKv, 1);
  if (rel <= 0.12 || bestDist <= 8) return best;
  return ratedKv;
}

export function windingUmFromRatedKv(ratedKv: number): number {
  const snapped = snapRatedKv(ratedKv);
  return RATED_TO_WINDING_UM[snapped] ?? snapped;
}

/**
 * OLTC Um from the tap-winding equipment class + where the switch sits.
 *
 * Y (star / neutral), graded insulation:
 *   110 / 132 / 150 kV class → catalogue 72.5 (LI 350 / PF 140)
 *   220 kV class stays 252 — do not silently pick CV2 / 72.5
 *   35 / 66 kV stay at winding Um (40.5 / 72.5)
 *
 * D / any (line end): winding Um. Do not drop — line-end 132 is 145, not 72.5.
 *
 * Wilson Q30136: 132 kV on the OLTC, star → 72.5.
 * 220 kV star that really wants 72.5: switch to the Um tab and pick 72.5.
 */
export function deriveOltcUm(
  windingUmKv: number,
  connection: SelectInput["connection"],
): number {
  if (connection !== "Y") return windingUmKv;
  if (windingUmKv >= 125.9 && windingUmKv <= 170.1) return 72.5;
  return windingUmKv;
}

export function oltcUmFromRatedKv(
  ratedKv: number,
  connection: SelectInput["connection"],
): number {
  return deriveOltcUm(windingUmFromRatedKv(ratedKv), connection);
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
  const denom = 1 - Math.min(drop, 0.45);
  return ratedA / denom;
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
