/**
 * Replay selectOltc against 2026 OS sales extracted to JSON.
 *
 * Usage: npx vite-node scripts/replay-2026-os.ts [docs/2026-os-sales.json]
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
};

const VAC_COMBINED = new Set(["CM2", "SHZV", "SHZVG"]);
const VAC_COMPOUND = new Set(["CV2"]);
const OIL_COMBINED = new Set(["CM", "CMD"]);
const OIL_COMPOUND = new Set(["CV", "SV"]);
const ON_TANK = new Set(["HWV", "HWDK"]);
const DRY = new Set(["CVT", "CZ"]);
const OCTC = new Set(["WSL", "WDL", "WSG"]);

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
  const tm = tapMeta(tap);
  const ust = num(row.ust_max_v) ?? num(row.ust_v) ?? 0;

  // Sold tap code beats OS ± boxes (those often pick up mid-position "12"
  // or +4/−12 leftovers). Short `7`/`9`/`17` = linear contact count.
  const shortLinear = /^\d{1,2}$/.test(tap.replace(/\s+/g, ""));
  let plusMinus: number | null = null;
  let linearPositions: number | null = null;
  if (shortLinear) {
    linearPositions = Number(tap.replace(/\s+/g, ""));
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

  if (plusMinus && plusMinus > 0 && input.regulation !== "linear") {
    input.plusMinusSteps = Math.round(plusMinus);
    if (tm.mid === 1 || tm.mid === 3) input.midPositions = tm.mid;
  } else if (linearPositions) {
    input.positions = linearPositions;
  } else if (tm.positions) {
    input.positions = tm.positions;
  }

  // Do not lock selector letter — that is part of the answer.
  input.selectorSize = "auto";
  return input;
}

/** Family + phase + I + Um. Ignore selector letter and tap (OS often upsizes grade). */
function looseMatch(actual: string, expected: string): boolean {
  const a = parseTypeString(actual);
  const e = parseTypeString(expected);
  if (!a || !e) return false;
  if (a.family !== e.family) return false;
  if (a.phases !== e.phases) return false;
  if (a.currentA !== e.currentA) return false;
  if (a.umKv !== e.umKv) return false;
  if (e.unitCount > 1 && a.unitCount !== e.unitCount) {
    // Duty already single-phase: engine emits CZI-500, OS wrote 3×CZI-500.
    if (!(e.unitCount === 3 && e.phases === "I" && a.unitCount === 1)) {
      return false;
    }
  }
  return true;
}

function classify(sold: string, models: string[]): Verdict {
  const primary = models[0] ?? "";
  if (commercialMatch(primary, sold, "full")) return "exact";
  if (looseMatch(primary, sold)) return "family-i-um";
  const soldParts = parseTypeString(sold);
  const primParts = parseTypeString(primary);
  if (soldParts && primParts && soldParts.family === primParts.family) {
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
  process.argv[2] ?? path.join(process.cwd(), "docs", "2026-os-sales.json"),
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
  out.push({
    ...base,
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
  });
}

const judged = out.filter((r) => r.verdict !== "skip");
const n = judged.length || 1;
const pct = (v: Verdict) =>
  judged.length ? ((counts[v] / judged.length) * 100).toFixed(1) : "0.0";

const lines = [
  "# 2026 OS replay",
  "",
  `Source: \`${path.basename(jsonPath)}\``,
  `Rows: ${rows.length}. Judged: ${judged.length}. Skipped: ${counts.skip}.`,
  "",
  "| verdict | n | % of judged | meaning |",
  "|---|---:|---:|---|",
  `| exact | ${counts.exact} | ${pct("exact")}% | engine #1 = sold type |`,
  `| family-i-um | ${counts["family-i-um"]} | ${pct("family-i-um")}% | #1 same family / I / Um (tap or grade differs) |`,
  `| family | ${counts.family} | ${pct("family")}% | #1 same family, different I or Um |`,
  `| eligible | ${counts.eligible} | ${pct("eligible")}% | sold type is in the list, not #1 |`,
  `| oil-vs-vac | ${counts["oil-vs-vac"]} | ${pct("oil-vs-vac")}% | sold oil (CM/CV/CMD), engine vacuum twin |`,
  `| miss | ${counts.miss} | ${pct("miss")}% | sold type not produced |`,
  "",
  `**#1 family+I+Um or better:** ${(((counts.exact + counts["family-i-um"]) / n) * 100).toFixed(1)}%`,
  `**sold type or vacuum twin eligible:** ${(((counts.exact + counts["family-i-um"] + counts.family + counts.eligible + counts["oil-vs-vac"]) / n) * 100).toFixed(1)}%`,
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

const docs = path.join(process.cwd(), "docs");
writeFileSync(path.join(docs, "2026-os-replay.md"), lines.join("\n") + "\n");
writeFileSync(path.join(docs, "2026-os-replay.json"), JSON.stringify(out, null, 2));

const csvHeader = Object.keys(out[0] ?? { serial: "" }).join(",");
const csv = [
  csvHeader,
  ...out.map((r) =>
    Object.values(r)
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  ),
].join("\n");
writeFileSync(path.join(docs, "2026-os-replay.csv"), csv);

console.log(lines.slice(0, 20).join("\n"));
console.log(`wrote docs/2026-os-replay.md json csv`);
