import { describe, expect, it } from "vitest";
import { displayModel } from "./domesticModel";

describe("displayModel", () => {
  it("writes VCV for CV2 and keeps the rest of the string", () => {
    expect(displayModel("CV2III-350Y/72.5-10193W", "zh")).toBe(
      "VCVIII-350Y/72.5-10193W",
    );
    expect(displayModel("CV2III-600D/145-12233W", "zh")).toBe(
      "VCVIII-600D/145-12233W",
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
    for (const lang of ["en", "vi", "es", "tr", "ru"]) {
      expect(displayModel(model, lang)).toBe(model);
    }
  });
});
