/**
 * Sold tap codes the OS replays must not read as plain ±N or linear counts
 * (2026-11-04 r2 ORDERS-2). Shared by scripts/replay-2026-os.ts and
 * scripts/nameplateReplay.ts.
 */
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
