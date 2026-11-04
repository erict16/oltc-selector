/**
 * The selector page's form as one value, and the transitions that change
 * more than one field at a time (read a tender line, switch 有载 / 无载,
 * commit a +/− range). Pure, so every path can be tested without a browser.
 *
 * 2026-11-04 (r2 UI-1…UI-5): reading a new line or switching mode left
 * values from the previous line or mode in force (an OS Imax, the other
 * winding's range, the OCTC ±2 on the way back to 有载). Each transition
 * here returns the whole next form; the page applies only what changed.
 */
import { DEFAULT_WINDING_RATED_KV } from "./deriveUm";
import {
  defaultRegulationForRange,
  geometryForRange,
  lineMinusSteps,
  parseTenderLine,
  tenderLineSettings,
  type LineSettings,
  type TenderLine,
} from "./nameplate";
import {
  defaultPitch,
  lookupDiagram,
  pitchFromPlusMinus,
  pmStepOptionsFor,
  positionsFor,
  preferredMid,
  type ParsedTapRange,
} from "./tapCode";
import {
  deriveDuty,
  type DutyBasis,
  type TapPoint,
  type TransformerKind,
  type TransformerSpec,
  type WindingConnection,
} from "./transformer";
import type { Regulation, SelectInput } from "./types";

type Pitch = 10 | 12 | 14 | 16 | 18;
type Geometry = Pick<SelectInput, "plusMinusSteps" | "positions" | "midPositions" | "pitch">;

export type LineFailure = false | "lineFail" | "lineFailAutoMv";

export interface FormState {
  input: SelectInput;
  pm: string;
  tapPlus: number;
  tapMinus: number;
  tapRange: ParsedTapRange | null;
  stepPercentPct: number;
  stepPctCustom: boolean;
  currentMode: "current" | "capacity";
  voltageMode: "winding" | "equipment";
  windingRatedKv: number;
  transformerMva: number;
  mvaCustom: boolean;
  safetyK: number;
  kind: TransformerKind;
  tapPoint: TapPoint;
  winding: WindingConnection;
  tapForced: boolean;
  hvKv: number;
  mvKv: number;
  earthUm: number;
  osImaxA: number;
  osUstV: number;
  market: string;
  lineRead: TenderLine | null;
  lineFailed: LineFailure;
  /** 调压方式 to put back on leaving 无载 (OCTC runs linear, as the CLI). */
  oltcRegulation: Regulation;
}

export const DEFAULT_INPUT: SelectInput = {
  mounting: "in_tank",
  medium: "oil_vacuum",
  preferVacuum: true,
  phases: "III",
  connection: "Y",
  throughCurrentA: 400,
  umKv: 0,
  stepVoltageV: 1500,
  regulation: "reversing",
  // Brochure default: ±8 mid3 → 10193W (most common); must stay in sync with `pm`
  plusMinusSteps: 8,
  positions: 19,
  pitch: 10,
  midPositions: 3,
  selectorSize: "auto",
  preferStructure: "auto",
  mdu: "none",
  dutyKind: "oltc",
};

/** First paint: 25 MVA, 110 kV star neutral, ±8 × 1.25 % W. */
export const INITIAL_FORM: FormState = {
  input: DEFAULT_INPUT,
  pm: "8",
  tapPlus: 8,
  tapMinus: 8,
  tapRange: null,
  stepPercentPct: 1.25,
  stepPctCustom: false,
  currentMode: "capacity",
  voltageMode: "winding",
  windingRatedKv: DEFAULT_WINDING_RATED_KV,
  transformerMva: 25,
  mvaCustom: false,
  safetyK: 1,
  kind: "two_winding",
  tapPoint: "neutral",
  winding: "star",
  tapForced: false,
  hvKv: 220,
  mvKv: 110,
  earthUm: 0,
  osImaxA: 0,
  osUstV: 0,
  market: "",
  lineRead: null,
  lineFailed: false,
  oltcRegulation: "reversing",
};

/** Brochure (±N, mid) geometry for a SelectInput patch. */
export function geometryForPm(n: number, regulation: Regulation, mid?: 1 | 3): Geometry {
  const m = mid ?? preferredMid(n, regulation);
  const row = lookupDiagram(n, m, regulation);
  return {
    plusMinusSteps: n,
    midPositions: m,
    positions: row?.positions ?? positionsFor(n, m),
    pitch: (row?.pitch ?? pitchFromPlusMinus(n, m)) as Pitch,
  };
}

export const isOctc = (f: FormState): boolean => (f.input.dutyKind ?? "oltc") === "octc";
const isLinear = (f: FormState): boolean => isOctc(f) || f.input.regulation === "linear";
/** The +/− range drives the duty only while its selects are on screen. */
const rangeLive = (f: FormState): boolean => isLinear(f) || !f.pm;

export function formStepFraction(f: FormState): number | null {
  if (rangeLive(f) && f.tapRange?.stepPercent && f.tapRange.stepPercent > 0) {
    return f.tapRange.stepPercent;
  }
  if (f.stepPercentPct > 0) return f.stepPercentPct / 100;
  return null;
}

export function formMinusSteps(f: FormState): number {
  // Never below the read line's real minus (+4/−12 sized on −8 otherwise).
  const floor = lineMinusSteps(f.lineRead, isOctc(f));
  if (rangeLive(f) && f.tapRange && f.tapRange.minus > 0) return Math.max(f.tapRange.minus, floor);
  const n = f.pm && Number(f.pm) > 0 ? Number(f.pm) : f.input.plusMinusSteps;
  if (n != null && n > 0) return Math.max(n, floor);
  // 2026-11-04: no range at all sizes on −8, as the CLI; 0 sized on rated current.
  return floor > 0 ? floor : 8;
}

/** Transformer → duty. The one place current, Ust and Um come from. */
export function formSpec(f: FormState): TransformerSpec {
  return {
    kind: f.kind,
    tapPoint: f.tapPoint,
    winding: f.winding,
    mva: f.currentMode === "capacity" ? f.transformerMva : 0,
    tapKv: f.windingRatedKv,
    hvKv: f.hvKv,
    mvKv: f.mvKv,
    minusSteps: formMinusSteps(f),
    stepFraction: formStepFraction(f),
    safetyK: f.safetyK,
    ...(f.earthUm > 0 ? { earthUmKv: f.earthUm } : {}),
    ...(f.currentMode === "capacity" && f.osImaxA > 0 ? { statedMaxA: f.osImaxA } : {}),
    ...(f.currentMode === "capacity" && f.osUstV > 0 ? { statedStepV: f.osUstV } : {}),
    ...(f.market ? { market: f.market } : {}),
  };
}

export function withOctcSeries(duty: SelectInput): SelectInput {
  if ((duty.dutyKind ?? "oltc") !== "octc") {
    // 2026-11-04: reactor (HWDK) is oil. A kept preferVacuum filtered it out.
    return duty.mounting === "reactor"
      ? { ...duty, preferVacuum: false, medium: "oil" }
      : duty;
  }
  // 2026-11-04: auto goes to the engine, like the CLI (WSG on D is II).
  const series = duty.octcSeries ?? "auto";
  return {
    ...duty,
    octcSeries: series,
    preferVacuum: false,
    medium: "oil",
  };
}

export type FormSizing =
  | { ok: true; input: SelectInput; duty: DutyBasis }
  | { ok: false; msgKey: "kBelowOne" | "needMva" }
  | { ok: false; duty: DutyBasis };

/** What the page sends to the engine, or why it sends nothing. */
export function formSelectInput(f: FormState): FormSizing {
  if (f.currentMode === "capacity") {
    if (f.safetyK > 0 && f.safetyK < 1) return { ok: false, msgKey: "kBelowOne" };
    if (!(f.transformerMva > 0)) return { ok: false, msgKey: "needMva" };
  }
  const d = deriveDuty(formSpec(f));
  if (!d.ok) return { ok: false, duty: d };
  const ust = d.stepV != null && d.stepV > 0 ? d.stepV : null;
  const sized: SelectInput = {
    ...f.input,
    connection: d.connection,
    transformerKind: f.kind,
    combinedOnly: d.combinedOnly,
    ...(f.kind !== "auto" ? { tapWindingKv: d.umSystemKv } : {}),
    umKv: d.umKv,
    ...(ust != null ? { stepVoltageV: ust } : {}),
  };
  if (f.currentMode === "capacity") {
    if (!(d.dutyA > 0)) return { ok: false, msgKey: "needMva" };
    return { ok: true, input: withOctcSeries({ ...sized, throughCurrentA: d.dutyA }), duty: d };
  }
  return { ok: true, input: withOctcSeries(sized), duty: d };
}

/** One range as the form holds it: the selects, the live range and the geometry. */
type RangeFields = Pick<FormState, "pm" | "tapPlus" | "tapMinus" | "tapRange"> &
  Geometry & { regulation: Regulation };

function withRange(f: FormState, r: RangeFields): FormState {
  return {
    ...f,
    pm: r.pm,
    tapPlus: r.tapPlus,
    tapMinus: r.tapMinus,
    tapRange: r.tapRange,
    input: {
      ...f.input,
      regulation: r.regulation,
      plusMinusSteps: r.plusMinusSteps,
      positions: r.positions,
      midPositions: r.midPositions,
      pitch: r.pitch,
    },
  };
}

/** OCTC contact: plus + minus + 1 positions, no mid (as the CLI --octc). */
function octcGeometry(plus: number, minus: number): Geometry {
  const positions = plus + minus + 1;
  return {
    plusMinusSteps: undefined,
    positions,
    midPositions: 0,
    pitch: defaultPitch(positions, "linear") as Pitch,
  };
}

/**
 * 无载 with no stated range: the selects show ±2 (6x5, the engine default)
 * and the duty stays on −8 (pm 8, no live range), as the CLI --octc.
 */
function octcDefaultRange(): RangeFields {
  return { pm: "8", tapPlus: 2, tapMinus: 2, tapRange: null, regulation: "linear", ...octcGeometry(2, 2) };
}

/** The range a read line gives in one mode (same rules as the CLI --line). */
function lineRangeFields(s: LineSettings, octc: boolean, baseReg: Regulation, stepPct: number): RangeFields {
  const stepPercent = stepPct > 0 ? stepPct / 100 : null;
  if (octc) {
    if (s.plus == null || s.minus == null) return octcDefaultRange();
    const g = octcGeometry(s.plus, s.minus);
    return {
      pm: "",
      tapPlus: s.plus,
      tapMinus: s.minus,
      tapRange: { plus: s.plus, minus: s.minus, positions: g.positions!, stepPercent },
      regulation: "linear",
      ...g,
    };
  }
  const keepReg: Regulation = baseReg === "linear" ? "reversing" : baseReg;
  if ((s.plus != null && s.minus != null && s.plus !== s.minus) || s.regulation === "linear") {
    // An uneven +a/−b keeps W/G on the Fig. 3-3 row Huaming sold (+4/−12 →
    // 10193W) with the real minus steps.
    const plus = s.plus ?? 8;
    const minus = s.minus ?? 8;
    const reg = s.regulation ?? keepReg;
    const g = geometryForRange(plus, minus, reg);
    return {
      pm: "",
      tapPlus: plus,
      tapMinus: minus,
      tapRange: { plus, minus, positions: g.positions, stepPercent },
      regulation: reg,
      plusMinusSteps: g.plusMinusSteps,
      positions: g.positions,
      midPositions: g.mid,
      pitch: g.pitch,
    };
  }
  const n = s.plus ?? 8;
  const want = s.regulation ?? keepReg;
  const reg: Regulation = pmStepOptionsFor(want).includes(n) ? want : "reversing";
  return { pm: String(n), tapPlus: n, tapMinus: n, tapRange: null, regulation: reg, ...geometryForPm(n, reg) };
}

/** The range on screen now, mapped onto 无载. */
function rangeToOctc(f: FormState): RangeFields {
  const live = !f.pm || f.input.regulation === "linear" ? f.tapRange : null;
  if (live) {
    const g = octcGeometry(live.plus, live.minus);
    return {
      pm: f.pm,
      tapPlus: live.plus,
      tapMinus: live.minus,
      tapRange: { ...live, positions: g.positions! },
      regulation: "linear",
      ...g,
    };
  }
  const n = Number(f.pm) > 0 ? Number(f.pm) : 8;
  // Only the ±8 OLTC default becomes ±2; a picked ±5 stays (current 8 % low otherwise).
  if (n === 8) return octcDefaultRange();
  return { pm: f.pm, tapPlus: n, tapMinus: n, tapRange: null, regulation: "linear", ...octcGeometry(n, n) };
}

/**
 * The range on screen now, mapped back onto 有载. A ±N preset (pm) comes
 * back as it was; the OCTC ±2 display and +/− edits do not stay in force.
 */
function rangeToOltc(f: FormState, reg: Regulation): RangeFields {
  if (!f.pm && f.tapRange) {
    const { plus, minus } = f.tapRange;
    const g = geometryForRange(plus, minus, reg);
    return {
      pm: "",
      tapPlus: plus,
      tapMinus: minus,
      tapRange: { ...f.tapRange, positions: g.positions },
      regulation: reg,
      plusMinusSteps: g.plusMinusSteps,
      positions: g.positions,
      midPositions: g.mid,
      pitch: g.pitch,
    };
  }
  const n = Number(f.pm) > 0 ? Number(f.pm) : 8;
  if (reg === "linear") {
    const positions = 2 * n + 1;
    return {
      pm: "",
      tapPlus: n,
      tapMinus: n,
      tapRange: { plus: n, minus: n, positions, stepPercent: f.stepPercentPct > 0 ? f.stepPercentPct / 100 : null },
      regulation: "linear",
      plusMinusSteps: undefined,
      positions,
      midPositions: 0,
      pitch: defaultPitch(positions, "linear") as Pitch,
    };
  }
  const r: Regulation = pmStepOptionsFor(reg).includes(n) ? reg : "reversing";
  return { pm: String(n), tapPlus: n, tapMinus: n, tapRange: null, regulation: r, ...geometryForPm(n, r) };
}

function sameRange(f: FormState, r: RangeFields): boolean {
  return (
    f.pm === r.pm &&
    f.tapPlus === r.tapPlus &&
    f.tapMinus === r.tapMinus &&
    (f.tapRange?.plus ?? null) === (r.tapRange?.plus ?? null) &&
    (f.tapRange?.minus ?? null) === (r.tapRange?.minus ?? null) &&
    f.input.regulation === r.regulation &&
    f.input.positions === r.positions &&
    (f.input.midPositions ?? null) === (r.midPositions ?? null)
  );
}

const lineStep = (s: LineSettings): number => (s.stepPct != null && s.stepPct > 0 ? s.stepPct : 1.25);
const connFor = (p: TapPoint): SelectInput["connection"] => (p === "neutral" ? "Y" : "D");

/** Kind toggle: the tap point follows (auto → junction; delta → line end). */
export function pickKind(f: FormState, k: TransformerKind): FormState {
  if (k === f.kind) return f;
  const p: TapPoint = k === "auto" ? "auto_junction" : f.winding === "delta" ? "line_end" : "neutral";
  return {
    ...f,
    kind: k,
    tapPoint: p,
    tapForced: k === "two_winding" && f.winding === "delta",
    input: { ...f.input, connection: connFor(p) },
  };
}

/** Fill the form from one read line (s = tenderLineSettings for the current mode). */
function applyLine(f: FormState, tl: TenderLine, s: LineSettings): FormState {
  const step = lineStep(s);
  const phases: SelectInput["phases"] =
    s.phases ?? (f.lineRead?.phases === "I" && f.input.phases === "I" ? "III" : f.input.phases);
  const next: FormState = {
    ...f,
    lineFailed: false,
    lineRead: tl,
    currentMode: "capacity",
    voltageMode: "winding",
    // Single-phase: 3 × the unit MVA, on a single-phase switch.
    transformerMva: s.mva,
    mvaCustom: false,
    kind: s.kind,
    ...(s.kind === "auto"
      ? { hvKv: s.hvKv ?? f.hvKv, mvKv: s.mvKv ?? f.mvKv }
      : { windingRatedKv: s.tapKv ?? f.windingRatedKv, winding: s.winding }),
    tapPoint: s.tapPoint,
    tapForced: false,
    earthUm: s.earthUm ?? 0,
    // 2026-11-04 (UI-1): an OS Imax / Ust belongs to one transformer. A 346 A
    // typed for 59 MVA sized the next 61 MVA line (355.7 A) on a 350 A switch.
    osImaxA: 0,
    osUstV: 0,
    // A line with no step % or range takes the CLI defaults.
    stepPercentPct: step,
    stepPctCustom: false,
    input: { ...f.input, connection: connFor(s.tapPoint), umKv: 0, phases },
  };
  return withRange(next, lineRangeFields(s, isOctc(f), f.input.regulation, step));
}

/**
 * 读取: map the typed line onto the form for the current mode, as the CLI
 * --line (with --octc in 无载).
 */
export function readLine(f: FormState, text: string): FormState {
  const tl = parseTenderLine(text);
  const r = tl ? tenderLineSettings(tl, { octc: isOctc(f) }) : null;
  if (tl && r && !r.ok && r.reason === "auto_needs_mv") {
    // 2026-11-04 (UI-5): the error says to fill HV and MV below, so show
    // them: autotransformer, the line's MVA, HV and range, MV empty. The
    // untouched two-winding form kept showing its own type beside the error.
    const plus = tl.plus;
    const minus = tl.minus;
    const s: LineSettings = {
      kind: "auto",
      kindStated: true,
      mva: tl.mva == null ? f.transformerMva : tl.phases === "I" ? 3 * tl.mva : tl.mva,
      phases: tl.phases,
      hvKv: tl.hvKv ?? Math.max(...tl.voltagesKv),
      mvKv: null,
      tapKv: tl.tapKv,
      winding: tl.winding,
      windingStated: false,
      tapPoint: "auto_junction",
      tapPointStated: false,
      plus,
      minus,
      stepPct: tl.stepPct,
      regulation: tl.regulation ?? (plus != null && minus != null ? defaultRegulationForRange(plus, minus) : null),
      regulationStated: tl.regulation != null,
      earthUm: null,
      octcWinding: false,
    };
    return { ...applyLine(f, tl, s), mvKv: 0, lineRead: null, lineFailed: "lineFailAutoMv" };
  }
  if (!tl || !r || !r.ok) return { ...f, lineRead: null, lineFailed: "lineFail" };
  return applyLine(f, tl, r.s);
}

/**
 * 有载 ↔ 无载 with a read line: take the winding, range and regulation the
 * line gives for the new mode (the CLI with or without --octc). The user's
 * MVA and phases stay; a field the user changed after the read stays too,
 * unless the line moves the tap to another winding. Null: nothing to remap.
 */
function remapLine(f: FormState, tl: TenderLine, octc: boolean): FormState | null {
  const ra = tenderLineSettings(tl, { octc: !octc });
  const rb = tenderLineSettings(tl, { octc });
  if (!ra.ok || !rb.ok) return null;
  const a = ra.s;
  const b = rb.s;
  let next: FormState = { ...f };
  const windingMoved = a.tapKv !== b.tapKv || a.winding !== b.winding || a.tapPoint !== b.tapPoint;
  if (windingMoved && b.kind !== "auto") {
    next = {
      ...next,
      windingRatedKv: b.tapKv ?? f.windingRatedKv,
      winding: b.winding,
      tapPoint: b.tapPoint,
      tapForced: false,
      // An OS figure belongs to one winding.
      osImaxA: 0,
      osUstV: 0,
      input: { ...next.input, connection: connFor(b.tapPoint), umKv: 0 },
    };
  }
  if (f.earthUm === (a.earthUm ?? 0)) next.earthUm = b.earthUm ?? 0;
  const step = f.stepPercentPct === lineStep(a) ? lineStep(b) : f.stepPercentPct;
  if (step !== f.stepPercentPct) {
    next.stepPercentPct = step;
    next.stepPctCustom = false;
  }
  // On-load regulation the line falls back to: the one in use before 无载.
  const base = octc ? f.input.regulation : f.oltcRegulation;
  const rangeMoved = a.plus !== b.plus || a.minus !== b.minus || a.regulation !== b.regulation;
  const untouched = sameRange(f, lineRangeFields(a, !octc, base, lineStep(a)));
  if (rangeMoved || untouched) return withRange(next, lineRangeFields(b, octc, base, step));
  return withRange(next, octc ? rangeToOctc(next) : rangeToOltc(next, f.oltcRegulation));
}

/** 无载. Off-circuit is two-winding only (autoOctcNote). */
export function toOctc(f: FormState): FormState {
  if (isOctc(f)) return f;
  // A read autotransformer line stays one and is refused, as when read in
  // 无载 and as the CLI; forcing two-winding sized it on the old kV.
  let next = f.kind === "auto" && f.lineRead?.kind !== "auto" ? pickKind(f, "two_winding") : f;
  next = { ...next, oltcRegulation: next.input.regulation };
  next = (next.lineRead ? remapLine(next, next.lineRead, true) : null) ?? withRange(next, rangeToOctc(next));
  return {
    ...next,
    input: {
      ...next.input,
      dutyKind: "octc",
      preferStructure: "auto",
      octcSeries: next.input.octcSeries ?? "auto",
    },
  };
}

/** 有载: put back the on-load 调压方式 and range. */
export function toOltc(f: FormState): FormState {
  if (!isOctc(f)) return f;
  const next =
    (f.lineRead ? remapLine(f, f.lineRead, false) : null) ?? withRange(f, rangeToOltc(f, f.oltcRegulation));
  return { ...next, input: { ...next.input, dutyKind: "oltc", preferStructure: "auto" } };
}

/** +/− selects (and a step % change while they drive the duty). */
export function commitRange(f: FormState, plus: number, minus: number, pct: number): FormState {
  if (!(plus > 0) || !(minus > 0)) return { ...f, tapRange: null };
  const octc = isOctc(f);
  const reg = f.input.regulation;
  // A W/G custom +a/−b takes the Fig. 3-3 row Huaming sells (+4/−12 → 10193W).
  const g = !octc && reg !== "linear" ? geometryForRange(plus, minus, reg) : null;
  const range: ParsedTapRange = {
    plus,
    minus,
    positions: g?.positions ?? plus + minus + 1,
    stepPercent: pct > 0 ? pct / 100 : null,
  };
  const input: SelectInput = g
    ? {
        ...f.input,
        positions: g.positions,
        plusMinusSteps: g.plusMinusSteps,
        midPositions: g.mid,
        pitch: g.pitch,
      }
    : {
        ...f.input,
        positions: range.positions,
        plusMinusSteps: undefined,
        midPositions: octc || reg === "linear" ? 0 : 1,
        pitch: defaultPitch(range.positions, octc ? "linear" : reg) as Pitch,
      };
  return { ...f, tapPlus: plus, tapMinus: minus, tapRange: range, input };
}

/**
 * A step % change re-commits the +/− range only while that range is live.
 * The untouched 无载 ±2 stays a display: the duty keeps −8, as the CLI.
 */
export function stepMovesRange(f: FormState): boolean {
  return rangeLive(f) && !(isOctc(f) && f.tapRange == null);
}

/** Fields of `next` that differ from `was`, input field by field. */
export function formDiff(
  was: FormState,
  next: FormState,
): Partial<Omit<FormState, "input">> & { input?: Partial<SelectInput> } {
  const out: Partial<Omit<FormState, "input">> & { input?: Partial<SelectInput> } = {};
  for (const k of Object.keys(next) as Array<keyof FormState>) {
    if (k === "input" || next[k] === was[k]) continue;
    (out as Record<string, unknown>)[k] = next[k];
  }
  if (next.input !== was.input) {
    const d: Partial<SelectInput> = {};
    const keys = new Set([...Object.keys(was.input), ...Object.keys(next.input)]) as Set<keyof SelectInput>;
    for (const k of keys) {
      if (next.input[k] !== was.input[k]) (d as Record<string, unknown>)[k] = next.input[k];
    }
    if (Object.keys(d).length) out.input = d;
  }
  return out;
}
