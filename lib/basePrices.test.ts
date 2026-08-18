import { describe, expect, it } from "vitest";
import { lookupListPrice, BASE_PRICE_META } from "./basePrices";
import { convertFromCny, LIST_CURRENCIES } from "./fx";

describe("base price list 2025", () => {
  it("parsed a real catalogue, not an empty stub", () => {
    expect(BASE_PRICE_META.rowCount).toBeGreaterThan(1000);
  });

  it("looks up CV2 / CM2 / SHZV / HWV list RMB FOB", () => {
    expect(lookupListPrice("CV2III-350D/40.5-10193W")).toMatchObject({
      found: true,
      listRmb: 148700,
    });
    expect(lookupListPrice("CM2III-500Y/72.5B-10193W+CMA7")).toMatchObject({
      found: true,
      listRmb: 188200,
    });
    expect(lookupListPrice("SHZVIII-1000Y/170D-12233W")).toMatchObject({
      found: true,
      listRmb: 276700,
    });
    expect(lookupListPrice("HWVIII-400Y/72.5-10193W+CMA7")).toMatchObject({
      found: true,
      listRmb: 225000,
    });
  });

  it("does not invent a missing SHZVG-1500 / 72.5C row", () => {
    expect(lookupListPrice("SHZVGIII-1500Y/72.5C-10193W")).toEqual({
      found: false,
      reason: "no-row",
    });
  });

  it("converts list × FX only (no coefficient)", () => {
    expect(LIST_CURRENCIES).toHaveLength(15);
    const usd = convertFromCny(148700, "USD");
    expect(usd).toBeCloseTo(148700 * 0.14808, 5);
    expect(convertFromCny(100, "CNY")).toBe(100);
  });
});
