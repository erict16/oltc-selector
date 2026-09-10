import { describe, expect, it } from "vitest";
import {
  isAdminConfigured,
  isAdminUser,
  sha256Hex,
} from "./adminSession";

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
