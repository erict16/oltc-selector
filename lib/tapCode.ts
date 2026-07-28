import type { ChangeOver, Regulation } from "./types";

const PITCHES = [10, 12, 14, 16, 18] as const;

/**
 * OLTC commercial tap-code (Fig. 3-2 / type designation):
 *   [pitch][max positions][mid][W|G| 0 for linear]
 * Example: 10193W = pitch 10, 19 positions, mid 3, reversing W
 *
 * ═══════════════════════════════════════════════════════════
 *  Core relationship (brochure Fig. 3-3, SHZV / CM2 / CV2):
 *
 *     service positions  P  =  2 × (±N)  +  mid
 *
 *  mid is NOT free decoration — it is part of the connection
 *  diagram. Same P can come from two diagrams:
 *     ±8 mid3 → P=19 → 10193W/G   (commercial default)
 *     ±9 mid1 → P=19 → 10191W/G
 *     ±8 mid1 → P=17 → 18171W     (NOT 10191!)
 *
 *  Pitch is fixed by the brochure row for that (±N, mid) pair.
 * ═══════════════════════════════════════════════════════════
 */

export type TapGeometry = {
  plusMinus: number;
  pitch: number;
  positions: number;
  mid: 0 | 1 | 3;
};

/** Fig. 3-3 reversing (W) rows — complete set */
const W_DIAGRAMS: TapGeometry[] = [
  // mid=1, small pitch ladder
  { plusMinus: 4, pitch: 10, positions: 9, mid: 1 }, // 10091W
  { plusMinus: 5, pitch: 12, positions: 11, mid: 1 }, // 12111W
  { plusMinus: 6, pitch: 14, positions: 13, mid: 1 }, // 14131W
  { plusMinus: 7, pitch: 16, positions: 15, mid: 1 }, // 16151W
  { plusMinus: 8, pitch: 18, positions: 17, mid: 1 }, // 18171W
  // mid=1, large (odd ±N)
  { plusMinus: 9, pitch: 10, positions: 19, mid: 1 }, // 10191W
  { plusMinus: 11, pitch: 12, positions: 23, mid: 1 }, // 12231W
  { plusMinus: 13, pitch: 14, positions: 27, mid: 1 }, // 14271W
  { plusMinus: 15, pitch: 16, positions: 31, mid: 1 }, // 16311W
  { plusMinus: 17, pitch: 18, positions: 35, mid: 1 }, // 18351W
  // mid=3 (even ±N) — most common overseas quotes
  { plusMinus: 8, pitch: 10, positions: 19, mid: 3 }, // 10193W ★
  { plusMinus: 10, pitch: 12, positions: 23, mid: 3 }, // 12233W
  { plusMinus: 12, pitch: 14, positions: 27, mid: 3 }, // 14273W
  { plusMinus: 14, pitch: 16, positions: 31, mid: 3 }, // 16313W
  { plusMinus: 16, pitch: 18, positions: 35, mid: 3 }, // 18353W
];

/**
 * Fig. 3-3 coarse–fine (G) rows.
 * G has no ±4…±7 small ladder and no 18171G (±8 mid1).
 */
const G_DIAGRAMS: TapGeometry[] = [
  { plusMinus: 9, pitch: 10, positions: 19, mid: 1 }, // 10191G
  { plusMinus: 11, pitch: 12, positions: 23, mid: 1 }, // 12231G
  { plusMinus: 13, pitch: 14, positions: 27, mid: 1 }, // 14271G
  { plusMinus: 15, pitch: 16, positions: 31, mid: 1 }, // 16311G
  { plusMinus: 17, pitch: 18, positions: 35, mid: 1 }, // 18351G
  { plusMinus: 8, pitch: 10, positions: 19, mid: 3 }, // 10193G ★
  { plusMinus: 10, pitch: 12, positions: 23, mid: 3 }, // 12233G
  { plusMinus: 12, pitch: 14, positions: 27, mid: 3 }, // 14273G
  { plusMinus: 14, pitch: 16, positions: 31, mid: 3 }, // 16313G
  { plusMinus: 16, pitch: 18, positions: 35, mid: 3 }, // 18353G
];

function diagramsFor(regulation: Regulation): TapGeometry[] {
  if (regulation === "coarse_fine") return G_DIAGRAMS;
  if (regulation === "reversing") return W_DIAGRAMS;
  return [];
}

/** Preferred mid for ±N when user only picks steps (commercial default). */
export function preferredMid(n: number, regulation: Regulation): 1 | 3 {
  const rows = diagramsFor(regulation).filter((d) => d.plusMinus === n);
  if (!rows.length) return n % 2 === 0 ? 3 : 1;
  // Prefer mid=3 commercial rows when both exist (±8 W has mid1 and mid3)
  const mid3 = rows.find((d) => d.mid === 3);
  if (mid3) return 3;
  return rows[0]!.mid === 3 ? 3 : 1;
}

/** Look up brochure geometry for (±N, mid). */
export function lookupDiagram(
  n: number,
  mid: 1 | 3,
  regulation: Regulation,
): TapGeometry | null {
  return (
    diagramsFor(regulation).find(
      (d) => d.plusMinus === n && d.mid === mid,
    ) ?? null
  );
}

/**
 * Pitch from brochure formula when no exact row (should be rare):
 *   mid3: pitch = N + 2
 *   mid1, N≤8: pitch = 2N + 2
 *   mid1, N≥9: pitch = N + 1
 */
export function pitchFor(n: number, mid: 1 | 3): number {
  if (mid === 3) return n + 2;
  if (n <= 8) return 2 * n + 2;
  return n + 1;
}

/** P = 2N + mid — the fundamental relation. */
export function positionsFor(n: number, mid: 1 | 3 | 0): number {
  if (mid === 0) return n; // linear: treat n as position count helper
  return 2 * n + mid;
}

/** Valid mid choices for a given ±N (empty if N not in brochure for that reg). */
export function midOptionsFor(
  n: number,
  regulation: Regulation,
): Array<1 | 3> {
  const mids = diagramsFor(regulation)
    .filter((d) => d.plusMinus === n)
    .map((d) => d.mid as 1 | 3);
  // unique, mid3 first when both (commercial)
  const out: Array<1 | 3> = [];
  if (mids.includes(3)) out.push(3);
  if (mids.includes(1)) out.push(1);
  return out;
}

/** Re-export ± options derived from Fig. 3-3 */
export const PM_STEP_OPTIONS_W = [
  4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
] as const;

export const PM_STEP_OPTIONS_G = [
  8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
] as const;

export const PM_STEP_OPTIONS = PM_STEP_OPTIONS_W;

export function pmStepOptionsFor(regulation: Regulation): readonly number[] {
  if (regulation === "coarse_fine") return PM_STEP_OPTIONS_G;
  if (regulation === "reversing") return PM_STEP_OPTIONS_W;
  return [];
}

/**
 * Default geometry when user only gives ±N (mid = brochure preferred).
 * Kept as PM_TAP_MAP for callers that key by N alone.
 */
export const PM_TAP_MAP: Record<
  number,
  { pitch: number; positions: number; mid: 0 | 1 | 3 }
> = Object.fromEntries(
  PM_STEP_OPTIONS_W.map((n) => {
    const mid = preferredMid(n, "reversing");
    const row = lookupDiagram(n, mid, "reversing")!;
    return [n, { pitch: row.pitch, positions: row.positions, mid: row.mid }];
  }),
);

export function positionsFromPlusMinus(n: number, mid?: 1 | 3): number {
  if (n <= 0) return 0;
  const m = mid ?? preferredMid(n, "reversing");
  const row = lookupDiagram(n, m, "reversing");
  if (row) return row.positions;
  return positionsFor(n, m);
}

export function midFromPlusMinus(n: number): 0 | 1 | 3 {
  return preferredMid(n, "reversing");
}

export function pitchFromPlusMinus(n: number, mid?: 1 | 3): number {
  const m = mid ?? preferredMid(n, "reversing");
  const row = lookupDiagram(n, m, "reversing");
  if (row) return row.pitch;
  return pitchFor(n, m);
}

/**
 * Reverse: positions → preferred ±N.
 * Prefer mid=3 commercial rows when two N share the same position count
 * (e.g. 19 → ±8 / 10193 over ±9 / 10191).
 */
export function plusMinusFromPositions(
  positions: number,
  regulation: Regulation,
): number | null {
  if (regulation === "linear") return null;
  const rows = diagramsFor(regulation).filter((d) => d.positions === positions);
  if (!rows.length) return null;
  const mid3 = rows.find((d) => d.mid === 3);
  return (mid3 ?? rows[0])!.plusMinus;
}

export function defaultPitch(positions: number, regulation: Regulation): number {
  if (regulation === "linear") {
    if (positions <= 10) return 10;
    if (positions <= 12) return 12;
    if (positions <= 14) return 14;
    if (positions <= 16) return 16;
    return 18;
  }
  // Match brochure pitch for standard position counts (mid3 commercial)
  const n = plusMinusFromPositions(positions, regulation);
  if (n != null) {
    const mid = defaultMid(positions, regulation);
    if (mid === 1 || mid === 3) {
      const row = lookupDiagram(n, mid, regulation);
      if (row) return row.pitch;
    }
  }
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
  if (
    positions === 19 ||
    positions === 23 ||
    positions === 27 ||
    positions === 31 ||
    positions === 35
  ) {
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
  // Clamp pitch to catalogue set
  if (!(PITCHES as readonly number[]).includes(pitch as (typeof PITCHES)[number])) {
    pitch = 10;
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

/**
 * Resolve complete tap fields from user inputs.
 *
 * Priority:
 *  1. ±N given → geometry from (±N, mid). mid defaults to brochure preferred.
 *     positions ALWAYS = 2N+mid (never keep a stale position count).
 *  2. Else positions given → mid default from position count, pitch from brochure.
 */
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

  if (reg === "linear") {
    const positions = input.positions ?? 9;
    const pitch = input.pitch ?? defaultPitch(positions, reg);
    const mid: 0 | 1 | 3 = 0;
    return {
      positions,
      pitch,
      mid,
      tapCode: buildTapCode({ pitch, positions, mid, regulation: reg }),
      changeOver: "0",
    };
  }

  if (input.plusMinusSteps != null && input.plusMinusSteps > 0) {
    const n = input.plusMinusSteps;
    const allowed = midOptionsFor(n, reg);
    let mid: 1 | 3;
    if (
      input.midPositions === 1 ||
      input.midPositions === 3
    ) {
      // Honour user mid only when it is a valid brochure pair for this ±N
      mid = allowed.includes(input.midPositions)
        ? input.midPositions
        : preferredMid(n, reg);
    } else {
      mid = preferredMid(n, reg);
    }

    const row = lookupDiagram(n, mid, reg);
    // Fundamental: P = 2N + mid (row confirms pitch; positions always from formula)
    const positions = row?.positions ?? positionsFor(n, mid);
    const pitch = input.pitch ?? row?.pitch ?? pitchFor(n, mid);

    return {
      positions,
      pitch,
      mid,
      tapCode: buildTapCode({ pitch, positions, mid, regulation: reg }),
      changeOver: changeOverOf(reg),
    };
  }

  // Positions-only path (custom)
  let positions = input.positions ?? 19;
  let mid: 0 | 1 | 3 =
    input.midPositions === 1 || input.midPositions === 3
      ? input.midPositions
      : defaultMid(positions, reg);
  // If mid was forced, keep positions as user set (custom bridging)
  const pitch =
    input.pitch ??
    (mid === 1 || mid === 3
      ? (() => {
          const n = plusMinusFromPositions(positions, reg);
          if (n != null) {
            const row = lookupDiagram(n, mid, reg);
            if (row) return row.pitch;
          }
          return defaultPitch(positions, reg);
        })()
      : defaultPitch(positions, reg));

  return {
    positions,
    pitch,
    mid,
    tapCode: buildTapCode({ pitch, positions, mid, regulation: reg }),
    changeOver: changeOverOf(reg),
  };
}

/** Well-known codes for tests / quick picks */
export const COMMON_TAP_CODES = [
  { code: "10070", label: "7 pos linear" },
  { code: "10091W", label: "±4 reversing mid1" },
  { code: "18171W", label: "±8 reversing mid1" },
  { code: "10191W", label: "±9 reversing mid1" },
  { code: "10193W", label: "±8 reversing mid3 (most common)" },
  { code: "12233W", label: "±10 reversing mid3" },
  { code: "14271W", label: "±13 reversing mid1" },
  { code: "14273W", label: "±12 reversing mid3" },
  { code: "18353W", label: "±16 reversing mid3" },
  { code: "10191G", label: "±9 coarse-fine mid1" },
  { code: "10193G", label: "±8 coarse-fine mid3 (most common G)" },
  { code: "12233G", label: "±10 coarse-fine mid3" },
  { code: "18353G", label: "±16 coarse-fine mid3" },
] as const;
