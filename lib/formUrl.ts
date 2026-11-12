/**
 * The form as a URL hash, so a result can be shared as a link and survives a
 * reload. Only values that differ from the first-paint form are written, under
 * short keys. Reading never throws: a value it cannot read is skipped, and a
 * form the page could not have made gives the default form back.
 */
import { INITIAL_FORM, type FormState } from "./formState";
import { parseTenderLine } from "./nameplate";
import type { ParsedTapRange } from "./tapCode";
import { TAP_POINTS_FOR } from "./transformer";
import type { SelectInput } from "./types";

const BAD = Symbol("bad");
type Bad = typeof BAD;

interface Codec<T> {
  enc: (v: T) => string;
  dec: (s: string) => T | Bad;
}

/** Longest hash read; a real link is far shorter. */
const MAX_HASH = 6000;
const MAX_LINE = 400;

const NUM_RE = /^\d{1,7}(?:\.\d{1,10})?$/;

/** 1.1 / 100 is 0.011000000000000001: write what was meant. */
const tidy = (v: number): string => String(Math.round(v * 1e8) / 1e8);

function readNum(s: string, max: number): number | Bad {
  if (!NUM_RE.test(s)) return BAD;
  const n = Number(s);
  return Number.isFinite(n) && n <= max ? n : BAD;
}

const num = (max = 1e6): Codec<number> => ({
  enc: (v) => tidy(v),
  dec: (s) => readNum(s, max),
});

const bool: Codec<boolean> = {
  enc: (v) => (v ? "1" : "0"),
  dec: (s) => (s === "1" ? true : s === "0" ? false : BAD),
};

const oneOf = <T extends string>(...xs: readonly T[]): Codec<T> => ({
  enc: (v) => v,
  dec: (s) => ((xs as readonly string[]).includes(s) ? (s as T) : BAD),
});

const oneOfNum = <T extends number>(...xs: readonly T[]): Codec<T> => ({
  enc: (v) => String(v),
  dec: (s) => {
    const n = xs.find((x) => String(x) === s);
    return n === undefined ? BAD : n;
  },
});

const text = (re: RegExp): Codec<string> => ({
  enc: (v) => v,
  dec: (s) => (re.test(s) ? s : BAD),
});

/** An unset field is written as an empty value. */
const optional = <T>(c: Codec<T>): Codec<T | undefined> => ({
  enc: (v) => (v === undefined ? "" : c.enc(v)),
  dec: (s) => (s === "" ? undefined : c.dec(s)),
});

const tapRange: Codec<ParsedTapRange | null> = {
  enc: (v) =>
    v == null
      ? ""
      : [v.plus, v.minus, v.positions, v.stepPercent == null ? "" : tidy(v.stepPercent)].join("_"),
  dec: (s) => {
    if (s === "") return null;
    const p = s.split("_");
    if (p.length !== 4) return BAD;
    const plus = readNum(p[0]!, 99);
    const minus = readNum(p[1]!, 99);
    const positions = readNum(p[2]!, 199);
    const stepPercent = p[3] === "" ? null : readNum(p[3]!, 1);
    if (plus === BAD || minus === BAD || positions === BAD || stepPercent === BAD) return BAD;
    return { plus, minus, positions, stepPercent };
  },
};

type TopKey = Exclude<keyof FormState, "input" | "lineRead" | "lineFailed">;
type TopSpec = { [K in TopKey]: [short: string, codec: Codec<FormState[K]>] };

const REGULATION = oneOf("reversing", "coarse_fine", "linear");

const TOP: TopSpec = {
  pm: ["pm", text(/^\d{0,2}$/)],
  tapPlus: ["tp", num(99)],
  tapMinus: ["tm", num(99)],
  tapRange: ["tr", tapRange],
  stepPercentPct: ["sp", num(100)],
  stepPctCustom: ["spc", bool],
  currentMode: ["cm", oneOf("current", "capacity")],
  voltageMode: ["vm", oneOf("winding", "equipment")],
  windingRatedKv: ["kv", num(2000)],
  transformerMva: ["mva", num(100000)],
  mvaCustom: ["mc", bool],
  safetyK: ["k", num(100)],
  kind: ["kd", oneOf("two_winding", "auto")],
  tapPoint: ["tap", oneOf("neutral", "line_end", "auto_junction", "auto_mv_line")],
  winding: ["w", oneOf("star", "delta")],
  tapForced: ["tf", bool],
  hvKv: ["hv", num(2000)],
  mvKv: ["mv", num(2000)],
  earthUm: ["um", num(2000)],
  osImaxA: ["oi", num(100000)],
  osUstV: ["ou", num(100000)],
  market: ["mk", text(/^[A-Z]{0,3}$/)],
  everRead: ["er", optional(bool)],
  phasesByLine: ["pl", optional(bool)],
  stepStated: ["ss", optional(bool)],
  oltcRegulation: ["or", REGULATION],
};

/** Input fields the page can change. The engine-side ones are derived on every render. */
type InputKey =
  | "mounting"
  | "medium"
  | "preferVacuum"
  | "dutyKind"
  | "phases"
  | "connection"
  | "throughCurrentA"
  | "umKv"
  | "stepVoltageV"
  | "regulation"
  | "positions"
  | "plusMinusSteps"
  | "midPositions"
  | "octcContact"
  | "octcSeries"
  | "pitch"
  | "selectorSize"
  | "preferStructure"
  | "acrossTapBilKv"
  | "acrossTapPfKv";
type InputSpec = { [K in InputKey]: [short: string, codec: Codec<SelectInput[K]>] };

const INPUT: InputSpec = {
  mounting: ["mt", oneOf("in_tank", "on_tank", "external_compartment", "dry_type", "reactor")],
  medium: ["md", oneOf("oil", "oil_vacuum", "dry")],
  preferVacuum: ["pv", bool],
  dutyKind: ["dk", optional(oneOf("oltc", "octc"))],
  phases: ["ph", oneOf("I", "II", "III")],
  connection: ["cn", oneOf("Y", "D", "any")],
  throughCurrentA: ["a", num(100000)],
  umKv: ["eu", num(2000)],
  stepVoltageV: ["sv", num(100000)],
  regulation: ["rg", REGULATION],
  positions: ["ps", optional(num(199))],
  plusMinusSteps: ["pms", optional(num(99))],
  midPositions: ["mid", optional(oneOfNum(0, 1, 3))],
  octcContact: ["oc", optional(text(/^[0-9A-Za-z]{1,12}$/))],
  octcSeries: ["os", optional(oneOf("auto", "II", "IV", "V", "VI", "VII", "VIII"))],
  // A read line with ±1…±3 holds pitch 4, 6 or 8, outside the brochure's type.
  pitch: ["pt", optional(oneOfNum(4, 6, 8, 10, 12, 14, 16, 18)) as Codec<SelectInput["pitch"]>],
  selectorSize: ["sz", optional(oneOf("auto", "A", "B", "C", "D", "DE", "E", ""))],
  preferStructure: ["st", optional(oneOf("auto", "combined", "compound", "cage", "drum"))],
  acrossTapBilKv: ["bil", optional(num(5000))],
  acrossTapPfKv: ["pf", optional(num(5000))],
};

const LINE_KEY = "ln";

/**
 * The hash for a form, without the leading "#". Empty for the default form.
 * `line` is the tender line the form was last read from, kept so the reader's
 * figures (its real minus steps) come back with the link.
 */
export function encodeForm(f: FormState, line = ""): string {
  const p = new URLSearchParams();
  for (const k of Object.keys(TOP) as TopKey[]) {
    const [short, codec] = TOP[k] as [string, Codec<unknown>];
    const v = codec.enc(f[k]);
    if (v !== codec.enc(INITIAL_FORM[k])) p.set(short, v);
  }
  for (const k of Object.keys(INPUT) as InputKey[]) {
    const [short, codec] = INPUT[k] as [string, Codec<unknown>];
    const v = codec.enc(f.input[k]);
    if (v !== codec.enc(INITIAL_FORM.input[k])) p.set(short, v);
  }
  const text = line.trim();
  if (f.lineRead && text && text.length <= MAX_LINE) p.set(LINE_KEY, text);
  return p.toString();
}

export interface DecodedForm {
  form: FormState;
  /** Tender line the form was read from; "" when none. */
  line: string;
}

const DEFAULTS: DecodedForm = { form: INITIAL_FORM, line: "" };

/** A form the page's own controls could have produced. */
function plausible(f: FormState): boolean {
  if (!TAP_POINTS_FOR[f.kind].includes(f.tapPoint)) return false;
  if (f.kind === "two_winding" && f.winding === "delta" && f.tapPoint === "neutral") return false;
  // A hand-edited link must not show one thing in a dropdown and size another.
  const octc = f.input.dutyKind === "octc";
  const st = f.input.preferStructure ?? "auto";
  if (octc && f.input.regulation !== "linear") return false;
  if (octc ? st === "combined" || st === "compound" : st === "cage" || st === "drum") return false;
  if (f.pm !== "" && f.input.plusMinusSteps != null && Number(f.pm) !== f.input.plusMinusSteps && !octc) {
    return false;
  }
  return true;
}

/**
 * The form a hash stands for. Unknown keys are ignored; a known key with a
 * value that cannot be read, or a form the page could not have made, gives the
 * default form. Returns INITIAL_FORM itself when the hash sets nothing.
 */
export function decodeForm(hash: string): DecodedForm {
  try {
    if (typeof hash !== "string") return DEFAULTS;
    const raw = hash.startsWith("#") ? hash.slice(1) : hash;
    if (!raw || raw.length > MAX_HASH) return DEFAULTS;
    const p = new URLSearchParams(raw);
    const top: Record<string, unknown> = {};
    const input: Record<string, unknown> = {};
    let touched = false;
    for (const k of Object.keys(TOP) as TopKey[]) {
      const [short, codec] = TOP[k] as [string, Codec<unknown>];
      const s = p.get(short);
      if (s == null) continue;
      const v = codec.dec(s);
      if (v === BAD) continue;
      top[k] = v;
      touched = true;
    }
    for (const k of Object.keys(INPUT) as InputKey[]) {
      const [short, codec] = INPUT[k] as [string, Codec<unknown>];
      const s = p.get(short);
      if (s == null) continue;
      const v = codec.dec(s);
      if (v === BAD) continue;
      input[k] = v;
      touched = true;
    }
    if (!touched) return DEFAULTS;
    let form: FormState = {
      ...INITIAL_FORM,
      ...(top as Partial<FormState>),
      input: { ...INITIAL_FORM.input, ...(input as Partial<SelectInput>) },
    };
    if (!plausible(form)) return DEFAULTS;
    let line = (p.get(LINE_KEY) ?? "").trim();
    if (line.length > MAX_LINE) line = "";
    if (line) {
      const read = parseTenderLine(line);
      if (read) form = { ...form, lineRead: read };
      else line = "";
    }
    return { form, line };
  } catch {
    return DEFAULTS;
  }
}
