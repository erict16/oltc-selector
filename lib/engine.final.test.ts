/**
 * 2026-11-04 final audit, engine track (ENGINE-11, ENGINE-12). Every repro in
 * .audit/final-findings.json for these ids is one test here.
 */
import { describe, expect, it } from "vitest";
import { cliDuty, cliToSelectInput, parseCliArgs } from "./cli";
import { selectOltc } from "./engine";
import { INITIAL_FORM, editStepPct, formSelectInput, type FormState } from "./formState";
import { deriveDuty, type TransformerSpec } from "./transformer";

const args = (s: string) => parseCliArgs([...s.split(/\s+/).filter(Boolean), "--no-update-check"]);

// The CLI has no --market since 2.4.0; the buyer practice is engine input.
function run(s: string) {
  const tr = s.includes(" --market TR");
  const a = () => args(s.replace(" --market TR", ""));
  const input = { ...cliToSelectInput(a()), ...(tr ? { market: "TR" } : {}) };
  const out = selectOltc(input);
  const duty = cliDuty(a());
  return {
    I: input.throughCurrentA,
    model: out.results[0]?.model ?? null,
    models: out.results.map((r) => r.model),
    cautions: [
      ...out.results.flatMap((r) => [...r.cautionsEn, ...r.cautionsZh]),
      ...(duty?.cautionsEn ?? []),
      ...(duty?.cautionsZh ?? []),
    ],
    duty,
  };
}

function web(f: FormState) {
  const r = formSelectInput(f);
  if (!r.ok) throw new Error("form did not size");
  const out = selectOltc(r.input);
  return { I: r.input.throughCurrentA, model: out.results[0]?.model ?? null, duty: r.duty };
}

describe("ENGINE-11: TR with one stated across-tap value gives no grade B below it", () => {
  const oil = "--mva 25 --kv 110 --tap neutral --winding star --pm 5 --step-pct 1.78 --oil --market TR";
  const vac = "--mva 40 --kv 110 --tap neutral --winding star --pm 8 --step-pct 1.25 --market TR";

  it("oil CM, LI 350: CMIII-500Y/72.5C-12111W, no 72.5B row, no 'B also fits'", () => {
    const r = run(`${oil} --across-li 350`);
    expect(r.model).toBe("CMIII-500Y/72.5C-12111W");
    expect(r.models.filter((m) => m.includes("/72.5B-"))).toEqual([]);
    expect(r.cautions.join("\n")).not.toMatch(/also fits|也满足/);
  });

  it.each(["--across-li 300", "--across-ac 70"])("vacuum, %s: 72.5C, no 72.5B row, no 'B also fits'", (stress) => {
    const r = run(`${vac} ${stress}`);
    expect(r.model).toBe("CM2III-500Y/72.5C-10193W");
    expect(r.models.filter((m) => m.includes("/72.5B-"))).toEqual([]);
    expect(r.cautions.join("\n")).not.toMatch(/also fits|也满足/);
  });

  it("the primary is the same as without --market TR", () => {
    expect(run(`${oil} --across-li 350`).model).toBe(run(`${oil.replace(" --market TR", "")} --across-li 350`).model);
  });

  it("no stress, or LI ≤ 265 only, still raises to C and keeps the 72.5B copy", () => {
    // No stress lets the compound CV2 in, so lock 组合式 to see the grade.
    for (const stress of ["--structure combined", "--across-li 265"]) {
      const r = run(`${vac} ${stress}`);
      expect(r.model).toBe("CM2III-500Y/72.5C-10193W");
      expect(r.models).toContain("CM2III-500Y/72.5B-10193W");
      expect(r.cautions.join("\n")).toContain("B 也满足");
    }
  });
});

describe("ENGINE-12: a stated Ust with no step % sizes the lowest tap on the step it implies", () => {
  const base = "--mva 57.16 --kv 110 --tap neutral --winding star --pm 8";

  it("--ust 1588 on 110 kV: 375 A and CV2III-600Y, as --step-pct 2.5 (was 333.3 A, CV2III-350Y)", () => {
    const r = run(`${base} --ust 1588`);
    expect(r.I).toBeCloseTo(375.0, 0);
    expect(r.model).toBe("CV2III-600Y/72.5-10193W");
    expect(r.model).toBe(run(`${base} --step-pct 2.5`).model);
    expect(r.cautions.join("\n")).toContain("OS Ust 1588 V is 2.5 % per step, not the 1.25 % default; lowest tap sized on 2.5 %.");
  });

  it("web: OS Ust 1588 with the default step gives the same", () => {
    const f: FormState = { ...INITIAL_FORM, transformerMva: 57.16, windingRatedKv: 110, osUstV: 1588 };
    const w = web(f);
    expect(w.I).toBeCloseTo(375.0, 0);
    expect(w.model).toBe("CV2III-600Y/72.5-10193W");
  });

  it("--range +4/-12 --ust 1500 sizes −12 on 2.36 %", () => {
    const r = run("--mva 57.16 --kv 110 --tap neutral --winding star --range +4/-12 --ust 1500");
    const implied = 1500 / (110000 / Math.sqrt(3));
    expect(r.duty?.maxA).toBeCloseTo(300 / (1 - 12 * implied), 0);
    expect(r.cautions.join("\n")).toContain("2.36 % per step");
  });

  it("--ust 2047 at 115 kV with 1.78 % (line value) is unchanged", () => {
    const r = run("--mva 40 --kv 115 --tap neutral --pm 9 --step-pct 1.78 --ust 2047");
    expect(r.duty?.maxA).toBeCloseTo(239.1, 1);
    expect(r.model).toBe("CM2III-500Y/72.5B-10191W");
  });

  it("a stated step keeps its sizing and gets a check-the-OS caution", () => {
    const r = run(`${base} --step-pct 1.25 --ust 1588`);
    expect(r.duty?.maxA).toBeCloseTo(333.3, 1);
    expect(r.cautions.join("\n")).toContain("not the stated 1.25 %; lowest tap sized on 1.25 %. Check the OS.");
    // The web: a step picked by hand is stated too.
    const f = editStepPct({ ...INITIAL_FORM, transformerMva: 57.16, windingRatedKv: 110, osUstV: 1588 }, 1.25, false);
    expect(web(f).I).toBeCloseTo(333.3, 1);
  });

  it("a stated Imax stays the authority", () => {
    const r = run(`${base} --ust 1588 --os-imax 340`);
    expect(r.duty?.maxA).toBe(340);
  });

  it("never lowers the duty; Ust at the derived step changes nothing", () => {
    const spec: TransformerSpec = {
      kind: "two_winding",
      tapPoint: "neutral",
      winding: "star",
      mva: 57.16,
      tapKv: 110,
      hvKv: 0,
      mvKv: 0,
      minusSteps: 8,
      stepFraction: 0.0125,
      safetyK: 1,
    };
    const plain = deriveDuty(spec);
    expect(deriveDuty({ ...spec, statedStepV: 794 }).maxA).toBe(plain.maxA);
    for (const ust of [800, 1000, 1588, 2400]) {
      expect(deriveDuty({ ...spec, statedStepV: ust }).maxA).toBeGreaterThanOrEqual(plain.maxA);
    }
  });
});

describe("contacts and unit counts per family (2026-11-07 review)", () => {
  const top = (argv: string) => {
    const r = selectOltc(cliToSelectInput(parseCliArgs(argv.split(" "))));
    return r.ok ? r.results[0]!.model : "";
  };
  it("CV2 small reversing ranges sit on 10 contacts, CV keeps 14", () => {
    expect(top("--iu 300 --um 40.5 --conn Y --reg W --pm 6 --mid 1 --ust 800")).toBe("CV2III-350Y/40.5-10131W");
    expect(top("--iu 300 --um 72.5 --conn D --reg W --pm 7 --mid 1 --ust 800")).toBe("CV2III-350D/72.5-10151W");
    expect(top("--iu 300 --um 40.5 --conn D --reg W --pm 6 --mid 1 --ust 800 --oil")).toBe("CVIII-350D/40.5-14131W");
  });
  it("one single-phase unit per phase", () => {
    expect(top("--iu 300 --um 40.5 --conn Y --reg 0 --pos 9 --ust 500 --mount dry --phases I")).toBe("CZI-500/40.5-9");
    expect(top("--iu 500 --um 72.5 --conn D --reg W --pm 8 --ust 1000 --phases II")).toBe("2xCM2I-500/72.5B-10193W");
    expect(top("--iu 300 --um 40.5 --conn D --reg 0 --pos 9 --ust 500 --mount dry")).toBe("3xCZI-500/40.5-9");
  });
});
