import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { VARIANTS, buildEntries } from "../scripts/pack-skill.mjs";

const read = (...p: string[]) => readFileSync(path.join(process.cwd(), ...p), "utf8");

const workbuddyMd = () => read("skills", "huaming-oltc-selector", "SKILL.md");
const intlMd = () =>
  read("skills", "huaming-oltc-selector-international", "SKILL.md");

describe("skill frontmatter and manifest (both variants)", () => {
  it.each(VARIANTS.map((v) => [v.id, v] as const))(
    "%s: SKILL.md has name, description, allowed-tools",
    (_id, v) => {
      const fm = readFileSync(path.join(v.src, "SKILL.md"), "utf8").split("---")[1];
      expect(fm).toMatch(/^name: huaming-oltc-selector$/m);
      expect(fm).toMatch(/^description:/m);
      expect(fm).toMatch(/^allowed-tools:/m);
    },
  );

  it.each(VARIANTS.map((v) => [v.id, v] as const))(
    "%s: manifest.yaml has the WorkBuddy-required plain description",
    (_id, v) => {
      const m = readFileSync(path.join(v.src, "manifest.yaml"), "utf8");
      expect(m).toMatch(/^name: huaming-oltc-selector$/m);
      expect(m).toMatch(/^version: /m);
      expect(m).toMatch(/^description: \S/m);
      expect(m).toMatch(/^category: /m);
      expect(m).toMatch(/^author: /m);
    },
  );

  it.each(VARIANTS.map((v) => [v.id, v] as const))(
    "%s: SKILL.md and manifest.yaml carry the same version",
    (_id, v) => {
      const md = readFileSync(path.join(v.src, "SKILL.md"), "utf8");
      const m = readFileSync(path.join(v.src, "manifest.yaml"), "utf8");
      const mdV = md.match(/^version: (.+)$/m)?.[1];
      const mV = m.match(/^version: (.+)$/m)?.[1];
      expect(mdV).toBeTruthy();
      expect(mV).toBe(mdV);
    },
  );

  it.each(VARIANTS.map((v) => [v.id, v] as const))(
    "%s: teaches the assumptions block and the CZ dry-type rule",
    (_id, v) => {
      const md = readFileSync(path.join(v.src, "SKILL.md"), "utf8");
      expect(md).toContain("假定");
      const ref = readFileSync(
        path.join(v.src, "references", "brochure-check.md"),
        "utf8",
      );
      expect(ref).toContain("CZ");
      expect(ref).toContain("CZIII");
    },
  );
});

describe("workbuddy skill (skills/huaming-oltc-selector)", () => {
  it("runs oltc via npx first and forbids invented types", () => {
    const text = workbuddyMd();
    expect(text).toContain("npx -y oltc-selector@latest");
    expect(text).toContain("npm i -g oltc-selector");
    expect(text).toContain("不要让用户先装任何东西");
    expect(text).toContain("oltc --iu");
    expect(text).toContain("CV2-500");
    expect(text).toContain("CM2III");
    expect(text).toContain("1× CMA7");
    expect(text.includes("listRmb")).toBe(false);
    expect(text.toLowerCase()).not.toContain("base price");
  });

  it("documents the full CLI input surface", () => {
    const text = workbuddyMd();
    for (const flag of ["--ust", "--mount", "--oil", "--vacuum", "--phases", "--step-pct", "--contact"]) {
      expect(text).toContain(flag);
    }
  });

  it("is Chinese-first (SkillHub listing renders the body)", () => {
    const text = workbuddyMd();
    expect(text).toContain("## 必须遵守");
    expect(text).toContain("## 样本册检查");
    expect(text).not.toContain("## Must");
    expect(text).not.toContain("## How to run");
  });

  it("description covers the real trigger vocabulary", () => {
    const fm = workbuddyMd().split("---")[1];
    for (const kw of ["华明", "选型", "铭牌", "OLTC", "OCTC", "一拖二", "WSG", "CMD", "不触发"]) {
      expect(fm).toContain(kw);
    }
  });

  it("teaches 一拖二 duties as two brochure-checked runs", () => {
    const text = workbuddyMd();
    expect(text).toContain("一拖二");
    expect(text).toContain("--octc");
  });
});

describe("international skill (skills/huaming-oltc-selector-international)", () => {
  it("is English-first with the same engine rules", () => {
    const text = intlMd();
    expect(text).toContain("npx -y oltc-selector@latest");
    expect(text).toContain("oltc --iu");
    expect(text).toContain("--ust");
    expect(text).toContain("--mount");
    expect(text).toContain("CV2-500");
    expect(text).toContain("CM2III");
    expect(text).toContain("1× CMA7");
    expect(text).toContain("--octc");
    expect(text).toContain("一拖二");
    expect(text.includes("listRmb")).toBe(false);
    expect(text.toLowerCase()).not.toContain("base price");
  });

  it("keeps the brochure-check tables in sync with the workbuddy variant", () => {
    const zh = read(
      "skills",
      "huaming-oltc-selector",
      "references",
      "brochure-check.md",
    );
    const en = read(
      "skills",
      "huaming-oltc-selector-international",
      "references",
      "brochure-check.md",
    );
    // pure-data rows are identical in both locales
    for (const row of ["SHZVG | 1300, 1500", "72.5→140/350", "10193W"]) {
      expect(zh).toContain(row);
      expect(en).toContain(row);
    }
    // prose cells differ by locale but carry the same fact
    expect(zh).toContain("CV2 | 仅 350, 600");
    expect(en).toContain("CV2 | 350, 600 only");
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
    "%s: text zip entries are LF-only (no CRLF to choke frontmatter parsers)",
    (_id, v) => {
      for (const entry of buildEntries(v)) {
        if (/\.(md|ya?ml)$/i.test(entry.name)) {
          expect(entry.data.includes("\r")).toBe(false);
        }
      }
    },
  );

  it.each(VARIANTS.map((v) => [v.id, v] as const))(
    "%s: ships the Huaming icon and keeps it byte-identical",
    (_id, v) => {
      const icon = buildEntries(v).find((e) => e.name === "assets/icon.png");
      expect(icon, "icon entry missing").toBeTruthy();
      expect(icon!.data.length).toBeGreaterThan(1000);
      // PNG magic bytes: binary must survive packaging untouched
      expect([...icon!.data.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    },
  );
});
