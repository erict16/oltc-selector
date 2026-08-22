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
      estimated?: boolean;
      method?: string;
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

const LIST_FAMILIES = new Set(BASE_PRICE_ROWS.map((r) => r.family));

function pitchFromTap(tap: string): number | null {
  const m = tap.match(/^(\d{2})/);
  return m ? Number(m[1]) : null;
}

/** Linear (10070) and list rows written `10...` (no W/G/0) are change-over 0. */
function normChangeOver(value: string | null | undefined): string {
  const c = (value ?? "").trim().toUpperCase();
  if (c === "W" || c === "G") return c;
  return "0";
}

function changeOverFromTap(tap: string): string {
  return normChangeOver(tap.slice(-1));
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
    normChangeOver(parts.changeOver),
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

function isOctcFamily(family: string): boolean {
  return family === "WSL" || family === "WDL" || family === "WSG";
}

function octcSig(parts: {
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
    parts.family,
    parts.phases,
    parts.currentA,
    parts.connection,
    parts.umKv,
    parts.selectorSize,
    parts.tapCode,
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
    if (isOctcFamily(row.family)) {
      const ok = octcSig({
        family: row.family,
        phases: row.phases,
        currentA: row.currentA,
        connection: row.connection,
        umKv: row.umKv,
        selectorSize: row.selectorSize,
        tapCode: row.tapCode,
      });
      const ob = bySig.get(ok);
      if (ob) ob.push(row);
      else bySig.set(ok, [row]);
    }
  }
  index = { byKey, bySig };
  return index;
}

const OCTC_SIZE_FALLBACK = ["A", "B", "E", "D", "C", ""];

function lookupOctc(
  idx: Index,
  parsed: {
    family: string;
    phases: string;
    currentA: number;
    connection: string;
    umKv: number;
    selectorSize: string;
    tapCode: string;
  },
): BasePriceRow[] | undefined {
  const tryFam = (family: string): BasePriceRow[] | undefined => {
    const base = {
      family,
      phases: parsed.phases,
      currentA: parsed.currentA,
      connection: parsed.connection,
      umKv: parsed.umKv,
      selectorSize: parsed.selectorSize,
      tapCode: parsed.tapCode,
    };
    const exact = idx.bySig.get(octcSig(base));
    if (exact?.length) return exact;
    if (parsed.selectorSize) return undefined;
    for (const sz of OCTC_SIZE_FALLBACK) {
      const hits = idx.bySig.get(octcSig({ ...base, selectorSize: sz }));
      if (hits?.length) return hits;
    }
    return undefined;
  };
  return tryFam(parsed.family) ?? (parsed.family === "WDL" ? tryFam("WSL") : undefined);
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
  if (!LIST_FAMILIES.has(parsed.family)) {
    return { found: false, reason: "no-row" };
  }

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

  const Y_TWIN_FAMILIES = new Set(["CM", "CM2", "CMD", "SHZV", "SHZVG"]);

  let hits =
    parsed.family === "HWV" || parsed.family === "HWDK"
      ? idx.bySig.get(`hwv:${hwvSig(want)}`)
      : isOctcFamily(parsed.family)
        ? lookupOctc(idx, parsed)
        : idx.bySig.get(sig(want));

  // Combined sheets only print Y. D uses the Y twin (same I / Um / grade / tap).
  if (
    !hits?.length &&
    Y_TWIN_FAMILIES.has(parsed.family) &&
    parsed.connection === "D"
  ) {
    hits = idx.bySig.get(sig({ ...want, connection: "Y" }));
  }

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

const SIZE_ORDER = ["A", "B", "C", "D", "DE", "E"] as const;
const DEFAULT_SIZE_UP = [1.04, 1.06, 1.08, 1.1, 1.08];
const ESTIMATE_METHOD = "nearest-neighbor + I/Um/pitch/size/change-over scale";

type Want = {
  family: string;
  phases: string;
  currentA: number;
  connection: string;
  umKv: number;
  selectorSize: string;
  pitch: number | null;
  changeOver: string | null;
  tapCode: string;
  unitCount: number;
  octc: boolean;
  hwv: boolean;
};

type FamilyScale = {
  currentAlpha: number;
  umAlpha: number;
  sizeUp: number[];
  pitchPerStep: number;
  wOver0: number;
  gOverW: number;
  tapPerStep: number;
};

const rowsByFamily = new Map<string, BasePriceRow[]>();
const scaleByFamily = new Map<string, FamilyScale>();

function familyRows(family: string): BasePriceRow[] {
  let rows = rowsByFamily.get(family);
  if (!rows) {
    rows = BASE_PRICE_ROWS.filter((r) => r.family === family && r.listRmb > 0);
    rowsByFamily.set(family, rows);
  }
  return rows;
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m]! : (a[m - 1]! + a[m]!) / 2;
}

function sizeRank(sz: string): number {
  return SIZE_ORDER.indexOf(sz as (typeof SIZE_ORDER)[number]);
}

function coRank(value: string | null | undefined): number {
  const c = normChangeOver(value);
  if (c === "0") return 0;
  if (c === "W") return 1;
  return 2;
}

function contactN(tap: string): number | null {
  const m = tap.match(/^(\d+)x/i);
  return m ? Number(m[1]) : null;
}

function unitPrice(row: BasePriceRow): number {
  return row.listRmb / (row.unitCount || 1);
}

function axisKey(
  row: {
    phases: string;
    connection: string;
    currentA: number;
    umKv: number;
    selectorSize: string;
    pitch: number | null;
    changeOver: string | null;
    tapCode: string;
  },
  drop: string,
): string {
  return [
    row.phases,
    row.connection,
    drop === "currentA" ? "" : row.currentA,
    drop === "umKv" ? "" : row.umKv,
    drop === "selectorSize" ? "" : row.selectorSize,
    drop === "pitch" ? "" : (row.pitch ?? ""),
    drop === "changeOver" ? "" : (row.changeOver == null ? "" : normChangeOver(row.changeOver)),
    drop === "tapCode" ? "" : row.tapCode,
  ].join("|");
}

function groupByAxis(
  rows: BasePriceRow[],
  drop: string,
): Map<string, BasePriceRow[]> {
  const m = new Map<string, BasePriceRow[]>();
  for (const row of rows) {
    if ((row.unitCount || 1) !== 1) continue;
    const k = axisKey(row, drop);
    const bucket = m.get(k);
    if (bucket) bucket.push(row);
    else m.set(k, [row]);
  }
  return m;
}

function powerAlphas(
  groups: Map<string, BasePriceRow[]>,
  getX: (r: BasePriceRow) => number,
  lo: number,
  hi: number,
): number[] {
  const out: number[] = [];
  for (const group of groups.values()) {
    const uniq = [
      ...new Map(group.map((r) => [getX(r), r] as const)).values(),
    ].sort((a, b) => getX(a) - getX(b));
    for (let i = 0; i < uniq.length - 1; i++) {
      const a = uniq[i]!;
      const b = uniq[i + 1]!;
      const xa = getX(a);
      const xb = getX(b);
      if (xa <= 0 || xb <= 0 || xa === xb || a.listRmb <= 0 || b.listRmb <= 0) {
        continue;
      }
      const alpha = Math.log(b.listRmb / a.listRmb) / Math.log(xb / xa);
      if (Number.isFinite(alpha) && alpha >= lo && alpha <= hi) out.push(alpha);
    }
  }
  return out;
}

function familyScale(family: string): FamilyScale {
  const cached = scaleByFamily.get(family);
  if (cached) return cached;

  const rows = familyRows(family);
  const iAlphas = powerAlphas(groupByAxis(rows, "currentA"), (r) => r.currentA, 0.05, 0.8);
  const umAlphas = powerAlphas(groupByAxis(rows, "umKv"), (r) => r.umKv, 0, 0.6);

  const sizeUp = [...DEFAULT_SIZE_UP];
  const sizeXs: number[][] = SIZE_ORDER.slice(0, -1).map(() => []);
  for (const group of groupByAxis(rows, "selectorSize").values()) {
    const by = new Map<string, number>();
    for (const r of group) by.set(r.selectorSize, r.listRmb);
    for (let i = 0; i < SIZE_ORDER.length - 1; i++) {
      const lo = by.get(SIZE_ORDER[i]!);
      const hi = by.get(SIZE_ORDER[i + 1]!);
      if (lo && hi) {
        const ratio = hi / lo;
        if (ratio >= 1 && ratio <= 1.4) sizeXs[i]!.push(ratio);
      }
    }
  }
  for (let i = 0; i < sizeUp.length; i++) {
    if (sizeXs[i]!.length >= 3) {
      const med = median(sizeXs[i]!);
      if (med) sizeUp[i] = med;
    }
  }

  const pitchSteps: number[] = [];
  for (const group of groupByAxis(rows, "pitch").values()) {
    const byP = new Map<number, number>();
    for (const r of group) {
      if (r.pitch != null) byP.set(r.pitch, r.listRmb);
    }
    const ps = [...byP.keys()].sort((a, b) => a - b);
    for (let i = 0; i < ps.length - 1; i++) {
      const da = ps[i + 1]! - ps[i]!;
      const steps = da / 2;
      const p0 = byP.get(ps[i]!)!;
      const p1 = byP.get(ps[i + 1]!)!;
      if (steps > 0 && p0 > 0 && p1 > 0) {
        const per = Math.pow(p1 / p0, 1 / steps);
        if (per >= 1 && per <= 1.08) pitchSteps.push(per);
      }
    }
  }

  const wOver0s: number[] = [];
  const gOverWs: number[] = [];
  for (const group of groupByAxis(rows, "changeOver").values()) {
    const byC = new Map<string, number>();
    for (const r of group) {
      if (r.changeOver != null) byC.set(normChangeOver(r.changeOver), r.listRmb);
    }
    const p0 = byC.get("0");
    const pW = byC.get("W");
    const pG = byC.get("G");
    if (p0 && pW) {
      const r = pW / p0;
      if (r >= 0.95 && r <= 1.2) wOver0s.push(r);
    }
    if (pW && pG) {
      const r = pG / pW;
      if (r >= 0.95 && r <= 1.2) gOverWs.push(r);
    }
  }

  const tapSteps: number[] = [];
  for (const group of groupByAxis(rows, "tapCode").values()) {
    const byN = new Map<number, number>();
    for (const r of group) {
      const n = contactN(r.tapCode);
      if (n != null) byN.set(n, r.listRmb);
    }
    const ns = [...byN.keys()].sort((a, b) => a - b);
    for (let i = 0; i < ns.length - 1; i++) {
      const dn = ns[i + 1]! - ns[i]!;
      const p0 = byN.get(ns[i]!)!;
      const p1 = byN.get(ns[i + 1]!)!;
      if (dn > 0 && p0 > 0 && p1 > 0) {
        const per = Math.pow(p1 / p0, 1 / dn);
        if (per >= 1 && per <= 1.08) tapSteps.push(per);
      }
    }
  }

  const scale: FamilyScale = {
    currentAlpha: iAlphas.length >= 3 ? (median(iAlphas) ?? 0.45) : 0.45,
    umAlpha: umAlphas.length >= 3 ? (median(umAlphas) ?? 0.2) : 0.2,
    sizeUp,
    pitchPerStep: pitchSteps.length >= 3 ? (median(pitchSteps) ?? 1.03) : 1.03,
    wOver0: wOver0s.length >= 3 ? (median(wOver0s) ?? 1.05) : 1.05,
    gOverW: gOverWs.length >= 3 ? (median(gOverWs) ?? 1.03) : 1.03,
    tapPerStep: tapSteps.length >= 3 ? (median(tapSteps) ?? 1.012) : 1.012,
  };
  scaleByFamily.set(family, scale);
  return scale;
}

function rowMatches(row: BasePriceRow, ref: Want, ignore: ReadonlySet<string>): boolean {
  if (!ignore.has("phases") && row.phases !== ref.phases) return false;
  if (!ignore.has("connection") && row.connection !== ref.connection) return false;
  if (!ignore.has("currentA") && row.currentA !== ref.currentA) return false;
  if (!ignore.has("umKv") && row.umKv !== ref.umKv) return false;
  if (!ignore.has("selectorSize") && row.selectorSize !== ref.selectorSize) return false;
  if (!ignore.has("pitch") && row.pitch !== ref.pitch) return false;
  if (!ignore.has("changeOver")) {
    const a = row.changeOver;
    const b = ref.changeOver;
    if (a == null && b == null) {
      /* octc */
    } else if (normChangeOver(a) !== normChangeOver(b)) {
      return false;
    }
  }
  if (ref.octc && !ignore.has("tapCode") && row.tapCode !== ref.tapCode) {
    return false;
  }
  return true;
}

function neighborScore(row: BasePriceRow, want: Want): number {
  let s = 0;
  if (row.phases !== want.phases) s += 1_000_000;
  if (row.connection !== want.connection) s += 100_000;
  s += (Math.abs(row.currentA - want.currentA) / Math.max(want.currentA, 100)) * 80;
  s += (Math.abs(row.umKv - want.umKv) / Math.max(want.umKv, 10)) * 50;
  const rSz = sizeRank(row.selectorSize);
  const wSz = sizeRank(want.selectorSize);
  if (rSz >= 0 && wSz >= 0) s += Math.abs(rSz - wSz) * 20;
  else if (row.selectorSize !== want.selectorSize) s += 25;
  if (row.pitch != null && want.pitch != null) {
    s += (Math.abs(row.pitch - want.pitch) / 2) * 8;
  } else if (row.pitch != null || want.pitch != null) {
    s += 15;
  }
  if (row.changeOver != null || want.changeOver != null) {
    s += Math.abs(coRank(row.changeOver) - coRank(want.changeOver)) * 6;
  }
  if (want.octc) {
    const a = contactN(row.tapCode);
    const b = contactN(want.tapCode);
    if (a != null && b != null) s += Math.abs(a - b) * 4;
    else if (row.tapCode !== want.tapCode) s += 12;
  }
  return s;
}

function pickNeighbor(rows: BasePriceRow[], want: Want): BasePriceRow | null {
  let best: BasePriceRow | null = null;
  let bestScore = Infinity;
  for (const row of rows) {
    const s = neighborScore(row, want);
    if (
      s < bestScore ||
      (s === bestScore &&
        best &&
        Math.abs(row.currentA - want.currentA) <
          Math.abs(best.currentA - want.currentA))
    ) {
      best = row;
      bestScore = s;
    }
  }
  return best;
}

function sizeFactor(from: string, to: string, sizeUp: number[]): number {
  if (from === to) return 1;
  const i = sizeRank(from);
  const j = sizeRank(to);
  if (i < 0 || j < 0) return 1;
  let f = 1;
  if (j > i) {
    for (let k = i; k < j; k++) f *= sizeUp[k] ?? 1;
  } else {
    for (let k = j; k < i; k++) f /= sizeUp[k] ?? 1;
  }
  return f;
}

function umFactor(from: number, to: number, alpha: number): number {
  if (from <= 0 || to <= 0 || from === to) return 1;
  return Math.pow(to / from, alpha);
}

function pitchFactor(
  from: number | null,
  to: number | null,
  perStep: number,
): number {
  if (from == null || to == null || from === to) return 1;
  return Math.pow(perStep, (to - from) / 2);
}

function coFactor(
  from: string | null,
  to: string | null,
  scale: FamilyScale,
): number {
  const a = normChangeOver(from);
  const b = normChangeOver(to);
  if (a === b) return 1;
  const rel = (c: string) =>
    c === "0" ? 1 : c === "W" ? scale.wOver0 : scale.wOver0 * scale.gOverW;
  return rel(b) / rel(a);
}

function tapFactor(from: string, to: string, perStep: number): number {
  const a = contactN(from);
  const b = contactN(to);
  if (a == null || b == null || a === b) return 1;
  return Math.pow(perStep, b - a);
}

function scaleCurrent(
  pool: BasePriceRow[],
  wantI: number,
  alpha: number,
  fallback: BasePriceRow,
): { price: number; interpolated: boolean } {
  const byI = new Map<number, number>();
  for (const row of pool) {
    if (!byI.has(row.currentA)) byI.set(row.currentA, unitPrice(row));
  }
  const exact = byI.get(wantI);
  if (exact != null) return { price: exact, interpolated: false };
  const xs = [...byI.keys()].sort((a, b) => a - b);
  const lo = [...xs].reverse().find((x) => x < wantI);
  const hi = xs.find((x) => x > wantI);
  if (lo != null && hi != null) {
    const pLo = byI.get(lo)!;
    const pHi = byI.get(hi)!;
    const t = Math.log(wantI / lo) / Math.log(hi / lo);
    return {
      price: Math.exp(Math.log(pLo) + t * Math.log(pHi / pLo)),
      interpolated: true,
    };
  }
  const basisI = fallback.currentA || 1;
  return {
    price: unitPrice(fallback) * Math.pow(wantI / basisI, alpha),
    interpolated: false,
  };
}

function roundRmb(n: number): number {
  return Math.round(n / 100) * 100;
}

/**
 * Neighbour-scaled list RMB when `lookupListPrice` has no row.
 * Does not invent catalogue SKUs; marks `estimated: true`.
 */
export function estimateListPrice(model: string): ListPriceHit {
  const cleaned = stripMdu(model).trim();
  if (!cleaned) return { found: false, reason: "unparsed" };

  const parsed = parseTypeString(cleaned);
  if (!parsed) return { found: false, reason: "unparsed" };
  if (!LIST_FAMILIES.has(parsed.family)) {
    return { found: false, reason: "no-row" };
  }

  const octc = isOctcFamily(parsed.family);
  const hwv = parsed.family === "HWV" || parsed.family === "HWDK";
  const rows = familyRows(parsed.family);
  if (!rows.length) return { found: false, reason: "no-row" };

  const want: Want = {
    family: parsed.family,
    phases: parsed.phases,
    currentA: parsed.currentA,
    connection: parsed.connection,
    umKv: parsed.umKv,
    selectorSize: parsed.selectorSize,
    pitch: octc ? null : pitchFromTap(parsed.tapCode),
    changeOver: octc ? null : changeOverFromTap(parsed.tapCode),
    tapCode: parsed.tapCode,
    unitCount: parsed.unitCount || 1,
    octc,
    hwv,
  };

  const neighbor = pickNeighbor(rows, want);
  if (!neighbor) return { found: false, reason: "no-row" };

  const scale = familyScale(parsed.family);
  const ignoreI = new Set<string>(["currentA"]);
  const wantPool = rows.filter((r) => rowMatches(r, want, ignoreI));
  const neighborAsWant: Want = { ...want, ...neighbor, octc, hwv };
  const neighborPool = rows.filter((r) =>
    rowMatches(r, neighborAsWant, ignoreI),
  );
  const useWantAxis = wantPool.length > 0;
  const pool = useWantAxis ? wantPool : neighborPool;
  const { price: currentPrice, interpolated } = scaleCurrent(
    pool.length ? pool : [neighbor],
    want.currentA,
    scale.currentAlpha,
    neighbor,
  );

  let unit = currentPrice;
  if (!useWantAxis) {
    unit *= umFactor(neighbor.umKv, want.umKv, scale.umAlpha);
    unit *= sizeFactor(neighbor.selectorSize, want.selectorSize, scale.sizeUp);
    if (!hwv && !octc) {
      unit *= pitchFactor(neighbor.pitch, want.pitch, scale.pitchPerStep);
      unit *= coFactor(neighbor.changeOver, want.changeOver, scale);
    }
    if (octc) unit *= tapFactor(neighbor.tapCode, want.tapCode, scale.tapPerStep);
  }

  const basis = unitPrice(neighbor);
  if (!interpolated) {
    unit = Math.min(basis * 2.5, Math.max(basis * 0.5, unit));
  }

  const listRmb = roundRmb(unit * want.unitCount);
  if (!(listRmb > 0)) return { found: false, reason: "no-row" };

  return {
    found: true,
    estimated: true,
    listRmb,
    listKey: neighbor.listKey,
    sheet: neighbor.sheet,
    unitCount: want.unitCount,
    includesMdu: neighbor.includesMdu,
    method: ESTIMATE_METHOD,
  };
}

/** Exact list row, else a marked neighbour estimate. */
export function resolveListPrice(model: string): ListPriceHit {
  const exact = lookupListPrice(model);
  if (exact.found) return exact;
  return estimateListPrice(model);
}
