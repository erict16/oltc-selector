/**
 * Grid invariants: thousands of transformer-level cases, every ranked result
 * checked against catalogue limits with logic written independently of the
 * engine. Every future rule change runs against this grid.
 *
 * Path under test: CLI flags → parseCliArgs → cliToSelectInput → selectOltc.
 * The checks read the catalogue data (SERIES) and the type string, never the
 * engine's own helpers.
 *
 * Grid (from .audit/grid.ts, plus an oil copy):
 *   two-winding 11–400 kV × neutral/star, line/star, line/delta × MVA 1–750
 *     × ±5..±16 × 0.625–2.5 % (N×% ≤ 25) × W/G
 *   autotransformers 132/66 … 500/220 × junction / MV line × MVA 40–1000
 *   each once with the vacuum default and once with --oil.
 *
 * Default run: a deterministic sample (mulberry32, seed GRID_SEED, default
 * 20261103) so the file stays well under 15 s.
 * Full run: GRID_FULL=1 npx vitest run lib/gridInvariants.test.ts
 */
import { describe, expect, it, vi } from "vitest";
import {
  CliError,
  cliToSelectInput,
  formatCliJson,
  formatCliText,
  parseCliArgs,
} from "./cli";
import { selectOltc } from "./engine";
import { EARTH_INSULATION, SERIES } from "./catalog";
import { parseTypeString } from "./parseType";
import { commercialTypeExists } from "./typeExists";
import { parseTenderLine } from "./nameplate";
import { resolveTapFields } from "./tapCode";
import type { ModelResult, SelectInput, SeriesDef } from "./types";

const FULL = process.env.GRID_FULL === "1";
// The full grid takes minutes on a busy machine; the sample stays fast.
if (FULL) vi.setConfig({ testTimeout: 900_000 });
const SEED = Number(process.env.GRID_SEED ?? 20261103);
/** Sampled cases per check in the default run. */
const SAMPLE = {
  grid: 12000,
  monotonicMva: 400,
  monotonicEarth: 400,
  textJson: 400,
  tender: 800,
};

// ---------------------------------------------------------------- PRNG

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic subset of n items (all of them on GRID_FULL=1). */
function sample<T>(all: T[], n: number, salt: number): T[] {
  if (FULL || all.length <= n) return all;
  const rnd = mulberry32(SEED ^ salt);
  const idx = all.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idx[i], idx[j]] = [idx[j]!, idx[i]!];
  }
  return idx
    .slice(0, n)
    .sort((a, b) => a - b)
    .map((i) => all[i]!);
}

// ---------------------------------------------------------------- grid

const MVA = [1, 2.5, 5, 10, 16, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 750];
const AUTO_MVA = [40, 63, 100, 125, 160, 200, 250, 315, 400, 500, 750, 1000];
const PM = [5, 8, 10, 13, 16];
const PCT = [0.625, 1, 1.25, 1.5, 2.5];
const REG = ["W", "G"] as const;
const TWO_KV = [11, 22, 33, 35, 66, 69, 110, 115, 132, 138, 150, 220, 230, 330, 400];
const AUTO: Array<[number, number]> = [
  [132, 66], [220, 110], [225, 115], [230, 121], [230, 69], [330, 115],
  [330, 150], [345, 138], [400, 132], [400, 220], [500, 220],
];
const TWO_TAPS = [
  ["neutral", "star"],
  ["line", "star"],
  ["line", "delta"],
] as const;

/**
 * IEC 60038 highest voltage of each grid system (written out, not derived).
 * 220 kV class and above = Um 245 kV and up (catalogue 252+).
 */
const IEC_UM_OF_RATED: Record<number, number> = {
  11: 12, 22: 24, 33: 36, 35: 40.5, 66: 72.5, 69: 72.5, 110: 123, 115: 123,
  132: 145, 138: 145, 150: 170, 220: 245, 230: 245, 330: 362, 400: 420,
};
const isHighWinding = (kv: number): boolean => {
  const um = IEC_UM_OF_RATED[kv];
  if (um == null) throw new Error(`grid kV ${kv} missing from IEC_UM_OF_RATED`);
  return um >= 245;
};

type Case = {
  label: string;
  args: string[];
  kind: "two" | "auto";
  tap: "neutral" | "line" | "junction" | "mv-line";
  winding?: "star" | "delta";
  kv?: number;
  hv?: number;
  mv?: number;
  mva: number;
  pm: number;
  pct: number;
  reg: "W" | "G";
  oil: boolean;
};

function twoCase(
  kv: number, mva: number, pm: number, pct: number, reg: "W" | "G",
  tap: "neutral" | "line", winding: "star" | "delta", oil: boolean,
): Case {
  return {
    label: `2W ${mva}MVA ${kv}kV ${tap}/${winding} ±${pm}x${pct}% ${reg}${oil ? " oil" : ""}`,
    args: [
      "--mva", String(mva), "--kv", String(kv), "--tap", tap, "--winding", winding,
      "--pm", String(pm), "--step-pct", String(pct), "--reg", reg,
      ...(oil ? ["--oil"] : []),
    ],
    kind: "two", tap, winding, kv, mva, pm, pct, reg, oil,
  };
}

function autoCase(
  hv: number, mv: number, mva: number, pm: number, pct: number,
  tap: "junction" | "mv-line", oil: boolean,
): Case {
  return {
    label: `AUTO ${mva}MVA ${hv}/${mv} ${tap} ±${pm}x${pct}%${oil ? " oil" : ""}`,
    args: [
      "--mva", String(mva), "--kind", "auto", "--hv", String(hv), "--mv", String(mv),
      "--tap", tap, "--pm", String(pm), "--step-pct", String(pct),
      ...(oil ? ["--oil"] : []),
    ],
    kind: "auto", tap, hv, mv, mva, pm, pct, reg: "W", oil,
  };
}

function buildGrid(): Case[] {
  const cases: Case[] = [];
  for (const oil of [false, true]) {
    for (const kv of TWO_KV)
      for (const mva of MVA)
        for (const pm of PM)
          for (const pct of PCT)
            for (const reg of REG)
              for (const [tap, winding] of TWO_TAPS) {
                if (pm * pct > 25) continue;
                cases.push(twoCase(kv, mva, pm, pct, reg, tap, winding, oil));
              }
    for (const [hv, mv] of AUTO)
      for (const mva of AUTO_MVA)
        for (const pm of PM)
          for (const pct of PCT)
            for (const tap of ["junction", "mv-line"] as const) {
              if (pm * pct > 25) continue;
              cases.push(autoCase(hv, mv, mva, pm, pct, tap, oil));
            }
  }
  return cases;
}

const GRID = buildGrid();

// ---------------------------------------------------------------- running

type Run =
  | { status: "cli_error"; message: string }
  | { status: "none"; input: SelectInput; errors: string[] }
  | { status: "ok"; input: SelectInput; results: ModelResult[] };

function inputFor(args: string[]): SelectInput {
  return cliToSelectInput(parseCliArgs([...args, "--no-update-check"]));
}

function run(args: string[]): Run {
  let input: SelectInput;
  try {
    input = inputFor(args);
  } catch (e) {
    if (e instanceof CliError) return { status: "cli_error", message: e.message };
    throw e;
  }
  const out = selectOltc(input);
  if (!out.ok || !out.results.length) {
    return { status: "none", input, errors: out.errorsEn };
  }
  return { status: "ok", input, results: out.results };
}

const primaryOf = (args: string[]): ModelResult | null => {
  const r = run(args);
  return r.status === "ok" ? r.results[0]! : null;
};

// ---------------------------------------------------------------- independent limits

const SERIES_BY_ID = new Map(SERIES.map((s) => [s.id, s]));
const COMPOUND_FAMILIES = new Set(["CV", "CV2", "SV"]);

/** Brochure Ust ceiling: CV/CV2/SV by contact pitch, CMD 400/600 A at 3300 V. */
function maxUst(s: SeriesDef, pitch: number, currentA: number): number {
  if (s.id === "cmd" && (currentA === 400 || currentA === 600)) return 3300;
  if (s.id === "cv2" || s.id === "cv" || s.id === "sv") {
    if (pitch <= 10) return s.id === "cv2" ? 2000 : 1500;
    if (pitch <= 12) return s.id === "cv2" ? 1500 : 1400;
    return s.id === "cv2" ? 1500 : 1000;
  }
  return s.maxStepVoltageV;
}

const GRADE_ORDER = ["B", "C", "D", "DE"];
const gradeFloor = (um: number) =>
  um <= 72.5 ? "B" : um <= 145 ? "C" : um <= 252 ? "D" : "DE";

/** No compound type on autos or on 220 kV-class tapped windings. */
const combinedOnly = (c: Case) =>
  c.kind === "auto" || (c.kind === "two" && isHighWinding(c.kv!));

/** Independent oracle: catalogue types (any family, III or 3×I) that cover the duty. */
function oracleCovers(c: Case, input: SelectInput, positions: number, pitch: number): string[] {
  const iu = input.throughCurrentA;
  const ust = input.stepVoltageV;
  const hits: string[] = [];
  for (const s of SERIES) {
    if (s.dutyKind === "octc") continue;
    if (!s.mounting.includes("in_tank")) continue;
    if (c.oil ? s.vacuum : !s.vacuum) continue;
    if (combinedOnly(c) && s.structure === "compound") continue;
    if (!s.umKv.some((u) => u >= input.umKv - 0.01)) continue;
    if (positions > s.maxPositionsWithChangeOver) continue;
    for (const ph of ["III", "I"] as const) {
      if (ph === "III" && input.connection === "D" && !(s.iiiConnections ?? s.connections).includes("D")) continue;
      for (const cur of s.currents[ph] ?? []) {
        if (cur + 0.01 < iu) continue; // strict (2026-11-04 audit D2)
        if (ust > maxUst(s, pitch, cur) + 0.5) continue;
        const cap = capFor(s, cur, pitch, iu);
        if (cap != null && ust > 0 && (iu * ust) / 1000 > cap + 0.5) continue;
        hits.push(`${ph === "I" ? "3x" : ""}${s.code}${ph}-${cur}`);
      }
    }
  }
  return hits;
}


type Issue = { label: string; model?: string; rule: string; detail: string };

/** Every invariant on one case. Empty = clean. */
function checkCase(c: Case, r: Run): Issue[] {
  const issues: Issue[] = [];
  if (r.status === "cli_error") return issues;
  const input = r.input;
  const SQ3 = Math.sqrt(3);

  // Duty from the nameplate, computed here: rated current and step voltage.
  const currentKv = c.kind === "auto" ? (c.tap === "junction" ? c.hv! : c.mv!) : c.kv!;
  const div = c.kind === "two" && c.winding === "delta" ? 3 : SQ3;
  const ratedA = (c.mva * 1000) / (div * currentKv);
  const stepV = ((c.kind === "two" && c.winding === "delta" ? currentKv : currentKv / SQ3) * 1000 * c.pct) / 100;
  if (input.throughCurrentA < ratedA * 0.99)
    issues.push({ label: c.label, rule: "DUTY_BELOW_RATED", detail: `${input.throughCurrentA.toFixed(1)} < ${ratedA.toFixed(1)}` });
  if (Math.abs(input.stepVoltageV - stepV) > stepV * 0.005 + 0.5)
    issues.push({ label: c.label, rule: "UST_MAPPING", detail: `${input.stepVoltageV.toFixed(1)} vs ${stepV.toFixed(1)}` });
  if (c.kind === "auto" && input.transformerKind !== "auto")
    issues.push({ label: c.label, rule: "AUTO_LOST", detail: "" });

  if (r.status === "none") {
    // Oracle: nothing found, yet some catalogue type covers it.
    // Positions and pitch from the Fig. 3-3 table (tapCode), as in the audit script.
    const tap = resolveTapFields(input);
    const hits = oracleCovers(c, input, tap.positions, tap.pitch);
    if (input.umKv <= 363 && hits.length)
      issues.push({
        label: c.label,
        rule: "FALSE_NEGATIVE",
        detail: `engine none (${r.errors[0]}), oracle: ${hits.slice(0, 4).join(", ")} | Iu ${input.throughCurrentA.toFixed(0)} Um ${input.umKv} Ust ${input.stepVoltageV.toFixed(0)}`,
      });
    return issues;
  }

  r.results.forEach((res, idx) => {
    const tag = idx === 0 ? "primary" : `alt${idx}`;
    const push = (rule: string, detail = "") =>
      issues.push({ label: c.label, model: `${tag}:${res.model}`, rule, detail });
    const s = SERIES_BY_ID.get(res.seriesId);
    if (!s) return push("UNKNOWN_SERIES", res.seriesId);

    const parsed = parseTypeString(res.model);
    if (!parsed) push("UNPARSEABLE", res.model);
    else {
      if (parsed.currentA !== res.currentA) push("PARSE_MISMATCH", `I ${parsed.currentA} vs ${res.currentA}`);
      if (Math.abs(parsed.umKv - res.umKv) > 0.01) push("PARSE_MISMATCH", `Um ${parsed.umKv} vs ${res.umKv}`);
      if (parsed.phases !== res.phases) push("PARSE_MISMATCH", `phases ${parsed.phases} vs ${res.phases}`);
      if (parsed.unitCount !== res.unitCount) push("PARSE_MISMATCH", `units ${parsed.unitCount} vs ${res.unitCount}`);
      if (parsed.family !== s.code) push("PARSE_MISMATCH", `family ${parsed.family} vs ${s.code}`);
    }
    if (!commercialTypeExists(res.model, s)) push("NOT_A_TYPE");

    if (res.currentA + 0.01 < input.throughCurrentA)
      push("CURRENT_SHORT", `${res.currentA} < ${input.throughCurrentA.toFixed(1)}`);
    if (res.umKv + 0.01 < input.umKv) push("UM_SHORT", `${res.umKv} < ${input.umKv}`);
    const lim = maxUst(s, res.pitch, res.currentA);
    if (input.stepVoltageV > lim + 0.5) push("UST_OVER", `${input.stepVoltageV.toFixed(0)} > ${lim}`);
    if (s.id === "cmd" && (res.currentA === 400 || res.currentA === 600) && input.stepVoltageV > 3300 + 0.5)
      push("CMD_UST_OVER_3300", `${input.stepVoltageV.toFixed(0)} V`);
    const cap = capFor(s, res.currentA, res.pitch, input.throughCurrentA);
    if (cap != null && input.stepVoltageV > 0 && (input.throughCurrentA * input.stepVoltageV) / 1000 > cap + 0.5)
      push("CAPACITY_OVER", `${((input.throughCurrentA * input.stepVoltageV) / 1000).toFixed(0)} > ${cap}`);

    const family = parsed?.family ?? s.code;
    const compound = s.structure === "compound" || COMPOUND_FAMILIES.has(family);
    if (c.kind === "auto" && compound) push("AUTO_COMPOUND", family);
    if (c.kind === "two" && isHighWinding(c.kv!) && compound)
      push("HIGH_WINDING_COMPOUND", `${c.kv} kV tapped winding got ${family}`);

    if (res.phases === "III" && input.connection === "D" && !(s.iiiConnections ?? s.connections).includes("D"))
      push("III_D_ILLEGAL");
    const maxPos = input.regulation === "linear" ? s.maxPositionsLinear : s.maxPositionsWithChangeOver;
    if (res.positions > maxPos) push("POSITIONS_OVER", `${res.positions} > ${maxPos}`);
    if (c.oil && s.vacuum) push("VACUUM_ON_OIL_REQUEST");
    if (!c.oil && !s.vacuum) push("OIL_ON_VACUUM_REQUEST");
    if (!EARTH_INSULATION[res.umKv]) push("UM_NOT_IN_TABLE", String(res.umKv));
    if (s.usesSelectorSize) {
      const floor = gradeFloor(res.umKv);
      if (GRADE_ORDER.indexOf(res.selectorSize) < GRADE_ORDER.indexOf(floor))
        push("GRADE_BELOW_FLOOR", `${res.selectorSize} < ${floor}`);
    }
  });

  const p = r.results[0]!;
  if (input.connection === "D" && p.unitCount === 1 && p.phases === "III" && p.umKv > 145)
    issues.push({ label: c.label, model: p.model, rule: "III_AT_LINE_ABOVE_145", detail: "three-phase unit at a line-end point above Um 145" });
  return issues;
}

type GridReport = {
  cases: number;
  ok: number;
  none: number;
  cliError: number;
  byRule: Record<string, number>;
  issues: Issue[];
};

/**
 * Hand the event loop back now and then. A long synchronous loop starves
 * vitest's worker RPC ("Timeout calling onTaskUpdate") on the full grid.
 */
let ticks = 0;
const breathe = async (): Promise<void> => {
  if (++ticks % 250 === 0) await new Promise<void>((r) => setImmediate(r));
};

async function runGrid(cases: Case[]): Promise<GridReport> {
  const rep: GridReport = { cases: cases.length, ok: 0, none: 0, cliError: 0, byRule: {}, issues: [] };
  for (const c of cases) {
    await breathe();
    const r = run(c.args);
    if (r.status === "ok") rep.ok++;
    else if (r.status === "none") rep.none++;
    else rep.cliError++;
    for (const i of checkCase(c, r)) {
      rep.byRule[i.rule] = (rep.byRule[i.rule] ?? 0) + 1;
      rep.issues.push(i);
    }
  }
  return rep;
}

/** First few issues per rule: a readable failure message. */
function digest(issues: Issue[]): string[] {
  const per: Record<string, number> = {};
  const out: string[] = [];
  for (const i of issues) {
    per[i.rule] = (per[i.rule] ?? 0) + 1;
    if (per[i.rule]! <= 5) out.push(`${i.rule} | ${i.label} | ${i.model ?? ""} | ${i.detail}`);
  }
  return out;
}

// ---------------------------------------------------------------- tests

/**
 * Step capacity written out from TD-CV&SV Table 1, independent of the
 * catalogue lookup: CV by contacts 10/12/14; SV 400/325 kVA at 500 A, or
 * 525/420 kVA when the duty is cut to 350/300 A (footnote *).
 */
function capFor(s: { id: string; stepCapacityByCurrent?: Record<number, number> }, cur: number, pitch: number, dutyA: number): number | null {
  const by = (row: Record<number, number>) => row[[10, 12, 14].find((p) => p >= pitch) ?? 14] ?? row[14];
  if (s.id === "cv" && cur === 350) return by({ 10: 525, 12: 420, 14: 350 });
  if (s.id === "cv" && cur === 700) return by({ 10: 660, 12: 520, 14: 450 });
  if (s.id === "sv" && cur === 500) {
    if (pitch <= 10) return dutyA <= 350 + 0.01 ? 525 : 400;
    return dutyA <= 300 + 0.01 ? 420 : 325;
  }
  return s.stepCapacityByCurrent?.[cur] ?? null;
}

describe(`grid invariants (${FULL ? "full grid" : `sample, seed ${SEED}`})`, () => {
  const cases = sample(GRID, SAMPLE.grid, 1);
  let report: Promise<GridReport> | undefined;
  const reportOnce = () => (report ??= runGrid(cases));

  it("grid is the size the audit script built (47,472 vacuum + 47,472 oil)", () => {
    expect(GRID.length).toBe(2 * 47472);
  });

  it("every ranked result stays inside catalogue limits; no false negatives", async () => {
    const rep = await reportOnce();
    if (FULL) {
      // Full-run counts, for the record.
      console.log(JSON.stringify({ cases: rep.cases, ok: rep.ok, none: rep.none, cliError: rep.cliError, byRule: rep.byRule }));
    }
    expect(digest(rep.issues)).toEqual([]);
    // The sample must exercise the engine, not just CLI refusals.
    expect(rep.ok).toBeGreaterThan(rep.cases * 0.5);
    // 1.6 s alone; the full parallel suite pushed it past the 5 s default.
  }, FULL ? 900_000 : 20_000);

  it("220 kV class tapped windings and autotransformers never get CV/CV2/SV", async () => {
    const rep = await reportOnce();
    const hits = rep.issues.filter((i) => i.rule === "HIGH_WINDING_COMPOUND" || i.rule === "AUTO_COMPOUND");
    expect(digest(hits)).toEqual([]);
    // Guard: the sample holds such cases.
    expect(cases.filter((c) => combinedOnly(c)).length).toBeGreaterThan(100);
  });

  it("CMD 400/600 A is never chosen above 3300 V", async () => {
    const rep = await reportOnce();
    expect(digest(rep.issues.filter((i) => i.rule === "CMD_UST_OVER_3300"))).toEqual([]);
  });

  it("CMD Ust cap is reachable: a 3300+ V oil duty under 600 A does not get CMD 400/600", () => {
    // 220 kV delta line end, ±8×1.6 %: Ust 3520 V at 35 A. Only CMD reaches
    // 3520 V in oil, and only from 1000 A.
    const r = run(["--mva", "20", "--kv", "220", "--tap", "line", "--winding", "delta",
      "--pm", "8", "--step-pct", "1.6", "--oil"]);
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.input.stepVoltageV).toBeGreaterThan(3300);
    expect(r.results[0]!.seriesId).toBe("cmd");
    for (const res of r.results) {
      const cmdLow = res.seriesId === "cmd" && (res.currentA === 400 || res.currentA === 600);
      expect(cmdLow, res.model).toBe(false);
    }
  });
});

describe("monotonic", () => {
  it("raising MVA never lowers the primary's current rating", async () => {
    // Base configurations: everything but MVA.
    const bases: Array<(mva: number) => Case> = [];
    for (const oil of [false, true]) {
      for (const kv of TWO_KV)
        for (const pm of PM)
          for (const pct of PCT)
            for (const reg of REG)
              for (const [tap, winding] of TWO_TAPS) {
                if (pm * pct > 25) continue;
                bases.push((mva) => twoCase(kv, mva, pm, pct, reg, tap, winding, oil));
              }
      for (const [hv, mv] of AUTO)
        for (const pm of PM)
          for (const pct of PCT)
            for (const tap of ["junction", "mv-line"] as const) {
              if (pm * pct > 25) continue;
              bases.push((mva) => autoCase(hv, mv, mva, pm, pct, tap, oil));
            }
    }
    // Same family: the rating never drops. Across a family change it may drop
    // only when the earlier type no longer fits the bigger duty (step capacity
    // or current run out): 69 kV delta ±8×2.5 %, 63 → 80 MVA goes
    // CV2III-600D (800 kVA, need 833) → 3xCM2I-500 (1400 kVA). That is the
    // ranking working, not a regression; a drop while the earlier type still
    // fits is.
    const stillFits = (prev: ModelResult, input: SelectInput): boolean => {
      const s = SERIES_BY_ID.get(prev.seriesId)!;
      if (prev.currentA + 0.01 < input.throughCurrentA) return false;
      if (input.stepVoltageV > maxUst(s, prev.pitch, prev.currentA) + 0.5) return false;
      const cap = capFor(s, prev.currentA, prev.pitch, input.throughCurrentA);
      if (cap != null && (input.throughCurrentA * input.stepVoltageV) / 1000 > cap + 0.5) return false;
      return true;
    };
    const bad: string[] = [];
    let familyDrops = 0;
    for (const make of sample(bases, SAMPLE.monotonicMva, 2)) {
      const ladder = make(1).kind === "auto" ? AUTO_MVA : MVA;
      let prev: { mva: number; p: ModelResult } | null = null;
      for (const mva of ladder) {
        await breathe();
        const c = make(mva);
        const r = run(c.args);
        if (r.status !== "ok") continue;
        const p = r.results[0]!;
        if (prev && p.currentA < prev.p.currentA) {
          const what = `${c.label}: ${prev.mva} MVA ${prev.p.model} → ${mva} MVA ${p.model}`;
          if (p.seriesId === prev.p.seriesId) bad.push(`same family: ${what}`);
          else if (stillFits(prev.p, r.input)) bad.push(`earlier type still fits: ${what}`);
          else familyDrops++;
        }
        prev = { mva, p };
      }
    }
    if (FULL) console.log(`MVA ladder: ${familyDrops} legal drops on a family change`);
    expect(bad.slice(0, 10)).toEqual([]);
  });

  it("raising --earth-um on a neutral never lowers the primary's Um", async () => {
    const EARTH = [40.5, 72.5, 126, 170, 252];
    const bases: Case[] = [];
    for (const oil of [false, true])
      for (const kv of TWO_KV)
        for (const mva of MVA)
          for (const pm of PM)
            for (const pct of PCT)
              for (const reg of REG) {
                if (pm * pct > 25) continue;
                bases.push(twoCase(kv, mva, pm, pct, reg, "neutral", "star", oil));
              }
    const bad: string[] = [];
    for (const c of sample(bases, SAMPLE.monotonicEarth, 3)) {
      let prev: { earth: number; model: string; umKv: number } | null = null;
      for (const earth of EARTH) {
        await breathe();
        const p = primaryOf([...c.args, "--earth-um", String(earth)]);
        if (!p) continue;
        if (p.umKv + 0.01 < earth) bad.push(`${c.label} earth ${earth}: ${p.model} below the stated Um`);
        if (prev && p.umKv < prev.umKv)
          bad.push(`${c.label}: earth ${prev.earth} ${prev.model} → earth ${earth} ${p.model}`);
        prev = { earth, model: p.model, umKv: p.umKv };
      }
    }
    expect(bad.slice(0, 10)).toEqual([]);
  });
});

describe("CLI text and JSON agree on the primary", () => {
  it("first text line equals the JSON model", async () => {
    const bad: string[] = [];
    let compared = 0;
    for (const c of sample(GRID, SAMPLE.textJson, 4)) {
      await breathe();
      let args;
      let input;
      try {
        args = parseCliArgs([...c.args, "--no-update-check"]);
        input = cliToSelectInput(args);
      } catch (e) {
        if (e instanceof CliError) continue;
        throw e;
      }
      const json = JSON.parse(formatCliJson(input, args)) as { ok: boolean; model: string | null };
      let text: string | null = null;
      try {
        text = formatCliText(input, args).split("\n")[0]!;
      } catch (e) {
        if (!(e instanceof CliError)) throw e;
      }
      if (text == null) {
        if (json.model != null && json.ok) bad.push(`${c.label}: text refused, JSON ${json.model}`);
        continue;
      }
      compared++;
      if (text !== json.model) bad.push(`${c.label}: text ${text} vs JSON ${json.model}`);
    }
    expect(bad.slice(0, 10)).toEqual([]);
    expect(compared).toBeGreaterThan(FULL ? 1000 : 50);
  });
});

// ---------------------------------------------------------------- tender line

/** LV of a two-winding job, by HV kV. Any value below the HV works. */
const LV_OF: Record<number, number> = {
  11: 0.4, 22: 0.4, 33: 11, 35: 10.5, 66: 11, 69: 13.8, 110: 10.5, 115: 13.8,
  132: 33, 138: 13.8, 150: 20, 220: 35, 230: 34.5, 330: 35, 400: 22,
};
const AUTO_LV = 35;

type TenderCase = {
  line: string;
  flags: string[];
  expect: {
    kind: "two_winding" | "auto";
    mva: number;
    voltagesKv: number[];
    tapIndex: number;
    pm: number;
    pct: number;
    vg: string;
    tapPoint: "neutral" | "line_end" | "auto_junction" | "auto_mv_line";
    winding: "star" | "delta";
    tapKv: number | null;
    hvKv: number | null;
    mvKv: number | null;
  };
};

function buildTender(): TenderCase[] {
  const out: TenderCase[] = [];
  for (const pm of PM)
    for (const pct of PCT) {
      if (pm * pct > 25) continue;
      for (const kv of TWO_KV)
        for (const mva of MVA)
          for (const vg of ["YNd11", "YNyn0", "Dyn11"]) {
            const lv = LV_OF[kv]!;
            const delta = vg.startsWith("D");
            out.push({
              line: `${mva} MVA ${kv}±${pm}x${pct}%/${lv} kV ${vg}`,
              flags: [
                "--mva", String(mva), "--kv", String(kv),
                "--tap", delta ? "line" : "neutral", "--winding", delta ? "delta" : "star",
                "--pm", String(pm), "--step-pct", String(pct),
              ],
              expect: {
                kind: "two_winding", mva, voltagesKv: [kv, lv], tapIndex: 0, pm, pct, vg,
                tapPoint: delta ? "line_end" : "neutral", winding: delta ? "delta" : "star",
                tapKv: kv, hvKv: null, mvKv: null,
              },
            });
          }
      for (const [hv, mv] of AUTO)
        for (const mva of AUTO_MVA)
          for (const onMv of [false, true]) {
            const ratio = onMv
              ? `${hv}/${mv}±${pm}x${pct}%/${AUTO_LV}`
              : `${hv}±${pm}x${pct}%/${mv}/${AUTO_LV}`;
            out.push({
              line: `${mva} MVA ${ratio} kV YNa0d11`,
              flags: [
                "--mva", String(mva), "--kind", "auto", "--hv", String(hv), "--mv", String(mv),
                "--tap", onMv ? "mv-line" : "junction", "--pm", String(pm), "--step-pct", String(pct),
              ],
              expect: {
                kind: "auto", mva, voltagesKv: [hv, mv, AUTO_LV], tapIndex: onMv ? 1 : 0, pm, pct,
                vg: "YNa0d11", tapPoint: onMv ? "auto_mv_line" : "auto_junction", winding: "star",
                tapKv: null, hvKv: hv, mvKv: mv,
              },
            });
          }
    }
  return out;
}

describe("tender line reader", () => {
  const all = buildTender();
  const cases = sample(all, SAMPLE.tender, 5);

  it("parsed fields equal the generator's inputs", () => {
    const bad: string[] = [];
    for (const t of cases) {
      const p = parseTenderLine(t.line);
      if (!p) {
        bad.push(`${t.line}: not read`);
        continue;
      }
      const e = t.expect;
      const got = {
        kind: p.kind, mva: p.mva, voltagesKv: p.voltagesKv, tapIndex: p.tapIndex,
        pm: p.plus === p.minus ? p.plus : NaN, pct: p.stepPct, vg: p.vectorGroup,
        tapPoint: p.tapPoint, winding: p.winding, tapKv: p.tapKv, hvKv: p.hvKv, mvKv: p.mvKv,
      };
      if (JSON.stringify(got) !== JSON.stringify(e)) bad.push(`${t.line}: ${JSON.stringify(got)}`);
      if (p.warnings.length) bad.push(`${t.line}: warnings ${p.warnings.join("; ")}`);
    }
    expect(bad.slice(0, 10)).toEqual([]);
  });

  it("--line gives the same primary as the explicit flags", async () => {
    const bad: string[] = [];
    const outcome = (args: string[]) => {
      const r = run(args);
      return r.status === "ok" ? r.results[0]!.model : r.status;
    };
    let typed = 0;
    for (const t of cases) {
      await breathe();
      const viaLine = outcome(["--line", t.line]);
      const viaFlags = outcome(t.flags);
      if (viaLine !== viaFlags) bad.push(`${t.line}: line ${viaLine} vs flags ${viaFlags}`);
      if (viaFlags !== "cli_error" && viaFlags !== "none") typed++;
    }
    expect(bad.slice(0, 10)).toEqual([]);
    expect(typed).toBeGreaterThan(cases.length * 0.5);
  });
});

// ---------------------------------------------------------------- OCTC auto vs the locks

/**
 * 2026-11-04 r3 ENGINE-6: the FALSE_NEGATIVE oracle for OCTC. Auto must not
 * come back empty when the cage or the drum lock finds a type (auto took the
 * duty Um only, and the 2025 list has 5 WSL rows at 40.5).
 */
describe("OCTC auto is never empty where a structure lock finds a type", () => {
  const cases: string[][] = [];
  for (const kv of [6.3, 10.5, 11, 20, 22, 33, 35, 36.75, 66, 110, 121])
    for (const mva of [1, 2.5, 6.3, 16, 25, 40, 50, 63, 80, 125])
      for (const [tap, winding] of TWO_TAPS)
        for (const pm of [2, 4])
          for (const pct of [1.25, 2.5])
            cases.push([
              "--mva", String(mva), "--kv", String(kv), "--tap", tap, "--winding", winding,
              "--octc", "--pm", String(pm), "--step-pct", String(pct),
            ]);
  for (const iu of [100, 300, 630, 900, 1250, 2000])
    for (const um of [12, 24, 40.5, 72.5, 126])
      for (const pos of [3, 5, 6, 7, 9, 12, 17])
        for (const conn of ["Y", "D"])
          cases.push(["--iu", String(iu), "--um", String(um), "--octc", "--pos", String(pos), "--conn", conn]);
  const picked = sample(cases, 900, 7);

  it("auto finds a type whenever --structure cage or drum does", async () => {
    const bad: string[] = [];
    let none = 0;
    for (const a of picked) {
      await breathe();
      const auto = run(a);
      if (auto.status !== "none") continue;
      none++;
      for (const lock of ["cage", "drum"]) {
        const r = run([...a, "--structure", lock]);
        if (r.status === "ok") bad.push(`${a.join(" ")}: auto none (${auto.errors[0]}), ${lock} ${r.results[0]!.model}`);
      }
    }
    expect(bad.slice(0, 10)).toEqual([]);
    expect(none).toBeLessThan(picked.length);
  });
});
