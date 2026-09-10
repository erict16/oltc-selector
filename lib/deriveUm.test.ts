import { describe, expect, it } from "vitest";
import { deriveOltcUm } from "./deriveUm";
import { selectOltc } from "./engine";
import type { SelectInput } from "./types";

describe("deriveOltcUm", () => {
  it("132 kV class star (145) → 72.5", () => {
    expect(deriveOltcUm(145, "Y")).toBe(72.5);
  });

  it("220 kV class star (252) → 72.5", () => {
    expect(deriveOltcUm(252, "Y")).toBe(72.5);
  });

  it("110 kV class star (126) stays 126", () => {
    expect(deriveOltcUm(126, "Y")).toBe(126);
  });

  it("66 kV class star (72.5) stays 72.5", () => {
    expect(deriveOltcUm(72.5, "Y")).toBe(72.5);
  });

  it("delta / line end keeps winding Um", () => {
    expect(deriveOltcUm(145, "D")).toBe(145);
    expect(deriveOltcUm(252, "any")).toBe(252);
  });
});

describe("Wilson Q30136 via winding Um", () => {
  it("145 kV winding + Y + 1750 A → 3xSHZVI-2400/72.5B-12233W", () => {
    const umKv = deriveOltcUm(145, "Y");
    const input: SelectInput = {
      mounting: "in_tank",
      medium: "oil_vacuum",
      preferVacuum: true,
      phases: "III",
      connection: "Y",
      throughCurrentA: 1750,
      umKv,
      stepVoltageV: 1650,
      regulation: "reversing",
      plusMinusSteps: 10,
      midPositions: 3,
      selectorSize: "auto",
      mdu: "none",
    };
    const out = selectOltc(input);
    expect(out.ok).toBe(true);
    expect(out.results[0]?.model).toBe("3xSHZVI-2400/72.5B-12233W");
  });
});
