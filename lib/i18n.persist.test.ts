import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getAppLang, isLang, LANG_OPTIONS, setAppLang, t } from "./i18n";

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
});
