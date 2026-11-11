// 2026-11-04: off-circuit (drum WDG/WLG, WSG gate, cage Um), dry CVT and
// reactor HWDK fixes from the OS audit (track C: F1–F3, F5–F12).
import { readFileSync } from "node:fs";
import { HAS_REPLAY_DATA, readSalesJson } from "./replayData";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cliToSelectInput, parseCliArgs, runCli } from "./cli";
import { octcSizeLetter, selectOltc } from "./engine";
import { listRowExists, resolveOctcListKey } from "./listIndex";
import {
  buildOsHonestOctcInput,
  loadOsSales,
  replayOsRow,
} from "./osReplay";
import { parseTypeString } from "./parseType";
import { commercialTypeExists } from "./typeExists";
import type { SelectInput } from "./types";

const octc: SelectInput = {
  mounting: "in_tank",
  medium: "oil",
  preferVacuum: false,
  dutyKind: "octc",
  phases: "III",
  connection: "Y",
  throughCurrentA: 600,
  umKv: 40.5,
  stepVoltageV: 0,
  regulation: "linear",
  mdu: "none",
};
const run = (p: Partial<SelectInput>) => selectOltc({ ...octc, ...p });
const models = (p: Partial<SelectInput>) => run(p).results.map((r) => r.model);

function cliFirst(argv: string[]): string {
  let out = "";
  runCli(argv, { stdout: (s) => (out += s), stderr: () => {} });
  return out.trim().split(/\r?\n/)[0] ?? "";
}

function osRow(year: string, serial: string) {
  const rows = loadOsSales(
    readSalesJson(year),
  );
  const row = rows.find((r) => r.serial === serial);
  if (!row) throw new Error(`no OS row ${serial}`);
  return row;
}

describe("F1 drum OCTC is the sold WDG/WLG", () => {
  it("parses the OS drum strings", () => {
    expect(parseTypeString("3xWDGIV-400/72.5-5x5A")).toMatchObject({
      unitCount: 3,
      family: "WDG",
      phases: "IV",
      currentA: 400,
      umKv: 72.5,
      tapCode: "5x5",
      selectorSize: "A",
    });
    expect(parseTypeString("3xWLGVIII-800/40.5-4x2A")?.family).toBe("WLG");
  });

  it("sold rows exist; unsold axes do not", () => {
    expect(listRowExists("WDGIV-800/40.5-5x5A")).toBe(true);
    expect(commercialTypeExists("3xWDGIV-800/40.5-5x5A")).toBe(true);
    expect(commercialTypeExists("WDGIV-1250/40.5-5x5A")).toBe(false);
    expect(resolveOctcListKey("3xWDGIV-300/72.5-5x5")).toBe(
      "3xWDGIV-300/72.5-5x5B",
    );
  });

  it("Y 631 A / 40.5 / 5 positions → 3xWDGIV-800/40.5-5x5A", () => {
    const out = run({ preferStructure: "drum", throughCurrentA: 631, positions: 5 });
    expect(out.results[0]?.model).toBe("3xWDGIV-800/40.5-5x5A");
    expect(out.results[0]?.unitCount).toBe(3);
    expect(out.results[0]?.selectorSize).toBe("A");
  });

  it("Y 995 A / 72.5 → 3xWDGIV-1250/72.5-5x5A (E-WG250050-051, E-WG260044)", () => {
    expect(
      models({ preferStructure: "drum", throughCurrentA: 995, umKv: 72.5, positions: 5 })[0],
    ).toBe("3xWDGIV-1250/72.5-5x5A");
  });

  it("drum lock takes the next Um when the 40.5 row was never sold", () => {
    expect(
      models({ preferStructure: "drum", throughCurrentA: 995, positions: 5 })[0],
    ).toBe("3xWDGIV-1250/72.5-5x5A");
    // A 40.5 row stays first when it exists.
    expect(
      models({ preferStructure: "drum", throughCurrentA: 631, positions: 5 })[0],
    ).toBe("3xWDGIV-800/40.5-5x5A");
  });

  it("series V → 3xWDGV-800/40.5-6x5B", () => {
    expect(models({ preferStructure: "drum", octcSeries: "V" })[0]).toBe(
      "3xWDGV-800/40.5-6x5B",
    );
  });

  it("D keeps the WSG quote QS2607203 first; no WDG on D", () => {
    const m = models({ preferStructure: "drum", connection: "D", throughCurrentA: 800, positions: 5 });
    expect(m[0]).toBe("WSGII-800D/40.5-4x5A");
    expect(m.some((x) => /W[DL]G/.test(x))).toBe(false);
    expect(models({ connection: "D", throughCurrentA: 364, plusMinusSteps: 2 })[0]).toBe(
      "WSGII-600D/40.5-4x5A",
    );
  });

  it("never under-covers: 6 positions on IV and 9 positions give no WDG", () => {
    expect(models({ preferStructure: "drum", throughCurrentA: 631, positions: 6 }).some((x) => x.includes("WDG"))).toBe(false);
    expect(models({ preferStructure: "drum", positions: 9 }).some((x) => x.includes("WDG"))).toBe(false);
  });

  it("WDG beats the never-sold WSG on Y (500 A)", () => {
    expect(models({ throughCurrentA: 500 })[0]).toBe("3xWDGIV-800/40.5-5x5A");
  });

  it("WLG only on an explicit VIII drum", () => {
    expect(models({ preferStructure: "drum", octcSeries: "VIII", throughCurrentA: 606 })[0]).toBe(
      "3xWLGVIII-800/40.5-4x2A",
    );
    expect(models({ preferStructure: "drum", throughCurrentA: 606 }).some((x) => x.includes("WLG"))).toBe(false);
  });
});

describe("F2 WSG covers its positions and quoted romans only", () => {
  it("Um 12, 100 A, Y, 7 positions, II → no WSG; drum lock names positions", () => {
    expect(models({ umKv: 12, throughCurrentA: 100, positions: 7, octcSeries: "II" }).some((x) => x.startsWith("WSG"))).toBe(false);
    const drum = run({ umKv: 12, throughCurrentA: 100, positions: 7, octcSeries: "II", preferStructure: "drum" });
    expect(drum.ok).toBe(false);
    expect(drum.errorsEn.join(" ")).toMatch(/7 positions/);
  });

  it("no WSGVII / WSGVIII and no 12x12 hint", () => {
    expect(models({ throughCurrentA: 300, positions: 5, octcSeries: "VII" }).some((x) => x.startsWith("WSG"))).toBe(false);
    expect(models({ connection: "D", throughCurrentA: 300, umKv: 12, positions: 12, octcContact: "12x12", octcSeries: "VII" }).some((x) => x.startsWith("WSG"))).toBe(false);
    expect(commercialTypeExists("WSGVIII-600D/40.5-4x5A")).toBe(false);
    expect(commercialTypeExists("WSGVII-300D/40.5-12x12D")).toBe(false);
    expect(commercialTypeExists("WSGII-800D/40.5-4x5A")).toBe(true);
  });

  it("D 800 A / 40.5 / 5 positions auto → WSGII-800D/40.5-4x5A (unchanged)", () => {
    expect(models({ connection: "D", throughCurrentA: 800, positions: 5 })[0]).toBe(
      "WSGII-800D/40.5-4x5A",
    );
  });
});

describe("F3 cage lock on a 35 kV class winding", () => {
  it("40 MVA / 38.5 kV ±2 cage → WSLIV-800Y/72.5-6x5A", () => {
    expect(
      cliFirst(["--octc", "--mva", "40", "--kv", "38.5", "--pm", "2", "--step-pct", "2.5", "--structure", "cage"]),
    ).toBe("WSLIV-800Y/72.5-6x5A");
  });

  it("63 MVA → WSLIV-1000Y/72.5-6x5B", () => {
    expect(
      cliFirst(["--octc", "--mva", "63", "--kv", "38.5", "--pm", "2", "--step-pct", "2.5", "--structure", "cage"]),
    ).toBe("WSLIV-1000Y/72.5-6x5B");
  });

  it("auto still stays at the duty Um", () => {
    expect(models({ throughCurrentA: 600, plusMinusSteps: 2 }).some((x) => x.startsWith("WSL") && x.includes("/72.5"))).toBe(false);
  });
});

describe.skipIf(!HAS_REPLAY_DATA)("F5 OS replay judges drum rows without the answer", () => {
  it("E-WG250021-026 is judged, not skipped", () => {
    const r = replayOsRow(osRow("2025", "E-WG250021-026"));
    expect(r.skip).toBeUndefined();
    expect(r.models[0]).toBe("3xWDGIV-800/40.5-5x5A");
    expect(r.soldCovered).toBe(true);
  });

  it("honest input drops the sold contact, roman and Um", () => {
    const row = osRow("2025", "E-WG250001");
    const parsed = parseTypeString(row.sold_type!)!;
    const h = buildOsHonestOctcInput(row, parsed);
    expect("skip" in h).toBe(false);
    if ("skip" in h) return;
    expect(h.octcContact).toBeUndefined();
    expect(h.octcSeries).toBe("auto");
    expect(h.preferStructure).toBe("drum");
    expect(h.umKv).toBe(40.5); // 38.5 kV neutral; the OS sold 72.5
    expect(h.plusMinusSteps).toBe(2);
  });

  it("honest E-W250008 (WSLVIII, no rated kV) is skipped, not fed the answer", () => {
    const row = osRow("2025", "E-W250008");
    const h = buildOsHonestOctcInput(row, parseTypeString(row.sold_type!)!);
    expect("skip" in h).toBe(true);
  });
});

describe("F6 / F7 reactor HWDK", () => {
  it("--mount reactor is oil HWDK with the sold Um and 17 positions", () => {
    const args = parseCliArgs(["--mount", "reactor", "--iu", "765", "--um", "40.5", "--phases", "I", "--reg", "0", "--pos", "17"]);
    const input = cliToSelectInput(args);
    expect(input.mounting).toBe("reactor");
    expect(input.medium).toBe("oil");
    expect(input.preferVacuum).toBe(false);
    expect(selectOltc(input).results[0]?.model).toBe("HWDKI-1500/40.5-17");
  });

  it("±8 on a 10 kV reactor → HWDKI-1500/40.5-17 (sold E-HWDK250001-003)", () => {
    expect(
      cliFirst(["--iu", "765", "--um", "12", "--phases", "I", "--mount", "on-tank", "--oil", "--pm", "8"]),
    ).toBe("HWDKI-1500/40.5-17");
  });

  it("Um 72.5 reactor is HWDK @72.5, not 69", () => {
    const out = selectOltc({
      ...octc,
      dutyKind: "oltc",
      mounting: "reactor",
      phases: "I",
      connection: "any",
      throughCurrentA: 765,
      umKv: 72.5,
      regulation: "reversing",
      plusMinusSteps: 8,
    });
    expect(out.results[0]?.model).toBe("HWDKI-1500/72.5-17");
  });

  it("the input the web now sends for reactor finds HWDK", () => {
    // Web defaults are vacuum; reactor now goes out as oil.
    const out = selectOltc({
      ...octc,
      dutyKind: "oltc",
      mounting: "reactor",
      medium: "oil",
      preferVacuum: false,
      throughCurrentA: 765,
      umKv: 40.5,
      regulation: "reversing",
      plusMinusSteps: 8,
    });
    expect(out.ok).toBe(true);
    expect(out.results[0]?.seriesCode).toBe("HWDK");
  });
});

describe("F8 web OCTC first paint", () => {
  const firstPaint: Partial<SelectInput> = {
    throughCurrentA: 145.8,
    umKv: 72.5,
    octcSeries: "auto",
  };
  it("±2 (the new OCTC default) → WSLIV-600Y/72.5-6x5A, as the CLI", () => {
    expect(models({ ...firstPaint, positions: 5 })[0]).toBe("WSLIV-600Y/72.5-6x5A");
    expect(cliFirst(["--octc", "--mva", "25", "--kv", "110"])).toBe("WSLIV-600Y/72.5-6x5A");
  });
  it("an explicit ±8 still gives 18x17E", () => {
    expect(models({ ...firstPaint, plusMinusSteps: 8 })[0]).toBe("WSLIV-800Y/72.5-18x17E");
  });
});

describe("F9 VIII without a contact field", () => {
  it("VIII D 794 A / 72.5 / 5 positions → WSLVIII-800/72.5-5x2A", () => {
    expect(
      models({ octcSeries: "VIII", connection: "D", throughCurrentA: 794, umKv: 72.5, positions: 5 })[0],
    ).toBe("WSLVIII-800/72.5-5x2A");
  });
  it("an explicit contact still wins", () => {
    expect(
      models({ octcSeries: "VIII", connection: "D", throughCurrentA: 794, umKv: 72.5, positions: 12, octcContact: "12x2" })[0],
    ).toBe("WSLVIII-800/72.5-12x2D");
  });
  it("more positions do not get a 5x2", () => {
    expect(
      models({ octcSeries: "VIII", connection: "D", throughCurrentA: 794, umKv: 72.5, positions: 12 }).some((x) => x.includes("5x2")),
    ).toBe(false);
  });
});

describe("F10 auto wiring reaches the engine", () => {
  it("delta line end drum, auto → WSGII like the CLI; IV only when asked", () => {
    const d = { connection: "D" as const, throughCurrentA: 364.5, plusMinusSteps: 2, preferStructure: "drum" as const };
    expect(models({ ...d, octcSeries: "auto" })[0]).toBe("WSGII-600D/40.5-4x5A");
    expect(cliFirst(["--octc", "--mva", "40", "--kv", "38.5", "--pm", "2", "--step-pct", "2.5", "--conn", "D", "--structure", "drum"])).toBe(
      "WSGII-600D/40.5-4x5A",
    );
    expect(models({ ...d, octcSeries: "IV" })[0]).toBe("WSGIV-600D/40.5-4x5A");
  });
});

describe("F11 CVT tap code is pitch 09 + positions", () => {
  const dry: SelectInput = {
    ...octc,
    dutyKind: "oltc",
    mounting: "dry_type",
    medium: "dry",
    preferVacuum: true,
    throughCurrentA: 93,
    umKv: 12,
  };
  it("9 positions → CVTIII-160Y/12-0909", () => {
    expect(selectOltc({ ...dry, positions: 9 }).results[0]?.model).toBe("CVTIII-160Y/12-0909");
  });
  it("7 positions → 0907, not 0707", () => {
    expect(selectOltc({ ...dry, positions: 7 }).results[0]?.model).toBe("CVTIII-160Y/12-0907");
  });
});

describe("F12 OCTC letter A up to 145 kV", () => {
  it("IV D 289 A / 126 / 5 positions → …/126-6x5A", () => {
    expect(
      models({ octcSeries: "IV", connection: "D", throughCurrentA: 289, umKv: 126, positions: 5 })[0],
    ).toBe("WSLIV-600D/126-6x5A");
  });
  it("a stated across-tap stress keeps B", () => {
    expect(octcSizeLetter(126, "6x5", "auto", true)).toBe("B");
    expect(octcSizeLetter(126, "6x5", "auto")).toBe("A");
    expect(octcSizeLetter(170, "6x5", "auto")).toBe("B");
    expect(
      models({ octcSeries: "IV", connection: "D", throughCurrentA: 289, umKv: 126, positions: 5, acrossTapBilKv: 200 })[0],
    ).toBe("WSLIV-600D/126-6x5B");
  });
});
