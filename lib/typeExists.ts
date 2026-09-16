import { iiiTypeAllowsConnection, SERIES } from "./catalog";
import { listRowExists, resolveOctcListKey } from "./listIndex";
import { parseTypeString } from "./parseType";
import type { PhaseCode, SeriesDef } from "./types";

const STAR_ONLY_III = new Set(["cm", "cm2", "cmd", "shzv", "shzvg"]);
const II_OMITS_CONNECTION = new Set(["cm", "cm2", "cmd"]);
const COMPOUND_NO_GRADE = new Set(["cv", "cv2", "sv", "cvt", "cz"]);

/** Families whose brochure III type includes D. */
export const III_D_FAMILIES = ["cv", "cv2", "sv", "cvt", "hwv"] as const;

/**
 * Brochure / 2025-list existence for a commercial type string.
 * Price-list Y/D twins are NOT proof a III-D type exists.
 * OCTC uses the 2025 list as the row oracle.
 */
export function commercialTypeExists(
  model: string,
  series?: SeriesDef,
): boolean {
  const parsed = parseTypeString(model);
  if (!parsed) return false;
  const s =
    series ??
    SERIES.find((row) => row.code === parsed.family);
  if (!s) return false;
  if (s.code !== parsed.family) return false;

  if (s.dutyKind === "octc") {
    // WSG has no 2025-list sheet — catalogue axes only.
    if (s.id === "wsg") {
      const i = s.currents.III?.includes(parsed.currentA) ||
        s.currents.II?.includes(parsed.currentA) ||
        s.currents.I?.includes(parsed.currentA);
      return Boolean(
        i && s.umKv.some((u) => Math.abs(u - parsed.umKv) < 0.05),
      );
    }
    return listRowExists(model);
  }

  const phase = parsed.phases as PhaseCode;
  const allowedI = s.currents[phase];
  if (!allowedI?.includes(parsed.currentA)) return false;
  if (!s.umKv.some((u) => Math.abs(u - parsed.umKv) < 0.05)) return false;

  if (COMPOUND_NO_GRADE.has(s.id) && parsed.selectorSize) return false;
  if (s.id === "cv2" && parsed.currentA === 500) return false;
  if (s.id === "hwv" && parsed.selectorSize) return false;

  if (phase === "III") {
    const conn = (parsed.connection || "Y") as "Y" | "D" | "any";
    if (!iiiTypeAllowsConnection(s, "III", conn === "D" ? "D" : "Y")) {
      return false;
    }
  }
  if (phase === "I" && parsed.connection) return false;
  if (phase === "II") {
    if (STAR_ONLY_III.has(s.id) && parsed.connection === "D") return false;
    if (II_OMITS_CONNECTION.has(s.id) && parsed.connection) return false;
  }
  return true;
}

export function phaseConnectionLegal(
  s: SeriesDef,
  phases: PhaseCode,
  conn: "Y" | "D" | "any",
): boolean {
  if (s.dutyKind === "octc") return true;
  if (phases === "III") return iiiTypeAllowsConnection(s, "III", conn);
  if (phases === "II" && STAR_ONLY_III.has(s.id) && conn === "D") return false;
  return true;
}

/**
 * First 2025-list spelling of an OCTC model, or null.
 * Tries locked size → auto sizes, then the Y/D-stripped twin (WSLVIII omits Y/D).
 */
export function resolveOctcListModel(model: string): string | null {
  return resolveOctcListKey(model);
}

export function connectionLetterOnPhase(
  s: SeriesDef,
  phases: PhaseCode,
  connection: "Y" | "D" | "any",
): "Y" | "D" | "any" {
  if (s.dutyKind === "octc") return connection === "D" ? "D" : "Y";
  if (phases === "I") return "any";
  if (phases === "II" && II_OMITS_CONNECTION.has(s.id)) return "any";
  if (phases === "II" && STAR_ONLY_III.has(s.id) && connection === "D") {
    return "any";
  }
  if (
    phases === "III" &&
    !iiiTypeAllowsConnection(s, "III", connection)
  ) {
    return "any";
  }
  return connection;
}
