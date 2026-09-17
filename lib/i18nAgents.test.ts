import { describe, expect, it } from "vitest";
import { LANG_OPTIONS } from "./i18n";
import { agentGuide } from "./i18nAgents";

describe("agent guide copy", () => {
  it("covers every UI language with a title and download label", () => {
    for (const { id } of LANG_OPTIONS) {
      const c = agentGuide(id);
      expect(c.title.length).toBeGreaterThan(4);
      expect(c.dl.length).toBeGreaterThan(2);
    }
  });

  it("has no em dash or en dash in any locale", () => {
    for (const { id } of LANG_OPTIONS) {
      const blob = Object.values(agentGuide(id)).join("\n");
      expect(blob, id).not.toMatch(/[\u2013\u2014]/);
    }
  });

  it("has three example cards and no CLI-how asides", () => {
    const zh = agentGuide("zh");
    expect(zh.ex3).toBe("示例 3");
    expect(zh.sayBody3).toMatch(/350 MVA/);
    const blob = LANG_OPTIONS.map(({ id }) =>
      Object.values(agentGuide(id)).join("\n"),
    ).join("\n");
    expect(blob).not.toMatch(/它自己跑 oltc/);
    expect(blob).not.toMatch(/有载、无载各跑一次/);
  });
});
