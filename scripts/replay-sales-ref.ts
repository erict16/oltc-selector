/**
 * Catalogue coverage for 2025 shipment types (HM reference list).
 *
 * Not a duty replay — the list has no transformer I / Ust.
 * Question: is this sold SKU still in the current catalogue, and does
 * selectOltc still emit it when duty = the sold rating?
 *
 * Retired currents (CV2-500, CV2-250, …) are skipped, not failed.
 *
 * Usage: npx vite-node scripts/replay-sales-ref.ts [docs/sales-2025-ref.json]
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SERIES } from "../lib/catalog";
import { selectOltc } from "../lib/engine";
import { parseTypeString } from "../lib/orderReplay";
import type {
  Connection,
  Mounting,
  PhaseCode,
  SelectInput,
  SwitchingMedium,
} from "../lib/types";

type RefRow = { year?: number; sold_type: string; qty?: number };

const VAC = new Set(["CM2", "SHZV", "SHZVG", "CV2", "HWV", "HWDK", "CVT", "CZ"]);
const OIL = new Set(["CM", "CMD", "CV", "SV"]);
const ON_TANK = new Set(["HWV", "HWDK"]);
const DRY = new Set(["CVT", "CZ"]);
const OCTC = new Set(["WSL", "WDL", "WSG"]);

function seriesOf(family: string) {
  return SERIES.find((s) => s.code === family);
}

function retiredReason(parsed: NonNullable<ReturnType<typeof parseTypeString>>): string | null {
  const s = seriesOf(parsed.family);
  if (!s) return `unknown family ${parsed.family}`;
  const phase = (parsed.phases === "I" || parsed.phases === "II" || parsed.phases === "III"
    ? parsed.phases
    : "III") as PhaseCode;
  const list = s.currents[phase] ?? s.currents.I;
  if (!list?.includes(parsed.currentA)) {
    return `retired current ${parsed.family} ${phase} ${parsed.currentA} A`;
  }
  if (!s.umKv.some((u) => Math.abs(u - parsed.umKv) < 0.05)) {
    return `retired Um ${parsed.family} ${parsed.umKv} kV`;
  }
  return null;
}

function buildInput(parsed: NonNullable<ReturnType<typeof parseTypeString>>): SelectInput {
  const f = parsed.family;
  let mounting: Mounting = "in_tank";
  let medium: SwitchingMedium = "oil_vacuum";
  let preferVacuum = true;
  let dutyKind: "oltc" | "octc" = "oltc";
  if (OCTC.has(f)) {
    medium = "oil";
    preferVacuum = false;
    dutyKind = "octc";
  } else if (ON_TANK.has(f)) {
    mounting = "on_tank";
  } else if (DRY.has(f)) {
    mounting = "dry_type";
    medium = "dry";
  } else if (OIL.has(f)) {
    medium = "oil";
    preferVacuum = false;
  } else if (VAC.has(f)) {
    medium = "oil_vacuum";
    preferVacuum = true;
  }
  const phases: PhaseCode =
    parsed.phases === "I" || parsed.phases === "II" || parsed.phases === "III"
      ? parsed.phases
      : "III";
  const connection: Connection =
    parsed.connection === "D" || parsed.connection === "Y" ? parsed.connection : "Y";
  const tap = (parsed.tapCode || "").replace(/\s+/g, "");
  const shortLinear = /^\d{1,2}$/.test(tap);
  const m = tap.match(/^(\d{2})(\d{2})(\d)([WG0]?)$/i);
  const input: SelectInput = {
    mounting,
    medium,
    preferVacuum,
    dutyKind,
    phases,
    connection,
    throughCurrentA: parsed.currentA,
    umKv: parsed.umKv,
    stepVoltageV: 0,
    regulation: shortLinear
      ? "linear"
      : !m
        ? "reversing"
        : (m[4] || "0").toUpperCase() === "G"
          ? "coarse_fine"
          : (m[4] || "0").toUpperCase() === "W"
            ? "reversing"
            : "linear",
    mdu: "none",
    selectorSize: "auto",
  };
  if (shortLinear) {
    input.positions = Number(tap);
  } else if (m) {
    const mid = Number(m[3]);
    const pos = Number(m[2]);
    if (input.regulation !== "linear" && (mid === 1 || mid === 3)) {
      input.plusMinusSteps = (pos - mid) / 2;
      input.midPositions = mid as 1 | 3;
    } else {
      input.positions = pos;
    }
  }
  return input;
}

function loose(a: string, b: string): boolean {
  const x = parseTypeString(a);
  const y = parseTypeString(b);
  if (!x || !y) return false;
  if (x.family !== y.family) return false;
  if (x.currentA !== y.currentA) return false;
  if (x.umKv !== y.umKv) return false;
  if (x.phases !== y.phases) return false;
  return true;
}

const jsonPath = path.resolve(
  process.argv[2] ?? path.join(process.cwd(), "docs", "sales-2025-ref.json"),
);
const raw = JSON.parse(readFileSync(jsonPath, "utf8"));
const rows: RefRow[] = Array.isArray(raw) ? raw : raw.rows;

const counts = {
  rows: rows.length,
  unparsed: 0,
  retired: 0,
  exact: 0,
  eligible: 0,
  miss: 0,
};
const retiredWhy: Record<string, number> = {};
const misses: { sold: string; primary: string; reason: string }[] = [];

for (const row of rows) {
  const sold = (row.sold_type || "").trim();
  const parsed = parseTypeString(sold);
  if (!parsed) {
    counts.unparsed++;
    continue;
  }
  const retired = retiredReason(parsed);
  if (retired) {
    counts.retired++;
    retiredWhy[retired] = (retiredWhy[retired] ?? 0) + 1;
    continue;
  }
  const out = selectOltc(buildInput(parsed));
  const models = out.results.map((r) => r.model);
  const primary = models[0] ?? "";
  if (loose(primary, sold)) {
    counts.exact++;
    continue;
  }
  if (models.some((m) => loose(m, sold))) {
    counts.eligible++;
    continue;
  }
  counts.miss++;
  if (misses.length < 40) {
    misses.push({
      sold,
      primary,
      reason: out.ok ? "not in list" : out.errorsEn.join("; "),
    });
  }
}

const judged = counts.exact + counts.eligible + counts.miss;
const lines = [
  "# 2025 sales-reference coverage",
  "",
  `Source: \`${path.basename(jsonPath)}\` (Year=2025 only).`,
  `Rows: ${counts.rows}. Retired (not in current catalogue): ${counts.retired}. Unparsed: ${counts.unparsed}. Judged: ${judged}.`,
  "",
  "| verdict | n | % of judged |",
  "|---|---:|---:|",
  `| exact #1 family/I/Um | ${counts.exact} | ${judged ? ((counts.exact / judged) * 100).toFixed(1) : "0"}% |`,
  `| eligible (in list, not #1) | ${counts.eligible} | ${judged ? ((counts.eligible / judged) * 100).toFixed(1) : "0"}% |`,
  `| miss | ${counts.miss} | ${judged ? ((counts.miss / judged) * 100).toFixed(1) : "0"}% |`,
  "",
  `**Still selectable:** ${judged ? (((counts.exact + counts.eligible) / judged) * 100).toFixed(1) : "0"}% of current-catalogue 2025 rows.`,
  "",
  "Retired currents are skips, not misses (CV2-500 / CV2-250 and other currents no longer listed).",
  "",
  "## Retired reasons",
  "",
  ...Object.entries(retiredWhy)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([k, n]) => `- ${k}: ${n}`),
  "",
  "## Misses",
  "",
  "| sold | engine #1 | reason |",
  "|---|---|---|",
  ...misses.map((m) => `| \`${m.sold}\` | \`${m.primary}\` | ${m.reason} |`),
  "",
];

const docs = path.join(process.cwd(), "docs");
writeFileSync(path.join(docs, "sales-2025-ref-coverage.md"), lines.join("\n"));
console.log(lines.slice(0, 22).join("\n"));
console.log("wrote docs/sales-2025-ref-coverage.md");
