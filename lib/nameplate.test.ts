import { describe, expect, it } from "vitest";
import {
  defaultRegulationForRange,
  geometryForRange,
  lineMinusSteps,
  lineNoteEn,
  parseTenderLine,
  parseVectorGroup,
  splitPercentRange,
  tenderLineSettings,
  type LineNoteKey,
} from "./nameplate";
import { resolveTapFields } from "./tapCode";
import { TRANSFORMER_STRINGS } from "./i18nTransformer";
import { deriveDuty } from "./transformer";
import { selectOltc } from "./engine";
import type { SelectInput } from "./types";

/** Tender line → deriveDuty → engine, as the page does with defaults. */
function typeFor(line: string): string | null {
  const t = parseTenderLine(line)!;
  const d = deriveDuty({
    kind: t.kind,
    tapPoint: t.tapPoint,
    winding: t.winding,
    mva: t.mva ?? 0,
    tapKv: t.tapKv ?? 0,
    hvKv: t.hvKv ?? 0,
    mvKv: t.mvKv ?? 0,
    minusSteps: t.minus ?? 8,
    stepFraction: (t.stepPct ?? 1.25) / 100,
    safetyK: 1,
  });
  if (!d.ok) return null;
  const input: SelectInput = {
    mounting: "in_tank",
    medium: "oil_vacuum",
    preferVacuum: true,
    dutyKind: "oltc",
    phases: "III",
    connection: d.connection,
    transformerKind: t.kind,
    throughCurrentA: d.dutyA,
    umKv: d.umKv,
    stepVoltageV: d.stepV ?? 0,
    regulation: "reversing",
    plusMinusSteps: t.plus ?? 8,
    midPositions: 3,
    selectorSize: "auto",
    preferStructure: "auto",
    mdu: "none",
  };
  return selectOltc(input).results[0]?.model ?? null;
}

describe("parseVectorGroup", () => {
  it("reads the autotransformer letter", () => {
    expect(parseVectorGroup("YNa0d11")?.windings).toEqual(["Y", "a", "D"]);
  });
  it("reads HV delta", () => {
    expect(parseVectorGroup("25 MVA Dyn11")?.windings).toEqual(["D", "Y"]);
  });
  it("does not read words", () => {
    expect(parseVectorGroup("Dynamic load, Yearly")).toBeNull();
  });
});

describe("parseTenderLine", () => {
  // 2026-10-27 Vietnam 220 kV schedule. Typed as two-winding it gave CV2III-600D/126.
  const vn = "220/110/35kV-125MVA-125/125/50MVA 225±8x1,25%/115/35kV - YNa0d11";

  it("reads the Vietnam autotransformer line", () => {
    const t = parseTenderLine(vn)!;
    expect(t.kind).toBe("auto");
    expect(t.mva).toBe(125);
    expect(t.hvKv).toBe(225);
    expect(t.mvKv).toBe(115);
    expect(t.tapPoint).toBe("auto_junction");
    expect([t.plus, t.minus, t.stepPct]).toEqual([8, 8, 1.25]);
    expect(t.vectorGroup).toBe("YNa0d11");
    expect(t.assumed).toContain("tap_point");
    expect(t.assumed).not.toContain("kind");
  });

  it("never sends the Vietnam autotransformer to a compound type", () => {
    const model = typeFor(vn)!;
    expect(model).toMatch(/^3x(CM2|SHZV)I-\d+\/252D-10193W$/);
  });

  it("reads a Chinese model with HV star", () => {
    const t = parseTenderLine("SFZ11-25000/110, 110±8×1.25%/10.5 kV, YNd11")!;
    expect(t.kind).toBe("two_winding");
    expect(t.mva).toBe(25);
    expect(t.tapKv).toBe(110);
    expect(t.winding).toBe("star");
    expect(t.tapPoint).toBe("neutral");
    expect(t.assumed).toContain("tap_point");
  });

  it("puts an HV delta on the line end", () => {
    const t = parseTenderLine("16 MVA 22±8x1.25%/0.4 kV Dyn11")!;
    expect(t.winding).toBe("delta");
    expect(t.tapPoint).toBe("line_end");
    expect(t.tapKv).toBe(22);
  });

  it("reads kVA, spaces and +/- ranges", () => {
    const t = parseTenderLine("40000 kVA, 115 kV +/- 8 x 1.25 % / 23 kV, YNd1")!;
    expect(t.mva).toBe(40);
    expect(t.tapKv).toBe(115);
    expect([t.plus, t.minus, t.stepPct]).toEqual([8, 8, 1.25]);
  });

  it("reads an asymmetric range", () => {
    const t = parseTenderLine("10 MVA 33+4-12x1.25%/11 kV YNd11")!;
    expect([t.plus, t.minus]).toEqual([4, 12]);
    expect(t.tapKv).toBe(33);
  });

  it("puts a range on the MV figure of an auto in the MV lead", () => {
    const t = parseTenderLine("250 MVA 230/121±8x1.25%/38.5 kV YNa0d11")!;
    expect(t.kind).toBe("auto");
    expect(t.tapPoint).toBe("auto_mv_line");
    expect([t.hvKv, t.mvKv]).toEqual([230, 121]);
  });

  it("reads a Chinese autotransformer model without a vector group", () => {
    const t = parseTenderLine("OSFPSZ-180000/220 220±8×1.25%/121/38.5 kV")!;
    expect(t.kind).toBe("auto");
    expect(t.mva).toBe(180);
  });

  it("does not take 'rated at' for an autotransformer", () => {
    const t = parseTenderLine("31.5 MVA rated at 132±10x1.25%/33 kV")!;
    expect(t.kind).toBe("two_winding");
    expect(t.assumed).toContain("kind");
    expect(t.assumed).toContain("winding");
  });

  it("assumes the HV winding is tapped when the range stands alone", () => {
    const t = parseTenderLine("63 MVA 132/33 kV YNd11 OLTC ±10x1.25%")!;
    expect(t.tapKv).toBe(132);
    expect(t.assumed).toContain("tap_winding");
  });

  it("reads a stated neutral BIL", () => {
    const t = parseTenderLine("100 MVA 220±8x1.25%/22 kV YNd11, neutral BIL 550 kV")!;
    expect(t.neutralBilKv).toBe(550);
  });

  it("returns null on text with no transformer data", () => {
    expect(parseTenderLine("please quote")).toBeNull();
  });
});

// ------------------------------------------------ 2026-11-04 tender-line audit

describe("parseTenderLine: range after a closed ratio (UNEVEN-3, WC-01)", () => {
  it("does not put a range written after '150/20kV' on the LV figure", () => {
    const t = parseTenderLine("65MVA 150/20kV +7/-10 x 1.5% YNd11")!;
    expect(t.tapKv).toBe(150);
    expect(t.assumed).toContain("tap_winding");
    expect(t.tapPoint).toBe("neutral");
  });
  it("reads '132/33 kV ±10x1.25%' as HV, flagged", () => {
    const t = parseTenderLine("50 MVA 132/33 kV ±10x1.25% YNd11")!;
    expect([t.tapKv, t.tapPoint]).toEqual([132, "neutral"]);
    expect(t.assumed).toContain("tap_winding");
    const d = parseTenderLine("25 MVA 66/11 kV ±8x1.25% Dyn11")!;
    expect([d.tapKv, d.tapPoint, d.winding]).toEqual([66, "line_end", "delta"]);
  });
  it("keeps a range glued to its figure", () => {
    expect(parseTenderLine("25MVA; 110kV±8×1.25%/11kV; YNd11")!.tapKv).toBe(110);
    expect(parseTenderLine("50 MVA 132/33±8x1.25% kV YNd11")!.tapKv).toBe(33);
    expect(parseTenderLine("16 MVA 22±8x1.25%/0.4 kV Dyn11")!.tapKv).toBe(22);
    expect(parseTenderLine("250 MVA 230/121±8x1.25%/38.5 kV YNa0d11")!.tapPoint).toBe("auto_mv_line");
  });
  it("reads a spaced range after a ratio with no kV as standalone", () => {
    const t = parseTenderLine("20MVA 69/13.8 ±8x1.25% Dyn1")!;
    expect(t.tapKv).toBe(69);
    expect(t.assumed).toContain("tap_winding");
  });
  it("every generated 'MVA kv/lv kV ±N x s% vg' line taps the HV", () => {
    const bad: string[] = [];
    for (const [kv, lv] of [[11, 0.4], [33, 11], [66, 11], [110, 10.5], [132, 33], [220, 35]] as const)
      for (const pm of [4, 8, 10, 16])
        for (const vg of ["YNd11", "Dyn11", "YNyn0"]) {
          const line = `40 MVA ${kv}/${lv} kV ±${pm}x1.25% ${vg}`;
          const t = parseTenderLine(line);
          if (!t || t.tapIndex !== 0 || t.tapKv !== kv || t.plus !== pm) bad.push(line);
        }
    expect(bad).toEqual([]);
  });
});

describe("parseTenderLine: percent ranges (UNEVEN-4, WC-08)", () => {
  const r = (line: string) => {
    const t = parseTenderLine(line)!;
    return [t.plus, t.minus, t.stepPct];
  };
  it("splits +0/-30 % into 16 × 1.875 %, as sold (B05/B06), marked assumed", () => {
    const t = parseTenderLine("10MVA 20/0.4kV +0/-30% Dyn11")!;
    expect([t.plus, t.minus, t.stepPct, t.tapKv]).toEqual([0, 16, 1.875, 20]);
    expect(t.assumed).toContain("range");
    expect(t.notes.map((n) => n.key)).toContain("percent");
  });
  it("uses a stated step count", () => {
    const t = parseTenderLine("180MVA 132/33kV +15%/-10% (20 x 1.25%) YNd11")!;
    expect([t.plus, t.minus, t.stepPct]).toEqual([12, 8, 1.25]);
    expect(t.assumed).not.toContain("range");
    expect(r("2.5 MVA 33/0.4 kV +5/-15% (16 x 1.25%) Dyn11")).toEqual([4, 12, 1.25]);
  });
  it("splits +5/-15 % and +5/-35 % by the whole-step rule", () => {
    expect(r("10 MVA, 20/0.4 kV, +5/-15%, Dyn11")).toEqual([4, 12, 1.25]);
    expect(r("7.5MVA 20/0.4kV +5/-35% YNd11")).toEqual([2, 14, 2.5]);
  });
  it("takes the step from ±N positions or a position count", () => {
    expect(r("10 MVA 20/0.4 kV ±25% ±10 positions Dyn11")).toEqual([10, 10, 2.5]);
    expect(r("12.5 MVA 13.8/0.4 kV ±10%, 17 positions Dyn11")).toEqual([8, 8, 1.25]);
    expect(r("130 MVA 132/33 kV, +15%/-10%, 11 positions (2.5% steps), linear")).toEqual([6, 4, 2.5]);
  });
  it("reads ±10 % alone as ±8 × 1.25 %, flagged, not as ±10 steps", () => {
    const t = parseTenderLine("20 MVA 66/11 kV ±10% Dyn11")!;
    expect([t.plus, t.minus, t.stepPct]).toEqual([8, 8, 1.25]);
    expect(t.assumed).toContain("range");
  });
  it("does not invent 16 steps for ±5 %", () => {
    const t = parseTenderLine("5 MVA 20/0.4 kV ±5% Dyn11")!;
    expect(t.plus).toBeNull();
    expect(t.assumed).toContain("range");
    expect(t.notes.map((n) => n.key)).toContain("percent_small");
  });
  it("ignores impedance tolerances", () => {
    expect(r("25 MVA 110±8x1.25%/10.5 kV YNd11, Uk 10.5% tolerance +10/-10%")).toEqual([8, 8, 1.25]);
    const t = parseTenderLine("25 MVA 110/10.5 kV YNd11, Uk 10.5%, tolerance +10/-10%")!;
    expect(t.plus).toBeNull();
    expect(t.assumed).toContain("range");
  });
  it("warns when the position count does not match", () => {
    const t = parseTenderLine("50 MVA, 230 kV, YNyn0d11, +5%/-15%, 21 positions x 1.25%")!;
    expect([t.plus, t.minus]).toEqual([4, 12]);
    expect(t.notes.map((n) => n.key)).toContain("percent_positions");
  });
  it("keeps step-count ranges as steps", () => {
    expect(r("10 MVA 33+4-12x1.25%/11 kV YNd11")).toEqual([4, 12, 1.25]);
    expect(r("25 MVA 110±8x1.25%/11 kV YNd11")).toEqual([8, 8, 1.25]);
  });
  it("splitPercentRange", () => {
    expect(splitPercentRange(15, 10)).toEqual({ plus: 12, minus: 8, stepPct: 1.25 });
    expect(splitPercentRange(15, 10, 20)).toEqual({ plus: 12, minus: 8, stepPct: 1.25 });
    expect(splitPercentRange(0, 30)).toEqual({ plus: 0, minus: 16, stepPct: 1.875 });
  });
});

describe("parseTenderLine: numbers and separators (WC-02, WC-04, WC-12, WC-15)", () => {
  it("reads thousands separators before kVA", () => {
    expect(parseTenderLine("31,500 kVA 110±8x1.25%/11 kV YNd11")!.mva).toBe(31.5);
    expect(parseTenderLine("31 500 kVA 110±8x1.25%/11 kV YNd11")!.mva).toBe(31.5);
    expect(parseTenderLine("2 500 kVA 20±2x2.5%/0.4 kV Dyn5")!.mva).toBe(2.5);
    expect(parseTenderLine("1,000 kVA 11±2x2.5%/0.433 kV Dyn11")!.mva).toBe(1);
    const t = parseTenderLine("31,5 MVA 110±9x1,78%/10,5 kV YNd11")!;
    expect([t.mva, t.stepPct, ...t.voltagesKv]).toEqual([31.5, 1.78, 110, 10.5]);
  });
  it("does not join a ratio figure into the kVA", () => {
    expect(parseTenderLine("33/11 630 kVA ±2x2.5% Dyn11")!.mva).toBe(0.63);
  });
  it("flags a power below 50 kVA", () => {
    expect(parseTenderLine("0.03 MVA 11±2x2.5%/0.4 kV Dyn11")!.notes.map((n) => n.key)).toContain("tiny_mva");
  });
  it("does not read a comma after a vector-group clock as a decimal", () => {
    const a = parseTenderLine("YNd11,66±12x1.78%/10.5 kV,40 MVA")!;
    expect([a.tapKv, a.stepPct, a.mva]).toEqual([66, 1.78, 40]);
    const b = parseTenderLine("Yd11,138±9x0,625%/33 kV,6.3 MVA")!;
    expect([b.tapKv, b.stepPct]).toEqual([138, 0.625]);
    const c = parseTenderLine("YNa0d11,275±12*1,25%/132/10,5 kV,25 MVA")!;
    expect([c.hvKv, c.mvKv]).toEqual([275, 132]);
    expect(parseTenderLine("110±8x1,25%/10,5 kV")!.voltagesKv).toEqual([110, 10.5]);
  });
  it("reads a lone kV and a split LV", () => {
    const a = parseTenderLine("63 MVA, 225 kV, ±8x1.25%")!;
    expect(a.tapKv).toBe(225);
    expect(a.assumed).toContain("tap_winding");
    expect(parseTenderLine("370 MVA, 275/33-33 kV, YNd11, +12/-8 x 1.25%")!.voltagesKv).toEqual([275, 33]);
    const b = parseTenderLine("Rated power 31.5 MVA; HV 115 kV ±9×1.78%; LV 11 kV; vector group YNd1")!;
    expect(b.tapKv).toBe(115);
    expect(b.assumed).not.toContain("tap_winding");
  });
  it("never reads an insulation level as a winding", () => {
    expect(parseTenderLine("100 MVA, 220 kV ±8x1.25%, neutral BIL 550 kV")!.voltagesKv).toEqual([220]);
    expect(parseTenderLine("40 MVA, 132 kV ±8x1.25%, Um 145 kV, LI 650 kV, YNd11")!.voltagesKv).toEqual([132]);
    const q = parseTenderLine("26 MVA, 22 kV (+8/-8 x 1.25%) / 6.6 kV, Dyn11")!;
    expect([q.tapKv, q.winding]).toEqual([22, "delta"]);
  });
  it("keeps an autotransformer with a lone kV refused", () => {
    expect(parseTenderLine("3 x single-phase autotransformer 83.3 MVA, 275/sqrt3 kV")!.voltagesKv).toEqual([]);
  });
  it("ignores ±0 but keeps its voltages", () => {
    const t = parseTenderLine("25 MVA 110±0x1.25%/11 kV YNd11")!;
    expect([t.plus, t.tapKv]).toEqual([null, 110]);
    expect(t.assumed).toContain("range");
    expect(t.notes.map((n) => n.key)).toContain("zero_range");
  });
});

describe("parseTenderLine: words (WC-03, WC-07, WC-09, WC-13, WC-14)", () => {
  it("reads single-phase", () => {
    expect(
      parseTenderLine("333 MVA single-phase 500/220 kV, 500 kV ±13x1.25%, regulation at the neutral point")!.phases,
    ).toBe("I");
    expect(parseTenderLine("50 MVA 1-phase 230/66 kV ±8x1.25% YNyn0")!.phases).toBe("I");
    expect(parseTenderLine("50 MVA 230/66 kV ±8x1.25% YNyn0")!.phases).toBeNull();
  });
  it("reads a delta tied to the tapping", () => {
    const q = parseTenderLine("15 MVA, 33/11 kV, ±8x1.25%, D connection")!;
    expect([q.tapPoint, q.winding]).toEqual(["line_end", "delta"]);
    expect(q.assumed).not.toContain("winding");
    const t = parseTenderLine("120 MVA, 132/11 kV, ±10x1.25%, regulation at the middle of the delta winding")!;
    expect([t.tapPoint, t.winding]).toEqual(["line_end", "delta"]);
  });
  it("keeps an LV or tertiary delta as the flagged star guess", () => {
    for (const line of [
      "25 MVA, 110/11 kV, ±8x1.25%, LV delta",
      "40 MVA, 132/33 kV, ±8x1.25%, delta tertiary",
      "40 MVA, 132/33 kV, ±8x1.25%, star/delta",
    ]) {
      const t = parseTenderLine(line)!;
      expect(t.winding).toBe("star");
      expect(t.assumed).toContain("winding");
      expect(t.notes.map((n) => n.key)).toContain("delta_text");
    }
  });
  it("reads a stated star neutral", () => {
    const t = parseTenderLine("103 MVA, 138/33 kV, ±8x1.5%, reversing, star neutral")!;
    expect(t.tapPoint).toBe("neutral");
    expect(t.assumed).not.toContain("tap_point");
  });
  it("lets the vector group win over a delta word", () => {
    expect(parseTenderLine("25 MVA 110±8x1.25%/11 kV YNd11 delta")!.tapPoint).toBe("neutral");
  });
  it("reads a tap-voltage ladder as the rated voltage", () => {
    const t = parseTenderLine("80/100/120 MVA, 118.25/110/96.25 kV (+6/-10 x 1.25%), Y")!;
    expect(t.tapKv).toBe(110);
    expect(t.notes.map((n) => n.key)).toContain("tap_ladder");
    expect(parseTenderLine("40 MVA 220±8x1.25%/121/38.5 kV YNyn0d11")!.voltagesKv).toEqual([220, 121, 38.5]);
  });
  it("reads coarse/fine and linear, not 'non-linear load'", () => {
    expect(parseTenderLine("10 MVA, 33/11.5 kV, Dyn11, ±8x1.25% coarse/fine")!.regulation).toBe("coarse_fine");
    expect(parseTenderLine("130 MVA 132/33 kV, +15%/-10%, 11 positions (2.5% steps), linear")!.regulation).toBe(
      "linear",
    );
    expect(parseTenderLine("25 MVA 110±8x1.25%/11 kV YNd11, non-linear load")!.regulation).toBeNull();
  });
  it("lets a two-winding vector group beat the word 'auto'", () => {
    const t = parseTenderLine("200 MVA, 225/115 kV; Auto-transformer, vector group YNd11d11; ±8x1.25%")!;
    expect(t.kind).toBe("two_winding");
    expect(t.notes.map((n) => n.key)).toContain("auto_vg");
    expect(parseTenderLine("125 MVA 225±8x1.25%/115/35kV YNa0d11")!.kind).toBe("auto");
    expect(parseTenderLine("OSFPSZ-180000/220 220±8x1.25%/121/11kV YNyn0d11")!.kind).toBe("auto");
    expect(parseTenderLine("OSFPSZ-180000/220 220±8x1.25%/121/11kV")!.kind).toBe("auto");
  });
});

describe("parseTenderLine: two tapped windings (F4)", () => {
  const line = "40MVA 115±8x1.25%/38.5±2x2.5%/11kV YNyn0d11";
  it("lists the second range", () => {
    const t = parseTenderLine(line)!;
    expect([t.tapKv, t.plus, t.stepPct]).toEqual([115, 8, 1.25]);
    expect(t.voltagesKv).toEqual([115, 38.5, 11]);
    expect(t.otherRanges).toHaveLength(1);
    expect(t.otherRanges[0]).toMatchObject({ kv: 38.5, plus: 2, minus: 2, stepPct: 2.5, tapPoint: "neutral" });
  });
  it("sizes the OCTC on the smaller range", () => {
    const t = parseTenderLine(line)!;
    const on = tenderLineSettings(t);
    const off = tenderLineSettings(t, { octc: true });
    expect(on.ok && [on.s.tapKv, on.s.plus, on.s.octcWinding]).toEqual([115, 8, false]);
    expect(off.ok && [off.s.tapKv, off.s.plus, off.s.stepPct, off.s.octcWinding]).toEqual([38.5, 2, 2.5, true]);
  });
});

describe("geometryForRange (UNEVEN-1, UNEVEN-6, WC-05)", () => {
  const code = (p: number, m: number, reg: "reversing" | "coarse_fine" | "linear") => {
    const g = geometryForRange(p, m, reg);
    return resolveTapFields({
      regulation: reg,
      positions: g.positions,
      plusMinusSteps: g.plusMinusSteps,
      midPositions: g.mid,
      pitch: g.pitch,
    }).tapCode;
  };
  it("takes the Fig. 3-3 row Huaming sold", () => {
    expect(geometryForRange(4, 12, "reversing")).toEqual({ plusMinusSteps: 8, positions: 19, mid: 3, pitch: 10 });
    expect(code(4, 12, "reversing")).toBe("10193W");
    expect(code(0, 16, "reversing")).toBe("10193W");
    expect(code(12, 8, "reversing")).toBe("12233W");
    expect(code(5, 7, "reversing")).toBe("14131W");
    expect(code(6, 4, "reversing")).toBe("12111W");
    expect(code(13, 9, "reversing")).toBe("12231W");
    expect(code(10, 15, "reversing")).toBe("14271W");
    expect(code(4, 12, "coarse_fine")).toBe("10193G");
    expect(code(8, 16, "coarse_fine")).toBe("14273G");
    expect(code(8, 11, "coarse_fine")).toBe("12233G");
  });
  it("drops one position for an odd S on a pitch-10 row", () => {
    expect(geometryForRange(7, 10, "reversing")).toEqual({ positions: 18, mid: 1, pitch: 10 });
    expect(code(7, 10, "reversing")).toBe("10181W");
    expect(code(8, 7, "reversing")).toBe("10183W");
    expect(code(8, 9, "coarse_fine")).toBe("10181G");
  });
  it("keeps linear at S + 1", () => {
    expect(geometryForRange(2, 6, "linear")).toEqual({ positions: 9, mid: 0, pitch: 10 });
  });
  it("defaults an uneven S ≤ 9 to linear only", () => {
    expect(defaultRegulationForRange(2, 6)).toBe("linear");
    expect(defaultRegulationForRange(0, 8)).toBe("linear");
    expect(defaultRegulationForRange(4, 12)).toBeNull();
    expect(defaultRegulationForRange(4, 4)).toBeNull();
  });
});

describe("tenderLineSettings (WC-03, WC-06, UNEVEN-2)", () => {
  it("refuses an autotransformer with no MV", () => {
    const r = tenderLineSettings(parseTenderLine("OSFPSZ-250000/220 220±8x1.25%")!);
    expect(r).toEqual({ ok: false, reason: "auto_needs_mv" });
  });
  it("triples a single-phase unit's MVA", () => {
    const r = tenderLineSettings(
      parseTenderLine("333 MVA single-phase 500/220 kV, 500 kV ±13x1.25%, regulation at the neutral point")!,
    );
    expect(r.ok && [r.s.mva, r.s.phases]).toEqual([999, "I"]);
  });
  it("keeps the line's real minus as the floor for the page", () => {
    expect(lineMinusSteps(parseTenderLine("10 MVA 33+4-12x1.25%/11 kV YNd11"))).toBe(12);
    expect(lineMinusSteps(parseTenderLine("25 MVA 110±8x1.25%/11 kV YNd11"))).toBe(0);
    expect(lineMinusSteps(null)).toBe(0);
  });
  it("defaults an uneven S ≤ 9 to linear, not stated", () => {
    const r = tenderLineSettings(parseTenderLine("30MVA 22+2-6x2.5%/0.4kV Dyn11")!);
    expect(r.ok && [r.s.regulation, r.s.regulationStated]).toEqual(["linear", false]);
  });
});

describe("tender-line notes have text in every UI language", () => {
  const keys: LineNoteKey[] = [
    "auto_needs_mv", "auto_tertiary", "zigzag", "tiny_mva", "single_phase", "tap_ladder", "auto_vg",
    "delta_text", "percent", "percent_positions", "percent_small", "zero_range", "second_range",
    "largest_mva", "mid_winding", "quantity", "earth_li",
  ];
  it("lineW_* and lineFailAutoMv", () => {
    for (const lang of ["en", "zh", "vi", "es", "tr", "id"] as const) {
      const d = TRANSFORMER_STRINGS[lang];
      for (const k of keys) expect(d[`lineW_${k}`], `${lang} lineW_${k}`).toBeTruthy();
      expect(d.lineFailAutoMv, `${lang} lineFailAutoMv`).toBeTruthy();
    }
  });
  it("English note text matches the page's English", () => {
    const t = parseTenderLine("10MVA 20/0.4kV +0/-30% Dyn11")!;
    expect(t.warnings).toEqual(t.notes.map(lineNoteEn));
  });
});

describe("off-circuit-only lines (2026-11-07 field test)", () => {
  const off = (l: string) => parseTenderLine(l)?.offCircuitOnly === true;
  it("reads DETC, off-circuit, sin carga, 无载 and the like as off-circuit duty", () => {
    expect(off("1000 kVA 10±2x2.5%/0.4 kV Dyn11, off-circuit tap changer (DETC)")).toBe(true);
    expect(off("2500 kVA 22±2x2.5%/0.4 kV Dyn11, conmutador sin carga")).toBe(true);
    expect(off("2000 kVA 35±2x2.5%/10.5 kV Yd11 无载调压")).toBe(true);
    expect(off("1600 kVA 20±2x2.5%/0.4 kV Dyn5, off-load tap changer")).toBe(true);
    expect(off("1600 kVA 20±2x2.5%/0.4 kV Dyn5, yüksüz kademe değiştirici")).toBe(true);
  });
  it("does not take loss words or a line that also names an OLTC", () => {
    expect(off("1600 kVA 22±2x2.5%/0.4 kV Dyn11, no-load losses 1.9 kW")).toBe(false);
    expect(off("2500 kVA 22±2x2.5%/0.4 kV Dyn11, pérdidas sin carga 2,1 kW")).toBe(false);
    expect(off("40 MVA 132±8x1.25%/33 kV YNd11, HV OLTC ±8x1.25%, LV DETC ±2x2.5%")).toBe(false);
    expect(off("40 MVA 132±8x1.25%/33 kV YNd11, on-load tap changer")).toBe(false);
  });
});
