import { describe, expect, it } from "vitest";
import {
  DEFAULT_WINDING_RATED_KV,
  deriveOltcUm,
  isTapSideRatedKv,
  maxThroughCurrent,
  oltcUmFromRatedKv,
  snapRatedKv,
  stepPercentFromUst,
  stepVoltageFromPercent,
  throughCurrentFromRated,
  windingUmFromRatedKv,
} from "./deriveUm";
import { FIXTURES, selectOltc } from "./engine";
import type { SelectInput } from "./types";

const duty = (
  umKv: number,
  extra: Partial<SelectInput> = {},
): SelectInput => ({
  mounting: "in_tank",
  medium: "oil_vacuum",
  preferVacuum: true,
  phases: "III",
  connection: "Y",
  throughCurrentA: 400,
  umKv,
  stepVoltageV: 1500,
  regulation: "reversing",
  plusMinusSteps: 8,
  midPositions: 3,
  selectorSize: "auto",
  mdu: "none",
  ...extra,
});

describe("snap nameplate Un", () => {
  it("keeps menu values", () => {
    expect(snapRatedKv(132)).toBe(132);
    expect(snapRatedKv(138)).toBe(138);
    expect(snapRatedKv(115)).toBe(115);
    expect(snapRatedKv(33)).toBe(33);
  });

  it("snaps nearby OS Un onto the menu class", () => {
    expect(snapRatedKv(135)).toBe(132);
    expect(snapRatedKv(121)).toBe(115);
    expect(snapRatedKv(158)).toBe(150);
    expect(snapRatedKv(154)).toBe(150);
    expect(snapRatedKv(225)).toBe(220);
    expect(snapRatedKv(242)).toBe(230);
  });

  it("does not swallow far outliers", () => {
    expect(snapRatedKv(10.5)).toBe(10.5);
    expect(snapRatedKv(400)).toBe(400);
    expect(snapRatedKv(725)).toBe(725);
  });
});

describe("first-paint tap-side Un", () => {
  it("defaults to 110 kV; star still Um 72.5", () => {
    expect(DEFAULT_WINDING_RATED_KV).toBe(110);
    expect(oltcUmFromRatedKv(DEFAULT_WINDING_RATED_KV, "Y")).toBe(72.5);
  });
});

describe("winding Un → winding Um", () => {
  it("IEC / GB class, not OLTC catalogue yet", () => {
    expect(windingUmFromRatedKv(33)).toBe(40.5);
    expect(windingUmFromRatedKv(35)).toBe(40.5);
    expect(windingUmFromRatedKv(66)).toBe(72.5);
    expect(windingUmFromRatedKv(69)).toBe(72.5);
    expect(windingUmFromRatedKv(110)).toBe(126);
    expect(windingUmFromRatedKv(115)).toBe(126);
    expect(windingUmFromRatedKv(132)).toBe(145);
    expect(windingUmFromRatedKv(138)).toBe(145);
    expect(windingUmFromRatedKv(150)).toBe(170);
    expect(windingUmFromRatedKv(220)).toBe(252);
    expect(windingUmFromRatedKv(230)).toBe(252);
    expect(windingUmFromRatedKv(330)).toBe(363);
  });
});

describe("star vs line-end → OLTC Um", () => {
  it("132 / 138 kV star → 72.5 (Wilson / WEG)", () => {
    expect(oltcUmFromRatedKv(132, "Y")).toBe(72.5);
    expect(oltcUmFromRatedKv(138, "Y")).toBe(72.5);
    expect(deriveOltcUm(145, "Y")).toBe(72.5);
  });

  it("132 / 138 kV delta keeps 145", () => {
    expect(oltcUmFromRatedKv(132, "D")).toBe(145);
    expect(oltcUmFromRatedKv(138, "D")).toBe(145);
  });

  it("110 / 115 kV star → 72.5 (2026 OS majority)", () => {
    expect(oltcUmFromRatedKv(110, "Y")).toBe(72.5);
    expect(oltcUmFromRatedKv(115, "Y")).toBe(72.5);
  });

  it("110 kV delta stays 126", () => {
    expect(oltcUmFromRatedKv(110, "D")).toBe(126);
  });

  it("66 / 69 kV star stays 72.5", () => {
    expect(oltcUmFromRatedKv(66, "Y")).toBe(72.5);
    expect(oltcUmFromRatedKv(69, "Y")).toBe(72.5);
  });

  it("33 / 35 kV star stays 40.5 (do not upsize to 72.5)", () => {
    expect(oltcUmFromRatedKv(33, "Y")).toBe(40.5);
    expect(oltcUmFromRatedKv(35, "Y")).toBe(40.5);
    expect(oltcUmFromRatedKv(33, "D")).toBe(40.5);
  });

  it("220 / 230 kV star keeps 252 (not CV2 / 72.5)", () => {
    expect(oltcUmFromRatedKv(220, "Y")).toBe(252);
    expect(oltcUmFromRatedKv(230, "Y")).toBe(252);
  });

  it("220 kV delta keeps 252", () => {
    expect(oltcUmFromRatedKv(220, "D")).toBe(252);
  });

  it("330 kV star keeps 363", () => {
    expect(oltcUmFromRatedKv(330, "Y")).toBe(363);
  });

  it("any / line-end does not drop", () => {
    expect(oltcUmFromRatedKv(132, "any")).toBe(145);
    expect(oltcUmFromRatedKv(220, "any")).toBe(252);
  });
});

describe("tap-side check I = S / U", () => {
  it("Wilson 350 MVA 132 kV star −12.5% → 1750 A is tap-side", () => {
    const iRated = throughCurrentFromRated(350, 132, "Y");
    expect(iRated).toBeCloseTo(1531, 0);
    expect(
      isTapSideRatedKv({
        mva: 350,
        ratedKv: 132,
        dutyA: 1750,
        connection: "Y",
      }),
    ).toBe(true);
  });

  it("rejects HV when current is on the other winding", () => {
    expect(
      isTapSideRatedKv({
        mva: 167,
        ratedKv: 10.5,
        dutyA: 1321,
        connection: "Y",
      }),
    ).toBe(false);
  });

  it("delta uses P/(3U)", () => {
    const i = throughCurrentFromRated(40, 138, "D");
    expect(i).toBeCloseTo(96.6, 0);
  });

  it("SFZ22-25000 35 kV delta HV tap → 238 A", () => {
    expect(throughCurrentFromRated(25, 35, "D")).toBeCloseTo(238.1, 0);
  });

  it("50 MVA 110 kV star → 262 A", () => {
    expect(throughCurrentFromRated(50, 110, "Y")).toBeCloseTo(262.4, 0);
  });

  it("SFZ +4/−2 × 2.5% uses min-tap current, not rated", () => {
    const rated = throughCurrentFromRated(25, 35, "D");
    const iMax = maxThroughCurrent(rated, 2, 0.025);
    expect(iMax).toBeCloseTo(rated / 0.95, 1);
    expect(iMax).toBeCloseTo(250.6, 0);
  });

  it("Ust 875 V on 35 kV delta is 2.5%", () => {
    expect(stepPercentFromUst(875, 35, "D")).toBeCloseTo(0.025, 5);
    expect(stepVoltageFromPercent(35, 0.025, "D")).toBeCloseTo(875, 0);
  });
});

describe("same model as filling Um", () => {
  it("132 kV Y equals typing Um 72.5", () => {
    const fromRated = selectOltc(
      duty(oltcUmFromRatedKv(132, "Y"), { connection: "Y" }),
    );
    const fromUm = selectOltc(duty(72.5, { connection: "Y" }));
    expect(fromRated.ok && fromUm.ok).toBe(true);
    expect(fromRated.results[0]?.model).toBe(fromUm.results[0]?.model);
  });

  it("132 kV D equals typing Um 145", () => {
    const fromRated = selectOltc(
      duty(oltcUmFromRatedKv(132, "D"), { connection: "D", throughCurrentA: 350 }),
    );
    const fromUm = selectOltc(
      duty(145, { connection: "D", throughCurrentA: 350 }),
    );
    expect(fromRated.ok && fromUm.ok).toBe(true);
    expect(fromRated.results[0]?.model).toBe(fromUm.results[0]?.model);
  });

  it("110 kV Y chip path is CV2 /72.5, not /126", () => {
    const umKv = oltcUmFromRatedKv(110, "Y");
    const out = selectOltc(duty(umKv, { throughCurrentA: 400 }));
    expect(out.ok).toBe(true);
    expect(out.results[0]?.model).toBe("CV2III-600Y/72.5-10193W");
    expect(out.results[0]?.model).not.toBe(FIXTURES.preset110.expectModel);
  });

  it("220 kV Y is CM2 /252, not CV2 /72.5", () => {
    const umKv = oltcUmFromRatedKv(220, "Y");
    expect(umKv).toBe(252);
    const out = selectOltc(
      duty(umKv, { throughCurrentA: 500, stepVoltageV: 1800 }),
    );
    expect(out.ok).toBe(true);
    expect(out.results[0]?.model).toBe("CM2III-500Y/252D-10193W");
    expect(out.results[0]?.model).not.toContain("/72.5");
  });
});

describe("Wilson Q30136 via 132 kV tap-side", () => {
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

describe("training cases from tap-side Un", () => {
  it("33 kV Δ → 40.5", () => {
    expect(oltcUmFromRatedKv(33, "D")).toBe(40.5);
    const out = selectOltc({
      ...FIXTURES.case1Cv2.input,
      umKv: oltcUmFromRatedKv(33, "D"),
    });
    expect(out.ok).toBe(true);
    expect(out.results[0]?.model).toBe(FIXTURES.case1Cv2.expectModel);
  });

  it("138 kV Y → 72.5 (103 MVA training)", () => {
    expect(oltcUmFromRatedKv(138, "Y")).toBe(72.5);
  });
});
