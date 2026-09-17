#!/usr/bin/env node
/**
 * Bundle selection-only CLI into pack/ for npm publish.
 * Must not include list RMB, coefficients, or quote fixtures.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const packDir = path.join(root, "pack");
const binDir = path.join(packDir, "bin");

const FORBIDDEN = [
  "listRmb",
  "basePrices.data.json",
  "coefficients.ts",
  "anthonyQs",
  "FOB Shanghai",
  "vietnam\": 1.1",
];

function run(cmd, args, cwd = root) {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8", shell: false });
  if (r.status !== 0) {
    throw new Error(
      `${cmd} ${args.join(" ")}\n${r.stdout || ""}\n${r.stderr || ""}`,
    );
  }
  return r.stdout || "";
}

rmSync(packDir, { recursive: true, force: true });
mkdirSync(binDir, { recursive: true });

const esbuild = path.join(root, "node_modules", "esbuild", "bin", "esbuild");
const outFile = path.join(binDir, "oltc.js");
run(process.execPath, [
  esbuild,
  path.join(root, "scripts", "oltc.ts"),
  "--bundle",
  "--platform=node",
  "--format=esm",
  "--target=node20",
  `--outfile=${outFile}`,
]);

let bundled = readFileSync(outFile, "utf8");
if (!bundled.startsWith("#!")) {
  bundled = "#!/usr/bin/env node\n" + bundled;
  writeFileSync(outFile, bundled);
}
for (const needle of FORBIDDEN) {
  if (bundled.includes(needle)) {
    throw new Error(`pack leak: bundled CLI contains ${needle}`);
  }
}

const pkg = {
  name: "oltc-selector",
  version: "1.1.0",
  description:
    "Huaming OLTC/OCTC type selection CLI. No prices. Same engine as the web app.",
  bin: { oltc: "bin/oltc.js" },
  type: "module",
  files: ["bin", "README.md"],
  engines: { node: ">=20" },
  license: "MIT",
  repository: {
    type: "git",
    url: "git+https://github.com/erict16/oltc-selector.git",
  },
  keywords: ["OLTC", "OCTC", "tap-changer", "Huaming"],
};

writeFileSync(
  path.join(packDir, "package.json"),
  JSON.stringify(pkg, null, 2) + "\n",
);

const readme = readFileSync(path.join(root, "README.md"), "utf8");
writeFileSync(path.join(packDir, "README.md"), readme);

console.log("packed", packDir);
