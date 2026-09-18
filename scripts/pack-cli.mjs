#!/usr/bin/env node
/**
 * Bundle selection-only CLI into pack/ for npm publish.
 * Must not include list RMB, coefficients, or quote fixtures.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";

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

// No rm of pack/: a stray shell sitting in it (CWD lock) makes the delete
// fail with EPERM on Windows. The file set is fixed, so overwrite in place.
mkdirSync(binDir, { recursive: true });

// JS API, not the bin shim: on Unix the postinstall replaces
// node_modules/esbuild/bin/esbuild with the native binary, so
// `node .../bin/esbuild` crashes there (ELF is not JS).
const outFile = path.join(binDir, "oltc.js");
buildSync({
  entryPoints: [path.join(root, "scripts", "oltc.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile: outFile,
});

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

// CLI version lives here. The agent skill is a separate repo
// (erict16/huaming-oltc-selector) and must pin this same number.
const VERSION = "1.2.7";

const pkg = {
  name: "oltc-selector",
  version: VERSION,
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
