/**
 * Sold tap codes the OS replays must not read as plain ±N or linear counts
 * (2026-11-04 r2 ORDERS-2). Shared by scripts/replay-2026-os.ts and
 * scripts/nameplateReplay.ts.
 */
import { maxThroughCurrent } from "../lib/deriveUm";
import type { SelectInput } from "../lib/types";

/** Short codes that are real: CVT / CZ / HWDK write the contact count. */
const SHORT_FAMILIES = new Set(["CVT", "CZ", "HWDK"]);

/**
 * "tap code truncated" when the OS code lost digits: 1-2 digits outside
 * CVT/CZ/HWDK ('1' became 10010), or a 5-digit code with mid 1/3 and no
 * W/G ('12231', '10191' went in as 23 and 19 linear positions).
 */
export function truncatedTapCode(tapNorm: string, family: string): boolean {
  const t = tapNorm.replace(/\s+/g, "").toUpperCase();
  if (/^\d{1,2}$/.test(t) && !SHORT_FAMILIES.has(family.toUpperCase())) return true;
  return /^\d{4}[13]$/.test(t);
}

/**
 * 10181G / 10183W: positions minus mid is odd, so there is no ±N row. Feed
 * positions + mid + pitch as the CLI --range does (geometryForRange), not
 * Math.round((18 − 1) / 2) = ±9 (10191G).
 */
export function unevenTapGeometry(
  tapNorm: string,
): Pick<SelectInput, "positions" | "midPositions" | "pitch"> | null {
  const m = tapNorm.replace(/\s+/g, "").toUpperCase().match(/^(\d{2})(\d{2})([13])[WG]$/);
  if (!m) return null;
  const positions = Number(m[2]);
  const mid = Number(m[3]) as 1 | 3;
  if ((positions - mid) % 2 === 0) return null;
  return { positions, midPositions: mid, pitch: Number(m[1]) as SelectInput["pitch"] };
}

/**
 * 2026-11-04 r3 ORDERS-10: the OS step as a fraction of the winding voltage,
 * read by the OS letter (Y: kV/√3, D: kV). Null when that Ust belongs to
 * another winding: the minus range would come out above 45% (E-CM2250007:
 * 924 V on a 22.4 kV star reads −93%).
 */
export function osStepFraction(
  kv: number | null,
  conn: "Y" | "D",
  ustV: number | null,
  minusSteps: number | null,
): number | null {
  if (!(kv != null && kv > 0) || !(ustV != null && ustV > 0) || !(minusSteps != null && minusSteps > 0)) {
    return null;
  }
  const s = ustV / (conn === "D" ? kv * 1000 : (kv * 1000) / Math.sqrt(3));
  return minusSteps * s <= 0.45 ? s : null;
}

/**
 * 2026-11-04 r3 ORDERS-10: the app sizes on the lowest-tap current from the
 * nameplate (deriveDuty); the replays used the OS rated current when the OS
 * gave no Imax. The OS current is a floor and is never raised itself: some OS
 * rows already write the lowest-tap figure (E-CM2250045: 176 A = 154 A rated
 * at −12.5%). An OS current that does not fit the rating (a delta's line
 * current, a kV from the other side) keeps the OS figure.
 */
export function osLowestTapCurrent(o: {
  iOs: number;
  mva: number | null;
  kv: number | null;
  conn: "Y" | "D";
  minusSteps: number | null;
  ustV: number | null;
}): number {
  const s = osStepFraction(o.kv, o.conn, o.ustV, o.minusSteps);
  if (s == null || !(o.mva != null && o.mva > 0)) return o.iOs;
  const ratedA = (o.mva * 1000) / ((o.conn === "D" ? 3 : Math.sqrt(3)) * o.kv!);
  const ratio = o.iOs / ratedA;
  if (ratio < 0.85 || ratio > 1.4) return o.iOs;
  const full = maxThroughCurrent(ratedA, o.minusSteps!, s);
  return Number.isFinite(full) ? Math.max(o.iOs, full) : o.iOs;
}

/**
 * 2026-11-04 r3 ORDERS-11: the --market a user would type for this buyer.
 * Only Turkey changes the engine (72.5C on 110 kV-class neutrals).
 */
export function osMarket(customer: string | undefined): string | undefined {
  return /土耳其|\bHMT\b/i.test(customer ?? "") ? "TR" : undefined;
}
