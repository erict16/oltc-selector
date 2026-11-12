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

// One version number: lib/appVersion.ts. The agent skill is a separate repo
// (private) and must pin this same number.
const versionMatch = /APP_VERSION = "(\d+\.\d+\.\d+)"/.exec(
  readFileSync(path.join(root, "lib", "appVersion.ts"), "utf8"),
);
if (!versionMatch) throw new Error("pack: APP_VERSION not found in lib/appVersion.ts");
const VERSION = versionMatch[1];

const pkg = {
  name: "oltc-selector",
  version: VERSION,
  description:
    "OLTC/OCTC type selection CLI. No prices. Same engine as the web app.",
  bin: { oltc: "bin/oltc.js" },
  type: "module",
  files: ["bin", "README.md", "LICENSE"],
  engines: { node: ">=20" },
  license: "MIT",
  repository: {
    type: "git",
    url: "git+https://github.com/erict16/oltc-selector.git",
  },
  keywords: ["OLTC", "OCTC", "tap-changer"],
};

writeFileSync(
  path.join(packDir, "package.json"),
  JSON.stringify(pkg, null, 2) + "\n",
);

// The npm page gets the CLI part only: no screenshot link that breaks there,
// no develop notes for a repository the reader has not cloned.
const readme = readFileSync(path.join(root, "README.md"), "utf8");
const from = readme.indexOf("## CLI");
const to = readme.indexOf("## Develop");
if (from < 0 || to < from) throw new Error("pack: README needs ## CLI before ## Develop");
const cliReadme =
  "# oltc-selector\n\n" +
  "Tap-changer type selection from the command line. The command is `oltc`. " +
  "No prices. Same engine as the web page: https://oltc-selector.vercel.app/\n\n" +
  "The type is a starting point. Get engineering confirmation before an order.\n\n" +
  readme.slice(from, to).trimEnd() +
  "\n";
writeFileSync(path.join(packDir, "README.md"), cliReadme);
writeFileSync(path.join(packDir, "LICENSE"), readFileSync(path.join(root, "LICENSE"), "utf8"));

console.log("packed", packDir);
