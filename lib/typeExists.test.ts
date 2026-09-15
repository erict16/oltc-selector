import { describe, expect, it } from "vitest";
import { lookupListPrice } from "./basePrices";
import { SERIES } from "./catalog";
import { selectOltc } from "./engine";
import type { SelectInput } from "./types";
import { commercialTypeExists, III_D_FAMILIES } from "./typeExists";

const vacDelta = (over: Partial<SelectInput> = {}): SelectInput => ({
  mounting: "in_tank",
  medium: "oil_vacuum",
  preferVacuum: true,
  phases: "III",
  connection: "D",
  throughCurrentA: 350,
  umKv: 72.5,
  stepVoltageV: 1500,
  regulation: "reversing",
  plusMinusSteps: 8,
  midPositions: 3,
  mdu: "none",
  ...over,
});

const STAR_ONLY_III_D = /(?:CM2|CM|CMD|SHZV|SHZVG)III-\d+D\//;
const COMPOUND_GRADE = /(?:CV2|CV|SV|CVT)III-\d+[YD]\/\d+(?:\.\d+)?[BCDE]/;
const SINGLE_PHASE_YD = /(?:CM2|CM|CMD|SHZV|SHZVG)I-\d+[YD]\//;
const CM2_II_YD = /(?:CM2|CM|CMD)II-\d+[YD]\//;

describe("commercialTypeExists (brochure oracle, not price-list Y/D twin)", () => {
  it("rejects CM2III-…D even though the 2025 list aliases D to the Y price row", () => {
    const fake = "CM2III-500D/170D-10193W";
    expect(lookupListPrice(fake).found).toBe(true);
    expect(commercialTypeExists(fake)).toBe(false);
  });

  it("accepts CM2III-…Y, 3xCM2I, CV2III-…D, HWVIII-…D", () => {
    expect(commercialTypeExists("CM2III-500Y/72.5B-10193W")).toBe(true);
    expect(commercialTypeExists("3xCM2I-800/72.5B-10191W")).toBe(true);
    expect(commercialTypeExists("CV2III-350D/40.5-10193W")).toBe(true);
    expect(commercialTypeExists("HWVIII-800D/40.5-10193W")).toBe(true);
  });

  it("rejects CV2-500, compound grade letters, and I-phase Y/D after current", () => {
    expect(commercialTypeExists("CV2III-500D/40.5-10193W")).toBe(false);
    expect(commercialTypeExists("CV2III-350D/40.5B-10193W")).toBe(false);
    expect(commercialTypeExists("CM2I-800D/72.5B-10191W")).toBe(false);
    expect(commercialTypeExists("CM2II-500D/72.5B-10193W")).toBe(false);
  });
});

describe("selectOltc never emits a non-brochure type", () => {
  const assertLegal = (models: string[]) => {
    for (const m of models) {
      expect(STAR_ONLY_III_D.test(m), m).toBe(false);
      expect(COMPOUND_GRADE.test(m), m).toBe(false);
      expect(SINGLE_PHASE_YD.test(m), m).toBe(false);
      expect(CM2_II_YD.test(m), m).toBe(false);
      expect(/CV2III-500/.test(m), m).toBe(false);
      expect(commercialTypeExists(m), m).toBe(true);
    }
  };

  it("combined in-tank Δ: no III-D; 3× I cover is allowed", () => {
    const out = selectOltc(
      vacDelta({ throughCurrentA: 346.3, umKv: 145, stepVoltageV: 1650, plusMinusSteps: 10 }),
    );
    expect(out.ok).toBe(true);
    assertLegal(out.results.map((r) => r.model));
    expect(out.results.some((r) => r.model.startsWith("3xCM2I-"))).toBe(true);
    expect(out.results.some((r) => STAR_ONLY_III_D.test(r.model))).toBe(false);
  });

  it("compound Δ still returns CV2/CV/SV III-D when those families cover", () => {
    const cv2 = selectOltc(vacDelta({ umKv: 40.5, throughCurrentA: 350 }));
    expect(cv2.results[0].model).toMatch(/^CV2III-\d+D\//);
    assertLegal(cv2.results.map((r) => r.model));

    const oil = selectOltc({
      ...vacDelta({ umKv: 40.5, throughCurrentA: 350, stepVoltageV: 1000 }),
      preferVacuum: false,
      medium: "oil",
    });
    expect(oil.results.some((r) => /^CVIII-\d+D\//.test(r.model) || /^SVIII-\d+D\//.test(r.model))).toBe(
      true,
    );
    assertLegal(oil.results.map((r) => r.model));
  });

  it("on-tank HWV Δ still returns HWVIII-…D", () => {
    const out = selectOltc({
      mounting: "on_tank",
      medium: "oil_vacuum",
      preferVacuum: true,
      phases: "III",
      connection: "D",
      throughCurrentA: 400,
      umKv: 40.5,
      stepVoltageV: 1000,
      regulation: "reversing",
      plusMinusSteps: 8,
      mdu: "none",
    });
    expect(out.results[0].model).toMatch(/^HWVIII-\d+D\//);
    assertLegal(out.results.map((r) => r.model));
    expect(III_D_FAMILIES).toContain("hwv");
  });

  it("does not invent CV2-500", () => {
    const out = selectOltc(vacDelta({ throughCurrentA: 500, umKv: 40.5 }));
    assertLegal(out.results.map((r) => r.model));
    expect(out.results.every((r) => r.seriesCode !== "CV2" || r.currentA !== 500)).toBe(
      true,
    );
  });

  it("OCTC does not emit a 2025-list missing row (WSLIV-2000D/126, 7x6E @ 72.5)", () => {
    const missing = selectOltc({
      mounting: "in_tank",
      medium: "oil",
      preferVacuum: false,
      dutyKind: "octc",
      octcSeries: "IV",
      phases: "III",
      connection: "D",
      throughCurrentA: 2000,
      umKv: 126,
      stepVoltageV: 0,
      regulation: "linear",
      positions: 6,
      mdu: "none",
    });
    expect(missing.results.every((r) => r.model !== "WSLIV-2000D/126-6x5B")).toBe(
      true,
    );
    for (const r of missing.results) {
      expect(lookupListPrice(r.model).found, r.model).toBe(true);
    }

    const eSize = selectOltc({
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
      positions: 7,
      octcContact: "7x6",
      selectorSize: "E",
      mdu: "none",
    });
    expect(eSize.results.every((r) => !r.model.includes("7x6E"))).toBe(true);
    for (const r of eSize.results) {
      expect(lookupListPrice(r.model).found, r.model).toBe(true);
    }
  });

  it("CM2 II omits Y/D; II-D is not a type", () => {
    const out = selectOltc(
      vacDelta({ phases: "II", throughCurrentA: 500, umKv: 72.5 }),
    );
    expect(out.ok).toBe(true);
    assertLegal(out.results.map((r) => r.model));
    expect(out.results.every((r) => !/CM2II-\d+D\//.test(r.model))).toBe(true);
  });
});

describe("catalogue axes vs extracts", () => {
  it("CV2 has no II current (brochure III/I only)", () => {
    const cv2 = SERIES.find((s) => s.id === "cv2")!;
    expect(cv2.currents.II).toBeUndefined();
  });

  it("star-only families declare iiiConnections Y", () => {
    for (const id of ["cm", "cm2", "cmd", "shzv", "shzvg"]) {
      const s = SERIES.find((row) => row.id === id)!;
      expect(s.iiiConnections, id).toEqual(["Y"]);
    }
  });
});
