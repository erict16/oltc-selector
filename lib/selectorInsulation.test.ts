import { describe, expect, it } from "vitest";
import { coversInternal, internalInsulation, internalPeak, resolveSelectorSize } from "./catalog";
import { runCli } from "./cli";
import { selectOltc, statedDistances } from "./engine";
import { pickSelectorGrade } from "./formEdits";
import { INITIAL_FORM, readLine, toOctc } from "./formState";
import { decodeForm, encodeForm } from "./formUrl";
import { localizeNote } from "./noteI18n";
import type { SelectInput } from "./types";

/**
 * 2026-11-20: the selector grade from the stated withstand on all four inner
 * distances (a / b / c1 / c2), not only a. Tables: SHZV 4-2, CM2 / CM 2, CMD 2.
 */

function cli(line: string): { code: number; out: string; err: string } {
  let out = "";
  let err = "";
  const code = runCli([...line.split(" "), "--no-update-check"], {
    stdout: (s) => {
      out += s;
    },
    stderr: (s) => {
      err += s;
    },
  });
  return { code, out, err };
}
const first = (line: string) => cli(line).out.split(/\r?\n/)[0];

const BASE: SelectInput = {
  mounting: "in_tank",
  medium: "oil_vacuum",
  preferVacuum: true,
  phases: "III",
  connection: "Y",
  throughCurrentA: 600,
  umKv: 72.5,
  stepVoltageV: 1500,
  regulation: "reversing",
  plusMinusSteps: 8,
  midPositions: 3,
  positions: 19,
  pitch: 10,
  selectorSize: "auto",
  preferStructure: "combined",
  mdu: "none",
};

describe("brochure tables carry c1 and c2", () => {
  it("SHZV C and the CM2 C differ on c1 and c2", () => {
    expect(internalInsulation("shzv", "C")).toMatchObject({ c1_li: 550, c1_pf: 180, c2_li: 550, c2_pf: 195 });
    expect(internalInsulation("cm2", "C")).toMatchObject({ c1_li: 545, c1_pf: 178, c2_li: 550, c2_pf: 182 });
    expect(internalInsulation("cm", "B")).toMatchObject({ c1_li: 485, c1_pf: 143, c2_li: 495, c2_pf: 150 });
  });

  it("covers every stated distance or none", () => {
    expect(coversInternal("B", { b: { li: 265 }, c1: { li: 500, pf: 145 } }, "shzv")).toBe(true);
    expect(coversInternal("B", { b: { li: 265 }, c1: { li: 501 } }, "shzv")).toBe(false);
    expect(internalPeak("C", { a: { li: 100 }, c2: { pf: 195 } }, "shzv")).toMatchObject({
      distance: "c2",
      test: "pf",
      ratio: 1,
    });
  });
});

describe("grade from b / c1 / c2", () => {
  it("each distance raises the grade on its own table", () => {
    expect(resolveSelectorSize(72.5, "auto", 0, 0, "shzv").size).toBe("B");
    expect(resolveSelectorSize(72.5, "auto", 0, 0, "shzv", false, undefined, { b: { li: 300 } }).size).toBe("C");
    expect(resolveSelectorSize(72.5, "auto", 0, 0, "shzv", false, undefined, { c1: { li: 546 } }).size).toBe("C");
    // CM2 C holds 545 on c1, not 550.
    expect(resolveSelectorSize(72.5, "auto", 0, 0, "cm2", false, undefined, { c1: { li: 546 } }).size).toBe("D");
    expect(resolveSelectorSize(72.5, "auto", 0, 0, "shzv", false, undefined, { c2: { pf: 240 } }).size).toBe("DE");
    expect(resolveSelectorSize(72.5, "auto", 0, 0, "shzv", false, undefined, { c2: { pf: 260 } }).size).toBeNull();
  });

  it("a stated a may lower the grade, but not below what b needs", () => {
    expect(resolveSelectorSize(170, "auto", 260, 50, "cm2", true).size).toBe("B");
    const held = resolveSelectorSize(170, "auto", 260, 50, "cm2", true, undefined, { c1: { li: 520 } });
    expect(held.size).toBe("C");
    expect(held.loweredFrom).toBe("D");
  });

  it("a picked letter is raised when it does not cover", () => {
    const pick = resolveSelectorSize(72.5, "B", 0, 0, "shzv", false, undefined, { b: { pf: 100 } });
    expect(pick).toEqual({ size: "D", raisedFrom: "B" });
  });
});

describe("which distances a unit has", () => {
  const all = {
    insulBBilKv: 300,
    insulC1BilKv: 520,
    insulC1PfKv: 150,
    insulC2PfKv: 200,
  };
  it("single-phase: no b, no c2", () => {
    expect(statedDistances(all, "I", "reversing")).toEqual({ c1: { li: 520, pf: 150 } });
  });
  it("linear: no c1, no c2", () => {
    expect(statedDistances(all, "III", "linear")).toEqual({ b: { li: 300, pf: 0 } });
  });
  it("three-phase with a change-over selector: all three", () => {
    expect(Object.keys(statedDistances(all, "III", "coarse_fine"))).toEqual(["b", "c1", "c2"]);
  });
});

describe("engine", () => {
  const top = (more: Partial<SelectInput>) => selectOltc({ ...BASE, ...more });

  it("c1 LI 560 takes 72.5 from B to D and the reason names it", () => {
    expect(top({}).results[0]!.model).toMatch(/\/72\.5B-/);
    const r = top({ insulC1BilKv: 560 }).results[0]!;
    expect(r.model).toMatch(/\/72\.5D-/);
    expect(r.reasonsEn.join(" ")).toContain("c1 LI 560 kV");
    expect(r.reasonsZh.join(" ")).toContain("c1 雷电 560 kV");
  });

  it("linear regulation ignores c1", () => {
    const r = top({ regulation: "linear", plusMinusSteps: undefined, positions: 9, insulC1BilKv: 560 });
    expect(r.results[0]!.model).toMatch(/\/72\.5B-/);
  });

  it("above DE on every distance: says the stated insulation is too high", () => {
    const r = top({ insulC1PfKv: 300 });
    expect(r.ok).toBe(false);
    expect(r.errorsEn[0]).toMatch(/^Stated insulation \(a \/ b \/ c1 \/ c2\)/);
    expect(localizeNote(r.errorsEn[0]!, "es")).toMatch(/^El aislamiento indicado/);
  });

  it("c2 above DE: three single-phase units, which have no c2 inside", () => {
    expect(top({ insulC2PfKv: 300 }).results[0]!.model).toMatch(/^3xCM2I-600\/72\.5B-/);
  });

  it("a picked letter keeps to the families that carry one", () => {
    // Construction Auto would give a compound CV2 here, which has no letter to pick.
    const duty = { preferStructure: "auto" as const, throughCurrentA: 350, umKv: 40.5 };
    expect(top(duty).results[0]!.selectorSize).toBe("");
    const picked = top({ ...duty, selectorSize: "C" });
    expect(picked.results.every((r) => r.selectorSize !== "")).toBe(true);
    // Combined types start at Um 72.5 kV.
    expect(picked.results[0]!.model).toMatch(/\/72\.5C-/);
    const clash = top({ ...duty, selectorSize: "C", preferStructure: "compound" });
    expect(clash.ok).toBe(false);
    expect(clash.errorsZh[0]).toContain("复合式没有选择器等级");
    expect(localizeNote(clash.errorsEn[0]!, "id")).not.toBe(clash.errorsEn[0]);
    const none = top({ ...duty, selectorSize: "C", mounting: "dry_type", medium: "dry" });
    expect(none.ok).toBe(false);
  });

  it("a family with no grade letter says b was not checked", () => {
    const r = top({ preferStructure: "compound", throughCurrentA: 350, umKv: 40.5, insulBBilKv: 300 });
    const c = r.results[0]!.cautionsEn.find((x) => x.includes("carries no selector grade"));
    expect(c).toBe("CV2 carries no selector grade: stated b insulation not checked.");
    expect(localizeNote(c!, "tr")).not.toBe(c);
  });
});

describe("CLI matches the form", () => {
  const duty = "--iu 600 --um 72.5 --structure combined";

  it("--c1-li / --b-ac set the grade", () => {
    expect(first(duty)).toMatch(/\/72\.5B-/);
    expect(first(`${duty} --c1-li 560`)).toMatch(/\/72\.5D-/);
    expect(first(`${duty} --b-ac 82`)).toMatch(/\/72\.5C-/);
    expect(cli(`${duty} --c1-li 560 --json`).out).toContain('"c1 LI 560 kV"');
  });

  it("--grade keeps a letter that covers and raises one that does not", () => {
    expect(first(`${duty} --grade C`)).toMatch(/\/72\.5C-/);
    const raised = cli(`${duty} --grade B --b-li 300`);
    expect(raised.out.split(/\r?\n/)[0]).toMatch(/\/72\.5C-/);
    expect(raised.out).toContain("选择器等级已由 B 升为 C（Um 72.5 kV 或给定的绝缘要求）。");
  });

  it("refuses the on-load flags with --octc and a letter that is no grade", () => {
    expect(cli("--iu 600 --um 72.5 --octc --grade C").code).not.toBe(0);
    expect(cli("--iu 600 --um 72.5 --octc --c2-ac 100").code).not.toBe(0);
    expect(cli(`${duty} --grade F`).code).not.toBe(0);
  });
});

describe("form", () => {
  const typed = {
    ...INITIAL_FORM,
    input: { ...INITIAL_FORM.input, acrossTapBilKv: 350, insulBPfKv: 82, insulC1BilKv: 560 },
  };

  it("the link keeps the typed distances and the picked letter", () => {
    expect(decodeForm(encodeForm(typed)).form.input).toMatchObject({
      acrossTapBilKv: 350,
      insulBPfKv: 82,
      insulC1BilKv: 560,
    });
    const letter = pickSelectorGrade(INITIAL_FORM, "D");
    expect(decodeForm(encodeForm(letter)).form.input.selectorSize).toBe("D");
  });

  it("a letter drops the typed distances", () => {
    const f = pickSelectorGrade(typed, "C");
    expect(f.input.selectorSize).toBe("C");
    expect(f.input.acrossTapBilKv).toBeUndefined();
    expect(f.input.insulBPfKv).toBeUndefined();
    expect(f.input.insulC1BilKv).toBeUndefined();
  });

  it("a new tender line and 无载 start without the last job's grade", () => {
    const next = readLine(pickSelectorGrade(typed, "D"), "40 MVA 110/11 kV YNd11 ±8×1.25%");
    expect(next.input.selectorSize).toBe("auto");
    const off = toOctc(typed);
    expect(off.input.insulC1BilKv).toBeUndefined();
    expect(off.input.acrossTapBilKv).toBe(350);
  });
});
