/**
 * Replay selectOltc against 2026 OS sales extracted to JSON.
 *
 * Usage: npx vite-node scripts/replay-2026-os.ts [docs/replay/2026-os-sales.json]
 *
 * Duty comes from transformer I / Ust / steps + sold Um / Y-D / phases.
 * Sold current rating and family are the *answer*, not the input.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { selectOltc } from "../lib/engine";
import {
  commercialMatch,
  parseTypeString,
} from "../lib/orderReplay";
import { catalogueUmFromRatedKv } from "../lib/deriveUm";
import { buildOsHonestOctcInput } from "../lib/osReplay";
import { osLowestTapCurrent, osMarket, truncatedTapCode, unevenTapGeometry } from "./replayTap";
import type {
  Connection,
  Mounting,
  PhaseCode,
  Regulation,
  SelectInput,
  SwitchingMedium,
} from "../lib/types";

type SalesRow = {
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

type Verdict =
  | "skip"
  | "exact"
  | "family-i-um"
  | "family"
  | "eligible"
  | "oil-vs-vac"
  | "miss";

const VAC_TWIN: Record<string, string> = {
  CM: "CM2",
  CM2: "CM",
  CV: "CV2",
  CV2: "CV",
  SV: "CV2",
  CMD: "SHZV",
  SHZV: "CMD",
};

type ReplayOut = {
  serial: string;
  folder: string;
  sold_type: string;
  engine_primary: string;
  engine_next: string;
  verdict: Verdict;
  skip_reason: string;
  i_duty: number | "";
  um: number | "";
  ust: number | "";
  steps: number | "";
  connection: string;
  phases: string;
  /** Selector letter of engine #1 and of the sold type ("" when none). */
  engine_grade: string;
  sold_grade: string;
  /** OCTC only: no sold contact / roman / Um fed in (lib/osReplay buildOsHonestOctcInput). */
  honest_primary: string;
  honest_verdict: Verdict | "";
  honest_um: number | "";
};

/**
 * Engine #1 grade against the sold letter. 2026-11-04 audit GRADE-3: the
 * verdicts ignore the letter, so a weaker engine grade never showed.
 */
type GradeCmp = "match" | "weaker" | "stronger";
const GRADE_ORDER = ["B", "C", "D", "DE"];
function gradeCmp(engine: string, sold: string): GradeCmp | null {
  const e = GRADE_ORDER.indexOf(engine);
  const s = GRADE_ORDER.indexOf(sold);
  if (e < 0 || s < 0) return null;
  return e === s ? "match" : e < s ? "weaker" : "stronger";
}

const VAC_COMBINED = new Set(["CM2", "SHZV", "SDZV", "SHZVG"]);
const VAC_COMPOUND = new Set(["CV2"]);
const OIL_COMBINED = new Set(["CM", "CMD"]);
const OIL_COMPOUND = new Set(["CV", "SV"]);
const ON_TANK = new Set(["HWV"]);
const DRY = new Set(["CVT", "CZ"]);
const OCTC = new Set(["WSL", "WDL", "WSG", "WDG", "WLG"]);

function num(v: unknown): number | null {
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

function familyDuty(family: string): {
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

function buildInput(row: SalesRow, parsed: NonNullable<ReturnType<typeof parseTypeString>>): SelectInput | { skip: string } {
  const duty = familyDuty(parsed.family);
  if (!duty) return { skip: `unknown family ${parsed.family}` };

  const iDuty = num(row.i_max_a) ?? num(row.i_a);
  if (!iDuty || iDuty <= 0) return { skip: "no transformer I" };

  const um = num(row.um_kv) ?? parsed.umKv;
  if (!um || um <= 0) return { skip: "no Um" };

  const tap = (row.tap_code || parsed.tapCode || "").toString();
  const tapNorm = tap.replace(/\s+/g, "");
  const tm = tapMeta(tap);
  const ust = num(row.ust_max_v) ?? num(row.ust_v) ?? 0;
  const nxm = tapNorm.match(/^(\d+)x(\d+)/i);
  // 2026-11-04 r2 ORDERS-2: a cut-off code is not a linear count.
  if (duty.dutyKind !== "octc" && truncatedTapCode(tapNorm, parsed.family)) {
    return { skip: "tap code truncated" };
  }
  const uneven = duty.dutyKind === "octc" ? null : unevenTapGeometry(tapNorm);

  // Sold tap code beats OS ± boxes (those often pick up mid-position "12"
  // or +4/−12 leftovers). Short `7`/`9`/`17` / `0909` = linear contact count.
  const shortLinear =
    /^\d{1,2}$/.test(tapNorm) ||
    /^0\d{1,3}$/.test(tapNorm) ||
    ((parsed.family === "CVT" || parsed.family === "CZ" || parsed.family === "HWDK") &&
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
  } else if (uneven) {
    // 10181G: positions + mid, as --range does (not ±9).
  } else if (tm.positions && tm.mid != null && tm.mid > 0) {
    plusMinus = (tm.positions - tm.mid) / 2;
  } else {
    plusMinus = num(row.plus_minus_steps);
    if (!plusMinus) {
      const plus = num(row.plus_steps);
      const minus = num(row.minus_steps);
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
  };
  // 2026-11-04 r3 ORDERS-10: no OS Imax → size on the lowest-tap current from
  // the nameplate, as the app does; the OS current is the floor.
  if (num(row.i_max_a) == null && duty.dutyKind !== "octc" && input.regulation !== "linear") {
    input.throughCurrentA = osLowestTapCurrent({
      iOs: iDuty,
      mva: num(row.mva),
      kv: num(row.rated_kv),
      conn: connection === "D" ? "D" : "Y",
      minusSteps: num(row.minus_steps) ?? plusMinus,
      ustV: ust,
    });
  }
  // r3 ORDERS-11: the --market a user would type (TR raises 72.5 neutrals to C).
  const market = osMarket(row.customer);
  if (market) input.market = market;
  // 2026-11-04 r2 ORDERS-2: the app passes the tapped winding kV (FAM-2/FAM-3,
  // the 330 kV-class grade). No OS field marks an auto, so every row is two-winding.
  const ratedKv = num(row.rated_kv);
  if (ratedKv && ratedKv > 0) {
    input.tapWindingKv = ratedKv;
    if (catalogueUmFromRatedKv(ratedKv) >= 252) input.combinedOnly = true;
  }

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
  }

  if (duty.dutyKind === "octc" && nxm) {
    input.regulation = "linear";
    input.positions = Number(nxm[1]);
    input.octcContact = `${Number(nxm[1])}x${Number(nxm[2])}`;
  } else if (plusMinus && plusMinus > 0 && input.regulation !== "linear") {
    input.plusMinusSteps = Math.round(plusMinus);
    if (tm.mid === 1 || tm.mid === 3) input.midPositions = tm.mid;
  } else if (uneven && input.regulation !== "linear") {
    Object.assign(input, uneven);
  } else if (linearPositions) {
    input.positions = linearPositions;
  } else if (tm.positions) {
    input.positions = tm.positions;
  }

  // Do not lock selector letter — that is part of the answer.
  input.selectorSize = "auto";
  return input;
}

/** 3×CMI vs CMI: same switch, OS wrote the set count. */
function unitsCompatible(
  a: NonNullable<ReturnType<typeof parseTypeString>>,
  e: NonNullable<ReturnType<typeof parseTypeString>>,
): boolean {
  if (a.unitCount === e.unitCount) return true;
  if (e.unitCount === 3 && e.phases === "I" && a.unitCount === 1) return true;
  if (a.unitCount === 3 && a.phases === "I" && e.unitCount === 1) return true;
  return false;
}

/** SHZV III 1300 is the old commercial name for SHZVG. */
function familyCompatible(
  a: NonNullable<ReturnType<typeof parseTypeString>>,
  e: NonNullable<ReturnType<typeof parseTypeString>>,
): boolean {
  if (a.family === e.family) return true;
  const pair = `${a.family}/${e.family}`;
  if (pair === "SHZVG/SHZV" || pair === "SHZV/SHZVG") {
    return Math.max(a.currentA, e.currentA) >= 1300;
  }
  if (pair === "WSL/WDL" || pair === "WDL/WSL") return true;
  return false;
}

/** Family + phase + I + Um. Ignore selector letter and tap (OS often upsizes grade). */
function looseMatch(actual: string, expected: string): boolean {
  const a = parseTypeString(actual);
  const e = parseTypeString(expected);
  if (!a || !e) return false;
  if (!familyCompatible(a, e)) return false;
  if (a.phases !== e.phases) return false;
  if (a.currentA !== e.currentA) return false;
  if (a.umKv !== e.umKv) return false;
  if (!unitsCompatible(a, e)) return false;
  return true;
}

/**
 * Same commercial identity as the sold type: family / I / Um / tap / 3×.
 * Selector letter is auto (OS often writes C when B covers) — still #1 exact
 * for a colleague copying the type.
 */
function identityMatch(actual: string, expected: string): boolean {
  if (commercialMatch(actual, expected, "full")) return true;
  const a = parseTypeString(actual);
  const e = parseTypeString(expected);
  if (!a || !e) return false;
  if (a.family !== e.family && !familyCompatible(a, e)) return false;
  if (a.phases !== e.phases) return false;
  if (a.currentA !== e.currentA) return false;
  if (a.umKv !== e.umKv) return false;
  if (!unitsCompatible(a, e)) return false;
  if (e.tapCode && a.tapCode && a.tapCode !== e.tapCode) return false;
  return true;
}

function classify(sold: string, models: string[]): Verdict {
  // 2026-11-04: the OS writes WDGIV-800/40.5-5x5A for a 3-, 6- or 12-unit
  // drum order, so the set count is not part of the drum answer.
  if (/^(?:\d+x)?W[DL]G/i.test(sold)) {
    sold = sold.replace(/^\d+x/i, "");
    models = models.map((m) => m.replace(/^\d+x/i, ""));
  }
  const primary = models[0] ?? "";
  if (identityMatch(primary, sold)) return "exact";
  if (looseMatch(primary, sold)) return "family-i-um";
  const soldParts = parseTypeString(sold);
  const primParts = parseTypeString(primary);
  if (soldParts && primParts && familyCompatible(soldParts, primParts)) {
    return "family";
  }
  if (models.some((m) => looseMatch(m, sold))) return "eligible";
  if (
    soldParts &&
    primParts &&
    VAC_TWIN[soldParts.family] === primParts.family &&
    soldParts.phases === primParts.phases
  ) {
    return "oil-vs-vac";
  }
  if (
    soldParts &&
    models.some((m) => {
      const p = parseTypeString(m);
      return (
        p &&
        VAC_TWIN[soldParts.family] === p.family &&
        p.phases === soldParts.phases &&
        p.currentA === soldParts.currentA
      );
    })
  ) {
    return "oil-vs-vac";
  }
  return "miss";
}

function loadRows(jsonPath: string): SalesRow[] {
  const raw = JSON.parse(readFileSync(jsonPath, "utf8"));
  if (Array.isArray(raw)) return raw as SalesRow[];
  if (Array.isArray(raw.sales)) return raw.sales as SalesRow[];
  if (Array.isArray(raw.rows)) return raw.rows as SalesRow[];
  throw new Error(`unrecognised JSON shape in ${jsonPath}`);
}

const jsonPath = path.resolve(
  process.argv[2] ?? path.join(process.cwd(), "docs", "replay", "2026-os-sales.json"),
);
const rows = loadRows(jsonPath);

const out: ReplayOut[] = [];
const counts: Record<Verdict, number> = {
  skip: 0,
  exact: 0,
  "family-i-um": 0,
  family: 0,
  eligible: 0,
  "oil-vs-vac": 0,
  miss: 0,
};

for (const row of rows) {
  const sold = (row.sold_type || "").toString().trim();
  const serial = (row.serial || row.file || "").toString();
  const folder = (row.folder || row.family_folder || "").toString();
  const base = {
    serial,
    folder,
    sold_type: sold,
    engine_primary: "",
    engine_next: "",
    skip_reason: "",
    i_duty: num(row.i_max_a) ?? num(row.i_a) ?? ("" as const),
    um: num(row.um_kv) ?? ("" as const),
    ust: num(row.ust_max_v) ?? num(row.ust_v) ?? ("" as const),
    steps: num(row.plus_minus_steps) ?? ("" as const),
    connection: (row.connection || "").toString(),
    phases: (row.phases || "").toString(),
    engine_grade: "",
    sold_grade: "",
    honest_primary: "",
    honest_verdict: "" as const,
    honest_um: "" as const,
  };

  if (!sold) {
    counts.skip++;
    out.push({ ...base, verdict: "skip", skip_reason: "no sold_type" });
    continue;
  }
  const parsed = parseTypeString(sold);
  if (!parsed) {
    counts.skip++;
    out.push({ ...base, verdict: "skip", skip_reason: "unparsed sold_type" });
    continue;
  }
  const built = buildInput(row, parsed);
  if ("skip" in built) {
    counts.skip++;
    out.push({ ...base, um: parsed.umKv, verdict: "skip", skip_reason: built.skip });
    continue;
  }
  const result = selectOltc(built);
  const models = result.results.map((r) => r.model);
  const verdict = classify(sold, models);
  counts[verdict]++;
  // 2026-11-04: OCTC beside the as-is verdict, judged without the answer.
  let honest: Pick<ReplayOut, "honest_primary" | "honest_verdict" | "honest_um"> = {
    honest_primary: "",
    honest_verdict: "",
    honest_um: "",
  };
  if (built.dutyKind === "octc") {
    const h = buildOsHonestOctcInput(row, parsed);
    if ("skip" in h) {
      honest = { ...honest, honest_verdict: "skip" };
    } else {
      const hm = selectOltc(h).results.map((r) => r.model);
      honest = {
        honest_primary: hm[0] ?? "",
        honest_verdict: classify(sold, hm),
        honest_um: h.umKv,
      };
    }
  }
  out.push({
    ...base,
    ...honest,
    engine_primary: models[0] ?? "",
    engine_next: models.slice(1, 4).join(" | "),
    verdict,
    skip_reason: result.ok ? "" : result.errorsEn.join("; "),
    um: built.umKv,
    i_duty: built.throughCurrentA,
    ust: built.stepVoltageV,
    steps: built.plusMinusSteps ?? ("" as const),
    connection: built.connection,
    phases: built.phases,
    engine_grade: result.results[0]?.selectorSize ?? "",
    sold_grade: parsed.selectorSize ?? "",
  });
}

// Grade: engine #1 letter (selectorSize auto) vs the sold letter, by sold Um.
const gradeCounts: Record<GradeCmp, number> = { match: 0, weaker: 0, stronger: 0 };
const gradeByUm = new Map<number, Record<GradeCmp, number>>();
for (const r of out) {
  if (r.verdict === "skip") continue;
  const cmp = gradeCmp(r.engine_grade, r.sold_grade);
  if (!cmp) continue;
  gradeCounts[cmp]++;
  const soldUm = parseTypeString(r.sold_type)?.umKv ?? 0;
  const row = gradeByUm.get(soldUm) ?? { match: 0, weaker: 0, stronger: 0 };
  row[cmp]++;
  gradeByUm.set(soldUm, row);
}

const judged = out.filter((r) => r.verdict !== "skip");
const n = judged.length || 1;
const pct = (v: Verdict) =>
  judged.length ? ((counts[v] / judged.length) * 100).toFixed(1) : "0.0";

const outStem =
  path.basename(jsonPath).replace(/\.json$/i, "").replace(/-sales$/i, "") +
  "-replay";
const yearLabel = outStem.replace(/-os-replay$/i, "").replace(/-replay$/i, "");

const familyCounts = new Map<string, { judged: number; miss: number; exact: number }>();
for (const r of out) {
  const fam = parseTypeString(r.sold_type)?.family ?? (r.folder ? r.folder : "?");
  const cur = familyCounts.get(fam) ?? { judged: 0, miss: 0, exact: 0 };
  if (r.verdict !== "skip") cur.judged++;
  if (r.verdict === "miss") cur.miss++;
  if (r.verdict === "exact") cur.exact++;
  familyCounts.set(fam, cur);
}

const lines = [
  `# ${yearLabel} OS replay`,
  "",
  `Source: \`${path.basename(jsonPath)}\``,
  `Rows: ${rows.length}. Judged: ${judged.length}. Skipped: ${counts.skip}.`,
  // 2026-11-04 r2 ORDERS-2: say what the app-side inputs are.
  "Tapped-winding kV = OS rated kV, as the app passes it (no OS field marks an autotransformer, so every row is read as two-winding); 252 kV class and above is combined only. Cut-off sold tap codes (`1`, `12231` without W/G) are skipped; 10181G / 10183W go in as positions + mid, as `--range` does. Since 2026-11-04 r2 this changed engine #1 on 26 rows (15 in 2026, 11 in 2025, cut-off codes now skipped included), mostly CM2 → SHZV on 225–400 kV windings. Since r3: with no OS Imax, a W/G row is sized on the lowest-tap current from MVA / kV / Ust / minus steps, as the app does (the OS current is the floor), and Turkish buyers go in as `--market TR`.",
  "",
  "| verdict | n | % of judged | meaning |",
  "|---|---:|---:|---|",
  `| exact | ${counts.exact} | ${pct("exact")}% | engine #1 = sold type (selector letter / 3× prefix ignored) |`,
  `| family-i-um | ${counts["family-i-um"]} | ${pct("family-i-um")}% | #1 same family / I / Um (tap or grade differs) |`,
  `| family | ${counts.family} | ${pct("family")}% | #1 same family, different I or Um |`,
  `| eligible | ${counts.eligible} | ${pct("eligible")}% | sold type is in the list, not #1 |`,
  `| oil-vs-vac | ${counts["oil-vs-vac"]} | ${pct("oil-vs-vac")}% | sold oil (CM/CV/CMD), engine vacuum twin |`,
  `| miss | ${counts.miss} | ${pct("miss")}% | sold type not produced |`,
  "",
  `**#1 family+I+Um or better:** ${(((counts.exact + counts["family-i-um"]) / n) * 100).toFixed(1)}%`,
  `**sold type or vacuum twin eligible:** ${(((counts.exact + counts["family-i-um"] + counts.family + counts.eligible + counts["oil-vs-vac"]) / n) * 100).toFixed(1)}%`,
  `**grade (engine #1 vs sold letter):** match ${gradeCounts.match} / weaker than sold ${gradeCounts.weaker} / stronger ${gradeCounts.stronger}`,
  "",
  "| sold Um | match | weaker than sold | stronger |",
  "|---:|---:|---:|---:|",
  ...[...gradeByUm.keys()]
    .sort((a, b) => a - b)
    .map((um) => {
      const g = gradeByUm.get(um)!;
      return `| ${um} | ${g.match} | ${g.weaker} | ${g.stronger} |`;
    }),
  "",
  "## Misses",
  "",
  "| serial | folder | sold | engine #1 | I | Um | Ust |",
  "|---|---|---|---|---:|---:|---:|",
];

for (const r of out.filter((x) => x.verdict === "miss").slice(0, 80)) {
  lines.push(
    `| ${r.serial} | ${r.folder} | \`${r.sold_type}\` | \`${r.engine_primary}\` | ${r.i_duty} | ${r.um} | ${r.ust} |`,
  );
}

lines.push("", "## By family (judged)", "", "| family | judged | exact | miss |", "|---|---:|---:|---:|");
for (const fam of [...familyCounts.keys()].sort()) {
  const c = familyCounts.get(fam)!;
  if (!c.judged) continue;
  lines.push(`| ${fam} | ${c.judged} | ${c.exact} | ${c.miss} |`);
}

// 2026-11-04: as-is feeds the sold contact, roman and Um back in for OCTC.
const octcRows = out.filter((r) => r.honest_verdict && r.verdict !== "skip");
if (octcRows.length) {
  lines.push(
    "",
    "## OCTC without the answer",
    "",
    "No sold contact, roman auto, structure from the folder (drum / cage), ±N from the OS (5 positions when blank), Um from rated kV through `deriveDuty`.",
    "",
    "| family | judged | exact as-is | exact honest | honest skipped |",
    "|---|---:|---:|---:|---:|",
  );
  const fams = [...new Set(octcRows.map((r) => parseTypeString(r.sold_type)?.family ?? "?"))].sort();
  for (const fam of fams) {
    const rs = octcRows.filter((r) => (parseTypeString(r.sold_type)?.family ?? "?") === fam);
    lines.push(
      `| ${fam} | ${rs.length} | ${rs.filter((r) => r.verdict === "exact").length} | ${rs.filter((r) => r.honest_verdict === "exact").length} | ${rs.filter((r) => r.honest_verdict === "skip").length} |`,
    );
  }
}

const docs = path.join(process.cwd(), "docs", "replay");
writeFileSync(path.join(docs, `${outStem}.md`), lines.join("\n") + "\n");
writeFileSync(path.join(docs, `${outStem}.json`), JSON.stringify(out, null, 2));

const csvHeader = Object.keys(out[0] ?? { serial: "" }).join(",");
const csv = [
  csvHeader,
  ...out.map((r) =>
    Object.values(r)
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  ),
].join("\n");
writeFileSync(path.join(docs, `${outStem}.csv`), csv);

console.log(lines.slice(0, 22).join("\n"));
console.log(`wrote docs/replay/${outStem}.md json csv`);
