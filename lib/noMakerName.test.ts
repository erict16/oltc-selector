import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The repo is public: README and code must not name the manufacturer.
// Written as escapes so this file does not contain the words itself.
const MAKER = /\u534E\u660E|hua[m]ing/i;

// The agent skill is published under this name on another site. The link
// has to stay as it is, so the slug is taken out of a line before the check.
const SKILL_SLUG = new RegExp(["hua", "ming-oltc-selector"].join(""), "g");

const ROOT = process.cwd();
const FILES = ["README.md", "README.zh-CN.md", "AGENTS.md", "next.config.ts", "package.json"];
const DIRS = ["app", "components", "lib", "scripts"];
const CODE = /\.(ts|tsx|js|mjs|cjs|py|css|md)$/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : CODE.test(name) ? [full] : [];
  });
}

describe("no manufacturer name in README or code", () => {
  const files = [
    ...FILES.map((f) => path.join(ROOT, f)),
    ...DIRS.flatMap((d) => walk(path.join(ROOT, d))),
  ];

  it("scans a real set of files", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("finds no hits", () => {
    const hits = files.flatMap((f) =>
      readFileSync(f, "utf8")
        .split("\n")
        .map((line, i) => ({ line, i }))
        .filter(({ line }) => MAKER.test(line.replace(SKILL_SLUG, "")))
        .map(({ i }) => `${path.relative(ROOT, f)}:${i + 1}`),
    );
    expect(hits).toEqual([]);
  });
});
