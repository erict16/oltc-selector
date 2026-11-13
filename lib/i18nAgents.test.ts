import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { LANG_OPTIONS } from "./i18n";
import { agentGuide } from "./i18nAgents";

describe("agent guide copy", () => {
  it("covers every UI language with the stepper fields", () => {
    for (const { id } of LANG_OPTIONS) {
      const c = agentGuide(id);
      expect(c.title.length).toBeGreaterThan(4);
      expect(c.s1t.length).toBeGreaterThan(1);
      expect(c.s1b.length).toBeGreaterThan(4);
      expect(c.s2q.length).toBeGreaterThan(10);
      expect(c.s3note.length).toBeGreaterThan(4);
      expect(c.npm.length).toBeGreaterThan(2);
      expect(c.cli.length).toBeGreaterThan(2);
      expect(c.cliBody.length).toBeGreaterThan(10);
    }
  });

  it("has no em dash or en dash in any locale", () => {
    for (const { id } of LANG_OPTIONS) {
      const blob = Object.values(agentGuide(id)).join("\n");
      expect(blob, id).not.toMatch(/[–—]/);
    }
  });

  it("step 1: one localized line that runs the npm package, no skill platform", () => {
    const zh = agentGuide("zh");
    expect(zh.s1prompt).toContain("请用");
    expect(zh.s1prompt).not.toBe(agentGuide("en").s1prompt);
    expect(zh.s2q).toContain("一拖二");
    expect(zh.s2q).toMatch(/无载 5 档/);
    for (const { id } of LANG_OPTIONS) {
      const c = agentGuide(id);
      expect(c.s1prompt).toContain("npx -y oltc-selector@latest --help");
      expect(Object.values(c).join("\n"), id).not.toMatch(/skillhub|workbuddy/i);
    }
    const blob = LANG_OPTIONS.map(({ id }) =>
      Object.values(agentGuide(id)).join("\n"),
    ).join("\n");
    expect(blob).not.toMatch(/它自己跑 oltc/);
    expect(blob).not.toMatch(/有载、无载各跑一次/);
    expect(blob).not.toMatch(/两条路/);
  });

  it("extra cases cover dry CZ and 3xSHZV, with no customer names", () => {
    for (const { id } of LANG_OPTIONS) {
      const c = agentGuide(id);
      expect(c.more.length).toBeGreaterThan(2);
      expect(c.qDry.length).toBeGreaterThan(10);
      expect(c.qShzv.length).toBeGreaterThan(10);
    }
    const zh = agentGuide("zh");
    expect(zh.more).toBe("更多选型案例");
    expect(zh.qDry).toContain("干式");
    expect(zh.qDry).toMatch(/33\/0\.4/);
    expect(zh.qShzv).toContain("350 MVA");
    expect(zh.qShzv).toContain("1750 A");
    expect(zh.qShzv).toContain("YNd11d11");
    const blob = LANG_OPTIONS.map(({ id }) =>
      Object.values(agentGuide(id)).join("\n"),
    ).join("\n");
    expect(blob).not.toMatch(
      /悉尼|Sydney|Sídney|Sidney|铁路|railway|ferrocarril|demiryolu|железн|Wilson|周晓冬/i,
    );
    expect(blob).not.toMatch(/CZIII|三相真空上限|vacuum ceiling/);
  });

  it("the page links to npm and pins no version", () => {
    const src = readFileSync(
      resolve(__dirname, "../components/AgentsGuide.tsx"),
      "utf8",
    );
    expect(src).toContain("https://www.npmjs.com/package/oltc-selector");
    expect(src).not.toMatch(/skillhub|workbuddy/i);
    expect(src).not.toMatch(/oltc-selector@\d/);
  });
});
