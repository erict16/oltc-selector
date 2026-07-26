import type { ChangeOver, Regulation } from "./types";

const PITCHES = [10, 12, 14, 16, 18] as const;

/**
 * Huaming tap-code rules (technical data Fig. type designation):
 *   [pitch][max positions][mid][W|G| empty for linear→0]
 * Example: 10193W = pitch 10, 19 positions, mid 3, reversing W
 *
 * Relationship (HOW TO SELECT note):
 *   odd  ±N steps → positions = 2N + 1
 *   even ±N steps → positions = 2N + 2
 */
export function positionsFromPlusMinus(n: number): number {
  if (n <= 0) return 0;
  return n % 2 === 1 ? 2 * n + 1 : 2 * n + 2;
}

export function plusMinusFromPositions(positions: number, regulation: Regulation): number | null {
  if (regulation === "linear") return null;
  // try odd N first (2N+1), then even (2N+2)
  for (let n = 1; n <= 20; n++) {
    if (positionsFromPlusMinus(n) === positions) return n;
  }
  return null;
}

export function defaultPitch(positions: number, regulation: Regulation): number {
  if (regulation === "linear") {
    // linear: pitch ≈ positions (contact circle)
    if (positions <= 10) return 10;
    if (positions <= 12) return 12;
    if (positions <= 14) return 14;
    if (positions <= 16) return 16;
    return 18;
  }
  // with change-over, pitch is number of fine taps contacts ≈ ceil(positions/2) style
  // Common Huaming: 19 pos → pitch 10; 27 pos → 14; 35 pos → 18
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
  // Most overseas quotes use mid=3 for 19-pos reversing (10193W); mid=1 also common (10191W)
  // Prefer 3 when positions odd (symmetric around mid) — Huaming 10193W is very common
  if (positions % 2 === 1) return 3;
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
  if (!(PITCHES as readonly number[]).includes(pitch)) {
    pitch = defaultPitch(opts.positions, opts.regulation);
  }
  const mid = opts.regulation === "linear" ? 0 : opts.mid;
  const co = changeOverOf(opts.regulation);
  // Format: pitch (2) + positions (2) + mid (1) + suffix
  const p = String(pitch).padStart(2, "0");
  // positions can be 7-35 — use 2 digits when <100
  const pos = String(opts.positions);
  if (co === "0") {
    // linear: …0  e.g. 10070, 18180 — mid shown as 0
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
  if (positions == null && input.plusMinusSteps != null) {
    positions = positionsFromPlusMinus(input.plusMinusSteps);
  }
  if (positions == null) {
    // defaults: reversing ±8 → 19 pos; linear 9
    positions = reg === "linear" ? 9 : 19;
  }

  const pitch = input.pitch ?? defaultPitch(positions, reg);
  const mid = input.midPositions ?? defaultMid(positions, reg);
  const tapCode = buildTapCode({ pitch, positions, mid, regulation: reg });
  return {
    positions,
    pitch,
    mid,
    tapCode,
    changeOver: changeOverOf(reg),
  };
}

/** Well-known codes for tests / quick picks */
export const COMMON_TAP_CODES = [
  { code: "10070", label: "7 pos linear" },
  { code: "10091W", label: "±4 rev (9/10 pos family)" },
  { code: "10191W", label: "19 pos reversing mid1" },
  { code: "10193W", label: "19 pos reversing mid3 (most common)" },
  { code: "12231W", label: "23 pos reversing" },
  { code: "14273W", label: "27 pos reversing" },
  { code: "18353W", label: "35 pos reversing" },
  { code: "10193G", label: "19 pos coarse-fine" },
  { code: "18353G", label: "35 pos coarse-fine" },
] as const;
