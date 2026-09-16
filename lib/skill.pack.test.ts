import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
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

  it("teaches 一拖二 duties as two brochure-checked runs", () => {
    const text = readFileSync(md, "utf8");
    expect(text).toContain("一拖二");
    expect(text).toContain("--octc");
  });

  it("ships a zip for WorkBuddy upload", () => {
    expect(existsSync(zip)).toBe(true);
  });

  it("ships a zip built from the current skill source", () => {
    const script = path.join(process.cwd(), "scripts", "pack-skill.mjs");
    const r = spawnSync("node", [script, "--check"], { encoding: "utf8" });
    expect(r.status, r.stderr + r.stdout).toBe(0);
  });
});
