import { describe, expect, it } from "vitest";
import { selectOltc, FIXTURES } from "./engine";
import { parseTypeString } from "./orderReplay";
import {
  SERIES,
  pickSelectorSize,
  defaultSelectorSizeForUm,
} from "./catalog";
import {
  positionsFromPlusMinus,
  resolveTapFields,
  midFromPlusMinus,
} from "./tapCode";

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

describe("tap codes W/G (brochure Fig. 3-3)", () => {
  it("P = 2N + mid: ±8 mid3 → 19, ±8 mid1 → 17, ±9 mid1 → 19", () => {
    expect(positionsFromPlusMinus(8)).toBe(19); // preferred mid3
    expect(positionsFromPlusMinus(8, 3)).toBe(19);
    expect(positionsFromPlusMinus(8, 1)).toBe(17);
    expect(positionsFromPlusMinus(9, 1)).toBe(19);
    expect(midFromPlusMinus(8)).toBe(3);
    expect(midFromPlusMinus(9)).toBe(1);
  });

  it("±8 default → 10193 (mid3), not 18-pos or 10191", () => {
    expect(
      resolveTapFields({ regulation: "reversing", plusMinusSteps: 8 }).tapCode,
    ).toBe("10193W");
    expect(
      resolveTapFields({ regulation: "coarse_fine", plusMinusSteps: 8 })
        .tapCode,
    ).toBe("10193G");
  });

  it("±8 mid1 → 18171W (NOT 10191W); ±9 mid1 → 10191W", () => {
    // Fig. 3-3: ±8 mid1 is pitch 18 / 17 pos / 18171W — never 10191
    expect(
      resolveTapFields({
        regulation: "reversing",
        plusMinusSteps: 8,
        midPositions: 1,
      }).tapCode,
    ).toBe("18171W");
    expect(
      resolveTapFields({
        regulation: "reversing",
        plusMinusSteps: 9,
        midPositions: 1,
      }).tapCode,
    ).toBe("10191W");
    // Invalid mid for ±9 (only mid1 in brochure) falls back to mid1 → 10191
    expect(
      resolveTapFields({
        regulation: "reversing",
        plusMinusSteps: 9,
        midPositions: 3,
      }).tapCode,
    ).toBe("10191W");
  });

  it("±9 → 10191 mid1; ±10 → 12233 mid3; ±13 → 14271 mid1", () => {
    expect(
      resolveTapFields({ regulation: "coarse_fine", plusMinusSteps: 9 })
        .tapCode,
    ).toBe("10191G");
    expect(
      resolveTapFields({ regulation: "reversing", plusMinusSteps: 10 })
        .tapCode,
    ).toBe("12233W");
    expect(
      resolveTapFields({ regulation: "coarse_fine", plusMinusSteps: 10 })
        .tapCode,
    ).toBe("12233G");
    // Training case: 500 kV ±13 → 14271W
    expect(
      resolveTapFields({ regulation: "reversing", plusMinusSteps: 13 })
        .tapCode,
    ).toBe("14271W");
  });

  it("G menu is ±8…±17 only (not ±4…±7); G has no ±8 mid1", async () => {
    const { pmStepOptionsFor, midOptionsFor } = await import("./tapCode");
    expect(pmStepOptionsFor("coarse_fine")).toEqual([
      8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
    ]);
    expect(pmStepOptionsFor("reversing")[0]).toBe(4);
    expect(midOptionsFor(8, "reversing")).toEqual([3, 1]);
    expect(midOptionsFor(8, "coarse_fine")).toEqual([3]);
    expect(midOptionsFor(9, "reversing")).toEqual([1]);
    expect(midOptionsFor(10, "reversing")).toEqual([3]);
  });

  it("case1-style ±8 coarse-fine yields 10193G", () => {
    const out = selectOltc({
      ...FIXTURES.case1Cv2.input,
      plusMinusSteps: 8,
      positions: undefined,
      pitch: undefined,
      midPositions: undefined,
    });
    expect(out.ok).toBe(true);
    expect(out.results[0].tapCode).toBe("10193G");
    expect(out.results[0].model).toContain("10193G");
  });

  it("user mid=1 with ±8 → 18171W (Fig. 3-3, not 10191)", () => {
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
      plusMinusSteps: 8,
      midPositions: 1,
    });
    expect(out.ok).toBe(true);
    expect(out.results[0].tapCode).toBe("18171W");
    expect(out.results[0].positions).toBe(17);
  });

  it("training cases: ±9 → 10191W, ±10 → 12233W, ±13 → 14271W", () => {
    // 220 MVA / 132 kV ±9 → 10191W
    expect(
      resolveTapFields({ regulation: "reversing", plusMinusSteps: 9 }).tapCode,
    ).toBe("10191W");
    // 120 MVA / 132 kV ±10 → 12233W
    expect(
      resolveTapFields({ regulation: "reversing", plusMinusSteps: 10 }).tapCode,
    ).toBe("12233W");
    // 333 MVA / 500 kV ±13 → 14271W
    expect(
      resolveTapFields({ regulation: "reversing", plusMinusSteps: 13 }).tapCode,
    ).toBe("14271W");
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

  it("single-phase multi string omits Y/D when multi is forced", () => {
    // Iᵤ above SHZVG III 1500 → multi required
    const out = selectOltc({
      mounting: "in_tank",
      medium: "oil_vacuum",
      preferVacuum: true,
      phases: "III",
      connection: "Y",
      throughCurrentA: 1600,
      umKv: 72.5,
      stepVoltageV: 2000,
      regulation: "reversing",
      positions: 19,
    });
    expect(out.ok).toBe(true);
    expect(out.results[0].unitCount).toBe(3);
    expect(out.results[0].model).toMatch(/^3x/);
    expect(out.results[0].model).not.toMatch(/I-\d+[YD]\//);
  });

  it("one SHZV-1000 beats 3×CM2I when both cover (price list)", () => {
    const out = selectOltc({
      mounting: "in_tank",
      medium: "oil_vacuum",
      preferVacuum: true,
      phases: "III",
      connection: "Y",
      throughCurrentA: 700,
      umKv: 72.5,
      stepVoltageV: 1500,
      regulation: "reversing",
      positions: 19,
    });
    expect(out.ok).toBe(true);
    expect(out.results[0].unitCount).toBe(1);
    expect(out.results[0].seriesCode).toBe("SHZV");
    expect(out.results[0].model).toContain("SHZVIII-1000");
    // multi may appear later as alt, never as #1
    expect(out.results[0].model).not.toMatch(/^3x/);
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

  it("case 7 → SHZVIII-1000D (not 3×CM2I) when I≈626 A", () => {
    const out = selectOltc(FIXTURES.case7Shzv1000.input);
    expect(out.ok).toBe(true);
    expect(out.results[0].model).toContain(FIXTURES.case7Shzv1000.expectContains);
    expect(out.results[0].unitCount).toBe(1);
    expect(out.results[0].seriesCode).toBe("SHZV");
    expect(out.results[0].selectorSize).toBe("C");
    // 3×CM2 may be listed as alt, not primary
    const multi = out.results.find((r) => r.unitCount > 1);
    if (multi) expect(out.results[0].adequacyScore).toBeGreaterThan(multi.adequacyScore);
  });

  it("case 3-style: 697 A / 170 → one SHZV-1000, not 3×", () => {
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
    // CM2 III max 600 short, but SHZV III 1000 covers → single unit
    expect(out.results[0].unitCount).toBe(1);
    expect(out.results[0].seriesCode).toBe("SHZV");
    expect(out.results[0].selectorSize).toBe("D");
    expect(out.results[0].model).toMatch(/SHZVIII-1000Y\/170D/);
  });
});

describe("CV2 step voltage vs contacts (pitch)", () => {
  it("rejects CV2 when Ust 1650 V with 12 contacts (max 1500 V)", () => {
    const out = selectOltc({
      mounting: "in_tank",
      medium: "oil_vacuum",
      preferVacuum: true,
      phases: "III",
      connection: "D",
      throughCurrentA: 350,
      umKv: 145,
      stepVoltageV: 1650,
      regulation: "reversing",
      positions: 23,
      midPositions: 3,
      pitch: 12,
    });
    expect(out.ok).toBe(true);
    expect(out.results[0].seriesCode).not.toBe("CV2");
    expect(out.results.every((r) => r.seriesCode !== "CV2")).toBe(true);
  });

  it("allows CV2 when Ust 1500 V with 12 contacts", () => {
    const out = selectOltc({
      mounting: "in_tank",
      medium: "oil_vacuum",
      preferVacuum: true,
      phases: "III",
      connection: "D",
      throughCurrentA: 350,
      umKv: 145,
      stepVoltageV: 1500,
      regulation: "reversing",
      positions: 23,
      midPositions: 3,
      pitch: 12,
      acrossTapBilKv: 200,
      acrossTapPfKv: 50,
    });
    expect(out.ok).toBe(true);
    expect(out.results.some((r) => r.seriesCode === "CV2")).toBe(true);
  });

  it("allows CV2 when Ust 2000 V with 10 contacts", () => {
    const out = selectOltc({
      mounting: "in_tank",
      medium: "oil_vacuum",
      preferVacuum: true,
      phases: "III",
      connection: "Y",
      throughCurrentA: 350,
      umKv: 72.5,
      stepVoltageV: 2000,
      regulation: "reversing",
      positions: 19,
      midPositions: 3,
      pitch: 10,
    });
    expect(out.ok).toBe(true);
    expect(out.results.some((r) => r.seriesCode === "CV2")).toBe(true);
  });
});

describe("2025 sales calibration (year=2025)", () => {
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

  it("349.9 A accepts CV2-350 (S/√3U rounding; ~1 A epsilon)", () => {
    const out = selectOltc({
      mounting: "in_tank",
      medium: "oil_vacuum",
      preferVacuum: true,
      phases: "III",
      connection: "D",
      throughCurrentA: 349.9,
      umKv: 40.5,
      stepVoltageV: 544.5,
      regulation: "reversing",
      plusMinusSteps: 8,
    });
    expect(out.ok).toBe(true);
    expect(out.results[0].model).toBe("CV2III-350D/40.5-10193W");
    expect(out.results[0].seriesCode).toBe("CV2");
    expect(out.results[0].currentA).toBe(350);
  });

  it("on-tank 175 A / 72.5 Y ±8 → HWVIII-400Y/72.5-10193W", () => {
    const out = selectOltc({
      mounting: "on_tank",
      medium: "oil_vacuum",
      preferVacuum: true,
      phases: "III",
      connection: "Y",
      throughCurrentA: 175,
      umKv: 72.5,
      stepVoltageV: 476,
      regulation: "reversing",
      plusMinusSteps: 8,
      mdu: "none",
    });
    expect(out.ok).toBe(true);
    expect(out.results[0].model).toBe("HWVIII-400Y/72.5-10193W");
    expect(out.results[0].seriesCode).toBe("HWV");
    expect(out.results[0].selectorSize).toBe("");
    expect(out.results[0].currentA).toBe(400);
  });

  it("on-tank 523 A → HWV-800 (not 400; 97% epsilon)", () => {
    const out = selectOltc({
      mounting: "on_tank",
      medium: "oil_vacuum",
      preferVacuum: true,
      phases: "III",
      connection: "D",
      throughCurrentA: 523,
      umKv: 40.5,
      stepVoltageV: 172.5,
      regulation: "reversing",
      plusMinusSteps: 8,
      mdu: "none",
    });
    expect(out.ok).toBe(true);
    expect(out.results[0].seriesCode).toBe("HWV");
    expect(out.results[0].currentA).toBe(800);
    expect(out.results[0].model).toBe("HWVIII-800D/40.5-10193W");
    expect(out.results[0].selectorSize).toBe("");
  });
});

describe("OCTC / WSL (dutyKind=octc)", () => {
  it("parses WSLIV-800Y/170-6x5B (spaces / × / *)", () => {
    expect(parseTypeString("WSLIV-800Y/170-6x5B")).toMatchObject({
      family: "WSL",
      phases: "IV",
      currentA: 800,
      connection: "Y",
      umKv: 170,
      selectorSize: "B",
      tapCode: "6x5",
    });
    expect(parseTypeString("WSL IV-800Y/170-6×5B")).toMatchObject({
      family: "WSL",
      tapCode: "6x5",
      selectorSize: "B",
    });
    expect(parseTypeString("WDLIV-1000Y/126-6*5B")).toMatchObject({
      family: "WDL",
      phases: "IV",
      currentA: 1000,
      tapCode: "6x5",
    });
  });

  it("WSL is absent from the default OLTC ranking", () => {
    const out = selectOltc({
      mounting: "in_tank",
      medium: "oil_vacuum",
      preferVacuum: true,
      phases: "III",
      connection: "Y",
      throughCurrentA: 350,
      umKv: 40.5,
      stepVoltageV: 1000,
      regulation: "reversing",
      plusMinusSteps: 8,
    });
    expect(out.ok).toBe(true);
    expect(out.results[0].seriesCode).toBe("CV2");
    expect(out.results.every((r) => r.seriesCode !== "WSL")).toBe(true);
  });

  it("800 A / 170 Y → WSLIV-800Y/170-6x5B", () => {
    const out = selectOltc({
      mounting: "in_tank",
      medium: "oil",
      preferVacuum: false,
      dutyKind: "octc",
      phases: "III",
      connection: "Y",
      throughCurrentA: 800,
      umKv: 170,
      stepVoltageV: 0,
      regulation: "linear",
      positions: 5,
      mdu: "none",
    });
    expect(out.ok).toBe(true);
    expect(out.results[0].model).toBe("WSLIV-800Y/170-6x5B");
    expect(out.results[0].seriesCode).toBe("WSL");
    expect(out.results[0].tapCode).toBe("6x5");
    expect(out.results[0].selectorSize).toBe("B");
    expect(out.results.every((r) => r.seriesCode === "WSL")).toBe(true);
  });

  it("600 A / 72.5 Y → WSLIV-600Y/72.5-6x5A", () => {
    const out = selectOltc({
      mounting: "in_tank",
      medium: "oil",
      preferVacuum: false,
      dutyKind: "octc",
      phases: "III",
      connection: "Y",
      throughCurrentA: 600,
      umKv: 72.5,
      stepVoltageV: 0,
      regulation: "linear",
      positions: 6,
      mdu: "none",
    });
    expect(out.ok).toBe(true);
    expect(out.results[0].model).toBe("WSLIV-600Y/72.5-6x5A");
  });

  it("800 A / 72.5 D → WSLII-800D/72.5-6x5A", () => {
    const out = selectOltc({
      mounting: "in_tank",
      medium: "oil",
      preferVacuum: false,
      dutyKind: "octc",
      phases: "III",
      connection: "D",
      throughCurrentA: 800,
      umKv: 72.5,
      stepVoltageV: 0,
      regulation: "linear",
      positions: 6,
      mdu: "none",
    });
    expect(out.ok).toBe(true);
    expect(out.results[0].model).toBe("WSLII-800D/72.5-6x5A");
  });
});

describe("HWV catalogue lock", () => {
  it("HWV is on-tank/external only; currents 400/800/1000; Um 17.5/40.5/72.5", () => {
    const hwv = SERIES.find((s) => s.id === "hwv")!;
    expect(hwv.mounting).toEqual(["on_tank", "external_compartment"]);
    expect(hwv.currents.III).toEqual([400, 800, 1000]);
    expect(hwv.umKv).toEqual([17.5, 40.5, 72.5]);
    expect(hwv.usesSelectorSize).toBe(false);
  });

  it("SHZV III stays 400/600/1000; 1300 A III is SHZVG-1300", () => {
    const shzv = SERIES.find((s) => s.id === "shzv")!;
    expect(shzv.currents.III).toEqual([400, 600, 1000]);
    expect(shzv.currents.III).not.toContain(1300);
    const out = selectOltc({
      mounting: "in_tank",
      medium: "oil_vacuum",
      preferVacuum: true,
      phases: "III",
      connection: "Y",
      throughCurrentA: 1300,
      umKv: 126,
      stepVoltageV: 2000,
      regulation: "reversing",
      plusMinusSteps: 16,
      selectorSize: "DE",
    });
    expect(out.ok).toBe(true);
    expect(out.results[0].seriesCode).toBe("SHZVG");
    expect(out.results[0].model).toContain("SHZVGIII-1300Y/126DE");
    expect(out.results[0].unitCount).toBe(1);
    expect(out.results.every((r) => r.seriesCode !== "SHZV" || r.unitCount > 1)).toBe(
      true,
    );
  });
});
