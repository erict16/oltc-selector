import { describe, expect, it } from "vitest";
import { familyColumn, priceWithCoeff } from "./coefficients";

describe("priceWithCoeff", () => {
  it("list market is ×1", () => {
    expect(
      priceWithCoeff(188200, "CM2III-500Y/72.5B-10193W", "list"),
    ).toEqual({ found: true, coeff: 1, sellRmb: 188200 });
  });

  it("Vietnam OLTC 1.1 and OCTC 2.8", () => {
    expect(
      priceWithCoeff(188200, "CM2III-500Y/72.5B-10193W", "vietnam"),
    ).toEqual({ found: true, coeff: 1.1, sellRmb: 207020 });
    expect(
      priceWithCoeff(97500, "WSLIV-800Y/170-6x5B", "vietnam"),
    ).toEqual({ found: true, coeff: 2.8, sellRmb: 273000 });
  });

  it("Australia vacuum / HWV is 1.3", () => {
    expect(
      priceWithCoeff(148700, "CV2III-350D/40.5-10193W", "australia"),
    ).toEqual({ found: true, coeff: 1.3, sellRmb: 193310 });
    expect(
      priceWithCoeff(225000, "HWVIII-400Y/72.5-10193W", "australia"),
    ).toEqual({ found: true, coeff: 1.3, sellRmb: 292500 });
  });

  it("does not invent a missing cell", () => {
    expect(familyColumn("CM2")).toBe("cm2");
    expect(
      priceWithCoeff(188200, "not-a-type", "vietnam"),
    ).toEqual({ found: false, reason: "unparsed" });
  });
});
