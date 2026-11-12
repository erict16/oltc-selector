import { describe, expect, it } from "vitest";
import {
  DEFAULT_WINDING_RATED_KV,
  calculatedUm,
  catalogueUmFromRatedKv,
  formatUmKv,
  iecUmFromRatedKv,
  isTapSideRatedKv,
  maxThroughCurrent,
  stepPercentFromUst,
  stepVoltageFromPercent,
  throughCurrentFromRated,
} from "./deriveUm";
import { selectOltc } from "./engine";
import { FIXTURES } from "./engine.fixtures";
import { deriveDuty } from "./transformer";
import type { SelectInput } from "./types";

/**
 * The one shipped Um rule (deriveDuty): Y = star neutral, D = line end.
 * 2026-11-04 audit UM-7 removed the second rule (oltcUmFromRatedKv), which
 * kept 220 kV star at 252 while the app gave 72.5.
 */
function oltcUmFromRatedKv(ratedKv: number, connection: "Y" | "D"): number {
  return deriveDuty({
    kind: "two_winding",
    tapPoint: connection === "Y" ? "neutral" : "line_end",
    winding: connection === "Y" ? "star" : "delta",
    mva: 0,
    tapKv: ratedKv,
    hvKv: 0,
    mvKv: 0,
    minusSteps: 0,
    stepFraction: null,
    safetyK: 1,
  }).umKv;
}

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

describe("calculated Um on the form", () => {
  it("D keeps the tap voltage, Y divides by √3", () => {
    expect(calculatedUm(110, "D")).toBe(110);
    expect(calculatedUm(110, "Y")).toBeCloseTo(110 / Math.sqrt(3), 6);
    expect(calculatedUm(220, "Y")).toBeCloseTo(220 / Math.sqrt(3), 6);
    expect(calculatedUm(132, "Y")).toBeCloseTo(132 / Math.sqrt(3), 6);
    expect(formatUmKv(calculatedUm(110, "Y"))).toBe("63.5");
    expect(formatUmKv(calculatedUm(110, "D"))).toBe("110");
    expect(formatUmKv(calculatedUm(220, "Y"))).toBe("127");
    expect(formatUmKv(calculatedUm(132, "Y"))).toBe("76.2");
  });

  function sized(connection: "Y" | "D", ratedKv: number) {
    return selectOltc({
      mounting: "in_tank",
      medium: "oil_vacuum",
      preferVacuum: true,
      phases: "III",
      connection,
      throughCurrentA: 200,
      umKv: calculatedUm(ratedKv, connection),
      stepVoltageV: 1500,
      regulation: "reversing",
      plusMinusSteps: 8,
      midPositions: 3,
      preferStructure: "auto",
      mdu: "none",
    });
  }

  it("round-up of Un/√3 misses the neutral class, so select must not send it", () => {
    // 110/√3 = 63.5 still lands on 72.5. That coincidence is not the rule.
    const star110 = sized("Y", 110);
    expect(star110.ok).toBe(true);
    expect(star110.results[0]!.model).toMatch(/\/72\.5/);

    // 132/√3 = 76.2 is already above 72.5, so the next catalogue step is 126.
    const over = sized("Y", 132);
    expect(over.ok).toBe(true);
    expect(over.results[0]!.model).toMatch(/\/126/);
    const neutral = selectOltc({
      mounting: "in_tank",
      medium: "oil_vacuum",
      preferVacuum: true,
      phases: "III",
      connection: "Y",
      throughCurrentA: 200,
      umKv: oltcUmFromRatedKv(132, "Y"),
      stepVoltageV: 1500,
      regulation: "reversing",
      plusMinusSteps: 8,
      midPositions: 3,
      preferStructure: "auto",
      mdu: "none",
    });
    expect(neutral.ok).toBe(true);
    expect(neutral.results[0]!.model).toMatch(/\/72\.5/);

    // 66/√3 = 38.1 would pick 40.5. The winding class is 72.5.
    const low = sized("Y", 66);
    expect(low.results[0]!.model).toMatch(/\/40\.5/);
    expect(oltcUmFromRatedKv(66, "Y")).toBe(72.5);

    // 220/√3 = 127 would land on 126. The neutral is 72.5, assumed.
    const high = sized("Y", 220);
    expect(high.results[0]!.model).not.toMatch(/\/252/);
    expect(oltcUmFromRatedKv(220, "Y")).toBe(72.5);
  });
});

describe("first-paint tap-side Un", () => {
  it("defaults to 110 kV; star still Um 72.5", () => {
    expect(DEFAULT_WINDING_RATED_KV).toBe(110);
    expect(oltcUmFromRatedKv(DEFAULT_WINDING_RATED_KV, "Y")).toBe(72.5);
  });
});

describe("winding Un → winding Um", () => {
  it("catalogue class of the winding system", () => {
    expect(catalogueUmFromRatedKv(33)).toBe(40.5);
    expect(catalogueUmFromRatedKv(35)).toBe(40.5);
    expect(catalogueUmFromRatedKv(66)).toBe(72.5);
    expect(catalogueUmFromRatedKv(69)).toBe(72.5);
    expect(catalogueUmFromRatedKv(110)).toBe(126);
    expect(catalogueUmFromRatedKv(115)).toBe(126);
    expect(catalogueUmFromRatedKv(132)).toBe(145);
    expect(catalogueUmFromRatedKv(138)).toBe(145);
    expect(catalogueUmFromRatedKv(150)).toBe(170);
    expect(catalogueUmFromRatedKv(220)).toBe(252);
    expect(catalogueUmFromRatedKv(230)).toBe(252);
    expect(catalogueUmFromRatedKv(330)).toBe(363);
  });
});

describe("star vs line-end → OLTC Um", () => {
  it("132 / 138 kV star → 72.5 (Wilson / WEG)", () => {
    expect(oltcUmFromRatedKv(132, "Y")).toBe(72.5);
    expect(oltcUmFromRatedKv(138, "Y")).toBe(72.5);
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

  it("220 / 230 / 330 kV star neutral → 72.5 assumed (Russia 18 of 20 at 220 kV)", () => {
    expect(oltcUmFromRatedKv(220, "Y")).toBe(72.5);
    expect(oltcUmFromRatedKv(230, "Y")).toBe(72.5);
    expect(oltcUmFromRatedKv(330, "Y")).toBe(72.5);
  });

  it("220 kV delta keeps 252", () => {
    expect(oltcUmFromRatedKv(220, "D")).toBe(252);
  });

  it("line end does not drop", () => {
    expect(oltcUmFromRatedKv(132, "D")).toBe(145);
    expect(oltcUmFromRatedKv(330, "D")).toBe(363);
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

  it("±8 × 1.25% at 110 kV star: Imax is rated / 0.9", () => {
    const rated = throughCurrentFromRated(25, 110, "Y");
    expect(rated).toBeCloseTo(131.2, 0);
    expect(maxThroughCurrent(rated, 8, 0.0125)).toBeCloseTo(rated / 0.9, 1);
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

  it("220 kV Y neutral is combined CM2 at 72.5, not CV2", () => {
    const umKv = oltcUmFromRatedKv(220, "Y");
    expect(umKv).toBe(72.5);
    const out = selectOltc(
      duty(umKv, { throughCurrentA: 500, stepVoltageV: 1800, combinedOnly: true }),
    );
    expect(out.ok).toBe(true);
    expect(out.results[0]?.model).toBe("CM2III-500Y/72.5B-10193W");
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

describe("iecUmFromRatedKv", () => {
  it("gives the IEC 60038 Um, not the catalogue class", () => {
    const cases: [number, number][] = [
      [6.6, 7.2], [11, 12], [13.8, 17.5], [22, 24], [33, 36], [34.5, 36], [38.5, 40.5], [10.5, 12],
      [35, 40.5], [66, 72.5], [69, 72.5], [110, 123], [115, 123], [121, 123],
      [132, 145], [138, 145], [150, 170], [154, 170], [220, 245],
      [225, 245], [230, 245], [242, 245], [330, 362], [345, 362], [400, 420], [500, 550],
    ];
    for (const [un, um] of cases) expect(iecUmFromRatedKv(un)).toBe(um);
  });

  // 2026-11-04 audit UM-8: 420 kV went to 550.
  it("420 kV nameplate is the 400 kV system (Um 420); 440 kV still 550", () => {
    expect(iecUmFromRatedKv(420)).toBe(420);
    expect(iecUmFromRatedKv(410)).toBe(420);
    expect(iecUmFromRatedKv(380)).toBe(420);
    expect(iecUmFromRatedKv(440)).toBe(550);
    expect(iecUmFromRatedKv(460)).toBe(550);
    expect(iecUmFromRatedKv(525)).toBe(550);
    expect(iecUmFromRatedKv(121)).toBe(123);
    expect(iecUmFromRatedKv(161)).toBe(170);
  });

  it("is NaN without a voltage", () => {
    expect(iecUmFromRatedKv(0)).toBeNaN();
  });

  it("catalogue class covers the actual Um and matches the menu map", () => {
    expect(catalogueUmFromRatedKv(22)).toBe(40.5);
    expect(catalogueUmFromRatedKv(11)).toBe(12);
    const menu: Record<number, number> = {
      33: 40.5, 35: 40.5, 66: 72.5, 69: 72.5, 110: 126, 115: 126,
      132: 145, 138: 145, 150: 170, 220: 252, 230: 252, 330: 363,
    };
    for (const [kv, um] of Object.entries(menu)) {
      expect(catalogueUmFromRatedKv(Number(kv))).toBe(um);
    }
  });
});
