import { describe, expect, it } from "vitest";
import { selectOltc } from "./engine";
import { localizeNote } from "./noteI18n";
import { deriveDuty, type TransformerSpec } from "./transformer";
import type { SelectInput } from "./types";

const LANGS = ["vi", "es", "tr", "id"] as const;

/** Every English note the engine and duty code can show on the result card. */
function collectNotes(): Set<string> {
  const notes = new Set<string>();
  const base: SelectInput = {
    mounting: "in_tank",
    medium: "oil_vacuum",
    preferVacuum: true,
    phases: "III",
    connection: "Y",
    throughCurrentA: 300,
    umKv: 72.5,
    stepVoltageV: 800,
    regulation: "reversing",
    plusMinusSteps: 8,
    midPositions: 3,
    selectorSize: "auto",
    preferStructure: "auto",
    mdu: "none",
  };
  const cases: Partial<SelectInput>[] = [
    {},
    { throughCurrentA: 354 },
    { stepVoltageV: 0 },
    { plusMinusSteps: 11, midPositions: 1 },
    { umKv: 126, acrossTapBilKv: 400 },
    { selectorSize: "A", umKv: 170 },
    { throughCurrentA: 0 },
    { umKv: 0 },
    { stepVoltageV: Number.NaN },
    { bilKv: 2000, pfKv: 900 },
    { transformerKind: "auto", preferStructure: "compound" },
    { throughCurrentA: 99999 },
    { mounting: "dry_type", medium: "oil", preferVacuum: false },
  ];
  for (const c of cases) {
    const out = selectOltc({ ...base, ...c });
    out.errorsEn.forEach((e) => notes.add(e));
    for (const r of out.results) r.cautionsEn.forEach((e) => notes.add(e));
  }
  const spec = (o: Partial<TransformerSpec>): TransformerSpec => ({
    kind: "two_winding",
    tapPoint: "neutral",
    winding: "star",
    mva: 25,
    tapKv: 110,
    hvKv: 0,
    mvKv: 0,
    minusSteps: 8,
    stepFraction: 0.0125,
    safetyK: 1,
    ...o,
  });
  const specs = [
    spec({ tapKv: 220 }),
    spec({ tapKv: 35 }),
    spec({ kind: "auto", tapPoint: "auto_junction", hvKv: 225, mvKv: 115 }),
    spec({ kind: "auto", tapPoint: "auto_mv_line", hvKv: 230, mvKv: 121 }),
    spec({ kind: "auto", tapPoint: "neutral", hvKv: 225, mvKv: 115 }),
    spec({ kind: "auto", tapPoint: "auto_junction", hvKv: 0, mvKv: 0 }),
    spec({ kind: "auto", tapPoint: "auto_junction", hvKv: 110, mvKv: 220 }),
    spec({ tapKv: 0 }),
    spec({ winding: "delta" }),
    spec({ tapPoint: "line_end", tapKv: 500 }),
  ];
  for (const s of specs) {
    const d = deriveDuty(s);
    d.cautionsEn.forEach((e) => notes.add(e));
    if (d.errorEn) notes.add(d.errorEn);
  }
  return notes;
}

describe("note translations", () => {
  const notes = [...collectNotes()];

  it("collects a meaningful sample", () => {
    expect(notes.length).toBeGreaterThan(15);
  });

  it.each(LANGS)("every note has a %s translation", (lang) => {
    const missing = notes.filter((n) => localizeNote(n, lang) === n);
    expect(missing).toEqual([]);
  });

  it("keeps numbers and type strings", () => {
    const n = "Duty 354.0 A is 1.1% above the 350 A rating (1% commercial tolerance). Confirm with engineering.";
    for (const lang of LANGS) {
      const out = localizeNote(n, lang);
      expect(out).toContain("354.0");
      expect(out).toContain("350");
      expect(out).toContain("1.1");
    }
  });
});
