// Pack the skill variants into public/skills/*.zip.
// Store-only entries with fixed timestamps, so the bytes are deterministic
// and the freshness check below can compare them against the committed zips.
// All text is normalized to LF: some skill loaders split frontmatter on "\n"
// and choke on CRLF.
//
//   node scripts/pack-skill.mjs           write the zips
//   node scripts/pack-skill.mjs --check   exit 1 when a committed zip is stale
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

export const VARIANTS = [
  {
    id: "workbuddy",
    src: path.join(root, "skills", "huaming-oltc-selector"),
    out: path.join(root, "public", "skills", "huaming-oltc-selector.zip"),
    files: ["SKILL.md", "manifest.yaml", "references/brochure-check.md"],
  },
  {
    id: "international",
    src: path.join(root, "skills", "huaming-oltc-selector-international"),
    out: path.join(
      root,
      "public",
      "skills",
      "huaming-oltc-selector-international.zip",
    ),
    files: ["SKILL.md", "manifest.yaml", "references/brochure-check.md"],
  },
];

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

/** [{ name, data }] with LF-normalized contents, in packaging order. */
export function buildEntries(variant) {
  return variant.files.map((name) => ({
    name,
    data: Buffer.from(
      readFileSync(path.join(variant.src, name), "utf8").replace(/\r\n/g, "\n"),
      "utf8",
    ),
  }));
}

export function buildZip(entries) {
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const { name, data } of entries) {
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
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cdBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, cdBuf, end]);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const check = process.argv.includes("--check");
  let stale = 0;
  for (const variant of VARIANTS) {
    const zip = buildZip(buildEntries(variant));
    const rel = path.relative(root, variant.out);
    if (check) {
      const committed = existsSync(variant.out) ? readFileSync(variant.out) : null;
      if (!committed || !committed.equals(zip)) {
        console.error(`${rel} is stale. Run: npm run pack:skill`);
        stale++;
      } else {
        console.log(`${rel} is in sync with ${path.relative(root, variant.src)}/`);
      }
    } else {
      mkdirSync(path.dirname(variant.out), { recursive: true });
      writeFileSync(variant.out, zip);
      console.log(`wrote ${rel} (${zip.length} bytes)`);
    }
  }
  if (stale) process.exit(1);
}
