import { describe, expect, it } from "vitest";
import { safetyKKeepsCapacity } from "./safetyK";

describe("safetyKKeepsCapacity", () => {
  it("does not leave the capacity path after select or a voltage preset", () => {
    expect(
      safetyKKeepsCapacity({
        currentMode: "current",
        transformerMva: 25,
        windingRatedKv: 110,
      }),
    ).toBe("capacity");
  });

  it("stays on typed current only when there is no MVA to go back to", () => {
    expect(
      safetyKKeepsCapacity({
        currentMode: "current",
        transformerMva: 0,
        windingRatedKv: 110,
      }),
    ).toBe("current");
  });
});
