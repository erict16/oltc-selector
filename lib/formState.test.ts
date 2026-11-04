import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { cliToSelectInput, parseCliArgs } from "./cli";
import { selectOltc } from "./engine";
import {
  INITIAL_FORM,
  commitRange,
  formDiff,
  formSelectInput,
  readLine,
  stepMovesRange,
  toOctc,
  toOltc,
  type FormState,
} from "./formState";

type Pick1 = { model: string | null; I: number | null; err?: string };

function cli(argv: string[]): Pick1 {
  try {
    const inp = cliToSelectInput(parseCliArgs([...argv, "--no-update-check"]));
    const out = selectOltc(inp);
    return { model: out.ok ? (out.results[0]?.model ?? null) : null, I: inp.throughCurrentA };
  } catch (e) {
    return { model: null, I: null, err: (e as Error).message };
  }
}

function web(f: FormState): Pick1 {
  const r = formSelectInput(f);
  if (!r.ok) return { model: null, I: null, err: "msgKey" in r ? r.msgKey : r.duty.errorEn };
  const out = selectOltc(r.input);
  return { model: out.ok ? (out.results[0]?.model ?? null) : null, I: r.input.throughCurrentA };
}

const read = (f: FormState, line: string) => readLine(f, line);

describe("UI-1: an OS figure belongs to one tender line", () => {
  it("clears OS Imax / Ust on the next read (59 → 61 MVA kept 346 A on a 350 A switch)", () => {
    let f = read(INITIAL_FORM, "59MVA 110±8x1.25%/10.5kV YNd11");
    f = { ...f, osImaxA: 346, osUstV: 900 };
    f = read(f, "61MVA 110±8x1.25%/10.5kV YNd11");
    expect(f.osImaxA).toBe(0);
    expect(f.osUstV).toBe(0);
    const w = web(f);
    const c = cli(["--line", "61MVA 110±8x1.25%/10.5kV YNd11"]);
    expect(w.model).toBe("CV2III-600Y/72.5-10193W");
    expect(w.model).toBe(c.model);
    expect(w.I).toBeCloseTo(c.I!, 6);
  });

  it("40 → 63 MVA with 250 A typed: the new line is sized on its own current", () => {
    let f = read(INITIAL_FORM, "40MVA 110±8x1.25%/10.5kV YNd11");
    f = { ...f, osImaxA: 250 };
    f = read(f, "63MVA 110±8x1.25%/10.5kV YNd11");
    const c = cli(["--line", "63MVA 110±8x1.25%/10.5kV YNd11"]);
    expect(web(f)).toEqual(c);
  });

  it("clears them when 有载/无载 moves the tap to another winding", () => {
    let f = read(INITIAL_FORM, "40MVA 115±8x1.25%/38.5±2x2.5%/11kV YNyn0d11");
    f = { ...f, osImaxA: 230 };
    f = toOctc(f);
    expect(f.windingRatedKv).toBe(38.5);
    expect(f.osImaxA).toBe(0);
  });
});

describe("UI-2: 无载 first paint", () => {
  it("is the CLI's 6x5A on −8, not 9x8B", () => {
    const f = toOctc(INITIAL_FORM);
    const c = cli(["--mva", "25", "--kv", "110", "--octc"]);
    expect(web(f).model).toBe("WSLIV-600Y/72.5-6x5A");
    expect(web(f)).toEqual(c);
    expect([f.tapPlus, f.tapMinus]).toEqual([2, 2]);
    expect(f.input.positions).toBe(5);
    expect(f.input.midPositions).toBe(0);
    expect(f.input.regulation).toBe("linear");
  });

  it("series V and VIII give a type, as the CLI", () => {
    const f = toOctc(INITIAL_FORM);
    for (const [ser, want] of [
      ["V", "3xWDGV-800/72.5-6x5B"],
      ["VIII", "WSLVIII-600/72.5-5x2A"],
    ] as const) {
      const g = { ...f, input: { ...f.input, octcSeries: ser } };
      expect(web(g).model).toBe(want);
      expect(web(g).model).toBe(cli(["--mva", "25", "--kv", "110", "--octc", "--series", ser]).model);
    }
  });

  it("a step % change keeps the untouched ±2 a display (duty stays on −8)", () => {
    const f = toOctc(INITIAL_FORM);
    expect(stepMovesRange(f)).toBe(false);
    const g = { ...f, stepPercentPct: 2.5 };
    expect(web(g)).toEqual(cli(["--mva", "25", "--kv", "110", "--octc", "--step-pct", "2.5"]));
  });

  it("a +/− picked in 无载 drives the duty", () => {
    const f = commitRange(toOctc(INITIAL_FORM), 3, 3, 1.25);
    expect(f.input.positions).toBe(7);
    expect(web(f)).toEqual(cli(["--mva", "25", "--kv", "110", "--octc", "--pm", "3"]));
  });

  it("无载 → 有载 puts ±8 back (linear started at ±2 after the visit)", () => {
    const f = toOltc(toOctc(INITIAL_FORM));
    expect([f.tapPlus, f.tapMinus, f.pm, f.tapRange]).toEqual([8, 8, "8", null]);
    // The 接线方式 choice is kept for the next visit; the engine ignores it on-load.
    const { octcSeries, ...rest } = f.input;
    expect(octcSeries).toBe("auto");
    expect(rest).toEqual(INITIAL_FORM.input);
    expect(web(f)).toEqual(web(INITIAL_FORM));
  });

  it("有载 regulation G comes back after 无载", () => {
    const g: FormState = {
      ...INITIAL_FORM,
      input: { ...INITIAL_FORM.input, regulation: "coarse_fine" },
    };
    expect(toOltc(toOctc(g)).input.regulation).toBe("coarse_fine");
  });

  it("a picked ±5 stays ±5 in 无载 (11 positions, −5)", () => {
    const g: FormState = { ...INITIAL_FORM, pm: "5", tapPlus: 5, tapMinus: 5 };
    const f = toOctc(g);
    expect([f.tapPlus, f.tapMinus, f.input.positions]).toEqual([5, 5, 11]);
    expect(web(f)).toEqual(cli(["--mva", "25", "--kv", "110", "--octc", "--pm", "5"]));
  });
});

// Every tender line in the reader and CLI tests, plus the eight that differed.
const testSrc =
  readFileSync(resolve(__dirname, "nameplate.test.ts"), "utf8") +
  readFileSync(resolve(__dirname, "cli.test.ts"), "utf8");
const LINES = new Set<string>([
  "25 MVA 110/10.5 kV YNd11",
  "250 MVA, 220 kV",
  "80 MVA, 220 kV",
  "30 MVA, 66 kV, Dyn11, 16 steps, I 151.5 / Imax 181.5 A, Ust 1089 V (1.65%)",
  "20 MVA, 33 kV, Dyn11, 16 steps, I 202 / Imax 241.9 A, Ust 544.5 V (1.65%)",
  "75 MVA, 220 kV; oil CM quoted",
  "5 MVA 20/0.4 kV ±5% Dyn11",
]);
for (const m of testSrc.matchAll(/parseTenderLine\(\s*"([^"]+)"/g)) LINES.add(m[1]);
for (const m of testSrc.matchAll(/"--line",\s*"([^"]+)"/g)) LINES.add(m[1]);

describe("UI-3: a line with no range read in 无载", () => {
  it("'25 MVA 110/10.5 kV YNd11' gives 6x5A as the CLI, read in 无载 or before it", () => {
    const L = "25 MVA 110/10.5 kV YNd11";
    const c = cli(["--line", L, "--octc"]);
    expect(c.model).toBe("WSLIV-600Y/72.5-6x5A");
    expect(web(read(toOctc(INITIAL_FORM), L))).toEqual(c);
    expect(web(toOctc(read(INITIAL_FORM, L)))).toEqual(c);
  });

  it("T19 '5 MVA 20/0.4 kV ±5% Dyn11' gives WSGII-300D/40.5-4x5A", () => {
    const L = "5 MVA 20/0.4 kV ±5% Dyn11";
    expect(web(read(toOctc(INITIAL_FORM), L)).model).toBe("WSGII-300D/40.5-4x5A");
  });

  it("web equals the CLI on every test line, on-load and 无载, read either side of the switch", () => {
    expect(LINES.size).toBeGreaterThan(60);
    const bad: string[] = [];
    for (const line of LINES) {
      const on = read(INITIAL_FORM, line);
      if (on.lineFailed) continue; // the CLI refuses these too (reader tests)
      const cOn = cli(["--line", line]);
      const cOff = cli(["--line", line, "--octc"]);
      const runs: Array<[string, FormState, Pick1]> = [
        ["on-load", on, cOn],
        ["无载 then read", read(toOctc(INITIAL_FORM), line), cOff],
        ["read then 无载", toOctc(on), cOff],
        ["无载, read, 有载", toOltc(read(toOctc(INITIAL_FORM), line)), cOn],
        ["read, 无载, 有载", toOltc(toOctc(on)), cOn],
      ];
      for (const [tag, f, c] of runs) {
        const w = web(f);
        if (w.model !== c.model || (c.I != null && w.I != null && Math.abs(w.I - c.I) > 1e-6)) {
          bad.push(`${tag} | ${line} | web ${w.model} ${w.I?.toFixed(1)} | cli ${c.model} ${c.I?.toFixed(1)}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});

describe("UI-4: 有载/无载 after a read re-maps the line", () => {
  const two = "40MVA 115±8x1.25%/38.5±2x2.5%/11kV YNyn0d11";

  it("(a) read in 无载, then 有载: back on the 115 kV ±8 winding", () => {
    let f = read(toOctc(INITIAL_FORM), two);
    expect(web(f).model).toBe("3xWDGIV-800/40.5-5x5A");
    f = toOltc(f);
    expect(f.windingRatedKv).toBe(115);
    expect(web(f).model).toBe("CV2III-350Y/72.5-10193W");
    expect(web(f)).toEqual(cli(["--line", two]));
  });

  it("(b) read on-load, then 无载: on the 38.5 kV ±2 winding", () => {
    let f = read(INITIAL_FORM, two);
    expect(web(f).model).toBe("CV2III-350Y/72.5-10193W");
    f = toOctc(f);
    expect(f.windingRatedKv).toBe(38.5);
    expect(f.stepPercentPct).toBe(2.5);
    expect(web(f).model).toBe("3xWDGIV-800/40.5-5x5A");
    expect(web(f)).toEqual(cli(["--line", two, "--octc"]));
  });

  it("(c) uneven line read in 无载, then 有载: W 10193W, not linear 17", () => {
    const L = "20MVA 69+4-12x1.25%/13.8kV Dyn1";
    const f = toOltc(read(toOctc(INITIAL_FORM), L));
    expect(f.input.regulation).toBe("reversing");
    expect(web(f).model).toBe("CV2III-350D/72.5-10193W");
    expect(web(f)).toEqual(cli(["--line", L]));
  });

  it("keeps MVA and phases the user changed after the read", () => {
    let f = read(INITIAL_FORM, two);
    f = { ...f, transformerMva: 50, input: { ...f.input, phases: "I" } };
    f = toOctc(f);
    expect(f.transformerMva).toBe(50);
    expect(f.input.phases).toBe("I");
  });

  it("keeps a range the user picked after the read when the winding stays", () => {
    let f = read(INITIAL_FORM, "25 MVA 110±8x1.25%/10.5 kV YNd11");
    f = commitRange({ ...f, pm: "" }, 6, 6, 1.25);
    f = toOctc(f);
    expect([f.tapPlus, f.tapMinus, f.input.positions]).toEqual([6, 6, 13]);
  });
});

describe("UI-5: autotransformer line without MV", () => {
  it("shows the HV/MV fields and no type", () => {
    const f = read(INITIAL_FORM, "OSFPSZ-250000/220 220±8x1.25%");
    expect(f.lineFailed).toBe("lineFailAutoMv");
    expect(f.kind).toBe("auto");
    expect(f.tapPoint).toBe("auto_junction");
    expect(f.transformerMva).toBe(250);
    expect(f.hvKv).toBe(220);
    expect(f.mvKv).toBe(0);
    expect(web(f).model).toBeNull();
    expect(cli(["--line", "OSFPSZ-250000/220 220±8x1.25%"]).model).toBeNull();
  });

  it("filling MV then sizes the line's ±8 × 1.25 %, as the CLI with --mv", () => {
    let f = read({ ...INITIAL_FORM, stepPercentPct: 2.5, pm: "10" }, "OSFPSZ-250000/220 220±8x1.25%");
    f = { ...f, mvKv: 110 };
    expect(web(f)).toEqual(
      cli(["--mva", "250", "--kind", "auto", "--hv", "220", "--mv", "110", "--tap", "junction", "--pm", "8", "--step-pct", "1.25"]),
    );
  });
});

describe("formDiff", () => {
  it("lists only what changed, input field by field", () => {
    const f = toOctc(INITIAL_FORM);
    const d = formDiff(INITIAL_FORM, f);
    expect(d.pm).toBeUndefined();
    expect(d.tapPlus).toBe(2);
    expect(d.input?.dutyKind).toBe("octc");
    expect("plusMinusSteps" in (d.input ?? {})).toBe(true);
    expect(d.input?.mounting).toBeUndefined();
    expect(formDiff(f, f)).toEqual({});
  });
});
