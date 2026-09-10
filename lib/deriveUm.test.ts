import { describe, expect, it } from "vitest";
import {
  deriveOltcUm,
  oltcUmFromRatedKv,
  windingUmFromRatedKv,
} from "./deriveUm";
import { selectOltc } from "./engine";
import type { SelectInput } from "./types";

describe("winding rated kV vs Um", () => {
  it("maps transformer kV to winding Um, not OLTC catalogue steps", () => {
    expect(windingUmFromRatedKv(132)).toBe(145);
    expect(windingUmFromRatedKv(66)).toBe(72.5);
    expect(windingUmFromRatedKv(110)).toBe(126);
    expect(windingUmFromRatedKv(220)).toBe(252);
  });

  it("132 kV star → OLTC 72.5", () => {
    expect(oltcUmFromRatedKv(132, "Y")).toBe(72.5);
    expect(deriveOltcUm(145, "Y")).toBe(72.5);
  });

  it("132 kV delta keeps 145", () => {
    expect(oltcUmFromRatedKv(132, "D")).toBe(145);
  });

  it("110 kV star stays 126", () => {
    expect(oltcUmFromRatedKv(110, "Y")).toBe(126);
  });

  it("220 kV star → 72.5", () => {
    expect(oltcUmFromRatedKv(220, "Y")).toBe(72.5);
  });
});

describe("Wilson Q30136 via 132 kV winding", () => {
  it("132 kV + Y + 1750 A → 3xSHZVI-2400/72.5B-12233W", () => {
    const umKv = oltcUmFromRatedKv(132, "Y");
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
