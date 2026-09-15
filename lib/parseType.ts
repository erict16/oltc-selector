export type TypeParts = {
  unitCount: number;
  family: string;
  phases: string;
  currentA: number;
  connection: string;
  umKv: number;
  selectorSize: string;
  tapCode: string;
};

/** Normalize commercial type strings from QS/OS (spaces, ×, *, en-dash). */
export function normalizeType(raw: string): string {
  let t = raw
    .replace(/[×*]/g, "x")
    .replace(/[–—－]/g, "-")
    .replace(/,/g, ".")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/\s+/g, "")
    .replace(/(\d)_(\d)/g, "$1x$2")
    .replace(/(III|II|I)(\d)/, "$1-$2")
    .replace(/(WSL|WDL|WSG)(VIII|VII|IV|VI|IX|V)(\d)/i, "$1$2-$3");
  if (!t.includes("/")) {
    t = t.replace(/([YD])(\d+(?:\.\d+)?)-/i, "$1/$2-");
  }
  t = t.replace(
    /(363|362|330|300|252|170|145|126|72\.5|40\.5|17\.5|12\.5|12)(\d{1,2}x\d)/,
    "$1-$2",
  );
  return t;
}

const OCTC_TYPE_RE =
  /^(?:(\d+)x)?(WSL|WDL|WSG)(VIII|VII|III|II|IV|VI|IX|V|I)-(\d+)([YD])?[/-](\d+(?:\.\d+)?)-(\d+)x(\d+)(?:\((\d+)x(\d+)\))?(?:\(([A-E])\)|([A-E]))?$/i;

/**
 * Parse a Huaming commercial type.
 *   SHZVIII-1000Y/72.5C-12233W
 *   3xSHZVI-2400/72.5C-10193W
 *   CV2III-350D/40.5-10193W
 *   WSLIV-800Y/170-6x5B
 */
export function parseTypeString(raw: string): TypeParts | null {
  const t = normalizeType(raw);
  const octc = t.match(OCTC_TYPE_RE);
  if (octc) {
    const contact =
      octc[9] && octc[10]
        ? `${Number(octc[9])}x${Number(octc[10])}`
        : `${Number(octc[7])}x${Number(octc[8])}`;
    return {
      unitCount: octc[1] ? Number(octc[1]) : 1,
      family: octc[2].toUpperCase(),
      phases: octc[3].toUpperCase(),
      currentA: Number(octc[4]),
      connection: (octc[5] ?? "").toUpperCase(),
      umKv: Number(octc[6]),
      selectorSize: (octc[11] || octc[12] || "").toUpperCase(),
      tapCode: contact,
    };
  }
  const re =
    /^(?:(\d+)x)?([A-Z][A-Z0-9]*?)(III|II|I)-(\d+)([YD])?\/(\d+(?:\.\d+)?)([BCDE]+)?-(\d+[WG0]?)$/;
  const m = t.match(re);
  if (!m) return null;
  return {
    unitCount: m[1] ? Number(m[1]) : 1,
    family: m[2],
    phases: m[3],
    currentA: Number(m[4]),
    connection: m[5] ?? "",
    umKv: Number(m[6]),
    selectorSize: m[7] ?? "",
    tapCode: m[8],
  };
}
