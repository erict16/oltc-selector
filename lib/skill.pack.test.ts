import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { VARIANTS, buildEntries } from "../scripts/pack-skill.mjs";

const read = (...p: string[]) => readFileSync(path.join(process.cwd(), ...p), "utf8");

const workbuddyMd = () => read("skills", "oltc-selector", "SKILL.md");
const intlMd = () => read("skills", "oltc-selector-international", "SKILL.md");

describe("skill frontmatter and manifest (both variants)", () => {
  it.each(VARIANTS.map((v) => [v.id, v] as const))(
    "%s: SKILL.md has name, description, allowed-tools",
    (_id, v) => {
      const fm = readFileSync(path.join(v.src, "SKILL.md"), "utf8").split("---")[1];
      expect(fm).toMatch(/^name: oltc-selector$/m);
      expect(fm).toMatch(/^description:/m);
      expect(fm).toMatch(/^allowed-tools:/m);
    },
  );

  it.each(VARIANTS.map((v) => [v.id, v] as const))(
    "%s: manifest.yaml has the WorkBuddy-required plain description",
    (_id, v) => {
      const m = readFileSync(path.join(v.src, "manifest.yaml"), "utf8");
      expect(m).toMatch(/^name: oltc-selector$/m);
      expect(m).toMatch(/^version: /m);
      expect(m).toMatch(/^description: \S/m);
      expect(m).toMatch(/^category: /m);
      expect(m).toMatch(/^author: /m);
    },
  );
});

describe("workbuddy skill (skills/oltc-selector)", () => {
  it("runs oltc via npx first and forbids invented types", () => {
    const text = workbuddyMd();
    expect(text).toContain("npx -y oltc-selector@latest");
    expect(text).toContain("npm i -g oltc-selector");
    expect(text).toContain("Do not ask the user to install anything first");
    expect(text).toContain("oltc --iu");
    expect(text).toContain("CV2-500");
    expect(text).toContain("CM2III");
    expect(text).toContain("1× CMA7");
    expect(text.includes("listRmb")).toBe(false);
    expect(text.toLowerCase()).not.toContain("base price");
  });

  it("teaches 一拖二 duties as two brochure-checked runs", () => {
    const text = workbuddyMd();
    expect(text).toContain("一拖二");
    expect(text).toContain("--octc");
  });
});

describe("international skill (skills/oltc-selector-international)", () => {
  it("is English-first with the same engine rules", () => {
    const text = intlMd();
    expect(text).toContain("npx -y oltc-selector@latest");
    expect(text).toContain("oltc --iu");
    expect(text).toContain("CV2-500");
    expect(text).toContain("CM2III");
    expect(text).toContain("1× CMA7");
    expect(text).toContain("--octc");
    expect(text).toContain("一拖二");
    expect(text.includes("listRmb")).toBe(false);
    expect(text.toLowerCase()).not.toContain("base price");
  });

  it("keeps the brochure-check tables in sync with the workbuddy variant", () => {
    const zh = read("skills", "oltc-selector", "references", "brochure-check.md");
    const en = read(
      "skills",
      "oltc-selector-international",
      "references",
      "brochure-check.md",
    );
    for (const row of ["CV2 | 350, 600 only", "SHZVG | 1300, 1500", "72.5→140/350", "10193W"]) {
      expect(zh).toContain(row);
      expect(en).toContain(row);
    }
  });
});

describe("zips for SkillHub upload", () => {
  it("ships both zips", () => {
    for (const v of VARIANTS) {
      expect(existsSync(v.out), `${v.id} zip missing`).toBe(true);
    }
  });

  it("ships zips built from the current skill sources", () => {
    const script = path.join(process.cwd(), "scripts", "pack-skill.mjs");
    const r = spawnSync("node", [script, "--check"], { encoding: "utf8" });
    expect(r.status, r.stderr + r.stdout).toBe(0);
  });

  it.each(VARIANTS.map((v) => [v.id, v] as const))(
    "%s: zip entries are LF-only (no CRLF to choke frontmatter parsers)",
    (_id, v) => {
      for (const entry of buildEntries(v)) {
        expect(entry.data.includes("\r")).toBe(false);
      }
    },
  );
});
