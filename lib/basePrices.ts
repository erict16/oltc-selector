import data from "./basePrices.data.json";
import { parseTypeString } from "./orderReplay";

export type BasePriceRow = {
  family: string;
  phases: string;
  currentA: number;
  connection: string;
  umKv: number;
  selectorSize: string;
  pitch: number | null;
  changeOver: string | null;
  listKey: string;
  tapCode: string;
  unitCount: number;
  listRmb: number;
  sheet: string;
  includesMdu: boolean;
};

export type ListPriceHit =
  | {
      found: true;
      listRmb: number;
      listKey: string;
      sheet: string;
      unitCount: number;
      includesMdu: boolean;
    }
  | { found: false; reason: "no-row" | "unparsed" };

type PriceFile = {
  source: string;
  generatedOn: string;
  currency: string;
  incoterm: string;
  includesMdu: boolean;
  rowCount: number;
  rows: BasePriceRow[];
};

const file = data as PriceFile;

export const BASE_PRICE_META = {
  source: file.source,
  generatedOn: file.generatedOn,
  currency: file.currency,
  incoterm: file.incoterm,
  rowCount: file.rowCount,
};

export const BASE_PRICE_ROWS: BasePriceRow[] = file.rows;

function stripMdu(raw: string): string {
  return raw.replace(
    /\+(CMA7|SHM-D[A]?|SHM-KX|HMIET|HMJK|ET-SZ6).*$/i,
    "",
  );
}

function pitchFromTap(tap: string): number | null {
  const m = tap.match(/^(\d{2})/);
  return m ? Number(m[1]) : null;
}

function changeOverFromTap(tap: string): string {
  const last = tap.slice(-1).toUpperCase();
  if (last === "W" || last === "G") return last;
  return "0";
}

type Index = {
  byKey: Map<string, BasePriceRow>;
  bySig: Map<string, BasePriceRow[]>;
};

function sig(parts: {
  family: string;
  phases: string;
  currentA: number;
  connection: string;
  umKv: number;
  selectorSize: string;
  pitch: number | null;
  changeOver: string | null;
}): string {
  return [
    parts.family,
    parts.phases,
    parts.currentA,
    parts.connection,
    parts.umKv,
    parts.selectorSize,
    parts.pitch ?? "",
    parts.changeOver ?? "",
  ].join("|");
}

function hwvSig(parts: {
  family: string;
  phases: string;
  currentA: number;
  connection: string;
  umKv: number;
}): string {
  return [
    parts.family,
    parts.phases,
    parts.currentA,
    parts.connection,
    parts.umKv,
  ].join("|");
}

let index: Index | null = null;

function getIndex(): Index {
  if (index) return index;
  const byKey = new Map<string, BasePriceRow>();
  const bySig = new Map<string, BasePriceRow[]>();
  for (const row of BASE_PRICE_ROWS) {
    byKey.set(row.listKey.replace(/\s+/g, ""), row);
    const k = sig(row);
    const bucket = bySig.get(k);
    if (bucket) bucket.push(row);
    else bySig.set(k, [row]);
    if (row.family === "HWV" || row.family === "HWDK") {
      const hk = `hwv:${hwvSig(row)}`;
      const hb = bySig.get(hk);
      if (hb) hb.push(row);
      else bySig.set(hk, [row]);
    }
  }
  index = { byKey, bySig };
  return index;
}

/**
 * List RMB FOB Shanghai for a commercial type string.
 * Matches family / Iᵤ / Um / Y-D / selector / pitch+W|G|0.
 * HWV list only publishes 18353W twins — match duty axes, not the tap code.
 * Does not apply country coefficient. Does not add CMA7 (set already includes MDU).
 */
export function lookupListPrice(model: string): ListPriceHit {
  const cleaned = stripMdu(model).trim();
  if (!cleaned) return { found: false, reason: "unparsed" };

  const compact = cleaned.replace(/\s+/g, "").replace(/[×*]/g, "x");
  const idx = getIndex();
  const exact = idx.byKey.get(compact);
  if (exact) {
    return {
      found: true,
      listRmb: exact.listRmb,
      listKey: exact.listKey,
      sheet: exact.sheet,
      unitCount: exact.unitCount || 1,
      includesMdu: exact.includesMdu,
    };
  }

  const parsed = parseTypeString(cleaned);
  if (!parsed) return { found: false, reason: "unparsed" };

  const pitch = pitchFromTap(parsed.tapCode);
  const changeOver = changeOverFromTap(parsed.tapCode);
  const want = {
    family: parsed.family,
    phases: parsed.phases,
    currentA: parsed.currentA,
    connection: parsed.connection,
    umKv: parsed.umKv,
    selectorSize: parsed.selectorSize,
    pitch,
    changeOver,
  };

  const hits =
    parsed.family === "HWV" || parsed.family === "HWDK"
      ? idx.bySig.get(`hwv:${hwvSig(want)}`)
      : idx.bySig.get(sig(want));

  const row = hits?.[0];
  if (!row) return { found: false, reason: "no-row" };

  const modelUnits = parsed.unitCount || 1;
  const rowUnits = row.unitCount || 1;
  const listRmb = Math.round(row.listRmb * (modelUnits / rowUnits));

  return {
    found: true,
    listRmb,
    listKey: row.listKey,
    sheet: row.sheet,
    unitCount: modelUnits,
    includesMdu: row.includesMdu,
  };
}
