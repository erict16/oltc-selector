import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { listRowExists, resolveOctcListKey } from "./listIndex";
import { commercialTypeExists } from "./typeExists";

describe("priceless WSL/WDL list index", () => {
  it("does not embed list RMB and the price table is gone", () => {
    const raw = readFileSync(
      path.join(process.cwd(), "lib", "listIndex.data.json"),
      "utf8",
    );
    expect(raw.includes("listRmb")).toBe(false);
    expect(existsSync(path.join(process.cwd(), "lib", "basePrices.data.json"))).toBe(
      false,
    );
  });

  it("known WSL rows exist; missing rows stay missing", () => {
    expect(listRowExists("WSLIV-800Y/170-6x5B")).toBe(true);
    expect(listRowExists("WSLII-800D/72.5-6x5A")).toBe(true);
    expect(listRowExists("WSLIV-600Y/72.5-6x5A")).toBe(true);
    expect(listRowExists("WDLIV-1000Y/126-6x5B")).toBe(true);
    expect(listRowExists("WSLIV-2000D/126-6x5B")).toBe(false);
    expect(resolveOctcListKey("WSLIV-2000D/126-6x5B")).toBeNull();
    expect(commercialTypeExists("WSLIV-2000D/126-6x5B")).toBe(false);
  });
});
