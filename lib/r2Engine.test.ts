import { describe, expect, it } from "vitest";
import { resolveSelectorSize } from "./catalog";
import { runCli } from "./cli";
import { octcContactCode, selectOltc } from "./engine";
import { localizeNote } from "./noteI18n";
import type { SelectInput } from "./types";
import { truncatedTapCode, unevenTapGeometry } from "../scripts/replayTap";

/** 2026-11-04 r2 engine track: every finding's repro (ENGINE-1…4, ORDERS-1/2/9). */

function cli(argv: string[]): { code: number; out: string; err: string } {
  let out = "";
  let err = "";
  const code = runCli([...argv, "--no-update-check"], {
    stdout: (s) => {
      out += s;
    },
    stderr: (s) => {
      err += s;
    },
  });
  return { code, out, err };
}
const first = (argv: string[]) => cli(argv).out.trim().split(/\r?\n/)[0]!;

const base: SelectInput = {
  mounting: "in_tank",
  medium: "oil_vacuum",
  preferVacuum: true,
  phases: "III",
  connection: "Y",
  throughCurrentA: 300,
  umKv: 72.5,
  stepVoltageV: 800,
  regulation: "reversing",
  plusMinusSteps: 8,
  midPositions: 3,
  selectorSize: "auto",
  preferStructure: "auto",
  mdu: "none",
};
const octc = (o: Partial<SelectInput>): SelectInput => ({
  ...base,
  dutyKind: "octc",
  medium: "oil",
  preferVacuum: false,
  regulation: "linear",
  plusMinusSteps: undefined,
  midPositions: undefined,
  ...o,
});

describe("ENGINE-1 half-given across-tap stress keeps the Um default", () => {
  it("resolveSelectorSize needs both LI and AC to go below the default", () => {
    expect(resolveSelectorSize(170, "auto", 260, undefined, "cm2", true).size).toBe("D");
    expect(resolveSelectorSize(170, "auto", undefined, 50, "cm2", true).size).toBe("D");
    const both = resolveSelectorSize(170, "auto", 260, 82, "cm2", true);
    expect(both.size).toBe("C");
    expect(both.loweredFrom).toBe("D");
  });

  it("CLI: LI 260 alone gives 170D; LI 260 + AC 82 gives 170C with a caution", () => {
    const one = ["--iu", "550", "--um", "170", "--phases", "I", "--across-li", "260"];
    expect(first(one)).toBe("CM2I-600/170D-10193W");
    expect(first(["--iu", "550", "--um", "170", "--phases", "I"])).toBe("CM2I-600/170D-10193W");
    const both = cli([...one, "--across-ac", "82"]);
    expect(both.out.split(/\r?\n/)[0]).toBe("CM2I-600/170C-10193W");
    expect(both.out).toContain("低于 Um 170 kV 的默认 D");
  });

  it("CLI: AC 50 alone on a 220 kV neutral stays 252D", () => {
    const argv = ["--mva", "100", "--kv", "220", "--tap", "neutral", "--winding", "star", "--pm", "8", "--step-pct", "1.25", "--market", "IT"];
    expect(first([...argv, "--across-ac", "50"])).toBe(first(argv));
    expect(first([...argv, "--across-ac", "50"])).toMatch(/\/252D-/);
  });

  it("CLI echoes the across-tap values in the 假定 line", () => {
    const out = cli(["--iu", "550", "--um", "170", "--phases", "I", "--across-li", "260"]).out;
    expect(out).toContain("调压绕组间 LI 260 / AC 未指定 kV");
  });
});

describe("ENGINE-2 a typed WSL contact must cover the positions", () => {
  it("6x5 for 17 positions on D: no 6x5 type, the error names positions", () => {
    const out = selectOltc(octc({ throughCurrentA: 800, connection: "D", positions: 17, octcContact: "6x5" }));
    expect(out.results.some((r) => r.model.includes("6x5"))).toBe(false);
    expect(out.errorsEn[0]).toBe("Contact 6x5 covers 6 positions; 17 were asked.");
  });

  it("6x5 for ±4 at 126 kV: no 6x5 string", () => {
    const out = selectOltc(octc({ throughCurrentA: 600, umKv: 126, plusMinusSteps: 4, octcContact: "6x5" }));
    expect(out.results.some((r) => r.model.includes("-6x5"))).toBe(false);
  });

  it("a covering contact still wins (12x2 on 12 positions, VIII)", () => {
    const input = octc({ throughCurrentA: 800, positions: 12, octcSeries: "VIII", octcContact: "12x2" });
    expect(octcContactCode(input, "wsl")).toBe("12x2");
    expect(octcContactCode({ ...input, positions: 5, octcContact: "5x2" }, "wsl")).toBe("5x2");
    expect(octcContactCode({ ...input, positions: 9, octcContact: "6x5" }, "wsl")).toBe("");
  });
});

describe("ENGINE-3 drum OCTC on D names the connection", () => {
  it("300 A / 72.5 / drum / 5 positions / I / D", () => {
    const r = cli(["--iu", "300", "--um", "72.5", "--octc", "--structure", "drum", "--pos", "5", "--phases", "I", "--conn", "D"]);
    expect(r.code).not.toBe(0);
    const text = r.out + r.err;
    expect(text).toContain("star (Y) points only");
    expect(text).not.toContain("40.5 kV, WSG");
    expect(first(["--iu", "300", "--um", "72.5", "--octc", "--structure", "drum", "--pos", "5", "--phases", "I", "--conn", "Y"])).toBe("WDGIV-300/72.5-5x5B");
  });
});

describe("ENGINE-4 drum no-result label is a sold row", () => {
  it("1300 A drum names WDGIV-1250/72.5, 3× only for a three-phase set", () => {
    const three = selectOltc(octc({ throughCurrentA: 1300, umKv: 40.5, positions: 5, preferStructure: "drum" }));
    expect(three.errorsEn.join(" ")).toContain("3×WDGIV-1250/72.5");
    const one = selectOltc(octc({ throughCurrentA: 1300, umKv: 40.5, positions: 5, preferStructure: "drum", phases: "I" }));
    expect(one.errorsEn.join(" ")).toContain("(1250 A, WDGIV-1250/72.5)");
    expect(one.errorsEn.join(" ")).not.toContain("WDGI-");
  });
});

describe("ORDERS-1 330 kV-class neutral one grade above the Um default", () => {
  it("400 kV neutral, 180.4 A, 2886.8 V, ±12 G gives SHZVIII-400Y/126D-14273G", () => {
    const r = cli(["--mva", "125", "--kv", "400", "--tap", "neutral", "--reg", "G", "--pm", "12", "--ust", "2886.8"]);
    expect(r.out.split(/\r?\n/)[0]).toBe("SHZVIII-400Y/126D-14273G");
    expect(r.out).toContain("330 kV 级及以上绕组");
  });

  it("the same duty on a 115 kV winding keeps the Um default", () => {
    const duty: SelectInput = { ...base, umKv: 72.5, throughCurrentA: 300, stepVoltageV: 1000, plusMinusSteps: 8, midPositions: 3, preferStructure: "combined" };
    const low = selectOltc({ ...duty, tapWindingKv: 115 }).results[0]!;
    expect(low.model).toBe("CM2III-500Y/72.5B-10193W");
    const high = selectOltc({ ...duty, tapWindingKv: 400 }).results[0]!;
    expect(high.selectorSize).toBe("C");
    expect(high.cautionsEn).toContain("Selector grade raised one step to C: winding of 330 kV class or above.");
    // An autotransformer, a typed grade or a stated stress is left alone.
    expect(selectOltc({ ...duty, tapWindingKv: 400, transformerKind: "auto" }).results[0]!.selectorSize).toBe("B");
    expect(selectOltc({ ...duty, tapWindingKv: 400, selectorSize: "B" }).results[0]!.selectorSize).toBe("B");
  });

  it("a 275 kV line stays SHZVIII-600Y/72.5B-12233W", () => {
    expect(first(["--line", "185 MVA, 275/33 kV, YNd11, +12/-8 x 1.25%"])).toBe("SHZVIII-600Y/72.5B-12233W");
  });
});

describe("ORDERS-2 replay tap codes", () => {
  it("cut-off codes are skipped, real short codes are kept", () => {
    expect(truncatedTapCode("1", "CV")).toBe(true);
    expect(truncatedTapCode("1", "HWV")).toBe(true);
    expect(truncatedTapCode("12231", "CM2")).toBe(true);
    expect(truncatedTapCode("10191", "CM2")).toBe(true);
    expect(truncatedTapCode("17", "CZ")).toBe(false);
    expect(truncatedTapCode("17", "HWDK")).toBe(false);
    expect(truncatedTapCode("0909", "CVT")).toBe(false);
    expect(truncatedTapCode("10070", "CV")).toBe(false);
    expect(truncatedTapCode("10193W", "CM2")).toBe(false);
  });

  it("10181G feeds 18 positions mid 1 (not ±9 = 10191G)", () => {
    const g = unevenTapGeometry("10181G");
    expect(g).toEqual({ positions: 18, midPositions: 1, pitch: 10 });
    expect(unevenTapGeometry("10183W")).toEqual({ positions: 18, midPositions: 3, pitch: 10 });
    expect(unevenTapGeometry("10193W")).toBeNull();
    const out = selectOltc({ ...base, umKv: 126, throughCurrentA: 300, regulation: "coarse_fine", plusMinusSteps: undefined, ...g! });
    expect(out.results[0]!.tapCode).toBe("10181G");
  });
});

describe("ORDERS-9 positions below 2 are refused", () => {
  it("CLI --pos 1, 0 and 2.5 exit 1", () => {
    for (const p of ["1", "0", "2.5"]) {
      const r = cli(["--iu", "100", "--um", "40.5", "--conn", "D", "--reg", "0", "--pos", p]);
      expect(r.code).toBe(1);
      expect(r.err).toContain("--pos must be a whole number of at least 2");
    }
  });

  it("engine refuses positions 1; linear 5 stays a standard code", () => {
    const lin = { ...base, connection: "D" as const, throughCurrentA: 100, umKv: 40.5, regulation: "linear" as const, plusMinusSteps: undefined, midPositions: undefined };
    const one = selectOltc({ ...lin, positions: 1 });
    expect(one.ok).toBe(false);
    expect(one.errorsEn).toContain("Positions must be a whole number of at least 2.");
    const five = selectOltc({ ...lin, positions: 5 });
    expect(five.ok).toBe(true);
    expect(five.results[0]!.cautionsEn.some((c) => c.includes("Fig. 3-3"))).toBe(false);
  });
});

describe("r2 engine notes are translated", () => {
  const notes = [
    ...selectOltc(octc({ throughCurrentA: 800, connection: "D", positions: 17, octcContact: "6x5" })).errorsEn,
    ...selectOltc(octc({ throughCurrentA: 300, positions: 5, preferStructure: "drum", phases: "I", connection: "D" })).errorsEn,
    ...selectOltc({ ...base, positions: 1, regulation: "linear" }).errorsEn,
    ...selectOltc({ ...base, umKv: 170, phases: "I", throughCurrentA: 550, acrossTapBilKv: 260, acrossTapPfKv: 82 }).results[0]!.cautionsEn,
    ...selectOltc({ ...base, preferStructure: "combined", stepVoltageV: 1000, tapWindingKv: 400 }).results[0]!.cautionsEn,
  ];
  it("collects the new notes", () => {
    expect(notes.some((n) => n.startsWith("Contact 6x5"))).toBe(true);
    expect(notes.some((n) => n.includes("drum OCTC is sold for star"))).toBe(true);
    expect(notes.some((n) => n.startsWith("Positions must be"))).toBe(true);
    expect(notes.some((n) => n.includes("is below the Um 170 kV default D"))).toBe(true);
    expect(notes.some((n) => n.includes("raised one step"))).toBe(true);
  });
  it.each(["vi", "es", "tr", "id"] as const)("every note has a %s translation", (lang) => {
    expect(notes.filter((n) => localizeNote(n, lang) === n)).toEqual([]);
  });
});
