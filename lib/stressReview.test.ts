import { describe, expect, it } from "vitest";
import { selectOltc } from "./engine";
import { INTERNAL_INSULATION, SERIES, umForEarthInsulation } from "./catalog";
import { commercialTypeExists } from "./typeExists";
import { decimalDraft, parseDecimal } from "./decimal";
import { resolveTapFields } from "./tapCode";
import type { SelectInput } from "./types";

/** 2026-10-21 stress review: each case was a wrong or silent model. */
const base: SelectInput = {
  mounting: "in_tank",
  medium: "oil_vacuum",
  preferVacuum: true,
  phases: "III",
  connection: "Y",
  throughCurrentA: 400,
  umKv: 72.5,
  stepVoltageV: 1000,
  regulation: "reversing",
  plusMinusSteps: 8,
  midPositions: 3,
  mdu: "none",
};
const run = (p: Partial<SelectInput>) => selectOltc({ ...base, ...p });

describe("across-tap above every grade", () => {
  it("LI 650 @252 has no type (DE is 550), not a silent DE", () => {
    const out = run({ umKv: 252, throughCurrentA: 600, stepVoltageV: 2500, acrossTapBilKv: 650 });
    expect(out.ok).toBe(false);
    expect(out.errorsZh[0]).toContain("调压绕组间绝缘");
  });

  it("PF 150 @126 has no type (DE is 120)", () => {
    const out = run({ umKv: 126, throughCurrentA: 600, stepVoltageV: 2500, acrossTapPfKv: 150 });
    expect(out.ok).toBe(false);
  });

  it("LI 520 @252 still gets DE", () => {
    const out = run({ umKv: 252, throughCurrentA: 600, stepVoltageV: 2500, acrossTapBilKv: 520 });
    expect(out.results[0]?.model).toBe("CM2III-600Y/252DE-10193W");
  });

  it("a typed grade below the stress is raised and says so", () => {
    const out = run({ umKv: 252, throughCurrentA: 600, stepVoltageV: 2500, selectorSize: "B" });
    const r = out.results[0]!;
    expect(r.selectorSize).toBe("C");
    expect(r.cautionsZh.join()).toContain("由 B 升为 C");
  });

  it("HWV says across-tap was not checked", () => {
    const out = run({ mounting: "on_tank", acrossTapBilKv: 285 });
    const r = out.results[0]!;
    expect(r.seriesCode).toBe("HWV");
    expect(r.cautionsZh.join()).toContain("调压绕组间绝缘未校验");
  });
});

describe("step voltage must be a number", () => {
  it("NaN and undefined are errors, not a skipped check", () => {
    expect(run({ stepVoltageV: NaN }).ok).toBe(false);
    expect(run({ stepVoltageV: undefined as unknown as number }).ok).toBe(false);
    expect(run({ umKv: Infinity }).ok).toBe(false);
  });

  it("0 means not given, and every card says Ust was not checked", () => {
    const out = run({ stepVoltageV: 0 });
    expect(out.ok).toBe(true);
    for (const r of out.results) {
      expect(r.cautionsZh.join()).toContain("未给级电压");
    }
    expect(run({}).results[0]!.cautionsZh).toEqual([]);
  });
});

describe("tap codes outside Fig. 3-3", () => {
  it("brochure rows are standard", () => {
    expect(resolveTapFields({ regulation: "reversing", plusMinusSteps: 8 }).standard).toBe(true);
    expect(resolveTapFields({ regulation: "coarse_fine", plusMinusSteps: 13, midPositions: 1 }).standard).toBe(true);
    expect(resolveTapFields({ regulation: "reversing", positions: 17, midPositions: 1 }).standard).toBe(true);
  });

  it("invented codes still build for special OS but carry a caution", () => {
    for (const p of [
      { regulation: "coarse_fine" as const, plusMinusSteps: 4 }, // 10113G
      { plusMinusSteps: 8, pitch: 12 as const }, // 12193W
      { plusMinusSteps: undefined, positions: 21, midPositions: undefined }, // 12211W
      { plusMinusSteps: undefined, positions: 20, midPositions: undefined }, // 12201W
    ]) {
      const r = run(p).results[0]!;
      expect(r.cautionsZh.join(), r.model).toContain("不在样本图 3-3");
    }
  });
});

describe("1% commercial overcurrent is visible", () => {
  it("1010 A on SHZV-1000 says how far over", () => {
    const r = run({ throughCurrentA: 1010, stepVoltageV: 2000 }).results[0]!;
    expect(r.model).toBe("SHZVIII-1000Y/72.5B-10193W");
    expect(r.cautionsZh.join()).toContain("超出额定 1000 A 的 1.0%");
  });
});

describe("earth insulation picks the Um class", () => {
  it("BIL 750 @126 → Um 170, not a stronger grade at 126", () => {
    expect(umForEarthInsulation(126, 750)).toBe(170);
    const r = run({ umKv: 126, throughCurrentA: 600, stepVoltageV: 2500, bilKv: 750 }).results[0]!;
    expect(r.umKv).toBe(170);
    expect(r.model).toBe("CM2III-600Y/170D-10193W");
  });

  it("BIL inside the class leaves Um alone", () => {
    const r = run({ umKv: 72.5, bilKv: 350, pfKv: 140 }).results[0]!;
    expect(r.umKv).toBe(72.5);
  });

  it("BIL above every class is an error", () => {
    expect(run({ umKv: 252, bilKv: 1500 }).ok).toBe(false);
  });
});

describe("OCTC has no Um twin", () => {
  it("800 A D @40.5 is WSG at 40.5, not WSL @72.5", () => {
    const out = run({
      dutyKind: "octc",
      medium: "oil",
      preferVacuum: false,
      connection: "D",
      throughCurrentA: 800,
      umKv: 40.5,
      regulation: "linear",
      plusMinusSteps: undefined,
      positions: 5,
    });
    expect(out.results[0]!.model).toBe("WSGII-800D/40.5-4x5A");
    expect(out.results.some((r) => r.umKv > 40.5 + 0.1)).toBe(false);
  });
});

describe("decimal input", () => {
  it("reads comma decimals and refuses thousands groups", () => {
    expect(parseDecimal("0,5")).toEqual({ ok: true, value: 0.5 });
    expect(parseDecimal("1.43")).toEqual({ ok: true, value: 1.43 });
    expect(parseDecimal("1,200")).toEqual({ ok: false, reason: "ambiguous" });
    expect(parseDecimal("0x400").ok).toBe(false);
    expect(parseDecimal("1e3").ok).toBe(false);
  });

  it("keeps a trailing dot while typing", () => {
    expect(decimalDraft("1.")).toEqual({ draft: "1.", value: 1 });
    expect(decimalDraft("0,")).toEqual({ draft: "0.", value: 0 });
    expect(decimalDraft("1.4a").draft).toBeNull();
  });
});

/** Seeded fuzz: invariants every emitted row must hold. */
describe("fuzz invariants", () => {
  let seed = 20261021;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)]!;

  it("no row under-rates Um, current, Ust, step capacity, or across-tap", () => {
    const bad: string[] = [];
    for (let i = 0; i < 4000; i++) {
      const duty = pick(["oltc", "oltc", "oltc", "octc"] as const);
      const reg = pick(["reversing", "coarse_fine", "linear"] as const);
      const mounting =
        duty === "octc" ? "in_tank" : pick(["in_tank", "in_tank", "on_tank", "dry_type"] as const);
      const inp: SelectInput = {
        mounting,
        medium: mounting === "dry_type" ? "dry" : pick(["oil_vacuum", "oil"] as const),
        preferVacuum: rnd() < 0.7,
        dutyKind: duty,
        phases: pick(["III", "III", "I"] as const),
        connection: pick(["Y", "D"] as const),
        throughCurrentA: Math.round(rnd() * 3200 + 20),
        umKv: pick([12, 24, 40.5, 52, 72.5, 100, 126, 145, 170, 245, 252, 300, 363]),
        stepVoltageV: Math.round(rnd() * 5000),
        regulation: reg,
        plusMinusSteps: reg === "linear" ? undefined : pick([4, 5, 6, 8, 9, 10, 11, 12, 13, 16]),
        positions: reg === "linear" ? pick([5, 7, 9, 11, 13, 14, 17]) : undefined,
        acrossTapBilKv: rnd() < 0.3 ? pick([150, 200, 285, 350, 450, 550, 650]) : undefined,
        acrossTapPfKv: rnd() < 0.2 ? pick([38, 50, 65, 80, 105, 120, 140]) : undefined,
        mdu: "none",
      };
      for (const r of selectOltc(inp).results) {
        const s = SERIES.find((x) => x.id === r.seriesId)!;
        const tag = `${r.model} <- ${JSON.stringify(inp)}`;
        if (r.umKv + 0.01 < inp.umKv) bad.push(`Um ${tag}`);
        if (r.currentA * 1.01 + 0.5 < inp.throughCurrentA) bad.push(`I ${tag}`);
        if (r.currentA + 0.01 < inp.throughCurrentA && !r.cautionsZh.join().includes("超出额定")) {
          bad.push(`silent overcurrent ${tag}`);
        }
        if (inp.mounting === "in_tank" && s.id === "hwv") bad.push(`HWV in-tank ${tag}`);
        if (duty === "octc") continue;
        if (r.maxStepVoltageV != null && inp.stepVoltageV > r.maxStepVoltageV + 0.5) bad.push(`Ust ${tag}`);
        if (
          r.stepCapacityKva != null &&
          (inp.throughCurrentA * inp.stepVoltageV) / 1000 > r.stepCapacityKva + 0.5
        ) {
          bad.push(`Psin ${tag}`);
        }
        const li = inp.acrossTapBilKv ?? 0;
        const pf = inp.acrossTapPfKv ?? 0;
        if (s.usesSelectorSize && (li || pf)) {
          const ins = INTERNAL_INSULATION[r.selectorSize];
          if (ins.a_li + 0.5 < li || ins.a_pf + 0.5 < pf) bad.push(`grade ${tag}`);
        }
        if (!r.model.startsWith("HWDK") && !commercialTypeExists(r.model.replace(/^3x/, ""), s)) {
          bad.push(`exists ${tag}`);
        }
        if (inp.medium === "oil" && !inp.preferVacuum && s.vacuum && inp.mounting !== "dry_type") {
          bad.push(`oil lock ${tag}`);
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });
});
