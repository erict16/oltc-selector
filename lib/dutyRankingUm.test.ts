/**
 * 2026-11-04 audit, track B: duty (D1–D5), ranking (FAM-1…4), insulation
 * (UM-1…8) and grade (GRADE-2/3). One block per finding, cases from the
 * findings' own test lists.
 */
import { describe, expect, it } from "vitest";
import * as deriveUmModule from "./deriveUm";
import { pickSelectorSize } from "./catalog";
import { runCli } from "./cli";
import { optionsWithInsurance, selectOltc } from "./engine";
import { localizeNote } from "./noteI18n";
import { deriveDuty, umChoices, type TransformerSpec } from "./transformer";
import type { SelectInput } from "./types";

function cli(args: string): { code: number; out: string } {
  let out = "";
  const code = runCli(args.split(" "), {
    stdout: (s) => (out += s),
    stderr: (s) => (out += s),
  });
  return { code, out };
}

function cliJson(args: string) {
  const r = cli(`${args} --json`);
  expect(r.code, r.out).toBe(0);
  return JSON.parse(r.out) as {
    model: string;
    alts: string[];
    cautions: string[];
    basis: { maxA: number; maxRule: string; stepV: number; umKv: number } | null;
    umChoices: { um: number; model: string | null }[];
    assumptions: string[];
  };
}

const spec = (o: Partial<TransformerSpec>): TransformerSpec => ({
  kind: "two_winding",
  tapPoint: "neutral",
  winding: "star",
  mva: 125,
  tapKv: 400,
  hvKv: 0,
  mvKv: 0,
  minusSteps: 8,
  stepFraction: 0.0125,
  safetyK: 1,
  ...o,
});

const base: SelectInput = {
  mounting: "in_tank",
  medium: "oil_vacuum",
  preferVacuum: true,
  phases: "III",
  connection: "Y",
  throughCurrentA: 300,
  umKv: 72.5,
  stepVoltageV: 1000,
  regulation: "reversing",
  plusMinusSteps: 8,
  midPositions: 3,
  selectorSize: "auto",
  preferStructure: "auto",
  mdu: "none",
};
const oil: Partial<SelectInput> = { medium: "oil", preferVacuum: false };
const run = (o: Partial<SelectInput>) => selectOltc({ ...base, ...o });

const JOB_115 = "--mva 63 --kv 115 --tap neutral --pm 9 --step-pct 1.78";

describe("D1 OS Imax on the capacity path", () => {
  it("334 A stated → CVIII-350Y (sold 10×, E-V250053-054); caution names the cap", () => {
    const j = cliJson(`${JOB_115} --imax 334 --oil`);
    expect(j.model).toBe("CVIII-350Y/72.5-10191W");
    expect(j.basis?.maxA).toBe(334);
    expect(j.basis?.maxRule).toBe("stated");
    expect(j.cautions.join()).toContain("最大电流分接");
  });

  it("without a stated Imax the full range stays (376.6 A, CMIII-500Y)", () => {
    const j = cliJson(`${JOB_115} --oil`);
    expect(j.basis?.maxA).toBe(376.6);
    expect(j.basis?.maxRule).toBe("full_range");
    expect(j.model).toBe("CMIII-500Y/72.5B-10191W");
  });

  it("--os-imax 351 is not put on a 350 A unit (needs D2)", () => {
    expect(cliJson(`${JOB_115} --os-imax 351 --oil`).model).not.toMatch(/-350Y/);
  });

  it("vacuum gives CV2III-350Y, as sold (E-CV2250095-096)", () => {
    expect(cliJson(`${JOB_115} --imax 334`).model).toBe("CV2III-350Y/72.5-10191W");
  });

  it("a stated Imax below rated is not used: the full-range current stays (2026-11-07)", () => {
    // "1.200" typed for 1200 A reached the engine as 1.2 A and sized on rated.
    const j = cliJson(`${JOB_115} --imax 300 --oil`);
    const full = deriveDuty(spec({ mva: 63, tapKv: 115, minusSteps: 9, stepFraction: 0.0178 })).maxA;
    expect(j.basis?.maxA).toBeCloseTo(full, 1);
    expect(full).toBeGreaterThan(316.3);
    expect(j.cautions.join()).toContain("低于额定 316.3 A：不采用");
  });

  it("a stated Imax far above the full range is used, with a data caution", () => {
    const d = deriveDuty(spec({ mva: 63, tapKv: 115, minusSteps: 9, stepFraction: 0.0178, statedMaxA: 600 }));
    expect(d.maxA).toBe(600);
    expect(d.cautionsEn.join()).toContain("line current or a data error");
  });

  it("a stated Imax above full range but within 25% is taken as is (E-M260122)", () => {
    const d = deriveDuty(
      spec({ kind: "auto", tapPoint: "auto_mv_line", hvKv: 230, mvKv: 121, mva: 250, minusSteps: 6, stepFraction: 0.01, statedMaxA: 1269 }),
    );
    expect(d.ratedA).toBeCloseTo(1192.9, 1);
    expect(d.maxA).toBe(1269);
    expect(d.cautionsEn.some((c) => c.startsWith("OS Imax"))).toBe(false);
  });

  it("--imax alone is still the --iu alias; --os-imax needs --mva", () => {
    expect(cli("--imax 300 --um 72.5").code).toBe(0);
    expect(cli("--os-imax 300 --um 72.5").code).toBe(1);
  });
});

describe("D2 no 1% over-rating tolerance", () => {
  it("351 A never on CVIII-350Y (E-V250432-433)", () => {
    const out = run({ ...oil, throughCurrentA: 351, plusMinusSteps: 9, midPositions: 1, stepVoltageV: 1182 });
    expect(out.results[0]!.model).not.toMatch(/^CVIII-350/);
    expect(out.results.every((r) => r.currentA >= 351)).toBe(true);
  });

  it("353 A Δ 40.5 G → CV2III-600D (E-CV2250480-487)", () => {
    const r = cli("--iu 353 --um 40.5 --conn D --reg G --pm 9 --ust 350");
    expect(r.out.split("\n")[0]).toBe("CV2III-600D/40.5-10191G");
  });

  it("350 A exact still covers", () => {
    expect(run({ throughCurrentA: 350 }).results[0]!.model).toBe("CV2III-350Y/72.5-10193W");
  });
});

describe("D3 OS Ust is a floor and the basis shows it", () => {
  it("--ust 2047 on 40 MVA 115 kV: engine and basis both 2047, line-value caution", () => {
    const j = cliJson("--mva 40 --kv 115 --tap neutral --pm 9 --step-pct 1.78 --ust 2047");
    expect(j.model).toBe("CM2III-500Y/72.5B-10191W");
    expect(j.basis?.stepV).toBe(2047);
    expect(j.cautions.join()).toContain("像线电压值");
  });

  it("69 kV line value 862.5 V: caution, primary unchanged (E-CV2250254)", () => {
    const j = cliJson("--mva 20 --kv 69 --tap neutral --pm 8 --step-pct 1.25 --ust 862.5");
    expect(j.model).toBe("CV2III-350Y/72.5-10193W");
    expect(j.cautions.join()).toContain("像线电压值");
  });

  it("--ust below the derived step never lowers it", () => {
    const j = cliJson("--mva 20 --kv 69 --tap neutral --pm 8 --step-pct 1.25 --ust 300");
    expect(j.basis?.stepV).toBe(498);
  });

  it("deriveDuty takes the stated Ust when no step % is given", () => {
    const d = deriveDuty(spec({ tapKv: 110, stepFraction: null, statedStepV: 900 }));
    expect(d.stepV).toBe(900);
  });
});

describe("D5 variable flux on autotransformers", () => {
  const AUTO = "--mva 250 --kind auto --hv 230 --mv 121 --tap mv-line --pm 6 --step-pct 2 --oil";
  it("caution present when Ust is derived", () => {
    expect(cliJson(AUTO).cautions.join()).toContain("变磁通");
  });

  it("--ust 1477 is the maker's Ust_max (E-M250131-132): used, caution gone", () => {
    const j = cliJson(`${AUTO} --ust 1477`);
    expect(j.basis?.stepV).toBe(1477);
    expect(j.cautions.join()).not.toContain("变磁通");
  });

  it("two-winding neutral has no variable-flux caution", () => {
    expect(deriveDuty(spec({ tapKv: 110 })).cautionsEn.join()).not.toContain("Variable flux");
  });
});

describe("FAM-1 oil CV/SV past the 90% Ust line → CM primary", () => {
  it("156 A, 1368 V, 10193W: CMIII-500Y primary, CVIII-350Y still listed", () => {
    const out = run({ ...oil, throughCurrentA: 156, stepVoltageV: 1368 });
    expect(out.results[0]!.model).toBe("CMIII-500Y/72.5B-10193W");
    expect(out.results.some((r) => r.model === "CVIII-350Y/72.5-10193W")).toBe(true);
  });

  it("350 A, 1300 V (86.7%) stays CVIII-350Y", () => {
    expect(run({ ...oil, throughCurrentA: 350, stepVoltageV: 1300 }).results[0]!.model).toBe(
      "CVIII-350Y/72.5-10193W",
    );
  });

  it("306 A, 1448 V, G: CMIII-500Y …-10193G", () => {
    const r = run({ ...oil, throughCurrentA: 306, stepVoltageV: 1448, regulation: "coarse_fine" }).results[0]!;
    expect(r.model).toMatch(/^CMIII-500Y\/72\.5.*-10193G$/);
  });

  it("CV is the first other family in the ranked list (ELIZ bought it)", () => {
    const out = run({ ...oil, throughCurrentA: 156, stepVoltageV: 1368 });
    const i = out.results.findIndex((r) => r.model === "CVIII-350Y/72.5-10193W");
    expect(i).toBeGreaterThan(0);
    expect(out.results.slice(0, i).every((r) => r.seriesCode === "CM")).toBe(true);
    // The other-options cards stay on CM (current step), as before for CM.
    expect(optionsWithInsurance(out.results, 156, 1368, 3)[0]!.model).toBe("CMIII-600Y/72.5B-10193W");
  });
});

describe("FAM-2 / FAM-3 SHZV on high tapped windings", () => {
  const w400: Partial<SelectInput> = {
    umKv: 126,
    throughCurrentA: 180,
    stepVoltageV: 2887,
    regulation: "coarse_fine",
    plusMinusSteps: 13,
    midPositions: 1,
  };
  it("400 kV winding: SHZV primary, CM2III-500Y/126 still listed", () => {
    const out = run({ ...w400, tapWindingKv: 400 });
    expect(out.results[0]!.seriesCode).toBe("SHZV");
    expect(out.results.some((r) => r.model.startsWith("CM2III-500Y/126"))).toBe(true);
  });

  it("same duty on a 230 kV winding, or no winding kV: CM2 stays", () => {
    expect(run({ ...w400, tapWindingKv: 230 }).results[0]!.seriesCode).toBe("CM2");
    expect(run(w400).results[0]!.seriesCode).toBe("CM2");
  });

  // deriveDuty marks a 220 kV-class winding combined-only.
  const w225: Partial<SelectInput> = { umKv: 72.5, stepVoltageV: 1624, tapWindingKv: 225, combinedOnly: true };
  it("225 kV, one III unit at 571 A: SHZV (EEMC A03)", () => {
    expect(run({ ...w225, throughCurrentA: 571 }).results[0]!.seriesCode).toBe("SHZV");
  });

  it("423 A stays CM2III-500Y (E-CM2260140); 433 A (Q01 duty) is past the line", () => {
    expect(run({ ...w225, throughCurrentA: 423 }).results[0]!.model).toMatch(/^CM2III-500Y/);
    expect(run({ ...w225, throughCurrentA: 433 }).results[0]!.seriesCode).toBe("SHZV");
  });

  it("446 A on a 150 kV winding stays CM2 (HMT-Green 161 kV bought CM2III-600Y)", () => {
    expect(run({ ...w225, tapWindingKv: 150, throughCurrentA: 446 }).results[0]!.seriesCode).toBe("CM2");
  });

  it("3× path untouched: 697 A Δ on a 230 kV winding stays 3xCM2I-800", () => {
    const r = run({ connection: "D", umKv: 252, throughCurrentA: 697, stepVoltageV: 1200, tapWindingKv: 230 });
    expect(r.results[0]!.model).toMatch(/^3xCM2I-800/);
  });
});

describe("FAM-4 single-phase vacuum takes CM2I, not CV2I", () => {
  it("550 A, 357 V: CM2I-600 primary, CV2I-600 listed", () => {
    const out = run({ phases: "I", throughCurrentA: 550, stepVoltageV: 357 });
    expect(out.results[0]!.model).toBe("CM2I-600/72.5B-10193W");
    expect(out.results.some((r) => r.model.startsWith("CV2I-600"))).toBe(true);
  });

  it("oil single-phase CVI stays (Sanaky R0 CVI-350/72.5-10070)", () => {
    const r = run({
      ...oil,
      phases: "I",
      throughCurrentA: 269,
      stepVoltageV: 300,
      regulation: "linear",
      plusMinusSteps: undefined,
      midPositions: undefined,
      positions: 7,
    }).results[0]!;
    expect(r.model).toBe("CVI-350/72.5-10070");
  });

  it("three-phase delta 300 A: CV2III-350D stays", () => {
    expect(run({ connection: "D", throughCurrentA: 300 }).results[0]!.model).toMatch(/^CV2III-350D/);
  });
});

describe("UM-1 400 kV-class neutral → 126 assumed", () => {
  it.each([400, 420, 500, 525])("%s kV neutral: 126, neutral_assumed", (kv) => {
    const d = deriveDuty(spec({ tapKv: kv }));
    expect(d.umKv).toBe(126);
    expect(d.umAssumed).toBe(true);
    expect(d.umRule).toBe("neutral_assumed");
  });

  it.each([220, 330])("%s kV neutral stays 72.5", (kv) => {
    expect(deriveDuty(spec({ tapKv: kv })).umKv).toBe(72.5);
  });

  it("umChoices still start at 72.5 (Brazil, TERNA)", () => {
    const s = spec({});
    expect(umChoices(deriveDuty(s), s)[0]).toBe(72.5);
  });

  it("CLI 125 MVA 400 kV ±13 G gives a /126 type (E-SHZV260107-108)", () => {
    expect(cli("--mva 125 --kv 400 --tap neutral --pm 13 --reg G").out.split("\n")[0]).toMatch(/\/126/);
  });

  it("a stated 72.5 wins with no warning", () => {
    const d = deriveDuty(spec({ earthUmKv: 72.5 }));
    expect(d.umRule).toBe("explicit");
    expect(d.umKv).toBe(72.5);
    expect(d.cautionsEn.join()).not.toContain("below the system class");
  });
});

describe("UM-2 market (optional, off by default)", () => {
  const n = (tapKv: number, market?: string) =>
    deriveDuty(spec({ tapKv, mva: 40, ...(market ? { market } : {}) }));
  it("Italy: 150 → 170, 132 → 170, 230 → 252, 400 → 126 (not 252)", () => {
    expect(n(150, "IT").umKv).toBe(170);
    expect(n(132, "IT").umKv).toBe(170);
    expect(n(230, "IT").umKv).toBe(252);
    expect(n(400, "IT").umKv).toBe(126);
    expect(n(150, "IT").umAssumed).toBe(true);
    expect(n(150, "IT").cautionsEn.join()).toContain("some projects use 72.5");
  });

  it("Turkey 225 → 126; Russia 220 → 72.5; no market = today", () => {
    expect(n(225, "TR").umKv).toBe(126);
    expect(n(220, "RU").umKv).toBe(72.5);
    expect(n(150).umKv).toBe(72.5);
    expect(n(225).umKv).toBe(72.5);
  });

  it("Italy 150 kV still offers 72.5 and 126", () => {
    const s = spec({ tapKv: 150, mva: 40, market: "IT" });
    expect(umChoices(deriveDuty(s), s)).toEqual([72.5, 126, 170]);
  });

  it("CLI --market shows in 假定", () => {
    const j = cliJson("--mva 40 --kv 150 --tap neutral --market IT");
    expect(j.basis?.umKv).toBe(170);
    expect(j.assumptions).toContain("市场=IT");
    expect(cli("--mva 40 --kv 150 --tap neutral --market Italy").code).toBe(1);
  });
});

describe("UM-4 400 kV-class autotransformer junction", () => {
  const auto = (o: Partial<TransformerSpec> = {}) =>
    deriveDuty(spec({ kind: "auto", tapPoint: "auto_junction", hvKv: 400, mvKv: 220, mva: 500, ...o }));
  it("still refused, but says how to go on", () => {
    const d = auto();
    expect(d.ok).toBe(false);
    expect(d.errorEn).toContain("252, 300, 363");
    expect(d.errorEn).toContain("insulation to earth");
  });

  it("a stated 252 passes; a stated 170 warns", () => {
    expect(auto({ earthUmKv: 252 }).ok).toBe(true);
    expect(auto({ earthUmKv: 252 }).cautionsEn.join()).not.toContain("below the system class");
    expect(auto({ earthUmKv: 170 }).cautionsEn.join()).toContain("below the system class Um 252");
  });

  it("HMR 170 note only where Um is 170", () => {
    const mv400 = auto({ tapPoint: "auto_mv_line" });
    expect(mv400.umKv).toBe(252);
    expect(mv400.cautionsEn.join()).not.toContain("230/121");
    const mv230 = auto({ tapPoint: "auto_mv_line", hvKv: 230, mvKv: 121, mva: 250 });
    expect(mv230.umKv).toBe(170);
    expect(mv230.cautionsEn.join()).toContain("230/121 kV autotransformer");
  });
});

describe("UM-5 35 kV neutral caution", () => {
  it("names no market or buyer; choices 40.5 and 72.5", () => {
    const s = spec({ tapKv: 35, mva: 20 });
    const d = deriveDuty(s);
    expect(d.umKv).toBe(40.5);
    expect(d.umAssumed).toBe(true);
    expect(d.cautionsEn.join()).toContain("many projects specify 72.5");
    expect(d.cautionsEn.join()).not.toContain("Turkey");
    expect(umChoices(d, s)).toEqual([40.5, 72.5]);
  });
});

describe("UM-7 one Um rule", () => {
  it("the second rule is gone from deriveUm", () => {
    const mod = deriveUmModule as Record<string, unknown>;
    for (const name of ["oltcUmFromRatedKv", "deriveOltcUm", "windingUmFromRatedKv", "RATED_TO_WINDING_UM"]) {
      expect(mod[name], name).toBeUndefined();
    }
    expect(deriveUmModule.WINDING_RATED_KV.length).toBeGreaterThan(0);
  });
});

describe("GRADE-2 stated across-tap stress may lower the grade", () => {
  it("star point / single phase starts from the weakest grade on the row", () => {
    expect(pickSelectorSize(170, "auto", 350, 82, "cm2", true)).toBe("C");
    expect(pickSelectorSize(170, "auto", 285, 65, "cm2", true)).toBe("C");
    expect(pickSelectorSize(170, "auto", 450, 100, "shzv", true)).toBe("D");
    expect(pickSelectorSize(252, "auto", 520, 110, "shzvg", true)).toBe("DE");
    expect(pickSelectorSize(252, "auto", 600, 0, "cm2", true)).toBeNull();
  });

  it("three-phase line end keeps the Um default (b is not checked)", () => {
    expect(pickSelectorSize(170, "auto", 350, 82, "cm2", false)).toBe("D");
    const r = run({ connection: "D", umKv: 170, throughCurrentA: 300, acrossTapBilKv: 350, acrossTapPfKv: 82 });
    for (const x of r.results.filter((x) => x.phases === "III")) expect(x.selectorSize).not.toBe("C");
  });

  it("CLI --across-li 350 --across-ac 82 at Um 170 single phase → C (A01)", () => {
    expect(cli("--iu 550 --um 170 --phases I --across-li 350 --across-ac 82").out.split("\n")[0]).toBe(
      "CM2I-600/170C-10193W",
    );
  });

  it("no stated stress: Um default as before", () => {
    expect(pickSelectorSize(170, "auto", 0, 0, "cm2", true)).toBe("D");
  });
});

describe("new duty notes have translations", () => {
  const notes = [
    ...deriveDuty(spec({ mva: 63, tapKv: 115, minusSteps: 9, stepFraction: 0.0178, statedMaxA: 334 })).cautionsEn,
    ...deriveDuty(spec({ mva: 63, tapKv: 115, minusSteps: 9, stepFraction: 0.0178, statedMaxA: 300 })).cautionsEn,
    ...deriveDuty(spec({ mva: 63, tapKv: 115, minusSteps: 9, stepFraction: 0.0178, statedMaxA: 600 })).cautionsEn,
    ...deriveDuty(spec({ mva: 40, tapKv: 115, minusSteps: 9, stepFraction: 0.0178, statedStepV: 2047 })).cautionsEn,
    ...deriveDuty(spec({ tapKv: 400 })).cautionsEn,
    ...deriveDuty(spec({ tapKv: 150, market: "IT" })).cautionsEn,
    ...deriveDuty(spec({ tapKv: 225, market: "TR" })).cautionsEn,
    ...deriveDuty(spec({ tapKv: 35 })).cautionsEn,
    ...deriveDuty(spec({ kind: "auto", tapPoint: "auto_mv_line", hvKv: 400, mvKv: 220 })).cautionsEn,
    deriveDuty(spec({ kind: "auto", tapPoint: "auto_junction", hvKv: 400, mvKv: 220 })).errorEn!,
  ];
  it.each(["vi", "es", "tr", "id"] as const)("%s", (lang) => {
    expect(notes.filter((n) => localizeNote(n, lang) === n)).toEqual([]);
  });
});
