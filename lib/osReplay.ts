/**
 * OS (order spec) replay against shipped selectOltc.
 * Duty from transformer I / Ust / steps + sold Um / Y-D / phases.
 */
import { SERIES } from "./catalog";
import { selectOltc } from "./engine";
import { commercialMatch, parseTypeString } from "./orderReplay";
import { commercialTypeExists } from "./typeExists";
import type {
  Connection,
  Mounting,
  PhaseCode,
  Regulation,
  SelectInput,
  SwitchingMedium,
} from "./types";

export type OsSalesRow = {
  file?: string;
  folder?: string;
  serial?: string;
  customer?: string;
  family_folder?: string;
  sold_type?: string;
  type_alts?: string;
  phases?: string;
  current_a?: number | string | null;
  connection?: string;
  um_kv?: number | string | null;
  selector_size?: string;
  tap_code?: string;
  unit_count?: number | string | null;
  mva?: number | string | null;
  rated_kv?: number | string | null;
  i_a?: number | string | null;
  i_max_a?: number | string | null;
  ust_v?: number | string | null;
  ust_max_v?: number | string | null;
  plus_minus_steps?: number | string | null;
  plus_steps?: number | string | null;
  minus_steps?: number | string | null;
  mdu?: string;
  text_status?: string;
  notes?: string;
};

const VAC_COMBINED = new Set(["CM2", "SHZV", "SHZVG"]);
const VAC_COMPOUND = new Set(["CV2"]);
const OIL_COMBINED = new Set(["CM", "CMD"]);
const OIL_COMPOUND = new Set(["CV", "SV"]);
const ON_TANK = new Set(["HWV"]);
const DRY = new Set(["CVT", "CZ"]);
const OCTC = new Set(["WSL", "WDL", "WSG"]);

export function numCell(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function tapMeta(tap: string): {
  pitch: number | null;
  positions: number | null;
  mid: 0 | 1 | 3 | null;
  regulation: Regulation;
} {
  const t = tap.replace(/\s+/g, "").toUpperCase();
  const m = t.match(/^(\d{2})(\d{2})(\d)([WG0]?)$/);
  if (!m) {
    return { pitch: null, positions: null, mid: null, regulation: "reversing" };
  }
  const co = m[4] || "0";
  const regulation: Regulation =
    co === "G" ? "coarse_fine" : co === "W" ? "reversing" : "linear";
  const midRaw = Number(m[3]);
  const mid = midRaw === 3 || midRaw === 1 || midRaw === 0 ? midRaw : null;
  return {
    pitch: Number(m[1]),
    positions: Number(m[2]),
    mid,
    regulation,
  };
}

export function familyDuty(family: string): {
  mounting: Mounting;
  medium: SwitchingMedium;
  preferVacuum: boolean;
  dutyKind: "oltc" | "octc";
} | null {
  const f = family.toUpperCase();
  if (OCTC.has(f)) {
    return {
      mounting: "in_tank",
      medium: "oil",
      preferVacuum: false,
      dutyKind: "octc",
    };
  }
  if (f === "HWDK") {
    return {
      mounting: "reactor",
      medium: "oil",
      preferVacuum: false,
      dutyKind: "oltc",
    };
  }
  if (ON_TANK.has(f)) {
    return {
      mounting: "on_tank",
      medium: "oil_vacuum",
      preferVacuum: true,
      dutyKind: "oltc",
    };
  }
  if (DRY.has(f)) {
    return {
      mounting: "dry_type",
      medium: "dry",
      preferVacuum: true,
      dutyKind: "oltc",
    };
  }
  if (VAC_COMBINED.has(f) || VAC_COMPOUND.has(f)) {
    return {
      mounting: "in_tank",
      medium: "oil_vacuum",
      preferVacuum: true,
      dutyKind: "oltc",
    };
  }
  if (OIL_COMBINED.has(f) || OIL_COMPOUND.has(f)) {
    return {
      mounting: "in_tank",
      medium: "oil",
      preferVacuum: false,
      dutyKind: "oltc",
    };
  }
  return null;
}

function asPhase(v: string | undefined, fallback: string): PhaseCode {
  const s = (v || fallback || "III").toUpperCase();
  if (s === "I" || s === "II" || s === "III") return s;
  return "III";
}

function asConn(v: string | undefined, fallback: string): Connection {
  const s = (v || fallback || "Y").toUpperCase();
  if (s === "Y" || s === "D") return s;
  return "Y";
}

export function buildOsSelectInput(
  row: OsSalesRow,
  parsed: NonNullable<ReturnType<typeof parseTypeString>>,
): SelectInput | { skip: string } {
  const duty = familyDuty(parsed.family);
  if (!duty) return { skip: `unknown family ${parsed.family}` };

  const iDuty = numCell(row.i_max_a) ?? numCell(row.i_a);
  if (!iDuty || iDuty <= 0) return { skip: "no transformer I" };

  const um = numCell(row.um_kv) ?? parsed.umKv;
  if (!um || um <= 0) return { skip: "no Um" };

  const tap = (row.tap_code || parsed.tapCode || "").toString();
  const tapNorm = tap.replace(/\s+/g, "");
  const tm = tapMeta(tap);
  const ust = numCell(row.ust_max_v) ?? numCell(row.ust_v) ?? 0;
  const nxm = tapNorm.match(/^(\d+)x(\d+)/i);

  const shortLinear =
    /^\d{1,2}$/.test(tapNorm) ||
    /^0\d{1,3}$/.test(tapNorm) ||
    ((parsed.family === "CVT" ||
      parsed.family === "CZ" ||
      parsed.family === "HWDK") &&
      /^\d{3,4}$/.test(tapNorm) &&
      !/[WG]$/i.test(tapNorm));
  let plusMinus: number | null = null;
  let linearPositions: number | null = null;
  if (duty.dutyKind === "octc" && nxm) {
    linearPositions = Number(nxm[1]);
  } else if (shortLinear) {
    const stripped = tapNorm.replace(/^0+/, "") || "0";
    linearPositions =
      stripped.length >= 3 ? Number(stripped.slice(-2)) : Number(stripped);
  } else if (tm.positions && tm.mid != null && tm.mid > 0) {
    plusMinus = (tm.positions - tm.mid) / 2;
  } else {
    plusMinus = numCell(row.plus_minus_steps);
    if (!plusMinus) {
      const plus = numCell(row.plus_steps);
      const minus = numCell(row.minus_steps);
      if (plus && minus) plusMinus = Math.max(plus, minus);
      else if (plus) plusMinus = plus;
      else if (minus) plusMinus = minus;
    }
  }

  const phases = asPhase(row.phases, parsed.phases);
  const connection = asConn(row.connection, parsed.connection);

  const input: SelectInput = {
    mounting: duty.mounting,
    medium: duty.medium,
    preferVacuum: duty.preferVacuum,
    dutyKind: duty.dutyKind,
    phases,
    connection,
    throughCurrentA: iDuty,
    umKv: um,
    stepVoltageV: ust,
    regulation: shortLinear ? "linear" : tm.regulation,
    mdu: "none",
    selectorSize: "auto",
  };

  if (duty.dutyKind === "octc") {
    const roman = parsed.phases;
    if (
      roman === "II" ||
      roman === "IV" ||
      roman === "V" ||
      roman === "VI" ||
      roman === "VII" ||
      roman === "VIII"
    ) {
      input.octcSeries = roman;
    }
    if (nxm) {
      input.regulation = "linear";
      input.positions = Number(nxm[1]);
      input.octcContact = `${Number(nxm[1])}x${Number(nxm[2])}`;
    } else if (linearPositions) {
      input.positions = linearPositions;
    }
  } else if (plusMinus && plusMinus > 0 && input.regulation !== "linear") {
    input.plusMinusSteps = Math.round(plusMinus);
    if (tm.mid === 1 || tm.mid === 3) input.midPositions = tm.mid;
  } else if (linearPositions) {
    input.positions = linearPositions;
  } else if (tm.positions) {
    input.positions = tm.positions;
  }

  return input;
}

export function loadOsSales(raw: unknown): OsSalesRow[] {
  if (Array.isArray(raw)) return raw as OsSalesRow[];
  if (raw && typeof raw === "object") {
    const o = raw as { sales?: unknown; rows?: unknown };
    if (Array.isArray(o.sales)) return o.sales as OsSalesRow[];
    if (Array.isArray(o.rows)) return o.rows as OsSalesRow[];
  }
  throw new Error("unrecognised OS JSON shape");
}

function unitsCompatible(
  a: NonNullable<ReturnType<typeof parseTypeString>>,
  e: NonNullable<ReturnType<typeof parseTypeString>>,
): boolean {
  if (a.unitCount === e.unitCount) return true;
  // OS often writes 3× of the same commercial type (set of tanks).
  if (a.family === e.family && a.phases === e.phases) {
    if (
      (e.unitCount === 3 && a.unitCount === 1) ||
      (a.unitCount === 3 && e.unitCount === 1)
    ) {
      return true;
    }
  }
  return false;
}

function oltcTapCatalogue(tap: string): boolean {
  const t = tap.replace(/\s+/g, "").toUpperCase();
  if (!t) return false;
  if (/^\d+x\d+/i.test(t)) return true;
  if (/^\d{5}[WG0]?$/.test(t)) return true;
  if (/^\d{1,2}$/.test(t) || /^0\d{1,3}$/.test(t)) return true;
  return false;
}

function maxUstForFamily(family: string, pitch: number): number | null {
  const id = family.toLowerCase();
  const s = SERIES.find((row) => row.code === family);
  if (!s) return null;
  if (id === "cv2" || id === "cv" || id === "sv") {
    if (pitch <= 10) return id === "cv2" ? 2000 : 1500;
    if (pitch <= 12) return id === "cv2" ? 1500 : 1400;
    return id === "cv2" ? 1500 : 1000;
  }
  return s.maxStepVoltageV;
}

function soldCoversDuty(
  sold: string,
  input: SelectInput,
): boolean {
  const parsed = parseTypeString(sold);
  if (!parsed) return false;
  const s = SERIES.find((row) => row.code === parsed.family);
  if (!s) return false;
  if (parsed.currentA + 0.5 < input.throughCurrentA) return false;
  const tap = parsed.tapCode || "";
  if (s.dutyKind !== "octc" && !oltcTapCatalogue(tap) && !/^\d+x\d+/i.test(tap)) {
    return false;
  }
  const tm = tap.match(/^(\d{2})(\d{2})(\d)([WG0]?)$/i);
  if (tm && s.dutyKind !== "octc") {
    const pitch = Number(tm[1]);
    const positions = Number(tm[2]);
    const co = (tm[4] || "0").toUpperCase();
    const linear = co === "0" || co === "";
    const maxP = linear ? s.maxPositionsLinear : s.maxPositionsWithChangeOver;
    if (positions > maxP) return false;
    const ustCap = maxUstForFamily(parsed.family, pitch);
    if (ustCap != null && input.stepVoltageV > ustCap + 0.5) return false;
  }
  return true;
}

export function soldTypeInResults(sold: string, models: string[]): boolean {
  if (models.some((m) => commercialMatch(m, sold, "full"))) return true;
  if (models.some((m) => commercialMatch(m, sold, "family-i-um"))) return true;
  const e = parseTypeString(sold);
  if (!e) return false;
  return models.some((m) => {
    const a = parseTypeString(m);
    if (!a) return false;
    if (a.family !== e.family && !((a.family === "SHZVG" && e.family === "SHZV") || (a.family === "SHZV" && e.family === "SHZVG") || (a.family === "WSL" && e.family === "WDL") || (a.family === "WDL" && e.family === "WSL"))) {
      return false;
    }
    if (a.phases !== e.phases) return false;
    if (a.currentA !== e.currentA) return false;
    if (a.umKv !== e.umKv) return false;
    return unitsCompatible(a, e);
  });
}

export type OsReplayRow = {
  serial: string;
  sold: string;
  skip?: string;
  outOfCatalogue?: boolean;
  models: string[];
  soldCovered: boolean;
};

export function replayOsRow(row: OsSalesRow): OsReplayRow {
  const sold = (row.sold_type || "").toString().trim();
  const serial = (row.serial || row.file || "").toString();
  if (!sold) return { serial, sold, skip: "no sold_type", models: [], soldCovered: false };
  const parsed = parseTypeString(sold);
  if (!parsed) {
    return { serial, sold, skip: "unparsed sold_type", models: [], soldCovered: false };
  }
  const input = buildOsSelectInput(row, parsed);
  if ("skip" in input) {
    return { serial, sold, skip: input.skip, models: [], soldCovered: false };
  }
  const legal = commercialTypeExists(sold);
  const out = selectOltc(input);
  const models = out.results.map((r) => r.model);
  if (!legal) {
    return {
      serial,
      sold,
      outOfCatalogue: true,
      models,
      soldCovered: false,
    };
  }
  if (!soldCoversDuty(sold, input)) {
    return {
      serial,
      sold,
      skip: "sold type does not cover reconstructed duty",
      models,
      soldCovered: false,
    };
  }
  if (!models.length) {
    return {
      serial,
      sold,
      skip: "no catalogue type covers duty",
      models,
      soldCovered: false,
    };
  }
  return {
    serial,
    sold,
    models,
    soldCovered: soldTypeInResults(sold, models),
  };
}
