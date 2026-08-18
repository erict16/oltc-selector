/**
 * Real-order replay corpus: Qu-ET260001–013 (skip MDU/OCTC) plus signed
 * Vietnam OS types that already carry duty (EEMC / HAVEC / MBT).
 *
 * Each case is a duty input taken from the QS/OS, the commercially chosen
 * type string, and an optional named backup. Incomplete-duty sources are
 * listed in docs comments / inventory, not invented here.
 */
import { selectOltc } from "./engine";
import type { SelectInput } from "./types";
import {
  ANTHONY_REPLAY,
  ANTHONY_REPLAY_SKIPPED,
} from "./anthonyQs.fixtures";

export type ReplayTag = "min-adequate" | "customer-specified";

export type ReplayCase = {
  id: string;
  source: string;
  tag: ReplayTag;
  /** Why customer-specified, or why this is the min-adequate path */
  note: string;
  input: SelectInput;
  /** Commercially chosen / quoted type (no MDU) */
  expectPrimary: string;
  /** Named backup / alternate from the same source, if any */
  expectBackup?: string;
};

const inTankVac = {
  mounting: "in_tank" as const,
  medium: "oil_vacuum" as const,
  preferVacuum: true,
  phases: "III" as const,
  regulation: "reversing" as const,
  mdu: "none" as const,
};

const inTankOil = {
  mounting: "in_tank" as const,
  medium: "oil" as const,
  preferVacuum: false,
  phases: "III" as const,
  regulation: "reversing" as const,
  mdu: "none" as const,
};

export const ORDER_REPLAY: ReplayCase[] = [
  // ── Qu-ET 260001–013 ──────────────────────────────────────────
  {
    id: "Qu-ET260001",
    source:
      "QS/Qu-ET260001 Fortune 170 MVA / 275 kV Y +5/−17.5% → CMIII-600Y/252D-10193W",
    tag: "customer-specified",
    note:
      "I=357 A, Ust≈1986 V (1.25% of 275 kV Y). Min-adequate is CM2-500; buyer locked oil CM-600.",
    input: {
      ...inTankOil,
      connection: "Y",
      throughCurrentA: 356.8,
      umKv: 252,
      stepVoltageV: 1986,
      plusMinusSteps: 8,
      selectorSize: "D",
    },
    expectPrimary: "CMIII-600Y/252D-10193W",
  },
  {
    id: "Qu-ET260002",
    source:
      "QS/Qu-ET260002 Ampcontrol 15 MVA / 33 kV Δ ±8×1.25% → CV2III-350D/40.5-10193W",
    tag: "min-adequate",
    note: "I=262 A, Ust=412.5 V (Δ×1.25%). CV2-350 covers.",
    input: {
      ...inTankVac,
      connection: "D",
      throughCurrentA: 262.4,
      umKv: 40.5,
      stepVoltageV: 412.5,
      plusMinusSteps: 8,
    },
    expectPrimary: "CV2III-350D/40.5-10193W",
  },
  {
    id: "Qu-ET260003",
    source:
      "QS/Qu-ET260003 Wilson 180 MVA / 132 kV Y 20×1.25% → SHZVIII-1000Y/72.5C-12233W",
    tag: "min-adequate",
    note:
      "I=787 A > CM2 III 600; Ust=953 V. Um 72.5 and grade C as quoted (not 145).",
    input: {
      ...inTankVac,
      connection: "Y",
      throughCurrentA: 787.3,
      umKv: 72.5,
      stepVoltageV: 952.6,
      plusMinusSteps: 10,
      selectorSize: "C",
    },
    expectPrimary: "SHZVIII-1000Y/72.5C-12233W",
  },
  {
    id: "Qu-ET260004",
    source:
      "QS/Qu-ET260004 Shihlin 80/100/120 MVA / 118.25 kV, QS phase=1 → SHZVI-1000/126D-10193W",
    tag: "customer-specified",
    note:
      "1000 A / 126 kV / 853 V: min-adequate is CM2I-1200. Buyer locked SHZV I 1000 (3× singles on the QS).",
    input: {
      ...inTankVac,
      phases: "I",
      connection: "Y",
      throughCurrentA: 1000,
      umKv: 126,
      stepVoltageV: 853,
      plusMinusSteps: 8,
      selectorSize: "D",
    },
    expectPrimary: "SHZVI-1000/126D-10193W",
  },
  {
    id: "Qu-ET260005",
    source:
      "QS/Qu-ET260005 Wilson 240 MVA / 220 kV Y ±10×1.25% → SHZVIII-1000Y/170D-12233W",
    tag: "min-adequate",
    note:
      "I=630 A > CM2 600; Ust=1588 V. Table phase/Um are template noise; model 170D stands.",
    input: {
      ...inTankVac,
      connection: "Y",
      throughCurrentA: 629.8,
      umKv: 170,
      stepVoltageV: 1588,
      plusMinusSteps: 10,
      selectorSize: "D",
    },
    expectPrimary: "SHZVIII-1000Y/170D-12233W",
  },
  {
    id: "Qu-ET260006",
    source:
      "QS/Qu-ET260006 Wilson 370 MVA / 275 kV Y → SHZVIII-1000Y/72.5C-12233W",
    tag: "min-adequate",
    note: "I=777 A > CM2 600; Ust=1986 V; Um 72.5 C as quoted.",
    input: {
      ...inTankVac,
      connection: "Y",
      throughCurrentA: 776.6,
      umKv: 72.5,
      stepVoltageV: 1986,
      plusMinusSteps: 10,
      selectorSize: "C",
    },
    expectPrimary: "SHZVIII-1000Y/72.5C-12233W",
  },
  {
    id: "Qu-ET260007",
    source:
      "QS/Qu-ET260007 Wilson 185 MVA / 275 kV Y → SHZVIII-600Y/72.5C-12233W",
    tag: "customer-specified",
    note:
      "I=388 A, Ust=1986 V (pitch 12). CV2 max 1500 V @ 12 contacts → CM2-500 is min-adequate. Wilson locked SHZV-600.",
    input: {
      ...inTankVac,
      connection: "Y",
      throughCurrentA: 388.3,
      umKv: 72.5,
      stepVoltageV: 1986,
      plusMinusSteps: 10,
      selectorSize: "C",
    },
    expectPrimary: "SHZVIII-600Y/72.5C-12233W",
  },
  {
    id: "Qu-ET260011",
    source:
      "QS/Qu-ET260011 Wilson 240 MVA / 220 kV +10/−10×1.25% → SHZVIII-1000Y/170D-12233W",
    tag: "min-adequate",
    note: "Same transformer duty as 005 (later sheet).",
    input: {
      ...inTankVac,
      connection: "Y",
      throughCurrentA: 629.8,
      umKv: 170,
      stepVoltageV: 1588,
      plusMinusSteps: 10,
      selectorSize: "D",
    },
    expectPrimary: "SHZVIII-1000Y/170D-12233W",
  },
  {
    id: "Qu-ET260012",
    source:
      "QS/Qu-ET260012 United Energy ≈20 MVA / 66 kV Ferranti retrofit → HWVIII-400Y/72.5-10193W",
    tag: "min-adequate",
    note: "On-tank lock. I=175 A, Ust=476 V. HWV III floor is 400 A.",
    input: {
      mounting: "on_tank",
      medium: "oil_vacuum",
      preferVacuum: true,
      phases: "III",
      connection: "Y",
      throughCurrentA: 175,
      umKv: 72.5,
      stepVoltageV: 476,
      regulation: "reversing",
      plusMinusSteps: 8,
      mdu: "none",
    },
    expectPrimary: "HWVIII-400Y/72.5-10193W",
  },
  {
    id: "Qu-ET260013",
    source:
      "QS/Qu-ET260013 + pricing-worksheet Wilson 70 MVA / 33 kV, Imax 1360 A → SHZVGIII-1500Y/72.5C-10193W",
    tag: "min-adequate",
    note:
      "Worksheet: 1360 A → Iᵤ 1500 (1360 > 1300×0.97). Ust=238 V. Grade C as quoted.",
    input: {
      ...inTankVac,
      connection: "Y",
      throughCurrentA: 1360,
      umKv: 72.5,
      stepVoltageV: 238,
      plusMinusSteps: 8,
      selectorSize: "C",
    },
    expectPrimary: "SHZVGIII-1500Y/72.5C-10193W",
  },

  // ── Signed OS (duty present) ──────────────────────────────────
  {
    id: "OS-EEMC-CM2-500",
    source:
      "OS/Vietnam/EEMC/PO25-572 OS-OLTC CM2-Quỳnh (CM2III-500Y/72.5B-10193W)",
    tag: "customer-specified",
    note:
      "Imax 179.62 A / Ust 1624 V / Um 72.5 / ±8. Min-adequate is CV2-350; buyer locked CM2-500.",
    input: {
      ...inTankVac,
      connection: "Y",
      throughCurrentA: 179.62,
      umKv: 72.5,
      stepVoltageV: 1624,
      plusMinusSteps: 8,
      selectorSize: "B",
    },
    expectPrimary: "CM2III-500Y/72.5B-10193W",
  },
  {
    id: "OS-EEMC-CV2-600",
    source:
      "OS/Vietnam/EEMC/PO25-586 586.2 OLTC Order Spec 2025-12-27 (CV2III-600Y/72.5-10191W)",
    tag: "min-adequate",
    note:
      "Imax 376.6 A sits above 350×0.97 → CV2-600. ±9 mid1 → 10191W.",
    input: {
      ...inTankVac,
      connection: "Y",
      throughCurrentA: 376.6,
      umKv: 72.5,
      stepVoltageV: 1181.8,
      plusMinusSteps: 9,
      midPositions: 1,
    },
    expectPrimary: "CV2III-600Y/72.5-10191W",
  },
  {
    id: "OS-EEMC-SHZV-1000",
    source:
      "OS/Vietnam/EEMC/PO26-667 contract 1096-EEMC/SHM-2026 (SHZV III 1000Y-72.5/C-10193W)",
    tag: "customer-specified",
    note:
      "Signed appendix is 72.5C (drawing filename 126C is not the contract). Imax 571 A fits CV2-600; buyer locked SHZV-1000.",
    input: {
      ...inTankVac,
      connection: "Y",
      throughCurrentA: 571,
      umKv: 72.5,
      stepVoltageV: 1624,
      plusMinusSteps: 8,
      selectorSize: "C",
    },
    expectPrimary: "SHZVIII-1000Y/72.5C-10193W",
  },
  {
    id: "OS-HAVEC-CV-350",
    source:
      "OS/Vietnam/HLG/2307 HAVEC Cambodia CV OS 31.07.2026 (CVIII-350D/40.5-14271W)",
    tag: "min-adequate",
    note:
      "27 positions exclude CV2 (max 23). 300 A / 40.5 / 202 V → oil CV-350, ±13 → 14271W.",
    input: {
      ...inTankOil,
      connection: "D",
      throughCurrentA: 300,
      umKv: 40.5,
      stepVoltageV: 202,
      plusMinusSteps: 13,
      midPositions: 1,
    },
    expectPrimary: "CVIII-350D/40.5-14271W",
  },
  {
    id: "OS-HAVEC-SV-500",
    source:
      "OS/Vietnam/HLG/0708 HAVEC Cambodia SV contract + OS 400 A SVR (SVIII-500D/40.5-12231W)",
    tag: "customer-specified",
    note:
      "400 A / 23 pos / 260 V. Vacuum min-adequate is CV2-600; buyer locked oil SV-500.",
    input: {
      ...inTankOil,
      connection: "D",
      throughCurrentA: 400,
      umKv: 40.5,
      stepVoltageV: 260,
      plusMinusSteps: 11,
      midPositions: 1,
    },
    expectPrimary: "SVIII-500D/40.5-12231W",
  },
  {
    id: "OS-MBT-CV-350",
    source:
      "OS/Vietnam/HLG/1811.HLG-SHM-2025-MBT OLTC Order Specs (CVIII-350D/40.5-10193W)",
    tag: "customer-specified",
    note:
      "Imax 227 A / 257 V / 40.5 / ±8. Vacuum min-adequate is CV2-350; buyer locked oil CV.",
    input: {
      ...inTankOil,
      connection: "D",
      throughCurrentA: 227,
      umKv: 40.5,
      stepVoltageV: 257,
      plusMinusSteps: 8,
    },
    expectPrimary: "CVIII-350D/40.5-10193W",
  },

  ...ANTHONY_REPLAY,
];

/** Skipped Qu-ET / OS rows — recorded so inventory does not invent duty. */
export const ORDER_REPLAY_SKIPPED: Array<{
  id: string;
  source: string;
  reason: string;
}> = [
  {
    id: "Qu-ET260008",
    source:
      "QS/Qu-ET260008 + OS/Australia/Wilson/153626 PO (3×SHZVI-2400 Y-72.5/D-10193W)",
    reason:
      "QS table is catalogue max (2400 A / 4000 V) with no transformer MVA/kV/Ust. Signed OS 851-2533P01 is a scan; duty not recoverable without inventing Ust.",
  },
  {
    id: "Qu-ET260009",
    source: "QS/Qu-ET260009 SHM-D HLG.docx",
    reason: "MDU-only (SHM-D for an existing CM). Selector does not pick drives.",
  },
  {
    id: "Qu-ET260010",
    source: "QS/Qu-ET260010-WDLVIII-2000-145-5_2B-TBA.docx",
    reason: "OCTC / WDL (de-energized). Out of OLTC engine scope.",
  },
  ...ANTHONY_REPLAY_SKIPPED,
];

export type TypeParts = {
  unitCount: number;
  family: string;
  phases: string;
  currentA: number;
  connection: string;
  umKv: number;
  selectorSize: string;
  tapCode: string;
};

/** Normalize commercial type strings from QS/OS (spaces, ×, *, en-dash). */
export function normalizeType(raw: string): string {
  let t = raw
    .replace(/[×*]/g, "x")
    .replace(/[–—－]/g, "-")
    .replace(/,/g, ".")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/\s+/g, "")
    .replace(/(\d)_(\d)/g, "$1x$2")
    .replace(/(III|II|I)(\d)/, "$1-$2")
    .replace(/(WSL|WDL|WSG)(VIII|VII|IV|VI|IX|V)(\d)/i, "$1$2-$3");
  // WSLIV-800Y170-6x5B → insert slash before Um
  if (!t.includes("/")) {
    t = t.replace(/([YD])(\d+(?:\.\d+)?)-/i, "$1/$2-");
  }
  // WSLIV-600Y/1268x7E → 126-8x7E (glued Um + contact)
  t = t.replace(
    /(363|362|330|300|252|170|145|126|72\.5|40\.5|17\.5|12\.5|12)(\d{1,2}x\d)/,
    "$1-$2",
  );
  return t;
}

const OCTC_TYPE_RE =
  /^(?:(\d+)x)?(WSL|WDL|WSG)(VIII|VII|III|II|IV|VI|IX|V|I)-(\d+)([YD])?[/-](\d+(?:\.\d+)?)-(\d+)x(\d+)(?:\((\d+)x(\d+)\))?(?:\(([A-E])\)|([A-E]))?$/i;

/**
 * Parse a Huaming commercial type.
 *   SHZVIII-1000Y/72.5C-12233W
 *   3xSHZVI-2400/72.5C-10193W
 *   CV2III-350D/40.5-10193W
 *   WSLIV-800Y/170-6x5B
 */
export function parseTypeString(raw: string): TypeParts | null {
  const t = normalizeType(raw);
  const octc = t.match(OCTC_TYPE_RE);
  if (octc) {
    // 4x3(6x5)A → commercial contact is the inner/last pair (6x5)
    const contact = octc[9] && octc[10]
      ? `${Number(octc[9])}x${Number(octc[10])}`
      : `${Number(octc[7])}x${Number(octc[8])}`;
    return {
      unitCount: octc[1] ? Number(octc[1]) : 1,
      family: octc[2].toUpperCase(),
      phases: octc[3].toUpperCase(),
      currentA: Number(octc[4]),
      connection: (octc[5] ?? "").toUpperCase(),
      umKv: Number(octc[6]),
      selectorSize: (octc[11] || octc[12] || "").toUpperCase(),
      tapCode: contact,
    };
  }
  const re =
    /^(?:(\d+)x)?([A-Z][A-Z0-9]*?)(III|II|I)-(\d+)([YD])?\/(\d+(?:\.\d+)?)([BCDE]+)?-(\d+[WG0]?)$/;
  const m = t.match(re);
  if (!m) return null;
  return {
    unitCount: m[1] ? Number(m[1]) : 1,
    family: m[2],
    phases: m[3],
    currentA: Number(m[4]),
    connection: m[5] ?? "",
    umKv: Number(m[6]),
    selectorSize: m[7] ?? "",
    tapCode: m[8],
  };
}

/**
 * Criterion 2: family, phase, through-current rating, Y/D (when the type
 * includes it), Um, selector grade on combined types, tap code.
 * Single-phase strings omit Y/D after current (D after Um is grade).
 */
export function commercialMatch(actual: string, expected: string): boolean {
  const a = parseTypeString(actual);
  const e = parseTypeString(expected);
  if (!a || !e) return normalizeType(actual) === normalizeType(expected);
  if (a.family !== e.family) return false;
  if (a.phases !== e.phases) return false;
  if (a.currentA !== e.currentA) return false;
  if (e.connection && a.phases !== "I" && a.connection !== e.connection) {
    return false;
  }
  if (a.umKv !== e.umKv) return false;
  if (e.selectorSize && a.selectorSize !== e.selectorSize) return false;
  if (e.tapCode && a.tapCode !== e.tapCode) return false;
  if (e.unitCount > 1 && a.unitCount !== e.unitCount) return false;
  return true;
}

export type ReplayRow = {
  id: string;
  source: string;
  tag: ReplayTag;
  expected: string;
  actualPrimary: string;
  next: string[];
  backup?: string;
  backupOk: boolean | null;
  pass: boolean;
};

export function runOrderReplay(): ReplayRow[] {
  return ORDER_REPLAY.map((c) => {
    const out = selectOltc(c.input);
    const models = out.results.map((r) => r.model);
    const actualPrimary = models[0] ?? "";
    const next = models.slice(1, 4);
    const primaryOk =
      c.tag === "min-adequate"
        ? commercialMatch(actualPrimary, c.expectPrimary)
        : models.some((m) => commercialMatch(m, c.expectPrimary));
    let backupOk: boolean | null = null;
    if (c.expectBackup) {
      backupOk = next.some((m) => commercialMatch(m, c.expectBackup!));
    } else {
      backupOk = next.length > 0;
    }
    return {
      id: c.id,
      source: c.source,
      tag: c.tag,
      expected: c.expectPrimary,
      actualPrimary,
      next,
      backup: c.expectBackup,
      backupOk,
      pass: Boolean(out.ok && primaryOk && backupOk),
    };
  });
}

export function replaySummary(rows: ReplayRow[] = runOrderReplay()) {
  return {
    total: rows.length,
    match: rows.filter((r) => r.tag === "min-adequate" && r.pass).length,
    eligibleDifferent: rows.filter(
      (r) => r.tag === "customer-specified" && r.pass,
    ).length,
    fail: rows.filter((r) => !r.pass).length,
    skip: ORDER_REPLAY_SKIPPED.length,
    engineBugFixed: 0,
  };
}

export function formatReplayMarkdown(rows: ReplayRow[]): string {
  const lines = [
    "# Order replay",
    "",
    "Shipped `selectOltc` on each QS/OS fixture.",
    "",
    "| id | tag | expected | #1 | next | pass |",
    "|---|---|---|---|---|---|",
  ];
  for (const r of rows) {
    const next = r.next.join(", ") || "—";
    lines.push(
      `| ${r.id} | ${r.tag} | \`${r.expected}\` | \`${r.actualPrimary}\` | ${next} | ${r.pass ? "pass" : "FAIL"} |`,
    );
  }
  const failed = rows.filter((r) => !r.pass);
  lines.push("");
  lines.push(
    failed.length
      ? `Failed: ${failed.map((r) => r.id).join(", ")}`
      : `All ${rows.length} replay rows passed.`,
  );
  return lines.join("\n") + "\n";
}
