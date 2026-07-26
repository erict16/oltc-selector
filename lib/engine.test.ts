import { describe, expect, it } from "vitest";
import { selectOltc, FIXTURES } from "./engine";
import {
  SERIES,
  pickSelectorSize,
  defaultSelectorSizeForUm,
} from "./catalog";

describe("tap / catalogue sanity", () => {
  it("CV2 has no 500 A", () => {
    const cv2 = SERIES.find((s) => s.id === "cv2")!;
    expect(cv2.currents.III).toEqual([350, 600]);
  });

  it("across-tap BIL 285 → selector grade C", () => {
    expect(pickSelectorSize(72.5, "auto", 350, 140, 285, 65)).toBe("C");
  });

  it("default selector size follows Um commercial ladder", () => {
    expect(defaultSelectorSizeForUm(72.5)).toBe("B");
    expect(defaultSelectorSizeForUm(126)).toBe("C");
    expect(defaultSelectorSizeForUm(145)).toBe("C");
    expect(defaultSelectorSizeForUm(170)).toBe("D");
    expect(defaultSelectorSizeForUm(252)).toBe("D");
    expect(defaultSelectorSizeForUm(300)).toBe("DE");
  });

  it("auto grade uses Um floor, not weakest letter in row", () => {
    // Must not return B for 126 / 170 when across-tap is empty
    expect(pickSelectorSize(126, "auto")).toBe("C");
    expect(pickSelectorSize(170, "auto")).toBe("D");
    expect(pickSelectorSize(252, "auto")).toBe("D"); // not DE — HOW TO SELECT chose D @ 230 kV
    expect(pickSelectorSize(72.5, "auto")).toBe("B");
  });

  it("across-tap can only raise the Um floor", () => {
    expect(pickSelectorSize(72.5, "auto", undefined, undefined, 285, 65)).toBe(
      "C",
    );
    expect(pickSelectorSize(170, "auto", undefined, undefined, 450, 100)).toBe(
      "D",
    );
    // 520 LI needs DE (D a_li = 460)
    expect(pickSelectorSize(252, "auto", undefined, undefined, 520, 110)).toBe(
      "DE",
    );
  });
});

describe("selectOltc fixtures", () => {
  it("UE HWV quote model", () => {
    const out = selectOltc(FIXTURES.ueHwv.input);
    expect(out.ok).toBe(true);
    expect(out.results[0].model).toBe(FIXTURES.ueHwv.expectModel);
    expect(out.results[0].selectorSize).toBe("");
  });

  it("Wilson-style SHZV includes selector size D", () => {
    const out = selectOltc(FIXTURES.wilsonShzv.input);
    expect(out.ok).toBe(true);
    expect(out.results[0].model).toContain("SHZV");
    expect(out.results[0].model).toContain("170D");
    expect(out.results[0].tapCode).toBe("12233W");
  });

  it("in-tank vacuum does not force SHZV when CM2/CV2 fit", () => {
    const out = selectOltc({
      mounting: "in_tank",
      medium: "oil_vacuum",
      preferVacuum: true,
      phases: "III",
      connection: "Y",
      throughCurrentA: 600,
      umKv: 126,
      stepVoltageV: 2000,
      regulation: "reversing",
      positions: 19,
    });
    expect(out.ok).toBe(true);
    // 2000 V step exceeds CV2 max → combined; CM2 III max 600 → CM2 or SHZV
    expect(["CM2", "SHZV"]).toContain(out.results[0].seriesCode);
    // CM2 preferred over SHZV when both fit
    expect(out.results[0].seriesCode).toBe("CM2");
  });

  it("CV2 compound type has no selector size letter", () => {
    const out = selectOltc(FIXTURES.cv2NoSelectorSize.input);
    expect(out.ok).toBe(true);
    const cv2 = out.results.find((r) => r.seriesCode === "CV2");
    expect(cv2).toBeTruthy();
    expect(cv2!.selectorSize).toBe("");
    expect(cv2!.model).not.toMatch(/\/\d+(\.\d+)?[BCDE]/);
  });

  it("default 400 A / 72.5 does NOT pick SHZV-400 over CV2/CM2", () => {
    const out = selectOltc({
      mounting: "in_tank",
      medium: "oil_vacuum",
      preferVacuum: true,
      phases: "III",
      connection: "Y",
      throughCurrentA: 400,
      umKv: 72.5,
      stepVoltageV: 1500,
      regulation: "reversing",
      positions: 19,
      pitch: 10,
      midPositions: 3,
    });
    expect(out.ok).toBe(true);
    // Exact SHZV-400 current match must not beat compound/CM2
    expect(out.results[0].seriesCode).not.toBe("SHZV");
    expect(["CV2", "CM2"]).toContain(out.results[0].seriesCode);
  });

  it("single-phase multi-unit omits Y/D connection letter", () => {
    const out = selectOltc(FIXTURES.case7Multi.input);
    expect(out.ok).toBe(true);
    expect(out.results[0].unitCount).toBe(3);
    // Was wrongly 3xCM2I-800D/… — D after current is connection, not allowed
    expect(out.results[0].model).toMatch(/^3xCM2I-\d+\//);
    expect(out.results[0].model).not.toMatch(/I-\d+[YD]\//);
  });
});

describe("training cases (选型案例-答案)", () => {
  it("case 1 → CV2III-350D/40.5-10193G as #1 (not SHZV)", () => {
    const out = selectOltc(FIXTURES.case1Cv2.input);
    expect(out.ok).toBe(true);
    expect(out.results[0].model).toBe(FIXTURES.case1Cv2.expectModel);
    expect(out.results[0].seriesCode).toBe("CV2");
  });

  it("case 2 → CM2III-600Y/72.5C-10193W as #1 (not SHZV)", () => {
    const out = selectOltc(FIXTURES.case2Cm2.input);
    expect(out.ok).toBe(true);
    expect(out.results[0].model).toBe(FIXTURES.case2Cm2.expectModel);
    expect(out.results[0].seriesCode).toBe("CM2");
    expect(out.results[0].selectorSize).toBe("C");
  });

  it("case 5 → CV2III-600D/145-12233W as #1", () => {
    const out = selectOltc(FIXTURES.case5Cv2_145.input);
    expect(out.ok).toBe(true);
    expect(out.results[0].model).toBe(FIXTURES.case5Cv2_145.expectModel);
  });

  it("case 7 → 3xCM2I-800… preferred over jumping to SHZV-1000 alone", () => {
    const out = selectOltc(FIXTURES.case7Multi.input);
    expect(out.ok).toBe(true);
    expect(out.results[0].model).toContain(FIXTURES.case7Multi.expectContains);
    expect(out.results[0].unitCount).toBe(3);
    // Selector size from across-tap BIL 320 → C (B a_li=265)
    expect(out.results[0].selectorSize).toBe("C");
    expect(out.results[0].model).toContain("72.5C");
  });

  it("case 3-style: mid-winding high across-tap → combined D, not CV2", () => {
    const out = selectOltc({
      mounting: "in_tank",
      medium: "oil_vacuum",
      preferVacuum: true,
      phases: "III",
      connection: "Y",
      throughCurrentA: 697.3,
      umKv: 170,
      stepVoltageV: 1659.9,
      regulation: "coarse_fine",
      positions: 19,
      midPositions: 3,
      pitch: 10,
      bilKv: 750,
      pfKv: 325,
      acrossTapBilKv: 450,
      acrossTapPfKv: 100,
    });
    expect(out.ok).toBe(true);
    // III max 600 short → 3× single-phase; grade D from Um 170 + across 450
    expect(out.results[0].unitCount).toBe(3);
    expect(out.results[0].selectorSize).toBe("D");
    expect(out.results[0].model).toMatch(/170D/);
    expect(out.results[0].model).not.toMatch(/I-\d+[YD]\//);
  });
});

describe("2025 sales calibration (HM reference list year=2025)", () => {
  it("CV2 III currents stay 350/600 (no 500 in 2025 shipments)", () => {
    const cv2 = SERIES.find((s) => s.id === "cv2")!;
    expect(cv2.currents.III).toEqual([350, 600]);
  });

  it("allows 72.5DE selector grade (2025 CM2 shipments)", () => {
    expect(pickSelectorSize(72.5, "DE")).toBe("DE");
  });

  it("sales 2025 CV2-350D/145 is selectable", () => {
    const out = selectOltc(FIXTURES.sales2025Cv2_145.input);
    expect(out.ok).toBe(true);
    expect(out.results[0].model).toBe(FIXTURES.sales2025Cv2_145.expectModel);
  });

  it("sales 2025: ~480 A / 72.5 high-Ust → CM2-500 not SHZV", () => {
    const out = selectOltc(FIXTURES.sales2025Cm2_500.input);
    expect(out.ok).toBe(true);
    expect(out.results[0].model).toContain(
      FIXTURES.sales2025Cm2_500.expectContains,
    );
    expect(out.results[0].seriesCode).toBe("CM2");
  });

  it("sales 2025: I>1000 A III → SHZVG-1300", () => {
    const out = selectOltc(FIXTURES.sales2025Shzvg.input);
    expect(out.ok).toBe(true);
    expect(out.results[0].model).toContain(
      FIXTURES.sales2025Shzvg.expectContains,
    );
    expect(out.results[0].seriesCode).toBe("SHZVG");
  });

  it("CMD I includes 1200 A (2025 CMDI-1200 volume)", () => {
    const cmd = SERIES.find((s) => s.id === "cmd")!;
    expect(cmd.currents.I).toContain(1200);
  });
});
