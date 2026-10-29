/**
 * Transformer → OLTC duty.
 *
 * The engine only knows Y/D, Iu, Um and Ust. Getting those right needs the
 * transformer kind and where the tap changer sits; the kV on the tapped
 * winding alone is not enough. 2026-10-27: a 225/115/35 kV autotransformer
 * tapped at the series/common junction was sized from 115 kV as
 * CV2III-600D/126. Huaming quoted 3×SHZVI-600/252D-10193W: the switch takes
 * the HV system's insulation, and compound types are out.
 */
import {
  iecUmFromRatedKv,
  maxThroughCurrent,
  catalogueUmFromRatedKv,
} from "./deriveUm";
import type { Connection } from "./types";

export type TransformerKind = "two_winding" | "auto";

/**
 * Where the OLTC sits.
 * - neutral: star point of a star winding (two-winding only here).
 * - line_end: line end of the tapped winding (star or delta).
 * - auto_junction: autotransformer, between series and common winding;
 *   carries the series (HV) current.
 * - auto_mv_line: autotransformer, in the MV line lead; carries MV current.
 */
export type TapPoint = "neutral" | "line_end" | "auto_junction" | "auto_mv_line";

export type WindingConnection = "star" | "delta";

export const TAP_POINTS_FOR: Record<TransformerKind, readonly TapPoint[]> = {
  two_winding: ["neutral", "line_end"],
  auto: ["auto_junction", "auto_mv_line"],
};

export interface TransformerSpec {
  kind: TransformerKind;
  tapPoint: TapPoint;
  /** Two-winding only. An autotransformer is star (YNa0). */
  winding: WindingConnection;
  mva: number;
  /** Two-winding: rated kV of the tapped winding. */
  tapKv: number;
  /** Autotransformer: HV and MV rated kV. */
  hvKv: number;
  mvKv: number;
  minusSteps: number;
  /** Step as a fraction (0.0125). Null when not given. */
  stepFraction: number | null;
  /** Current safety factor ≥ 1. */
  safetyK: number;
  /**
   * OLTC insulation to earth as a catalogue Um class, when the OS or the
   * transformer maker states it. Undefined = rule below.
   */
  earthUmKv?: number;
}

export type UmRule =
  | "explicit"
  | "line"
  | "neutral_full"
  | "neutral_assumed"
  | "auto_hv";

export interface DutyBasis {
  ok: boolean;
  errorZh?: string;
  errorEn?: string;
  /** Engine connection: Y = common star point, D = no common star point. */
  connection: Connection;
  /** Voltage whose system Um sets the switch insulation (kV). */
  umSystemKv: number;
  /** IEC 60038 Um of that system, before any catalogue snap. */
  actualUmKv: number;
  /** Catalogue Um class sent to the engine. */
  umKv: number;
  umRule: UmRule;
  /** True when Um rests on an assumption the user must confirm. */
  umAssumed: boolean;
  /** Rated current through the tap changer (A). */
  ratedA: number;
  /** At the lowest tap. */
  maxA: number;
  /** maxA × safety factor: what the engine sizes against. */
  dutyA: number;
  /** Voltage (kV, line) the current formula uses. */
  currentKv: number;
  /** Current divisor: √3 (line current) or 3 (delta phase current). */
  currentDivisor: "sqrt3" | "three";
  stepV: number | null;
  /** Compound (CV/CV2/SV) excluded. */
  combinedOnly: boolean;
  cautionsZh: string[];
  cautionsEn: string[];
}

const SQRT3 = Math.sqrt(3);

const fail = (zh: string, en: string): DutyBasis => ({
  ok: false,
  errorZh: zh,
  errorEn: en,
  connection: "Y",
  umSystemKv: NaN,
  actualUmKv: NaN,
  umKv: NaN,
  umRule: "line",
  umAssumed: false,
  ratedA: NaN,
  maxA: NaN,
  dutyA: NaN,
  currentKv: NaN,
  currentDivisor: "sqrt3",
  stepV: null,
  combinedOnly: false,
  cautionsZh: [],
  cautionsEn: [],
});

/** Neutral of a star winding: full class up to 72.5, else 72.5 assumed. */
const NEUTRAL_DEFAULT_UM = 72.5;

export function deriveDuty(spec: TransformerSpec): DutyBasis {
  const cautionsZh: string[] = [];
  const cautionsEn: string[] = [];
  const auto = spec.kind === "auto";

  if (!TAP_POINTS_FOR[spec.kind].includes(spec.tapPoint)) {
    return fail(
      "开关位置和变压器种类不匹配。",
      "Tap position does not fit the transformer kind.",
    );
  }
  if (auto) {
    if (!(spec.hvKv > 0) || !(spec.mvKv > 0)) {
      return fail("自耦变要填高压和中压额定电压。", "Enter the autotransformer's HV and MV rated voltage.");
    }
    if (!(spec.hvKv > spec.mvKv)) {
      return fail("自耦变高压要高于中压。", "Autotransformer HV must be above MV.");
    }
  } else {
    if (!(spec.tapKv > 0)) {
      return fail("请填写调压绕组额定电压。", "Enter the tapped winding's rated voltage.");
    }
    if (spec.tapPoint === "neutral" && spec.winding === "delta") {
      return fail(
        "角形绕组没有中性点，开关只能在线端。",
        "A delta winding has no neutral; the tap changer sits at the line end.",
      );
    }
  }

  // Current and step voltage follow the winding the switch is in.
  let currentKv: number;
  let currentDivisor: "sqrt3" | "three";
  let stepBaseV: number;
  if (auto) {
    currentKv = spec.tapPoint === "auto_junction" ? spec.hvKv : spec.mvKv;
    currentDivisor = "sqrt3";
    // The ± range sits on the voltage the switch regulates.
    stepBaseV = (currentKv * 1000) / SQRT3;
  } else if (spec.winding === "delta") {
    currentKv = spec.tapKv;
    currentDivisor = "three";
    stepBaseV = spec.tapKv * 1000;
  } else {
    currentKv = spec.tapKv;
    currentDivisor = "sqrt3";
    stepBaseV = (spec.tapKv * 1000) / SQRT3;
  }
  // No MVA (current typed directly): Um and Ust still follow; current is NaN.
  const ratedA =
    spec.mva > 0
      ? (spec.mva * 1000) / ((currentDivisor === "three" ? 3 : SQRT3) * currentKv)
      : NaN;
  const maxA =
    spec.stepFraction != null && spec.stepFraction > 0
      ? maxThroughCurrent(ratedA, spec.minusSteps, spec.stepFraction)
      : ratedA;
  const k = spec.safetyK > 0 ? spec.safetyK : 1;
  const stepV =
    spec.stepFraction != null && spec.stepFraction > 0
      ? stepBaseV * spec.stepFraction
      : null;

  // Insulation to earth.
  let umSystemKv: number;
  let umKv: number;
  let umRule: UmRule;
  let umAssumed = false;
  if (auto) {
    umSystemKv = spec.hvKv;
    umKv = catalogueUmFromRatedKv(spec.hvKv);
    umRule = "auto_hv";
  } else if (spec.tapPoint === "neutral") {
    umSystemKv = spec.tapKv;
    const lineClass = catalogueUmFromRatedKv(spec.tapKv);
    if (lineClass <= NEUTRAL_DEFAULT_UM) {
      umKv = lineClass;
      umRule = "neutral_full";
      // 2026 OS: 36 of 45 star neutrals on 30–40.5 kV windings were sold at
      // 72.5 (Russian and Turkish makers). Keep 40.5 but do not state it as settled.
      if (lineClass === 40.5) umAssumed = true;
    } else {
      umKv = NEUTRAL_DEFAULT_UM;
      umRule = "neutral_assumed";
      umAssumed = true;
    }
  } else {
    umSystemKv = spec.tapKv;
    umKv = catalogueUmFromRatedKv(spec.tapKv);
    umRule = "line";
  }
  if (!Number.isFinite(umKv) || umKv > 363) {
    return fail(
      "电压超出目录：开关最高 Um 363 kV。",
      "Voltage above the catalogue: the highest switch class is Um 363 kV.",
    );
  }
  if (spec.earthUmKv != null && spec.earthUmKv > 0) {
    umKv = spec.earthUmKv;
    umRule = "explicit";
    umAssumed = false;
  }

  if (umRule === "neutral_full" && umAssumed) {
    cautionsZh.push("35 kV 级中性点先按 Um 40.5 选；不少订单（俄罗斯、土耳其）按 72.5 买，以 OS 为准。");
    cautionsEn.push("35 kV-class neutral sized at Um 40.5; many orders (Russia, Turkey) bought 72.5. The OS decides.");
  }
  if (umRule === "neutral_assumed") {
    cautionsZh.push(`中性点绝缘未给，先按 Um ${NEUTRAL_DEFAULT_UM} 选，以 OS 为准。`);
    cautionsEn.push(`Neutral insulation not given: sized at Um ${NEUTRAL_DEFAULT_UM}; the OS decides.`);
  }
  if (auto) {
    if (spec.tapPoint === "auto_mv_line" && umRule === "auto_hv") {
      cautionsZh.push("HMR 230/121 kV 先例按厂家数据用 Um 170。");
      cautionsEn.push("HMR 230/121 kV orders used Um 170 on the maker's data.");
    } else if (spec.tapPoint === "auto_junction" && umKv === 252 && umRule === "auto_hv") {
      cautionsZh.push("先例：125 MVA 225/115/35 kV ±8×1.25% → 3×SHZVI-600/252D-10193W（2026-10-27）。");
      cautionsEn.push("Precedent: 125 MVA 225/115/35 kV ±8×1.25% → 3×SHZVI-600/252D-10193W (27 Oct 2026).");
    }
    cautionsZh.push("未核：跨调压绕组冲击（a 值）、束缚电阻。");
    cautionsEn.push("Not checked: impulse across the tap winding (a), tie-in resistor.");
  }

  return {
    ok: true,
    connection: spec.tapPoint === "neutral" ? "Y" : "D",
    umSystemKv,
    actualUmKv: iecUmFromRatedKv(umSystemKv),
    umKv,
    umRule,
    umAssumed,
    ratedA,
    maxA,
    dutyA: maxA * k,
    currentKv,
    currentDivisor,
    stepV,
    combinedOnly: auto,
    cautionsZh,
    cautionsEn,
  };
}

function fmtKv(kv: number): string {
  const r = Math.round(kv * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}
