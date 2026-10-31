import { describe, expect, it } from "vitest";
import { selectOltc } from "./engine";
import { deriveDuty, type TransformerSpec } from "./transformer";
import type { SelectInput } from "./types";

const spec = (over: Partial<TransformerSpec>): TransformerSpec => ({
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
  ...over,
});

const run = (s: TransformerSpec, extra: Partial<SelectInput> = {}) => {
  const d = deriveDuty(s);
  expect(d.ok).toBe(true);
  return {
    d,
    out: selectOltc({
      mounting: "in_tank",
      medium: "oil_vacuum",
      preferVacuum: true,
      phases: "III",
      connection: d.connection,
      transformerKind: s.kind,
      throughCurrentA: d.dutyA,
      umKv: d.umKv,
      stepVoltageV: d.stepV ?? 0,
      regulation: "reversing",
      plusMinusSteps: 8,
      midPositions: 3,
      selectorSize: "auto",
      preferStructure: "auto",
      mdu: "none",
      ...extra,
    }),
  };
};

describe("autotransformer tapped at the series/common junction", () => {
  // 125 MVA 225±8×1.25%/115/35 kV YNa0d11, the 27 Oct 2026 case.
  const tonight = spec({
    kind: "auto",
    tapPoint: "auto_junction",
    mva: 125,
    hvKv: 225,
    mvKv: 115,
  });

  it("takes HV current, HV step voltage and the HV system's insulation", () => {
    const d = deriveDuty(tonight);
    expect(d.connection).toBe("D");
    expect(d.ratedA).toBeCloseTo(320.75, 1);
    expect(d.maxA).toBeCloseTo(356.4, 1);
    expect(d.stepV).toBeCloseTo(1623.8, 0);
    expect(d.umKv).toBe(252);
    expect(d.actualUmKv).toBe(245);
    expect(d.umRule).toBe("auto_hv");
    expect(d.combinedOnly).toBe(true);
  });

  it("never sizes from the 115 kV junction voltage or emits a compound type", () => {
    const { out } = run(tonight);
    expect(out.ok).toBe(true);
    for (const r of out.results) {
      expect(r.model).not.toMatch(/^(3x)?(CV2|CV|SV)/);
      expect(r.umKv).toBeGreaterThanOrEqual(252);
      expect(r.currentA).toBeGreaterThanOrEqual(357);
    }
    expect(out.results[0]!.model).toMatch(/^3x(CM2|SHZV)I-\d+\/252D-10193W$/);
  });

  it("refuses a forced compound structure", () => {
    const { out } = run(tonight, { preferStructure: "compound" });
    expect(out.ok).toBe(false);
    expect(out.errorsZh[0]).toContain("自耦变只用组合式");
  });

  it("flags the unchecked tap-winding impulse and tie-in resistor", () => {
    const d = deriveDuty(tonight);
    expect(d.cautionsZh.join()).toContain("未核");
    expect(d.cautionsZh.join()).toContain("3×SHZVI-600/252D-10193W");
  });

  it("even a 126 kV-class autotransformer gets no CV2", () => {
    const { out } = run(
      spec({ kind: "auto", tapPoint: "auto_junction", mva: 40, hvKv: 110, mvKv: 66 }),
    );
    expect(out.ok).toBe(true);
    expect(out.results.every((r) => !/^(3x)?(CV2|CV|SV)/.test(r.model))).toBe(true);
  });
});

describe("autotransformer tapped in the MV line lead", () => {
  it("carries MV current and keeps HV insulation unless stated", () => {
    const d = deriveDuty(
      spec({ kind: "auto", tapPoint: "auto_mv_line", mva: 250, hvKv: 230, mvKv: 121 }),
    );
    expect(d.ratedA).toBeCloseTo((250e3 / (Math.sqrt(3) * 121)), 1);
    expect(d.umKv).toBe(252);
    expect(d.cautionsZh.join()).toContain("HMR");
  });

  it("takes a maker-stated insulation class", () => {
    const d = deriveDuty(
      spec({
        kind: "auto",
        tapPoint: "auto_mv_line",
        mva: 250,
        hvKv: 230,
        mvKv: 121,
        earthUmKv: 170,
      }),
    );
    expect(d.umKv).toBe(170);
    expect(d.umRule).toBe("explicit");
  });
});

describe("two-winding", () => {
  it("star line end: line current, no √3 division (Vinacomin 16 MVA 22 kV)", () => {
    const { d, out } = run(
      spec({ tapPoint: "line_end", mva: 16, tapKv: 22, winding: "star" }),
    );
    expect(d.ratedA).toBeCloseTo(419.9, 1);
    expect(d.maxA).toBeCloseTo(466.5, 1);
    expect(d.connection).toBe("D");
    expect(d.actualUmKv).toBe(24);
    expect(out.results[0]!.model).toBe("CV2III-600D/40.5-10193W");
  });

  it("delta line end: phase current S/(3U), step on the full line voltage", () => {
    const d = deriveDuty(
      spec({ tapPoint: "line_end", mva: 63, tapKv: 33, winding: "delta" }),
    );
    expect(d.ratedA).toBeCloseTo(63e3 / (3 * 33), 1);
    expect(d.stepV).toBeCloseTo(33000 * 0.0125, 3);
  });

  it("delta has no neutral", () => {
    const d = deriveDuty(spec({ tapPoint: "neutral", winding: "delta" }));
    expect(d.ok).toBe(false);
  });

  it("220 kV neutral: 72.5 assumed and said so, not 252", () => {
    const d = deriveDuty(spec({ mva: 63, tapKv: 220 }));
    expect(d.connection).toBe("Y");
    expect(d.umKv).toBe(72.5);
    expect(d.umAssumed).toBe(true);
    expect(d.cautionsZh[0]).toContain("中性点绝缘未给");
  });

  it("neutral insulation from the OS wins", () => {
    const d = deriveDuty(spec({ mva: 63, tapKv: 220, earthUmKv: 252 }));
    expect(d.umKv).toBe(252);
    expect(d.umAssumed).toBe(false);
  });

  it("35 kV neutral sizes at 40.5 but flags it: most 2026 orders bought 72.5", () => {
    const d = deriveDuty(spec({ mva: 10, tapKv: 35 }));
    expect(d.umKv).toBe(40.5);
    expect(d.umAssumed).toBe(true);
    expect(d.cautionsZh.join()).toContain("72.5");
  });

  it("66 kV neutral keeps the full 72.5 class without a flag", () => {
    const d = deriveDuty(spec({ mva: 20, tapKv: 66 }));
    expect(d.umKv).toBe(72.5);
    expect(d.umAssumed).toBe(false);
  });

  it("220 kV star line end needs 252 and no compound", () => {
    const { d, out } = run(spec({ tapPoint: "line_end", mva: 63, tapKv: 220 }));
    expect(d.ratedA).toBeCloseTo(165.3, 1);
    expect(out.results[0]!.model).toMatch(/\/252D-/);
    expect(out.results[0]!.model).not.toMatch(/^CV2/);
  });
});

describe("guards", () => {
  it("a winding above the catalogue is refused, not left without Um", () => {
    const d = deriveDuty(spec({ tapPoint: "line_end", tapKv: 500 }));
    expect(d.ok).toBe(false);
    expect(d.errorZh).toContain("363");
  });

  it("autotransformer HV must be above MV", () => {
    expect(
      deriveDuty(spec({ kind: "auto", tapPoint: "auto_junction", hvKv: 115, mvKv: 225 })).ok,
    ).toBe(false);
  });

  it("tap point must fit the kind", () => {
    expect(deriveDuty(spec({ kind: "auto", tapPoint: "neutral", hvKv: 225, mvKv: 115 })).ok).toBe(false);
  });
});

describe("explicit earth Um and the 363 kV ceiling", () => {
  const auto400 = { kind: "auto" as const, tapPoint: "auto_junction" as const, hvKv: 400, mvKv: 220, mva: 250 };

  it("an OS-stated Um is applied before the range check", () => {
    const d = deriveDuty(spec({ ...auto400, earthUmKv: 252 }));
    expect(d.ok).toBe(true);
    expect(d.umKv).toBe(252);
    expect(d.umRule).toBe("explicit");
  });

  it("without an override, a 420 kV class is still refused", () => {
    const d = deriveDuty(spec(auto400));
    expect(d.ok).toBe(false);
    expect(d.errorEn).toContain("363");
  });

  it("an override above 363 is refused too", () => {
    expect(deriveDuty(spec({ ...auto400, earthUmKv: 420 })).ok).toBe(false);
  });
});
