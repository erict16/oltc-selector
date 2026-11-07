import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "./cli";
import { maxThroughCurrent } from "./deriveUm";
import { octcContactCode, octcRoman, selectOltc } from "./engine";
import { localizeNote } from "./noteI18n";
import { loadOsSales } from "./osReplay";
import { deriveDuty, type TransformerSpec } from "./transformer";
import type { SelectInput } from "./types";
import { osLowestTapCurrent, osMarket } from "../scripts/replayTap";

/** 2026-11-04 r3 engine track: every finding's repro (ENGINE-5…10, ORDERS-10/11). */

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
const args = (s: string) => s.split(/\s+/);
const first = (s: string | string[]) =>
  cli(Array.isArray(s) ? s : args(s)).out.trim().split(/\r?\n/)[0]!;

const LANGS = ["vi", "es", "tr", "id"] as const;
const translated = (en: string) => LANGS.every((l) => localizeNote(en, l) !== en);

const base: SelectInput = {
  mounting: "in_tank",
  medium: "oil",
  preferVacuum: false,
  dutyKind: "octc",
  phases: "III",
  connection: "Y",
  throughCurrentA: 800,
  umKv: 72.5,
  stepVoltageV: 0,
  regulation: "linear",
  selectorSize: "auto",
  preferStructure: "auto",
  mdu: "none",
};

describe("ENGINE-5 a contact written with its grade letter is read", () => {
  it("12x11D, 12×11 and '12 x 11' give the 12x11 row, as 12x11 does", () => {
    const want = first("--iu 800 --um 72.5 --octc --contact 12x11");
    expect(want).toBe("WSLIV-800Y/72.5-12x11B");
    expect(first("--iu 800 --um 72.5 --octc --contact 12x11D")).toBe(want);
    expect(first(["--iu", "800", "--um", "72.5", "--octc", "--contact", "12×11"])).toBe(want);
    expect(first(["--iu", "800", "--um", "72.5", "--octc", "--contact", "12 x 11"])).toBe(want);
  });

  it("5x2B and 6x5B keep their contact (5x2 is VIII)", () => {
    expect(first("--iu 800 --um 72.5 --octc --contact 5x2B")).toBe(
      first("--iu 800 --um 72.5 --octc --contact 5x2"),
    );
    expect(first("--iu 800 --um 72.5 --octc --contact 5x2B")).toMatch(/^WSLVIII-.*-5x2/);
    expect(first("--iu 800 --um 72.5 --octc --contact 6x5B")).toBe(
      first("--iu 800 --um 72.5 --octc --contact 6x5"),
    );
    expect(octcContactCode({ ...base, octcContact: "12x11D" }, "wsl")).toBe("12x11");
    expect(octcRoman("Y", "5x2B")).toBe("VIII");
  });

  it("an unreadable --contact is refused, not dropped", () => {
    const r = cli(args("--iu 800 --um 72.5 --octc --contact 6-5"));
    expect(r.code).not.toBe(0);
    expect(r.err + r.out).toContain("--contact must look like 6x5 or 12x11D");
  });
});

describe("ENGINE-6 OCTC auto falls back to the covering Ums when the duty Um has no row", () => {
  const caution = "40.5 kV 价目表没有满足此工况的型号：上靠至 72.5 kV。";
  it.each([
    ["--mva 6.3 --kv 36.75 --tap neutral --winding star --octc --pm 4 --step-pct 2.5", "WSLIV-600Y/72.5-9x8B"],
    ["--mva 16 --kv 35 --tap line --winding delta --octc --pm 4 --step-pct 1.25", "WSLIV-600D/72.5-9x8B"],
    ["--mva 50 --kv 35 --tap neutral --winding star --octc --pm 2 --step-pct 2.5", "WSLIV-1000Y/72.5-6x5B"],
    ["--iu 900 --um 40.5 --octc --pos 5", "WSLIV-1000Y/72.5-6x5B"],
  ])("%s → %s (the cage lock's type)", (argv, want) => {
    const r = cli(args(argv));
    expect(r.code).toBe(0);
    expect(r.out.split(/\r?\n/)[0]).toBe(want);
    expect(r.out).toContain(caution);
    expect(first(`${argv} --structure cage`)).toBe(want);
  });

  it("a duty with a 40.5 row keeps it first and gets no caution", () => {
    const out = selectOltc({ ...base, throughCurrentA: 300, umKv: 40.5, positions: 5 });
    expect(out.ok).toBe(true);
    expect(out.results[0]!.umKv).toBe(40.5);
    expect(out.results.some((r) => r.cautionsEn.some((c) => c.startsWith("No 40.5 kV list row")))).toBe(false);
  });

  it("the caution has every translation", () => {
    expect(translated("No 40.5 kV list row covers this duty: next class 72.5 kV.")).toBe(true);
  });
});

describe("ENGINE-7 the drum Y-only line only when the drum fits on Y", () => {
  it("VIII on D (no drum contact) gives the real reason", () => {
    const r = cli(args("--iu 100 --um 40.5 --octc --conn D --pos 6 --series VIII"));
    expect(r.code).not.toBe(0);
    expect(r.err + r.out).not.toContain("drum OCTC is sold for star");
    expect(r.err + r.out).not.toContain("鼓式无载只用于星点");
  });

  it("a drum lock on D at 6 positions (no drum fits on Y either) names no drum", () => {
    const r = cli(args("--iu 800 --um 72.5 --octc --structure drum --pos 6 --conn D"));
    expect(r.code).not.toBe(0);
    expect(r.err + r.out).not.toContain("鼓式无载只用于星点");
  });

  it("80 MVA 35 kV delta now finds the 72.5 cage", () => {
    expect(first("--mva 80 --kv 35 --tap line --winding delta --octc --pm 2 --step-pct 2.5")).toBe(
      "WSLIV-1000D/72.5-6x5B",
    );
  });

  it("drum lock on D that fits on Y, and a cage that fits: the full line", () => {
    const r = cli(args("--iu 800 --um 72.5 --octc --structure drum --pos 5 --conn D"));
    expect(r.code).not.toBe(0);
    expect(r.err + r.out).toContain("WDG 鼓式无载只用于星点（Y）；角接（D）请用笼式。");
    expect(first("--iu 800 --um 72.5 --octc --structure drum --pos 5 --conn Y")).toMatch(/WDG/);
  });

  it("drum fits on Y but no cage takes a 5x5 contact: the short line plus the reason", () => {
    const out = selectOltc({
      ...base,
      connection: "D",
      positions: 5,
      octcContact: "5x5",
      preferStructure: "drum",
    });
    expect(out.ok).toBe(false);
    expect(out.errorsEn[0]).toBe("WDG drum OCTC is sold for star (Y) points only.");
    expect(out.errorsEn.length).toBeGreaterThan(1);
    expect(selectOltc({ ...base, connection: "D", positions: 5, octcContact: "5x5", preferStructure: "cage" }).ok).toBe(false);
  });

  it("the short line has every translation", () => {
    expect(translated("WDG drum OCTC is sold for star (Y) points only.")).toBe(true);
  });
});

describe("ENGINE-8 the lowest-tap current is not capped at −45%", () => {
  it("maxThroughCurrent uses the whole minus range", () => {
    expect(maxThroughCurrent(270, 16, 0.03)).toBeCloseTo(270 / 0.52, 1);
    expect(Number.isNaN(maxThroughCurrent(270, 40, 0.025))).toBe(true);
  });

  it("±16 × 3% on a 270 A delta winding sizes at least 519 A and CM2I-600 or bigger", () => {
    const r = cli(args("--mva 26.73 --kv 33 --tap line --winding delta --pm 16 --step-pct 3 --reg W"));
    expect(r.code).toBe(0);
    const top = r.out.split(/\r?\n/)[0]!;
    const cur = Number(top.match(/-(\d+)\//)?.[1]);
    expect(cur).toBeGreaterThanOrEqual(600);
    expect(r.out).toContain("最低档 519.2 A");
    expect(r.out).toContain("负分接范围 48% 异常大：最低档电流 519.2 A，请核对 OS。");
  });

  const spec = (o: Partial<TransformerSpec>): TransformerSpec => ({
    kind: "two_winding",
    tapPoint: "line_end",
    winding: "delta",
    mva: 26.73,
    tapKv: 33,
    hvKv: 0,
    mvKv: 0,
    minusSteps: 16,
    stepFraction: 0.03,
    safetyK: 1,
    ...o,
  });

  it("deriveDuty refuses a minus range of 100% or more and flags one above 45%", () => {
    const d = deriveDuty(spec({}));
    expect(d.ok).toBe(true);
    expect(d.maxA).toBeGreaterThanOrEqual(519);
    expect(d.cautionsEn).toContain("Minus range 48% is unusually large: lowest-tap current 519.2 A, check the OS.");
    const bad = deriveDuty(spec({ minusSteps: 40, stepFraction: 0.025 }));
    expect(bad.ok).toBe(false);
    expect(bad.errorEn).toBe("Minus range ≥ 100%.");
    expect(deriveDuty(spec({ minusSteps: 8, stepFraction: 0.0125 })).cautionsEn.join(" ")).not.toContain("Minus range");
  });

  it("both notes have every translation", () => {
    expect(translated("Minus range 48% is unusually large: lowest-tap current 519.2 A, check the OS.")).toBe(true);
    expect(translated("Minus range ≥ 100%.")).toBe(true);
  });
});

describe("ENGINE-9 a typed drum contact settles the drum roman", () => {
  it("125 MVA 121 kV ±2, drum, 6x5 → the sold 3xWDGV-800/72.5-6x5B (E-WG260034)", () => {
    expect(
      first("--mva 125 --kv 121 --tap neutral --winding star --octc --structure drum --pm 2 --contact 6x5"),
    ).toBe("3xWDGV-800/72.5-6x5B");
  });

  it("drum 4x2 at 40.5 → 3xWLGVIII-800/40.5-4x2A", () => {
    expect(first("--iu 800 --um 40.5 --octc --structure drum --pos 5 --contact 4x2")).toBe(
      "3xWLGVIII-800/40.5-4x2A",
    );
  });

  it("drum 6x5 at 40.5 → the sold WDGV, not the never-sold WSGIV", () => {
    expect(first("--iu 800 --um 40.5 --octc --structure drum --pos 5 --contact 6x5")).toBe(
      "3xWDGV-800/40.5-6x5B",
    );
    const out = selectOltc({ ...base, umKv: 40.5, positions: 5, octcContact: "6x5", preferStructure: "drum" });
    expect(out.results.some((r) => r.seriesId === "wsg")).toBe(false);
  });

  it("the roman follows the drum contact", () => {
    expect(octcRoman("Y", "6x5", "auto", "WDG")).toBe("V");
    expect(octcRoman("Y", "4x2", "auto", "WLG")).toBe("VIII");
    expect(octcRoman("Y", "5x5", "auto", "WDG")).toBe("IV");
    // 7 positions: no drum contact covers them.
    expect(octcContactCode({ ...base, positions: 7, octcContact: "6x5" }, "wdg")).toBe("");
  });
});

describe("ENGINE-10 a stress step above the 330 kV-class step is named", () => {
  const argv = "--mva 125 --kv 400 --tap neutral --winding star --reg G --pm 12 --step-pct 1.25";
  it("LI 500 gives DE with the stress caution, not the class caution", () => {
    const r = cli(args(`${argv} --across-li 500`));
    expect(r.out.split(/\r?\n/)[0]).toBe("SHZVIII-400Y/126DE-14273G");
    expect(r.out).not.toContain("选择器等级上调一级为 DE");
    expect(r.out).toContain("选择器等级 DE 依据给定的调压绕组间 雷电 500 kV（330 kV 级上调为 D）。");
  });

  it("without the stress the class caution stays", () => {
    const r = cli(args(argv));
    expect(r.out.split(/\r?\n/)[0]).toBe("SHZVIII-400Y/126D-14273G");
  });

  it("the stress caution has every translation", () => {
    expect(translated("Selector grade DE from the stated across-tap LI 500 kV (330 kV-class step gives D).")).toBe(true);
  });
});

describe("ORDERS-11 Turkish 110 kV-class star neutrals take 72.5C (buyer practice)", () => {
  const tr154 = "--mva 100 --kv 154 --tap neutral --reg G --pm 12 --ust 1111.4";
  it("--market TR on a 154 kV neutral gives 72.5C with the practice caution", () => {
    const r = cli(args(`${tr154} --market TR`));
    expect(r.out.split(/\r?\n/)[0]).toBe("CM2III-500Y/72.5C-14273G");
    expect(r.out).toContain("选择器等级上调为 C：土耳其客户 110 kV 级中性点取 C（已售 26 组中 25 组；B 也满足）。");
  });

  it("no market stays 72.5B", () => {
    expect(first(tr154)).toBe("CM2III-500Y/72.5B-14273G");
  });

  it("the engine reads the market only for Y neutrals of 110 kV class at 72.5", () => {
    const tr: SelectInput = {
      ...base,
      dutyKind: "oltc",
      medium: "oil_vacuum",
      preferVacuum: true,
      regulation: "coarse_fine",
      plusMinusSteps: 12,
      midPositions: 3,
      throughCurrentA: 441,
      stepVoltageV: 1111.4,
      tapWindingKv: 154,
      market: "TR",
    };
    const out = selectOltc(tr);
    expect(out.results[0]!.model).toBe("CM2III-500Y/72.5C-14273G");
    // The B string stays in the list, after the C one and without the caution.
    const models = out.results.map((r) => r.model);
    const b = out.results.find((r) => r.model === "CM2III-500Y/72.5B-14273G");
    expect(b).toBeDefined();
    expect(models.indexOf(b!.model)).toBeGreaterThan(0);
    expect(b!.cautionsEn.some((c) => c.startsWith("Selector grade raised to"))).toBe(false);
    expect(selectOltc({ ...tr, market: "IT" }).results[0]!.model).toBe("CM2III-500Y/72.5B-14273G");
    expect(selectOltc({ ...tr, tapWindingKv: 66 }).results[0]!.model).toBe("CM2III-500Y/72.5B-14273G");
    expect(selectOltc({ ...tr, connection: "D" }).results[0]!.model).not.toMatch(/\/72\.5C-/);
    expect(selectOltc({ ...tr, umKv: 126 }).results[0]!.model).toBe("CM2III-500Y/126C-14273G");
  });

  it("the caution has every translation", () => {
    expect(
      translated(
        "Selector grade raised to C: Turkish buyers take C on 110 kV-class neutrals (sold 25 of 26 orders; B also fits).",
      ),
    ).toBe(true);
  });
});

describe("ORDERS-10 replays size on the lowest-tap current when the OS has no Imax", () => {
  const rows = loadOsSales(
    JSON.parse(readFileSync(path.join(process.cwd(), "docs", "replay", "2025-os-sales.json"), "utf8")),
  );
  const row = (serial: string) => rows.find((r) => r.serial === serial)!;
  const n = (v: unknown) => (v == null || v === "" ? null : Number(v));
  // E-CM2250045 writes its range only in the tap code (12233W: ±10).
  const lowest = (serial: string, minusSteps?: number) => {
    const r = row(serial);
    return osLowestTapCurrent({
      iOs: n(r.i_a)!,
      mva: n(r.mva),
      kv: n(r.rated_kv),
      conn: r.connection === "D" ? "D" : "Y",
      minusSteps: minusSteps ?? n(r.minus_steps) ?? n(r.plus_minus_steps),
      ustV: n(r.ust_max_v) ?? n(r.ust_v),
    });
  };

  it("E-CM2250066 (125 MVA 154 kV ±12, OS 468.6 A) goes in at the app's 551 A", () => {
    expect(lowest("E-CM2250066")).toBeCloseTo(551.3, 0);
  });

  it("E-CM2250045 stays at 176 A: its OS current is already the lowest-tap figure", () => {
    expect(n(row("E-CM2250045").i_a)).toBeCloseTo(176, 0);
    expect(lowest("E-CM2250045", 10)).toBeCloseTo(176, 0);
  });

  it("an OS current or Ust from another winding keeps the OS figure", () => {
    expect(osLowestTapCurrent({ iOs: 100, mva: 125, kv: 154, conn: "Y", minusSteps: 12, ustV: 1111 })).toBe(100);
    // E-CM2250007: 924 V on a 22.4 kV star reads −93%.
    expect(lowest("E-CM2250007")).toBeCloseTo(128.9, 1);
    // E-V260291 style: a delta's 400 A line current (231 A in the winding).
    expect(osLowestTapCurrent({ iOs: 400, mva: 15.25, kv: 22, conn: "D", minusSteps: 11, ustV: 260 })).toBe(400);
  });

  it("Turkish buyers go in as TR", () => {
    expect(osMarket("土耳其HMT-ASTOR")).toBe("TR");
    expect(osMarket("俄罗斯HMR")).toBeUndefined();
  });
});
