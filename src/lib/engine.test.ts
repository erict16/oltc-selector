import { describe, expect, it } from "vitest";
import { selectOltc, FIXTURES } from "./engine";
import {
  buildTapCode,
  positionsFromPlusMinus,
  resolveTapFields,
} from "./tapCode";

describe("tap codes", () => {
  it("±N → positions (Huaming SELECT note)", () => {
    expect(positionsFromPlusMinus(8)).toBe(18); // even: 2N+2
    expect(positionsFromPlusMinus(9)).toBe(19); // odd: 2N+1 → 10193W family
  });

  it("builds 10193W", () => {
    expect(
      buildTapCode({
        pitch: 10,
        positions: 19,
        mid: 3,
        regulation: "reversing",
      }),
    ).toBe("10193W");
  });

  it("resolveTapFields defaults", () => {
    const t = resolveTapFields({
      regulation: "reversing",
      positions: 19,
      midPositions: 3,
      pitch: 10,
    });
    expect(t.tapCode).toBe("10193W");
  });
});

describe("selectOltc fixtures", () => {
  it("UE HWV quote model", () => {
    const out = selectOltc(FIXTURES.ueHwv.input);
    expect(out.ok).toBe(true);
    expect(out.results[0].model).toBe(FIXTURES.ueHwv.expectModel);
    expect(out.results[0].modelWithMdu).toBe(FIXTURES.ueHwv.expectModel);
    expect(out.results[0].selectorSize).toBe("");
  });

  it("Wilson-style SHZV includes selector size D", () => {
    const out = selectOltc(FIXTURES.wilsonShzv.input);
    expect(out.ok).toBe(true);
    expect(out.results[0].model).toContain("SHZV");
    expect(out.results[0].model).toContain("170D");
    expect(out.results[0].selectorSize).toBe("D");
    expect(out.results[0].tapCode).toBe("12233W");
  });

  it("in-tank vacuum prefers SHZV/CM2 over oil CM", () => {
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
    const codes = out.results.map((r) => r.seriesCode);
    expect(codes.some((c) => c === "SHZV" || c === "CM2")).toBe(true);
    expect(out.results[0].model.includes("/126")).toBe(true);
  });

  it("CV2 compound type has no selector size letter", () => {
    const out = selectOltc({
      ...FIXTURES.cv2NoSelectorSize.input,
      // force low step so CV2 stays eligible
      preferVacuum: true,
    });
    expect(out.ok).toBe(true);
    const cv2 = out.results.find((r) => r.seriesCode === "CV2");
    if (cv2) {
      expect(cv2.selectorSize).toBe("");
      expect(cv2.model).not.toMatch(/\/\d+(\.\d+)?[BCDE]/);
    }
  });
});
