#!/usr/bin/env node
// Pack skills/oltc-selector/ into public/skills/oltc-selector.zip.
// Store-only entries with fixed timestamps, so the bytes are deterministic
// and the freshness check below can compare them against the committed zip.
//
//   node scripts/pack-skill.mjs           write the zip
//   node scripts/pack-skill.mjs --check   exit 1 when the committed zip is stale
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "skills", "oltc-selector");
const OUT = path.join(root, "public", "skills", "oltc-selector.zip");
const FILES = ["SKILL.md", "references/brochure-check.md"];

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function buildZip() {
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const name of FILES) {
    const data = readFileSync(path.join(SRC, name));
    const nameBuf = Buffer.from(name, "utf8");
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // local file header signature
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(0, 8); // method: store
    local.writeUInt16LE(0, 10); // time: fixed
    local.writeUInt16LE(0x21, 12); // date: 1980-01-01
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, nameBuf, data);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0); // central directory signature
    cd.writeUInt16LE(20, 4); // version made by
    cd.writeUInt16LE(20, 6); // version needed
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0x21, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(data.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);

    offset += 30 + nameBuf.length + data.length;
  }
  const cdBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // end of central directory
  end.writeUInt16LE(FILES.length, 8);
  end.writeUInt16LE(FILES.length, 10);
  end.writeUInt32LE(cdBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, cdBuf, end]);
}

const zip = buildZip();

if (process.argv.includes("--check")) {
  const committed = existsSync(OUT) ? readFileSync(OUT) : null;
  if (!committed || !committed.equals(zip)) {
    console.error(
      "public/skills/oltc-selector.zip is stale. Run: npm run pack:skill",
    );
    process.exit(1);
  }
  console.log("skill zip is in sync with skills/oltc-selector/");
} else {
  writeFileSync(OUT, zip);
  console.log(`wrote ${path.relative(root, OUT)} (${zip.length} bytes)`);
}
