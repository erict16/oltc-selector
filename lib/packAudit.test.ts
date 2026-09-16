import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { commercialTypeExists } from "./typeExists";

const root = process.cwd();
const bin = path.join(root, "pack", "bin", "oltc.js");

describe("selection-only pack", () => {
  it("bundles oltc.js without prices and prints a stable legal primary", () => {
    const pack = spawnSync(process.execPath, [path.join(root, "scripts", "pack-cli.mjs")], {
      cwd: root,
      encoding: "utf8",
    });
    expect(pack.status, pack.stderr + pack.stdout).toBe(0);
    expect(existsSync(bin)).toBe(true);
    const packedPkg = JSON.parse(
      readFileSync(path.join(root, "pack", "package.json"), "utf8"),
    );
    expect(packedPkg.name).toBe("oltc-selector");
    expect(packedPkg.bin).toEqual({ oltc: "bin/oltc.js" });
    const js = readFileSync(bin, "utf8");
    expect(js.includes("listRmb")).toBe(false);
    expect(js.includes('"listRmb"')).toBe(false);
    expect(js.includes("basePrices.data.json")).toBe(false);
    expect(js.includes("anthonyQs")).toBe(false);
    expect(js).not.toMatch(/coeff|CNY|USD/);

    const argv = ["--iu", "350", "--um", "40.5", "--conn", "D", "--reg", "W", "--pm", "8"];
    const once = spawnSync(process.execPath, [bin, ...argv], {
      cwd: path.join(root, "pack"),
      encoding: "utf8",
    });
    const twice = spawnSync(process.execPath, [bin, ...argv], {
      cwd: path.join(root, "pack"),
      encoding: "utf8",
    });
    expect(once.status, once.stderr).toBe(0);
    expect(once.stdout).toBe(twice.stdout);
    const primary = once.stdout.trim().split(/\r?\n/)[0]!;
    expect(primary).toBe("CV2III-350D/40.5-10193W");
    expect(commercialTypeExists(primary)).toBe(true);
    expect(once.stdout).not.toMatch(/RMB|CNY|USD|listRmb|coeff/i);

    const octc = spawnSync(
      process.execPath,
      [bin, "--octc", "--iu", "800", "--um", "72.5", "--conn", "D", "--series", "II", "--contact", "6x5"],
      { cwd: path.join(root, "pack"), encoding: "utf8" },
    );
    expect(octc.status, octc.stderr).toBe(0);
    const octcPrimary = octc.stdout.trim().split(/\r?\n/)[0]!;
    expect(octcPrimary.startsWith("WSL") || octcPrimary.startsWith("WSG")).toBe(
      true,
    );
    expect(commercialTypeExists(octcPrimary)).toBe(true);
  });
});
