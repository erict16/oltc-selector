// Stage a skillhub.cn-compatible copy of the workbuddy skill into a temp dir.
// skillhub.cn wants slug/displayName/summary/license in the SKILL.md frontmatter;
// we keep name/description/allowed-tools alongside for the other ecosystems.
//
//   node scripts/stage-cn.mjs           prints the staged dir
//   then: python <skillhub-cli> publish <dir> --changelog "..."
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "skills", "huaming-oltc-selector");

const SUMMARY =
  "贴变压器铭牌或给参数（容量、电压、电流、调压方式、分接范围），用 oltc 命令选出样本册里真实存在的华明有载/无载分接开关型号，并说明选型理由。不含报价。";

const out = mkdtempSync(path.join(os.tmpdir(), "skillhub-cn-"));
const dir = path.join(out, "huaming-oltc-selector");
cpSync(SRC, dir, { recursive: true });

// skillhub.cn rejects png inside the package ("不允许的文件类型").
// The icon is uploaded once via their web console instead.
rmSync(path.join(dir, "assets"), { recursive: true, force: true });

const skillPath = path.join(dir, "SKILL.md");
const text = readFileSync(skillPath, "utf8");
const version = text.match(/^version: (.+)$/m)?.[1]?.trim() ?? "1.0.0";

const extra = [
  "slug: huaming-oltc-selector",
  "displayName: 华明分接开关选型助手",
  `summary: ${SUMMARY}`,
  "license: MIT",
].join("\n");

// insert right after the name line inside the frontmatter
const updated = text.replace(
  /^name: huaming-oltc-selector$/m,
  `name: huaming-oltc-selector\n${extra}`,
);
if (updated === text) {
  throw new Error("name line not found in SKILL.md frontmatter");
}
writeFileSync(skillPath, updated);

console.log(`staged: ${dir}`);
console.log(`version: ${version}`);
console.log(
  `publish: python <skills_store_cli.py> publish "${dir}" --changelog "<本次变更>"`,
);
