import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("README selection rules", () => {
  const md = readFileSync(path.join(process.cwd(), "README.md"), "utf8");

  it("states existence, ranking, and CLI flags", () => {
    expect(md).toContain("CV2-500");
    expect(md).toContain("combined III-D");
    expect(md).toMatch(/WSL\s*\/\s*WDL existence is 2025-list row keys/);
    expect(md).toContain("Minimum-adequate");
    expect(md).toContain("--octc");
    expect(md).toContain("--structure");
    expect(md).toContain("--series");
    expect(md).toContain("price-list Y/D twins");
  });
});
