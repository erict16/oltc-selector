/**
 * Tender line → transformer fields.
 *
 * An OEM at tender stage has one line from the schedule, not our form:
 *   "220/110/35kV-125MVA 225±8x1,25%/115/35kV - YNa0d11"
 *   "SFZ11-25000/110, 110±8×1.25%/10.5 kV, YNd11"
 * 2026-10-27: that first line was typed in as a 220 kV two-winding job and
 * came out CV2III-600D/126. The `a` in YNa0d11 says autotransformer; reading
 * it here means the kind, tap point and voltages come from the tender, not
 * from what the user remembered to click.
 *
 * Every field the line does not state is listed in `assumed` so the page and
 * CLI can say so. Nothing here sizes the switch: deriveDuty does that.
 */
import type { TapPoint, TransformerKind, WindingConnection } from "./transformer";
import type { Regulation } from "./types";
import { umForEarthInsulation } from "./catalog";
import { lookupDiagram, pitchFor, pmStepOptionsFor, preferredMid, defaultPitch } from "./tapCode";

export type WindingLetter = "Y" | "D" | "Z" | "a";

/** A second tapped winding in the same ratio (38.5±2x2.5% beside 115±8x1.25%). */
export interface OtherRange {
  tapIndex: number;
  kv: number;
  plus: number;
  minus: number;
  stepPct: number | null;
  winding: WindingConnection;
  tapPoint: TapPoint;
  windingAssumed: boolean;
  tapPointAssumed: boolean;
}

export interface TenderLine {
  kind: TransformerKind;
  /** Rated MVA (largest figure when a winding split like 125/125/50 is given). */
  mva: number | null;
  /** Rated kV in the order written (HV, MV, LV). */
  voltagesKv: number[];
  /** Index into voltagesKv of the winding that carries the ± range. */
  tapIndex: number | null;
  plus: number | null;
  minus: number | null;
  /** Percent per step (1.25 for 1.25 %). */
  stepPct: number | null;
  /** Vector group as written, e.g. YNa0d11. */
  vectorGroup: string | null;
  /** Winding letter per voltage, from the vector group. */
  windings: WindingLetter[];
  /** Suggested form fields. */
  tapPoint: TapPoint;
  winding: WindingConnection;
  /** Two-winding: rated kV of the tapped winding. */
  tapKv: number | null;
  /** Autotransformer: HV and MV rated kV. */
  hvKv: number | null;
  mvKv: number | null;
  /** Neutral LI (BIL) in kV when the line states it. */
  neutralBilKv: number | null;
  /** "single-phase" written: the MVA is one unit's. */
  phases: "I" | null;
  /** Regulation the words state (coarse/fine, linear, reversing). */
  regulation: Regulation | null;
  /** Ranges on other windings; the OLTC range is the one with most steps. */
  otherRanges: OtherRange[];
  /** Fields the line did not state; the reader chose them. */
  assumed: AssumedField[];
  /** What the reader did with the line, for the page (keys) … */
  notes: LineNote[];
  /** … and the same in English for the CLI. */
  warnings: string[];
}

export type AssumedField =
  | "kind"
  | "tap_winding"
  | "tap_point"
  | "winding"
  | "range"
  | "mva";

/** Reader notes. The page shows `lineW_<key>` with the vars; the CLI the English. */
export type LineNoteKey =
  | "auto_needs_mv"
  | "auto_tertiary"
  | "zigzag"
  | "tiny_mva"
  | "single_phase"
  | "tap_ladder"
  | "auto_vg"
  | "delta_text"
  | "percent"
  | "percent_positions"
  | "percent_small"
  | "zero_range"
  | "second_range";

export type LineNote = { key: LineNoteKey; vars?: Record<string, string | number> };

const NOTE_EN: Record<LineNoteKey, string> = {
  auto_needs_mv: "autotransformer needs HV and MV kV",
  auto_tertiary: "range is on the tertiary of an autotransformer",
  zigzag: "zigzag tapped winding: confirm the tap point",
  tiny_mva: "power reads {mva} MVA: check the figure",
  single_phase: "single-phase: {mva} MVA read as one unit, sized as 3 × {mva} MVA on a single-phase switch",
  tap_ladder: "{chain} kV read as tap voltages; rated {kv} kV",
  auto_vg: "text says autotransformer but vector group {vg} has HV and MV in different connections",
  delta_text: "text mentions delta: confirm which winding is tapped",
  percent: "{pct} read as +{plus}/−{minus} × {step} %",
  percent_positions: "{pos} positions do not match +{plus}/−{minus}",
  percent_small: "{pct} gives no step count: range not read",
  zero_range: "range ±0 ignored",
  second_range: "{kv} kV {range} is a second tapped winding: used for off-circuit duty",
};

export function lineNoteEn(n: LineNote): string {
  let s = NOTE_EN[n.key];
  for (const [k, v] of Object.entries(n.vars ?? {})) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

const NUM = String.raw`\d+(?:\.\d+)?`;

/** Commas inside numbers (1,25 %) become points; × * ✕ become x. */
export function normalizeTenderText(raw: string): string {
  return (
    raw
      .replace(/[×✕✖*]/g, "x")
      // 2026-11-04: "31,500 kVA" / "2 500 kVA" is one number; read as 31.5 / 0.5 kVA
      // before, the current came out 1000× low. Not a ratio digit ("33/11 630 kVA").
      .replace(/\b\d{1,3}(?:[,   ]\d{3})+(?=\s*kVA)/gi, (m: string, offset: number, s: string) => {
        // "33/11 630 kVA": 630 follows a ratio figure, it is not 11 630.
        // "Dyn11 1 600 kVA": a clock number is not a figure; join the 1 600.
        const before = s.slice(Math.max(0, offset - 12), offset);
        if (/[\d/.,]\s?$/.test(before) && !/[A-Za-z]\d{1,2}\s$/.test(before)) return m;
        return m.replace(/[,   ]/g, "");
      })
      // 2026-11-04: a comma after a vector-group clock is a separator, not a
      // decimal: "YNd11,66±…" was read as 11.66 kV.
      .replace(/(?<![DdYyNnaZz]\d{0,2})(\d),(\d)/g, "$1.$2")
      .replace(/，/g, ",")
      .replace(/％/g, "%")
      .replace(/[–—－−]/g, "-")
      // Split LV written "33-33 kV" is one figure (W02 275/33-33 kV).
      .replace(/(\d+(?:\.\d+)?)-\1(?=\s*(?:kV|\/))/gi, "$1")
      .replace(/\+\s*\/\s*-|\+\s*-(?=\s*\d+\s*x)/g, "±")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** "YNa0d11" → ["Y","a","D"]; "Dyn11" → ["D","Y"]. Null when no group. */
export function parseVectorGroup(text: string): { group: string; windings: WindingLetter[] } | null {
  // HV letter upper case, the rest lower case with optional clock numbers.
  const m = text.match(/(?:^|[^A-Za-z])((?:YN|Y|D|ZN|Z)(?:(?:yn|y|d|zn|z|a|auto)\d{0,2}){1,3})(?![A-Za-z])/);
  if (!m) return null;
  const group = m[1];
  const windings: WindingLetter[] = [];
  const re = /(YN|Y|D|ZN|Z|yn|y|d|zn|z|auto|a)\d{0,2}/g;
  let t: RegExpExecArray | null;
  while ((t = re.exec(group))) {
    const w = t[1].toLowerCase();
    windings.push(w.startsWith("a") ? "a" : w.startsWith("y") ? "Y" : w.startsWith("d") ? "D" : "Z");
  }
  return { group, windings };
}

function parseMva(text: string): number | null {
  const mva = text.match(new RegExp(String.raw`(${NUM})(?:\s*/\s*${NUM})*\s*MVA`, "i"));
  if (mva) {
    const all = mva[0].replace(/MVA/i, "").split("/").map((s) => Number(s.trim()));
    const best = Math.max(...all.filter((n) => Number.isFinite(n)));
    if (best > 0) return best;
  }
  const kva = text.match(new RegExp(String.raw`(${NUM})\s*kVA`, "i"));
  if (kva) return Number(kva[1]) / 1000;
  // Chinese model: SFZ11-25000/110, OSFPSZ-250000/220 (kVA / HV kV).
  const cn = text.match(/\b(O?S[A-Z]*Z[A-Z0-9]*)-(\d{3,7})\/(\d{2,3})\b/);
  if (cn) return Number(cn[2]) / 1000;
  return null;
}

type RangeHit = {
  plus: number;
  minus: number;
  stepPct: number | null;
  index: number;
  end: number;
  /** ±0 / +0-0: no range, but its place still ties the voltages. */
  zero?: boolean;
  /** Read from a percent range; `stated` false when the step count was assumed. */
  pct?: { text: string; stated: boolean };
  /** Percent range too small to split (±5 %): range not read. */
  unread?: string;
};

/** Impedance and tolerance figures (Uk 10.5 %, tolerance +10/-10 %) are not tap ranges. */
function nearTolerance(text: string, index: number): boolean {
  return /(?:\bu[kz]\b|\bimpedance|\btoler|偏差|阻抗)/i.test(text.slice(Math.max(0, index - 30), index));
}

/** Smallest total step count ≥ 16 that splits both sides into whole steps. */
export function splitPercentRange(plusPct: number, minusPct: number, total?: number) {
  const a = Math.round(plusPct * 1000);
  const b = Math.round(minusPct * 1000);
  const span = a + b;
  if (!(span > 0)) return null;
  const tries = total ? [total] : Array.from({ length: 19 }, (_, i) => 16 + i);
  for (const n of tries) {
    if (span % n) continue;
    const s = span / n;
    if (a % s || b % s) continue;
    return { plus: a / s, minus: b / s, stepPct: s / 1000 };
  }
  return null;
}

/**
 * 2026-11-04: +0/-30 %, ±10 %, +15 %/-10 % (20 x 1.25 %) are percent ranges.
 * They used to be read as 30 or 10 steps. The step size comes from the line
 * ("x 1.25 %", "2.5 % steps", "±8 positions", "17 positions"); else the
 * smallest whole split with ≥ 16 steps, as Huaming sold (B05 +0/-30 % →
 * 16 × 1.875 %), marked assumed. The lowest-tap current depends only on the
 * minus percent, so it is exact either way.
 */
function percentRange(text: string, pm: RegExpMatchArray | null): RangeHit | null {
  const hits = [
    ...[...text.matchAll(new RegExp(String.raw`\+\s*(${NUM})\s*%?\s*/?\s*-\s*(${NUM})\s*%`, "g"))].map(
      (m) => ({ m, plusPct: Number(m[1]), minusPct: Number(m[2]) }),
    ),
    ...[...text.matchAll(new RegExp(String.raw`±\s*(${NUM})\s*%`, "g"))].map((m) => ({
      m,
      plusPct: Number(m[1]),
      minusPct: Number(m[1]),
    })),
  ]
    .filter((h) => !nearTolerance(text, h.m.index ?? 0))
    .filter((h) => h.plusPct + h.minusPct > 0 && h.plusPct <= 50 && h.minusPct <= 50)
    .sort((x, y) => (x.m.index ?? 0) - (y.m.index ?? 0));
  const h = hits[0];
  if (!h) return null;
  const { plusPct, minusPct } = h;
  const index = h.m.index ?? 0;
  const end = index + h.m[0].length;
  const pctText = h.m[0].trim();
  const span = plusPct + minusPct;

  // Step size stated anywhere: "(20 x 1.25%)", "21 positions x 1.25%", "(2.5% steps)".
  const nx = text.match(new RegExp(String.raw`(?<![±+\-\d.])(\d{1,2})\s*x\s*(${NUM})\s*%`));
  const xs = text.match(new RegExp(String.raw`x\s*(${NUM})\s*%`));
  const stepWord = text.match(new RegExp(String.raw`(${NUM})\s*%\s*(?:per\s*)?steps?\b`, "i"));
  const posM = text.match(/(?<![±\d.]\s?)(\d{1,2})\s*(?:positions|pos\b|taps|tappings)/i);
  const countM = text
    .slice(end, end + 40)
    .match(/^\s*[,(]?\s*(?:in\s*)?(\d{1,2})\s*(?:steps|级|档)/i);
  const positions = posM ? Number(posM[1]) : null;

  let step: number | null = null;
  let total: number | undefined;
  if (nx) {
    step = Number(nx[2]);
    total = Number(nx[1]);
  } else if (xs) step = Number(xs[1]);
  else if (stepWord) step = Number(stepWord[1]);
  else if (pm) step = (h.plusPct === h.minusPct ? minusPct : span / 2) / Number(pm[1]);
  else if (positions != null && positions > 2) step = span / (positions - 1);
  else if (countM) total = Number(countM[1]);

  let plus: number;
  let minus: number;
  let stepPct: number;
  let stated = true;
  if (step != null && step > 0 && step <= 10) {
    plus = Math.round(plusPct / step);
    minus = Math.round(minusPct / step);
    stepPct = Math.round(step * 10000) / 10000;
  } else {
    const split = total ? splitPercentRange(plusPct, minusPct, total) : null;
    if (split) ({ plus, minus, stepPct } = split);
    else {
      // ±5 % with no step count: 16 steps of 0.625 % is not credible.
      if (span <= 10) return { plus: 0, minus: 0, stepPct: null, index, end, unread: pctText };
      stated = false;
      const auto = splitPercentRange(plusPct, minusPct);
      if (auto) ({ plus, minus, stepPct } = auto);
      else {
        plus = Math.round(plusPct / 1.25);
        minus = Math.round(minusPct / 1.25);
        stepPct = 1.25;
      }
    }
  }
  if (plus + minus === 0) return null;
  return { plus, minus, stepPct, index, end, pct: { text: pctText, stated } };
}

/** ±8x1.25%, ±8 x 1.25 %, +4-2x2.5%, +4/-2 x 2.5%; percent forms via percentRange. */
function findRange(text: string): RangeHit | null {
  // A step count is never followed by % (±10 % is a percent range).
  const sym = new RegExp(String.raw`±\s*(\d{1,2})(?![\d.]*\s*%)\s*(?:x\s*(${NUM})\s*%)?`, "g");
  const asym = new RegExp(
    String.raw`\+\s*(\d{1,2})(?![\d.]*\s*%)\s*/?\s*-\s*(\d{1,2})(?![\d.]*\s*%)\s*(?:x\s*(${NUM})\s*%)?`,
    "g",
  );
  const steps = [
    ...[...text.matchAll(sym)].map((m) => ({ m, plus: Number(m[1]), minus: Number(m[1]), step: m[2] })),
    ...[...text.matchAll(asym)].map((m) => ({ m, plus: Number(m[1]), minus: Number(m[2]), step: m[3] })),
  ]
    // A stated step (±10x2.5 %) is a tap range even beside "Uz 8 %".
    .filter((h) => h.step != null || !nearTolerance(text, h.m.index ?? 0))
    .sort((x, y) => (x.m.index ?? 0) - (y.m.index ?? 0));
  const real = steps.filter((h) => h.plus + h.minus > 0);
  const s = real[0];
  const hit = (h: (typeof steps)[number]): RangeHit => ({
    plus: h.plus,
    minus: h.minus,
    stepPct: h.step ? Number(h.step) : null,
    index: h.m.index ?? 0,
    end: (h.m.index ?? 0) + h.m[0].length,
  });
  // A fully stated ±N × s % wins.
  if (s && s.step) return hit(s);
  // "±10 % ±8 positions": the bare ±N is the step count of the percent range.
  const pmCount = s && s.plus === s.minus ? (s.m as RegExpMatchArray) : null;
  const p = percentRange(text, pmCount);
  if (p) return p;
  if (s) return hit(s);
  // ±0 x 1.25 %: no range, but keep its place for the voltages.
  const z = steps[0];
  return z ? { ...hit(z), zero: true } : null;
}

type ExtraRange = { at: number; plus: number; minus: number; stepPct: number | null };

const RANGE_AT_START = new RegExp(
  String.raw`^\s*(?:±\s*(\d{1,2})|\+\s*(\d{1,2})\s*/?\s*-\s*(\d{1,2}))(?![\d.]*\s*%)\s*(?:x\s*(${NUM})\s*%)?`,
);

/**
 * Voltage ratio that carries the range: "225±8x1.25%/115/35kV".
 * Falls back to the longest a/b(/c) kV chain when the range stands alone,
 * then (two-winding) to lone "N kV" figures.
 */
function findVoltages(
  text: string,
  range: RangeHit | null,
  lone: boolean,
): { kv: number[]; tapIndex: number | null; extra: ExtraRange[] } {
  if (range) {
    // Walk left from the range to the number it is attached to, and right
    // along "/n" segments; then left along "n/" segments.
    const before = text.slice(0, range.index);
    const after = text.slice(range.end);
    // 2026-11-04: "132/33 kV ±10x1.25%": the kV closes the ratio, so the range
    // stands alone. It used to land on 33 kV (LV current, LV Um) with nothing
    // assumed. kV may sit between figure and range only when the ratio goes on.
    const continues = new RegExp(String.raw`^\s*(?:kV)?\s*/\s*${NUM}`, "i").test(after);
    const own = before.match(
      new RegExp(continues ? String.raw`(${NUM})\s*(?:kV)?\s*$` : String.raw`(${NUM})\s*$`, "i"),
    );
    if (own) {
      const left: number[] = [];
      let head = before.slice(0, own.index);
      for (;;) {
        const m = head.match(new RegExp(String.raw`(${NUM})\s*(?:kV)?\s*/\s*$`, "i"));
        if (!m) break;
        left.unshift(Number(m[1]));
        head = head.slice(0, m.index);
      }
      const right: number[] = [];
      const extra: ExtraRange[] = [];
      let tail = after;
      for (;;) {
        const m = tail.match(new RegExp(String.raw`^\s*(?:kV)?\s*/\s*(${NUM})`, "i"));
        if (!m) break;
        right.push(Number(m[1]));
        tail = tail.slice(m[0].length);
        // A second tapped winding: 115±8x1.25%/38.5±2x2.5%/11 kV.
        const r = tail.match(RANGE_AT_START);
        if (r) {
          const plus = Number(r[1] ?? r[2]);
          const minus = Number(r[1] ?? r[3]);
          if (plus + minus > 0) {
            extra.push({ at: left.length + right.length, plus, minus, stepPct: r[4] ? Number(r[4]) : null });
          }
          tail = tail.slice(r[0].length);
        }
      }
      const kv = [...left, Number(own[1]), ...right];
      // "69/13.8 ±8x1.25%": a spaced range after a closed ratio stands alone too.
      const standalone = !continues && left.length > 0 && /\s$/.test(own[0]);
      if (kv.length >= 2) return { kv, tapIndex: standalone ? null : left.length, extra };
    }
  }
  const chains = [...text.matchAll(new RegExp(String.raw`(${NUM}(?:\s*/\s*${NUM}){1,2})\s*kV`, "gi"))]
    .map((m) => m[1].split("/").map((x) => Number(x.trim())))
    .filter((c) => c.every((n) => n > 0.2 && n < 1200));
  if (chains.length) {
    chains.sort((a, b) => b.length - a.length);
    return { kv: chains[0], tapIndex: null, extra: [] };
  }
  // Chinese model SFZ11-25000/110: HV only.
  const cn = text.match(/\b(O?S[A-Z]*Z[A-Z0-9]*)-(\d{3,7})\/(\d{2,3})\b/);
  if (cn) return { kv: [Number(cn[3])], tapIndex: null, extra: [] };
  if (!lone) return { kv: [], tapIndex: null, extra: [] };
  // 2026-11-04: "63 MVA, 225 kV, ±8x1.25%" and "HV 115 kV ±9x1.78%; LV 11 kV"
  // were refused. Insulation figures (BIL 550 kV, Um 145 kV) are not windings.
  const hits = [...text.matchAll(new RegExp(String.raw`(?<![A-Za-z/\d.])(${NUM})\s*kV(?!A)`, "gi"))]
    .map((m) => ({ kv: Number(m[1]), index: m.index ?? 0, end: (m.index ?? 0) + m[0].length }))
    .filter((h) => h.kv > 0.2 && h.kv < 1200)
    .filter(
      (h) =>
        !/\b(?:BIL|LIWL|LI|SIL|AC|Um|insulation|withstand|neutral|highest|maximum|max\.?|equipment)\b[^\d]{0,20}$/i.test(
          text.slice(Math.max(0, h.index - 30), h.index),
        ),
    );
  const kv = [...new Set(hits.map((h) => h.kv))].sort((a, b) => b - a);
  if (!kv.length || kv.length > 3) return { kv: [], tapIndex: null, extra: [] };
  const direct = range
    ? hits.find((h) => h.end <= range.index && /^\s*$/.test(text.slice(h.end, range.index)))
    : undefined;
  return { kv, tapIndex: direct ? kv.indexOf(direct.kv) : null, extra: [] };
}

function isAutoText(text: string): boolean {
  // "AT" stays case-sensitive: "rated at 110 kV" is not an autotransformer.
  return (
    /\bauto(?:-?transformer)?\b|自耦/i.test(text) ||
    /\bAT\b|\bOS[A-Z]*Z[A-Z0-9]*-\d/.test(text)
  );
}

/** Delta tied to the tapping (not an LV delta or a tertiary). */
const DELTA_TAP =
  /(?:regulat\w*|tapp\w*|OLTC)\b[^;.]{0,40}\bdelta\b|\bHV\s+delta\b|\bD[\s-]?connection\b|三角形调压|角接调压/i;
const DELTA_OTHER =
  /\b(?:LV|MV|tertiary|secondary|stabili[sz]ing)\s+delta\b|\bdelta\s+(?:tertiary|stabili)|star\s*\/\s*delta/i;
const STAR_TAP =
  /(?:regulat\w*|tapp\w*)[^;.]{0,40}\b(?:star|neutral)\b|\bstar neutral\b|\bin neutral\b|neutral point|中性点调压/i;

export function parseTenderLine(raw: string): TenderLine | null {
  const text = normalizeTenderText(raw);
  if (!text) return null;
  const vg = parseVectorGroup(text);
  const windings = vg?.windings ?? [];
  const notes: LineNote[] = [];
  // 2026-11-04 A03: "Auto-transformer, vector group YNd11d11" is two-winding.
  // An auto's HV and MV share one winding, so only a group whose first two
  // letters differ contradicts the word (YNyn0d11 autos stay auto).
  const contradicts = vg != null && windings.length >= 2 && windings[0] !== windings[1];
  const auto = windings.includes("a") || (isAutoText(text) && !contradicts);
  if (isAutoText(text) && contradicts && !windings.includes("a")) {
    notes.push({ key: "auto_vg", vars: { vg: vg!.group } });
  }
  const range = findRange(text);
  const found = findVoltages(text, range, !auto);
  let kv = found.kv;
  const rangeIndex = found.tapIndex;
  const mva = parseMva(text);
  if (!kv.length && mva == null && !range && !vg) return null;

  const assumed: AssumedField[] = [];
  if (!vg && !isAutoText(text)) assumed.push("kind");
  if (mva == null) assumed.push("mva");
  if (mva != null && mva < 0.05) notes.push({ key: "tiny_mva", vars: { mva } });
  const real = range && !range.zero && !range.unread ? range : null;
  if (!real || (real.pct && !real.pct.stated)) assumed.push("range");
  if (range?.zero) notes.push({ key: "zero_range" });
  if (range?.unread) notes.push({ key: "percent_small", vars: { pct: range.unread } });
  if (real?.pct) {
    if (!real.pct.stated) {
      notes.push({
        key: "percent",
        vars: { pct: real.pct.text, plus: real.plus, minus: real.minus, step: real.stepPct ?? 1.25 },
      });
    }
    const pos = text.match(/(?<![±\d.]\s?)(\d{1,2})\s*(?:positions|pos\b|taps|tappings)/i);
    if (pos && Number(pos[1]) !== real.plus + real.minus + 1) {
      notes.push({ key: "percent_positions", vars: { pos: pos[1], plus: real.plus, minus: real.minus } });
    }
  }

  // 2026-11-04 Q04: "118.25/110/96.25 kV (+6/-10 x 1.25%)" is a tap ladder,
  // not HV/MV/LV; 118.25 kV as rated put the current 7 % low.
  if (!auto && kv.length === 3 && real && rangeIndex == null) {
    const sorted = [...kv].sort((a, b) => b - a);
    if (sorted[0]! / sorted[2]! <= 1.35) {
      notes.push({ key: "tap_ladder", vars: { chain: kv.join("/"), kv: sorted[1]! } });
      kv = [sorted[1]!];
    }
  }

  // Voltages are written HV first. A chain written low → high is flipped.
  const flipped = kv.length > 1 && kv[0] < kv[kv.length - 1];
  const voltagesKv = flipped ? [...kv].reverse() : kv;
  const at = (i: number) => (flipped ? kv.length - 1 - i : i);
  let tapIndex = rangeIndex != null ? at(rangeIndex) : null;
  if (tapIndex == null && voltagesKv.length) {
    tapIndex = 0;
    assumed.push("tap_winding");
  }

  // The OLTC takes the range with most steps; the others are off-circuit.
  type Ranged = { tapIndex: number; plus: number; minus: number; stepPct: number | null };
  let main: Ranged | null =
    real && tapIndex != null
      ? { tapIndex, plus: real.plus, minus: real.minus, stepPct: real.stepPct }
      : null;
  const others: Ranged[] = found.extra
    .filter((e) => e.at < kv.length)
    .map((e) => ({ tapIndex: at(e.at), plus: e.plus, minus: e.minus, stepPct: e.stepPct }));
  if (main && others.length) {
    const all = [main, ...others];
    const big = all.reduce((x, y) => (y.plus + y.minus > x.plus + x.minus ? y : x));
    main = big;
    others.splice(0, others.length, ...all.filter((r) => r !== big));
    tapIndex = big.tapIndex;
  }

  /** Winding and tap point of the winding at index i (two-winding). */
  const pointAt = (i: number | null) => {
    let letter = i != null ? windings[i] : undefined;
    let winding: WindingConnection = "star";
    let tapPoint: TapPoint = "neutral";
    let windingAssumed = false;
    let tapPointAssumed = false;
    let deltaText = false;
    if (letter == null) {
      // 2026-11-04: "D connection", "regulation at the middle of the delta
      // winding" were sized as a star neutral. Only a delta tied to the
      // tapping counts; an LV or tertiary delta keeps the guess, flagged.
      if (DELTA_TAP.test(text) && !DELTA_OTHER.test(text)) letter = "D";
      else if (/\bdelta\b|三角形|角接/i.test(text)) deltaText = true;
      else if (STAR_TAP.test(text)) letter = "Y";
    }
    if (letter === "D") {
      winding = "delta";
      tapPoint = "line_end";
    } else if (letter === "Y") {
      // A star winding is tapped at the neutral unless the tender says line end.
      if (/line[\s-]?end|线端/i.test(text)) tapPoint = "line_end";
      else if (!STAR_TAP.test(text)) tapPointAssumed = true;
    } else {
      windingAssumed = true;
      tapPointAssumed = true;
    }
    return { winding, tapPoint, windingAssumed, tapPointAssumed, zigzag: letter === "Z", deltaText };
  };

  const otherRanges: OtherRange[] = auto
    ? []
    : others.map((r) => {
        const p = pointAt(r.tapIndex);
        return {
          ...r,
          kv: voltagesKv[r.tapIndex]!,
          winding: p.winding,
          tapPoint: p.tapPoint,
          windingAssumed: p.windingAssumed,
          tapPointAssumed: p.tapPointAssumed,
        };
      });
  for (const r of otherRanges) {
    const pm = r.plus === r.minus ? `±${r.plus}` : `+${r.plus}/−${r.minus}`;
    notes.push({ key: "second_range", vars: { kv: r.kv, range: `${pm}${r.stepPct ? ` × ${r.stepPct} %` : ""}` } });
  }

  // 2026-11-04 T05: "333 MVA single-phase" was sized as a three-phase 333 MVA,
  // a third of the winding current.
  // "auxiliary supply 230 V single-phase" is not the transformer.
  const phases =
    /\bMVA\b[^,;]{0,25}single[\s-]?phase|single[\s-]?phase\s+(?:unit|units|transformer|auto|bank|\d)|\b1[\s-]?ph(?:ase)?\s+(?:unit|transformer|\d)|单相(?!电源|供电|交流)/i.test(
      text,
    )
      ? ("I" as const)
      : null;
  if (phases && mva != null) notes.push({ key: "single_phase", vars: { mva } });
  // 2026-11-04 T01/T03: "coarse/fine" and "linear" words were ignored ("non-linear load" is not linear).
  const regulation: Regulation | null = /coarse[\s/-]*fine|粗细调/i.test(text)
    ? "coarse_fine"
    : /(?<!non[\s-]?)\blinear\b|线性调/i.test(text)
      ? "linear"
      : /\brevers|正反调/i.test(text)
        ? "reversing"
        : null;

  const base = {
    mva,
    voltagesKv,
    tapIndex,
    plus: main?.plus ?? null,
    minus: main?.minus ?? null,
    stepPct: main?.stepPct ?? null,
    vectorGroup: vg?.group ?? null,
    windings,
    neutralBilKv: parseNeutralBil(text),
    phases,
    regulation,
    otherRanges,
    assumed,
    notes,
  };

  if (auto) {
    const hvKv = voltagesKv[0] ?? null;
    const mvKv = voltagesKv[1] ?? null;
    if (hvKv == null || mvKv == null) notes.push({ key: "auto_needs_mv" });
    // Range on the HV figure: the tap winding sits at the series/common
    // junction and carries the HV current (Colin 2026-10-27). Range on the
    // MV figure: regulating winding in the MV lead (HMR 230/121 kV).
    const tapPoint: TapPoint = tapIndex === 1 ? "auto_mv_line" : "auto_junction";
    assumed.push("tap_point");
    if (tapIndex != null && tapIndex > 1) notes.push({ key: "auto_tertiary" });
    return {
      ...base,
      kind: "auto",
      tapPoint,
      winding: "star",
      tapKv: null,
      hvKv,
      mvKv,
      warnings: notes.map(lineNoteEn),
    };
  }

  const tapKv = tapIndex != null ? voltagesKv[tapIndex] ?? null : null;
  const p = pointAt(tapIndex);
  if (p.zigzag) notes.push({ key: "zigzag" });
  if (p.deltaText) notes.push({ key: "delta_text" });
  if (p.windingAssumed) assumed.push("winding");
  if (p.tapPointAssumed) assumed.push("tap_point");
  return {
    ...base,
    kind: "two_winding",
    tapPoint: p.tapPoint,
    winding: p.winding,
    tapKv,
    hvKv: null,
    mvKv: null,
    warnings: notes.map(lineNoteEn),
  };
}

/** "neutral BIL 325 kV", "Neutral: LI 550", "中性点 LI 325". */
function parseNeutralBil(text: string): number | null {
  const m = text.match(/(?:neutral|中性点)[^;.]{0,30}?(?:BIL|LI|LIWL)\s*[:=]?\s*(\d{2,4})/i);
  return m ? Number(m[1]) : null;
}

// ------------------------------------------------------------ line → form

/**
 * W/G geometry for an uneven +a/−b range (2026-11-04). Huaming sells the
 * Fig. 3-3 row for ±⌈S/2⌉ (S = a + b steps) and skips the unused positions on
 * the motor drive: +4/−12 → 10193W, +12/−8 → 12233W, +5/−7 → 14131W. An odd S
 * on a pitch-10 row drops one position: +7/−10 → 10181W, +8/−7 → 10183W.
 * The lowest-tap current still uses the real minus steps. Linear stays S + 1.
 */
export type RangeGeometry = {
  positions: number;
  mid: 0 | 1 | 3;
  pitch: 10 | 12 | 14 | 16 | 18;
  /** Set for a Fig. 3-3 ±N row; unset for linear and the special 10181/10183 codes. */
  plusMinusSteps?: number;
};

const asPitch = (p: number) => p as RangeGeometry["pitch"];

export function geometryForRange(plus: number, minus: number, reg: Regulation): RangeGeometry {
  const S = plus + minus;
  if (reg === "linear") return { positions: S + 1, mid: 0, pitch: asPitch(defaultPitch(S + 1, "linear")) };
  const opts = pmStepOptionsFor(reg);
  const want = plus === minus ? plus : Math.ceil(S / 2);
  // G has no row below ±8: +4/−12 G → 10193G. ±7 G is resolveTapFields' 10173G.
  const own = opts.includes(want) || (plus === minus && reg === "coarse_fine" && want === 7);
  const n = own ? want : (opts.find((o) => o >= want) ?? want);
  const mid = preferredMid(n, reg);
  const row = lookupDiagram(n, mid, reg);
  if (plus !== minus && row && S % 2 === 1 && n === want && row.pitch === 10) {
    return { positions: S + mid, mid, pitch: 10 };
  }
  return {
    positions: row?.positions ?? 2 * n + mid,
    mid,
    pitch: asPitch(row?.pitch ?? pitchFor(n, mid)),
    plusMinusSteps: n,
  };
}

/** Regulation for a range the user did not set: an uneven S ≤ 9 stays linear, as sold (+2/−6 → 10090). */
export function defaultRegulationForRange(plus: number, minus: number): Regulation | null {
  return plus !== minus && plus + minus <= 9 ? "linear" : null;
}

export type LineSettings = {
  kind: TransformerKind;
  kindStated: boolean;
  /** MVA for deriveDuty: 3 × the unit's MVA for a single-phase unit. */
  mva: number;
  phases: "I" | null;
  hvKv: number | null;
  mvKv: number | null;
  tapKv: number | null;
  winding: WindingConnection;
  windingStated: boolean;
  tapPoint: TapPoint;
  tapPointStated: boolean;
  /** The range this duty uses (the off-circuit winding's when octc). */
  plus: number | null;
  minus: number | null;
  stepPct: number | null;
  /** The line's word for the regulation; else linear for an uneven S ≤ 9; else null. */
  regulation: Regulation | null;
  regulationStated: boolean;
  /** Insulation to earth from a stated neutral BIL. */
  earthUm: number | null;
  /** The off-circuit duty took another winding than the line's first range. */
  octcWinding: boolean;
};

export type LineRefusal = "no_mva_kv" | "auto_needs_mv";

/**
 * One mapping from a read line to the form, for the page and the CLI
 * (2026-11-04: the two disagreed on autotransformers without MV, single-phase
 * and uneven ranges). Null fields are not stated; callers use their defaults.
 */
export function tenderLineSettings(
  tl: TenderLine,
  opts: { octc?: boolean } = {},
): { ok: true; s: LineSettings } | { ok: false; reason: LineRefusal } {
  if (tl.mva == null || !tl.voltagesKv.length) return { ok: false, reason: "no_mva_kv" };
  if (tl.kind === "auto" && (tl.hvKv == null || tl.mvKv == null)) return { ok: false, reason: "auto_needs_mv" };
  let tapKv = tl.tapKv;
  let winding = tl.winding;
  let tapPoint = tl.tapPoint;
  let windingStated = !tl.assumed.includes("winding");
  let tapPointStated = !tl.assumed.includes("tap_point");
  let plus = tl.plus;
  let minus = tl.minus;
  let stepPct = tl.stepPct;
  let octcWinding = false;
  // Off-circuit on a line with two ranges: the smaller range is the OCTC's.
  if (opts.octc && tl.kind === "two_winding" && tl.otherRanges.length) {
    const r = tl.otherRanges.reduce((x, y) => (y.plus + y.minus <= x.plus + x.minus ? y : x));
    if (plus == null || minus == null || r.plus + r.minus <= plus + minus) {
      plus = r.plus;
      minus = r.minus;
      stepPct = r.stepPct;
      winding = r.winding;
      tapPoint = r.tapPoint;
      tapKv = r.kv;
      windingStated = !r.windingAssumed;
      tapPointStated = !r.tapPointAssumed;
      octcWinding = true;
    }
  }
  const uneven = plus != null && minus != null ? defaultRegulationForRange(plus, minus) : null;
  const earthUm =
    tl.neutralBilKv != null && tapPoint === "neutral" ? umForEarthInsulation(0, tl.neutralBilKv) : null;
  return {
    ok: true,
    s: {
      kind: tl.kind,
      kindStated: !tl.assumed.includes("kind"),
      mva: tl.phases === "I" ? 3 * tl.mva : tl.mva,
      phases: tl.phases,
      hvKv: tl.hvKv,
      mvKv: tl.mvKv,
      tapKv,
      winding,
      windingStated,
      tapPoint,
      tapPointStated,
      plus,
      minus,
      stepPct,
      regulation: tl.regulation ?? uneven,
      regulationStated: tl.regulation != null,
      earthUm: earthUm ?? null,
      octcWinding,
    },
  };
}

/** Minus steps of the line's uneven range, 0 when even or none. The page never sizes below it. */
export function lineMinusSteps(tl: TenderLine | null, octc = false): number {
  if (!tl) return 0;
  const r = tenderLineSettings(tl, { octc });
  if (!r.ok) return 0;
  const { plus, minus } = r.s;
  return plus != null && minus != null && plus !== minus ? minus : 0;
}
