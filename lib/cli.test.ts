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

  it("--iu is Imax: --k does not multiply through-current", () => {
    const iu = cliToSelectInput(
      parseCliArgs([
        "--iu",
        "350",
        "--k",
        "2",
        "--um",
        "40.5",
        "--conn",
        "D",
        "--reg",
        "W",
        "--pm",
        "8",
      ]),
    );
    expect(iu.throughCurrentA).toBe(350);
    const withK = capture([
      "--iu",
      "350",
      "--k",
      "2",
      "--um",
      "40.5",
      "--conn",
      "D",
      "--reg",
      "W",
      "--pm",
      "8",
    ]);
    const bare = capture([
      "--iu",
      "350",
      "--um",
      "40.5",
      "--conn",
      "D",
      "--reg",
      "W",
      "--pm",
      "8",
    ]);
    expect(withK.code).toBe(0);
    expect(withK.out).toBe(bare.out);
    expect(withK.out.trim().split(/\r?\n/)[0]).toBe("CV2III-350D/40.5-10193W");
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
    // first line stays the bare model
    expect(a.out.trim().split(/\r?\n/)[0]).toBe("CV2III-350Y/40.5-10193W");
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
      "--iu", "350", "--um", "40.5",
      "--conn", "D", "--reg", "W", "--pm", "8",
      "--vacuum", "--mount", "in-tank",
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

  it("octc echo shows positions, wiring and mount, not reg", () => {
    const a = capture(["--octc", "--iu", "800", "--um", "72.5", "--conn", "D", "--contact", "6x5"]);
    expect(a.code).toBe(0);
    expect(a.out).toContain("conn=D 线端");
    expect(a.out).toContain("接线=自动（II）（默认）");
    expect(a.out).not.toContain("reg=");
  });
});
