/**
 * 2026-11-04 audit round 3, web track (UI-6 … UI-11): reading a new tender
 * line or switching mode leaves no value from the previous line or mode in
 * force, and the card never shows a stale type next to an error.
 * Every repro in .audit/r3-findings.json is one test here.
 */
import { describe, expect, it } from "vitest";
import { cliToSelectInput, parseCliArgs } from "./cli";
import { selectOltc } from "./engine";
import {
  INITIAL_FORM,
  formSelectInput,
  geometryForPm,
  pickPm,
  readLine,
  toOctc,
  toOltc,
  type FormState,
} from "./formState";
import { t, type Lang } from "./i18n";
import { localizeNote } from "./noteI18n";
import { deriveDuty, type TransformerSpec } from "./transformer";

type Pick1 = { model: string | null; I: number | null; err?: string };

function cli(argv: string[]): Pick1 {
  try {
    const inp = cliToSelectInput(parseCliArgs([...argv, "--no-update-check"]));
    const out = selectOltc(inp);
    return { model: out.ok ? (out.results[0]?.model ?? null) : null, I: inp.throughCurrentA };
  } catch (e) {
    return { model: null, I: null, err: (e as Error).message };
  }
}

function web(f: FormState): Pick1 {
  const r = formSelectInput(f);
  if (!r.ok) return { model: null, I: null, err: "msgKey" in r ? r.msgKey : r.duty.errorEn };
  const out = selectOltc(r.input);
  return { model: out.ok ? (out.results[0]?.model ?? null) : null, I: r.input.throughCurrentA };
}

const T01 = "10 MVA, 33/11.5 kV, Dyn11, ±8x1.25% coarse/fine, tappings on HV delta; HV LI170/AC70";
const Q14 = "20 MVA, 23±8x1.25%/10.5 kV, YNd11; oil CM quoted";
const Q07 = "150 MVA, 132/33 kV, YNd11, ±8x1.25%";
const Q08 = "130 MVA, 132 kV, +15%/-10%, 11 positions (2.5% steps), linear";
const A11 = "63 MVA, 115 kV, YNd11yn12, ±9x1.78%, I 316.3 / Imax 376.54 A, Ust 1181.83 V";
const T06 =
  "220 MVA, 132/11 kV, ±9x1.25%, regulation at the end of the delta winding; across tap AC80/LI320; Imax 626.01 A";
const A07 = "80 MVA, 220 kV";
const B07 = "10 MVA, 20 kV, ±25% ±10 positions, I 166.67 A (= delta phase current) / Imax 222.22 A, Ust 500 V; oil CV bought";

const expectSame = (w: Pick1, c: Pick1) => {
  expect(w.model).toBe(c.model);
  expect(w.I).toBeCloseTo(c.I!, 6);
};

describe("UI-6: 自定义 in ± 级数 keeps the step %", () => {
  it("B07 2.5 %: stays 384.9 A on CV2III-600Y (was 329.9 A on a 350 A switch)", () => {
    const f = readLine(INITIAL_FORM, B07);
    expect(f.stepPercentPct).toBe(2.5);
    const before = web(f);
    expect(before.model).toBe("CV2III-600Y/40.5-12233W");
    const g = pickPm(f, "");
    expect(g.pm).toBe("");
    expect(g.stepPercentPct).toBe(2.5);
    expect(g.tapRange?.stepPercent).toBeCloseTo(0.025, 9);
    const after = web(g);
    expect(after.I).toBeCloseTo(384.9, 1);
    expect(after.model).toBe("CV2III-600Y/40.5-12233W");
    expectSame(after, cli(["--line", B07]));
  });

  it("A11 1.78 %: the duty does not change on 自定义", () => {
    const f = readLine(INITIAL_FORM, A11);
    const g = pickPm(f, "");
    expect(g.stepPercentPct).toBe(f.stepPercentPct);
    expect(web(g)).toEqual(web(f));
  });

  it("an empty step falls back to 1.25 %, not a null step", () => {
    const g = pickPm({ ...INITIAL_FORM, stepPercentPct: 0 }, "");
    expect(g.stepPercentPct).toBe(1.25);
    expect(g.tapRange?.stepPercent).toBeCloseTo(0.0125, 9);
  });

  it("a ±N pick snaps to the brochure mid and drops the live range", () => {
    const g = pickPm(pickPm(INITIAL_FORM, ""), "8");
    expect(g.pm).toBe("8");
    expect(g.tapRange).toBeNull();
    expect(g.input.positions).toBe(19);
    expect(g.input.midPositions).toBe(3);
  });
});

describe("UI-7: the previous line's G / linear does not stay in force", () => {
  it("T01 (G) then Q14: 10193W, as fresh and the CLI", () => {
    const f = readLine(INITIAL_FORM, T01);
    expect(f.input.regulation).toBe("coarse_fine");
    const g = readLine(f, Q14);
    const c = cli(["--line", Q14]);
    expect(c.model).toBe("CV2III-600Y/40.5-10193W");
    expectSame(web(g), c);
    expect(web(g)).toEqual(web(readLine(INITIAL_FORM, Q14)));
  });

  it("T01 (G) then Q07: SHZVIII-1000Y/72.5B-10193W, as the CLI", () => {
    const g = readLine(readLine(INITIAL_FORM, T01), Q07);
    const c = cli(["--line", Q07]);
    expect(c.model).toBe("SHZVIII-1000Y/72.5B-10193W");
    expectSame(web(g), c);
  });

  it("Q08 (linear) → 无载 → A11 → 有载: CV2III-600Y/72.5-10191W, as the CLI", () => {
    let f = readLine(INITIAL_FORM, Q08);
    expect(f.input.regulation).toBe("linear");
    f = toOltc(readLine(toOctc(f), A11));
    expect(f.input.regulation).toBe("reversing");
    const c = cli(["--line", A11]);
    expect(c.model).toBe("CV2III-600Y/72.5-10191W");
    expectSame(web(f), c);
  });

  it("a G picked before any line, then 无载 and a read, comes back on 有载", () => {
    const g: FormState = {
      ...INITIAL_FORM,
      input: { ...INITIAL_FORM.input, regulation: "coarse_fine", ...geometryForPm(8, "coarse_fine") },
    };
    const f = toOltc(readLine(toOctc(g), Q07));
    expect(f.input.regulation).toBe("coarse_fine");
  });
});

describe("UI-8: across-tap LI/AC belong to one transformer", () => {
  const withAcross = (f: FormState): FormState => ({
    ...f,
    input: { ...f.input, acrossTapBilKv: 320, acrossTapPfKv: 80 },
  });

  it("T06 + 320/80 matches the CLI with --across-li/--across-ac", () => {
    const f = withAcross(readLine(INITIAL_FORM, T06));
    expectSame(web(f), cli(["--line", T06, "--across-li", "320", "--across-ac", "80"]));
  });

  it.each([
    [Q07, "SHZVIII-1000Y/72.5B-10193W"],
    [A07, "CM2III-500Y/72.5B-10193W"],
  ])("then %s: cleared, grade B as the CLI", (line, model) => {
    const g = readLine(withAcross(readLine(INITIAL_FORM, T06)), line);
    expect(g.input.acrossTapBilKv).toBeUndefined();
    expect(g.input.acrossTapPfKv).toBeUndefined();
    const c = cli(["--line", line]);
    expect(c.model).toBe(model);
    expectSame(web(g), c);
  });

  it("无载 moving the tap to another winding clears them too", () => {
    const line = "40MVA 115±8x1.25%/38.5±2x2.5%/11kV YNyn0d11";
    const f = toOctc(withAcross(readLine(INITIAL_FORM, line)));
    expect(f.windingRatedKv).toBe(38.5);
    expect(f.input.acrossTapBilKv).toBeUndefined();
    expect(f.input.acrossTapPfKv).toBeUndefined();
  });
});

describe("UI-9: a line that cannot be read shows no type", () => {
  it.each(["transformer for substation 3", "50 MVA", "132 kV"])(
    "Q07 then '%s': needMva, MVA box empty",
    (bad) => {
      const ok = readLine(INITIAL_FORM, Q07);
      expect(web(ok).model).toBe("SHZVIII-1000Y/72.5B-10193W");
      const f = readLine({ ...ok, osImaxA: 800, osUstV: 3000 }, bad);
      expect(f.lineFailed).toBe("lineFail");
      expect(f.lineRead).toBeNull();
      expect(f.transformerMva).toBe(0);
      expect(f.mvaCustom).toBe(true);
      expect(f.osImaxA).toBe(0);
      expect(f.osUstV).toBe(0);
      expect(web(f)).toEqual({ model: null, I: null, err: "needMva" });
    },
  );

  it("in current entry it goes back to capacity, so no typed-current type stays", () => {
    const f0: FormState = { ...INITIAL_FORM, currentMode: "current", voltageMode: "equipment", windingRatedKv: 0 };
    const f = readLine(f0, "transformer for substation 3");
    expect(f.currentMode).toBe("capacity");
    expect(f.voltageMode).toBe("winding");
    expect(f.windingRatedKv).toBeGreaterThan(0);
    expect(web(f).err).toBe("needMva");
  });

  it("the next good line reads as fresh", () => {
    const f = readLine(readLine(readLine(INITIAL_FORM, T01), "transformer for substation 3"), Q14);
    expect(f.lineFailed).toBe(false);
    expectSame(web(f), cli(["--line", Q14]));
  });
});

describe("UI-10: 'Not stated, check' names the field to check", () => {
  const LANGS: Lang[] = ["zh", "en", "vi", "es", "tr", "id"];
  const same = (lang: Lang, a: string, b: string) =>
    expect(t(lang, a).toLocaleLowerCase(lang)).toBe(t(lang, b).toLocaleLowerCase(lang));

  it.each(LANGS)("%s: tap_winding = Tap voltage, winding = Tapped winding, mva = Capacity", (lang) => {
    same(lang, "lineF_tap_winding", "umWinding");
    same(lang, "lineF_winding", "winding");
    same(lang, "lineF_mva", "transformerMva");
  });
});

describe("UI-11: an assumed auto-junction Um is said on the card", () => {
  const auto = (hv: number, mv: number, over: Partial<TransformerSpec> = {}): TransformerSpec => ({
    kind: "auto",
    tapPoint: "auto_junction",
    winding: "star",
    mva: 100,
    tapKv: 0,
    hvKv: hv,
    mvKv: mv,
    minusSteps: 8,
    stepFraction: 0.0125,
    safetyK: 1,
    ...over,
  });

  it.each([
    [132, 33, 145],
    [110, 35, 126],
    [66, 22, 72.5],
    [150, 66, 170],
  ])("%s/%s kV: Um %s assumed, with a caution in every language", (hv, mv, um) => {
    const d = deriveDuty(auto(hv, mv));
    expect(d.ok).toBe(true);
    expect(d.umKv).toBe(um);
    expect(d.umAssumed).toBe(true);
    const en = `Autotransformer junction sized at the HV class, Um ${um} kV; the order specification (OS) decides.`;
    expect(d.cautionsEn).toContain(en);
    expect(d.cautionsZh).toContain(`开关对地绝缘暂按 ${um} kV 选，订货前请按订货规范确认。`);
    for (const lang of ["vi", "es", "tr", "id"] as const) {
      const out = localizeNote(en, lang);
      expect(out).not.toBe(en);
      expect(out).toContain(`Um ${um} kV`);
    }
  });

  it("the 252 junction says its Um is assumed too; a stated Um has no such note", () => {
    const note = /^Autotransformer junction sized at the HV class/;
    // 2026-11-13: 252 used to carry a reference type of another family instead.
    expect(deriveDuty(auto(225, 115)).cautionsEn.some((c) => note.test(c))).toBe(true);
    const stated = deriveDuty(auto(132, 33, { earthUmKv: 145 }));
    expect(stated.umAssumed).toBe(false);
    expect(stated.cautionsEn.some((c) => note.test(c))).toBe(false);
  });
});

describe("r3 check: a failed read in between", () => {
  it("the next good line does not keep the previous line's coarse/fine", () => {
    let f = readLine(INITIAL_FORM, "10 MVA, 33/11.5 kV, Dyn11, ±8x1.25% coarse/fine");
    expect(f.input.regulation).toBe("coarse_fine");
    f = readLine({ ...f, lineFailed: false }, "transformer for substation 3");
    f = readLine({ ...f, lineFailed: false }, "25 MVA 110±8x1.25%/10.5 kV YNd11");
    expect(f.input.regulation).toBe("reversing");
  });
});
