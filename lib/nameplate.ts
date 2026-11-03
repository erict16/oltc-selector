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

export type WindingLetter = "Y" | "D" | "Z" | "a";

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
  /** Fields the line did not state; the reader chose them. */
  assumed: AssumedField[];
  /** Fields that conflict or cannot be used as read. */
  warnings: string[];
}

export type AssumedField =
  | "kind"
  | "tap_winding"
  | "tap_point"
  | "winding"
  | "range"
  | "mva";

const NUM = String.raw`\d+(?:\.\d+)?`;

/** Commas inside numbers (1,25 %) become points; × * ✕ become x. */
export function normalizeTenderText(raw: string): string {
  return raw
    .replace(/[×✕✖*]/g, "x")
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/，/g, ",")
    .replace(/％/g, "%")
    .replace(/[–—－]/g, "-")
    .replace(/\+\s*\/\s*-|\+\s*-(?=\s*\d+\s*x)/g, "±")
    .replace(/\s+/g, " ")
    .trim();
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

type RangeHit = { plus: number; minus: number; stepPct: number | null; index: number; end: number };

/** ±8x1.25%, ±8 x 1.25 %, +4-2x2.5%, +4/-2 x 2.5%. */
function findRange(text: string): RangeHit | null {
  const sym = new RegExp(String.raw`±\s*(\d{1,2})\s*(?:x\s*(${NUM})\s*%)?`);
  const asym = new RegExp(String.raw`\+\s*(\d{1,2})\s*/?\s*-\s*(\d{1,2})\s*(?:x\s*(${NUM})\s*%)?`);
  const s = text.match(sym);
  const a = text.match(asym);
  const pick = s && (!a || (s.index ?? 0) <= (a.index ?? 0)) ? "s" : a ? "a" : null;
  if (pick === "s" && s) {
    const n = Number(s[1]);
    return { plus: n, minus: n, stepPct: s[2] ? Number(s[2]) : null, index: s.index ?? 0, end: (s.index ?? 0) + s[0].length };
  }
  if (pick === "a" && a) {
    return {
      plus: Number(a[1]),
      minus: Number(a[2]),
      stepPct: a[3] ? Number(a[3]) : null,
      index: a.index ?? 0,
      end: (a.index ?? 0) + a[0].length,
    };
  }
  return null;
}

/**
 * Voltage ratio that carries the range: "225±8x1.25%/115/35kV".
 * Falls back to the longest a/b(/c) kV chain when the range stands alone.
 */
function findVoltages(text: string, range: RangeHit | null): { kv: number[]; tapIndex: number | null } {
  if (range) {
    // Walk left from the range to the number it is attached to, and right
    // along "/n" segments; then left along "n/" segments.
    const before = text.slice(0, range.index);
    const after = text.slice(range.end);
    const own = before.match(new RegExp(String.raw`(${NUM})\s*(?:kV)?\s*$`, "i"));
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
      let tail = after;
      for (;;) {
        const m = tail.match(new RegExp(String.raw`^\s*(?:kV)?\s*/\s*(${NUM})`, "i"));
        if (!m) break;
        right.push(Number(m[1]));
        tail = tail.slice(m[0].length);
      }
      const kv = [...left, Number(own[1]), ...right];
      if (kv.length >= 2) return { kv, tapIndex: left.length };
    }
  }
  const chains = [...text.matchAll(new RegExp(String.raw`(${NUM}(?:\s*/\s*${NUM}){1,2})\s*kV`, "gi"))]
    .map((m) => m[1].split("/").map((x) => Number(x.trim())))
    .filter((c) => c.every((n) => n > 0.2 && n < 1200));
  // Chinese model SFZ11-25000/110: HV only.
  if (!chains.length) {
    const cn = text.match(/\b(O?S[A-Z]*Z[A-Z0-9]*)-(\d{3,7})\/(\d{2,3})\b/);
    if (cn) return { kv: [Number(cn[3])], tapIndex: null };
    return { kv: [], tapIndex: null };
  }
  chains.sort((a, b) => b.length - a.length);
  return { kv: chains[0], tapIndex: null };
}

function isAutoText(text: string): boolean {
  // "AT" stays case-sensitive: "rated at 110 kV" is not an autotransformer.
  return (
    /\bauto(?:-?transformer)?\b|自耦/i.test(text) ||
    /\bAT\b|\bOS[A-Z]*Z[A-Z0-9]*-\d/.test(text)
  );
}

export function parseTenderLine(raw: string): TenderLine | null {
  const text = normalizeTenderText(raw);
  if (!text) return null;
  const vg = parseVectorGroup(text);
  const range = findRange(text);
  const { kv, tapIndex: rangeIndex } = findVoltages(text, range);
  const mva = parseMva(text);
  if (!kv.length && mva == null && !range && !vg) return null;

  const assumed: AssumedField[] = [];
  const warnings: string[] = [];
  const windings = vg?.windings ?? [];
  const auto = windings.includes("a") || isAutoText(text);
  if (!vg && !isAutoText(text)) assumed.push("kind");
  if (mva == null) assumed.push("mva");
  if (!range) assumed.push("range");

  // Voltages are written HV first. A chain written low → high is flipped.
  const voltagesKv = kv.length > 1 && kv[0] < kv[kv.length - 1] ? [...kv].reverse() : kv;
  let tapIndex = rangeIndex;
  if (tapIndex != null && voltagesKv !== kv) tapIndex = kv.length - 1 - tapIndex;
  if (tapIndex == null && voltagesKv.length) {
    tapIndex = 0;
    assumed.push("tap_winding");
  }

  const base = {
    mva,
    voltagesKv,
    tapIndex,
    plus: range?.plus ?? null,
    minus: range?.minus ?? null,
    stepPct: range?.stepPct ?? null,
    vectorGroup: vg?.group ?? null,
    windings,
    neutralBilKv: parseNeutralBil(text),
    assumed,
    warnings,
  };

  if (auto) {
    const hvKv = voltagesKv[0] ?? null;
    const mvKv = voltagesKv[1] ?? null;
    if (hvKv == null || mvKv == null) warnings.push("autotransformer needs HV and MV kV");
    // Range on the HV figure: the tap winding sits at the series/common
    // junction and carries the HV current (Colin 2026-10-27). Range on the
    // MV figure: regulating winding in the MV lead (HMR 230/121 kV).
    const tapPoint: TapPoint = tapIndex === 1 ? "auto_mv_line" : "auto_junction";
    assumed.push("tap_point");
    if (tapIndex != null && tapIndex > 1) warnings.push("range is on the tertiary of an autotransformer");
    return { ...base, kind: "auto", tapPoint, winding: "star", tapKv: null, hvKv, mvKv };
  }

  const tapKv = tapIndex != null ? voltagesKv[tapIndex] ?? null : null;
  const letter = tapIndex != null ? windings[tapIndex] : undefined;
  let winding: WindingConnection = "star";
  let tapPoint: TapPoint = "neutral";
  if (letter === "D") {
    winding = "delta";
    tapPoint = "line_end";
  } else if (letter === "Y") {
    // A star winding is tapped at the neutral unless the tender says line end.
    if (/line[\s-]?end|线端/i.test(text)) tapPoint = "line_end";
    else assumed.push("tap_point");
  } else {
    if (letter === "Z") warnings.push("zigzag tapped winding: confirm the tap point");
    assumed.push("winding", "tap_point");
  }
  return { ...base, kind: "two_winding", tapPoint, winding, tapKv, hvKv: null, mvKv: null };
}

/** "neutral BIL 325 kV", "Neutral: LI 550", "中性点 LI 325". */
function parseNeutralBil(text: string): number | null {
  const m = text.match(/(?:neutral|中性点)[^;.]{0,30}?(?:BIL|LI|LIWL)\s*[:=]?\s*(\d{2,4})/i);
  return m ? Number(m[1]) : null;
}
