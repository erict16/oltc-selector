import type { ChangeOver, Regulation } from "./types";

const PITCHES = [10, 12, 14, 16, 18] as const;

/**
 * Huaming tap-code (technical data Fig. type designation):
 *   [pitch][max positions][mid][W|G| empty for linear→0]
 * Example: 10193W = pitch 10, 19 positions, mid 3, reversing W
 *          10193G = same geometry, coarse–fine change-over G
 *
 * Brochure Fig. 3-3 (SHZV / CM2) — ±N ↔ service positions (W and G share geometry):
 *   mid=3 family (most common overseas quotes):
 *     ±8→19  ±10→23  ±12→27  ±14→31  ±16→35   → 10193 / 12233 / 14273 / 16313 / 18353
 *   mid=1 family:
 *     ±4→9   ±5→11  ±6→13  ±7→15  ±9→19  ±11→23 … → 10091 / 12111 / … / 10191 / 12231
 *
 * DO NOT use naive “even N → 2N+2” — that maps ±8 to 18 positions and invents
 * non-catalogue 10181W instead of commercial 10193W/G.
 */

/** Standard ±N → pitch / positions / mid from brochure connection diagrams */
export const PM_TAP_MAP: Record<
  number,
  { pitch: number; positions: number; mid: 0 | 1 | 3 }
> = {
  4: { pitch: 10, positions: 9, mid: 1 }, // 10091W
  5: { pitch: 12, positions: 11, mid: 1 }, // 12111W
  6: { pitch: 14, positions: 13, mid: 1 }, // 14131W
  7: { pitch: 16, positions: 15, mid: 1 }, // 16151W
  8: { pitch: 10, positions: 19, mid: 3 }, // 10193W / 10193G  ★
  9: { pitch: 10, positions: 19, mid: 1 }, // 10191W / 10191G
  10: { pitch: 12, positions: 23, mid: 3 }, // 12233W / 12233G
  11: { pitch: 12, positions: 23, mid: 1 }, // 12231W / 12231G
  12: { pitch: 14, positions: 27, mid: 3 }, // 14273W / 14273G
  13: { pitch: 14, positions: 27, mid: 1 }, // 14271W / 14271G
  14: { pitch: 16, positions: 31, mid: 3 }, // 16313W / 16313G
  15: { pitch: 16, positions: 31, mid: 1 }, // 16311W / 16311G
  16: { pitch: 18, positions: 35, mid: 3 }, // 18353W / 18353G
  17: { pitch: 18, positions: 35, mid: 1 }, // 18351W / 18351G
};

/**
 * Reversing (W): full brochure set including small ±4…±7 (10091W…).
 * Coarse–fine (G): Fig. 3-3 G rows start at ±8 / ±9 (10193G / 10191G) through ±17.
 *   Brochure text: max ±9/11/13/15/17 (mid1) and standard mid3 ±8/10/12/14/16.
 *   Do not offer ±4…±7 for G — those diagrams are W-family small pitches.
 */
export const PM_STEP_OPTIONS_W = [
  4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
] as const;

export const PM_STEP_OPTIONS_G = [
  8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
] as const;

/** Union for maps / reverse lookup */
export const PM_STEP_OPTIONS = PM_STEP_OPTIONS_W;

export function pmStepOptionsFor(regulation: Regulation): readonly number[] {
  if (regulation === "coarse_fine") return PM_STEP_OPTIONS_G;
  if (regulation === "reversing") return PM_STEP_OPTIONS_W;
  return [];
}

export function positionsFromPlusMinus(n: number): number {
  if (n <= 0) return 0;
  const row = PM_TAP_MAP[n];
  if (row) return row.positions;
  // Fallback (rare N): odd → 2N+1, even → 2N+3 (mid-3 style, matches ±8→19)
  return n % 2 === 1 ? 2 * n + 1 : 2 * n + 3;
}

export function midFromPlusMinus(n: number): 0 | 1 | 3 {
  return PM_TAP_MAP[n]?.mid ?? (n % 2 === 1 ? 1 : 3);
}

export function pitchFromPlusMinus(n: number): number {
  return PM_TAP_MAP[n]?.pitch ?? defaultPitch(positionsFromPlusMinus(n), "reversing");
}

export function plusMinusFromPositions(
  positions: number,
  regulation: Regulation,
): number | null {
  if (regulation === "linear") return null;
  // Prefer mid=3 commercial rows when two N share the same position count
  // (e.g. 19 → prefer ±8 / 10193 over ±9 / 10191)
  const preferMid3 = [8, 10, 12, 14, 16];
  for (const n of preferMid3) {
    if (PM_TAP_MAP[n]?.positions === positions) return n;
  }
  for (const n of PM_STEP_OPTIONS) {
    if (PM_TAP_MAP[n]?.positions === positions) return n;
  }
  return null;
}

export function defaultPitch(positions: number, regulation: Regulation): number {
  if (regulation === "linear") {
    if (positions <= 10) return 10;
    if (positions <= 12) return 12;
    if (positions <= 14) return 14;
    if (positions <= 16) return 16;
    return 18;
  }
  // Match brochure pitch for standard position counts
  if (positions <= 19) return 10;
  if (positions <= 23) return 12;
  if (positions <= 27) return 14;
  if (positions <= 31) return 16;
  return 18;
}

export function defaultMid(
  positions: number,
  regulation: Regulation,
): 0 | 1 | 3 {
  if (regulation === "linear") return 0;
  // Prefer mid=3 for standard odd position counts (10193, 12233, …)
  if (positions === 19 || positions === 23 || positions === 27 || positions === 31 || positions === 35) {
    return 3;
  }
  if (positions % 2 === 1) return 1;
  return 1;
}

export function changeOverOf(regulation: Regulation): ChangeOver {
  if (regulation === "linear") return "0";
  if (regulation === "reversing") return "W";
  return "G";
}

export function buildTapCode(opts: {
  pitch: number;
  positions: number;
  mid: 0 | 1 | 3;
  regulation: Regulation;
}): string {
  let pitch = opts.pitch;
  if (!(PITCHES as readonly number[]).includes(pitch as (typeof PITCHES)[number])) {
    pitch = defaultPitch(opts.positions, opts.regulation);
  }
  const mid = opts.regulation === "linear" ? 0 : opts.mid;
  const co = changeOverOf(opts.regulation);
  const p = String(pitch).padStart(2, "0");
  const pos = String(opts.positions).padStart(2, "0");
  if (co === "0") {
    return `${p}${pos}${mid === 0 ? "0" : mid}`;
  }
  return `${p}${pos}${mid}${co}`;
}

/** Suggest complete tap fields from user-ish inputs */
export function resolveTapFields(input: {
  regulation: Regulation;
  positions?: number;
  plusMinusSteps?: number;
  pitch?: number;
  midPositions?: 0 | 1 | 3;
}): {
  positions: number;
  pitch: number;
  mid: 0 | 1 | 3;
  tapCode: string;
  changeOver: ChangeOver;
} {
  const reg = input.regulation;
  let positions = input.positions;
  let mid: 0 | 1 | 3 | undefined = input.midPositions;
  let pitch = input.pitch;

  if (positions == null && input.plusMinusSteps != null) {
    const n = input.plusMinusSteps;
    const row = PM_TAP_MAP[n];
    if (row) {
      positions = row.positions;
      mid = mid ?? row.mid;
      pitch = pitch ?? row.pitch;
    } else {
      positions = positionsFromPlusMinus(n);
    }
  }
  if (positions == null) {
    positions = reg === "linear" ? 9 : 19;
  }

  // If user gave ±N, prefer brochure mid/pitch even when positions was also set
  if (input.plusMinusSteps != null && PM_TAP_MAP[input.plusMinusSteps]) {
    const row = PM_TAP_MAP[input.plusMinusSteps];
    mid = input.midPositions ?? row.mid;
    pitch = input.pitch ?? row.pitch;
    // Keep brochure positions for that ±N (authoritative)
    positions = row.positions;
  }

  const finalPitch = pitch ?? defaultPitch(positions, reg);
  const finalMid = mid ?? defaultMid(positions, reg);
  const tapCode = buildTapCode({
    pitch: finalPitch,
    positions,
    mid: finalMid,
    regulation: reg,
  });
  return {
    positions,
    pitch: finalPitch,
    mid: finalMid,
    tapCode,
    changeOver: changeOverOf(reg),
  };
}

/** Well-known codes for tests / quick picks */
export const COMMON_TAP_CODES = [
  { code: "10070", label: "7 pos linear" },
  { code: "10091W", label: "±4 reversing mid1" },
  { code: "10191W", label: "±9 reversing mid1" },
  { code: "10193W", label: "±8 reversing mid3 (most common)" },
  { code: "12233W", label: "±10 reversing mid3" },
  { code: "14273W", label: "±12 reversing mid3" },
  { code: "18353W", label: "±16 reversing mid3" },
  { code: "10191G", label: "±9 coarse-fine mid1" },
  { code: "10193G", label: "±8 coarse-fine mid3 (most common G)" },
  { code: "12233G", label: "±10 coarse-fine mid3" },
  { code: "18353G", label: "±16 coarse-fine mid3" },
] as const;
