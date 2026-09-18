import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_VERSION } from "./appVersion";
import { LANG_OPTIONS } from "./i18n";
import { RELEASES } from "./releaseNotes";

describe("release notes", () => {
  it("starts with the app version and keeps zh items as full sentences", () => {
    const zh = RELEASES.zh;
    expect(zh.length).toBeGreaterThanOrEqual(2);
    expect(zh[0].version).toBe(APP_VERSION);
    for (const rel of zh) {
      expect(rel.groups.length).toBeGreaterThan(0);
      for (const g of rel.groups) {
        for (const line of g.items) {
          expect(line.endsWith("。")).toBe(true);
          expect(line.length).toBeGreaterThan(10);
        }
      }
    }
  });

  it("keeps the same versions, groups, and item counts in every language", () => {
    const zh = RELEASES.zh;
    for (const { id } of LANG_OPTIONS) {
      const other = RELEASES[id];
      expect(other.map((r) => r.version)).toEqual(zh.map((r) => r.version));
      expect(other.map((r) => r.date)).toEqual(zh.map((r) => r.date));
      for (let i = 0; i < zh.length; i++) {
        expect(other[i].groups.map((g) => g.kind)).toEqual(
          zh[i].groups.map((g) => g.kind),
        );
        for (let j = 0; j < zh[i].groups.length; j++) {
          expect(other[i].groups[j].items).toHaveLength(
            zh[i].groups[j].items.length,
          );
        }
      }
    }
  });

  it("does not advertise a step-voltage menu — first paint uses tap %", () => {
    const banned = [
      /级电压菜单/,
      /step voltage menu/i,
      /Menu điện áp cấp/,
      /menú de tensión de paso/i,
      /kademe gerilimi menü/i,
      /меню ступенчатого напряжения/i,
    ];
    for (const { id } of LANG_OPTIONS) {
      for (const rel of RELEASES[id]) {
        for (const g of rel.groups) {
          for (const line of g.items) {
            for (const re of banned) {
              expect(line, `${id} v${rel.version}`).not.toMatch(re);
            }
          }
        }
      }
    }
  });

  it("keeps the Ust volt picker behind ustV == null in SelectorApp", () => {
    const src = readFileSync(
      resolve(__dirname, "../components/SelectorApp.tsx"),
      "utf8",
    );
    expect(src).toContain('label={t(lang, "stepPercent")}');
    expect(src).toMatch(/ustV == null \?[\s\S]{0,80}label=\{t\(lang, "ust"\)\}/);
  });
});
