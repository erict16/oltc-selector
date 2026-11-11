/**
 * Chinese screen only. The engine, the CLI, and replay stay on the export code.
 * Brochure prefixes: CV2→VCV-G, CM2→VCM, SHZVG→CHVT (the 1300 A class).
 * SHZV Chinese books still print SHZV. Do not rename that prefix to CHVT.
 */
const ZH_FAMILY: ReadonlyArray<readonly [string, string]> = [
  ["SHZVG", "CHVT"],
  ["CV2", "VCV-G"],
  ["CM2", "VCM"],
];

const LEAD =
  /^(?:(\d+)([x×]))?([A-Z][A-Z0-9]*?)(III|II|I)(?=\d|\/|-)/;

/** Swap the family prefix on the shown string. Other languages return it unchanged. */
export function displayModel(model: string, lang: string): string {
  if (lang !== "zh") return model;
  const m = LEAD.exec(model);
  if (!m) return model;
  const hit = ZH_FAMILY.find(([from]) => from === m[3]);
  if (!hit) return model;
  const count = (m[1] ?? "") + (m[2] ?? "");
  return count + hit[1] + m[4] + model.slice(m[0].length);
}

const NOTE_FAMILY = /(?<![A-Za-z0-9])(SHZVG|CV2|CM2)(?=(?:III|II|I)?(?![A-Za-z0-9]))/g;

/**
 * A note on the Chinese screen names families as the type above it does
 * (2026-11-11: the card read VCV-G while its notes said CV2).
 */
export function displayNote(text: string, lang: string): string {
  if (lang !== "zh") return text;
  return text.replace(NOTE_FAMILY, (code) => ZH_FAMILY.find(([from]) => from === code)?.[1] ?? code);
}
