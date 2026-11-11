import { describe, expect, it } from "vitest";
import { displayModel } from "./domesticModel";

describe("displayModel", () => {
  it("writes VCV-G for CV2 and keeps the rest of the string", () => {
    expect(displayModel("CV2III-350Y/72.5-10193W", "zh")).toBe(
      "VCV-GIII-350Y/72.5-10193W",
    );
    expect(displayModel("CV2III-600D/145-12233W", "zh")).toBe(
      "VCV-GIII-600D/145-12233W",
    );
  });

  it("writes VCM for CM2, including a 3x lead", () => {
    expect(displayModel("CM2III-500Y/72.5B-10193W", "zh")).toBe(
      "VCMIII-500Y/72.5B-10193W",
    );
    expect(displayModel("3xCM2I-1500/72.5D-12231", "zh")).toBe(
      "3xVCMI-1500/72.5D-12231",
    );
    expect(displayModel("3×CM2I-800/72.5D-10193W", "zh")).toBe(
      "3×VCMI-800/72.5D-10193W",
    );
  });

  it("writes CHVT for SHZVG and leaves SHZV as printed in the Chinese book", () => {
    expect(displayModel("SHZVGIII-1300Y/126DE-18353W", "zh")).toBe(
      "CHVTIII-1300Y/126DE-18353W",
    );
    expect(displayModel("SHZVGIII-1500Y/72.5C-10193W", "zh")).toBe(
      "CHVTIII-1500Y/72.5C-10193W",
    );
    expect(displayModel("SHZVIII-600Y/126C-10193W", "zh")).toBe(
      "SHZVIII-600Y/126C-10193W",
    );
    expect(displayModel("3xSHZVI-2400/72.5B-12233W", "zh")).toBe(
      "3xSHZVI-2400/72.5B-12233W",
    );
  });

  it("does not rename CV, CM, SDZV, or HWV", () => {
    for (const model of [
      "CVIII-350Y/72.5-10193W",
      "CMIII-600Y/126C-10193W",
      "SDZVIII-600Y/72.5B-10193W",
      "HWVIII-600Y/72.5-10193W",
    ]) {
      expect(displayModel(model, "zh")).toBe(model);
    }
  });

  it("keeps the export code in every other language", () => {
    const model = "CV2III-350Y/72.5-10193W";
    for (const lang of ["en", "vi", "es", "tr", "id"]) {
      expect(displayModel(model, lang)).toBe(model);
    }
  });
});

import { displayNote } from "./domesticModel";
import { pastedDecimal } from "./decimal";

describe("notes on the Chinese screen use the shown family names", () => {
  it("swaps CV2 / CM2 / SHZVG, leaves SHZV, CV and CM", () => {
    expect(displayNote("超出最大额定（3000 A，3×SHZVGI-3000）。", "zh")).toBe("超出最大额定（3000 A，3×CHVTI-3000）。");
    expect(displayNote("CM/CM2/SHZV 最低就是 72.5。", "zh")).toBe("CM/VCM/SHZV 最低就是 72.5。");
    expect(displayNote("→ 3×SHZVI-600/252D-10193W", "zh")).toBe("→ 3×SHZVI-600/252D-10193W");
    expect(displayNote("CV2III-350Y and CV/SV", "zh")).toBe("VCV-GIII-350Y and CV/SV");
  });
  it("other languages keep the export code", () => {
    expect(displayNote("CM/CM2/SHZV start at 72.5.", "en")).toBe("CM/CM2/SHZV start at 72.5.");
  });
});

describe("a pasted number with its unit", () => {
  it("keeps the number", () => {
    expect(pastedDecimal("25 MVA")).toEqual({ draft: "25", value: 25 });
    expect(pastedDecimal("38,5kV")).toEqual({ draft: "38.5", value: 38.5 });
    expect(pastedDecimal(" 1.25% ")).toEqual({ draft: "1.25", value: 1.25 });
    expect(pastedDecimal("400")).toEqual({ draft: "400", value: 400 });
  });
  it("still refuses hex, exponent and words", () => {
    expect(pastedDecimal("0x400")).toBeNull();
    expect(pastedDecimal("1e3")).toBeNull();
    expect(pastedDecimal("abc")).toBeNull();
    expect(pastedDecimal("25 MVA 110 kV")).toBeNull();
  });
});
