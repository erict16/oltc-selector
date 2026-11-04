/**
 * Tender-line reader corpus (2026-11-04 round-2 audit, READER-01 … READER-21).
 * Every repro line of the audit with the engineer's reading, so a later edit to
 * lib/nameplate.ts cannot bring one back. Fields left out of a row are not checked.
 */
import { describe, expect, it } from "vitest";
import { parseTenderLine, tenderLineSettings, type AssumedField, type LineNoteKey } from "./nameplate";
import { assumptionsFromArgs, parseCliArgs } from "./cli";

type Want = {
  kind?: "two_winding" | "auto";
  mva?: number;
  /** Two-winding: tapped kV. */
  kv?: number;
  /** Autotransformer: HV and MV kV. */
  hv?: number;
  mv?: number;
  voltages?: number[];
  /** star / delta of the tapped winding (two-winding). */
  conn?: "star" | "delta";
  tap?: "neutral" | "line_end" | "auto_junction" | "auto_mv_line";
  plus?: number | null;
  minus?: number | null;
  step?: number | null;
  phases?: "I" | null;
  vg?: string | null;
  nbil?: number | null;
  assumed?: AssumedField[];
  notAssumed?: AssumedField[];
  notes?: LineNoteKey[];
};

type Row = [id: string, line: string, want: Want];

const ROWS: Row[] = [
  // READER-01: European thousands dot in kVA.
  ["R01", "63.000 kVA 132±10x1.25%/20 kV YNd11", { mva: 63, kv: 132, conn: "star", tap: "neutral", plus: 10, minus: 10, step: 1.25 }],
  ["R01", "100.000 kVA, 154±12x1.25%/34.5 kV, YNyn0", { mva: 100, kv: 154, plus: 12, step: 1.25 }],
  ["R01", "Potencia 80.000 kVA, 220±10x1,25%/66 kV, YNd11", { mva: 80, kv: 220, plus: 10, step: 1.25 }],
  ["R01", "40.000/50.000 kVA 132/33 kV YNd1 ±10x1.25%", { mva: 50, voltages: [132, 33], kv: 132, tap: "neutral" }],
  ["R01", "31.500 kVA 115±9x1.78%/11 kV YNd1", { mva: 31.5, kv: 115, step: 1.78 }],
  ["R01", "Leistung 40.000 kVA, 110±12x1,33%/21 kV, YNd5", { mva: 40, kv: 110, plus: 12, step: 1.33 }],
  ["R01", "0.400 kVA 11±2x2.5%/0.4 kV Dyn11", { mva: 0.0004, notes: ["tiny_mva"] }],
  ["R01", "0.15 MVA 11±2x2.5%/0.4 kV Dyn11", { mva: 0.15, notes: ["tiny_mva"] }],
  // READER-02: every rating read, the largest sized; fault and base figures are not ratings.
  ["R02", "40 MVA ONAN / 63 MVA ONAF, 132/33 kV, YNd11, ±10x1.25%", { mva: 63, kv: 132, notes: ["largest_mva"] }],
  ["R02", "Rated power: 40 MVA (ONAN), 50 MVA (ONAF); 132±8x1.25%/33 kV; YNd11", { mva: 50, kv: 132, notes: ["largest_mva"] }],
  ["R02", "ONAN 25 MVA / ONAF 31.5 MVA 110±8x1.25%/11 kV YNd11", { mva: 31.5, kv: 110 }],
  ["R02", "Rated power ONAN 30 MVA, ONAF 40 MVA, 115±9x1.78%/23 kV, YNd1", { mva: 40, kv: 115, step: 1.78 }],
  ["R02", "Fault level 5000 MVA; 40 MVA 132±8x1.25%/33 kV", { mva: 40, kv: 132 }],
  ["R02", "40 MVA 132±8x1.25%/33 kV YNd11, impedance 12% on 100 MVA base", { mva: 40 }],
  ["R02", "40 MVA 132±8x1.25%/33 kV YNyn0d11, tertiary 20 MVAr", { mva: 40 }],
  ["R02", "25/31.5 MVA ONAN/ONAF 110±8x1.25%/11 kV YNd11", { mva: 31.5 }],
  ["R02", "Nominal system voltage 150 kV 60 MVA, 150±10x1.25%/20 kV YNyn0", { mva: 60, notAssumed: ["mva"] }],
  // READER-03: a BIL after another winding word is not the neutral's.
  ["R03", "40 MVA 132±8x1.25%/11 kV YNd11, neutral solidly earthed, LV BIL 75 kV", { kv: 132, tap: "neutral", nbil: null }],
  ["R03", "63 MVA 132±8x1.25%/33 kV YNyn0, LV neutral LI 170 kV", { kv: 132, nbil: null }],
  ["R03", "160 MVA 400±8x1.25%/132 kV YNyn0d11, neutral grounded directly, tertiary BIL 170 kV", { kv: 400, nbil: null }],
  ["R03", "40 MVA 132±8x1.25%/33 kV YNd11, insulation line end/neutral LI 650/325 kV", { tap: "neutral", nbil: 325 }],
  ["R03", "100 MVA 220±8x1.25%/22 kV YNd11, neutral insulation LI 325 kV", { nbil: 325 }],
  ["R03", "100 MVA 220±8x1.25%/22 kV YNd11, neutral terminal BIL 550 kV", { nbil: 550 }],
  ["R03", "100 MVA 220±8x1.25%/22 kV YNd11, 中性点 LI 325", { nbil: 325 }],
  ["R03", "100 MVA 220±8x1.25%/22 kV YNd11, HV neutral BIL 550 kV", { nbil: 550 }],
  // READER-04: "132 kV / 33 kV ±" closes the ratio; the range stands alone (HV, assumed).
  ["R04", "50 MVA 132 kV / 33 kV ±10x1.25% YNd11", { kv: 132, conn: "star", tap: "neutral", assumed: ["tap_winding"] }],
  ["R04", "50 MVA 132kV/33kV ±10x1.25% YNd11", { kv: 132, tap: "neutral" }],
  ["R04", "50 MVA, 132 kV/33 kV/11 kV, ±10x1.25%, YNyn0d11", { voltages: [132, 33, 11], kv: 132 }],
  // READER-05: single-phase words, banks and per-unit figures.
  ["R05", "Single-phase, 167 MVA, 500/230 kV, ±8x1.25%, Ii0", { mva: 167, kv: 500, phases: "I" }],
  ["R05", "Type: single phase; rating 100 MVA; 400±8x1.25%/132 kV", { mva: 100, kv: 400, phases: "I" }],
  ["R05", "3x83.3 MVA 275±9x1.25%/132/13 kV YNa0d11", { kind: "auto", mva: 83.3, hv: 275, mv: 132, phases: "I" }],
  ["R05", "40 MVA 132±8x1.25%/33 kV YNd11, motor drive 3-phase 400 V, control 1-phase 230 V", { mva: 40, phases: null }],
  ["R05", "40 MVA 132±8x1.25%/33 kV YNd11, auxiliary 1 ph 230 V", { mva: 40, phases: null }],
  ["R05", "40 MVA 132±8x1.25%/33 kV YNd11, auxiliary supply 230 V single-phase", { mva: 40, phases: null }],
  ["R05", "40 MVA 132±8x1.25%/33 kV YNd11, single-phase fault current 10 kA", { phases: null }],
  ["R05", "40 MVA 132±8x1.25%/33 kV YNd11, single phase to earth fault", { phases: null }],
  ["R05", "300 MVA bank (3 x 100 MVA single-phase), 400±8x1.25%/132 kV YNyn0", { mva: 100, kv: 400, phases: "I" }],
  ["R05", "250 MVA bank of 3 x 1-phase units, 400±8x1.25%/132 kV YNyn0", { mva: 83.333, kv: 400, phases: "I" }],
  ["R05", "Bank of 3 single-phase units, 3x100 MVA, 400/132 kV, ±8x1.25%", { mva: 100, phases: "I" }],
  ["R05", "Supply of 3 x 40 MVA three-phase transformers 132±8x1.25%/33 kV YNd11", { mva: 40, phases: null }],
  // READER-06: insulation chains are not the ratio.
  ["R06", "40 MVA, 132 kV ±8x1.25%, LI/AC 650/275 kV, YNd11", { voltages: [132], kv: 132, tap: "neutral" }],
  ["R06", "40 MVA 132/33 kV ±10x1.25% YNd11, BIL HV/LV/N 650/170/325 kV", { voltages: [132, 33], kv: 132 }],
  ["R06", "40 MVA, ±10x1.25%, 132/33 kV, Um 145/36/36 kV, YNd11", { voltages: [132, 33], kv: 132 }],
  ["R06", "40 MVA, 132 kV, ±8x1.25%, BIL 650/275/170 kV, YNd11", { voltages: [132], kv: 132 }],
  // READER-07: upper-case X and brackets around the range.
  ["R07", "25 MVA, 110 ± 8 X 1.25 % / 11 kV, YNd11", { kv: 110, conn: "star", tap: "neutral", plus: 8, minus: 8, step: 1.25 }],
  ["R07", "30 MVA 115 (+8/-8 x 1.25%) / 13.8 kV YNd1", { voltages: [115, 13.8], kv: 115, plus: 8, step: 1.25 }],
  ["R07", "30 MVA 115 kV (+8/-12 x 1.25%) / 13.8 kV YNd1", { kv: 115, plus: 8, minus: 12, step: 1.25 }],
  ["R07", "16 MVA 66/11 KV DYN11 OLTC ±8X1.25%", { kv: 66, conn: "delta", tap: "line_end", plus: 8, step: 1.25 }],
  ["R07", "25 MVA (110±8x1.25%)/11 kV YNd11", { voltages: [110, 11], kv: 110, step: 1.25 }],
  ["R07", "25 MVA 110(±8x1.25%)/11 kV YNd11", { kv: 110, step: 1.25 }],
  ["R07", "SFZ11-40000/110 (110±8×1.25%)/10.5kV YNd11", { mva: 40, voltages: [110, 10.5], kv: 110 }],
  ["R07", "20 MVA (69±16x0.625%)/13.8 kV Dyn1", { kv: 69, conn: "delta", plus: 16, step: 0.625 }],
  // READER-08: OLTC and off-circuit ranges written apart.
  ["R08", "40 MVA, HV 132 kV ±2x2.5% (off-circuit), LV 33 kV ±8x1.25% (on-load), YNyn0", { kv: 33, tap: "neutral", plus: 8, step: 1.25 }],
  ["R08", "40 MVA 132/33 kV YNd11, DETC ±2x2.5%, OLTC ±8x1.25%", { kv: 132, plus: 8, step: 1.25 }],
  ["R08", "40 MVA 132/33 kV YNd11, OCTC ±2x2.5% on HV and OLTC ±10x1.25% on LV", { kv: 33, conn: "delta", tap: "line_end", plus: 10, step: 1.25 }],
  ["R08", "HV 110 kV ±8x1.25% OLTC, MV 38.5 kV ±2x2.5% OCTC, LV 11 kV, 40 MVA, YNyn0d11", { kv: 110, plus: 8, step: 1.25 }],
  // READER-09: LV / MV tapping words.
  ["R09", "20 MVA, 66/11 kV, YNyn0, OLTC on LV side ±10x1%", { kv: 11, conn: "star", tap: "neutral", step: 1, notAssumed: ["tap_winding"] }],
  ["R09", "20 MVA, 66/11 kV, Dyn1, tappings on LV winding, ±10x1%", { kv: 11, conn: "star", tap: "neutral", notAssumed: ["tap_winding"] }],
  ["R09", "20 MVA, 66 kV/11 kV ±10x1.0% (LV tapping), Dyn1", { kv: 11, conn: "star", tap: "neutral" }],
  ["R09", "20 MVA 66/11±10x1% kV YNyn0", { kv: 11 }],
  ["R09", "Autotransformer 200 MVA 230/115/13.8 kV, OLTC in MV line lead, ±8x1.25%", { kind: "auto", hv: 230, mv: 115, tap: "auto_mv_line" }],
  ["R09", "Auto-transformer 100 MVA, 132/66 kV, regulation on 66 kV side ±10x1.25%", { kind: "auto", hv: 132, mv: 66, tap: "auto_mv_line" }],
  ["R09", "250 MVA autotransformer 400/220/33 kV, ±10x1.25% on MV, YNa0d11", { kind: "auto", hv: 400, mv: 220, tap: "auto_mv_line" }],
  ["R09", "20 MVA, 66/11 kV, OLTC on HV side, cable box at LV, ±10x1%", { kv: 66 }],
  ["R09", "50 MVA, HV 132 kV, LV 33 kV, OLTC ±10x1.25% on HV, YNd11", { kv: 132, notAssumed: ["tap_winding"] }],
  // READER-10: an LV or kV-qualified neutral is not the tap's.
  ["R10", "15 MVA 33±8x1.25%/11 kV, LV neutral point earthed through 400 A NER", { kv: 33, assumed: ["winding", "tap_point"] }],
  ["R10", "15 MVA 33±8x1.25%/11 kV, 11 kV neutral point brought out", { kv: 33, assumed: ["winding", "tap_point"] }],
  ["R10", "103 MVA, 138/33 kV, ±8x1.5%, reversing, star neutral", { kv: 138, tap: "neutral", notAssumed: ["tap_point"] }],
  // READER-11: "Daya" is not a vector group.
  ["R11", "Daya 60 MVA, tegangan 150/20 kV, YNyn0+d, OLTC ±10x1.25%", { kind: "two_winding", vg: "YNyn0", kv: 150, tap: "neutral" }],
  ["R11", "Daya pengenal 60 MVA; 150±10x1.25%/20 kV; YNyn0(d1)", { kind: "two_winding", kv: 150, tap: "neutral" }],
  // READER-12: control and cooling "auto", all-caps "AT".
  ["R12", "25 MVA 110±8x1.25%/11 kV, OLTC AUTO/MANUAL/REMOTE", { kind: "two_winding", kv: 110, assumed: ["kind"] }],
  ["R12", "25 MVA, 110±8x1.25%/11 kV, OLTC with AVR, auto/manual control", { kind: "two_winding", assumed: ["kind"] }],
  ["R12", "25 MVA 110±8x1.25%/11 kV YNd11 OLTC auto/manual", { kind: "two_winding" }],
  ["R12", "25 MVA 110±8x1.25%/11 kV, cooling ONAN/ONAF (auto)", { kind: "two_winding", assumed: ["kind"] }],
  ["R12", "40 MVA AT ONAF, 132±10x1.25%/33 KV", { kind: "two_winding", kv: 132 }],
  ["R12", "40 MVA RATED AT 75 DEG C, 132±10x1.25%/33 KV, ±10X1.25%", { kind: "two_winding", kv: 132, plus: 10 }],
  ["R12", "125 MVA auto 220/110/35 kV, 225±8x1.25%/115/35 kV", { kind: "auto", hv: 225, mv: 115 }],
  ["R12", "100 MVA auto regulator 220±8x1.25%/110 kV", { kind: "auto" }],
  ["R12", "40 MVA 132±8x1.25%/33 kV YNd11, OLTC auto tap control", { kind: "two_winding" }],
  ["R12", "40 MVA 132±8x1.25%/33 kV, breaker auto-reclose", { kind: "two_winding", assumed: ["kind"] }],
  ["R12", "AT 250 MVA 220/110/22 kV ±8x1.25%", { kind: "auto", assumed: ["kind"] }],
  ["R12", "OSFPSZ-180000/220 220±8x1.25%/121/11kV", { kind: "auto", mva: 180, notAssumed: ["kind"] }],
  // READER-13: step written after the count, Cyrillic х.
  ["R13", "40 MVA, 115 kV ±9 steps of 1.78 %, 11 kV, YNd1", { kv: 115, plus: 9, minus: 9, step: 1.78 }],
  ["R13", "40 MVA, 115/11 kV, YNd1, ±9 steps x 1.78%", { kv: 115, plus: 9, step: 1.78 }],
  ["R13", "40 MVA, 115/11 kV, YNd1, ±9 (1.78 % per step)", { kv: 115, plus: 9, step: 1.78 }],
  ["R13", "40 MVA, 115/11 kV, YNd1, ±9 taps @ 1.78%", { kv: 115, plus: 9, step: 1.78 }],
  ["R13", "40 MVA 115 kV ±9х1,78%/11 kV YNd1", { voltages: [115, 11], kv: 115, plus: 9, step: 1.78 }],
  ["R13", "40 MVA 115±9х1,78%/11 kV YNd1", { voltages: [115, 11], kv: 115, plus: 9, step: 1.78 }],
  ["R13", "25 MVA 110/11 kV YNd11, +- 9 steps of 1.78%", { plus: 9, minus: 9, step: 1.78 }],
  ["R13", "25 MVA 110/11 kV YNd11, ±8 (10 %)", { plus: 8, step: null }],
  // READER-14: line-end words; insulation clauses; mid-winding.
  ["R14", "40 MVA 132±8x1.25%/33 kV, line-end tapping", { kv: 132, conn: "star", tap: "line_end", assumed: ["winding"], notAssumed: ["tap_point"] }],
  ["R14", "40 MVA 132/33 kV, star connected HV, regulation at line end ±8x1.25%", { kv: 132, tap: "line_end" }],
  ["R14", "25 MVA 66±8x1.25%/11 kV, OLTC at line end", { kv: 66, tap: "line_end" }],
  ["R14", "40 MVA 132±8x1.25%/33 kV YNyn0, line end regulation", { tap: "line_end" }],
  ["R14", "40 MVA 132±8x1.25%/33 kV YNd11, OLTC at neutral end, LI line end 650 kV, neutral 325 kV", { tap: "neutral", notAssumed: ["tap_point"] }],
  ["R14", "40 MVA 132/33 kV YNd11, regulation in the middle of the HV winding, ±8x1.25%", { kv: 132, tap: "line_end", notes: ["mid_winding"] }],
  ["R14", "40 MVA 132/33 kV YNd11, OLTC in neutral end of HV winding ±8x1.25%", { tap: "neutral" }],
  // READER-15: HV delta words; GB, spaced and all-caps vector groups.
  ["R15", "15 MVA, 33/11 kV, ±8x1.25%, delta/star", { kv: 33, conn: "delta", tap: "line_end" }],
  ["R15", "15 MVA 33/11 kV Delta-Star ±8x1.25%", { conn: "delta", tap: "line_end" }],
  ["R15", "15 MVA, 33/11 kV, HV winding delta, ±8x1.25% on HV", { kv: 33, conn: "delta", tap: "line_end" }],
  ["R15", "15 MVA, 33/11 kV, HV: delta, LV: star (neutral brought out), ±8x1.25%", { conn: "delta", tap: "line_end" }],
  ["R15", "SZ11-1600/10 10±4×2.5%/0.4kV D,yn11", { mva: 1.6, kv: 10, vg: "Dyn11", conn: "delta", tap: "line_end" }],
  ["R15", "SZ11-2000/10 10±4×2.5%/0.4kV D yn11", { kv: 10, vg: "Dyn11", conn: "delta" }],
  ["R15", "16 MVA 66/11 kV DYN11 ±8x1.25%", { kv: 66, vg: "Dyn11", conn: "delta", tap: "line_end" }],
  ["R15", "40 MVA 132/33 KV YNYN0D11 ±10X1.25%", { kv: 132, vg: "YNyn0d11", tap: "neutral", step: 1.25 }],
  ["R15", "SFSZ11-40000/110 110±8×1.25%/38.5±2×2.5%/10.5kV YN,yn0,d11", { kv: 110, vg: "YNyn0d11" }],
  ["R15", "SZ11-10000/35 35±3×2.5%/10.5kV Ynd11", { kv: 35, vg: "YNd11", tap: "neutral" }],
  ["R15", "40 MVA, 132/33 kV, ±8x1.25%, star/delta", { conn: "star", assumed: ["winding"], notes: ["delta_text"] }],
  // READER-16: the tap range wins over other ±% figures.
  ["R16", "40 MVA, 132/33 kV, 50 Hz ±5%, YNd11, tapping range +5%/-15%", { plus: 4, minus: 12, step: 1.25 }],
  ["R16", "40 MVA, 132/33 kV, voltage variation ±10%, YNd11, tapping range +5%/-15%", { plus: 4, minus: 12, step: 1.25 }],
  ["R16", "25 MVA 110/11 kV YNd11, ukr 12 % ±10 %, +5%/-15%", { plus: 4, minus: 12, step: 1.25 }],
  ["R16", "25 MVA 110/11 kV YNd11, %Z 10 ±10%, OLTC +5%/-15%", { plus: 4, minus: 12, step: 1.25 }],
  ["R16", "25 MVA 110/11 kV YNd11, Uk 10.5 %, tapping +5%/-15%", { plus: 4, minus: 12, step: 1.25 }],
  ["R16", "25 MVA 110/10.5 kV YNd11, Uk 10.5%, tolerance +10/-10%", { plus: null, assumed: ["range"] }],
  // READER-17: minus-first and per-side ranges.
  ["R17", "25 MVA 110/11 kV YNd11, tapping range -15% to +5%", { plus: 4, minus: 12, step: 1.25 }],
  ["R17", "25 MVA 110/11 kV YNd11, +5% to -15%", { plus: 4, minus: 12, step: 1.25 }],
  ["R17", "25 MVA 110/11 kV YNd11, -15%/+5%", { plus: 4, minus: 12, step: 1.25 }],
  ["R17", "25 MVA 110/11 kV YNd11, -12/+4 x 1.25%", { plus: 4, minus: 12, step: 1.25, notAssumed: ["range"] }],
  ["R17", "100 MVA 154/34.5 kV YNyn0, +%5/-%15, 17 kademe", { plus: 4, minus: 12, step: 1.25, notAssumed: ["range"] }],
  ["R17", "100 MVA 154/34.5 kV YNyn0, ±%10, 21 kademe", { plus: 10, minus: 10, step: 1 }],
  ["R17", "25 MVA 110/11 kV YNd11, +2x2.5%/-4x2.5%", { plus: 2, minus: 4, step: 2.5 }],
  ["R17", "20 MVA 66/11 kV Dyn11, -10% to +10% in 21 positions", { kv: 66, conn: "delta", plus: 10, minus: 10, step: 1 }],
  ["R17", "20 MVA 66/11 kV Dyn11, -15%/+5% 21 positions", { plus: 5, minus: 15, step: 1 }],
  ["R17", "25 MVA 110/11 kV YNd11, Uk 10%, tolerance -5/+10%", { plus: null, assumed: ["range"] }],
  // READER-18: /√3 and /sqrt3 voltages; OD…Z single-phase models.
  ["R18", "Single-phase 100 MVA 400/√3±8x1.25%/132/√3 kV YNyn0", { kind: "two_winding", voltages: [400, 132], kv: 400, tap: "neutral", phases: "I", mva: 100 }],
  ["R18", "83.3 MVA single-phase, 275/sqrt3±9x1.25%/132/sqrt3/13 kV, YNa0d11", { kind: "auto", hv: 275, mv: 132, tap: "auto_junction", phases: "I" }],
  ["R18", "Autotransformer 3 x 167 MVA single-phase, 500/√3 / 230/√3 / 33 kV, ±8x1.25%", { kind: "auto", mva: 167, hv: 500, mv: 230, phases: "I" }],
  ["R18", "ODFPSZ-250000/500 525/√3±8×1.25%/230/√3/36 kV", { kind: "auto", mva: 250, hv: 525, mv: 230, phases: "I" }],
  // READER-20: IBT and Rosseti autotransformer models.
  ["R20", "АТДЦТН-200000/220/110 200 MVA 230±6х2%/121/11 kV", { kind: "auto", mva: 200, hv: 230, mv: 121, tap: "auto_junction", plus: 6, step: 2 }],
  ["R20", "IBT 500 MVA 500/150/66 kV ±8x1.25%", { kind: "auto", hv: 500, mv: 150, notAssumed: ["kind"] }],
  ["R20", "Interbus transformer 500 MVA 500/150/66 kV, YNa0d1, ±8x1.25%", { kind: "auto", hv: 500, mv: 150 }],
  // READER-21: voltages in volts.
  ["R21", "2.5 MVA 33000±2x2.5%/415 V Dyn11", { voltages: [33, 0.415], kv: 33, conn: "delta", tap: "line_end", plus: 2, step: 2.5 }],
  ["R21", "1000 kVA 11000±2x2.5%/433 V Dyn11", { mva: 1, voltages: [11, 0.433], kv: 11, conn: "delta" }],
  ["R21", "500 kVA, 11 kV/415 V, Dyn11, OLTC ±4x2.5%", { kv: 11, conn: "delta", plus: 4 }],
];

function reading(line: string) {
  const t = parseTenderLine(line);
  if (!t) throw new Error(`not read: ${line}`);
  return {
    t,
    got: {
      kind: t.kind,
      mva: t.mva,
      kv: t.tapKv,
      hv: t.hvKv,
      mv: t.mvKv,
      voltages: t.voltagesKv,
      conn: t.winding,
      tap: t.tapPoint,
      plus: t.plus,
      minus: t.minus,
      step: t.stepPct,
      phases: t.phases,
      vg: t.vectorGroup,
      nbil: t.neutralBilKv,
    },
  };
}

describe("tender-line reader corpus (round-2 audit)", () => {
  for (const [id, line, want] of ROWS) {
    it(`${id}: ${line}`, () => {
      const { t, got } = reading(line);
      const { assumed, notAssumed, notes, ...fields } = want;
      expect(got).toMatchObject(fields);
      for (const a of assumed ?? []) expect(t.assumed, `assumed ${a}`).toContain(a);
      for (const a of notAssumed ?? []) expect(t.assumed, `not assumed ${a}`).not.toContain(a);
      for (const n of notes ?? []) expect(t.notes.map((x) => x.key), `note ${n}`).toContain(n);
    });
  }
});

describe("tender-line reader corpus: off-circuit duty and settings", () => {
  it("R08: --octc takes the range the line calls OCTC", () => {
    const t = parseTenderLine("HV 110 kV ±8x1.25% OLTC, MV 38.5 kV ±2x2.5% OCTC, LV 11 kV, 40 MVA, YNyn0d11")!;
    expect(t.otherRanges).toHaveLength(1);
    expect(t.otherRanges[0]).toMatchObject({ kv: 38.5, plus: 2, stepPct: 2.5, offCircuit: true, kvAssumed: false });
    const off = tenderLineSettings(t, { octc: true });
    expect(off.ok && [off.s.tapKv, off.s.plus, off.s.stepPct, off.s.octcWinding, off.s.tapKvStated]).toEqual([
      38.5, 2, 2.5, true, true,
    ]);
  });
  it("R08: the off-circuit range keeps its own kV", () => {
    const t = parseTenderLine("40 MVA, HV 132 kV ±2x2.5% (off-circuit), LV 33 kV ±8x1.25% (on-load), YNyn0")!;
    expect(t.otherRanges[0]).toMatchObject({ kv: 132, plus: 2, offCircuit: true });
    const off = tenderLineSettings(t, { octc: true });
    expect(off.ok && [off.s.tapKv, off.s.plus]).toEqual([132, 2]);
    const on = tenderLineSettings(t);
    expect(on.ok && [on.s.tapKv, on.s.plus, on.s.tapKvStated]).toEqual([33, 8, true]);
  });
  it("R08: a DETC range with no kV takes the OLTC's winding, flagged", () => {
    const t = parseTenderLine("40 MVA 132/33 kV YNd11, DETC ±2x2.5%, OLTC ±8x1.25%")!;
    expect(t.otherRanges[0]).toMatchObject({ kv: 132, plus: 2, offCircuit: true, kvAssumed: true });
    const off = tenderLineSettings(t, { octc: true });
    expect(off.ok && [off.s.plus, off.s.tapKvStated]).toEqual([2, false]);
  });
  it("R03: a stated neutral BIL still sets the earth Um", () => {
    const r = tenderLineSettings(parseTenderLine("100 MVA 220±8x1.25%/22 kV YNd11, neutral terminal BIL 550 kV")!);
    expect(r.ok && r.s.earthUm).toBe(126);
    const lv = tenderLineSettings(parseTenderLine("40 MVA 132±8x1.25%/11 kV YNd11, neutral solidly earthed, LV BIL 75 kV")!);
    expect(lv.ok && lv.s.earthUm).toBeNull();
  });
  it("R05: a single-phase unit is sized on 3 × its MVA", () => {
    const r = tenderLineSettings(parseTenderLine("Single-phase, 167 MVA, 500/230 kV, ±8x1.25%, Ii0")!);
    expect(r.ok && [r.s.mva, r.s.phases]).toEqual([501, "I"]);
  });
  it("R19: the CLI 假定 names a guessed tapped winding, not a stated one", () => {
    const said = (line: string) => assumptionsFromArgs(parseCliArgs(["--line", line])).join(" · ");
    expect(said("63 MVA 132/33 kV YNd11 OLTC ±10x1.25%")).toContain("调压绕组 132 kV（默认）");
    expect(said("40 MVA, 132 kV ±8x1.25%, LI/AC 650/275 kV, YNd11")).not.toContain("调压绕组");
    expect(said("25 MVA, 110 ± 8 X 1.25 % / 11 kV, YNd11")).not.toContain("调压绕组");
    expect(assumptionsFromArgs(parseCliArgs(["--line", "63 MVA 132/33 kV YNd11 OLTC ±10x1.25%", "--kv", "132"])).join(" ")).not.toContain(
      "调压绕组",
    );
  });
  it("R03: the CLI says an earth Um came from the line's neutral BIL", () => {
    const a = parseCliArgs(["--line", "100 MVA 220±8x1.25%/22 kV YNd11, neutral terminal BIL 550 kV"]);
    expect(a.earthUm).toBe(126);
    expect(a.given.has("earthUm")).toBe(false);
    expect(assumptionsFromArgs(a).join(" ")).toContain("对地 Um 126（招标行中性点 BIL 550 kV）");
    const lv = parseCliArgs(["--line", "40 MVA 132±8x1.25%/11 kV YNd11, neutral solidly earthed, LV BIL 75 kV"]);
    expect(lv.earthUm).toBeUndefined();
  });
  it("R19: tapKvStated follows the tapped-winding guess", () => {
    const guess = tenderLineSettings(parseTenderLine("63 MVA 132/33 kV YNd11 OLTC ±10x1.25%")!);
    expect(guess.ok && [guess.s.tapKv, guess.s.tapKvStated]).toEqual([132, false]);
    const stated = tenderLineSettings(parseTenderLine("25MVA 110±8x1.25%/10.5kV YNd11")!);
    expect(stated.ok && [stated.s.tapKv, stated.s.tapKvStated]).toEqual([110, true]);
  });
});
