import { describe, expect, it, vi } from "vitest";
import {
  lookupListPrice,
  estimateListPrice,
  resolveListPrice,
  BASE_PRICE_META,
} from "./basePrices";
import {
  convertFromCny,
  ER_API_LATEST,
  fetchListRates,
  formatFxDate,
  FRANKFURTER_LATEST,
  FX_FALLBACK,
  LIST_CURRENCIES,
  toIsoDate,
} from "./fx";

function expectNoPrice(model: string) {
  const hit = lookupListPrice(model);
  expect(hit.found).toBe(false);
  expect(hit).not.toHaveProperty("listRmb");
}

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
    const cm2Y = lookupListPrice("CM2III-500Y/170D-10193W");
    const cm2D = lookupListPrice("CM2III-500D/170D-10193W");
    expect(cm2Y.found).toBe(true);
    expect(cm2D.found).toBe(true);
    if (cm2Y.found && cm2D.found) expect(cm2D.listRmb).toBe(cm2Y.listRmb);
    expect(lookupListPrice("HWVIII-400Y/72.5-10193W+CMA7")).toMatchObject({
      found: true,
      listRmb: 225000,
    });
    expect(lookupListPrice("HWVIII-800D/40.5-10193W")).toMatchObject({
      found: true,
      listRmb: 247500,
    });
    expect(lookupListPrice("HWVIII-400D/72.5-18353W")).toMatchObject({
      found: true,
      listRmb: 250000,
    });
  });

  it("looks up WSL/WDL CMA7 list (not hand-wheel)", () => {
    expect(lookupListPrice("WSLIV-800Y/170-6x5B")).toMatchObject({
      found: true,
      listRmb: 97500,
      sheet: "WSL(WDL)",
    });
    expect(lookupListPrice("WSL IV-800Y/170-6×5B")).toMatchObject({
      found: true,
      listRmb: 97500,
    });
    expect(lookupListPrice("WSLIV-600Y/72.5-6x5A")).toMatchObject({
      found: true,
      listRmb: 45400,
    });
    expect(lookupListPrice("WSLII-800D/72.5-6x5A")).toMatchObject({
      found: true,
      listRmb: 49600,
    });
    // WDL aliases the WSL row when the sheet has no WDL twin
    expect(lookupListPrice("WDLIV-1000Y/126-6x5B")).toMatchObject({
      found: true,
      listRmb: 53100,
    });
  });

  it("maps linear 10070 to change-over 0 (not W)", () => {
    expect(lookupListPrice("CV2III-350D/40.5-10070")).toMatchObject({
      found: true,
      listRmb: 137500,
    });
    expect(lookupListPrice("CM2III-500Y/72.5B-10070")).toMatchObject({
      found: true,
      listRmb: 179300,
    });
    expect(lookupListPrice("CV2III-350D/40.5-10070")).not.toMatchObject({
      listRmb: 148700,
    });
  });

  it("multiplies 3xCM2I from the single-phase I-row", () => {
    expect(lookupListPrice("CM2I-800/72.5B-10191W")).toMatchObject({
      found: true,
      listRmb: 174100,
      unitCount: 1,
    });
    expect(lookupListPrice("3xCM2I-800/72.5B-10191W")).toMatchObject({
      found: true,
      listRmb: 522300,
      unitCount: 3,
    });
    expect(lookupListPrice("3×CM2I-800/72.5B-10191W+CMA7")).toMatchObject({
      found: true,
      listRmb: 522300,
    });
  });

  it("does not invent WSL / unknown / missing-pitch rows", () => {
    expect(lookupListPrice("SHZVGIII-1500Y/72.5C-10193W")).toEqual({
      found: false,
      reason: "no-row",
    });
    expect(lookupListPrice("WSLVIII-500/72.5-10193W")).toEqual({
      found: false,
      reason: "no-row",
    });
    expect(lookupListPrice("CV2III-500D/40.5-10193W")).toEqual({
      found: false,
      reason: "no-row",
    });
    expect(lookupListPrice("CV2III-350D/40.5-14193W")).toEqual({
      found: false,
      reason: "no-row",
    });
    expectNoPrice("WDLVIII-2000-145-5_2B");
    expectNoPrice("not-a-type");
    expectNoPrice("");
  });

  it("does not add CMA7 on HWV (list already includes MDU)", () => {
    const bare = lookupListPrice("HWVIII-400Y/72.5-10193W");
    const withMdu = lookupListPrice("HWVIII-400Y/72.5-10193W+CMA7");
    expect(bare).toMatchObject({ found: true, listRmb: 225000 });
    expect(withMdu).toMatchObject({ found: true, listRmb: 225000 });
  });

  it("does not fall back W→G or 12-pitch→10-pitch", () => {
    expect(lookupListPrice("CV2III-350D/40.5-10193W")).toMatchObject({
      listRmb: 148700,
    });
    expect(lookupListPrice("CV2III-350D/40.5-10193G")).toMatchObject({
      listRmb: 149800,
    });
    expect(lookupListPrice("SHZVIII-1000Y/170D-10193W")).toMatchObject({
      listRmb: 273900,
    });
    expect(lookupListPrice("SHZVIII-1000Y/170D-12233W")).toMatchObject({
      listRmb: 276700,
    });
    expect(lookupListPrice("SHZVIII-1000Y/170D-10193G")).toMatchObject({
      listRmb: 282200,
    });
  });

  it("estimates missing rows from neighbours without changing exact lookup", () => {
    expect(lookupListPrice("SHZVGIII-1500Y/72.5C-10193W")).toEqual({
      found: false,
      reason: "no-row",
    });
    const shzvg = estimateListPrice("SHZVGIII-1500Y/72.5C-10193W");
    expect(shzvg).toMatchObject({ found: true, estimated: true });
    expect(resolveListPrice("SHZVGIII-1500Y/72.5C-10193W")).toMatchObject({
      found: true,
      estimated: true,
    });
    if (shzvg.found) {
      expect(shzvg.listRmb).toBeGreaterThan(200_000);
      expect(shzvg.listRmb).toBeLessThan(1_000_000);
      expect(shzvg.listRmb % 100).toBe(0);
      expect(shzvg.method).toMatch(/nearest-neighbor/);
    }

    expect(lookupListPrice("CV2III-350D/40.5-14193W")).toEqual({
      found: false,
      reason: "no-row",
    });
    const cv14 = resolveListPrice("CV2III-350D/40.5-14193W");
    expect(cv14).toMatchObject({ found: true, estimated: true });
    if (cv14.found) {
      expect(cv14.listRmb).toBeGreaterThan(148_700);
      expect(cv14.listRmb).toBeLessThan(170_000);
      expect(cv14.listRmb % 100).toBe(0);
    }

    const exact = resolveListPrice("CV2III-350D/40.5-10193W");
    expect(exact).toMatchObject({ found: true, listRmb: 148700 });
    expect(exact.found && exact.estimated).toBeFalsy();

    expect(estimateListPrice("not-a-type")).toEqual({
      found: false,
      reason: "unparsed",
    });
    expect(resolveListPrice("")).toEqual({ found: false, reason: "unparsed" });
    expect(estimateListPrice("WSLVIII-500/72.5-10193W")).toEqual({
      found: false,
      reason: "no-row",
    });
  });

  it("converts list × FX only (no coefficient)", () => {
    expect(LIST_CURRENCIES).toHaveLength(17);
    const usd = convertFromCny(148700, "USD");
    expect(usd).toBeCloseTo(148700 * 0.14808, 5);
    expect(convertFromCny(100, "CNY")).toBe(100);
  });
});

function jsonRes(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response;
}

function completeRates(fill: number): Record<string, number> {
  const rates: Record<string, number> = {};
  for (const code of LIST_CURRENCIES) {
    if (code !== "CNY") rates[code] = fill;
  }
  return rates;
}

describe("fetchListRates", () => {
  it("uses frankfurter when every list currency is present", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const href = String(input);
      expect(href.startsWith(FRANKFURTER_LATEST)).toBe(true);
      return jsonRes({ date: "2026-08-19", rates: completeRates(0.2) });
    });
    const rates = await fetchListRates(fetcher);
    expect(rates.live).toBe(true);
    expect(rates.source).toBe("frankfurter.dev");
    expect(rates.date).toBe("2026-08-19");
    expect(rates.perCny.USD).toBe(0.2);
    expect(rates.perCny.VND).toBe(0.2);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("fills frankfurter gaps from open.er-api", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const href = String(input);
      if (href.startsWith(FRANKFURTER_LATEST)) {
        return jsonRes({ date: "2026-08-19", rates: { USD: 0.15, EUR: 0.13 } });
      }
      expect(href).toBe(ER_API_LATEST);
      return jsonRes({
        time_last_update_utc: "Tue, 18 Aug 2026 12:00:00 +0000",
        rates: { VND: 3800, USD: 0.15 },
      });
    });
    const rates = await fetchListRates(fetcher);
    expect(rates.live).toBe(true);
    expect(rates.source).toBe("frankfurter.dev + open.er-api.com");
    expect(rates.perCny.USD).toBe(0.15);
    expect(rates.perCny.VND).toBe(3800);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("uses open.er-api when frankfurter fails", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const href = String(input);
      if (href.startsWith(FRANKFURTER_LATEST)) throw new Error("down");
      expect(href).toBe(ER_API_LATEST);
      return jsonRes({
        time_last_update_utc: "Tue, 18 Aug 2026 00:00:01 +0000",
        rates: { USD: 0.16 },
      });
    });
    const rates = await fetchListRates(fetcher);
    expect(rates.live).toBe(true);
    expect(rates.source).toBe("open.er-api.com");
    expect(rates.perCny.USD).toBe(0.16);
    expect(rates.perCny.EUR).toBe(FX_FALLBACK.perCny.EUR);
  });

  it("formats FX dates in the UI language", () => {
    expect(toIsoDate("Tue, 18 Aug 2026 00:00:01 +0000")).toBe("2026-08-18");
    expect(toIsoDate("2026-08-19")).toBe("2026-08-19");
    expect(formatFxDate("2026-08-20", "zh")).toMatch(/2026/);
    expect(formatFxDate("2026-08-20", "zh")).toMatch(/8/);
    expect(formatFxDate("Tue, 20 Aug 2026 00:00:01 +0000", "ru")).toMatch(
      /2026/,
    );
  });

  it("uses the dated table when both sources fail", async () => {
    const fetcher = vi.fn(async () => {
      throw new Error("offline");
    });
    const rates = await fetchListRates(fetcher);
    expect(rates.live).toBe(false);
    expect(rates.date).toBe(FX_FALLBACK.date);
    expect(rates.source).toBe(FX_FALLBACK.source);
    expect(rates.perCny).toEqual(FX_FALLBACK.perCny);
    expect(fetcher.mock.calls.length).toBeGreaterThan(0);
  });
});
