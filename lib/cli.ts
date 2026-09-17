import {
  maxThroughCurrent,
  oltcUmFromRatedKv,
  stepVoltageFromPercent,
  throughCurrentFromRated,
} from "./deriveUm";
import { pickOtherOptions, selectOltc } from "./engine";
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
  iu?: number;
  mva?: number;
  kv?: number;
  um?: number;
  ust?: number;
  stepPct?: number;
  k?: number;
  conn: Connection;
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
  /** flags the user actually passed; everything else is a silent default */
  given: Set<string>;
};

export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliError";
  }
}

function num(raw: string, flag: string): number {
  const n = Number(String(raw).replace(",", "."));
  if (!Number.isFinite(n)) throw new CliError(`Invalid number for ${flag}: ${raw}`);
  return n;
}

export function parseCliArgs(argv: string[]): CliArgs {
  const out: CliArgs = {
    conn: "Y",
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
    if (v == null || v.startsWith("-")) {
      throw new CliError(`Missing value for ${flag}`);
    }
    return [v, i + 1];
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "-h" || a === "--help") {
      out.help = true;
      continue;
    }
    if (a === "--json") {
      out.json = true;
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
      out.given.add("iu");
      const [v, n] = take(i, a);
      out.iu = num(v, a);
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
      out.ust = num(v, a);
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
      i = n;
      continue;
    }
    if (a === "--positions" || a === "--pos") {
      out.given.add("positions");
      const [v, n] = take(i, a);
      out.positions = num(v, a);
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
      if (!(s in map) && !(v in map)) {
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
      else throw new CliError(`--mount must be in-tank|on-tank|dry`);
      i = n;
      continue;
    }
    if (a === "--contact") {
      out.given.add("contact");
      const [v, n] = take(i, a);
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
    throw new CliError(`Unknown flag: ${a}`);
  }
  return out;
}

export const CLI_HELP = `oltc — Huaming OLTC/OCTC type selection (package: oltc-selector, no prices)

Usage:
  oltc --iu 400 --um 72.5 --conn Y --reg W --pm 8
  oltc --mva 25 --kv 110 --conn Y --reg W --pm 8
  oltc --octc --iu 800 --um 72.5 --conn D --series II --contact 6x5
  oltc --iu 600 --um 72.5 --conn Y --reg W --pm 8 --structure combined

Flags:
  --iu, --imax A     Max through-current (Imax). No safety factor.
  --mva MVA --kv kV  Capacity path: Imax from rated I, minus steps, --step-pct, --k
  --um kV            Equipment Um (OLTC). With --mva/--kv, derived if omitted.
  --ust V            Step voltage. With --mva/--kv/--step-pct, derived if omitted.
  --step-pct %       Step as percent (1.25 means 1.25%). Capacity path only.
  --k n              Safety factor on capacity path only (default 1.2).
  --conn Y|D         Switch connection (star / delta). Default Y.
  --reg W|G|0        Reversing / coarse-fine / linear. Default W.
  --pm N             ± steps. Default 8.
  --pos, --positions Linear / OCTC positions.
  --octc             Off-circuit (无载). Default on-load.
  --structure        auto|combined|compound|cage|drum  (组合式/复合式/笼式/鼓式)
  --series           II|IV|V|VI|VII|VIII  OCTC wiring. Default auto (Y→IV, D→II).
  --mount            in-tank|on-tank|dry. Default in-tank.
  --oil / --vacuum   Switching medium. Default vacuum (on-load).
  --contact          OCTC contact e.g. 6x5.
  --phases           I|II|III. Default III.
  --json             Machine-readable result (still no prices).
  -h, --help         This text.

Defaults match the web first paint: on-load, in-tank vacuum, structure auto,
±8 mid-3 reversing. Omitting --octc and --structure auto is minimum-adequate.
`;

export function cliToSelectInput(args: CliArgs): SelectInput {
  const dutyKind: DutyKind = args.octc ? "octc" : "oltc";
  const oil = args.octc || args.oil || !args.vacuum;
  const medium: SwitchingMedium = args.mount === "dry_type"
    ? "dry"
    : oil
      ? "oil"
      : "oil_vacuum";

  let iu = args.iu;
  let um = args.um;
  let ust = args.ust ?? 0;

  if (args.mva != null) {
    if (!(args.kv != null && args.kv > 0)) {
      throw new CliError("--mva requires --kv (tap-side rated voltage)");
    }
    const rated = throughCurrentFromRated(args.mva, args.kv, args.conn);
    if (!Number.isFinite(rated) || rated <= 0) {
      throw new CliError("Could not compute rated current from --mva/--kv");
    }
    const pct =
      args.stepPct != null && args.stepPct > 0 ? args.stepPct / 100 : 0.0125;
    const minus = args.pm != null && args.pm > 0 ? args.pm : 8;
    const iMax = maxThroughCurrent(rated, minus, pct);
    const k = args.k != null && args.k > 0 ? args.k : 1.2;
    iu = iMax * k;
    if (um == null || !(um > 0)) {
      um = oltcUmFromRatedKv(args.kv, args.conn);
    }
    if (!(ust > 0)) {
      const v = stepVoltageFromPercent(args.kv, pct, args.conn);
      if (Number.isFinite(v) && v > 0) ust = v;
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
    connection: args.conn,
    throughCurrentA: iu,
    umKv: um,
    stepVoltageV: ust,
    regulation: args.octc ? "linear" : args.reg,
    selectorSize: "auto",
    preferStructure: args.structure,
    mdu: "none",
  };

  if (args.octc) {
    input.octcSeries = args.series ?? "auto";
    if (args.contact) input.octcContact = args.contact;
    if (args.positions != null) input.positions = args.positions;
    else if (args.pm != null && args.pm > 0) {
      input.positions = Math.round(2 * args.pm + 1);
    }
  } else if (args.reg === "linear") {
    if (args.positions != null) input.positions = args.positions;
  } else {
    if (args.pm != null && args.pm > 0) {
      input.plusMinusSteps = args.pm;
      input.midPositions = 3;
    }
    if (args.positions != null) input.positions = args.positions;
  }

  return input;
}

const MOUNT_ZH: Record<Mounting, string> = {
  in_tank: "箱内",
  on_tank: "箱顶",
  dry_type: "干式",
  // CLI 不会接收这两种，列上只为 Record 完整性
  external_compartment: "外置隔室",
  reactor: "电抗器",
};

/**
 * High/medium-risk effective inputs, with （默认） on the ones left silent.
 * The web form shows these as visible dropdowns; the CLI must echo them
 * so a wrong assumption never hides inside a confident type string.
 */
export function assumptionsFromArgs(args: CliArgs): string[] {
  const mark = (key: string) => (args.given.has(key) ? "" : "（默认）");
  const items: string[] = [
    `conn=${args.conn} ${args.conn === "Y" ? "星点" : "线端"}${mark("conn")}`,
  ];
  if (args.octc) {
    const pos =
      args.positions ??
      (args.pm != null && args.pm > 0 ? Math.round(2 * args.pm + 1) : null);
    items.push(pos != null ? `${pos} 档${mark("positions")}` : "档数未指定");
    const s = args.series ?? "auto";
    items.push(
      s === "auto"
        ? `接线=自动（${args.conn === "Y" ? "IV" : "II"}）${mark("series")}`
        : `接线=${s}${mark("series")}`,
    );
    items.push(`${MOUNT_ZH[args.mount]}${mark("mount")}`);
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
  if (args.reg === "linear") {
    items.push(
      args.positions != null
        ? `${args.positions} 档${mark("positions")}`
        : "档数未指定",
    );
  } else {
    items.push(`±${args.pm ?? 8} 档${mark("pm")}`);
  }
  items.push(`${args.oil || !args.vacuum ? "油浸" : "真空"}${mark("medium")}`);
  items.push(`${MOUNT_ZH[args.mount]}${mark("mount")}`);
  return items;
}

/** One-line 假定 block; null when every watched input was given explicitly. */
export function assumptionsLine(args: CliArgs): string | null {
  const items = assumptionsFromArgs(args);
  if (items.every((i) => !i.includes("（默认）") && !i.includes("未指定"))) {
    return null;
  }
  return `假定：${items.join(" · ")}`;
}

export function formatCliText(input: SelectInput, args?: CliArgs): string {
  const out = selectOltc(input);
  if (!out.ok || !out.results.length) {
    const err = [...out.errorsZh, ...out.errorsEn].join("\n") || "No type found.";
    throw new CliError(err);
  }
  const primary = out.results[0]!;
  if (!commercialTypeExists(primary.model)) {
    throw new CliError(`Engine emitted a non-catalogue type: ${primary.model}`);
  }
  const alts = pickOtherOptions(out.results, 3);
  const lines = [
    primary.model,
    primary.reasonsZh[0] || primary.reasonsEn[0] || "最低满足",
  ];
  if (alts.length) {
    lines.push("");
    lines.push("其他");
    for (const a of alts) lines.push(a.model);
  }
  if (args) {
    const assumed = assumptionsLine(args);
    if (assumed) {
      lines.push("");
      lines.push(assumed);
    }
  }
  return lines.join("\n") + "\n";
}

export function formatCliJson(input: SelectInput, args?: CliArgs): string {
  const out = selectOltc(input);
  const primary = out.results[0] ?? null;
  const alts = pickOtherOptions(out.results, 3).map((r) => r.model);
  const payload = {
    ok: out.ok,
    model: primary?.model ?? null,
    why: primary?.reasonsZh[0] ?? primary?.reasonsEn[0] ?? null,
    alts,
    assumptions: args ? assumptionsFromArgs(args) : [],
    errors: out.errorsZh.length ? out.errorsZh : out.errorsEn,
  };
  return JSON.stringify(payload, null, 2) + "\n";
}

export function runCli(
  argv: string[],
  io: { stdout: (s: string) => void; stderr: (s: string) => void } = {
    stdout: (s) => process.stdout.write(s),
    stderr: (s) => process.stderr.write(s),
  },
): number {
  try {
    const args = parseCliArgs(argv);
    if (args.help) {
      io.stdout(CLI_HELP);
      return 0;
    }
    const input = cliToSelectInput(args);
    io.stdout(args.json ? formatCliJson(input, args) : formatCliText(input, args));
    return 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    io.stderr(msg.endsWith("\n") ? msg : msg + "\n");
    return 1;
  }
}
