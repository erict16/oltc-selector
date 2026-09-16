import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("downloadable oltc-selector skill", () => {
  const md = path.join(process.cwd(), "skills", "oltc-selector", "SKILL.md");
  const zip = path.join(
    process.cwd(),
    "public",
    "skills",
    "oltc-selector.zip",
  );

  it("tells the agent to run oltc and forbids invented types", () => {
    const text = readFileSync(md, "utf8");
    expect(text).toContain("npm i -g oltc-selector");
    expect(text).toContain("Do not ask the user to install it first");
    expect(text).toContain("oltc --iu");
    expect(text).toContain("CV2-500");
    expect(text).toContain("CM2III");
    expect(text).toContain("1× CMA7");
    expect(text.includes("listRmb")).toBe(false);
    expect(text.toLowerCase()).not.toContain("base price");
  });

  it("ships a zip for WorkBuddy upload", () => {
    expect(existsSync(zip)).toBe(true);
  });
});
