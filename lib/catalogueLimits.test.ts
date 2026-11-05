import { describe, expect, it } from "vitest";
import {
  SERIES,
  internalInsulation,
  pickSelectorSize,
  stepCapacityKva,
} from "./catalog";
import { selectOltc } from "./engine";
import { localizeNote } from "./noteI18n";
import type { SelectInput } from "./types";

const series = (id: string) => SERIES.find((s) => s.id === id)!;

const vac: SelectInput = {
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
const oil: SelectInput = { ...vac, medium: "oil", preferVacuum: false };

describe("CV / SV step capacity by contact pitch (TD-CV&SV Table 1)", () => {
  it("CV 350 A: 525 / 420 / 350 kVA at 10 / 12 / 14 contacts", () => {
    const cv = series("cv");
    expect([10, 12, 14].map((p) => stepCapacityKva(cv, 350, p))).toEqual([525, 420, 350]);
  });

  it("CV 700 A: 660 / 520 / 450 kVA", () => {
    const cv = series("cv");
    expect([10, 12, 14].map((p) => stepCapacityKva(cv, 700, p))).toEqual([660, 520, 450]);
  });

  it("SV 500 A: 400 / 325 kVA at the rating, 525 / 420 only at ≤350 / ≤300 A", () => {
    const sv = series("sv");
    expect(stepCapacityKva(sv, 500, 10, 480)).toBe(400);
    expect(stepCapacityKva(sv, 500, 12, 480)).toBe(325);
    expect(stepCapacityKva(sv, 500, 10, 350)).toBe(525);
    expect(stepCapacityKva(sv, 500, 12, 300)).toBe(420);
    expect(stepCapacityKva(sv, 500, 12, 340)).toBe(325);
    // Strict like a rating (2026-11-04 audit D2): 351 A is over the ≤350 A row.
    expect(stepCapacityKva(sv, 500, 10, 351)).toBe(400);
  });

  it("families without a pitch table keep one value", () => {
    expect(stepCapacityKva(series("cv2"), 600, 12)).toBe(800);
    expect(stepCapacityKva(series("shzv"), 1000, 18)).toBe(3000);
  });

  it("CVIII-350 drops out at 12 contacts when 350 A × 1300 V = 455 kVA > 420", () => {
    const p10 = selectOltc({ ...oil, throughCurrentA: 350, stepVoltageV: 1300 });
    expect(p10.results[0].model).toBe("CVIII-350Y/72.5-10193W");
    expect(p10.results[0].stepCapacityKva).toBe(525);

    const p12 = selectOltc({ ...oil, throughCurrentA: 350, stepVoltageV: 1300, plusMinusSteps: 10 });
    expect(p12.ok).toBe(true);
    expect(p12.results.some((r) => r.seriesId === "cv" && r.phases === "III")).toBe(false);
    expect(p12.results.some((r) => r.seriesId === "sv")).toBe(false);
    const cv700 = p12.results.find((r) => r.model.startsWith("3xCVI-700"));
    expect(cv700?.stepCapacityKva).toBe(520);
  });
});

describe("internal insulation per family", () => {
  it("CM2 / CM grade C a = 350 kV LI; SHZV stays 365; CMD D = 490", () => {
    expect(internalInsulation("cm2", "C").a_li).toBe(350);
    expect(internalInsulation("cm", "C").a_li).toBe(350);
    expect(internalInsulation("shzv", "C").a_li).toBe(365);
    expect(internalInsulation("sdzv", "C").a_li).toBe(365);
    expect(internalInsulation("cmd", "D")).toEqual({ a_li: 490, a_pf: 105, b_li: 490, b_pf: 146 });
    expect(internalInsulation("shzv", "D").a_li).toBe(460);
  });

  it("across-tap 360 kV LI: CM2 needs D, SHZV keeps C", () => {
    expect(pickSelectorSize(126, "auto", 360, 0, "cm2")).toBe("D");
    expect(pickSelectorSize(126, "auto", 360, 0, "shzv")).toBe("C");
    const out = selectOltc({ ...vac, throughCurrentA: 500, umKv: 126, stepVoltageV: 1500, acrossTapBilKv: 360 });
    expect(out.results[0].model).toBe("CM2III-500Y/126D-10193W");
    expect(out.results.some((r) => r.model === "SHZVIII-600Y/126C-10193W")).toBe(true);
  });
});

describe("no-result reason names the limit", () => {
  it("current above every in-tank vacuum rating", () => {
    const out = selectOltc({ ...vac, throughCurrentA: 3280, umKv: 126, stepVoltageV: 1000 });
    expect(out.ok).toBe(false);
    expect(out.errorsEn).toEqual([
      "Through-current 3280 A is above the largest in-tank vacuum rating (3000 A, 3×SHZVGI-3000).",
    ]);
    expect(out.errorsZh).toEqual([
      "通过电流 3280 A 超出箱内真空最大额定（3000 A，3×SHZVGI-3000）。",
    ]);
  });

  it("oil lock: the ceiling is the oil family, and kVA is not repeated", () => {
    const out = selectOltc({ ...oil, throughCurrentA: 99999 });
    expect(out.errorsEn).toEqual([
      "Through-current 99999 A is above the largest in-tank oil rating (2400 A, 3×CMDI-2400).",
    ]);
  });

  it("step voltage and step capacity above every family", () => {
    expect(selectOltc({ ...vac, throughCurrentA: 500, umKv: 126, stepVoltageV: 7000 }).errorsEn).toEqual([
      "Step voltage 7000 V is above every in-tank vacuum family at pitch 10 (max 6000 V, SDZV).",
    ]);
    expect(selectOltc({ ...vac, throughCurrentA: 2000, umKv: 126, stepVoltageV: 5000 }).errorsEn).toEqual([
      "Step capacity 10000 kVA is above every in-tank vacuum family at pitch 10 (max 8400 kVA, 3×SDZVI-2400).",
    ]);
  });

  it("positions above every family list the families at the ceiling", () => {
    const out = selectOltc({
      ...vac,
      regulation: "linear",
      plusMinusSteps: undefined,
      midPositions: undefined,
      positions: 20,
    });
    expect(out.errorsEn).toEqual([
      "20 positions are above every in-tank vacuum family (max 18, CM2/SHZV/SHZVG).",
    ]);
  });

  it("Um above every dry-type class", () => {
    const out = selectOltc({
      ...vac,
      mounting: "dry_type",
      medium: "dry",
      preferVacuum: false,
      umKv: 126,
      throughCurrentA: 150,
      stepVoltageV: 300,
      plusMinusSteps: 4,
      midPositions: 1,
    });
    expect(out.errorsEn).toEqual(["Um 126 kV is above the highest dry-type class (72.5 kV, CZ)."]);
  });

  it("4950 V at 35 positions: SHZV is short on Ust, SDZV on positions", () => {
    const out = selectOltc({
      ...vac,
      throughCurrentA: 500,
      umKv: 126,
      stepVoltageV: 4950,
      plusMinusSteps: 17,
      midPositions: 1,
    });
    expect(out.errorsEn).toEqual([
      "SHZV: step voltage 4950 V is above its 4000 V at pitch 18.",
      "SDZV: 35 positions are above its 27.",
    ]);
    expect(out.errorsZh).toEqual([
      "SHZV：级电压 4950 V 超出其节距 18 下的 4000 V。",
      "SDZV：35 个工作位置超出其 27。",
    ]);
  });

  it("across-tap above DE keeps its own message", () => {
    const out = selectOltc({ ...vac, umKv: 126, acrossTapBilKv: 600 });
    expect(out.errorsEn[0]).toMatch(/^Across-tap insulation is above every selector grade/);
  });

  it("family-form lines the sample cases do not reach still translate", () => {
    const lines = [
      "SHZVG: Um 300 kV is above its 252 kV.",
      "CM2: through-current 1700 A is above its 1500 A.",
      "SDZV: step capacity 9000 kVA is above its 8400 kVA at pitch 14.",
    ];
    for (const n of lines) {
      for (const lang of ["vi", "es", "tr", "id"] as const) {
        expect(localizeNote(n, lang), `${lang}: ${n}`).not.toBe(n);
      }
    }
  });
});
