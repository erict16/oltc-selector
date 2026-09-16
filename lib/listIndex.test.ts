import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { lookupListPrice } from "./basePrices";
import { listRowExists, resolveOctcListKey } from "./listIndex";
import { commercialTypeExists } from "./typeExists";

describe("priceless WSL/WDL list index", () => {
  it("does not embed list RMB", () => {
    const raw = readFileSync(
      path.join(process.cwd(), "lib", "listIndex.data.json"),
      "utf8",
    );
    expect(raw.includes("listRmb")).toBe(false);
    expect(raw.includes("listRmb")).toBe(false);
  });

  it("agrees with price-list .found on WSL rows (existence only)", () => {
    const samples = [
      "WSLIV-800Y/170-6x5B",
      "WSLII-800D/72.5-6x5A",
      "WSLIV-600Y/72.5-6x5A",
      "WDLIV-1000Y/126-6x5B",
      "WSLIV-2000D/126-6x5B",
    ];
    for (const m of samples) {
      expect(listRowExists(m), m).toBe(lookupListPrice(m).found);
    }
  });

  it("missing list rows stay missing", () => {
    expect(listRowExists("WSLIV-2000D/126-6x5B")).toBe(false);
    expect(resolveOctcListKey("WSLIV-2000D/126-6x5B")).toBeNull();
    expect(commercialTypeExists("WSLIV-2000D/126-6x5B")).toBe(false);
  });
});
