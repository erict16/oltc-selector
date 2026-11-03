import { describe, expect, it } from "vitest";
import { parseTenderLine, parseVectorGroup } from "./nameplate";
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
