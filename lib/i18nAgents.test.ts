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
});
