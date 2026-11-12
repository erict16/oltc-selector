import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detectLang, firstLang, getAppLang, isLang, LANG_OPTIONS, setAppLang, t } from "./i18n";

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  const localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    clear: () => store.clear(),
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorage,
    configurable: true,
  });
  Object.defineProperty(globalThis, "document", {
    value: { cookie: "" },
    configurable: true,
  });
});

afterEach(() => {
  setAppLang("zh");
});

describe("lang persist", () => {
  it("accepts the six UI langs only", () => {
    expect(isLang("en")).toBe(true);
    expect(isLang("vi")).toBe(true);
    expect(isLang("xx")).toBe(false);
    expect(isLang(null)).toBe(false);
  });

  it("has a current-version chip in every UI language", () => {
    for (const { id } of LANG_OPTIONS) {
      expect(t(id, "changelogNow")).not.toBe("changelogNow");
    }
  });

  it("names Imax safety factor in every UI language", () => {
    for (const { id } of LANG_OPTIONS) {
      expect(t(id, "safetyK")).not.toBe("safetyK");
      expect(t(id, "safetyK").toLowerCase()).not.toBe("factor k");
    }
  });

  it("writes the choice to localStorage", () => {
    setAppLang("en");
    expect(getAppLang()).toBe("en");
    expect(store.get("oltc-selector-lang")).toBe("en");
    setAppLang("tr");
    expect(store.get("oltc-selector-lang")).toBe("tr");
  });

  it("picks the first supported browser language, else English", () => {
    expect(detectLang(["tr-TR", "en"])).toBe("tr");
    expect(detectLang(["fr-FR", "vi"])).toBe("vi");
    expect(detectLang(["zh-Hant-TW"])).toBe("zh");
    expect(detectLang(["in-ID"])).toBe("id");
    expect(detectLang(["es_419"])).toBe("es");
    expect(detectLang(["fr", "de"])).toBe("en");
    expect(detectLang([])).toBe("en");
    expect(detectLang(undefined)).toBe("en");
  });

  it("first visit: stored choice, then browser language, then English", () => {
    Object.defineProperty(globalThis, "navigator", {
      value: { languages: ["id-ID", "en-US"], language: "id-ID" },
      configurable: true,
    });
    expect(firstLang()).toBe("id");
    store.set("oltc-selector-lang", "vi");
    expect(firstLang()).toBe("vi");
    store.clear();
    Object.defineProperty(globalThis, "navigator", {
      value: { languages: ["de-DE"], language: "de-DE" },
      configurable: true,
    });
    expect(firstLang()).toBe("en");
    Object.defineProperty(globalThis, "navigator", {
      value: { languages: [], language: "tr" },
      configurable: true,
    });
    expect(firstLang()).toBe("tr");
  });

  it("names the new page strings in every UI language", () => {
    for (const { id } of LANG_OPTIONS) {
      for (const k of ["navTerms", "navPrivacy", "copyLink", "skipLink", "errorTitle", "reload", "notFoundTitle", "calcFailed", "calcFailedHint", "cautionCount", "umOk", "umLow", "agentChip", "changelogTitle"]) {
        expect(t(id, k), `${id}.${k}`).not.toBe(k);
        if (id !== "en") expect(t(id, k), `${id}.${k}`).not.toBe(t("en", k));
      }
    }
  });
});
