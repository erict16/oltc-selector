import { describe, expect, it } from "vitest";
import { LANG_OPTIONS } from "./i18n";
import { agentGuide } from "./i18nAgents";

describe("agent guide copy", () => {
  it("covers every UI language with the stepper fields", () => {
    for (const { id } of LANG_OPTIONS) {
      const c = agentGuide(id);
      expect(c.title.length).toBeGreaterThan(4);
      expect(c.s1t.length).toBeGreaterThan(1);
      expect(c.s1b.length).toBeGreaterThan(10);
      expect(c.s2q.length).toBeGreaterThan(10);
      expect(c.s3note.length).toBeGreaterThan(4);
      expect(c.dl.length).toBeGreaterThan(2);
    }
  });

  it("has no em dash or en dash in any locale", () => {
    for (const { id } of LANG_OPTIONS) {
      const blob = Object.values(agentGuide(id)).join("\n");
      expect(blob, id).not.toMatch(/[–—]/);
    }
  });

  it("step 1 tells every assistant can install, and the example is 一拖二", () => {
    const zh = agentGuide("zh");
    expect(zh.s1b).toContain("WorkBuddy");
    expect(zh.s1b).toContain("Cursor");
    expect(zh.s2q).toContain("一拖二");
    expect(zh.s2q).toMatch(/无载 5 档/);
    const blob = LANG_OPTIONS.map(({ id }) =>
      Object.values(agentGuide(id)).join("\n"),
    ).join("\n");
    expect(blob).not.toMatch(/它自己跑 oltc/);
    expect(blob).not.toMatch(/有载、无载各跑一次/);
  });
});
