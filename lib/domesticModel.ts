/**
 * Chinese screen only. The engine, the CLI, and replay stay on the export code.
 * Brochure prefixes: CV2→VCV, CM2→VCM, SHZVG→CHVT (the 1300 A class).
 * SHZV Chinese books still print SHZV. Do not rename that prefix to CHVT.
 */
const ZH_FAMILY: ReadonlyArray<readonly [string, string]> = [
  ["SHZVG", "CHVT"],
  ["CV2", "VCV"],
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
