import { describe, expect, it } from "vitest";
import {
  cliToSelectInput,
  formatCliText,
  parseCliArgs,
  runCli,
} from "./cli";
import { commercialTypeExists } from "./typeExists";

function capture(argv: string[]): { code: number; out: string; err: string } {
  let out = "";
  let err = "";
  const code = runCli(argv, {
    stdout: (s) => {
      out += s;
    },
    stderr: (s) => {
      err += s;
    },
  });
  return { code, out, err };
}

describe("oltc CLI", () => {
  it("350 A / 40.5 kV D reversing ±8 → legal CV2-350D primary, no prices", () => {
    const argv = ["--iu", "350", "--um", "40.5", "--conn", "D", "--reg", "W", "--pm", "8"];
    const a = capture(argv);
    const b = capture(argv);
    expect(a.code).toBe(0);
    expect(a.out).toBe(b.out);
    const primary = a.out.trim().split(/\r?\n/)[0]!;
    expect(primary).toBe("CV2III-350D/40.5-10193W");
    expect(commercialTypeExists(primary)).toBe(true);
    expect(a.out).not.toMatch(/RMB|CNY|USD|listRmb|coeff|报价|\$/i);
  });

  it("maps --octc and --structure onto SelectInput", () => {
    const octc = cliToSelectInput(
      parseCliArgs([
        "--octc",
        "--iu",
        "800",
        "--um",
        "72.5",
        "--conn",
        "D",
        "--series",
        "II",
        "--contact",
        "6x5",
      ]),
    );
    expect(octc.dutyKind).toBe("octc");
    expect(octc.octcSeries).toBe("II");
    expect(octc.octcContact).toBe("6x5");
    expect(octc.preferStructure).toBe("auto");

    const combined = cliToSelectInput(
      parseCliArgs([
        "--iu",
        "600",
        "--um",
        "72.5",
        "--conn",
        "Y",
        "--reg",
        "W",
        "--pm",
        "8",
        "--structure",
        "combined",
      ]),
    );
    expect(combined.dutyKind).toBe("oltc");
    expect(combined.preferStructure).toBe("combined");
    const text = formatCliText(combined);
    const primary = text.trim().split(/\r?\n/)[0]!;
    expect(primary.startsWith("CV2")).toBe(false);
    expect(commercialTypeExists(primary)).toBe(true);
  });

  it("MVA path derives Imax and Um", () => {
    const input = cliToSelectInput(
      parseCliArgs(["--mva", "25", "--kv", "110", "--conn", "Y", "--reg", "W", "--pm", "8"]),
    );
    expect(input.throughCurrentA).toBeGreaterThan(130);
    expect(input.umKv).toBe(72.5);
  });

  it("--iu is Imax: --k on the --iu path is refused, not silently dropped", () => {
    expect(() =>
      cliToSelectInput(
        parseCliArgs(["--iu", "350", "--k", "2", "--um", "40.5", "--conn", "D"]),
      ),
    ).toThrow(/--k applies only on the --mva path/);
    const iu = cliToSelectInput(
      parseCliArgs(["--iu", "350", "--um", "40.5", "--conn", "D"]),
    );
    expect(iu.throughCurrentA).toBe(350);
  });

  it("refuses ambiguous thousands separators and conflicting current sources", () => {
    // 1,200 used to parse as 1.2 A → CV2-350.
    expect(() => parseCliArgs(["--iu", "1,200"])).toThrow(/Ambiguous/);
    expect(parseCliArgs(["--iu", "1200"]).iu).toBe(1200);
    expect(parseCliArgs(["--ust", "1500,5"]).ust).toBe(1500.5);
    expect(() => parseCliArgs(["--iu", "0x400"])).toThrow(/Invalid number/);
    expect(() =>
      cliToSelectInput(
        parseCliArgs(["--iu", "1200", "--mva", "25", "--kv", "110"]),
      ),
    ).toThrow(/not both/);
    expect(() =>
      cliToSelectInput(parseCliArgs(["--mva", "25", "--kv", "110", "--k", "0.5"])),
    ).toThrow(/≥ 1/);
    expect(() => parseCliArgs(["--structure", "toString"])).toThrow(/--structure/);
  });

  it("echoes the wiring the emitted OCTC type actually carries", () => {
    const a = capture(["--octc", "--iu", "800", "--um", "40.5", "--conn", "D", "--pm", "2"]);
    expect(a.out.split(/\r?\n/)[0]).toBe("WSGII-800D/40.5-4x5A");
    expect(a.out).toContain("接线=自动（II）");
  });

  it("says when Ust was not given, and prints the engine cautions", () => {
    const a = capture(["--iu", "400", "--um", "72.5"]);
    expect(a.code).toBe(0);
    expect(a.out).toContain("Ust 未指定");
    expect(a.out).toContain("注意：未给级电压");
    const j = JSON.parse(capture(["--json", "--iu", "400", "--um", "72.5"]).out);
    expect(j.cautions.join(" ")).toContain("未给级电压");
  });

  it("echoes silent defaults so a wrong assumption cannot hide", () => {
    // minimal input: everything high/medium-risk is defaulted
    const a = capture(["--iu", "350", "--um", "40.5"]);
    expect(a.code).toBe(0);
    expect(a.out).toContain("假定：");
    expect(a.out).toContain("conn=Y 星点（默认）");
    expect(a.out).toContain("reg=W 正反调（默认）");
    expect(a.out).toContain("±8 档（默认）");
    expect(a.out).toContain("真空（默认）");
    expect(a.out).toContain("箱内（默认）");
    expect(a.out).toContain("相数=III（默认）");
    // first line stays the bare model
    expect(a.out.trim().split(/\r?\n/)[0]).toBe("CV2III-350Y/40.5-10193W");
  });

  it("octc never borrows the oltc ±8 default for positions", () => {
    // --contact given, no --positions: the contact spec defines the steps
    const a = capture(["--octc", "--iu", "800", "--um", "72.5", "--conn", "D", "--series", "II", "--contact", "6x5"]);
    expect(a.code).toBe(0);
    expect(a.out).not.toContain("17 档");
    // nothing given at all: positions stay honestly unspecified
    const b = capture(["--octc", "--iu", "800", "--um", "72.5"]);
    expect(b.out).toContain("档数未指定");
    // explicit --pm still derives on purpose
    const c = capture(["--octc", "--iu", "800", "--um", "72.5", "--pm", "2"]);
    expect(c.out).toContain("5 档（由 ±2 推）");
  });

  it("capacity path defaults k to 1.0 like the web app and says so", () => {
    const a = capture(["--mva", "60", "--kv", "110", "--conn", "Y", "--reg", "W", "--pm", "8", "--step-pct", "1.25"]);
    expect(a.code).toBe(0);
    // k=1.0: 60 MVA 110 kV Y ≈ 350 A duty → CV2-350, not CV2-600
    expect(a.out.trim().split(/\r?\n/)[0]).toBe("CV2III-350Y/72.5-10193W");
    expect(a.out).toContain("k=1.0（默认）");
    // step-pct was given here, so no default mark on it
    expect(a.out).toContain("step=1.25%");
    expect(a.out).not.toContain("step=1.25%（默认）");
    // silent step-pct gets marked
    const b = capture(["--mva", "60", "--kv", "110", "--conn", "Y", "--reg", "W", "--pm", "8"]);
    expect(b.out).toContain("step=1.25%（默认）");
  });

  it("drops the （默认） mark for explicitly given flags", () => {
    const a = capture([
      "--iu", "350", "--um", "40.5",
      "--conn", "D", "--reg", "W", "--pm", "8",
    ]);
    expect(a.out).toContain("conn=D 线端");
    expect(a.out).not.toContain("conn=D 线端（默认）");
    expect(a.out).not.toContain("reg=W 正反调（默认）");
    // mount and medium still defaulted, so the block stays
    expect(a.out).toContain("真空（默认）");
  });

  it("omits the 假定 block when every watched input is explicit", () => {
    const a = capture([
      "--iu", "350", "--um", "40.5", "--ust", "1000",
      "--conn", "D", "--reg", "W", "--pm", "8",
      "--vacuum", "--mount", "in-tank", "--phases", "III",
    ]);
    expect(a.code).toBe(0);
    expect(a.out).not.toContain("假定：");
  });

  it("--json carries the assumptions array", () => {
    const a = capture(["--json", "--iu", "350", "--um", "40.5"]);
    const j = JSON.parse(a.out);
    expect(j.assumptions.join(" ")).toContain("conn=Y");
    expect(j.assumptions.join(" ")).toContain("（默认）");
  });

  it("octc echo shows wiring and mount, not reg or phantom positions", () => {
    const a = capture(["--octc", "--iu", "800", "--um", "72.5", "--conn", "D", "--contact", "6x5"]);
    expect(a.code).toBe(0);
    expect(a.out).toContain("conn=D 线端");
    expect(a.out).toContain("接线=自动（IV）（默认）");
    expect(a.out.trim().split(/\r?\n/)[0]).toBe("WSLIV-800D/72.5-6x5A");
    expect(a.out).not.toContain("reg=");
    expect(a.out).not.toContain("17 档");
  });
});

describe("oltc CLI tap range and tap point", () => {
  const first = (argv: string[]) => capture(argv).out.trim().split(/\r?\n/)[0];

  it("--pos on W/G sets the brochure ±N instead of the ±8 default", () => {
    // 27 positions G is ±12 mid 3; CV2 stops at 23, so CM2.
    expect(first(["--iu", "300", "--um", "72.5", "--reg", "G", "--pos", "27"])).toBe(
      "CM2III-500Y/72.5B-14273G",
    );
    expect(first(["--iu", "300", "--um", "72.5", "--pos", "23"])).toBe(
      "CV2III-350Y/72.5-12233W",
    );
    expect(capture(["--iu", "300", "--um", "72.5", "--pos", "23"]).out).toContain("23 档（±10）");
    // --pm alone is unchanged
    expect(first(["--iu", "300", "--um", "72.5", "--pm", "8"])).toBe("CV2III-350Y/72.5-10193W");
    expect(first(["--iu", "300", "--um", "72.5"])).toBe("CV2III-350Y/72.5-10193W");
  });

  it("linear --pm N means 2N+1 positions, same as --pos", () => {
    const a = capture(["--iu", "300", "--um", "72.5", "--reg", "0", "--pm", "8"]);
    expect(a.out.split(/\r?\n/)[0]).toBe("CM2III-500Y/72.5B-18170");
    expect(a.out).toContain("17 档（由 ±8 推）");
    expect(first(["--iu", "300", "--um", "72.5", "--reg", "0", "--pos", "17"])).toBe(
      "CM2III-500Y/72.5B-18170",
    );
  });

  it("capacity path takes minus steps from the linear / OCTC range", () => {
    const basis = (argv: string[]) => JSON.parse(capture(["--json", ...argv]).out).basis;
    // 131.2 A rated; −4 × 1.25% → 138.1, −2 × 1.25% → 134.6 (was −8 → 145.8)
    expect(basis(["--mva", "25", "--kv", "110", "--reg", "0", "--pos", "9"]).maxA).toBe(138.1);
    expect(basis(["--mva", "25", "--kv", "110", "--reg", "0", "--pm", "4"]).maxA).toBe(138.1);
    expect(basis(["--mva", "25", "--kv", "110", "--octc", "--pos", "5"]).maxA).toBe(134.6);
    // W/G --pos 23 → ±10
    expect(basis(["--mva", "25", "--kv", "110", "--pos", "23"]).maxA).toBe(150);
    // no range given: the ±8 default stays
    expect(basis(["--mva", "25", "--kv", "110", "--reg", "0"]).maxA).toBe(145.8);
    expect(basis(["--mva", "25", "--kv", "110"]).maxA).toBe(145.8);
  });

  it("--kind auto on the --iu path defaults to the junction and echoes D", () => {
    const a = capture(["--iu", "600", "--um", "252", "--kind", "auto"]);
    expect(a.out.split(/\r?\n/)[0]).toBe("3xCM2I-600/252D-10193W");
    expect(a.out).toContain("conn=D 线端");
    expect(a.out).not.toContain("conn=Y");
    expect(a.out).toContain("开关在串联/公共绕组连接点（默认）");
    const b = capture(["--iu", "600", "--um", "252", "--kind", "auto", "--tap", "junction"]);
    expect(b.out.split(/\r?\n/)[0]).toBe("3xCM2I-600/252D-10193W");
    expect(b.out).toContain("conn=D 线端");
    expect(b.out).not.toContain("（默认） · 自耦变");
  });

  it("--winding delta without --tap sits at the line end", () => {
    const a = capture(["--mva", "10", "--kv", "33", "--winding", "delta"]);
    expect(a.code).toBe(0);
    expect(a.out.split(/\r?\n/)[0]).toBe("CV2III-350D/40.5-10193W");
    expect(a.out).toContain("I = S/(3×33 kV)");
    expect(a.out).toContain("开关在线端 ");
  });

  it("--earth-um rescues a duty whose rule Um is above 363", () => {
    const a = capture(["--mva", "250", "--kind", "auto", "--hv", "400", "--mv", "220", "--earth-um", "252"]);
    expect(a.code).toBe(0);
    expect(a.out.split(/\r?\n/)[0]).toBe("3xCM2I-500/252D-10193W");
    const b = capture(["--mva", "250", "--kind", "auto", "--hv", "400", "--mv", "220"]);
    expect(b.code).toBe(1);
    expect(b.err).toContain("363");
  });
});

// 2026-11-04 tender-line and tap-range audit (track A).
describe("oltc CLI uneven ranges and tender lines", () => {
  const first = (argv: string[]) => capture(argv).out.trim().split(/\r?\n/)[0];
  const json = (argv: string[]) => JSON.parse(capture(["--json", ...argv]).out);

  it("an uneven line takes the Fig. 3-3 row Huaming sold (UNEVEN-1, WC-05)", () => {
    // B01/B02 +7/−10 → 10181W; W02 +12/−8 had no type (21 linear positions).
    expect(first(["--line", "65MVA 150+7-10x1.5%/20kV YNd11"])).toBe("CV2III-350Y/72.5-10181W");
    expect(first(["--line", "165MVA 150+7-10x1.5%/20kV YNd11"])).toBe("SHZVIII-1000Y/72.5B-10181W");
    expect(first(["--line", "370MVA 275+12-8x1.25%/33kV YNd11"])).toBe("SHZVIII-1000Y/72.5B-12233W");
    expect(first(["--line", "120MVA 110+6-10x1.25%/33kV YNd11"])).toBe("SHZVIII-1000Y/72.5B-10193W");
    expect(first(["--line", "130MVA 132+6-4x2.5%/33kV YNd11"])).toBe("SHZVIII-1000Y/72.5B-12111W");
    expect(first(["--line", "110MVA 64+10-15x1.5%/20kV YNd11"])).toBe("SHZVGIII-1300Y/72.5B-14271W");
    expect(first(["--line", "185 MVA, 275/33 kV, YNd11, +12/-8 x 1.25%"])).toBe("CM2III-500Y/72.5B-12233W");
    // A19 and TRAEL were 3 × single-phase 18170.
    expect(first(["--line", "7.5MVA 20+2-14x2.5%/0.4kV YNd11 line end", "--oil"])).toBe("CVIII-350D/40.5-10193W");
    expect(first(["--line", "20MVA 69+4-12x1.25%/13.8kV Dyn1", "--oil"])).toBe("CVIII-350D/72.5-10193W");
    // G rows
    expect(first(["--line", "60MVA 150+8-9x1.5%/20kV YNd11", "--reg", "G"])).toBe("CV2III-350Y/72.5-10181G");
    expect(first(["--line", "66MVA 132+8-11x2%/20kV YNd11", "--reg", "G"])).toMatch(/-12233G$/);
    expect(first(["--line", "20MVA 34.5+4-12x1.25%/0.4kV Dyn11", "--reg", "G", "--oil"])).toBe(
      "CVIII-350D/40.5-10193G",
    );
    // symmetric unchanged
    expect(first(["--line", "25MVA 110±8x1.25%/10.5kV YNd11"])).toBe("CV2III-350Y/72.5-10193W");
  });

  it("the lowest tap uses the real minus steps", () => {
    const b = json(["--line", "65MVA 150+7-10x1.5%/20kV YNd11"]).basis;
    expect([b.maxA, b.stepV]).toEqual([294.3, 1299]);
    expect(json(["--line", "370MVA 275+12-8x1.25%/33kV YNd11"]).basis.maxA).toBe(863.1);
    // E-CV2250412 (WEG): sold CV2III-600Y/40.5-10193W at OS 369.15 A
    const weg = json(["--line", "7.5MVA 13.8+4-12x1.25%/0.44kV YNd11"]);
    expect([weg.model, weg.basis.maxA]).toEqual(["CV2III-600Y/40.5-10193W", 369.1]);
  });

  it("an uneven S ≤ 9 stays linear unless --reg says otherwise (UNEVEN-6)", () => {
    expect(first(["--line", "30MVA 22+2-6x2.5%/0.4kV Dyn11"])).toBe("CV2III-600D/40.5-10090");
    expect(first(["--line", "30MVA 22+2-6x2.5%/0.4kV Dyn11", "--reg", "0"])).toBe("CV2III-600D/40.5-10090");
  });

  it("--pm beside an uneven line keeps the line's minus (UNEVEN-2)", () => {
    // B05 +0/−16: −8 gave 339.6 A and a 350 A switch.
    const a = json(["--line", "10MVA 20+0-16x1.875%/0.4kV YNd11 line end", "--pm", "8", "--oil"]);
    expect(a.basis.maxA).toBe(412.4);
    expect(a.model).toBe("SVIII-500D/40.5-10193W");
    const b = json(["--line", "160MVA 120+3-17x1.5%/20kV YNd11", "--reg", "G", "--pm", "10"]);
    expect(b.basis.maxA).toBe(1033.3);
    expect(Number(b.model.match(/-(\d+)Y\//)[1])).toBeGreaterThanOrEqual(1033);
  });

  it("reads the range after a closed ratio and percent ranges (UNEVEN-3, UNEVEN-4)", () => {
    expect(first(["--line", "10MVA 20/0.4kV ±8x1.875% Dyn11", "--oil"])).toBe("CVIII-350D/40.5-10193W");
    expect(first(["--line", "10MVA 20/0.4kV +0/-30% YNd11 line end", "--oil"])).toBe("SVIII-500D/40.5-10193W");
    expect(first(["--line", "7.5MVA 20/0.4kV +5/-35% YNd11 line end", "--oil"])).toBe("CVIII-350D/40.5-10193W");
    const a = capture(["--line", "10MVA 20/0.4kV +0/-30% YNd11 line end", "--oil"]);
    expect(a.out).toContain("+0/-30% read as +0/−16 × 1.875 %");
  });

  it("±7 G is 10173G, as sold (UNEVEN-5)", () => {
    expect(first(["--iu", "525", "--um", "72.5", "--reg", "G", "--pm", "7", "--oil"])).toBe(
      "CMIII-600Y/72.5B-10173G",
    );
  });

  it("says when the lowest tap assumes a symmetric range (D4)", () => {
    const flags = ["--mva", "45", "--kv", "138", "--tap", "line", "--winding", "delta", "--step-pct", "1.25"];
    const a = capture([...flags, "--pm", "8"]);
    expect(a.out).toContain("最低档按 −8 算（−档未指定");
    expect(json([...flags, "--pm", "8"]).basis.maxA).toBe(120.8);
    const b = capture([...flags, "--minus", "12"]);
    expect(b.out).not.toContain("−档未指定");
    expect(json([...flags, "--minus", "12"]).basis.maxA).toBe(127.9);
    const c = capture(["--line", "45MVA 138+4-12x1.25%/13.8kV Dyn1"]);
    expect(c.out).not.toContain("−档未指定");
    expect(json(["--line", "45MVA 138+4-12x1.25%/13.8kV Dyn1"]).basis.maxA).toBe(127.9);
    expect(c.out.split(/\r?\n/)[0]).toMatch(/-10193W$/);
  });

  it("--range, --minus and --mid state what the web form can (WC-10)", () => {
    const flags = ["--mva", "40", "--kv", "66", "--tap", "line", "--winding", "delta"];
    const a = json([...flags, "--range", "+4/-12x1.25%"]);
    expect(a.model).toMatch(/-10193W$/);
    expect(a.basis.maxA).toBe(237.7); // 202 A / (1 − 12 × 1.25 %)
    expect(first(["--mva", "40", "--kv", "66", "--range", "+2/-6"])).toMatch(/-10090$/);
    expect(first(["--iu", "300", "--um", "72.5", "--pm", "9", "--mid", "3"])).toBe("CV2III-350Y/72.5-10191W");
    expect(first(["--iu", "300", "--um", "72.5", "--pos", "19", "--mid", "1"])).toBe("CV2III-350Y/72.5-10191W");
    expect(capture(["--iu", "300", "--um", "72.5", "--mid", "2"]).code).toBe(1);
  });

  it("refuses an autotransformer line without MV, like the page (WC-06)", () => {
    const a = capture(["--line", "OSFPSZ-250000/220 220±8x1.25%"]);
    expect(a.code).toBe(1);
    expect(a.err).toContain("--hv and --mv");
  });

  it("sizes a single-phase unit on 3 × MVA, single-phase (WC-03)", () => {
    const a = json(["--line", "333 MVA single-phase 500/220 kV, 500 kV ±13x1.25%, regulation at the neutral point"]);
    expect(a.model).toBe("SHZVI-2400/72.5B-14271W");
    expect(a.basis.maxA).toBe(1377.4); // tender Imax 1377.33 A
  });

  it("reads delta words, coarse/fine and a contradicted 'auto' (WC-07, WC-13, WC-14)", () => {
    expect(first(["--line", "15 MVA, 33/11 kV, ±8x1.25%, D connection"])).toBe("CV2III-350D/40.5-10193W");
    expect(first(["--line", "10 MVA, 33/11.5 kV, Dyn11, ±8x1.25% coarse/fine"])).toBe("CV2III-350D/40.5-10193G");
    expect(first(["--line", "130 MVA 132/33 kV, +15%/-10%, 11 positions (2.5% steps), linear"])).toMatch(/-12110$/);
    expect(first(["--line", "200 MVA, 225/115 kV; Auto-transformer, vector group YNd11d11; ±8x1.25%"])).toBe(
      "CM2III-600Y/72.5B-10193W",
    );
  });

  it("reads separators and tap ladders (WC-02, WC-04, WC-09)", () => {
    expect(json(["--line", "150,000 kVA 150±10*1,25%/11 kV Yd11"]).basis.maxA).toBe(659.8);
    expect(json(["--line", "YNd11,66±12x1.78%/10.5 kV,40 MVA"]).basis.maxA).toBe(445);
    const q = json(["--line", "80/100/120 MVA, 118.25/110/96.25 kV (+6/-10 x 1.25%), Y"]);
    expect([q.model, q.basis.maxA]).toEqual(["SHZVIII-1000Y/72.5B-10193W", 719.8]);
  });

  it("±0 gives the ±8 default with a note; a line may start with a dash (WC-15)", () => {
    const a = capture(["--line", "25 MVA 110±0x1.25%/11 kV YNd11"]);
    expect(a.out.split(/\r?\n/)[0]).toBe("CV2III-350Y/72.5-10193W");
    expect(a.out).toContain("range ±0 ignored");
    expect(first(["--line", "- 25 MVA 110±8x1.25%/11 kV YNd11"])).toBe("CV2III-350Y/72.5-10193W");
    expect(first(["--line=-25 MVA 110±8x1.25%/11 kV YNd11"])).toBe("CV2III-350Y/72.5-10193W");
  });

  it("--octc takes the second winding's range (F4)", () => {
    const line = "40MVA 115±8x1.25%/38.5±2x2.5%/11kV YNyn0d11";
    const off = json(["--line", line, "--octc"]);
    expect(off.basis.maxA).toBe(631.4);
    expect(off.assumptions.join(" ")).toContain("38.5 kV 绕组");
    const on = json(["--line", line]);
    expect([on.model, on.basis.maxA]).toEqual(["CV2III-350Y/72.5-10193W", 223.1]);
  });
});
