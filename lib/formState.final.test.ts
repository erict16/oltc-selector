/**
 * 2026-11-04 final audit, web track (UI-12 … UI-15): every repro in
 * .audit/final-findings.json for these ids is one test here, plus a property
 * test: no sequence of reads and switches leaves a stale value in the duty.
 */
import { describe, expect, it } from "vitest";
import { cliToSelectInput, parseCliArgs } from "./cli";
import { selectOltc } from "./engine";
import { AUDIT_CASE_LINES } from "./formState.cases.fixtures";
import {
  INITIAL_FORM,
  commitRange,
  editStepPct,
  formSelectInput,
  pickKind,
  pickPhases,
  pickPm,
  pickRegulation,
  readLine,
  toOctc,
  toOltc,
  type FormState,
} from "./formState";
import type { TransformerKind } from "./transformer";
import type { Regulation } from "./types";

type Pick1 = { model: string | null; I: number | null; um?: number; err?: string };

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
  return { model: out.ok ? (out.results[0]?.model ?? null) : null, I: r.input.throughCurrentA, um: r.input.umKv };
}

const expectSame = (w: Pick1, c: Pick1) => {
  expect(w.model).toBe(c.model);
  expect(w.I).toBeCloseTo(c.I!, 1);
};

describe("UI-12: 调压方式 keeps an even live range", () => {
  const X0 = "27 MVA 33±10x2.5%/11 kV Dyn11 linear";

  it("±10 linear line → W: CV2III-600D/40.5-12233W at 363.6 A, as the CLI (was ±8, 350 A)", () => {
    const f = readLine(INITIAL_FORM, X0);
    expect(web(f).model).toBeNull();
    expect(web(f).I).toBeCloseTo(363.6, 1);
    const w = pickRegulation(f, "reversing");
    expect([w.tapPlus, w.tapMinus]).toEqual([10, 10]);
    expect(web(w).model).toBe("CV2III-600D/40.5-12233W");
    expectSame(web(w), cli(["--line", X0, "--reg", "W"]));
  });

  it("±10 linear line → G: CV2III-600D/40.5-12233G, as the CLI", () => {
    const g = pickRegulation(readLine(INITIAL_FORM, X0), "coarse_fine");
    expect(web(g).model).toBe("CV2III-600D/40.5-12233G");
    expectSame(web(g), cli(["--line", X0, "--reg", "G"]));
  });

  it("±12 linear 132 kV line → W matches the CLI (was ±8 on a 350 A switch)", () => {
    const L = "63 MVA 132±12x1.25%/33 kV YNd11 linear";
    const w = pickRegulation(readLine(INITIAL_FORM, L), "reversing");
    expectSame(web(w), cli(["--line", L, "--reg", "W"]));
    expect(web(w).I).toBeCloseTo(324.2, 1);
  });

  it("±12 W, then linear: +12/−12 and no type, as '--pm 12 --reg linear' (was +8/−8)", () => {
    const f = pickRegulation(pickPm(INITIAL_FORM, "12"), "linear");
    expect([f.tapPlus, f.tapMinus, f.input.positions]).toEqual([12, 12, 25]);
    expectSame(web(f), cli(["--mva", "25", "--kv", "110", "--tap", "neutral", "--pm", "12", "--reg", "linear"]));
    expect(web(f).model).toBeNull();
  });

  it("custom +12/−12 W, then G: CM2III-500Y/72.5B-14273G at 154.4 A (was ±8)", () => {
    const custom = commitRange(pickPm(INITIAL_FORM, ""), 12, 12, 1.25);
    const g = pickRegulation(custom, "coarse_fine");
    expect(web(g).model).toBe("CM2III-500Y/72.5B-14273G");
    expect(web(g).I).toBeCloseTo(154.4, 1);
  });

  it("an uneven +4/−12 still keeps its Fig. 3-3 row on W", () => {
    const custom = commitRange(pickPm(INITIAL_FORM, ""), 4, 12, 1.25);
    const w = pickRegulation(pickRegulation(custom, "linear"), "reversing");
    expect([w.tapPlus, w.tapMinus, w.input.positions]).toEqual([4, 12, 19]);
  });

  it("a ±4 preset on G still clamps to the G set (±8)", () => {
    const g = pickRegulation(pickPm(INITIAL_FORM, "4"), "coarse_fine");
    expect(g.pm).toBe("8");
  });
});

describe("UI-13: a failed read does not keep a single-phase line's phases", () => {
  const ONE = "Type: single phase; rating 100 MVA; 400±8x1.25%/132 kV";
  const BAD = "transformer for substation 3";

  it.each([
    ["40 MVA 132±8x1.25%/33 kV YNd11", "CV2III-350Y/72.5-10193W"],
    ["20 MVA 33±8x1.25%/11 kV Dyn11", "CV2III-350D/40.5-10193W"],
  ])("single-phase, failed, then '%s': phases III and %s, as the CLI", (L, model) => {
    let f = readLine(INITIAL_FORM, ONE);
    expect(f.input.phases).toBe("I");
    expect(web(f).model).toBe("SHZVI-600/126D-10193W");
    f = readLine(f, BAD);
    expect(f.lineFailed).toBe("lineFail");
    f = readLine(f, L);
    expect(f.input.phases).toBe("III");
    expect(web(f).model).toBe(model);
    expectSame(web(f), cli(["--line", L]));
  });

  it("also after the 333 MVA single-phase line, and in 无载", () => {
    const T05 =
      "333 MVA single-phase 500/220 kV, 500 kV ±13x1.25%, regulation at the neutral point; OLTC to ground LI1050/AC460; Imax 1377.33 A";
    const L = "40 MVA 132±8x1.25%/33 kV YNd11";
    expect(readLine(readLine(readLine(INITIAL_FORM, T05), BAD), L).input.phases).toBe("III");
    const off = readLine(readLine(readLine(toOctc(INITIAL_FORM), ONE), BAD), L);
    expect(off.input.phases).toBe("III");
  });

  it("phases I picked by hand after a three-phase read stays I", () => {
    let f = readLine(INITIAL_FORM, "40 MVA 132±8x1.25%/33 kV YNd11");
    f = pickPhases(f, "I");
    expect(f.phasesByLine).toBe(false);
    expect(toOctc(f).input.phases).toBe("I");
  });
});

describe("UI-14: a hand-entered autotransformer survives 无载 → 有载", () => {
  const auto125 = (): FormState => ({
    ...pickKind(INITIAL_FORM, "auto"),
    transformerMva: 125,
    hvKv: 225,
    mvKv: 115,
  });

  it("225/115 kV 125 MVA: refused in 无载 as the CLI, and 3xCM2I-500/252D-10193W again on 有载", () => {
    const f = auto125();
    const before = web(f);
    expect(before.model).toBe("3xCM2I-500/252D-10193W");
    expect(before.um).toBe(252);
    const off = toOctc(f);
    expect(off.kind).toBe("auto");
    expect(web(off).model).toBeNull();
    expect(
      cli(["--mva", "125", "--kind", "auto", "--hv", "225", "--mv", "115", "--tap", "junction", "--octc"]).model,
    ).toBeNull();
    const back = toOltc(off);
    expect(back.kind).toBe("auto");
    expect(back.tapPoint).toBe("auto_junction");
    expect(web(back)).toEqual(before);
  });

  it("the default 220/110 kV auto comes back too (was CV2III-350Y/72.5 two-winding)", () => {
    const f = pickKind(INITIAL_FORM, "auto");
    const back = toOltc(toOctc(f));
    expect(back.kind).toBe("auto");
    expect(web(back)).toEqual(web(f));
  });
});

describe("UI-15: a failed read drops the previous line's earth Um", () => {
  it("neutral-BIL line, failed read, 25 MVA 115 kV by hand: CV2III-350Y/72.5-10193W, as the CLI (was 40.5)", () => {
    let f = readLine(INITIAL_FORM, "40 MVA 132±8x1.25%/33 kV YNd11, neutral BIL 170 kV");
    expect(f.earthUm).toBe(40.5);
    expect(web(f).model).toBe("CV2III-350Y/40.5-10193W");
    f = readLine(f, "Transformer T2: 115±8x1.25%/11 kV YNd11");
    expect(f.lineFailed).toBe("lineFail");
    expect(f.earthUm).toBe(0);
    f = { ...f, transformerMva: 25, mvaCustom: true, windingRatedKv: 115 };
    expect(web(f).model).toBe("CV2III-350Y/72.5-10193W");
    expect(web(f).um).toBe(72.5);
    expectSame(web(f), cli(["--line", "25 MVA 115±8x1.25%/11 kV YNd11"]));
  });
});

describe("property-test find: 种类 switched after a read takes no earlier line's kV", () => {
  const K01 =
    "125 MVA auto 220/110/35 kV, 225±8x1.25%/115/35 kV, YNa0d11, tap winding at the series/common junction; HV current 321 A, 356 A at lowest tap";
  const A06 = "250 MVA, 220 kV";

  it("auto line, two-winding line, then 自耦变: first-paint HV/MV, not the auto line's 225/115", () => {
    const f = pickKind(readLine(readLine(INITIAL_FORM, K01), A06), "auto");
    const fresh = pickKind(readLine(INITIAL_FORM, A06), "auto");
    expect([f.hvKv, f.mvKv]).toEqual([fresh.hvKv, fresh.mvKv]);
    expect(web(f)).toEqual(web(fresh));
  });

  it("220 kV line, auto line, then 双绕组: first-paint winding kV, not 220 (697.3 A for 1458 A)", () => {
    const f = pickKind(readLine(readLine(INITIAL_FORM, "50 MVA, 230 kV, YNyn0d11, +5%/-15%, 21 positions x 1.25%"), K01), "two_winding");
    const fresh = pickKind(readLine(INITIAL_FORM, K01), "two_winding");
    expect(f.windingRatedKv).toBe(fresh.windingRatedKv);
    expect(web(f)).toEqual(web(fresh));
  });
});

describe("ENGINE-12 on the web: a picked or read step is stated", () => {
  it("a read 2.5 % step is stated; the 1.25 % first paint is not", () => {
    expect(INITIAL_FORM.stepStated ?? false).toBe(false);
    expect(readLine(INITIAL_FORM, "27 MVA 33±10x2.5%/11 kV Dyn11 linear").stepStated).toBe(true);
    expect(readLine(INITIAL_FORM, "80 MVA, 220 kV").stepStated).toBe(false);
    expect(editStepPct(INITIAL_FORM, 1.5, false).stepStated).toBe(true);
  });
});

// ── Property: never a stale value ─────────────────────────────────────────
type Op =
  | { k: "read"; line: string }
  | { k: "fail" }
  | { k: "toOctc" }
  | { k: "toOltc" }
  | { k: "kind"; kind: TransformerKind }
  | { k: "reg"; reg: Regulation }
  | { k: "step"; pct: number };

const FAIL_LINE = "transformer for substation 3";
const KINDS: TransformerKind[] = ["two_winding", "auto"];
const REGS: Regulation[] = ["reversing", "coarse_fine", "linear"];
const STEPS = [1, 1.25, 1.5, 1.78, 2, 2.5];
const SPECIAL_LINES = AUDIT_CASE_LINES.filter((L) => {
  const f = readLine(INITIAL_FORM, L);
  return f.lineFailed === false && (f.kind === "auto" || f.input.phases === "I");
});

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

function randomOps(rnd: () => number): Op[] {
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)]!;
  const n = 3 + Math.floor(rnd() * 8);
  const ops: Op[] = [];
  for (let i = 0; i < n; i++) {
    const r = rnd();
    // Half the reads from the few lines that read as auto or single-phase:
    // they carry the fields a later line could inherit.
    if (r < 0.3) ops.push({ k: "read", line: pick(rnd() < 0.5 ? SPECIAL_LINES : AUDIT_CASE_LINES) });
    else if (r < 0.4) ops.push({ k: "fail" });
    else if (r < 0.52) ops.push({ k: "toOctc" });
    else if (r < 0.64) ops.push({ k: "toOltc" });
    else if (r < 0.76) ops.push({ k: "kind", kind: pick(KINDS) });
    else if (r < 0.88) ops.push({ k: "reg", reg: pick(REGS) });
    else ops.push({ k: "step", pct: pick(STEPS) });
  }
  return ops;
}

function apply(f: FormState, op: Op): FormState {
  switch (op.k) {
    case "read":
      return readLine(f, op.line);
    case "fail":
      return readLine(f, FAIL_LINE);
    case "toOctc":
      return toOctc(f);
    case "toOltc":
      return toOltc(f);
    case "kind":
      return pickKind(f, op.kind);
    case "reg":
      return pickRegulation(f, op.reg);
    case "step":
      return editStepPct(f, op.pct, false);
  }
}

const describeOps = (ops: Op[]) =>
  ops
    .map((o) =>
      o.k === "read" ? `read(${o.line.slice(0, 40)})` : o.k === "kind" ? `kind(${o.kind})` : o.k === "reg" ? `reg(${o.reg})` : o.k === "step" ? `step(${o.pct})` : o.k,
    )
    .join(" → ");

describe("property: reads and switches never leave a stale value in the duty", () => {
  it("300 random sequences size as a fresh read of the last good line with the same edits, or report an error", () => {
    const rnd = mulberry32(20261104);
    const bad: string[] = [];
    let compared = 0;
    for (let s = 0; s < 300; s++) {
      const ops = randomOps(rnd);
      let f = INITIAL_FORM;
      let lastGood = -1;
      ops.forEach((op, i) => {
        f = apply(f, op);
        if (op.k === "read" && f.lineFailed === false && f.lineRead != null) lastGood = i;
      });
      const got = formSelectInput(f);
      if (!got.ok) continue; // reports an error: allowed
      // Fresh: the same user edits in the same order, and only the last good
      // line read, at the same point. No other line was ever in this form.
      let g = INITIAL_FORM;
      ops.forEach((op, i) => {
        if (op.k === "read" || op.k === "fail") {
          if (i === lastGood) g = apply(g, op);
          return;
        }
        g = apply(g, op);
      });
      const want = formSelectInput(g);
      compared++;
      const tag = describeOps(ops);
      if (!want.ok) {
        bad.push(`${tag} | got ${got.input.throughCurrentA.toFixed(1)} A Um ${got.input.umKv}, fresh: error`);
        continue;
      }
      const dI = Math.abs(got.input.throughCurrentA - want.input.throughCurrentA);
      if (dI > 0.5 || got.input.umKv !== want.input.umKv) {
        bad.push(
          `${tag} | got ${got.input.throughCurrentA.toFixed(1)} A Um ${got.input.umKv} | fresh ${want.input.throughCurrentA.toFixed(1)} A Um ${want.input.umKv}`,
        );
      }
    }
    expect(SPECIAL_LINES.length).toBeGreaterThanOrEqual(3);
    expect(compared).toBeGreaterThan(60);
    expect(bad).toEqual([]);
  });
});

describe("a read line starts a new enquiry (2026-11-07 field test)", () => {
  it("an off-circuit-only line read in 有载 switches to 无载", () => {
    const f = readLine(INITIAL_FORM, "1000 kVA 10±2x2.5%/0.4 kV Dyn11, off-circuit tap changer (DETC)");
    expect(f.input.dutyKind).toBe("octc");
  });
  it("market, safety factor and a dry or reactor mounting do not carry to the next line", () => {
    const prev = {
      ...INITIAL_FORM,
      market: "TR",
      safetyK: 1.2,
      input: { ...INITIAL_FORM.input, mounting: "dry_type" as const, medium: "dry" as const },
    };
    const f = readLine(prev, "60 MVA 150±12x1.25%/20 kV YNd11");
    expect(f.market).toBe("");
    expect(f.safetyK).toBe(1);
    expect(f.input.mounting).toBe("in_tank");
    expect(f.input.medium).toBe("oil_vacuum");
  });
});
