import { describe, expect, it } from "vitest";
import { LANG_OPTIONS } from "./i18n";
import { RELEASE_NOTES } from "./releaseNotes";

describe("release notes", () => {
  it("keeps the same number of complete sentences in every language", () => {
    const zh = RELEASE_NOTES.zh;
    expect(zh.current.length).toBeGreaterThan(0);
    expect(zh.earlier.length).toBeGreaterThan(0);
    for (const line of [...zh.current, ...zh.earlier]) {
      expect(line.endsWith("。")).toBe(true);
      expect(line.length).toBeGreaterThan(10);
    }
    expect(zh.earlierLabel).toBe("上个版本");
    for (const { id } of LANG_OPTIONS) {
      expect(RELEASE_NOTES[id].current).toHaveLength(zh.current.length);
      expect(RELEASE_NOTES[id].earlier).toHaveLength(zh.earlier.length);
    }
  });
});
