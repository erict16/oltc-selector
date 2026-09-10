import type { SelectInput } from "./types";

/**
 * Transformer / tap-winding *rated* kV (调压侧), not OLTC Um.
 * 66 → winding class 72.5, 132 → 145, 220 → 252.
 */
export const WINDING_RATED_KV = [35, 66, 110, 132, 150, 220, 330] as const;

export const RATED_TO_WINDING_UM: Record<number, number> = {
  35: 40.5,
  66: 72.5,
  110: 126,
  132: 145,
  150: 170,
  220: 252,
  330: 363,
};

export function windingUmFromRatedKv(ratedKv: number): number {
  return RATED_TO_WINDING_UM[ratedKv] ?? ratedKv;
}

/**
 * OLTC Um from transformer winding Um.
 *
 * Star-point (Y): 132 kV class and above (winding Um ≥ 145) uses graded
 * insulation at the neutral → catalogue 72.5. 66 / 110 kV (≤126) stay.
 * Line-end / delta (D, any) keep the winding Um.
 *
 * Zhou / Wilson Q30136: 132 kV HV, OLTC at star → fill 132, switch 72.5.
 */
export function deriveOltcUm(
  windingUmKv: number,
  connection: SelectInput["connection"],
): number {
  if (connection === "Y" && windingUmKv >= 145) return 72.5;
  return windingUmKv;
}

export function oltcUmFromRatedKv(
  ratedKv: number,
  connection: SelectInput["connection"],
): number {
  return deriveOltcUm(windingUmFromRatedKv(ratedKv), connection);
}
