import { APP_VERSION } from "./appVersion";
import { parseDecimal } from "./decimal";
import { octcRoman, optionsWithInsurance, selectOltc } from "./engine";
import {
  deriveDuty,
  umChoices,
  type DutyBasis,
  type TapPoint,
  type TransformerKind,
  type WindingConnection,
} from "./transformer";
import { lookupByPositions, parseTapRange, plusMinusFromPositions, resolveTapFields } from "./tapCode";
import {
  defaultRegulationForRange,
  geometryForRange,
  normalizeTenderText,
  parseTenderLine,
  tenderLineSettings,
  type TenderLine,
} from "./nameplate";
import { commercialTypeExists } from "./typeExists";
import type {
  Connection,
  DutyKind,
  Mounting,
  OctcSeriesChoice,
  PhaseCode,
  Regulation,
  SelectInput,
  StructureKind,
  SwitchingMedium,
} from "./types";

export type CliArgs = {
  /** Output language: zh (default) or en (2026-11-07: overseas engineers). */
  lang?: "zh" | "en";
  iu?: number;
  mva?: number;
  kv?: number;
  um?: number;
  ust?: number;
  stepPct?: number;
  k?: number;
  conn: Connection;
  /** Transformer kind. Default two-winding. */
  kind: TransformerKind;
  tap?: TapPoint;
  winding?: WindingConnection;
  hv?: number;
  mv?: number;
  /** OLTC insulation to earth as a catalogue Um class (OS or maker). */
  earthUm?: number;
  reg: Regulation;
  pm?: number;
  positions?: number;
  octc: boolean;
  structure: StructureKind | "auto";
  series?: OctcSeriesChoice;
  mount: Mounting;
  vacuum: boolean;
  oil: boolean;
  contact?: string;
  phases: PhaseCode;
  json: boolean;
  help: boolean;
  version?: boolean;
  /** --line: the tender line as read. Flags given beside it win. */
  line?: TenderLine;
  /** Minus steps of an asymmetric range (+4-12): sizes the lowest-tap current. */
  minus?: number;
  /** OS / maker Imax on the --mva path (--os-imax, or --imax beside --mva). */
  osImax?: number;
  /** Buyer's country (ISO code) for the neutral Um practice. */
  market?: string;
  /** Stated across-tap-winding LI / AC (kV). */
  acrossLi?: number;
  acrossAc?: number;
  /** Mid positions of the W/G diagram (--mid, or the +a/−b geometry). */
  mid?: 1 | 3;
  /** +a/−b as stated by --range or --line, for the 假定 echo. */
  range?: { plus: number; minus: number };
  /** --octc on a line with two ranges: kV of the winding the OCTC took. */
  lineOctcKv?: number;
  /** --line range the reader guessed (from a position count or a bare %), for the 假定 echo. */
  lineRangeAssumed?: boolean;
  /** flags the user actually passed; everything else is a silent default */
  given: Set<string>;
  /** Flag names as typed on the command line (not what --line filled in). */
  typed?: Set<string>;
};

export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliError";
  }
}

type Bound = "positive" | "nonNegative" | "any";

function num(raw: string, flag: string, bound: Bound = "positive"): number {
  if (bound !== "any" && /^\s*-\s*[\d.]/.test(raw)) {
    throw new CliError(
      bound === "positive"
        ? `${flag} must be greater than 0 (got ${raw})`
        : `${flag} must not be negative (got ${raw})`,
    );
  }
  const p = parseDecimal(raw);
  if (p.ok) {
    // 2026-11-13: --iu -400 used to answer "Missing value for --iu".
    if (bound === "positive" && !(p.value > 0)) {
      throw new CliError(`${flag} must be greater than 0 (got ${raw})`);
    }
    if (bound === "nonNegative" && p.value < 0) {
      throw new CliError(`${flag} must not be negative (got ${raw})`);
    }
    return p.value;
  }
  if (p.reason === "ambiguous") {
    // 1,200 used to become 1.2 A.
    throw new CliError(
      `Ambiguous number for ${flag}: ${raw}. Write 1200 or 1.2 (no thousands separator).`,
    );
  }
  throw new CliError(`Invalid number for ${flag}: ${raw}`);
}

/** Every flag the parser reads, for "did you mean". */
const KNOWN_FLAGS = [
  "--help", "--version", "--json", "--lang", "--no-update-check", "--octc", "--oil",
  "--vacuum", "--iu", "--imax", "--os-imax", "--market", "--across-li", "--across-ac",
  "--mva", "--kv", "--um", "--ust", "--step-pct", "--k", "--conn", "--connection",
  "--kind", "--auto", "--tap", "--winding", "--hv", "--mv", "--earth-um", "--reg",
  "--pm", "--positions", "--pos", "--structure", "--series", "--mount", "--contact",
  "--phases", "--line", "--nameplate", "--minus", "--range", "--mid", "--duty",
];

/** Flags that take no value: a repeat is harmless. */
const SWITCH_FLAGS = new Set([
  "--help", "-h", "--version", "-v", "-V", "--json", "--no-update-check", "--octc",
  "--oil", "--vacuum", "--auto",
]);

/** Two spellings of one flag. */
const FLAG_ALIAS: Record<string, string> = {
  "--connection": "--conn",
  "--positions": "--pos",
  "--nameplate": "--line",
};

function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i]![j] = Math.min(
        d[i - 1]![j]! + 1,
        d[i]![j - 1]! + 1,
        d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return d[a.length]![b.length]!;
}

function unknownFlag(a: string): CliError {
  const name = a.replace(/=.*$/s, "");
  const best = KNOWN_FLAGS.map((f) => [f, editDistance(name, f)] as const).sort((x, y) => x[1] - y[1])[0];
  const hint = best && best[1] <= 2 ? ` Did you mean ${best[0]}?` : "";
  return new CliError(`Unknown flag: ${name}.${hint} Run oltc --help for the list.`);
}

/** `--iu=400` → `--iu 400`. A --line value is never split. */
function splitEquals(argv: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    const prev = argv[i - 1];
    const m = /^(--[a-z][a-z-]*)=(.*)$/s.exec(a);
    if (m && SWITCH_FLAGS.has(m[1]!) && prev !== "--line" && prev !== "--nameplate") {
      throw new CliError(`${m[1]} takes no value`);
    }
    if (prev === "--line" || prev === "--nameplate" || !m || /^--(line|nameplate|lang)$/.test(m[1]!)) {
      out.push(a);
    } else {
      out.push(m[1]!, m[2]!);
    }
  }
  return out;
}

export function parseCliArgs(rawArgv: string[]): CliArgs {
  const argv = splitEquals(rawArgv);
  const envLang = typeof process !== "undefined" ? process.env?.OLTC_LANG?.toLowerCase() : undefined;
  const out: CliArgs = {
    ...(envLang === "en" ? { lang: "en" as const } : {}),
    conn: "Y",
    kind: "two_winding",
    reg: "reversing",
    octc: false,
    structure: "auto",
    mount: "in_tank",
    vacuum: true,
    oil: false,
    phases: "III",
    json: false,
    help: false,
    pm: 8,
    given: new Set<string>(),
  };

  const take = (i: number, flag: string): [string, number] => {
    const v = argv[i + 1];
    // A negative figure is a value (the range check names it), not a flag.
    if (v == null || (v.startsWith("-") && !/^-[\d.]/.test(v))) {
      throw new CliError(`Missing value for ${flag}`);
    }
    return [v, i + 1];
  };
  const seenFlags = new Set<string>();

  let lineRaw: string | null = null;
  let rangeRaw: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    // 2026-11-13: "--iu 400 … --iu 500" used to take the last one unseen.
    if (a.startsWith("--") && !SWITCH_FLAGS.has(a)) {
      const name = a.replace(/=.*$/s, "");
      const key = FLAG_ALIAS[name] ?? name;
      if (seenFlags.has(key)) throw new CliError(`${key} is given twice`);
      seenFlags.add(key);
    }
    // --line=… keeps a pasted line that starts with a dash.
    const eq = a.match(/^--(line|nameplate)=(.*)$/s);
    if (eq) {
      out.given.add("line");
      lineRaw = eq[2]!;
      continue;
    }
    if (a === "-h" || a === "--help") {
      out.help = true;
      continue;
    }
    if (a === "--version" || a === "-v" || a === "-V") {
      out.version = true;
      continue;
    }
    if (a === "--json") {
      out.json = true;
      continue;
    }
    if (a === "--lang" || a.startsWith("--lang=")) {
      const v = a.includes("=") ? a.slice(7) : argv[++i];
      const l = (v ?? "").toLowerCase();
      if (l !== "en" && l !== "zh") throw new CliError("--lang must be en or zh");
      out.lang = l;
      continue;
    }
    // Read by scripts/oltc.ts before the update check; nothing to select on.
    if (a === "--no-update-check") {
      continue;
    }
    if (a === "--octc") {
      out.given.add("octc");
      out.octc = true;
      continue;
    }
    if (a === "--oil") {
      out.given.add("medium");
      out.oil = true;
      out.vacuum = false;
      continue;
    }
    if (a === "--vacuum") {
      out.given.add("medium");
      out.vacuum = true;
      out.oil = false;
      continue;
    }
    if (a === "--iu" || a === "--imax") {
      // Two current figures used to overwrite each other in flag order.
      if (out.given.has(a === "--iu" ? "imaxFlag" : "iuFlag")) {
        throw new CliError("Give --iu or --imax, not both");
      }
      if (a === "--iu") out.given.add("iuFlag");
      out.given.add("iu");
      // --imax beside --mva is the OS Imax (moved after the loop).
      if (a === "--imax") out.given.add("imaxFlag");
      const [v, n] = take(i, a);
      out.iu = num(v, a);
      i = n;
      continue;
    }
    if (a === "--os-imax") {
      out.given.add("osImax");
      const [v, n] = take(i, a);
      out.osImax = num(v, a);
      i = n;
      continue;
    }
    if (a === "--market") {
      out.given.add("market");
      const [v, n] = take(i, a);
      if (!/^[A-Za-z]{2}$/.test(v)) throw new CliError(`--market must be a 2-letter country code (IT, TR, RU…)`);
      out.market = v.toUpperCase();
      i = n;
      continue;
    }
    if (a === "--across-li" || a === "--across-ac") {
      const key = a === "--across-li" ? "acrossLi" : "acrossAc";
      out.given.add(key);
      const [v, n] = take(i, a);
      // 0 means not stated, as before.
      out[key] = num(v, a, "nonNegative");
      i = n;
      continue;
    }
    if (a === "--mva") {
      out.given.add("mva");
      const [v, n] = take(i, a);
      out.mva = num(v, a);
      i = n;
      continue;
    }
    if (a === "--kv") {
      out.given.add("kv");
      const [v, n] = take(i, a);
      out.kv = num(v, a);
      i = n;
      continue;
    }
    if (a === "--um") {
      out.given.add("um");
      const [v, n] = take(i, a);
      out.um = num(v, a);
      i = n;
      continue;
    }
    if (a === "--ust") {
      out.given.add("ust");
      const [v, n] = take(i, a);
      out.ust = num(v, a, "nonNegative");
      i = n;
      continue;
    }
    if (a === "--step-pct") {
      out.given.add("stepPct");
      const [v, n] = take(i, a);
      out.stepPct = num(v, a);
      i = n;
      continue;
    }
    if (a === "--k") {
      out.given.add("k");
      const [v, n] = take(i, a);
      out.k = num(v, a);
      i = n;
      continue;
    }
    if (a === "--conn" || a === "--connection") {
      out.given.add("conn");
      const [v, n] = take(i, a);
      const c = v.toUpperCase();
      if (c !== "Y" && c !== "D") throw new CliError(`--conn must be Y or D`);
      out.conn = c;
      i = n;
      continue;
    }
    if (a === "--kind") {
      out.given.add("kind");
      const [v, n] = take(i, a);
      const k = v.toLowerCase();
      if (k === "auto" || k === "autotransformer" || k === "自耦") out.kind = "auto";
      else if (k === "two" || k === "two-winding" || k === "双绕组") {
        out.kind = "two_winding";
      } else throw new CliError(`--kind must be two or auto`);
      i = n;
      continue;
    }
    if (a === "--auto") {
      out.given.add("kind");
      out.kind = "auto";
      continue;
    }
    if (a === "--tap") {
      out.given.add("tap");
      const [v, n] = take(i, a);
      const map: Record<string, TapPoint> = {
        neutral: "neutral",
        line: "line_end",
        "line-end": "line_end",
        junction: "auto_junction",
        "mv-line": "auto_mv_line",
      };
      const t = map[v.toLowerCase()];
      if (!t) throw new CliError(`--tap must be neutral|line|junction|mv-line`);
      out.tap = t;
      i = n;
      continue;
    }
    if (a === "--winding") {
      out.given.add("winding");
      const [v, n] = take(i, a);
      const w = v.toLowerCase();
      if (w === "star" || w === "y") out.winding = "star";
      else if (w === "delta" || w === "d") out.winding = "delta";
      else throw new CliError(`--winding must be star or delta`);
      i = n;
      continue;
    }
    if (a === "--hv" || a === "--mv" || a === "--earth-um") {
      const key = a === "--hv" ? "hv" : a === "--mv" ? "mv" : "earthUm";
      out.given.add(key);
      const [v, n] = take(i, a);
      out[key] = num(v, a);
      i = n;
      continue;
    }
    if (a === "--reg") {
      out.given.add("reg");
      const [v, n] = take(i, a);
      const r = v.toUpperCase();
      if (r === "W" || r === "REVERSING") out.reg = "reversing";
      else if (r === "G" || r === "COARSE" || r === "COARSE_FINE") {
        out.reg = "coarse_fine";
      } else if (r === "0" || r === "LINEAR") out.reg = "linear";
      else throw new CliError(`--reg must be W, G, or 0`);
      i = n;
      continue;
    }
    if (a === "--pm") {
      out.given.add("pm");
      const [v, n] = take(i, a);
      out.pm = num(v, a);
      // 2026-11-13: --pm 8.5 gave 10181W and --pm 0 printed "±0".
      if (!Number.isInteger(out.pm) || out.pm < 1) {
        throw new CliError("--pm must be a whole number of at least 1");
      }
      i = n;
      continue;
    }
    if (a === "--positions" || a === "--pos") {
      out.given.add("positions");
      const [v, n] = take(i, a);
      out.positions = num(v, a, "nonNegative");
      // 2026-11-04 r2 ORDERS-9: --pos 1 gave tap code 10010 (no regulation).
      if (!Number.isInteger(out.positions) || out.positions < 2) {
        throw new CliError(`${a} must be a whole number of at least 2`);
      }
      i = n;
      continue;
    }
    if (a === "--structure") {
      out.given.add("structure");
      const [v, n] = take(i, a);
      const s = v.toLowerCase();
      const map: Record<string, StructureKind | "auto"> = {
        auto: "auto",
        combined: "combined",
        compound: "compound",
        cage: "cage",
        drum: "drum",
        组合式: "combined",
        复合式: "compound",
        笼式: "cage",
        鼓式: "drum",
      };
      if (!Object.hasOwn(map, s) && !Object.hasOwn(map, v)) {
        throw new CliError(
          `--structure must be auto|combined|compound|cage|drum`,
        );
      }
      out.structure = map[s] ?? map[v]!;
      i = n;
      continue;
    }
    if (a === "--series") {
      out.given.add("series");
      const [v, n] = take(i, a);
      const r = v.toUpperCase();
      const ok = ["II", "IV", "V", "VI", "VII", "VIII", "AUTO"];
      if (!ok.includes(r)) {
        throw new CliError(`--series must be II|IV|V|VI|VII|VIII`);
      }
      out.series = r === "AUTO" ? "auto" : (r as OctcSeriesChoice);
      i = n;
      continue;
    }
    if (a === "--mount") {
      out.given.add("mount");
      const [v, n] = take(i, a);
      const m = v.toLowerCase().replace("_", "-");
      if (m === "in-tank" || m === "intank") out.mount = "in_tank";
      else if (m === "on-tank" || m === "ontank") out.mount = "on_tank";
      else if (m === "dry" || m === "dry-type") out.mount = "dry_type";
      // 2026-11-04: HWDK used to need the unlisted on-tank --oil route.
      else if (m === "reactor") out.mount = "reactor";
      else throw new CliError(`--mount must be in-tank|on-tank|dry|reactor`);
      i = n;
      continue;
    }
    if (a === "--contact") {
      out.given.add("contact");
      const [v, n] = take(i, a);
      // 2026-11-04 r3 ENGINE-5: an unreadable contact used to be dropped without a word.
      if (!/^\d+\s*[xX×*✕]\s*\d+[A-Ea-e]?$/.test(v.trim())) {
        throw new CliError("--contact must look like 6x5 or 12x11D");
      }
      out.contact = v;
      i = n;
      continue;
    }
    if (a === "--phases") {
      out.given.add("phases");
      const [v, n] = take(i, a);
      const p = v.toUpperCase();
      if (p !== "I" && p !== "II" && p !== "III") {
        throw new CliError(`--phases must be I, II, or III`);
      }
      out.phases = p;
      i = n;
      continue;
    }
    if (a === "--line" || a === "--nameplate") {
      out.given.add("line");
      // 2026-11-04: a pasted line may start with "-" ("- 25 MVA …"); it is
      // still the value, not a flag.
      const v = argv[i + 1];
      if (v == null) throw new CliError(`Missing value for ${a}`);
      lineRaw = v;
      i += 1;
      continue;
    }
    if (a === "--minus") {
      out.given.add("minus");
      const [v, n] = take(i, a);
      const m = num(v, a, "nonNegative");
      if (!(m >= 0) || !Number.isInteger(m)) throw new CliError(`--minus must be a whole number of steps`);
      out.minus = m;
      i = n;
      continue;
    }
    if (a === "--range") {
      const [v, n] = take(i, a);
      rangeRaw = v;
      i = n;
      continue;
    }
    if (a === "--mid") {
      out.given.add("mid");
      const [v, n] = take(i, a);
      if (v !== "1" && v !== "3") throw new CliError(`--mid must be 1 or 3`);
      out.mid = v === "1" ? 1 : 3;
      i = n;
      continue;
    }
    if (a === "--duty") {
      out.given.add("octc");
      const [v, n] = take(i, a);
      const d = v.toLowerCase();
      if (d === "octc" || d === "off" || d === "detc") out.octc = true;
      else if (d === "oltc" || d === "on") out.octc = false;
      else throw new CliError(`--duty must be oltc or octc`);
      i = n;
      continue;
    }
    throw unknownFlag(a);
  }
  out.typed = seenFlags;
  if (rangeRaw != null) {
    const r = parseTapRange(rangeRaw);
    if (!r) throw new CliError(`--range must look like +4/-12 or +4/-12x1.25%`);
    if (r.stepPercent != null && !out.given.has("stepPct")) {
      out.stepPct = Math.round(r.stepPercent * 1e6) / 1e4;
      out.given.add("stepPct");
    }
    applyRange(out, r.plus, r.minus);
  }
  if (lineRaw != null) applyTenderLine(out, lineRaw);
  // 2026-11-04 audit D1: `--mva … --imax 334` used to fail "not both".
  // Beside --mva, --imax is the OS Imax; alone it stays the --iu alias.
  if (out.given.has("imaxFlag") && out.mva != null && out.osImax == null) {
    out.osImax = out.iu;
    out.iu = undefined;
    out.given.delete("iu");
    out.given.add("osImax");
  }
  return out;
}

/**
 * A stated +a/−b (--range or --line). 2026-11-04: an uneven W/G range takes
 * the Fig. 3-3 row the maker sold (+4/−12 → ±8, 10193W; +7/−10 → 10181W) and
 * keeps the real minus steps for the lowest-tap current, also when --pm or
 * --pos picks the diagram. It used to become linear S + 1 positions (17
 * positions put CV2 out of reach) or, beside --pm, size with −8 instead of −12.
 */
function applyRange(out: CliArgs, plus: number, minus: number): void {
  if (out.given.has("range")) return;
  out.given.add("range");
  out.range = { plus, minus };
  if (plus !== minus && !out.given.has("minus")) out.minus = minus;
  // Uneven S ≤ 9 was sold linear (+2/−6 → 10090) unless --reg says otherwise.
  if (!out.given.has("reg") && defaultRegulationForRange(plus, minus)) out.reg = "linear";
  if (out.given.has("pm") || out.given.has("positions")) return;
  if (plus === minus) {
    out.pm = plus;
    out.given.add("pm");
    return;
  }
  if (out.octc || out.reg === "linear") {
    out.positions = plus + minus + 1;
    out.given.add("positions");
    return;
  }
  const g = geometryForRange(plus, minus, out.reg);
  if (g.plusMinusSteps != null) {
    out.pm = g.plusMinusSteps;
    out.given.add("pm");
  } else {
    out.positions = g.positions;
    out.given.add("positions");
  }
  if (out.mid != null && (g.mid === 1 || g.mid === 3) && out.mid !== g.mid) {
    // --mid 3 on +7/−10 gave 10183W: 15 steps for a 17-step range.
    throw new CliError(
      `--mid ${out.mid} does not fit +${plus}/-${minus}: the Fig. 3-3 row has mid ${g.mid}.`,
    );
  }
  if (out.mid == null && (g.mid === 1 || g.mid === 3)) out.mid = g.mid;
}

/**
 * Fill the capacity path from a tender line. A flag typed beside --line
 * wins. A field the line only implies (tap point, star winding) is not
 * marked given, so the 假定 block still asks for it. The mapping is
 * tenderLineSettings, shared with the page.
 */
function applyTenderLine(out: CliArgs, raw: string): void {
  const t = parseTenderLine(raw);
  // 2026-11-07: a line that names only an off-circuit tap changer is OCTC duty.
  if (t?.offCircuitOnly && !out.given.has("octc")) out.octc = true;
  if (t?.dryType && !out.given.has("mount")) out.mount = "dry_type";
  const r = t ? tenderLineSettings(t, { octc: out.octc }) : null;
  if (r && !r.ok && r.reason === "auto_needs_mv") {
    throw new CliError(
      `--line reads an autotransformer without both HV and MV kV: ${raw}. Give --hv and --mv.`,
    );
  }
  if (!t || !r || !r.ok) {
    const text = normalizeTenderText(raw);
    const hasMva = /\d\s*(?:MVA|kVA)/i.test(text);
    const hasKv = /\d\s*kV(?!A)/i.test(text);
    const what = !hasMva && !hasKv
      ? "MVA and kV"
      : !hasMva
        ? "the MVA rating"
        : !hasKv
          ? "the kV ratio"
          : "the kV ratio and range";
    throw new CliError(
      `Could not read ${what} from --line: ${raw}. Write it like "25MVA 110±8x1.25%/10.5kV YNd11", or give --mva/--kv (or --hv/--mv) instead.`,
    );
  }
  const s = r.s;
  out.line = t;
  const fill = (key: string, apply: () => void, sure = true) => {
    if (out.given.has(key)) return;
    apply();
    if (sure) out.given.add(key);
  };
  fill("kind", () => (out.kind = s.kind), s.kindStated);
  // Single-phase: 3 × the unit MVA gives the winding current on S/(√3U).
  // 2026-11-04 R4: an MVA the reader had to guess (a "31.500 kVA" thousands misread) is echoed.
  fill("mva", () => (out.mva = s.mva), !t.assumed.includes("mva"));
  if (s.phases) fill("phases", () => (out.phases = s.phases!));
  if (s.kind === "auto") {
    if (s.hvKv != null) fill("hv", () => (out.hv = s.hvKv!));
    if (s.mvKv != null) fill("mv", () => (out.mv = s.mvKv!));
  } else if (s.tapKv != null) {
    // 2026-11-04 R2: a guessed tapped winding is not a stated --kv; 假定 says so.
    fill("kv", () => (out.kv = s.tapKv!), s.tapKvStated);
    fill("winding", () => (out.winding = s.winding), s.windingStated);
  }
  fill("tap", () => (out.tap = s.tapPoint), s.tapPointStated);
  if (s.octcWinding && s.tapKv != null) out.lineOctcKv = s.tapKv;
  if (s.regulation) fill("reg", () => (out.reg = s.regulation!), s.regulationStated);
  if (s.plus != null && s.minus != null) {
    // 2026-11-04 R3: a range guessed from "21 positions" or "16 steps" was echoed as stated.
    const typed = out.given.has("range") || out.given.has("pm") || out.given.has("positions");
    applyRange(out, s.plus, s.minus);
    if (!typed && !s.octcWinding && t.assumed.includes("range")) out.lineRangeAssumed = true;
  }
  if (s.stepPct != null) fill("stepPct", () => (out.stepPct = s.stepPct!));
  // 2026-11-04 R2: Um from a neutral BIL in the line is read, not typed: not given.
  if (s.earthUm != null) fill("earthUm", () => (out.earthUm = s.earthUm!), false);
}


export const CLI_HELP = `oltc — OLTC/OCTC type selection (package: oltc-selector, no prices)

Usage:
  oltc --iu 400 --um 72.5 --conn Y --reg W --pm 8
  oltc --mva 25 --kv 110 --tap neutral --reg W --pm 8
  oltc --mva 16 --kv 22 --tap line --winding star
  oltc --mva 125 --kind auto --hv 225 --mv 115 --tap junction
  oltc --line "125MVA 225±8x1,25%/115/35kV YNa0d11"
  oltc --octc --iu 800 --um 72.5 --conn D --series II --contact 6x5
  oltc --iu 600 --um 72.5 --conn Y --reg W --pm 8 --structure combined

Flags:
  --iu, --imax A     Max through-current (Imax). No safety factor.
                     Beside --mva, --imax means --os-imax.
  --os-imax A        Capacity path: the OS / maker Imax at the lowest tap.
                     Replaces the full-range current, floored at rated I.
  --line "text"      (also --nameplate) Tender line: MVA, kV ratio with ±N×x%, vector group.
                     Reads autotransformer from YNa0 / auto / OSFPSZ, delta
                     line end from D, star neutral from Y (asked in 假定).
                     Percent ranges (+0/-30%), single-phase, coarse/fine and
                     linear words are read. Flags given beside it win.
                     --line="…" keeps a line that starts with a dash.
  --mva MVA --kv kV  Capacity path: Imax from rated I, minus steps, --step-pct, --k
                     With --iu, --kv alone gives the winding voltage (220 kV
                     combined-only, 330 kV grade, --market) and Um if omitted.
  --kind two|auto    Transformer kind (--auto = --kind auto). Default two-winding.
  --tap P            Where the OLTC sits: neutral|line (two-winding),
                     junction|mv-line (autotransformer, series/common junction
                     or MV line lead). Capacity path; replaces --conn there.
  --winding star|delta  Tapped winding connection (two-winding). Sets the current
                     formula: star I = S/(√3U), delta I = S/(3U).
  --hv kV --mv kV    Autotransformer HV / MV rated voltage (with --kind auto).
  --earth-um kV      OLTC insulation to earth from the OS or maker (catalogue
                     class). Overrides the rule: line end = winding system,
                     neutral ≤72.5 full else 72.5 assumed, autotransformer = HV.
  --market CC        Buyer's country for a neutral's assumed Um: IT (line
                     class up to 252), TR (126 on 220 kV class and above).
                     Needs --kv (or --mva/--kv).
  --um kV            Equipment Um (OLTC). With --kv, derived if omitted.
  --ust V            Step voltage. With --mva/--kv/--step-pct, derived if omitted;
                     given, it is the OS figure and a floor (never lowers Ust).
  --across-li kV --across-ac kV
                     Stated across-tap-winding LI / AC withstand: sets the
                     selector grade (B/C/D/DE).
  --step-pct %       Step as percent (1.25 means 1.25%). Capacity path only.
  --k n              Safety factor on capacity path only (default 1.0, same as the web app).
  --conn Y|D         Switch connection (star point / line end). Default Y.
                     On the capacity path, legacy: Y = star neutral, D = delta line end.
  --reg W|G|0        Reversing / coarse-fine / linear. Default W.
  --pm N             ± steps. Default 8.
  --range +a/-b[xs%] Uneven range, e.g. +4/-12x1.25%. W/G takes the Fig. 3-3
                     row the maker sells (+4/-12 → 10193W); the lowest tap uses −b.
  --minus N          Minus steps for the lowest-tap current (beside --pm/--pos).
  --mid 1|3          Mid positions of the W/G diagram, when Fig. 3-3 has the pair.
  --pos, --positions Linear / OCTC positions.
  --octc             Off-circuit (无载). Default on-load. (--duty octc|oltc is the same.)
  --structure        auto|combined|compound|cage|drum  (组合式/复合式/笼式/鼓式)
  --series           II|IV|V|VI|VII|VIII  OCTC wiring. Default auto is linear IV (Y and D).
  --mount            in-tank|on-tank|dry|reactor. Default in-tank. Reactor is oil (HWDK).
  --oil / --vacuum   Switching medium. Default vacuum (on-load).
  --contact          OCTC contact e.g. 6x5.
  --phases           I|II|III. Default III.
  --json             Machine-readable result (still no prices). Keys: ok, version,
                     model, why, alts, cautions, resolved (the duty as numbers),
                     line, basis, umChoices, assumptions, errors. Errors are JSON too.
  --lang en|zh       Output language (default zh; OLTC_LANG=en also works).
  --version, -v      Print the version.
  --no-update-check  Skip the check for a newer version on each run. The check only
                     prints a notice on stderr; it never installs anything.
                     OLTC_NO_UPDATE_CHECK=1 or CI=1 also turn it off.
  -h, --help         This text. Also shown when no flag is given.

Every flag with a value also takes --flag=value. A flag that cannot take effect (--series
without --octc, --conn D with --tap neutral, a flag given twice) is an error.
Exit code: 0 a type was found, 1 no type or bad input.

Defaults match the web first paint: on-load, in-tank vacuum, structure auto,
±8 mid-3 reversing. Omitting --octc and --structure auto is minimum-adequate.
`;

/**
 * Where the OLTC sits. An autotransformer defaults to the series/common
 * junction on both paths; a delta winding has no neutral, so
 * `--winding delta` alone means line end.
 */
export function cliTapPoint(args: CliArgs): TapPoint {
  if (args.tap) return args.tap;
  if (args.kind === "auto") return "auto_junction";
  return args.conn === "D" || args.winding === "delta" ? "line_end" : "neutral";
}

/** True when the tap point, not a typed --conn, sets Y/D. */
function tapSetsConnection(args: CliArgs): boolean {
  return (
    args.mva != null ||
    args.tap != null ||
    args.kind === "auto" ||
    args.winding === "delta"
  );
}

/** Y/D the engine actually gets. */
export function cliConnection(args: CliArgs): Connection {
  if (!tapSetsConnection(args)) return args.conn;
  return cliTapPoint(args) === "neutral" ? "Y" : "D";
}

const pmGiven = (args: CliArgs): boolean =>
  args.given.has("pm") && args.pm != null && args.pm > 0;

/**
 * W/G ±N and mid. An explicit --pm wins (mid 3, as before); else a
 * brochure position count (--pos 23 → ±10 mid 3, --pos 17 → ±8 mid 1);
 * else the ±8 default. Null: a position count with no Fig. 3-3 row.
 */
function cliPlusMinus(args: CliArgs): { n: number; mid: 1 | 3 } | null {
  // --mid picks the diagram when it is a Fig. 3-3 pair; resolveTapFields
  // falls back to the brochure mid otherwise.
  if (pmGiven(args)) return { n: args.pm!, mid: args.mid ?? 3 };
  if (args.positions != null) {
    const own = args.mid ? lookupByPositions(args.positions, args.mid, args.reg) : null;
    if (own) return { n: own.plusMinus, mid: args.mid! };
    const n = plusMinusFromPositions(args.positions, args.reg);
    if (n == null) return null;
    const mid = lookupByPositions(args.positions, 3, args.reg) ? 3 : 1;
    return { n, mid };
  }
  if (args.given.has("pm")) return null; // --pm 0: no ±N, engine default
  return args.pm != null && args.pm > 0 ? { n: args.pm, mid: args.mid ?? 3 } : null;
}

/**
 * Minus steps for the lowest-tap current. A stated minus (--minus, --range,
 * an uneven --line) wins. Linear / OCTC follow the web range (positions =
 * plus + minus + 1, symmetric): --pos P → (P−1)/2, rounded up; --pm N → N.
 * With no range at all the ±8 default stays.
 */
function cliMinusSteps(args: CliArgs): number {
  if (args.minus != null && args.minus >= 0) return args.minus;
  const fromPositions =
    args.positions != null && args.positions > 1
      ? Math.ceil((args.positions - 1) / 2)
      : null;
  if (args.octc || args.reg === "linear") {
    if (fromPositions != null) return fromPositions;
    if (pmGiven(args)) return args.pm!;
    return 8;
  }
  const pm = cliPlusMinus(args);
  if (pm) return pm.n;
  return fromPositions ?? 8;
}

/** Linear positions: --pos, else 2N+1 from an explicit --pm. */
function cliLinearPositions(args: CliArgs): number | undefined {
  if (args.positions != null) return args.positions;
  if (pmGiven(args)) return Math.round(2 * args.pm! + 1);
  return undefined;
}

/** True when the --iu path names the winding voltage (--kv, or --hv/--mv on an auto). */
function iuHasVoltage(args: CliArgs): boolean {
  if (args.mva != null) return false;
  if (args.kind === "auto") {
    return args.hv != null && args.hv > 0 && args.mv != null && args.mv > 0;
  }
  return args.kv != null && args.kv > 0;
}

/**
 * Capacity path: transformer → duty. On the --iu path the same basis with no
 * MVA when the winding voltage is given (as the web form in current mode), so
 * the 220 kV combined-only rule, the 330 kV grade step and the TR practice see
 * the winding. Null on an --iu path with no voltage.
 */
const dutyCache = new WeakMap<CliArgs, DutyBasis | null>();

export function cliDuty(args: CliArgs): DutyBasis | null {
  if (dutyCache.has(args)) return dutyCache.get(args)!;
  const d = computeCliDuty(args);
  dutyCache.set(args, d);
  return d;
}

function computeCliDuty(args: CliArgs): DutyBasis | null {
  if (args.mva == null && !iuHasVoltage(args)) return null;
  const auto = args.kind === "auto";
  if (auto) {
    if (!(args.hv != null && args.hv > 0 && args.mv != null && args.mv > 0)) {
      throw new CliError("--kind auto with --mva needs --hv and --mv");
    }
  } else if (!(args.kv != null && args.kv > 0)) {
    throw new CliError("--mva requires --kv (tap-side rated voltage)");
  }
  const tap = cliTapPoint(args);
  // Legacy --conn D on the capacity path meant a delta winding (I = S/3U).
  const winding: WindingConnection =
    args.winding ?? (tap === "neutral" || args.conn === "Y" ? "star" : "delta");
  const pct =
    args.stepPct != null && args.stepPct > 0 ? args.stepPct / 100 : 0.0125;
  const earth =
    args.earthUm != null && args.earthUm > 0
      ? args.earthUm
      : args.um != null && args.um > 0
        ? args.um
        : undefined;
  return deriveDuty({
    kind: args.kind,
    tapPoint: tap,
    winding,
    mva: args.mva ?? 0,
    tapKv: args.kv ?? 0,
    hvKv: args.hv ?? 0,
    mvKv: args.mv ?? 0,
    minusSteps: cliMinusSteps(args),
    stepFraction: pct,
    // 2026-11-04 final ENGINE-12: a defaulted 1.25 % yields to the step --ust implies.
    stepFractionStated: args.given.has("stepPct"),
    // 与网页版首屏一致：容量路径默认不额外加安全系数
    safetyK: args.k != null && args.k > 0 ? args.k : 1.0,
    ...(earth != null ? { earthUmKv: earth } : {}),
    ...(args.osImax != null && args.osImax > 0 ? { statedMaxA: args.osImax } : {}),
    // --ust used to replace Ust after deriveDuty: basis.stepV disagreed (D3).
    ...(args.ust != null && args.ust > 0 ? { statedStepV: args.ust } : {}),
    ...(args.market ? { market: args.market } : {}),
  });
}

/**
 * 2026-11-13: flags that used to be dropped without a word. A flag that
 * cannot take effect is an error, so a wrong assumption never hides behind
 * a confident type string.
 */
function checkConflicts(args: CliArgs): void {
  const g = (k: string) => args.given.has(k);
  if (!args.octc) {
    if (g("series")) throw new CliError("--series is off-circuit wiring: add --octc");
    if (g("contact")) throw new CliError("--contact is an off-circuit contact: add --octc");
    if (args.structure === "cage" || args.structure === "drum") {
      throw new CliError(
        `--structure ${args.structure} is off-circuit: add --octc (on-load takes combined or compound)`,
      );
    }
  } else {
    if (args.structure === "combined" || args.structure === "compound") {
      throw new CliError(
        `--structure ${args.structure} is on-load only: with --octc use cage or drum`,
      );
    }
    if (g("medium") && args.vacuum) {
      throw new CliError("--vacuum does not apply with --octc (off-circuit switches do not break current)");
    }
  }
  if (g("medium") && args.oil && args.mount === "dry_type") {
    throw new CliError("--oil does not apply with --mount dry");
  }
  if (g("medium") && args.vacuum && args.mount === "reactor") {
    throw new CliError("--vacuum does not apply with --mount reactor (the reactor switch is oil)");
  }
  // Both typed: a tap point that --line read does not make a typed --conn an error.
  if (args.typed?.has("--conn") && args.typed.has("--tap") && args.conn === "D" && args.tap === "neutral") {
    throw new CliError("--conn D conflicts with --tap neutral: a neutral tap point is star (Y). Drop one.");
  }
  if (g("pm") && g("positions") && args.pm != null && args.positions != null) {
    // W/G: ±N has a mid-1 and a mid-3 diagram (±9 is 19 or 21 positions), and
    // ±7 G is sold on 17. Any of them agrees.
    const wg = () =>
      plusMinusFromPositions(args.positions!, args.reg) === args.pm ||
      ([1, 3] as const).some(
        (mid) =>
          resolveTapFields({ regulation: args.reg, plusMinusSteps: args.pm, midPositions: mid }).positions ===
          args.positions,
      );
    const fromPm = args.octc || args.reg === "linear" ? args.positions === 2 * args.pm + 1 : wg();
    if (!fromPm) {
      throw new CliError(
        `--pm ${args.pm} and --pos ${args.positions} disagree. Give one of them.`,
      );
    }
  }
}

export function cliToSelectInput(args: CliArgs): SelectInput {
  checkConflicts(args);
  const dutyKind: DutyKind = args.octc ? "octc" : "oltc";
  const oil = args.octc || args.oil || !args.vacuum || args.mount === "reactor";
  const medium: SwitchingMedium = args.mount === "dry_type"
    ? "dry"
    : oil
      ? "oil"
      : "oil_vacuum";

  let iu = args.iu;
  let um = args.um;
  let ust = args.ust ?? 0;

  // Two current sources used to resolve silently in favour of --mva.
  if (args.iu != null && args.mva != null) {
    throw new CliError("Give --iu or --mva/--kv, not both (the OS Imax beside --mva is --os-imax)");
  }
  if (args.osImax != null && args.mva == null) {
    throw new CliError("--os-imax needs --mva/--kv; on the --iu path give the current as --iu");
  }
  if (args.k != null && args.mva == null) {
    throw new CliError("--k applies only on the --mva path (--iu has no safety factor)");
  }
  if (args.k != null && args.k < 1) {
    throw new CliError("--k must be ≥ 1");
  }
  if (args.stepPct != null && args.mva == null) {
    throw new CliError("--step-pct needs --mva/--kv; give --ust on the --iu path");
  }

  if (args.market && args.mva == null && !iuHasVoltage(args)) {
    throw new CliError("--market needs the winding voltage: add --kv (or --mva/--kv)");
  }

  const duty = cliDuty(args);
  let conn = args.conn;
  if (duty && args.mva != null) {
    if (!duty.ok) throw new CliError((args.lang === "en" ? duty.errorEn : duty.errorZh) ?? duty.errorEn ?? "Bad transformer data");
    iu = duty.dutyA;
    if (um == null || !(um > 0)) um = duty.umKv;
    // duty.stepV already holds max(derived, --ust).
    if (duty.stepV != null) ust = duty.stepV;
    conn = duty.connection;
  } else {
    // --iu path: --tap, --kind auto (junction) or a delta winding set Y/D.
    // A given --kv only adds the voltage basis; the current stays --iu.
    if (duty && !duty.ok) throw new CliError((args.lang === "en" ? duty.errorEn : duty.errorZh) ?? duty.errorEn ?? "Bad transformer data");
    if (duty && (um == null || !(um > 0))) um = duty.umKv;
    conn = cliConnection(args);
    // 2026-11-13: with no winding voltage --earth-um was dropped. It is the Um.
    if (!duty && args.earthUm != null && args.earthUm > 0) {
      if (um != null && um > 0 && Math.abs(um - args.earthUm) > 0.01) {
        throw new CliError("Give --um or --earth-um, not both, when no winding voltage (--kv) is given");
      }
      um = args.earthUm;
    }
  }

  if (iu == null || !(iu > 0)) {
    throw new CliError("Need --iu (Imax) or --mva plus --kv");
  }
  if (um == null || !(um > 0)) {
    throw new CliError("Need --um, or --mva/--kv so Um can be derived");
  }

  const input: SelectInput = {
    mounting: args.mount,
    medium,
    preferVacuum: !oil && dutyKind === "oltc",
    dutyKind,
    phases: args.phases,
    connection: conn,
    ...(args.kind === "auto" ? { transformerKind: "auto" as const } : {}),
    ...(duty?.combinedOnly ? { combinedOnly: true } : {}),
    ...(duty?.ok && args.kind !== "auto" ? { tapWindingKv: duty.umSystemKv } : {}),
    // 2026-11-04 r3 ORDERS-11: buyer practice on the grade (TR 72.5C neutrals).
    ...(args.market ? { market: args.market } : {}),
    throughCurrentA: iu,
    umKv: um,
    stepVoltageV: ust,
    regulation: args.octc ? "linear" : args.reg,
    selectorSize: "auto",
    ...(args.acrossLi != null && args.acrossLi > 0 ? { acrossTapBilKv: args.acrossLi } : {}),
    ...(args.acrossAc != null && args.acrossAc > 0 ? { acrossTapPfKv: args.acrossAc } : {}),
    preferStructure: args.structure,
    mdu: "none",
  };

  if (args.octc) {
    input.octcSeries = args.series ?? "auto";
    if (args.contact) input.octcContact = args.contact;
    if (args.positions != null) input.positions = args.positions;
    else if (args.given.has("pm") && args.pm != null && args.pm > 0) {
      // 只从显式给的 --pm 推档数；pm 的解析默认值 8 是有载的概念，不能偷渡
      input.positions = Math.round(2 * args.pm + 1);
    }
  } else if (args.reg === "linear") {
    const pos = cliLinearPositions(args);
    if (pos != null) input.positions = pos;
  } else {
    // --pos used to lose to the parse default ±8 (--reg G --pos 27 → 10193G).
    const pm = cliPlusMinus(args);
    if (pm) {
      input.plusMinusSteps = pm.n;
      input.midPositions = pm.mid;
    }
    if (args.positions != null) input.positions = args.positions;
    // 10181W / 10183W: no Fig. 3-3 row, so the mid comes from the range or --mid.
    if (args.mid && input.plusMinusSteps == null) input.midPositions = args.mid;
  }

  return input;
}

const MOUNT_ZH: Record<Mounting, string> = {
  in_tank: "箱内",
  on_tank: "箱顶",
  dry_type: "干式",
  // CLI 不接收外置隔室，列上只为 Record 完整性
  external_compartment: "外置隔室",
  reactor: "电抗器",
};

/**
 * High/medium-risk effective inputs, with （默认） on the ones left silent.
 * The web form shows these as visible dropdowns; the CLI must echo them
 * so a wrong assumption never hides inside a confident type string.
 */
/** `family` is the primary's code, so auto wiring echoes what was emitted (WSG on D is II). */
export function assumptionsFromArgs(args: CliArgs, family?: string): string[] {
  const mark = (key: string) => (args.given.has(key) ? "" : "（默认）");
  const items: string[] = [];
  const tapZh: Record<TapPoint, string> = {
    neutral: "中性点",
    line_end: "线端",
    auto_junction: "串联/公共绕组连接点",
    auto_mv_line: "中压出线",
  };
  // 2026-11-04 R4: a delta the --line reader only guessed does not make its line end stated.
  const tapGiven =
    args.given.has("tap") || args.given.has("conn") || (args.winding === "delta" && (args.line == null || args.given.has("winding")));
  if (args.mva != null) {
    const duty = cliDuty(args);
    const tap = cliTapPoint(args);
    items.push(`${args.kind === "auto" ? "自耦变" : "双绕组"}${mark("kind")}`);
    if (!args.given.has("mva")) items.push(`容量 ${args.mva} MVA（默认）`);
    items.push(`开关在${tapZh[tap]}${tapGiven ? "" : "（默认）"}`);
    if (args.kind !== "auto") {
      const w = args.winding ?? (tap === "neutral" || args.conn === "Y" ? "star" : "delta");
      items.push(`${w === "star" ? "星形" : "角形"}绕组${args.given.has("winding") ? "" : "（默认）"}`);
      // 2026-11-04 R2: a tender line's guessed tapped winding was silent.
      if (args.kv != null && !args.given.has("kv")) items.push(`调压绕组 ${args.kv} kV（默认）`);
    }
    if (args.earthUm != null && !args.given.has("earthUm") && args.line?.neutralBilKv != null) {
      items.push(`对地 Um ${args.earthUm}（招标行中性点 BIL ${args.line.neutralBilKv} kV）`);
    }
    if (duty?.umAssumed) items.push(`对地 Um ${duty.umKv}（未指定）`);
    if (args.market) items.push(`市场=${args.market}`);
  } else {
    // Echo the Y/D the engine got, not the --conn default it replaced.
    const conn = cliConnection(args);
    const derived = tapSetsConnection(args);
    items.push(
      `conn=${conn} ${conn === "Y" ? "星点" : "线端"}${derived ? "" : mark("conn")}`,
    );
    if (args.kind === "auto") items.push("自耦变");
    if (derived) {
      items.push(
        `开关在${tapZh[cliTapPoint(args)]}${tapGiven ? "" : "（默认）"}`,
      );
    }
  }
  // 容量路径上 k 和 step-pct 也会静默生效，必须喊出来
  if (args.mva != null) {
    items.push(args.given.has("k") ? `k=${args.k}` : "k=1.0（默认）");
    items.push(
      args.given.has("stepPct") ? `step=${args.stepPct}%` : "step=1.25%（默认）",
    );
    // 2026-11-04: +4/−12 sold on 17 positions was sized as ±8; say the
    // lowest tap assumes a symmetric range when no minus was stated.
    if (!args.given.has("minus") && !args.given.has("range")) {
      items.push(`最低档按 −${cliMinusSteps(args)} 算（−档未指定，+a/−b 用 --range 或 --minus）`);
    }
    if (args.lineRangeAssumed && args.range) {
      const { plus, minus } = args.range;
      items.push(`调压范围 ${plus === minus ? `±${plus}` : `+${plus}/−${minus}`}（默认，招标行未写全）`);
    }
    if (args.lineOctcKv != null) {
      // 2026-11-04 R4: a range with no winding of its own takes the OLTC's: say it is a default.
      const guess = args.given.has("kv") ? "" : "默认，";
      items.push(`无载开关取 ${args.lineOctcKv} kV 绕组的范围（${guess}招标行有两个调压范围）`);
    }
  }
  // 2026-11-04 r2 ENGINE-1: echo the across-tap stress; one value alone keeps the Um default grade.
  if (args.given.has("acrossLi") || args.given.has("acrossAc")) {
    const li = args.acrossLi != null && args.acrossLi > 0 ? `LI ${args.acrossLi}` : "LI 未指定";
    const ac = args.acrossAc != null && args.acrossAc > 0 ? `AC ${args.acrossAc}` : "AC 未指定";
    const half = li.includes("未指定") !== ac.includes("未指定");
    items.push(`调压绕组间 ${li} / ${ac} kV${half ? "（只给一项：等级不低于 Um 默认）" : ""}`);
  }
  const phases = `相数=${args.phases}${mark("phases")}`;
  if (args.octc) {
    if (args.positions != null) {
      items.push(`${args.positions} 档`);
    } else if (args.given.has("pm") && args.pm != null && args.pm > 0) {
      items.push(`${Math.round(2 * args.pm + 1)} 档（由 ±${args.pm} 推）`);
    } else if (!args.given.has("contact")) {
      // 有 --contact 时档数由触头规格决定，不从有载的 ±8 偷
      items.push("档数未指定");
    }
    const s = args.series ?? "auto";
    items.push(
      s === "auto"
        ? `接线=自动（${octcRoman(args.conn, args.contact, undefined, family)}）${mark("series")}`
        : `接线=${s}${mark("series")}`,
    );
    items.push(`${MOUNT_ZH[args.mount]}${mark("mount")}`);
    items.push(phases);
    return items;
  }
  items.push(
    `reg=${
      args.reg === "reversing"
        ? "W 正反调"
        : args.reg === "coarse_fine"
          ? "G 粗细调"
          : "0 线性调"
    }${mark("reg")}`,
  );
  const uneven =
    args.range && args.range.plus !== args.range.minus
      ? `+${args.range.plus}/−${args.range.minus}`
      : null;
  if (args.reg === "linear") {
    items.push(
      args.positions != null
        ? `${args.positions} 档${uneven ? `（${uneven}）` : mark("positions")}`
        : pmGiven(args)
          ? `${cliLinearPositions(args)} 档（由 ±${args.pm} 推）`
          : "档数未指定",
    );
  } else if (uneven) {
    // +4/−12 → ±8 (10193W); +7/−10 → 18 档 (10181W).
    const pm = cliPlusMinus(args);
    items.push(
      `${uneven} 档 → ${args.positions != null && !pmGiven(args) ? `${args.positions} 档` : `±${pm?.n ?? args.pm}`}（最低档按 −${cliMinusSteps(args)}）`,
    );
  } else if (args.positions != null && !args.given.has("pm")) {
    const pm = cliPlusMinus(args);
    items.push(pm ? `${args.positions} 档（±${pm.n}）` : `${args.positions} 档`);
  } else {
    items.push(`±${args.pm ?? 8} 档${mark("pm")}`);
  }
  if (!args.given.has("ust") && args.mva == null) {
    items.push("Ust 未指定（级电压、级容量未校验）");
  }
  items.push(
    `${args.oil || !args.vacuum || args.mount === "reactor" ? "油浸" : "真空"}${mark("medium")}`,
  );
  items.push(`${MOUNT_ZH[args.mount]}${mark("mount")}`);
  items.push(phases);
  return items;
}

/** One-line 假定 block; null when every watched input was given explicitly. */
export function assumptionsLine(args: CliArgs, family?: string): string | null {
  const items = assumptionsFromArgs(args, family);
  if (items.every((i) => !i.includes("（默认）") && !i.includes("未指定"))) {
    return null;
  }
  return `假定：${items.join(" · ")}`;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** --lang en: the 假定 items in English (same facts, same order). */
const ASSUMPTION_EN: Array<[RegExp | string, string]> = [
  ["（默认，招标行未写全）", " (default; the line does not give it all)"],
  ["（默认）", " (default)"],
  ["（未指定）", " (not stated)"],
  ["（待 OS 核对）", " (check the OS)"],
  [/（只给一项：等级不低于 Um 默认）/, " (one value only: grade not below the Um default)"],
  [/^最低档按 −(\d+) 算（−档未指定，\+a\/−b 用 --range 或 --minus）$/, "lowest tap at −$1 (minus not stated; give +a/−b with --range or --minus)"],
  [/^无载开关取 ([\d.]+) kV 绕组的范围（(默认，)?招标行有两个调压范围）$/, "off-circuit range from the $1 kV winding (two ranges on the line)"],
  [/^对地 Um ([\d.]+)（招标行中性点 BIL ([\d.]+) kV）$/, "Um to earth $1 (line neutral BIL $2 kV)"],
  ["Ust 未指定（级电压、级容量未校验）", "Ust not stated (step voltage and capacity not checked)"],
  ["串联/公共绕组连接点", "series/common junction"],
  ["中压出线", "MV line lead"],
  ["开关在中性点", "tap at neutral"],
  ["开关在线端", "tap at line end"],
  ["开关在", "tap at "],
  ["自耦变", "autotransformer"],
  ["双绕组", "two-winding"],
  [/^容量 /, "power "],
  ["星形绕组", "star winding"],
  ["角形绕组", "delta winding"],
  [/^调压绕组间 /, "across tap winding "],
  [/^调压绕组 /, "tapped winding "],
  [/^调压范围 /, "range "],
  ["对地 Um", "Um to earth"],
  ["市场=", "market="],
  ["星点", "star point"],
  ["线端", "line end"],
  ["中性点", "neutral"],
  ["相数=", "phases="],
  ["接线=自动", "wiring=auto"],
  ["接线=", "wiring="],
  [/（由 ±([\d.]+) 推）/, " (from ±$1)"],
  [/（最低档按 −(\d+)）/, " (lowest tap at −$1)"],
  ["档数未指定", "positions not stated"],
  [/^±([\d.]+) 档/, "±$1 steps"],
  [/ 档/g, " positions"],
  ["W 正反调", "W reversing"],
  ["G 粗细调", "G coarse/fine"],
  ["0 线性调", "0 linear"],
  ["油浸", "oil"],
  ["真空", "vacuum"],
  ["箱内", "in tank"],
  ["箱顶", "on tank"],
  ["干式", "dry-type"],
  ["外置隔室", "external compartment"],
  ["电抗器", "reactor"],
  ["未指定", "not stated"],
  ["（", " ("],
  ["）", ")"],
  ["，", ", "],
];

export function assumptionEn(item: string): string {
  let s = item;
  for (const [from, to] of ASSUMPTION_EN) s = typeof from === "string" ? s.split(from).join(to) : s.replace(from, to);
  return s;
}

/** --lang en form of basisLineZh. */
export function basisLineEn(d: DutyBasis): string {
  const div = d.currentDivisor === "three" ? "3" : "√3";
  const um =
    d.umRule === "explicit"
      ? `Um to earth ${d.umKv} (stated)`
      : d.umRule === "neutral_assumed" || d.umRule === "neutral_full"
        ? `neutral Um ${d.umKv}${d.umAssumed ? " (check the OS)" : ""}`
        : `${d.umSystemKv} kV system Um ${d.actualUmKv} → class ${d.umKv}`;
  const ust = d.stepV == null ? "" : ` · Ust ${round1(d.stepV)} V`;
  const max = d.maxRule === "stated" ? "OS Imax" : "lowest tap";
  // --iu with --kv: the current is typed, only the voltage basis is derived.
  if (!(d.ratedA > 0)) return `Imax as given · ${um}`;
  return `I = S/(${div}×${d.currentKv} kV) = ${round1(d.ratedA)} A, ${max} ${round1(d.maxA)} A${ust} · ${um}`;
}

/** One line: where the current, Ust and Um came from. */
export function basisLineZh(d: DutyBasis): string {
  const div = d.currentDivisor === "three" ? "3" : "√3";
  const um =
    d.umRule === "explicit"
      ? `对地 Um ${d.umKv}（指定）`
      : d.umRule === "neutral_assumed" || d.umRule === "neutral_full"
        ? `中性点 Um ${d.umKv}${d.umAssumed ? "（待 OS 核对）" : ""}`
        : `${d.umSystemKv} kV 系统 Um ${d.actualUmKv} → ${d.umKv} 级`;
  const ust = d.stepV == null ? "" : ` · Ust ${round1(d.stepV)} V`;
  const max = d.maxRule === "stated" ? "OS Imax" : "最低档";
  if (!(d.ratedA > 0)) return `Imax 按给定值 · ${um}`;
  return `I = S/(${div}×${d.currentKv} kV) = ${round1(d.ratedA)} A，${max} ${round1(d.maxA)} A${ust} · ${um}`;
}

/**
 * Notes the CLI adds beside the engine's: a stated Um below the rule, a Um
 * that is not a catalogue class, a market with no rule.
 */
export function cliNotes(
  args: CliArgs | undefined,
  input: SelectInput,
  primaryUmKv: number | null,
  en: boolean,
  engineNotes: string[] = [],
): string[] {
  if (!args) return [];
  const notes: string[] = [];
  const duty = cliDuty(args);
  if (duty?.ok && duty.ruleUmKv != null && duty.umKv < duty.ruleUmKv - 0.01) {
    const already = duty.cautionsEn.some((c) => c.startsWith("Stated Um"));
    if (!already) {
      notes.push(
        en
          ? `Stated insulation to earth, Um ${duty.umKv} kV, is below the ${duty.ruleUmKv} kV the winding voltage gives. Check the order specification (OS).`
          : `指定对地绝缘 Um ${duty.umKv} kV 低于按绕组电压得出的 ${duty.ruleUmKv} kV，请核对订货规范。`,
      );
    }
  }
  // The engine already says so when it moved an off-circuit duty one class up.
  const classSaid = engineNotes.some((c) => /next class|上一级|下一级/.test(c));
  if (primaryUmKv != null && primaryUmKv > input.umKv + 0.01 && !classSaid) {
    notes.push(
      en
        ? `Um ${input.umKv} kV is not a class of this type: sized at Um ${primaryUmKv} kV.`
        : `Um ${input.umKv} kV 不是该型号的电压等级，按 Um ${primaryUmKv} kV 选。`,
    );
  }
  if (args.market && args.market !== "IT" && args.market !== "TR") {
    notes.push(
      en
        ? `--market ${args.market} has no rule (IT and TR only): not used.`
        : `--market ${args.market} 没有对应规则（只有 IT、TR），未使用。`,
    );
  }
  return notes;
}

/** The --line read-back, for text and JSON. */
function lineKindLabel(t: TenderLine, en: boolean): string {
  if (t.kind === "auto") return en ? "autotransformer" : "自耦变";
  if (t.voltagesKv.length >= 3) return en ? "three-winding" : "三绕组";
  return en ? "two-winding" : "双绕组";
}

/** What to try next when nothing fits. */
function noTypeHint(args: CliArgs | undefined, en: boolean): string | null {
  if (!args) return null;
  if (args.mount === "dry_type" && !args.octc && args.reg !== "linear" && !args.given.has("mid")) {
    return en
      ? "Dry-type switches stop at 17 positions: try --mid 1 (±8 → 17 positions) or fewer steps."
      : "干式开关最多 17 档：试 --mid 1（±8 为 17 档）或减少级数。";
  }
  return null;
}

export function formatCliText(input: SelectInput, args?: CliArgs): string {
  const out = selectOltc(input);
  const en = args?.lang === "en";
  if (!out.ok || !out.results.length) {
    const hint = noTypeHint(args, en);
    const err =
      [...(en ? out.errorsEn : [...out.errorsZh, ...out.errorsEn]), ...(hint ? [hint] : [])].join("\n") ||
      "No type found.";
    throw new CliError(err);
  }
  const primary = out.results[0]!;
  if (!commercialTypeExists(primary.model)) {
    throw new CliError(`Engine emitted a non-catalogue type: ${primary.model}`);
  }
  const alts = optionsWithInsurance(
    out.results,
    input.throughCurrentA,
    input.stepVoltageV,
    3,
    {
      acrossTapBilKv: input.acrossTapBilKv,
      acrossTapPfKv: input.acrossTapPfKv,
    },
  );
  const lines = [
    primary.model,
    en
      ? primary.reasonsEn[0] || "Lowest type that meets the duty"
      : primary.reasonsZh[0] || primary.reasonsEn[0] || "最低满足",
  ];
  const duty = args ? cliDuty(args) : null;
  const note = en ? "Note: " : "注意：";
  if (duty?.ok) lines.push(en ? `Basis: ${basisLineEn(duty)}` : `依据：${basisLineZh(duty)}`);
  for (const c of en ? primary.cautionsEn : primary.cautionsZh) lines.push(`${note}${c}`);
  for (const c of (en ? duty?.cautionsEn : duty?.cautionsZh) ?? []) lines.push(`${note}${c}`);
  for (const c of cliNotes(args, input, primary.umKv, en, [...primary.cautionsEn, ...primary.cautionsZh])) {
    lines.push(`${note}${c}`);
  }
  const choices = args && duty?.ok ? umChoicesFor(args, input) : [];
  if (choices.length > 1) {
    const list = choices.map((c) => `Um ${c.um} → ${c.model ?? (en ? "none" : "无")}`).join(" · ");
    lines.push(
      en
        ? `Insulation to earth open: ${list} (take it from the tender's neutral / tap-winding insulation; use --earth-um)`
        : `对地绝缘未定：${list}（按招标的中性点/调压绕组绝缘取，用 --earth-um）`,
    );
  }
  if (args?.line) {
    const t = args.line;
    const kind = lineKindLabel(t, en);
    const vg = t.vectorGroup ? ` · ${t.vectorGroup}` : en ? " · no vector group" : " · 无联结组";
    lines.push(`${en ? "Line: " : "招标行："}${kind} · ${t.mva} MVA · ${t.voltagesKv.join("/")} kV${vg}`);
    for (const w of t.warnings) lines.push(en ? `Note: line ${w}` : `注意：招标行 ${w}`);
  }
  if (alts.length) {
    lines.push("");
    lines.push(en ? "Other" : "其他");
    for (const a of alts) lines.push(a.model);
  }
  if (args) {
    const assumed = assumptionsLine(args, primary.seriesCode);
    if (assumed) {
      lines.push("");
      lines.push(en ? `Assumed: ${assumptionsFromArgs(args, primary.seriesCode).map(assumptionEn).join(" · ")}` : assumed);
    }
  }
  return lines.join("\n") + "\n";
}

export function formatCliJson(input: SelectInput, args?: CliArgs): string {
  const out = selectOltc(input);
  const primary = out.results[0] ?? null;
  // Same gate as the text output.
  if (primary && !commercialTypeExists(primary.model)) {
    throw new CliError(`Engine emitted a non-catalogue type: ${primary.model}`);
  }
  const alts = optionsWithInsurance(
    out.results,
    input.throughCurrentA,
    input.stepVoltageV,
    3,
    {
      acrossTapBilKv: input.acrossTapBilKv,
      acrossTapPfKv: input.acrossTapPfKv,
    },
  ).map((r) => r.model);
  const en = args?.lang === "en";
  const dutyJ = args ? cliDuty(args) : null;
  const hint = out.ok ? null : noTypeHint(args, en);
  const payload = {
    ok: out.ok && primary != null,
    version: APP_VERSION,
    model: primary?.model ?? null,
    why: en ? (primary?.reasonsEn[0] ?? null) : (primary?.reasonsZh[0] ?? primary?.reasonsEn[0] ?? null),
    alts,
    cautions: en
      ? [...(primary?.cautionsEn ?? []), ...(dutyJ?.cautionsEn ?? []), ...cliNotes(args, input, primary?.umKv ?? null, true, primary?.cautionsEn)]
      : [...(primary?.cautionsZh ?? []), ...(dutyJ?.cautionsZh ?? []), ...cliNotes(args, input, primary?.umKv ?? null, false, primary?.cautionsZh)],
    // What the engine was asked, as numbers: no prose to parse.
    resolved: {
      dutyKind: input.dutyKind,
      throughCurrentA: round1(input.throughCurrentA),
      umKv: input.umKv,
      stepVoltageV: round1(input.stepVoltageV),
      connection: input.connection,
      phases: input.phases,
      regulation: input.regulation,
      plusMinusSteps: input.plusMinusSteps ?? null,
      positions: input.positions ?? null,
      mounting: input.mounting,
      medium: input.medium,
    },
    line: args?.line
      ? {
          kind: lineKindLabel(args.line, true),
          mva: args.line.mva,
          voltagesKv: args.line.voltagesKv,
          vectorGroup: args.line.vectorGroup ?? null,
          warnings: args.line.warnings,
        }
      : null,
    basis: (() => {
      const d = dutyJ;
      return d?.ok
        ? {
            connection: d.connection,
            ratedA: d.ratedA > 0 ? round1(d.ratedA) : null,
            maxA: d.maxA > 0 ? round1(d.maxA) : null,
            maxRule: d.maxRule,
            stepV: d.stepV == null ? null : round1(d.stepV),
            umSystemKv: d.umSystemKv,
            actualUmKv: d.actualUmKv,
            umKv: d.umKv,
            umRule: d.umRule,
            umAssumed: d.umAssumed,
          }
        : null;
    })(),
    umChoices: args ? umChoicesFor(args, input) : [],
    assumptions: args
      ? assumptionsFromArgs(args, primary?.seriesCode).map((a) => (en ? assumptionEn(a) : a))
      : [],
    errors: [...(en ? out.errorsEn : out.errorsZh.length ? out.errorsZh : out.errorsEn), ...(hint ? [hint] : [])],
  };
  return JSON.stringify(payload, null, 2) + "\n";
}

/** The primary type at each open Um class (empty when Um is settled). */
export function umChoicesFor(
  args: CliArgs,
  input: SelectInput,
): Array<{ um: number; model: string | null }> {
  const d = cliDuty(args);
  if (!d?.ok) return [];
  const tap = cliTapPoint(args);
  const spec = {
    kind: args.kind,
    tapPoint: tap,
    winding: args.winding ?? (tap === "neutral" ? "star" : "delta"),
    mva: args.mva ?? 0,
    tapKv: args.kv ?? 0,
    hvKv: args.hv ?? 0,
    mvKv: args.mv ?? 0,
    minusSteps: 0,
    stepFraction: null,
    safetyK: 1,
  } as const;
  return umChoices(d, spec).map((um) => ({
    um,
    model: selectOltc({ ...input, umKv: um }).results[0]?.model ?? null,
  }));
}

/** Exit codes: 0 a type was found (or help / version), 1 no type or bad input. */
export function runCli(
  argv: string[],
  io: { stdout: (s: string) => void; stderr: (s: string) => void } = {
    stdout: (s) => process.stdout.write(s),
    stderr: (s) => process.stderr.write(s),
  },
): number {
  // The value of --line may itself be "-h"; anything else asking for help gets it.
  const asksHelp = argv.some(
    (a, i) => (a === "-h" || a === "--help") && argv[i - 1] !== "--line" && argv[i - 1] !== "--nameplate",
  );
  const selecting = argv.filter((a) => a !== "--no-update-check");
  if (asksHelp || selecting.length === 0) {
    io.stdout(CLI_HELP);
    return 0;
  }
  const wantsJson = argv.includes("--json");
  try {
    const args = parseCliArgs(argv);
    if (args.version) {
      io.stdout(`oltc-selector ${APP_VERSION}\n`);
      return 0;
    }
    const input = cliToSelectInput(args);
    if (args.json) {
      const text = formatCliJson(input, args);
      io.stdout(text);
      return (JSON.parse(text) as { ok: boolean }).ok ? 0 : 1;
    }
    io.stdout(formatCliText(input, args));
    return 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // 2026-11-13: under --json an error is JSON too, so a caller never parses prose.
    if (wantsJson) {
      io.stdout(
        JSON.stringify({ ok: false, version: APP_VERSION, model: null, errors: msg.split("\n") }, null, 2) + "\n",
      );
    }
    io.stderr(msg.endsWith("\n") ? msg : msg + "\n");
    return 1;
  }
}
