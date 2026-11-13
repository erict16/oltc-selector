import { describe, expect, it } from "vitest";
import { runCli } from "./cli";
import { selectOltc } from "./engine";
import { normalizeTenderText } from "./nameplate";
import { deriveDuty } from "./transformer";
import type { SelectInput } from "./types";

/** 2026-11-13 full review: one test for each defect it found. */

function cli(...argv: string[]): { code: number; out: string; err: string } {
  let out = "";
  let err = "";
  const code = runCli(["--lang", "en", ...argv], {
    stdout: (s) => (out += s),
    stderr: (s) => (err += s),
  });
  return { code, out, err };
}
const first = (...argv: string[]) => cli(...argv).out.split("\n")[0];

const oltc: SelectInput = {
  mounting: "in_tank",
  medium: "oil_vacuum",
  preferVacuum: true,
  dutyKind: "oltc",
  phases: "III",
  connection: "Y",
  throughCurrentA: 350,
  umKv: 40.5,
  stepVoltageV: 0,
  regulation: "reversing",
  plusMinusSteps: 8,
  mdu: "none",
};
const dry: SelectInput = {
  ...oltc,
  mounting: "dry_type",
  medium: "dry",
  throughCurrentA: 150,
  umKv: 12,
  plusMinusSteps: undefined,
};

describe("engine: off-circuit list rows", () => {
  it("800 A D at 72.5 finds the 2000 A row that 1001 A finds", () => {
    expect(first("--octc", "--iu", "800", "--um", "72.5", "--conn", "D", "--pm", "8")).toBe(
      "WSLIV-2000D/72.5-18x17E",
    );
    expect(first("--octc", "--iu", "1001", "--um", "72.5", "--conn", "D", "--pm", "8")).toBe(
      "WSLIV-2000D/72.5-18x17E",
    );
  });

  it("a small row one class up still beats a far larger row in the class (as before)", () => {
    expect(first("--octc", "--iu", "63", "--um", "145", "--pos", "5")).toBe("WSLIV-600Y/170-6x5B");
  });

  it("a list row with no size letter can be chosen", () => {
    expect(first("--octc", "--iu", "900", "--um", "252", "--conn", "Y", "--pos", "5")).toBe(
      "WSLIV-1000Y/252-6x5",
    );
  });
});

describe("engine: tap codes outside the brochure", () => {
  it("CV2 ±3 (10071W) carries the not-in-Fig.-3-3 caution", () => {
    const r = selectOltc({ ...oltc, plusMinusSteps: 3 }).results[0]!;
    expect(r.model).toBe("CV2III-350Y/40.5-10071W");
    expect(r.cautionsEn.join(" ")).toMatch(/not a brochure/i);
  });

  it("the guide's pitch-10 ladder (±6 … ±9 mid 1) stays standard", () => {
    for (const n of [6, 7, 8, 9]) {
      const r = selectOltc({ ...oltc, plusMinusSteps: n, midPositions: 1 }).results[0]!;
      expect(r.cautionsEn.join(" "), `±${n}`).not.toMatch(/not a brochure/i);
    }
  });

  it.each([2.5, 0, -3, Number.NaN])("± steps %s is refused", (n) => {
    const out = selectOltc({ ...oltc, plusMinusSteps: n });
    expect(out.ok).toBe(false);
    expect(out.errorsEn.join(" ")).toMatch(/± steps/);
  });
});

describe("engine: dry-type CVT follows its brochure", () => {
  it("linear 9 positions is CVT", () => {
    expect(selectOltc({ ...dry, regulation: "linear", positions: 9 }).results[0]?.model).toBe(
      "CVTIII-160Y/12-0909",
    );
  });

  it("a ± range still gets the sold CVT, with a note that it is a linear type", () => {
    const r = selectOltc({ ...dry, plusMinusSteps: 4 }).results[0]!;
    expect(r.model).toBe("CVTIII-160Y/12-0909");
    expect(r.cautionsEn.join(" ")).toContain("linear-regulation type");
    expect(selectOltc({ ...dry, regulation: "linear", positions: 9 }).results[0]!.cautionsEn.join(" ")).not.toContain(
      "linear-regulation type",
    );
  });

  it("linear 10 positions is not CVT (maximum 9)", () => {
    const models = selectOltc({ ...dry, regulation: "linear", positions: 10 }).results.map((r) => r.model);
    expect(models.some((m) => m.includes("CVT"))).toBe(false);
  });

});

describe("tender line: full-width and split notations", () => {
  const half = first("--line", "31.5 MVA 110±8×1.25%/10.5 kV YNd11");

  it("the reference line sizes the 110 kV winding", () => {
    expect(half).toBe("CV2III-350Y/72.5-10193W");
  });

  it.each([
    "31.5 MVA 110±8×1.25%／10.5 kV YNd11",
    "31.5MVA 110（±8×1.25%）／10.5kV YNd11",
    "31.5MVA 110+8x1.25%-8x1.25%/10.5kV YNd11",
  ])("%s reads the same", (line) => {
    expect(first("--line", line)).toBe(half);
  });

  it("an uneven split range keeps its minus steps", () => {
    expect(normalizeTenderText("110+4x1.25%-12x1.25%/10.5kV")).toContain("+4/-12x1.25%");
  });
});

describe("CLI: flags that used to be dropped are errors", () => {
  it.each([
    [["--conn", "D", "--tap", "neutral", "--iu", "400", "--um", "72.5"], /--conn D conflicts/],
    [["--series", "II", "--iu", "400", "--um", "72.5"], /add --octc/],
    [["--contact", "6x5", "--iu", "400", "--um", "72.5"], /add --octc/],
    [["--structure", "cage", "--iu", "400", "--um", "72.5"], /add --octc/],
    [["--octc", "--structure", "combined", "--iu", "400", "--um", "72.5"], /cage or drum/],
    [["--octc", "--vacuum", "--iu", "400", "--um", "72.5"], /--vacuum does not apply/],
    [["--mount", "dry", "--oil", "--iu", "150", "--um", "12"], /--oil does not apply/],
    [["--mount", "reactor", "--vacuum", "--iu", "400", "--um", "40.5"], /--vacuum does not apply/],
    [["--pm", "8", "--pos", "23", "--iu", "400", "--um", "72.5"], /disagree/],
    [["--iu", "400", "--um", "72.5", "--iu", "500"], /given twice/],
    [["--iu", "400", "--um", "72.5", "--earth-um", "126"], /not both/],
    // 2026-11-14 CLI review
    [["--mva", "25", "--kv", "110", "--um", "126", "--earth-um", "72.5"], /not both/],
    [["--iu", "400", "--um", "72.5", "--oil", "--vacuum"], /--oil or --vacuum, not both/],
    [["--iu", "400", "--um", "72.5", "--vacuum", "--oil"], /--oil or --vacuum, not both/],
    [["--iu", "800", "--um", "72.5", "--duty", "oltc", "--octc"], /conflicts with --duty oltc/],
    [["--iu", "800", "--um", "72.5", "--octc", "--duty", "oltc"], /conflicts with --duty oltc/],
    [["--iu", "400", "--um", "72.5", "--conn", "Y", "--tap", "line"], /--conn Y conflicts with --tap line/],
    [["--mva", "25", "--kv", "110", "--hv", "220"], /add --kind auto/],
    [["--iu", "400", "--um", "72.5", "--minus", "12"], /--minus sets the lowest-tap current/],
    [["--mva", "25", "--kv", "110", "--step-pct", "0.0125"], /--step-pct is a percent/],
  ] as const)("%j", (argv, message) => {
    const r = cli(...argv);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(message);
  });

  it("--earth-um alone on the --iu path is the Um", () => {
    expect(first("--iu", "400", "--earth-um", "126")).toBe("CV2III-600Y/126-10193W");
  });

  it.each([
    [["--pm", "8", "--pos", "19"], "10193W"],
    [["--pm", "9", "--pos", "19"], "10191W"],
    [["--pm", "11", "--pos", "23"], "12231W"],
    [["--reg", "G", "--pm", "7", "--pos", "17"], "10173G"],
  ] as const)("--pm and --pos that agree are accepted: %j", (argv, code) => {
    const r = cli(...argv, "--iu", "156", "--um", "72.5", "--ust", "500");
    expect(r.code).toBe(0);
    expect(r.out.split("\n")[0]).toContain(code);
  });

  it("--conn beside --mva or --line is refused: it used to swap the current formula unseen", () => {
    // 2026-11-14: a YN line with --conn D was sized as a delta, I = S/(3U).
    for (const argv of [
      ["--line", "25MVA 110±8x1.25%/10.5kV YNd11", "--conn", "D"],
      ["--mva", "25", "--kv", "110", "--conn", "D"],
    ]) {
      const r = cli(...argv);
      expect(r.code).toBe(1);
      expect(r.err).toContain("--conn does not apply with --mva");
      expect(r.err).toContain("--tap line");
    }
    expect(first("--mva", "25", "--kv", "110", "--tap", "line", "--winding", "delta")).toBe("CV2III-350D/126-10193W");
  });

  it("a switch flag with a value is named", () => {
    expect(cli("--json=1", "--iu", "400", "--um", "72.5").err).toContain("--json takes no value");
  });

  it("--across-li 0 still means not stated", () => {
    expect(cli("--iu", "400", "--um", "72.5", "--across-li", "0").code).toBe(0);
  });

  it("--json with nothing to select is an error, in JSON", () => {
    let out = "";
    const code = runCli(["--json"], { stdout: (s) => (out += s), stderr: () => {} });
    expect(code).toBe(1);
    expect(JSON.parse(out).ok).toBe(false);
  });

  it("an off-circuit duty moved one class up says so once", () => {
    const out = cli("--octc", "--iu", "300", "--um", "40.5", "--conn", "D", "--pm", "8").out;
    expect(out).toContain("next class 72.5 kV");
    expect(out).not.toContain("is not a class of this type");
  });
});

describe("CLI: numbers", () => {
  it.each([
    [["--iu", "-400", "--um", "72.5"], /--iu must be greater than 0/],
    [["--iu", "0", "--um", "72.5"], /--iu must be greater than 0/],
    [["--iu", "400", "--um", "-5"], /--um must be greater than 0/],
    [["--iu", "400", "--um", "72.5", "--pm", "8.5"], /--pm must be a whole number/],
    [["--iu", "400", "--um", "72.5", "--pm", "0"], /--pm must be greater than 0/],
    [["--iu", "400", "--um", "72.5", "--pm", "-3"], /--pm must be greater than 0/],
  ] as const)("%j", (argv, message) => {
    const r = cli(...argv);
    expect(r.code).toBe(1);
    expect(r.err).toMatch(message);
  });

  it("--flag=value works for every flag", () => {
    expect(first("--iu=400", "--um=72.5", "--pm=8")).toBe(first("--iu", "400", "--um", "72.5", "--pm", "8"));
  });
});

describe("CLI: help, version, unknown flags", () => {
  it("no arguments prints help and exits 0", () => {
    let out = "";
    const code = runCli([], { stdout: (s) => (out += s), stderr: () => {} });
    expect(code).toBe(0);
    expect(out).toContain("Usage:");
  });

  it("--help wins over an unknown flag", () => {
    const r = cli("--foo", "--help");
    expect(r.code).toBe(0);
    expect(r.out).toContain("Usage:");
  });

  it.each(["--version", "-v", "-V"])("%s prints the version", (flag) => {
    const r = cli(flag);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/^oltc-selector \d+\.\d+\.\d+\n$/);
  });

  it("a typo gets a suggestion and points to --help", () => {
    const r = cli("--pmm", "8");
    expect(r.code).toBe(1);
    expect(r.err).toContain("Did you mean --pm?");
    expect(r.err).toContain("--help");
  });

  it("every flag the help lists is one the parser knows", () => {
    const help = cli("--help").out;
    const listed = new Set(help.match(/--[a-z][a-z-]+/g));
    listed.delete("--flag"); // the "--flag=value" sentence
    for (const flag of listed) {
      const r = cli(flag, "1");
      expect(r.err, flag).not.toContain(`Unknown flag: ${flag}.`);
    }
  });
});

describe("CLI: --json", () => {
  it("no type: ok false, exit 1, still JSON", () => {
    const r = cli("--iu", "99999", "--um", "72.5", "--json");
    expect(r.code).toBe(1);
    const j = JSON.parse(r.out);
    expect(j.ok).toBe(false);
    expect(j.model).toBeNull();
    expect(j.errors.length).toBeGreaterThan(0);
  });

  it("a bad flag: the error is JSON on stdout, in both languages, and stderr stays empty", () => {
    // The helper above runs in English; Chinese is the default.
    const r = cli("--iu", "abc", "--json");
    expect(r.code).toBe(1);
    const j = JSON.parse(r.out);
    expect(j).toMatchObject({ ok: false, model: null });
    expect(j.errors).toEqual(["Invalid number for --iu: abc"]);
    expect(r.err).toBe("");
    let zhOut = "";
    let zhErr = "";
    runCli(["--iu", "abc", "--json"], { stdout: (t) => (zhOut += t), stderr: (t) => (zhErr += t) });
    expect(JSON.parse(zhOut).errors).toEqual(["--iu 的数字无效：abc", "Invalid number for --iu: abc"]);
    expect(zhErr).toBe("");
  });

  it("--line reads an all-lowercase vector group", () => {
    // 2026-11-14: "ynd11" printed "no vector group".
    const r = cli("--line", "transformer 40 mva, 132/33 kv, ynd11, ±8x1.25%");
    expect(r.out).toContain("YNd11");
    expect(r.out).not.toContain("no vector group");
    expect(cli("--line", "16 mva 22±8x1.25%/0.4 kv dyn11").out).toContain("Dyn11");
    expect(cli("--line", "125mva 225±8x1.25%/115/35kv yna0d11").out).toContain("autotransformer");
  });

  it("--line with a bare 'off-circuit' is off-circuit duty; 'no-load losses' is not", () => {
    // 2026-11-14: "Dyn11 off-circuit ±2x2.5%" was sized as an on-load CV2.
    expect(first("--line", "31.5MVA 33/11 kV Dyn11 off-circuit ±2x2.5%")).toBe("WSGII-600D/40.5-4x5A");
    expect(first("--line", "31.5MVA 33±8x1.25%/11 kV Dyn11, no-load losses 18 kW")).toMatch(/^CV2III-/);
  });

  it("--version --json is JSON too", () => {
    expect(JSON.parse(cli("--version", "--json").out)).toMatchObject({ ok: true });
  });

  it("carries the resolved duty as numbers and the line read-back", () => {
    const r = cli("--line", "63MVA 110+4x1.25%-12x1.25%/10.5kV YNd11", "--json");
    expect(r.code).toBe(0);
    const j = JSON.parse(r.out);
    expect(j.ok).toBe(true);
    expect(j.resolved).toMatchObject({ umKv: 72.5, connection: "Y", plusMinusSteps: 8 });
    expect(j.resolved.throughCurrentA).toBeGreaterThan(380);
    expect(j.line).toMatchObject({ mva: 63, voltagesKv: [110, 10.5], vectorGroup: "YNd11" });
    expect(typeof j.version).toBe("string");
  });

  it("the --iu path with --kv has no NaN in the basis", () => {
    const r = cli("--iu", "400", "--um", "72.5", "--kv", "110", "--json");
    expect(r.out).not.toContain("NaN");
    expect(cli("--iu", "400", "--um", "72.5", "--kv", "110").out).not.toContain("NaN");
  });
});

describe("CLI: notes", () => {
  it("a stated Um below the rule is flagged, as on the page", () => {
    const r = cli("--mva", "25", "--kv", "110", "--um", "40.5");
    expect(r.out).toContain("is below the 72.5 kV the winding voltage gives");
  });

  it("a Um that is not a class says where it went", () => {
    expect(cli("--iu", "400", "--um", "73").out).toContain("sized at Um 126 kV");
  });

  it("an autotransformer no longer carries a reference type of another family", () => {
    const r = cli("--line", "240MVA 220/110/35kV YNa0d11");
    expect(r.out).not.toContain("Reference:");
    const d = deriveDuty({
      kind: "auto",
      tapPoint: "auto_junction",
      winding: "star",
      mva: 125,
      tapKv: 0,
      hvKv: 225,
      mvKv: 115,
      minusSteps: 8,
      stepFraction: 0.0125,
      safetyK: 1,
    });
    expect(d.cautionsEn.join(" ")).not.toContain("Reference:");
  });

  it("three voltages read back as three-winding", () => {
    expect(cli("--line", "50MVA 110±8x1.25%/38.5/10.5kV YNyn0d11").out).toContain("Line: three-winding");
  });

  it("dry-type default ±8 says what to try", () => {
    const r = cli("--mount", "dry", "--iu", "150", "--um", "12");
    expect(r.code).toBe(1);
    expect(r.err).toContain("--mid 1");
  });
});

describe("engine: one place for the medium rule", () => {
  it("a reactor on the vacuum default still finds the oil switch", () => {
    const out = selectOltc({ ...oltc, mounting: "reactor", umKv: 40.5, throughCurrentA: 350 });
    expect(out.results[0]?.model).toMatch(/^3?x?HWDK/);
  });

  it("off-circuit on the vacuum default is treated as oil", () => {
    const out = selectOltc({
      ...oltc,
      dutyKind: "octc",
      regulation: "linear",
      plusMinusSteps: undefined,
      positions: 5,
      throughCurrentA: 600,
    });
    expect(out.ok).toBe(true);
  });

  it("a NaN across-tap stress is refused by name", () => {
    const out = selectOltc({ ...oltc, acrossTapBilKv: Number.NaN });
    expect(out.ok).toBe(false);
    expect(out.errorsEn.join(" ")).toContain("Across-tap LI");
  });
});

describe("autotransformer above the catalogue on both sides", () => {
  it("765/400 kV does not print an empty Um list", () => {
    const d = deriveDuty({
      kind: "auto",
      tapPoint: "auto_junction",
      winding: "star",
      mva: 500,
      tapKv: 0,
      hvKv: 765,
      mvKv: 400,
      minusSteps: 8,
      stepFraction: 0.0125,
      safetyK: 1,
    });
    expect(d.ok).toBe(false);
    expect(d.errorEn).not.toMatch(/:\s+kV\./);
    expect(d.errorEn).toContain("Contact engineering");
  });
});
