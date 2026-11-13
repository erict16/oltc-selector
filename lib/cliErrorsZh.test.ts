import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "./cli";
import { cliErrorLines, cliErrorZh } from "./cliErrorsZh";

/** 2026-11-14 CLI review: errors arrived in English on a Chinese run. */

const HAN = /[一-鿿]/;

function run(argv: string[]): { code: number; out: string; err: string } {
  let out = "";
  let err = "";
  const code = runCli([...argv, "--no-update-check"], { stdout: (s) => (out += s), stderr: (s) => (err += s) });
  return { code, out, err };
}

describe("CLI errors in Chinese", () => {
  it("every error message written in lib/cli.ts has a Chinese row", () => {
    const src = readFileSync(resolve(__dirname, "cli.ts"), "utf8");
    const found = [...src.matchAll(/new CliError\(\s*(?:"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`)/g)].map(
      (m) => (m[1] ?? m[2])!,
    );
    expect(found.length).toBeGreaterThan(45);
    const missing = found
      // The --line message names what it could not read; checked below.
      .filter((msg) => !msg.startsWith("Could not read ${what}"))
      .map((msg) => msg.replace(/\\"/g, '"').replace(/\$\{[^}]*\}/g, "7"))
      .filter((msg) => cliErrorZh(msg) == null);
    expect(missing).toEqual([]);
  });

  it.each([
    [["--iu", "abc"], "--iu 的数字无效：abc"],
    [["--iu", "-5"], "--iu 必须大于 0（收到 -5）"],
    [["--iu", "1,200", "--um", "72.5"], "--iu 的数字有歧义"],
    [["--iuu", "5"], "未知参数：--iuu。是不是想写 --iu？"],
    [["--iu"], "--iu 缺少值"],
    [["--iu", "400", "--um", "72.5", "--iu", "500"], "--iu 给了两次"],
    [["--iu", "400", "--um", "72.5", "--oil", "--vacuum"], "--oil 和 --vacuum 只能给一个"],
    [["--mva", "25", "--kv", "110", "--conn", "D"], "--conn 不用于 --mva"],
    [["--mva", "25", "--kv", "110", "--market", "IT"], "--market 已删除"],
    [["--mva", "25"], "--mva 需要 --kv"],
    [["--um", "72.5"], "需要 --iu"],
    [["--iu", "400"], "需要 --um"],
    [["--iu", "400", "--um", "72.5", "--series", "II"], "--series 是无载接线方式"],
    [["--line", "transformer for substation 3"], "--line 读不出容量和电压"],
  ] as const)("%j", (argv, zh) => {
    const r = run([...argv]);
    expect(r.code).toBe(1);
    const lines = r.err.trim().split("\n");
    expect(lines[0]).toContain(zh);
    // The English follows, as for the engine's own "no type" errors.
    expect(lines.length).toBe(2);
    expect(HAN.test(lines[1]!)).toBe(false);
  });

  it("--lang en prints the English alone, wherever the flag sits", () => {
    for (const argv of [["--lang", "en", "--iu", "abc"], ["--iu", "abc", "--lang=en"]]) {
      const r = run(argv);
      expect(r.err.trim()).toBe("Invalid number for --iu: abc");
    }
  });

  it("an engine error that is already bilingual is not doubled", () => {
    const r = run(["--iu", "99999", "--um", "72.5"]);
    const lines = r.err.trim().split("\n");
    expect(lines.length).toBe(2);
    expect(HAN.test(lines[0]!)).toBe(true);
    expect(HAN.test(lines[1]!)).toBe(false);
  });

  it("a message with no row falls back to English, never to nothing", () => {
    expect(cliErrorLines("Something new", "zh")).toEqual(["Something new"]);
  });
});
