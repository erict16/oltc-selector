import { describe, expect, it } from "vitest";
import { transformerTapsFromCode } from "./tapCode";

describe("transformer taps from the tap code", () => {
  it("W/G: positions minus mid plus one", () => {
    expect(transformerTapsFromCode("10193W")).toBe(17);
    expect(transformerTapsFromCode("12233W")).toBe(21);
    expect(transformerTapsFromCode("10191G")).toBe(19);
    expect(transformerTapsFromCode("18171W")).toBe(17);
  });
  it("linear and bare counts are the count", () => {
    expect(transformerTapsFromCode("10090")).toBe(9);
    expect(transformerTapsFromCode("9")).toBe(9);
    expect(transformerTapsFromCode("17")).toBe(17);
  });
  it("off-circuit contact codes give nothing", () => {
    expect(transformerTapsFromCode("6x5A")).toBeNull();
  });
});
