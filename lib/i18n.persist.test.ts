import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getAppLang, isLang, setAppLang } from "./i18n";

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

  it("writes the choice to localStorage", () => {
    setAppLang("en");
    expect(getAppLang()).toBe("en");
    expect(store.get("oltc-selector-lang")).toBe("en");
    setAppLang("tr");
    expect(store.get("oltc-selector-lang")).toBe("tr");
  });
});
