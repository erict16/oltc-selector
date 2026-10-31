import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "./cli";
import {
  UPDATE_TTL_MS,
  checkForUpdate,
  isNewer,
  updateCheckEnabled,
} from "./updateCheck";

const cacheFile = () =>
  path.join(mkdtempSync(path.join(tmpdir(), "oltc-update-")), "update-check.json");

describe("update check", () => {
  it("compares x.y.z numerically and ignores junk", () => {
    expect(isNewer("2.2.0", "2.1.0")).toBe(true);
    expect(isNewer("2.10.0", "2.9.9")).toBe(true);
    expect(isNewer("2.1.0", "2.1.0")).toBe(false);
    expect(isNewer("2.0.9", "2.1.0")).toBe(false);
    expect(isNewer("3.0.0-beta.1", "2.1.0")).toBe(false);
  });

  it("prints a notice for a newer version and installs nothing", async () => {
    const notice = await checkForUpdate({
      current: "2.1.0",
      cacheFile: cacheFile(),
      fetchLatest: async () => "2.2.0",
    });
    expect(notice).toContain("2.2.0");
    expect(notice).toContain("不会自动更新");
    expect(notice).toContain("npm i -g oltc-selector@latest");
  });

  it("stays quiet when current, offline, or the registry answers junk", async () => {
    for (const fetchLatest of [
      async () => "2.1.0",
      async () => null,
      async () => {
        throw new Error("offline");
      },
    ]) {
      expect(
        await checkForUpdate({ current: "2.1.0", cacheFile: cacheFile(), fetchLatest }),
      ).toBeNull();
    }
  });

  it("asks the registry at most once a day", async () => {
    const file = cacheFile();
    let calls = 0;
    const fetchLatest = async () => {
      calls++;
      return "2.2.0";
    };
    const t0 = 1_800_000_000_000;
    await checkForUpdate({ current: "2.1.0", cacheFile: file, now: t0, fetchLatest });
    const again = await checkForUpdate({
      current: "2.1.0",
      cacheFile: file,
      now: t0 + 60_000,
      fetchLatest,
    });
    expect(calls).toBe(1);
    expect(again).toContain("2.2.0");
    await checkForUpdate({
      current: "2.1.0",
      cacheFile: file,
      now: t0 + UPDATE_TTL_MS + 1,
      fetchLatest,
    });
    expect(calls).toBe(2);
  });

  it("survives a corrupt cache file", async () => {
    const file = cacheFile();
    writeFileSync(file, "{not json");
    const notice = await checkForUpdate({
      current: "2.1.0",
      cacheFile: file,
      fetchLatest: async () => "2.1.1",
    });
    expect(notice).toContain("2.1.1");
    expect(JSON.parse(readFileSync(file, "utf8")).latest).toBe("2.1.1");
  });

  it("is off for --no-update-check, CI and the opt-out variables", () => {
    expect(updateCheckEnabled([], {})).toBe(true);
    expect(updateCheckEnabled(["--no-update-check"], {})).toBe(false);
    expect(updateCheckEnabled([], { CI: "true" })).toBe(false);
    expect(updateCheckEnabled([], { OLTC_NO_UPDATE_CHECK: "1" })).toBe(false);
    expect(updateCheckEnabled([], { NO_UPDATE_NOTIFIER: "1" })).toBe(false);
  });

  it("accepts --no-update-check as a CLI flag", () => {
    let out = "";
    const code = runCli(["--iu", "350", "--um", "40.5", "--no-update-check"], {
      stdout: (s) => (out += s),
      stderr: () => {},
    });
    expect(code).toBe(0);
    expect(out.split("\n")[0]).toMatch(/^CV2III-350Y\/40\.5-/);
  });
});
