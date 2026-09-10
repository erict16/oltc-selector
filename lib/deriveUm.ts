import type { SelectInput } from "./types";

/**
 * OLTC Um from transformer / tap-winding Um.
 *
 * Star-point (Y): 132 kV class and above (winding Um ≥ 145) uses graded
 * insulation at the neutral → catalogue 72.5. 66 / 110 kV (≤126) stay as
 * filled. Line-end / delta (D, any) keep the winding Um.
 *
 * Wilson Q30136: 132 kV HV, OLTC at star, winding 145 → switch 72.5.
 */
export function deriveOltcUm(
  windingUmKv: number,
  connection: SelectInput["connection"],
): number {
  if (connection === "Y" && windingUmKv >= 145) return 72.5;
  return windingUmKv;
}
