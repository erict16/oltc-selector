import data from "./listIndex.data.json";
import { parseTypeString } from "./parseType";

type OctcRow = {
  family: string;
  phases: string;
  currentA: number;
  connection: string;
  umKv: number;
  selectorSize: string;
  tapCode: string;
  listKey: string;
};

type IndexFile = {
  source: string;
  generatedOn: string;
  keyCount: number;
  keys: string[];
  octc: OctcRow[];
};

const file = data as IndexFile;

export const LIST_INDEX_META = {
  source: file.source,
  generatedOn: file.generatedOn,
  keyCount: file.keyCount,
};

const KEYS = new Set(file.keys);

function stripMdu(raw: string): string {
  return raw.replace(
    /\+(CMA7|SHM-D[A]?|SHM-KX|HMIET|HMJK|ET-SZ6).*$/i,
    "",
  );
}

export function compactTypeKey(model: string): string {
  return stripMdu(model).trim().replace(/\s+/g, "").replace(/[×*]/g, "x");
}

function octcSig(row: {
  family: string;
  phases: string;
  currentA: number;
  connection: string;
  umKv: number;
  selectorSize: string;
  tapCode: string;
}): string {
  return [
    "octc",
    row.family,
    row.phases,
    row.currentA,
    row.connection,
    row.umKv,
    row.selectorSize,
    row.tapCode,
  ].join("|");
}

type OctcIndex = {
  byKey: Set<string>;
  bySig: Map<string, OctcRow[]>;
};

let octcIndex: OctcIndex | null = null;

function getOctcIndex(): OctcIndex {
  if (octcIndex) return octcIndex;
  const bySig = new Map<string, OctcRow[]>();
  for (const row of file.octc) {
    const k = octcSig(row);
    const bucket = bySig.get(k);
    if (bucket) bucket.push(row);
    else bySig.set(k, [row]);
  }
  octcIndex = { byKey: KEYS, bySig };
  return octcIndex;
}

const OCTC_SIZE_FALLBACK = ["A", "B", "E", "D", "C", ""];

function lookupOctcRows(
  parsed: {
    family: string;
    phases: string;
    currentA: number;
    connection: string;
    umKv: number;
    selectorSize: string;
    tapCode: string;
  },
): OctcRow[] | undefined {
  const idx = getOctcIndex();
  const tryFam = (family: string): OctcRow[] | undefined => {
    const base = { ...parsed, family };
    const exact = idx.bySig.get(octcSig(base));
    if (exact?.length) return exact;
    if (parsed.selectorSize) return undefined;
    for (const sz of OCTC_SIZE_FALLBACK) {
      const hits = idx.bySig.get(octcSig({ ...base, selectorSize: sz }));
      if (hits?.length) return hits;
    }
    return undefined;
  };
  return (
    tryFam(parsed.family) ??
    (parsed.family === "WDL" ? tryFam("WSL") : undefined)
  );
}

/** True when this commercial string is a 2025-list WSL/WDL row (no RMB). */
export function listRowExists(model: string): boolean {
  const compact = compactTypeKey(model);
  if (!compact) return false;
  if (KEYS.has(compact)) return true;
  const parsed = parseTypeString(compact);
  if (!parsed) return false;
  if (parsed.family !== "WSL" && parsed.family !== "WDL") return false;
  return Boolean(lookupOctcRows(parsed)?.length);
}

/**
 * First 2025-list spelling of an OCTC model, or null.
 * Tries locked size → auto sizes, then the Y/D-stripped twin.
 */
export function resolveOctcListKey(model: string): string | null {
  const parsed = parseTypeString(model);
  if (!parsed) return null;
  if (parsed.family === "WSG") return model;
  if (parsed.family !== "WSL" && parsed.family !== "WDL") return null;

  const candidates = new Set<string>();
  const add = (m: string) => {
    if (m) candidates.add(m);
  };
  add(model);
  const stripped = model.replace(/(\d+)[YD]\//, "$1/");
  add(stripped);
  const sizeNow = parsed.selectorSize;
  const sizes = ["A", "B", "D", "E"] as const;
  for (const sz of sizes) {
    if (!sizeNow) {
      add(`${model}${sz}`);
      add(`${stripped}${sz}`);
    } else {
      add(model.replace(new RegExp(`${sizeNow}$`), sz));
      add(stripped.replace(new RegExp(`${sizeNow}$`), sz));
    }
  }
  for (const c of candidates) {
    if (listRowExists(c)) {
      const hits = lookupOctcRows(parseTypeString(c) ?? parsed);
      return hits?.[0]?.listKey ?? compactTypeKey(c);
    }
  }
  const hits = lookupOctcRows(parsed);
  return hits?.[0]?.listKey ?? null;
}
