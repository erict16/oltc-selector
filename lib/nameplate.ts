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
  /** The line calls this range off-circuit (DETC, OCTC, off-circuit). */
  offCircuit?: boolean;
  /** No kV figure or side word ties the range to a winding; kv is the OLTC's. */
  kvAssumed?: boolean;
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
  /** The line names only an off-circuit tap changer (DETC, 无载, sin carga …), no on-load one. */
  offCircuitOnly?: boolean;
  /** The line says dry-type / cast resin (干式, seco, kuru tip, khô, kering). */
  dryType?: boolean;
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
  | "second_range"
  | "largest_mva"
  | "mid_winding"
  | "quantity"
  | "earth_li"
  | "off_circuit_line";

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
  largest_mva: "several ratings: sized on the largest, {mva} MVA",
  mid_winding: "tap in the middle of the winding: sized as line end; take the insulation to earth from the OS",
  quantity: "3 × {mva} MVA read as three three-phase units of {mva} MVA: confirm it is not a single-phase bank",
  earth_li: "insulation to earth LI {li} kV is not used: set the Um to earth from it",
  off_circuit_line: "the line names only an off-circuit tap changer: sized as off-circuit (OCTC)",
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
      // 2026-11-13: a full-width slash ("110±8×1.25%／10.5 kV") hid the kV ratio
      // and the LV winding was sized. Full-width forms become ASCII; the
      // full-width comma, colon and semicolon stay separators.
      .replace(/[\uFF01-\uFF5E]/g, (c: string) =>
        "，：；".includes(c) ? c : String.fromCharCode(c.charCodeAt(0) - 0xfee0),
      )
      .replace(/\u3000/g, " ")
      // "110+8x1.25%-8x1.25%" is ±8×1.25 %; uneven counts become +a/−b.
      .replace(
        /\+\s*(\d{1,2})\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*%\s*[-−–]\s*(\d{1,2})\s*[x×*]\s*\2\s*%/g,
        (_m: string, a: string, st: string, b: string) => (a === b ? `±${a}x${st}%` : `+${a}/-${b}x${st}%`),
      )
      // 2026-11-07 tender test (US LTC): "±16x5/8%" read 8 % per step. A fraction
      // right before % is one figure.
      .replace(/(?<![\d./])([1-9])\s*\/\s*([2-9]|1[0-6])\s*%/g, (_m: string, a: string, b: string) =>
        `${Math.round((Number(a) / Number(b)) * 10000) / 10000}%`,
      )
      // 2026-11-04 R3: Rosseti "16 МВА", "11 кВ", "кВА" were refused (Latin units only).
      .replace(/(?<![А-Яа-яЁё])[мМ][вВ][аА](?![А-Яа-яЁё])/g, "MVA")
      .replace(/(?<![А-Яа-яЁё])[кК][вВ][аА](?![А-Яа-яЁё])/g, "kVA")
      .replace(/(?<![А-Яа-яЁё])[кК][вВ](?![А-Яа-яЁё])/g, "kV")
      // Russian vector group "Y/Д-11", "YН/Д-Д-11-11": Д is D, Н is N, У is Y.
      .replace(/(?<![\p{L}\d])[УYД]Н?(?:\s*\/\s*[УYД]Н?)+(?:\s*-\s*[ДУYН\d]{1,2})*(?!\p{L})/gu, (m: string) =>
        m.replace(/У/g, "Y").replace(/Д/g, "D").replace(/Н/g, "N"),
      )
      .replace(/[×✕✖*]/g, "x")
      // 2026-11-04 R2: a Cyrillic х ("±9х1,78%") or an upper-case X ("± 8 X 1.25 %")
      // between figures is the step sign; the step was dropped and the range detached.
      .replace(/(?<=\d\s*)[хХ](?=\s*\d)/g, "x")
      .replace(/(\d)\s*X\s*(?=\d)/g, "$1 x ")
      // 2026-11-04 R2: "63.000 kVA" (thousands dot) was read as 63 kVA, the current
      // 1000× low with no note. A leading 0 stays a decimal ("0.400 kVA").
      .replace(/\b[1-9]\d{0,2}(?:\.\d{3})+(?=\s*(?:\/\s*[1-9]\d{0,2}(?:\.\d{3})+\s*)*kVA)/gi, (m: string) =>
        m.replace(/\./g, ""),
      )
      // 2026-11-04: "31,500 kVA" / "2 500 kVA" is one number; read as 31.5 / 0.5 kVA
      // before, the current came out 1000× low. Not a ratio digit ("33/11 630 kVA").
      // 2026-11-04 r3 check: unit first with thousands ("Rated power, kVA: 31 500")
      // read 31 kVA. Join the groups after a kVA lead word as well.
      .replace(
        /(\b(?:rated|power|rating|capacity|S[rn])\b[^\d;]{0,20}kVA\s*\)?\s*[:=,]?\s*)(\d{1,3}(?:[,   '’]\d{3})+)(?!\d)/gi,
        (_m: string, lead: string, n: string) => lead + n.replace(/[,   '’]/g, ""),
      )
      // 2026-11-04 R3: "31'500 kVA" (Swiss apostrophe) and lists "25 000/31 500 kVA",
      // "20,000/25,000 kVA" read as 0.5 / 0.025 MVA, the current 80-99 % low with no note.
      .replace(
        /\b\d{1,3}(?:[, \u00A0\u202F'’]\d{3})+(?=\s*(?:\/\s*\d{1,3}(?:[, \u00A0\u202F'’]\d{3})+\s*)*kVA)/gi,
        (m: string, offset: number, s: string) => {
          // "33/11 630 kVA": 630 follows a ratio figure, it is not 11 630.
          // "Dyn11 1 600 kVA": a clock number is not a figure; join the 1 600.
          // "25 000/31 500 kVA": a thousands group before the / is a rating list.
          const before = s.slice(Math.max(0, offset - 12), offset);
          const list = /\d[, \u00A0\u202F'’]\d{3}\s*\/\s*$/.test(before);
          // 2026-11-04 R4: "ONAN / 31,500 kVA", "(ONAN)/10,000", "ONAN, 12 500" kept the
          // group (31.5 kVA), so the ONAN figure was sized. Only a digit before it is a ratio.
          if (!list && /\d[/.]?\s?$/.test(before) && !/[A-Za-z]\d{1,2}\s$/.test(before)) return m;
          return m.replace(/[, \u00A0\u202F'’]/g, "");
        },
      )
      // 2026-11-04 R3: "11,000±2x2.5%/415 V" became 11.000 kV beside 415, so the HV
      // delta was read on the 415 figure. A thousands group in a volts chain is one figure.
      .replace(
        /\b(\d{1,3})[, \u00A0\u202F](\d{3})(?![\d.,])(?=\s*(?:±\s*\d{1,2}(?:\s*x\s*[\d.,]+\s*%)?)?(?:\s*\/\s*\d[\d, \u00A0\u202F.]*?\s*(?:±\s*\d{1,2}(?:\s*x\s*[\d.,]+\s*%)?)?)*\s*V\b)/g,
        "$1$2",
      )
      // 2026-11-04: a comma after a vector-group clock is a separator, not a
      // decimal: "YNd11,66±…" was read as 11.66 kV.
      .replace(/(?<![DdYyNnaZz]\d{0,2})(\d),(\d)/g, "$1.$2")
      .replace(/，/g, ",")
      .replace(/％/g, "%")
      .replace(/[–—－−]/g, "-")
      // Split LV written "33-33 kV" is one figure (W02 275/33-33 kV).
      .replace(/(\d+(?:\.\d+)?)-\1(?=\s*(?:kV|\/))/gi, "$1")
      // 2026-11-04 R3: "132:33 kV" / "33-11 kV" kept only the LV (LV tapped, Um below the
      // HV class). A ratio ≥ 1.5 is HV/LV; "20-21 kV" stays a band; a clock or decimal is not joined.
      .replace(/(?<![\w.])(\d+(?:\.\d+)?)\s*[:\-]\s*(\d+(?:\.\d+)?)(?=\s*kV)/gi, (m: string, a: string, b: string) =>
        Number(a) / Number(b) >= 1.5 ? `${a}/${b}` : m,
      )
      // 2026-11-04 R2: "+- 9 steps of 1.78%" is ± too, not only "+-9 x".
      .replace(/\+\s*\/\s*-|\+\s*-(?=\s*\d+(?:\.\d+)?\s*(?:x|steps?\b|taps?\b|positions?\b|%))/g, "±")
      // 2026-11-04 R2: minus-first and per-side ranges ("-15% to +5%", "-12/+4 x 1.25%",
      // Turkish "+%5/-%15", "+2x2.5%/-4x2.5%") were not read; the ±8 default sized them.
      .replace(new RegExp(String.raw`([+\-±])\s*%\s*(${NUM})`, "g"), "$1$2%")
      // 2026-11-04 R3: TEİAŞ "154±10 x %1,25/34,5 kV" read the ratio as 34.5/1.25 kV.
      .replace(new RegExp(String.raw`x\s*%\s*(${NUM})`, "gi"), "x $1%")
      // 2026-11-04 R3: "+5%, -15%", "+5% and -15%", "plus 5% minus 15%" took the ±8 default.
      .replace(new RegExp(String.raw`\+\s*(${NUM})\s*%\s*(?:,|\band\b|&)\s*-\s*(${NUM})\s*%`, "gi"), "+$1%/-$2%")
      .replace(new RegExp(String.raw`\bplus\s*(${NUM})\s*%\s*,?\s*(?:and\s+)?minus\s*(${NUM})\s*%`, "gi"), "+$1%/-$2%")
      .replace(
        new RegExp(String.raw`(?<![\w.%/])-\s*(${NUM})\s*(%?)\s*(?:\/|\bto\b|\.\.\.|…)\s*\+\s*(${NUM})\s*(%?)`, "gi"),
        // "-5/+10%": a % on either side makes both percent.
        (m: string, minus: string, p1: string, plus: string, p2: string, offset: number, s: string) => {
          const pct = p1 || p2;
          if (!pct && !/^\s*x\s*\d/i.test(s.slice(offset + m.length, offset + m.length + 12))) return m;
          return `+${plus}${pct}/-${minus}${pct}`;
        },
      )
      .replace(new RegExp(String.raw`\+\s*(${NUM})\s*%\s*to\s*-`, "gi"), "+$1%/-")
      .replace(
        new RegExp(String.raw`\+\s*(\d{1,2})\s*x\s*(${NUM})\s*%\s*\/\s*-\s*(\d{1,2})\s*x\s*\2\s*%`, "g"),
        "+$1/-$3 x $2%",
      )
      // 2026-11-04 R3: a zero side has no sign ("0 to -20%", "-20%/0%", "+16x1.25% / -0") and
      // the minus side may come first ("-12 x 1.25% / +4 x 1.25%"); all took the ±8 default.
      .replace(
        new RegExp(String.raw`(?<![\d.+\-±])0(?![\d.])\s*%?\s*(?:\bto\b|\/)\s*-\s*(${NUM})\s*%`, "gi"),
        "+0%/-$1%",
      )
      .replace(new RegExp(String.raw`(?<![\w.%/])-\s*(${NUM})\s*%\s*(?:\bto\b|\/)\s*\+?\s*0(?![\d.])\s*%?`, "gi"), "+0%/-$1%")
      .replace(
        new RegExp(String.raw`(?<![\w.%/])-\s*(\d{1,2})\s*x\s*(${NUM})\s*%\s*\/\s*\+\s*(\d{1,2})\s*x\s*\2\s*%`, "g"),
        "+$3/-$1 x $2%",
      )
      .replace(
        new RegExp(String.raw`\+\s*(\d{1,2})\s*x\s*(${NUM})\s*%\s*\/\s*-\s*0(?![\d.])(?:\s*x\s*\2\s*%)?`, "g"),
        "+$1/-0 x $2%",
      )
      .replace(
        new RegExp(String.raw`\+\s*0(?![\d.])(?:\s*x\s*${NUM}\s*%)?\s*\/\s*-\s*(\d{1,2})\s*x\s*(${NUM})\s*%`, "g"),
        "+0/-$1 x $2%",
      )
      // 2026-11-04 R2: "(110±8x1.25%)/11 kV" was refused and "115 (+8/-8 x 1.25%) / 13.8 kV"
      // put the range on the LV (Um 17.5 for a 115 kV neutral). The brackets go.
      .replace(/\(\s*([±+][^()]{1,30}%)\s*\)/g, " $1 ")
      .replace(/\(\s*(\d+(?:\.\d+)?\s*±[^()]*%)\s*\)/g, "$1")
      // 2026-11-04 R2: "400/√3" was a 400/3 kV ratio (a 3 kV winding, refused at 64 kA).
      .replace(/\s*\/\s*(?:√|sqrt\s*|v)\s*3\b/gi, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** "YNa0d11" → ["Y","a","D"]; "Dyn11" → ["D","Y"]. Null when no group. */
export function parseVectorGroup(raw: string): { group: string; windings: WindingLetter[] } | null {
  // 2026-11-04 R2: GB "D,yn11" / "YN,yn0,d11", spaced "D yn11", "Ynd11" and all-caps
  // "DYN11" / "YNYN0D11" gave no group, so an HV delta was sized as a star neutral.
  // 2026-11-04 R3: "DYn11", "DYn 11", "D-yn11", "Δ/Y", "△/Y-11" gave no group either; a
  // 132 kV HV delta was sized as a star neutral at Um 72.5.
  // 2026-11-07 tender test: PGCIL writes "YNaOd11" / "YNyno" (letter O for 0), and
  // Vietnamese sheets "Δ/Yo-11" (Yo = star with neutral). The auto was read as a
  // two-winding star neutral; the HV delta as a star.
  const text = raw
    .replace(/\b(?:YN|Yn|Y|D|ZN|Z)(?:(?:yn|y|d|zn|z|a)[0-9Oo]{0,2}){1,3}(?![A-Za-z0-9])/g, (g: string) =>
      g.replace(/(?<=(?:yn|y|d|zn|z|a)\d?)[Oo]/g, "0"),
    )
    .replace(/(?<![A-Za-z])Y[oO0](?![A-Za-z0-9])/g, "YN")
    .replace(/[Δ△]/g, "D")
    .replace(/\b(YN|Yn|Y|D|ZN|Z)\s*-\s*(?=(?:yn|y|d|zn|z|YN|Yn|Y|D)\s*\d)/g, "$1")
    .replace(/\b(YN|Y|D|ZN|Z)\s*\/\s*(YN|Y|D|ZN|Z)(?:\s*-\s*(\d{1,2}))?\b/g, (m: string, h: string, l: string, c?: string) =>
      h + l.toLowerCase() + (c ?? ""),
    )
    .replace(/\bYn(?=(?:yn|y|d|zn|z|a)\d)/g, "YN")
    .replace(/\b(YN|Y|D|ZN|Z)[,\s/]+(?=(?:yn|y|d|zn|z|a)\d)/g, "$1")
    .replace(/((?:YN|Y|D|ZN|Z)(?:(?:yn|y|d|zn|z|a)\d{1,2})+)[,/]\s*(?=(?:yn|y|d|zn|z|a)\d)/g, "$1")
    .replace(/\b(YN|D|Y|ZN|Z)((?:YN|Yn|Y|D|ZN|Zn|Z|A)\s?\d{1,2})+\b/g, (m: string, h: string) => h + m.slice(h.length).toLowerCase());
  // HV letter upper case, the rest lower case with optional clock numbers.
  const all = [...text.matchAll(/(?:^|[^A-Za-z])((?:YN|Y|D|ZN|Z)(?:(?:yn|y|d|zn|z|a|auto)\d{0,2}){1,3})(?![A-Za-z])/g)];
  // 2026-11-04 R2: Indonesian "Daya" (power) is D+a+y+a and made the line an
  // autotransformer. A group carries a clock number or an n; else no auto letter.
  const m = all.find((x) => /\d|n/i.test(x[1]!.slice(1))) ?? all.find((x) => !/a/.test(x[1]!.slice(1)));
  if (!m) {
    // 2026-11-04 R3: IEC single-phase groups. "Ia0i0" is an auto (it was read two-winding,
    // Um 72.5); "Ii0" a single-phase two-winding unit. The I letters state no star or delta.
    const one = text.match(/(?<![A-Za-z])I([ai])(\d{1,2})(?:i\d{1,2})?(?![A-Za-z\d])/);
    if (!one) return null;
    return { group: one[0], windings: one[1] === "a" ? ["a"] : [] };
  }
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

/** "three-phase" stated: "3 x 40 MVA" is then a quantity, not a bank of single-phase units. */
const THREE_PHASE = /\bthree[\s-]?phase|\b3[\s-]?ph(?:ase)?\b(?!\s*\d+\s*V\b)|三相/i;

/** Chinese model: SFZ11-25000/110, OSFPSZ-250000/220, ODFPSZ-250000/500 (kVA / HV kV). */
const CN_MODEL = /\b(O?[SD][A-Z]*Z[A-Z0-9]*)-(\d{3,7})\/(\d{2,3})\b/;

type MvaRead = {
  mva: number | null;
  /** Separate ratings that differ (ONAN 40 / ONAF 63): the largest was taken. */
  differ: boolean;
  /** "3 x N MVA": N is one single-phase unit. */
  unit: boolean;
  /** "250 MVA bank": the figure is the bank total. */
  bank: boolean;
  /** A three-decimal "31.500 kVA" was read as 31500 kVA: a guess, flagged. */
  misread?: boolean;
};

/** Rosseti model: ТДН-16000/110, ТРДН-40000/110, ТМН-6300/35 (kVA / HV kV). */
const RU_MODEL = /(?<![А-Яа-яЁёA-Za-z])(А?[ОТ][А-ЯЁ]*)-(\d{3,6})\/(\d{2,3})(?!\d)/u;

/** "3 x N MVA" with nothing else saying single-phase: three three-phase units, or one of a bank. */
const THREE_X = new RegExp(String.raw`\b3\s*x\s*(${NUM})\s*MVA`, "i");

function parseMva(text: string, threeUnit = true): MvaRead {
  const none = { differ: false, unit: false, bank: false };
  // 2026-11-04 R4: a kVA figure with three decimals ("33/11 31,500 kVA", or beside "25000 kVA")
  // is a thousands group the joins above kept as a decimal: 31.5 kVA, the current 1000× low.
  // Read it whole, and flag the MVA as a guess. A leading 0 stays a decimal ("0.400 kVA").
  const grouped = /(?<![\d.])[1-9]\d{0,2}\.\d{3}(?![\d.])(?=\s*kVA)/gi;
  let misread = false;
  if (grouped.test(text)) {
    text = text.replace(grouped, (m: string) => m.replace(".", ""));
    misread = true;
  }
  // 2026-11-04 R2: "3x83.3 MVA" is one single-phase unit; it was sized as 83.3 MVA three-phase.
  // 2026-11-04 R3: only when parseTenderLine finds a single-phase sign (threeUnit).
  const unit = text.match(THREE_X);
  if (threeUnit && unit && !THREE_PHASE.test(text)) return { ...none, mva: Number(unit[1]), unit: true };
  // 2026-11-04 R2: only the first rating was read: "40 MVA ONAN / 63 MVA ONAF" sized on
  // 40 (current 36 % low) and "Fault level 5000 MVA" taken as the rating. Every rating is
  // read; fault, network and base figures are not ratings; the largest is sized.
  // "system voltage 150 kV 60 MVA": a figure between keeps the rating.
  const notRating = (i: number) => {
    const head = text.slice(Math.max(0, i - 30), i);
    if (/(?:fault|short[\s-]?circuit|\bs?s\.?c\b)[^;,]{0,30}$/i.test(head)) return true;
    // 2026-11-04 R3: "earthing transformer 0.5 MVA", "tertiary 21 MVA", "auxiliary 100 kVA",
    // "losses at 63 MVA", "feeder capacity 60 MVA" were sized as the rating.
    if (/(?:tertiary|stabili\w*|earthing|auxiliary|\baux\b\.?|station\s+service|feeder|losses?\s+at|\bbase)[^;,]{0,25}$/i.test(head)) {
      return true;
    }
    // "Grid transformer 90 MVA" names the transformer, not the network.
    const g = head.match(/(?:network|system|grid)([^;,\d]{0,30})$/i);
    return g != null && !/transformer|trafo|\bunit\b/i.test(g[1]);
  };
  const read = (unitRe: string, scale: number) =>
    [...text.matchAll(new RegExp(String.raw`(${NUM})(?:\s*/\s*${NUM})*\s*${unitRe}`, "gi"))]
      .filter((m) => !notRating(m.index ?? 0))
      .map((m) => (m[0].match(/\d+(?:\.\d+)?/g) ?? []).map((x) => Number(x) / scale))
      .filter((g) => g.length && g.every((n) => Number.isFinite(n) && n > 0));
  // 2026-11-04 R3: unit first ("Rated power (MVA): 40", "Power rating MVA 63") was not read,
  // so a tertiary or earthing MVA became the rating. Only after a rating word, never a bare
  // "MVA 132" (that is the ratio in "40 MVA 132/33 kV").
  const first = [
    ...text.matchAll(
      new RegExp(
        String.raw`\b(?:rated(?:\s+(?:power|rating|capacity))?|power(?:\s+rating)?|rating|capacity|S[rn])\s*(?:\(\s*([Mk])VA\s*\)|,?\s*([Mk])VA)\s*[:=,]?\s*(${NUM}(?:\s*/\s*${NUM})*)(?![\d.])(?!\s*(?:kV|[±+/]\s*\d|±))`,
        "gi",
      ),
    ),
  ]
    .map((m) => m[3]!.split("/").map((x) => Number(x) / (/k/i.test(m[1] ?? m[2] ?? "") ? 1000 : 1)))
    .filter((g) => g.every((n) => Number.isFinite(n) && n > 0));
  let all = [...first, ...read(String.raw`MVA(?![a-z])(?!\s*base)`, 1)];
  if (!all.length) all = read(String.raw`kVA(?![a-z])`, 1000);
  if (all.length) {
    // 2026-11-04 R3: a stage list ("40/50 MVA", "25 000/31 500 kVA") is sized on the
    // top stage; the largest_mva note says so, as for separate ratings.
    const figs = all.flat();
    return {
      mva: Math.max(...figs),
      differ: new Set(figs).size > 1,
      unit: false,
      bank: new RegExp(String.raw`${NUM}\s*[Mk]VA\s*\(?\s*bank\b`, "i").test(text),
      ...(misread ? { misread } : {}),
    };
  }
  const cn = text.match(CN_MODEL) ?? text.match(RU_MODEL);
  if (cn) return { ...none, mva: Number(cn[2]) / 1000 };
  return { ...none, mva: null };
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
  /** Symmetric ±N taken from a position or step count (no ± written). */
  guessed?: boolean;
};

const POSITIONS = /(?<![±\d.]\s?)(\d{1,2})\s*(?:positions|pos\b|taps|tappings|kademe|posisi)/i;

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
 * smallest whole split with ≥ 16 steps, as the maker sold (B05 +0/-30 % →
 * 16 × 1.875 %), marked assumed. The lowest-tap current depends only on the
 * minus percent, so it is exact either way.
 */
function percentRange(text: string, pmCount: number | null): RangeHit | null {
  // 2026-11-04 R2: the first ±% won even when it was "50 Hz ±5%", "voltage variation
  // ±10%", "ukr 12 % ±10 %" or "%Z 10 ±10%", and "Uk 10.5 %, tapping +5%/-15%" lost the
  // range to the Uk filter. A tap word before a hit wins; other figures' tolerances go.
  const tapWord = (i: number) =>
    /(?:tapp\w*|OLTC|regulat\w*|range|tap[\s-]?changer|on[\s-]?load)\W{0,4}(?:range\W{0,3})?$/i.test(
      text.slice(Math.max(0, i - 20), i),
    );
  const otherFigure = (i: number) =>
    nearTolerance(text, i) ||
    /(?:Hz|frequency|variation|\bu[kz]r?\b|%\s*Z\b|\bZ\b|impedance|toler)[^,;]{0,15}$/i.test(text.slice(Math.max(0, i - 15), i));
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
    .map((h) => ({ ...h, tap: tapWord(h.m.index ?? 0) }))
    .filter((h) => h.tap || !otherFigure(h.m.index ?? 0))
    .filter((h) => h.plusPct + h.minusPct > 0 && h.plusPct <= 50 && h.minusPct <= 50)
    .sort((x, y) => Number(y.tap) - Number(x.tap) || (x.m.index ?? 0) - (y.m.index ?? 0));
  for (let i = 0; i < hits.length; i++) {
    const r = percentHit(text, hits[i]!, pmCount);
    // A ±5 % that gives no step count never hides a later range.
    if (r?.unread && i < hits.length - 1) continue;
    if (r) return r;
  }
  return null;
}

function percentHit(
  text: string,
  h: { m: RegExpMatchArray; plusPct: number; minusPct: number },
  pmCount: number | null,
): RangeHit | null {
  const { plusPct, minusPct } = h;
  const index = h.m.index ?? 0;
  const end = index + h.m[0].length;
  const pctText = h.m[0].trim();
  const span = plusPct + minusPct;

  // Step size stated anywhere: "(20 x 1.25%)", "21 positions x 1.25%", "(2.5% steps)".
  const nx = text.match(new RegExp(String.raw`(?<![±+\-\d.])(\d{1,2})\s*x\s*(${NUM})\s*%`));
  const xs = text.match(new RegExp(String.raw`x\s*(${NUM})\s*%`));
  const stepWord = statedStep(text);
  // Turkish "17 kademe", Indonesian "17 posisi" are position counts too (2026-11-04 R2).
  const posM = text.match(POSITIONS);
  // 2026-11-04 R3: "0/-20% linear in 16 steps" lost the count to the "linear" word.
  const countM = text
    .slice(end, end + 40)
    .match(/^\s*[,(]?\s*(?:(?:linear|coarse\W*fine|reversing)\s+)?(?:in\s*)?(\d{1,2})\s*(?:steps|级|档)/i);
  const positions = posM ? Number(posM[1]) : null;

  let step: number | null = null;
  let total: number | undefined;
  if (nx) {
    step = Number(nx[2]);
    total = Number(nx[1]);
  } else if (xs) step = Number(xs[1]);
  else if (stepWord != null) step = stepWord;
  else if (
    pmCount &&
    pmCount >= 2 &&
    h.plusPct === h.minusPct &&
    minusPct <= 3 &&
    COMMON_STEPS.some((c) => Math.abs(minusPct - c) <= c * 0.01)
  ) {
    // 2026-11-07 tender test (KETRACO): "± 1.25% in ± 12 steps" is 12 steps of
    // 1.25 %, not ±1.25 % in all (0.104 % per step, Ust 132 V for 1588 V).
    return { plus: pmCount, minus: pmCount, stepPct: minusPct, index, end, pct: { text: pctText, stated: true } };
  } else if (pmCount) step = (h.plusPct === h.minusPct ? minusPct : span / 2) / pmCount;
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

/**
 * Step size the line states apart from the count: "2.5% steps", "1.25% per step",
 * "1.25%/step", "steps of 2.5%", "step voltage 2.5%", "Ust 1181.8 V = 1.78%", "Ust 1089 V (1.65%)".
 * 2026-11-04 R3: these were dropped and the 1.25 % default sized the switch.
 */
function statedStep(text: string): number | null {
  const res = [
    String.raw`(${NUM})\s*%\s*(?:per\s*step|\/\s*step|each\s+step|steps?)\b`,
    String.raw`\bsteps?\s+of\s+(${NUM})\s*%`,
    String.raw`\bstep(?:\s+voltage)?\s*[:=]?\s*(${NUM})\s*%`,
    String.raw`\bU\s?st\b[^;%]{0,25}?(?:=|\()\s*(${NUM})\s*%`,
  ];
  for (const re of res) {
    const m = text.match(new RegExp(re, "i"));
    const s = m ? Number(m[1]) : NaN;
    if (s > 0 && s <= 10) return s;
  }
  return null;
}

/**
 * 2026-11-04 R3: "OLTC 19 positions (1.78% per step)", "16 steps", "tap positions: 21",
 * "OLTC 1-21" with no ± were read as the ±8 default. A count gives a symmetric ±N
 * (assumed symmetric), with the stated step when there is one.
 */
function countRange(text: string): RangeHit | null {
  const pos =
    text.match(/(?<![±+\-\d.]\s?)\b(\d{1,2})\s*(?:positions|tap\s+positions|pos\b|kademe|posisi)/i) ??
    text.match(/\bpositions?\s*(?:of\s+)?[:=]?\s*(\d{1,2})\b(?!\s*%)/i) ??
    text.match(/\b(?:OLTC|tap\w*|positions?)\s*:?\s*1\s*(?:-|~|…|to)\s*(\d{1,2})\b(?![\d.]*\s*(?:%|kV))/i);
  const steps = text.match(/(?<![±+\-\d.x]\s?)\b(\d{1,2})\s*steps\b/i);
  let n: number | null = null;
  let m: RegExpMatchArray | null = null;
  if (pos && Number(pos[1]) >= 3 && (Number(pos[1]) - 1) % 2 === 0) {
    n = (Number(pos[1]) - 1) / 2;
    m = pos;
  } else if (steps && Number(steps[1]) >= 2 && Number(steps[1]) % 2 === 0) {
    n = Number(steps[1]) / 2;
    m = steps;
  }
  if (n == null || m == null) return null;
  const index = m.index ?? 0;
  return { plus: n, minus: n, stepPct: statedStep(text), index, end: index + m[0].length, guessed: true };
}

/** Usual step sizes: "±2 (2.5 %)" may be a total of 2 × 1.25 %, not a 2.5 % step. */
const COMMON_STEPS = [0.625, 0.833, 1, 1.25, 1.5, 1.67, 1.78, 2, 2.5, 3];

/** Step written after the count: "±9 steps of 1.78 %", "±9 (1.78 % per step)", "±9 taps @ 1.78%". */
const STEP_AFTER = new RegExp(
  String.raw`^\s*(?:(?:steps?|taps?|positions?)\s*)?(of|x|@)?\s*(\()?\s*(${NUM})\s*%\s*(per\s*step|each|steps?\b)?`,
  "i",
);

/** Every ±N / +a−b step range in the line, in order (a ±N × s % or a count). */
function stepHits(text: string): RangeHit[] {
  // A step count is never followed by % (±10 % is a percent range).
  const sym = new RegExp(String.raw`±\s*(\d{1,2})(?![\d.]*\s*%)\s*(?:x\s*(${NUM})\s*%)?`, "g");
  const asym = new RegExp(
    String.raw`\+\s*(\d{1,2})(?![\d.]*\s*%)\s*/?\s*-\s*(\d{1,2})(?![\d.]*\s*%)\s*(?:x\s*(${NUM})\s*%)?`,
    "g",
  );
  return [
    ...[...text.matchAll(sym)].map((m) => ({ m, plus: Number(m[1]), minus: Number(m[1]), step: m[2] })),
    ...[...text.matchAll(asym)].map((m) => ({ m, plus: Number(m[1]), minus: Number(m[2]), step: m[3] })),
  ]
    .map((h): RangeHit => {
      const index = h.m.index ?? 0;
      let end = index + h.m[0].length;
      let stepPct = h.step ? Number(h.step) : null;
      // 2026-11-04 R2: the step after the count was dropped (1.25 % default, Ust 30 % low).
      // A figure in brackets alone is taken only when it cannot be the total ("±8 (10 %)").
      const a = stepPct == null ? text.slice(end, end + 30).match(STEP_AFTER) : null;
      if (a) {
        const s = Number(a[3]);
        const n = Math.max(h.plus, h.minus);
        const total = n >= 2 && COMMON_STEPS.some((c) => Math.abs(s / n - c) <= c * 0.01);
        if (s > 0 && s <= 10 && (a[1] != null || a[4] != null || (s <= 5 && !total))) {
          stepPct = s;
          end += a[0].length;
        }
      }
      return { plus: h.plus, minus: h.minus, stepPct, index, end };
    })
    // A stated step (±10x2.5 %) is a tap range even beside "Uz 8 %".
    .filter((h) => h.stepPct != null || !nearTolerance(text, h.index))
    .sort((x, y) => x.index - y.index);
}

/** ±8x1.25%, ±8 x 1.25 %, +4-2x2.5%, +4/-2 x 2.5%; percent forms via percentRange. */
function findRange(text: string): RangeHit | null {
  const steps = stepHits(text);
  const s = steps.find((h) => h.plus + h.minus > 0);
  // A fully stated ±N × s % wins.
  if (s && s.stepPct != null) return s;
  // "±10 % ±8 positions": the bare ±N is the step count of the percent range.
  const p = percentRange(text, s && s.plus === s.minus ? s.plus : null);
  if (p) return p;
  // 2026-11-04 R3: "±9 steps (Ust 1181.8 V = 1.78%)": a step stated apart from the count.
  if (s) return { ...s, stepPct: statedStep(text) };
  if (!steps.length) return countRange(text);
  // ±0 x 1.25 %: no range, but keep its place for the voltages.
  const z = steps[0];
  return z ? { ...z, stepPct: z.stepPct, zero: true } : null;
}

type Duty = "oltc" | "octc";
const OLTC_WORD = /\bOLTC|on[\s-]?load|有载/gi;
const OCTC_WORD = /\bDETC|\bOCTC|\bNLTC|off[\s-]?circuit|de-?energi[sz]ed|无载|无励磁/gi;

/**
 * 2026-11-07 field test: "1000 kVA 10±2x2.5%/0.4 kV Dyn11, off-circuit tap changer
 * (DETC)" and "conmutador sin carga" were sized as a CV2 on-load switch. A line that
 * names an off-circuit tap changer and no on-load one is off-circuit duty. Loss words
 * ("no-load losses", "pérdidas sin carga", "tổn hao không tải") need a tap word.
 */
const ON_LOAD_ANY = /\bOLTC\b|\bon[\s-]?load\b|有载|bajo\s+carga|\bcó\s+tải|\bberbeban\b|yük\s+altında/i;
const DRY_TYPE =
  /\bdry[\s-]?type\b|\bcast[\s-]?resin\b|\bresin[\s-]?(?:cast|encapsulated|insulated)\b|干式|\btransformador(?:es)?\s+(?:tipo\s+)?seco|\bkuru\s+tip|\bmáy\s+biến\s+(?:áp|thế)\s+khô|\btrafo\s+kering|\btransformator\s+kering/i;

const OFF_CIRCUIT_TAP = new RegExp(
  [
    String.raw`\b(?:DETC|OCTC|NLTC)\b`,
    String.raw`\b(?:off[\s-]?(?:circuit|load)|no[\s-]?load|de-?energi[sz]ed)\s+tap`,
    String.raw`\btap[\s-]?chang\w*\s*[(:,-]?\s*(?:off[\s-]?(?:circuit|load)|no[\s-]?load|de-?energi[sz]ed)`,
    String.raw`(?:conmutador|cambiador)[^,;.]{0,30}(?:sin\s+carga|desenergizad)`,
    String.raw`(?:chuyển|đổi)\s+nấc[^,;.]{0,20}không\s+tải`,
    String.raw`(?:pengubah|perubah)\s+tap[^,;.]{0,20}tanpa\s+beban`,
    String.raw`yüksüz\s+kademe`,
    "无载",
    "无励磁",
  ].join("|"),
  "i",
);

/**
 * OLTC or off-circuit word nearest to the range in its own clause (2026-11-04 R2:
 * "HV ±2x2.5% (off-circuit), LV ±8x1.25% (on-load)" sized the OLTC on the ±2).
 * The clause stops at , ; ) and at the neighbouring ranges.
 */
function dutyTag(text: string, hits: RangeHit[], i: number): Duty | null {
  const h = hits[i]!;
  const prevEnd = i > 0 ? hits[i - 1]!.end : 0;
  const nextStart = i + 1 < hits.length ? hits[i + 1]!.index : text.length;
  const head = text.slice(prevEnd, h.index);
  const cut = Math.max(head.lastIndexOf(","), head.lastIndexOf(";"), head.lastIndexOf(")"), head.lastIndexOf("("));
  const before = head.slice(cut + 1);
  const tailAll = text.slice(h.end, nextStart);
  const stop = tailAll.search(/[,;)]/);
  const after = stop < 0 ? tailAll : tailAll.slice(0, stop + 1);
  let best: { d: Duty; dist: number } | null = null;
  for (const [re, d] of [[OLTC_WORD, "oltc"], [OCTC_WORD, "octc"]] as const) {
    for (const m of before.matchAll(re)) {
      const dist = before.length - ((m.index ?? 0) + m[0].length);
      if (!best || dist < best.dist) best = { d, dist };
    }
    const m = after.match(new RegExp(re.source, "i"));
    if (m && (!best || (m.index ?? 0) < best.dist)) best = { d, dist: m.index ?? 0 };
  }
  return best?.d ?? null;
}

const SIDE = String.raw`(LV|MV|HV|low[\s-]voltage|high[\s-]voltage|secondary)`;

/** Index (HV first) of the winding a side word names; null when it names none of these. */
function sideIndex(side: string, n: number, auto: boolean): number | null {
  const s = side.toLowerCase();
  if (/^(?:lv|low|secondary)/.test(s)) return n - 1;
  if (/^mv/.test(s)) return n === 3 || auto ? 1 : null;
  if (/^(?:hv|high)/.test(s)) return 0;
  return null;
}

/** "±8x1.25% on HV" / "(LV tapping)" / "on 66 kV side" right after the range. */
function sideAfter(text: string, end: number): { side?: string; kv?: number } | null {
  const tail = text.slice(end, end + 30);
  const m = tail.match(new RegExp(String.raw`^\s*\(?\s*(?:(?:on|in|at)\s+(?:the\s+)?${SIDE}\b|${SIDE}\s+tapping)`, "i"));
  if (m) return { side: m[1] ?? m[2] };
  // 2026-11-04 R3: "±10x1.25% on 66 kV" (no "side") went on the HV.
  const k = tail.match(new RegExp(String.raw`^\s*\(?\s*on\s+(?:the\s+)?(${NUM})\s*kV(?![A-Za-z])(?:\s+(?:side|winding))?`, "i"));
  return k ? { kv: Number(k[1]) } : null;
}

/**
 * 2026-11-04 R3: a side word just before the range: "LV ±10x1.25%", "LV tapping ±…",
 * "MV tapping ±…", "LV side regulation ±…", "DETC on LV ±2x2.5%". The clause stops at , ;
 */
function sideBefore(text: string, index: number): { side: string } | null {
  const head = text.slice(Math.max(0, index - 40), index);
  const m = head.match(
    // "HV/LV ±8" names both sides; the trailing LV is not the tapped one.
    // 2026-11-04 R4: "MV OCTC ±2x2.5%", "MV DETC ±…", "MV off-circuit taps ±…": up to two
    // duty or tap words between the side and the range (the range went on the HV, 65 % low).
    new RegExp(
      String.raw`(?<!\/\s*)\b${SIDE}\s*(?:side\s*)?(?:(?:OLTC|OCTC|DETC|NLTC|off[\s-]?(?:circuit|load)|on[\s-]?load|tap[\s-]?changer|taps?|tapp\w*|regulat\w*|winding)\s*){0,2}[:\-]?\s*$`,
      "i",
    ),
  );
  return m ? { side: m[1]! } : null;
}

/**
 * 2026-11-04 R2: "OLTC on LV side", "tappings on LV winding", "OLTC in MV line lead",
 * "regulation on 66 kV side" were ignored and the HV taken (current 83-90 % low).
 * Index into the HV-first voltages, or null when the words name no winding.
 */
function tapWindingFromWords(text: string, range: RangeHit | null, kv: number[], auto: boolean): number | null {
  if (kv.length < 2) return null;
  const at = (w: { side?: string; kv?: number } | null): number | null => {
    if (!w) return null;
    if (w.kv != null) return kv.indexOf(w.kv) >= 0 ? kv.indexOf(w.kv) : null;
    return w.side ? sideIndex(w.side, kv.length, auto) : null;
  };
  const own = range ? at(sideAfter(text, range.end)) ?? at(sideBefore(text, range.index)) : null;
  if (own != null) return own;
  // 2026-11-04 R3: "on-load tap changer on LV side", "tap changer on the LV winding",
  // "tapped winding: LV", "tappings on 33 kV winding", "OLTC 33 kV ±…" and GB 低压侧调压
  // were ignored and the HV taken (current 56-83 % low). A kV must be one of the ratio's.
  const lead = String.raw`(?:OLTC|tapp\w*|regulat\w*|tap[\s-]?changer|on[\s-]?load)[^;.,]{0,25}?`;
  const m = text.match(
    new RegExp(
      String.raw`${lead}\b(?:on|in|at)\s+(?:the\s+)?${SIDE}\b|\((LV|MV) tapping\)|${lead}\b(?:on|in|at)\s+(?:the\s+)?(${NUM})\s*kV(?![A-Za-z])|\btapped\s+winding\s*[:=]?\s*${SIDE}\b|\b(?:OLTC|regulat\w*)\s+(${NUM})\s*kV\s*(?=±|\+)`,
      "i",
    ),
  );
  if (m) {
    const k = m[3] ?? m[5];
    return at(k != null ? { kv: Number(k) } : { side: m[1] ?? m[2] ?? m[4] });
  }
  // 2026-11-07 tender test: PGCIL "for 132 kV variation On the 132 kV line end", "IV line
  // end", Bluebonnet "at the low voltage transformer terminals" were not read; the auto's
  // junction (HV current, 40 % low) and the HV were taken. Not an insulation figure.
  const site = text.match(
    new RegExp(
      String.raw`\b(?:on|at|in)\s+(?:the\s+)?(${NUM})\s*kV\s+(?:line[\s-]?end|side|terminals?)\b(?!\s*(?:LI|BIL|AC|insulation|[:=]?\s*\d))` +
        String.raw`|\bfor\s+(${NUM})\s*kV\s+(?:voltage\s+)?variation` +
        String.raw`|\b(IV|intermediate[\s-]voltage)\s+(?:line[\s-]?end|side|terminals?)\b` +
        String.raw`|\b(?:at|on)\s+(?:the\s+)?(LV|low[\s-]voltage)\s+(?:transformer\s+)?terminals?\b`,
      "i",
    ),
  );
  if (site) {
    const k = site[1] ?? site[2];
    if (k != null) return at({ kv: Number(k) });
    return at({ side: site[3] ? "MV" : "LV" });
  }
  const cn = text.match(/([低中高])压侧(?:有载)?(?:调压|分接)|(?:调压|分接)[^,;，；]{0,6}?([低中高])压侧/);
  if (!cn) return null;
  const w = cn[1] ?? cn[2];
  return w === "低" ? kv.length - 1 : w === "高" ? 0 : kv.length === 3 || auto ? 1 : null;
}

type ExtraRange = { at: number; plus: number; minus: number; stepPct: number | null; offCircuit?: boolean };

/** 2026-11-04 R3: "115±9x1.78% (OLTC)/38.5±2x2.5% (DETC)/11 kV" was refused at the tag. */
const DUTY_TAG = String.raw`(?:\s*\(\s*(OLTC|OCTC|DETC|NLTC|on[\s-]?load|off[\s-]?circuit)\s*\))?`;

const RANGE_AT_START = new RegExp(
  String.raw`^\s*(?:±\s*(\d{1,2})|\+\s*(\d{1,2})\s*/?\s*-\s*(\d{1,2}))(?![\d.]*\s*%)\s*(?:x\s*(${NUM})\s*%)?`,
);

/** Insulation, test and system figures before a kV value: not a winding voltage (shared by both filters). */
const NOT_WINDING =
  /\b(?:BIL|LIWL|LI|SIL|AC|Um|insulation|withstand|impulse|lightning|switching|power[\s-]?frequency|test|applied|induced|highest|max(?:imum)?\.?(?:\s+system)?|equipment)\b[^\d]{0,20}$/i;

/**
 * 2026-11-04 R4: the label written after the figure ("650 kV BIL", "(145 kV Um)", "650 kV
 * impulse", "132 kV / 650 kV LI") made 650 the HV. No bare AC ("132 kV AC" is the system),
 * and a label followed by its own figure ("132 kV Um 145 kV") names that figure, not this one.
 */
const AFTER_LABEL =
  /^\s*(?:kV\s*)?(?:BIL|LIWL|LI|SIL|Um|impulse|lightning|power[\s-]?frequency|withstand|test)\b(?![^,;\d]{0,30}\d)/i;

/** IEC rated voltage → highest voltage for equipment: "132/145 kV" is Un/Um, not HV/LV. */
const UN_UM: Record<number, number> = { 11: 12, 33: 36, 66: 72.5, 110: 123, 132: 145, 150: 170, 220: 245, 230: 245 };

/** Up to 30 chars before `at`, cut at the last , ; or a ")" that ends a bracket before a word. */
function clauseBefore(text: string, at: number): string {
  return text.slice(Math.max(0, at - 30), at).split(/[,;]|\)(?=\s*[A-Za-z])/).pop() ?? "";
}

/**
 * 2026-11-04 R4: "insulation levels HV 650/275 kV, LV 170/70 kV; voltage 132/33 kV" sized
 * the 170/70 pair. A figure is in an insulation list when its clause, and every clause back
 * to one that starts with an insulation word, starts with a winding label.
 */
function inInsulationList(text: string, at: number): boolean {
  const clauses = text.slice(0, at).split(/[,;]/);
  for (let i = clauses.length - 1; i >= 0; i--) {
    const c = clauses[i]!;
    // "HV/LV 132/33 kV" is the ratio, whatever came before it.
    if (i === clauses.length - 1 && /^\s*(?:HV|MV|LV)\s*\/\s*(?:MV|LV)\b/i.test(c)) return false;
    if (/^\s*(?:insulation|LI\b|LIWL|BIL|AC\b|test|withstand|impulse|lightning)/i.test(c)) return true;
    if (!/^\s*(?:HV|MV|LV|HVN|N|neutral|tertiary|line[\s-]?end)\b/i.test(c)) return false;
  }
  return false;
}

/**
 * Voltage ratio that carries the range: "225±8x1.25%/115/35kV".
 * Falls back to the longest a/b(/c) kV chain when the range stands alone,
 * then (two-winding) to lone "N kV" figures.
 */
function findVoltages(
  text: string,
  range: RangeHit | null,
  lone: boolean,
): { kv: number[]; tapIndex: number | null; extra: ExtraRange[]; reordered?: boolean } {
  if (range) {
    // Walk left from the range to the number it is attached to, and right
    // along "/n" segments; then left along "n/" segments.
    const before = text.slice(0, range.index);
    const after = text.slice(range.end);
    // 2026-11-04: "132/33 kV ±10x1.25%": the kV closes the ratio, so the range
    // stands alone. It used to land on 33 kV (LV current, LV Um) with nothing
    // assumed. kV may sit between figure and range only when the ratio goes on.
    const continues = new RegExp(String.raw`^${DUTY_TAG}\s*(?:kV)?\s*/\s*${NUM}`, "i").test(after);
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
        const m = tail.match(new RegExp(String.raw`^${DUTY_TAG}\s*(?:kV)?\s*/\s*(${NUM})`, "i"));
        if (!m) break;
        right.push(Number(m[2]));
        tail = tail.slice(m[0].length);
        // A second tapped winding: 115±8x1.25%/38.5±2x2.5%/11 kV.
        const r = tail.match(RANGE_AT_START);
        if (r) {
          const plus = Number(r[1] ?? r[2]);
          const minus = Number(r[1] ?? r[3]);
          tail = tail.slice(r[0].length);
          // "38.5±2x2.5% (DETC)": the tag says off-circuit duty.
          const tag = tail.match(new RegExp(String.raw`^${DUTY_TAG}`, "i"))?.[1];
          if (plus + minus > 0) {
            extra.push({
              at: left.length + right.length,
              plus,
              minus,
              stepPct: r[4] ? Number(r[4]) : null,
              ...(tag && new RegExp(OCTC_WORD.source, "i").test(tag) ? { offCircuit: true } : {}),
            });
          }
        }
      }
      let kv = [...left, Number(own[1]), ...right];
      // 2026-11-04 R2: "33000±2x2.5%/415 V" is in volts; it was refused above Um 363 kV.
      if (/^\s*V\b/.test(tail) && kv.some((n) => n > 1200)) kv = kv.map((n) => n / 1000);
      // 2026-11-04 R4: "33 kV ±2x2.5%/433 V": only the figures after the kV one are volts. It
      // was 433/33 kV, and the Dyn11 y letter put a star-point switch on the delta HV.
      else if (/^\s*V\b/.test(tail) && /kV/i.test(own[0]) && right.length) {
        kv = [...left, Number(own[1]), ...right.map((n) => n / 1000)];
      }
      // "69/13.8 ±8x1.25%": a spaced range after a closed ratio stands alone too.
      const standalone = !continues && left.length > 0 && /\s$/.test(own[0]);
      if (kv.length >= 2) return { kv, tapIndex: standalone ? null : left.length, extra };
    }
  }
  // 2026-11-04 R2: "66 kV/11 kV" is a chain too (it lost the 11 kV, so "(LV tapping)" had no LV).
  // 2026-11-04 R3: "kVp" is an impulse figure, not a winding.
  const chains = [
    ...text.matchAll(new RegExp(String.raw`(${NUM}(?:\s*(?:kV)?\s*/\s*${NUM}){1,2})\s*kV(?![Ap])`, "gi")),
  ]
    // 2026-11-04 R2: "LI/AC 650/275 kV", "BIL HV/LV/N 650/170/325 kV", "Um 145/36/36 kV"
    // were read as the ratio (650 kV tapped, current 80 % low).
    // 2026-11-04 R3: "Impulse 650 kVp", "Test voltages 275/70 kV", "Lightning impulse
    // 650/170 kV", "Max. system voltage 145/36 kV" too. "Nominal system voltage" is the ratio.
    // TEİAŞ "x%1,25/34,5 kV": a chain right after % or x is not a ratio.
    .filter((m) => !/[%x]\s*$/i.test(text.slice(Math.max(0, (m.index ?? 0) - 2), m.index ?? 0)))
    .map((m) => {
      const head = text.slice(Math.max(0, (m.index ?? 0) - 30), m.index ?? 0);
      const at = m.index ?? 0;
      const end = at + m[0].length;
      const c = m[1].split("/").map((x) => Number(x.replace(/kV/i, "").trim()));
      // 2026-11-04 R4: "132/145 kV (Un/Um)", "nominal voltage 132/145 kV", "Nominal / Highest
      // system voltage: 132 / 145 kV" were flipped to a 145 kV HV (current 9 % low). A rated
      // and highest voltage pair is the rated figure alone; checked before the insulation words.
      const unUm = c.length === 2 && (UN_UM[c[0]!] === c[1] || /^\s*\(?\s*(?:U[nr]\s*\/\s*)?Um\b(?!\s*[:=]?\s*\d)/i.test(text.slice(end, end + 12)));
      return {
        c: unUm ? [c[0]!] : c,
        at,
        end,
        unUm,
        // A ratio word before it, or the range right beside it, names the ratio.
        // 2026-11-04 R4: "voltage 132/33 kV" after an insulation list is the ratio too.
        ratio: /(?:ratio|rated\s+voltage|nominal|\bU[rn]\b|(?<!(?:test|impulse|highest|max\w*|system)\s+)\bvoltages?\b)[^\d]{0,20}$/i.test(head),
        near: range != null && (/^\s*$/.test(text.slice(end, range.index)) || /^\s*$/.test(text.slice(range.end, at))),
      };
    })
    // 2026-11-04 R4: the insulation word is looked for in the chain's own clause only (a word
    // two clauses back dropped "LI/AC, 132/33 kV"); a label after the chain ("650/275 kV LI/AC")
    // and a chain inside an insulation list ("insulation levels HV 650/275 kV, LV 170/70 kV")
    // are not the ratio either.
    .filter(
      (x) =>
        x.unUm ||
        (!NOT_WINDING.test(clauseBefore(text, x.at)) &&
          !AFTER_LABEL.test(text.slice(x.end, x.end + 50)) &&
          !inInsulationList(text, x.at)),
    )
    .filter((x) => x.c.every((n) => n > 0.2 && n < 1200));
  if (chains.length) {
    chains.sort(
      (a, b) => Number(b.ratio) - Number(a.ratio) || Number(b.near) - Number(a.near) || b.c.length - a.c.length || a.at - b.at,
    );
    return { kv: chains[0]!.c, tapIndex: null, extra: [] };
  }
  // Chinese model SFZ11-25000/110 or Rosseti ТДН-16000/110: HV only.
  const cn = text.match(CN_MODEL) ?? text.match(RU_MODEL);
  if (cn) return { kv: [Number(cn[3])], tapIndex: null, extra: [] };
  if (!lone) return { kv: [], tapIndex: null, extra: [] };
  // 2026-11-04: "63 MVA, 225 kV, ±8x1.25%" and "HV 115 kV ±9x1.78%; LV 11 kV"
  // were refused. Insulation figures (BIL 550 kV, Um 145 kV) are not windings.
  // 2026-11-04 R4: "HV 132±10x1.25% kV, LV 33 kV" lost the HV (range before the unit); the
  // LV was tapped at Um 40.5 on a 132 kV neutral. A range between figure and kV is allowed.
  const hits = [...text.matchAll(new RegExp(String.raw`(?<![A-Za-z/\d.])(${NUM})\s*(?:±[^,;/]{0,25}?%\s*)?kV(?![Ap])`, "gi"))]
    .map((m) => ({ kv: Number(m[1]), index: m.index ?? 0, end: (m.index ?? 0) + m[0].length }))
    .filter((h) => h.kv > 0.2 && h.kv < 1200)
    .filter((h) => {
      // 2026-11-04 R4: the look-back stops at the clause ("(650 kV BIL), LV 33 kV" lost the
      // LV); a label after the figure ("650 kV BIL", "(145 kV Um)") is not a winding either.
      const head = clauseBefore(text, h.index);
      return !NOT_WINDING.test(head) && !/\bneutral\b[^\d]{0,20}$/i.test(head) && !AFTER_LABEL.test(text.slice(h.end, h.end + 50));
    });
  const kv = [...new Set(hits.map((h) => h.kv))].sort((a, b) => b - a);
  if (!kv.length || kv.length > 3) return { kv: [], tapIndex: null, extra: [] };
  // 2026-11-04 R2: in "132 kV / 33 kV ±10x1.25%" the 33 kV closes the ratio; the range
  // stands alone (HV assumed), as for "132/33 kV ±". It went on the LV delta.
  const direct = range
    ? hits.find(
        (h, i) =>
          // "132±10x1.25% kV": the range inside the figure is its own.
          (h.index < range.index && h.end >= range.end) ||
          (h.end <= range.index &&
            /^\s*$/.test(text.slice(h.end, range.index)) &&
            !(i > 0 && /^\s*\/\s*$/.test(text.slice(hits[i - 1]!.end, h.index)))),
      )
    : undefined;
  // The figures were sorted, not taken in the line's order: say so when that moved one.
  const written = [...new Set(hits.map((h) => h.kv))];
  const reordered = written.some((k, i) => kv[i] !== k);
  return { kv, tapIndex: direct ? kv.indexOf(direct.kv) : null, extra: [], ...(reordered ? { reordered } : {}) };
}

/**
 * "word": the line says autotransformer (word, IBT, OS…Z / OD…Z / АТДЦТН model).
 * "at": only an AT designation ("AT1", "AT 250 MVA"), so the kind stays assumed.
 */
function autoText(text: string): "word" | "at" | null {
  // 2026-11-04 R2: "OLTC AUTO/MANUAL/REMOTE", "auto/manual control", "cooling (auto)"
  // and all-caps "AT ONAF" / "RATED AT 75 DEG C" made a two-winding line an auto.
  // "AT" and the model codes stay case-sensitive.
  if (
    /\bauto[\s-]?(?:transformers?|trafo|TR)\b|\bautotrafo|自耦/i.test(text) ||
    // 2026-11-04 R3: Spanish, French, German, Russian, Vietnamese and Turkish words.
    /\bautotransforma(?:dor|teur|tor)\w*|автотрансформатор|\btự\s*ngẫu|\boto[\s-]?(?:trafo|transformat)\w*/i.test(text) ||
    /\bauto\b(?!\s*[/)]|[\s-]*(?:control|mode|operation|start|reclos|tap|voltage|changeover|transfer|reset|cooling|fan|pump|manual|AVR))(?<!(?:manual|hand|\(|AVR)\s*\/?\s*auto)/i.test(text) ||
    // 2026-11-04 R2: PLN "IBT" and the Rosseti АТДЦТН / АОДЦТН models were two-winding.
    /\bIBT\b|\b[Ii]nter[\s-]?bus\s+transformer/.test(text) ||
    /(?<![А-ЯЁа-яё])А[ОТ]Д[А-ЯЁ]*-\d/u.test(text) ||
    /\bA[OT]D[A-Z]*-\d|\bO[SD][A-Z]*Z[A-Z0-9]*-\d/.test(text)
  ) {
    return "word";
  }
  return /\bAT-?\d{1,2}\b|\bAT\s+\d+(?:\.\d+)?\s*MVA/.test(text) ? "at" : null;
}

/** Delta tied to the tapping (not an LV delta or a tertiary). */
// 2026-11-04 R2: "HV winding delta", "HV: delta" and "delta/star" (HV named first) added.
// 2026-11-04 R3: "HV: D, LV: yn" and "delta connected HV" too.
// 2026-11-04 R4: "OLTC at neutral, LV winding delta", "LV: D connection", "secondary connected
// in delta" made the tapped HV star a stated delta (current 42 % low). A tap word's delta may not
// cross an LV/MV/secondary/tertiary word, and those words before a delta make it the other winding's.
const DELTA_TAP =
  /(?:regulat\w*|tapp\w*|OLTC)\b(?:(?!\b(?:LV|MV|secondary|tertiary|low[\s-]voltage)\b)[^;.]){0,40}\bdelta\b|\bHV\b[\s:]*(?:winding\s*)?(?:is\s*)?delta\b|\bHV\b\s*[:=]\s*D\b|\bdelta[\s-]connected\s+HV\b|\bdelta[\s/-]*star\b|(?<!\b(?:LV|MV|secondary|tertiary)\b[\s:]*)\bD[\s-]?connection\b|三角形调压|角接调压/i;
const DELTA_OTHER =
  /\b(?:LV|MV|tertiary|secondary|stabili[sz]ing|low[\s-]voltage)\b(?:(?!\bHV\b|\bstar\b)[^;.,]){0,25}\b(?:delta|D[\s-]?connect)|\bdelta\s+(?:tertiary|stabili)|star\s*\/\s*delta/i;
// 2026-11-04 R2: "LV neutral point earthed" / "11 kV neutral point brought out" made the
// HV a stated star neutral. A neutral after a winding word or a kV figure is not the tap's.
// 2026-11-04 R4: "HV neutral point solidly earthed", "line end of the HV star winding", "not in
// neutral" cancelled a stated line-end tap (Um 72.5 where 145-252 is needed). Only a tap site
// counts: an earthing phrase, a bare "star" connection word and "not in neutral" are not one.
const STAR_TAP =
  /(?:regulat\w*|tapp\w*|OLTC|tap[\s-]?changer)[^;.,]{0,40}?(?<!\b(?:LV|MV|secondary|tertiary|kV)\s+)(?<!\bnot\s+(?:in|at)?\s*(?:the\s+)?)\b(?:star[\s-]?point|neutral)\b(?![\s-]*(?:point\s+)?(?:is\s+)?(?:solidly\s+)?(?:earthed|grounded))|(?<!\b(?:LV|MV|secondary|tertiary|kV)\s+)\bstar neutral\b(?![\s-]*(?:point\s+)?(?:is\s+)?(?:solidly\s+)?(?:earthed|grounded))|\bneutral[\s-]end\s+(?:tapp\w*|regulat\w*|OLTC)|(?<!\bnot\s+)\bin neutral\b|中性点调压/i;
/** Tap in the middle of a (star) winding: line end for the current, OS for the Um. */
// 2026-11-07 tender test: KPLC "in the electrical centre of the higher winding", ADMIE
// "Middle of the high voltage winding" were missed (star neutral at Um 72.5).
const MID_WINDING =
  /(?:middle|(?:electrical\s+)?cent(?:re|er))\s+of\s+(?:the\s+)?(?:(?:HV|higher|high[\s-]voltage|primary)\s+)?winding|mid[\s-]winding/i;

/**
 * 2026-11-04 R2: "line end" in an insulation clause ("LI line end 650 kV",
 * "insulation line end/neutral") beat a stated neutral tap. Only a line end that
 * is not an insulation figure counts.
 */
function lineEndTap(text: string): boolean {
  for (const m of text.matchAll(/line[\s-]?end|线端/gi)) {
    const at = m.index ?? 0;
    const head = text.slice(Math.max(0, at - 25), at);
    const clause = head.slice(Math.max(head.lastIndexOf(","), head.lastIndexOf(";")) + 1);
    const after = text.slice(at + m[0].length, at + m[0].length + 12);
    if (/\b(?:LI|BIL|LIWL|SIL|AC)\b|insulation|withstand|绝缘/i.test(clause)) continue;
    if (/^\s*(?:\/|\d|LI\b|BIL\b|AC\b|:)/i.test(after)) continue;
    return true;
  }
  return false;
}

export function parseTenderLine(raw: string): TenderLine | null {
  const text = normalizeTenderText(raw);
  if (!text) return null;
  const vg = parseVectorGroup(text);
  const windings = vg?.windings ?? [];
  const notes: LineNote[] = [];
  // 2026-11-04 A03: "Auto-transformer, vector group YNd11d11" is two-winding.
  // An auto's HV and MV share one winding, so only a group whose first two
  // letters differ contradicts the word (YNyn0d11 autos stay auto).
  const autoWord = autoText(text);
  const contradicts = vg != null && windings.length >= 2 && windings[0] !== windings[1];
  const auto = windings.includes("a") || (autoWord != null && !contradicts);
  if (autoWord != null && contradicts && !windings.includes("a")) {
    notes.push({ key: "auto_vg", vars: { vg: vg!.group } });
  }
  let range = findRange(text);
  // A ±N guessed from a position count sits on no voltage figure.
  let found = findVoltages(text, range?.guessed ? null : range, !auto);

  // 2026-11-04 R2: ranges written apart ("HV 132 kV ±2x2.5% (off-circuit), LV 33 kV
  // ±8x1.25% (on-load)", "DETC ±2x2.5%, OLTC ±8x1.25%") sized the OLTC on the first.
  // The OLTC takes the range its clause calls on-load (else the most steps, not an
  // off-circuit one); the others keep their kV for off-circuit duty.
  type Site = { kv?: number; side?: string } | null;
  const apart: { hit: RangeHit; offCircuit: boolean; site: Site }[] = [];
  const stated = stepHits(text)
    .filter((h) => h.plus + h.minus > 0 && h.stepPct != null)
    .filter((h, i, a) => a.findIndex((o) => o.plus === h.plus && o.minus === h.minus && o.stepPct === h.stepPct) === i);
  if (!found.extra.length && stated.length >= 2 && range && range.stepPct != null && !range.pct) {
    const tags = stated.map((_, i) => dutyTag(text, stated, i));
    const on = stated.filter((_, i) => tags[i] === "oltc");
    const notOff = stated.filter((_, i) => tags[i] !== "octc");
    const pool = on.length ? on : notOff.length ? notOff : stated;
    const main = pool.reduce((x, y) => (y.plus + y.minus > x.plus + x.minus ? y : x));
    const siteOf = (h: RangeHit): Site => {
      const head = text.slice(0, h.index);
      const k = head.match(new RegExp(String.raw`(?<![A-Za-z/\d.])(${NUM})(?:\s*kV)?\s*$`, "i"));
      if (k && !/\/\s*$/.test(head.slice(0, k.index))) return { kv: Number(k[1]) };
      // 2026-11-04 R3: "DETC on LV ±2x2.5%" put the off-circuit range on the HV (75 % low).
      // 2026-11-04 R4: GB "中压无载±2×2.5%", "低压侧无载调压±2×2.5%" too.
      const zh = head.match(/([高中低])压侧?(?:有载|无载)?(?:调压)?\s*$/);
      if (zh) return { side: zh[1] === "高" ? "HV" : zh[1] === "中" ? "MV" : "LV" };
      return sideAfter(text, h.end) ?? sideBefore(text, h.index);
    };
    stated.forEach((h, i) => {
      if (h !== main) apart.push({ hit: h, offCircuit: tags[i] === "octc", site: siteOf(h) });
    });
    if (main.index !== range.index) {
      range = main;
      found = findVoltages(text, range, !auto);
    }
  }
  let kv = found.kv;
  const rangeIndex = found.tapIndex;

  // 2026-11-04 T05: "333 MVA single-phase" was sized as a three-phase 333 MVA,
  // a third of the winding current.
  // "auxiliary supply 230 V single-phase" is not the transformer.
  // 2026-11-04 R2: "Single-phase, 167 MVA" and "Type: single phase; rating 100 MVA" were
  // missed (current 3× low), "control 1-phase 230 V" was taken (3× high), and "3x83.3 MVA",
  // "/√3" ratings and OD…Z / АО… models never set it. A word followed by volts or a
  // fault, or after an auxiliary word or a volts figure, is not the transformer's.
  // 2026-11-04 R3: "single-phase auto-reclosing" is the line breaker's, not the transformer's.
  // 2026-11-04 R4: "monofásico", "monophasé", "Einphasen", "Однофазный", "1 pha", "1 fasa",
  // "1Ø", "single-ph", "100 MVA per phase" and the ОРДТНЖ-/ОДЦТН- models were sized three-phase
  // (current 67 % low). "per phase" counts only right after a rating ("impedance 10% per phase").
  const singleWord = [
    ...text.matchAll(
      new RegExp(
        String.raw`single[\s-]?phase|single[\s-]?ph\b|\b1[\s-]?ph(?:ase)?\b|\b1\s*pha\b|\b(?:1|satu)\s*fasa\b|monof[aá]sic[a-z]*|monophas[a-zéè]*|einphas[a-z]*|однофазн[а-яё]*|\b1\s*[ØΦφ]|(?<=[MkМк][VВ][AА]\s*)per\s+phase\b(?!\s+(?:impedance|reactance|resistance|loss))|单相(?!电源|供电|交流)|\bbank of 3\b`,
        "gi",
      ),
    ),
  ].some((m) => {
    const i = m.index ?? 0;
    const after = text.slice(i + m[0].length, i + m[0].length + 14);
    const before = text.slice(Math.max(0, i - 25), i);
    if (/^\W{0,3}(?:\d+\s*V\b|supply|aux|control|motor|fault|short|earth|to\b|auto[\s-]?reclos|reclos|trip)/i.test(after)) {
      return false;
    }
    if (/(?:aux\w*|supply|control|motor|heater|fault|short[\s-]?circuit|\d+\s*V)\W*$/i.test(before)) return false;
    return !/^bank/i.test(m[0]) || !THREE_PHASE.test(text);
  });
  const singleModel =
    /\bO?D[A-Z]*Z[A-Z0-9]*-\d{3,7}\/\d/.test(text) ||
    /(?<![А-ЯЁа-яё])АО[А-ЯЁ]*-\d/u.test(text) ||
    /(?<![А-ЯЁа-яё])О(?!ПН)[А-ЯЁ]*-\d{3,6}\/\d/u.test(text) ||
    /\bAOD[A-Z]*-\d/.test(text);
  const rootThree = /\/\s*(?:√|sqrt\s*|v)\s*3\b/i.test(raw) && !THREE_PHASE.test(text);
  // IEC "Ii0" / "Ia0i0" are single-phase groups.
  const singleGroup = vg != null && /^I/.test(vg.group);
  // 2026-11-04 R3: "3 x 63 MVA power transformers 132/33 kV" is three three-phase units, not
  // one single-phase unit (3× current, a single-phase CM2I type). It is one unit of a bank
  // only with a single-phase or bank sign, or at 220 kV and up, where banks are built.
  const singleSign = singleWord || singleModel || rootThree || singleGroup;
  const threeUnit = singleSign || /\bbank\b/i.test(text) || (kv.length > 0 && Math.max(...kv) >= 220);
  const mvaRead = parseMva(text, threeUnit);
  let mva = mvaRead.mva;
  if (!kv.length && mva == null && !range && !vg) return null;

  const assumed: AssumedField[] = [];
  // 2026-11-04 R2: a bare "AT" designation keeps the kind assumed.
  if (!vg && autoWord !== "word") assumed.push("kind");
  // 2026-11-04 R4 safety net: an MVA with no rating figure or model code of its own is a guess.
  const mvaSign = /\d\s*[Mk]VA|[Mk]VA\W{0,6}\d/i.test(text) || CN_MODEL.test(text) || RU_MODEL.test(text);
  if (mva == null || mvaRead.misread || !mvaSign) assumed.push("mva");
  if (mvaRead.differ && mva != null) notes.push({ key: "largest_mva", vars: { mva } });
  const threeX = text.match(THREE_X);
  if (!threeUnit && threeX && !THREE_PHASE.test(text) && mva != null) notes.push({ key: "quantity", vars: { mva } });
  const real = range && !range.zero && !range.unread ? range : null;
  if (!real || (real.pct && !real.pct.stated) || real.guessed) assumed.push("range");
  if (range?.zero) notes.push({ key: "zero_range" });
  if (range?.unread) notes.push({ key: "percent_small", vars: { pct: range.unread } });
  if (real?.pct) {
    if (!real.pct.stated) {
      notes.push({
        key: "percent",
        vars: { pct: real.pct.text, plus: real.plus, minus: real.minus, step: real.stepPct ?? 1.25 },
      });
    }
    const pos = text.match(POSITIONS);
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
  // 2026-11-07 tender test: a percent range ("-5% to +15% in steps of 1.25%") sits on no
  // kV figure, so words that name the tapped winding ("On the 132 kV line end") win.
  if (tapIndex != null && range?.pct && voltagesKv.length > 1) {
    const named = tapWindingFromWords(text, range, voltagesKv, auto);
    if (named != null) tapIndex = named;
  }
  if (tapIndex == null && voltagesKv.length) {
    tapIndex = tapWindingFromWords(text, range, voltagesKv, auto);
    if (tapIndex == null) {
      tapIndex = 0;
      assumed.push("tap_winding");
    }
  }

  // The OLTC takes the range with most steps; the others are off-circuit.
  type Ranged = {
    tapIndex: number;
    plus: number;
    minus: number;
    stepPct: number | null;
    offCircuit?: boolean;
    kvAssumed?: boolean;
  };
  let main: Ranged | null =
    real && tapIndex != null
      ? { tapIndex, plus: real.plus, minus: real.minus, stepPct: real.stepPct }
      : null;
  const others: Ranged[] = found.extra
    .filter((e) => e.at < kv.length)
    .map((e) => ({
      tapIndex: at(e.at),
      plus: e.plus,
      minus: e.minus,
      stepPct: e.stepPct,
      ...(e.offCircuit ? { offCircuit: true } : {}),
    }));
  if (main && others.length) {
    const all = [main, ...others];
    const big = all.reduce((x, y) => (y.plus + y.minus > x.plus + x.minus ? y : x));
    main = big;
    others.splice(0, others.length, ...all.filter((r) => r !== big));
    tapIndex = big.tapIndex;
  }
  if (main) {
    for (const a of apart) {
      let ti: number | null = null;
      if (a.site?.kv != null) ti = voltagesKv.indexOf(a.site.kv) >= 0 ? voltagesKv.indexOf(a.site.kv) : null;
      else if (a.site?.side) ti = sideIndex(a.site.side, voltagesKv.length, auto);
      others.push({
        tapIndex: ti ?? main.tapIndex,
        plus: a.hit.plus,
        minus: a.hit.minus,
        stepPct: a.hit.stepPct,
        offCircuit: a.offCircuit,
        kvAssumed: ti == null,
      });
    }
  }

  const starTap = STAR_TAP.test(text);
  // A stated neutral tap wins over a line-end or mid-winding word.
  const lineEnd = !starTap && lineEndTap(text);
  const midWinding = !starTap && !lineEnd && MID_WINDING.test(text);
  const orderGuess = flipped || found.reordered === true;
  /** Winding and tap point of the winding at index i (two-winding). */
  const pointAt = (i: number | null) => {
    let letter = i != null ? windings[i] : undefined;
    let winding: WindingConnection = "star";
    let tapPoint: TapPoint = "neutral";
    let windingAssumed = false;
    let tapPointAssumed = false;
    let deltaText = false;
    let mid = false;
    if (letter == null) {
      // 2026-11-04: "D connection", "regulation at the middle of the delta
      // winding" were sized as a star neutral. Only a delta tied to the
      // tapping counts; an LV or tertiary delta keeps the guess, flagged.
      if (DELTA_TAP.test(text) && !DELTA_OTHER.test(text)) letter = "D";
      // 2026-11-04 R4: a stated neutral tap is a star winding even when an LV delta is named.
      else if (starTap) letter = "Y";
      else if (/\bdelta\b|三角形|角接/i.test(text)) deltaText = true;
    }
    if (letter === "D") {
      winding = "delta";
      tapPoint = "line_end";
    } else if (letter === "Y" || (letter == null && (lineEnd || midWinding))) {
      // A star winding is tapped at the neutral unless the tender says line end.
      // 2026-11-04 R2: "line-end tapping" with no vector group was a neutral 72.5;
      // a mid-winding tap is line end too, its Um from the OS.
      if (letter == null) windingAssumed = true;
      if (lineEnd || midWinding) {
        tapPoint = "line_end";
        mid = midWinding;
      } else if (!starTap) tapPointAssumed = true;
    } else {
      windingAssumed = true;
      tapPointAssumed = true;
    }
    // 2026-11-04 R4 safety net: a vector-group letter names a winding only while the figures
    // keep the line's order. After a flip or a sort (a BIL figure or a volts LV moved the HV)
    // the letter is a guess, so star/delta and the tap point it implies are listed as assumed.
    if (i != null && windings[i] != null && orderGuess) {
      windingAssumed = true;
      if (!starTap && !lineEnd && !midWinding) tapPointAssumed = true;
    }
    return { winding, tapPoint, windingAssumed, tapPointAssumed, zigzag: letter === "Z", deltaText, mid };
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

  const phases = mvaRead.unit || singleSign ? ("I" as const) : null;
  // "250 MVA bank of 3 x 1-phase units": the figure is the bank; one unit is a third.
  if (phases && mvaRead.bank && mva != null) mva = Math.round((mva / 3) * 1000) / 1000;
  if (phases && mva != null) notes.push({ key: "single_phase", vars: { mva } });
  // 2026-11-04 R2: 0.05 → 0.2 MVA, so a misread like "63.000 kVA" is flagged.
  // 2026-11-04 R3: below 1 MVA at 33 kV and up too ("31'500 kVA" read 0.5 MVA). A note
  // only: 315-630 kVA units at 33 kV exist.
  const topKv = voltagesKv.length ? Math.max(...voltagesKv) : 0;
  if (mva != null && (mva < 0.2 || (mva < 1 && topKv >= 33))) notes.push({ key: "tiny_mva", vars: { mva } });
  const neutralBilKv = parseNeutralBil(text);
  // 2026-11-04 R3: "OLTC insulation to earth LI 550 kV" does not name the neutral, and B01
  // ("OS insulation to ground AC275/LI650") was sold at 72.5. Say so; never size on it.
  const earthLi = text.match(/\bto\s+(?:earth|ground)\b[^;]{0,25}?\b(?:LI|BIL|LIWL)\s*[:=]?\s*(\d{2,4})/i);
  if (earthLi && neutralBilKv == null) notes.push({ key: "earth_li", vars: { li: Number(earthLi[1]) } });
  // 2026-11-04 T01/T03: "coarse/fine" and "linear" words were ignored ("non-linear load" is not linear).
  const regulation: Regulation | null = /coarse[\s/-]*fine|粗细调/i.test(text)
    ? "coarse_fine"
    : /(?<!non[\s-]?)\blinear\b|线性调/i.test(text)
      ? "linear"
      : /\brevers|正反调/i.test(text)
        ? "reversing"
        : null;

  const allTags = stated.map((_, i) => dutyTag(text, stated, i));
  const offCircuitOnly =
    OFF_CIRCUIT_TAP.test(text) &&
    !ON_LOAD_ANY.test(text) &&
    (stated.length < 2 || allTags.every((d) => d === "octc"));
  if (offCircuitOnly) notes.push({ key: "off_circuit_line" });
  // 2026-11-07 field and tender tests: "cast resin dry-type transformer" stayed in tank
  // (an oil CV2 for a dry unit).
  const dryType = DRY_TYPE.test(text);

  const base = {
    mva,
    voltagesKv,
    tapIndex,
    plus: main?.plus ?? null,
    minus: main?.minus ?? null,
    stepPct: main?.stepPct ?? null,
    vectorGroup: vg?.group ?? null,
    windings,
    neutralBilKv,
    phases,
    regulation,
    otherRanges,
    ...(offCircuitOnly ? { offCircuitOnly: true } : {}),
    ...(dryType ? { dryType: true } : {}),
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
  if (p.mid) notes.push({ key: "mid_winding" });
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
  // 2026-11-04 R2: "neutral solidly earthed, LV BIL 75 kV", "LV neutral LI 170" and
  // "tertiary BIL 170" were taken as the neutral BIL and printed as a stated Um 12/40.5.
  // A BIL after another winding word is not the neutral's. In "line end/neutral LI
  // 650/325" the neutral is the second name, so the second figure.
  const re = /(?:neutral|中性点)([^;.]{0,30}?)(?:BIL|LI|LIWL)\s*[:=]?\s*(\d{2,4})((?:\s*\/\s*\d{2,4})*)/gi;
  for (const m of text.matchAll(re)) {
    const at = m.index ?? 0;
    if (/\b(?:LV|MV|tertiary|secondary)\s*$/i.test(text.slice(Math.max(0, at - 12), at))) continue;
    if (/\b(?:LV|MV|HV|tertiary|line[\s-]?end)\b|\//i.test(m[1]!)) continue;
    const names = text.slice(Math.max(0, at - 30), at).match(/((?:[A-Za-z][A-Za-z\s-]{0,12}\/\s*)+)$/);
    if (names) {
      const k = (names[1]!.match(/\//g) ?? []).length;
      const figs = [m[2]!, ...(m[3]!.match(/\d{2,4}/g) ?? [])];
      if (figs[k] == null) continue;
      return Number(figs[k]);
    }
    return Number(m[2]);
  }
  // 2026-11-04 R3: "HV neutral 550 kV", "HV neutral 550 kV BIL" and the label "HVN 550/230"
  // were not read (Um 72.5 where LI 550 is stated). Only forms that name the neutral.
  // 2026-11-04 R4: French "neutre 550 kV" and Spanish "neutro 550 kV" too.
  const named = /\b(?:HV\s+)?neutr(?:al|e|o)\s*[:=]?\s*(?:BIL|LI)?\s*(\d{2,4})\s*kVp?\b/gi;
  for (const m of text.matchAll(named)) {
    const at = m.index ?? 0;
    // A neutral BIL is 95 kV and up; a smaller figure is an AC or a Um.
    if (Number(m[1]) < 95) continue;
    // 2026-11-04 r3 check: "LV winding neutral 170 kV BIL" and "33 kV neutral …" are
    // not the HV neutral; a bare figure under 250 kV ("HV neutral 110 kV") reads as a Um.
    const clause = text.slice(Math.max(0, at - 40), at).split(/[,;]/).pop() ?? "";
    if (/\b(?:LV|MV|tertiary|secondary|low[\s-]?voltage|\d+(?:\.\d+)?\s*kV)\b/i.test(clause)) continue;
    const after = text.slice(at + m[0].length, at + m[0].length + 8);
    const marked = /BIL|LI|kVp/i.test(m[0]) || /^\s*(?:BIL|LI|LIWL)\b/i.test(after);
    if (!marked && Number(m[1]) < 250) continue;
    return Number(m[1]);
  }
  // "HVN 550/230": LI and AC in either order; the LI is the larger.
  const hvn = text.match(/\bHVN\b\s*[:=]?\s*(\d{2,4})((?:\s*\/\s*\d{2,4})*)/);
  if (hvn) return Math.max(Number(hvn[1]), ...(hvn[2]!.match(/\d{2,4}/g) ?? []).map(Number));
  return neutralFromList(text);
}

/**
 * 2026-11-04 R4: the neutral named in a label list ("BIL (HV/HVN/LV) 1050/550/170 kV", "LI HV/N:
 * 1050/550", "HV/N/LV LI …", "insulation HV line/neutral 1050/550"), label first ("LIWL HV
 * 1050 kV, N 550 kV", "LI: HV 1050, HV-N 550"), "neutral BIL/AC 550/230" and "neutral
 * insulation 550 kV LI" was not read: Um 72.5 below the stated LI 550. The figure at the
 * neutral label's place is taken; a list without HV or line names no HV neutral.
 */
function neutralFromList(text: string): number | null {
  const LBL = String.raw`(?:HV[\s-]?N|HVN|HV|MV|LV|N|neutral|line(?:[\s-]?end)?)`;
  const NAMES = String.raw`${LBL}(?:\s*\/\s*${LBL}){1,3}`;
  const FIGS = String.raw`(\d{2,4}(?:\s*\/\s*\d{2,4}){1,3})`;
  const list = new RegExp(
    String.raw`(?:\b(?:BIL|LIWL|LI|insulation)\b[^;\d]{0,12}?\(?\s*(${NAMES})\s*\)?|\b(${NAMES})\s*(?:BIL|LIWL|LI)\b)\s*[:=]?\s*${FIGS}`,
    "gi",
  );
  const isN = (n: string) => /^(?:HV[\s-]?N|HVN|N|neutral)$/i.test(n.trim());
  for (const m of text.matchAll(list)) {
    const names = (m[1] ?? m[2])!.split("/").map((n) => n.trim());
    const figs = m[3]!.split("/").map((f) => Number(f.trim()));
    const k = names.findIndex(isN);
    if (k < 0 || figs[k] == null || figs[k]! < 95) continue;
    if (/^N$/i.test(names[k]!) && !(k > 0 && /^HV$/i.test(names[k - 1]!))) continue;
    if (!/^HV[\s-]?N$|^HVN$/i.test(names[k]!) && !names.some((n) => /^(?:HV|line)/i.test(n))) continue;
    return figs[k]!;
  }
  // "LIWL HV 1050 kV, N 550 kV": a neutral label after an HV figure in an insulation clause.
  for (const m of text.matchAll(/[,;]\s*(HV[\s-]?N|HVN|N)\s*[:=]?\s*(\d{2,4})\b(?!\s*\/)/gi)) {
    const at = m.index ?? 0;
    const seg = text.slice(0, at).split(";").pop() ?? "";
    if (!/\b(?:BIL|LIWL|LI|insulation)\b[^;]*\bHV\s*[:=]?\s*\d/i.test(seg)) continue;
    if (Number(m[2]) >= 95) return Number(m[2]);
  }
  const pair = text.match(/\bneutr(?:al|e|o)\s+(BIL|LIWL|LI|AC)\s*\/\s*(BIL|LIWL|LI|AC)\s*[:=]?\s*(\d{2,4})\s*\/\s*(\d{2,4})/i);
  if (pair) return Number(/^AC$/i.test(pair[1]!) ? pair[4] : pair[3]);
  const ins = text.match(/\bneutr(?:al|e|o)\s+insulation\s*[:=]?\s*(\d{2,4})\s*kV\s*(?:LI|BIL|LIWL)\b/i);
  return ins ? Number(ins[1]) : null;
}

// ------------------------------------------------------------ line → form

/**
 * W/G geometry for an uneven +a/−b range (2026-11-04). The maker sells the
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
  /** The line ties the range to this kV (not the HV guess). */
  tapKvStated: boolean;
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
  let tapKvStated = !tl.assumed.includes("tap_winding");
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
    // 2026-11-04 R2: a range the line calls off-circuit (DETC, OCTC) is the OCTC's.
    const off = tl.otherRanges.find((x) => x.offCircuit);
    const r = off ?? tl.otherRanges.reduce((x, y) => (y.plus + y.minus <= x.plus + x.minus ? y : x));
    if (off || plus == null || minus == null || r.plus + r.minus <= plus + minus) {
      plus = r.plus;
      minus = r.minus;
      stepPct = r.stepPct;
      winding = r.winding;
      tapPoint = r.tapPoint;
      tapKv = r.kv;
      tapKvStated = !r.kvAssumed;
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
      tapKvStated,
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
