import { describe, expect, it } from "vitest";
import { isAdminConfigured, sha256Hex } from "./adminSession";

describe("adminSession", () => {
  it("sha256Hex is stable", async () => {
    const a = await sha256Hex("test-password");
    const b = await sha256Hex("test-password");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await sha256Hex("other")).not.toBe(a);
  });

  it("is closed when no hash is configured", () => {
    expect(isAdminConfigured()).toBe(false);
  });
});
