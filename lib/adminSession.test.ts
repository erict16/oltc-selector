import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  adminLogout,
  isAdminConfigured,
  isAdminUser,
  readAdminSession,
  sha256Hex,
  tryAdminLogin,
} from "./adminSession";

const mem = { local: new Map<string, string>(), session: new Map<string, string>() };

function mockStore(map: Map<string, string>) {
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
}

describe("adminSession", () => {
  it("sha256Hex is stable", async () => {
    const a = await sha256Hex("test-password");
    const b = await sha256Hex("test-password");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await sha256Hex("other")).not.toBe(a);
  });

  it("accepts the built-in admin user", () => {
    expect(isAdminConfigured()).toBe(true);
    expect(isAdminUser("admin")).toBe(true);
    expect(isAdminUser(" Admin ")).toBe(false);
    expect(isAdminUser("eric")).toBe(false);
  });

  it("hashes the internal password to the built-in digest", async () => {
    expect(await sha256Hex("hm112233")).toBe(
      "487d4dd31f7fed4476ac4f22774fcabd63505c36703e8df36e8afe38f5eec51a",
    );
  });
});

describe("remember login", () => {
  beforeEach(() => {
    mem.local.clear();
    mem.session.clear();
    Object.defineProperty(globalThis, "localStorage", {
      value: mockStore(mem.local),
      configurable: true,
    });
    Object.defineProperty(globalThis, "sessionStorage", {
      value: mockStore(mem.session),
      configurable: true,
    });
    Object.defineProperty(globalThis, "window", {
      value: globalThis,
      configurable: true,
    });
  });

  afterEach(() => {
    adminLogout();
  });

  it("session-only login does not survive localStorage", async () => {
    expect(await tryAdminLogin("admin", "hm112233", false)).toBe(true);
    expect(readAdminSession()).toBe(true);
    expect(mem.session.get("oltc-selector:admin")).toBe("1");
    expect(mem.local.get("oltc-selector:admin")).toBeUndefined();
  });

  it("remember me writes localStorage", async () => {
    expect(await tryAdminLogin("admin", "hm112233", true)).toBe(true);
    expect(mem.local.get("oltc-selector:admin")).toBe("1");
    expect(mem.session.get("oltc-selector:admin")).toBeUndefined();
    mem.session.clear();
    expect(readAdminSession()).toBe(true);
  });
});
