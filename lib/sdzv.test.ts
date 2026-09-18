import { describe, expect, it } from "vitest";
import { SERIES } from "./catalog";
import { selectOltc } from "./engine";
import { parseTypeString } from "./parseType";
import type { SelectInput } from "./types";
import { commercialTypeExists } from "./typeExists";

const vacY = (over: Partial<SelectInput> = {}): SelectInput => ({
  mounting: "in_tank",
  medium: "oil_vacuum",
  preferVacuum: true,
  phases: "III",
  connection: "Y",
  throughCurrentA: 350,
  umKv: 72.5,
  stepVoltageV: 1500,
  regulation: "reversing",
  plusMinusSteps: 8,
  midPositions: 3,
  mdu: "none",
  ...over,
});

describe("SDZV catalogue lock (2024-11-13 dual-break brochure)", () => {
  const sdzv = SERIES.find((s) => s.id === "sdzv")!;

  it("III 400/600/1000, I 400/600/1000/1600/2400, no II / 1200 / 1300 / 1500", () => {
    expect(sdzv.currents.III).toEqual([400, 600, 1000]);
    expect(sdzv.currents.I).toEqual([400, 600, 1000, 1600, 2400]);
    expect(sdzv.currents.II).toBeUndefined();
    expect(sdzv.currents.I).not.toContain(1200);
    expect(sdzv.currents.I).not.toContain(1500);
    expect(sdzv.currents.III).not.toContain(1300);
    expect(sdzv.maxStepVoltageV).toBe(6000);
    expect(sdzv.maxPositionsLinear).toBe(14);
    expect(sdzv.maxPositionsWithChangeOver).toBe(27);
    expect(sdzv.iiiConnections).toEqual(["Y"]);
    expect(sdzv.umKv).toEqual([72.5, 126, 170, 252, 300, 363]);
  });

  it("accepts sold 2025 strings; rejects invented currents / III-D / I-YD / missing Um", () => {
    expect(commercialTypeExists("SDZVIII-1000Y/126D-12233W")).toBe(true);
    expect(commercialTypeExists("SDZVIII-1000Y/72.5B-18353W")).toBe(true);
    expect(commercialTypeExists("SDZVIII-1000Y/170D-10193W")).toBe(true);
    expect(parseTypeString("SDZVIII1000Y/170D-10193W")?.family).toBe("SDZV");
    expect(commercialTypeExists("SDZVIII-1000D/72.5B-10193W")).toBe(false);
    expect(commercialTypeExists("SDZVIII-1300Y/72.5C-10193W")).toBe(false);
    expect(commercialTypeExists("SDZVI-1200/72.5B-10193W")).toBe(false);
    expect(commercialTypeExists("SDZVII-400/72.5B-10193W")).toBe(false);
    expect(commercialTypeExists("SDZVI-400Y/72.5B-10193W")).toBe(false);
    expect(commercialTypeExists("SDZVIII-400Y/40.5B-10193W")).toBe(false);
  });

  it("Ust 5000 V at 350 A Y picks SDZV-400, not SHZV", () => {
    const out = selectOltc(vacY({ stepVoltageV: 5000 }));
    expect(out.ok).toBe(true);
    expect(out.results[0].seriesCode).toBe("SDZV");
    expect(out.results[0].model).toBe("SDZVIII-400Y/72.5B-10193W");
    expect(commercialTypeExists(out.results[0].model)).toBe(true);
  });

  it("1000 A × 3500 V exceeds SHZV-1000 3000 kVA → SDZV-1000, not SHZVG-1500", () => {
    const out = selectOltc(
      vacY({ throughCurrentA: 1000, stepVoltageV: 3500, umKv: 72.5 }),
    );
    expect(out.ok).toBe(true);
    expect(out.results[0].seriesCode).toBe("SDZV");
    expect(out.results[0].model).toMatch(/^SDZVIII-1000Y\/72\.5B-10193W$/);
    expect(out.results[0].unitCount).toBe(1);
  });

  it("ordinary 350 A / 1500 V still CV2, never SDZV as #1", () => {
    const out = selectOltc(vacY());
    expect(out.ok).toBe(true);
    expect(out.results[0].seriesCode).toBe("CV2");
    expect(out.results[0].model.startsWith("SDZV")).toBe(false);
  });

  it("delta high Ust covers with 3× SDZV I, never SDZVIII-…D", () => {
    const out = selectOltc(
      vacY({ connection: "D", stepVoltageV: 5000, umKv: 72.5 }),
    );
    expect(out.ok).toBe(true);
    const models = out.results.map((r) => r.model);
    expect(models.some((m) => /SDZVIII-\d+D\//.test(m))).toBe(false);
    expect(out.results[0].model).toMatch(/^3xSDZVI-400\/72\.5B-10193W$/);
    expect(commercialTypeExists(out.results[0].model)).toBe(true);
  });

  it("±16 (35 positions) is outside SDZV 27-position envelope", () => {
    const out = selectOltc(
      vacY({ stepVoltageV: 5000, plusMinusSteps: 16, midPositions: 3 }),
    );
    expect(out.results.every((r) => r.seriesCode !== "SDZV")).toBe(true);
  });

  it("400 A × 6000 V exceeds SDZV-400 2250 kVA, so Ium steps to 600", () => {
    const out = selectOltc(vacY({ throughCurrentA: 400, stepVoltageV: 6000 }));
    expect(out.ok).toBe(true);
    expect(out.results[0].model).toBe("SDZVIII-600Y/72.5B-10193W");
    expect(out.results.every((r) => !(r.seriesCode === "SDZV" && r.currentA === 400))).toBe(
      true,
    );
  });

  it("1000 A × 6000 V is past SDZV III-1000 4500 kVA → 3× I-2400, not an invented III", () => {
    const out = selectOltc(vacY({ throughCurrentA: 1000, stepVoltageV: 6000 }));
    expect(out.ok).toBe(true);
    expect(out.results[0].model).toBe("3xSDZVI-1600/72.5B-10193W");
    expect(out.results[0].unitCount).toBe(3);
    expect(commercialTypeExists(out.results[0].model)).toBe(true);
    expect(out.results.some((r) => /SDZVIII-1000/.test(r.model))).toBe(false);
  });
});

const VAC_FAMILIES = new Set([
  "SHZV",
  "SHZVG",
  "SDZV",
  "CM2",
  "CV2",
  "HWV",
  "CVT",
  "CZ",
]);

function assertSdzvLegal(models: string[], bucket: string[]): void {
  for (const m of models) {
    if (!commercialTypeExists(m)) bucket.push(`missing ${m}`);
    if (/SDZVIII-\d+D\//.test(m)) bucket.push(`III-D ${m}`);
    if (/SDZVIII-1300/.test(m) || /SDZVIII-2400/.test(m)) bucket.push(`bad-III ${m}`);
    if (/SDZVI-1200/.test(m) || /SDZVI-1500/.test(m)) bucket.push(`I-extra ${m}`);
    if (/SDZVII-/.test(m)) bucket.push(`II ${m}`);
  }
}

describe("SDZV pressure: every emitted model exists", () => {
  const currents = [200, 350, 400, 600, 800, 1000, 1300, 2400, 2915.9];
  const ums = [72.5, 126, 170];
  const usts = [794, 1500, 3300, 4000, 5000, 6000];
  const conns = ["Y", "D"] as const;
  const pms = [8, 12, 16];

  it("vacuum grid never invents SDZV types", () => {
    const illegal: string[] = [];
    for (const iu of currents) {
      for (const um of ums) {
        for (const ust of usts) {
          for (const conn of conns) {
            for (const pm of pms) {
              const out = selectOltc(
                vacY({
                  throughCurrentA: iu,
                  umKv: um,
                  stepVoltageV: ust,
                  connection: conn,
                  plusMinusSteps: pm,
                }),
              );
              assertSdzvLegal(
                out.results.map((r) => r.model),
                illegal,
              );
            }
          }
        }
      }
    }
    expect(illegal, illegal.slice(0, 20).join(" | ")).toEqual([]);
  });

  it("oil arc never emits vacuum families including SDZV", () => {
    const leaks: string[] = [];
    for (const iu of currents) {
      for (const um of ums) {
        for (const ust of [794, 1500, 5000]) {
          for (const conn of conns) {
            const out = selectOltc(
              vacY({
                preferVacuum: false,
                medium: "oil",
                throughCurrentA: iu,
                umKv: um,
                stepVoltageV: ust,
                connection: conn,
              }),
            );
            for (const r of out.results) {
              if (VAC_FAMILIES.has(r.seriesCode)) {
                leaks.push(`${iu}A ${conn} ${r.model}`);
              }
            }
          }
        }
      }
    }
    expect(leaks, leaks.slice(0, 15).join(" | ")).toEqual([]);
  });

  it("dry-type never emits in-tank SDZV/SHZV", () => {
    const leaks: string[] = [];
    const out = selectOltc({
      mounting: "dry_type",
      medium: "dry",
      preferVacuum: true,
      phases: "III",
      connection: "D",
      throughCurrentA: 500,
      umKv: 40.5,
      stepVoltageV: 5000,
      regulation: "linear",
      positions: 9,
      mdu: "none",
    });
    for (const r of out.results) {
      if (["SDZV", "SHZV", "SHZVG", "CM2", "CV2"].includes(r.seriesCode)) {
        leaks.push(r.model);
      }
    }
    expect(leaks).toEqual([]);
  });
});
