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

/**
 * Two-winding tap point after the winding changes. Delta has no neutral, so
 * a neutral moves to the line end and `forced` remembers that the move was
 * ours. Back to star undoes it; a line end the user picked stays.
 * 2026-11-01: star neutral → delta → star used to keep the line end, and
 * 25 MVA 110 kV went from CV2III-350Y/72.5 to CV2III-350D/126 unannounced.
 */
export function tapAfterWinding(
  winding: WindingConnection,
  tapPoint: TapPoint,
  forced: boolean,
): { tapPoint: TapPoint; forced: boolean } {
  if (winding === "delta") {
    return tapPoint === "neutral"
      ? { tapPoint: "line_end", forced: true }
      : { tapPoint, forced };
  }
  return forced && tapPoint === "line_end"
    ? { tapPoint: "neutral", forced: false }
    : { tapPoint, forced: false };
}

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
  /**
   * Max through-current the OS / maker states (A). Russian OS forms stop at
   * about −5/−6% (maximum-current tapping): 63 MVA 115 kV ±9×1.78% says
   * 334 A, not the full-range 376.6 A, and Huaming sold CVIII-350Y ten
   * times (2026-11-04 audit D1). Floored at the rated current.
   */
  statedMaxA?: number;
  /**
   * Step voltage the OS / maker states (V). A floor over the derived Ust:
   * star forms often write the line value (√3 × the phase step), and an
   * autotransformer's extreme tap can sit above nominal (audit D3, D5).
   */
  statedStepV?: number;
  /**
   * Buyer's country (ISO code). Neutral insulation follows country
   * practice, not voltage: Italy buys the line class, Turkey 126 on 220 kV
   * class and above (audit UM-2). Unset = the voltage rule alone.
   */
  market?: string;
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
  /** full_range: I/(1−n·s) over the whole minus range. stated: OS Imax. */
  maxRule: "full_range" | "stated";
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
  maxRule: "full_range",
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

/**
 * Neutral of a 400 kV-class winding (line class above 363). 2026-11-04
 * audit UM-1: matched-current orders bought 126 on 11 of 13 rows (Turkey
 * BEST/ASTOR/GE/TEIAS, Portugal EFACEC); Brazil 440/500 kV bought 72.5.
 */
const NEUTRAL_400KV_UM = 126;

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
  // 2026-11-04 r3 ENGINE-8: the lowest-tap current is no longer capped at −45%.
  const minusDrop =
    spec.stepFraction != null && spec.stepFraction > 0 && spec.minusSteps > 0
      ? spec.minusSteps * spec.stepFraction
      : 0;
  if (minusDrop >= 1) {
    return fail("负分接范围 ≥ 100%。", "Minus range ≥ 100%.");
  }
  const derivedMaxA =
    spec.stepFraction != null && spec.stepFraction > 0
      ? maxThroughCurrent(ratedA, spec.minusSteps, spec.stepFraction)
      : ratedA;
  if (minusDrop > 0.45 && Number.isFinite(derivedMaxA)) {
    const pct = String(Math.round(minusDrop * 1000) / 10);
    cautionsZh.push(`负分接范围 ${pct}% 异常大：最低档电流 ${fmtA(derivedMaxA)} A，请核对 OS。`);
    cautionsEn.push(`Minus range ${pct}% is unusually large: lowest-tap current ${fmtA(derivedMaxA)} A, check the OS.`);
  }
  let maxA = derivedMaxA;
  let maxRule: DutyBasis["maxRule"] = "full_range";
  const statedMaxA = spec.statedMaxA ?? 0;
  if (statedMaxA > 0) {
    // 2026-11-04 audit D1: the maker's Imax is the highest tap current that
    // really occurs (IEC 60214-2, SelMan §1.11). Never below rated.
    maxA = Number.isFinite(ratedA) ? Math.max(ratedA, statedMaxA) : statedMaxA;
    maxRule = "stated";
    if (Number.isFinite(ratedA) && statedMaxA < ratedA - 0.05) {
      cautionsZh.push(`OS Imax ${fmtA(statedMaxA)} A 低于额定 ${fmtA(ratedA)} A：按额定电流选，请核对 OS。`);
      cautionsEn.push(`OS Imax ${fmtA(statedMaxA)} A is below the rated ${fmtA(ratedA)} A: sized on the rated current. Check the OS.`);
    } else if (Number.isFinite(derivedMaxA) && statedMaxA < 0.97 * derivedMaxA) {
      const capPct = ((1 - ratedA / statedMaxA) * 100).toFixed(1);
      cautionsZh.push(`OS Imax ${fmtA(statedMaxA)} A 低于全范围 ${fmtA(derivedMaxA)} A：厂家在 −${capPct}% 以下限电流（最大电流分接）。按 OS 值选。`);
      cautionsEn.push(`OS Imax ${fmtA(statedMaxA)} A is below the full-range ${fmtA(derivedMaxA)} A: the maker caps the current below −${capPct}% (maximum-current tapping). Sized on the OS figure.`);
    } else if (Number.isFinite(derivedMaxA) && statedMaxA > 1.25 * derivedMaxA) {
      // E-M250148: OS Imax 577 A = 2.0× rated; delta rows give the line current.
      cautionsZh.push(`OS Imax ${fmtA(statedMaxA)} A 远高于全范围 ${fmtA(derivedMaxA)} A：是线电流还是数据错误？按 OS 值选。`);
      cautionsEn.push(`OS Imax ${fmtA(statedMaxA)} A is far above the full-range ${fmtA(derivedMaxA)} A: line current or a data error? Sized on the OS figure.`);
    }
  }
  const k = spec.safetyK > 0 ? spec.safetyK : 1;
  const derivedStepV =
    spec.stepFraction != null && spec.stepFraction > 0
      ? stepBaseV * spec.stepFraction
      : null;
  let stepV = derivedStepV;
  const statedStepV = spec.statedStepV ?? 0;
  if (statedStepV > 0) {
    // 2026-11-04 audit D3: a floor, never an override. --ust 300 on a 498 V
    // job used to size at 300 V while the basis still printed 498.
    stepV = derivedStepV != null ? Math.max(derivedStepV, statedStepV) : statedStepV;
    const ratio = derivedStepV != null && derivedStepV > 0 ? statedStepV / derivedStepV : 0;
    // 60 OS rows write a star winding's Ust as √3 × the phase step.
    if ((auto || spec.winding === "star") && ratio >= 1.7 && ratio <= 1.76) {
      cautionsZh.push(`OS Ust ${Math.round(statedStepV)} V 像线电压值；实际级电压 ${Math.round(derivedStepV!)} V。按 OS 值选。`);
      cautionsEn.push(`OS Ust ${Math.round(statedStepV)} V looks like a line value; the physical step is ${Math.round(derivedStepV!)} V. Sized on the OS figure.`);
    } else if (derivedStepV != null && statedStepV < derivedStepV * 0.97) {
      // A lower stated Ust was dropped with no word (checker, track B).
      cautionsZh.push(`OS Ust ${Math.round(statedStepV)} V 低于按容量和档距算的 ${Math.round(derivedStepV)} V，按 ${Math.round(derivedStepV)} V 选。`);
      cautionsEn.push(`OS Ust ${Math.round(statedStepV)} V is below the ${Math.round(derivedStepV)} V from the rating and step. Sized on ${Math.round(derivedStepV)} V.`);
    }
  }

  // Insulation to earth.
  let umSystemKv: number;
  let umKv: number;
  let umRule: UmRule;
  let umAssumed = false;
  let neutralMarket: "IT" | "TR" | null = null;
  if (auto) {
    umSystemKv = spec.hvKv;
    umKv = catalogueUmFromRatedKv(spec.hvKv);
    umRule = "auto_hv";
    // Orders split: junction taps 252 (Vietnam 2026-10-27, HMR 230 kV) and
    // 170 (EEMC 250 MVA 225 kV, training 230/115 kV). MV-lead taps were 170
    // on all four HMR autotransformers (121 and 158 kV MV), never the HV
    // class. The maker's tap-point insulation decides, so it stays assumed.
    if (spec.tapPoint === "auto_mv_line") {
      umKv = Math.min(umKv, Math.max(catalogueUmFromRatedKv(spec.mvKv), 170));
    }
    umAssumed = true;
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
      umKv = lineClass > 363 ? NEUTRAL_400KV_UM : NEUTRAL_DEFAULT_UM;
      umRule = "neutral_assumed";
      umAssumed = true;
      const market = (spec.market ?? "").trim().toUpperCase();
      // 2026-11-04 audit UM-2, sold Um on neutrals above the 72.5 class.
      // Italy: 150 kV class 170 on 17 of 20, 220–230 kV 252 on 3 of 3; its
      // 400 kV TERNA rows bought 72.5, so above 252 the voltage rule stays.
      if (market === "IT" && lineClass <= 252) {
        umKv = lineClass === 145 ? 170 : lineClass;
        neutralMarket = "IT";
      } else if (market === "TR" && lineClass >= 252 && lineClass <= 363) {
        // Turkey 220 kV class and above: 126 ×11, 170 ×4, 72.5 ×0.
        umKv = 126;
        neutralMarket = "TR";
      }
    }
  } else {
    umSystemKv = spec.tapKv;
    umKv = catalogueUmFromRatedKv(spec.tapKv);
    umRule = "line";
  }
  // The OS / maker figure wins before the range check: a 400/220 kV auto
  // whose switch is stated at Um 252 must not be refused on the HV rule.
  if (spec.earthUmKv != null && spec.earthUmKv > 0) {
    // A line end, or an autotransformer below its MV class, cannot sit under
    // the system it is connected to. The stated class still wins; say so.
    const floor =
      umRule === "line"
        ? umKv
        : auto
          ? catalogueUmFromRatedKv(spec.mvKv)
          : 0;
    if (spec.earthUmKv < floor - 0.01) {
      cautionsZh.push(`指定 Um ${spec.earthUmKv} kV 低于该点系统 Um ${floor} kV，请核对 OS。`);
      cautionsEn.push(`Stated Um ${spec.earthUmKv} kV is below the system class Um ${floor} kV at this point. Check the OS.`);
    }
    umKv = spec.earthUmKv;
    umRule = "explicit";
    umAssumed = false;
  }
  if (auto && spec.tapPoint === "auto_junction" && umRule === "auto_hv" && umKv > 363) {
    // 2026-11-04 audit UM-4: no evidence-backed junction default above 363,
    // but the user needs the way forward, not a bare refusal.
    const mvClass = catalogueUmFromRatedKv(spec.mvKv);
    const open = [72.5, 126, 170, 252, 300, 363].filter((u) => u >= mvClass - 0.01);
    return fail(
      `自耦变高压 Um ${umKv} kV 超出目录（最高 363 kV）。请按 OS 填开关对地绝缘（CLI：--earth-um），可选 ${open.join("、")} kV。`,
      `Autotransformer HV class Um ${umKv} kV is above the catalogue (top 363 kV). Give the switch's insulation to earth from the OS (CLI: --earth-um): ${open.join(", ")} kV.`,
    );
  }
  if (!Number.isFinite(umKv) || umKv > 363) {
    return fail(
      "电压超出目录：开关最高 Um 363 kV。",
      "Voltage above the catalogue: the highest switch class is Um 363 kV.",
    );
  }

  if (umRule === "neutral_full" && umAssumed) {
    // 2026-11-04 audit UM-5: Turkey's 72.5 orders were CM/CM2/SHZV, whose
    // lowest class is 72.5. Where a 40.5 type existed, Russia split 19/17.
    cautionsZh.push("35 kV 级中性点先按 Um 40.5 kV 选；俄罗斯/独联体客户在 CV/SV 上约一半买 72.5，以 OS 为准。CM/CM2/SHZV 最低就是 72.5。");
    cautionsEn.push("35 kV-class neutral sized at Um 40.5 kV; Russian/CIS buyers chose 72.5 on about half of CV/SV orders; the OS decides. CM/CM2/SHZV start at 72.5.");
  }
  if (umRule === "neutral_assumed") {
    if (neutralMarket === "IT") {
      cautionsZh.push(`意大利中性点先按线端等级 Um ${umKv} kV 选（TERNA/GETRA 250 MVA 订单买 72.5），以 OS 为准。`);
      cautionsEn.push(`Italy: neutral sized at the line class, Um ${umKv} kV (TERNA/GETRA 250 MVA orders bought 72.5); the OS decides.`);
    } else if (neutralMarket === "TR") {
      cautionsZh.push(`土耳其 220 kV 级及以上中性点先按 Um ${umKv} kV 选（订单 126 ×11、170 ×4、72.5 ×0），以 OS 为准。`);
      cautionsEn.push(`Turkey: 220 kV-class and above neutral sized at Um ${umKv} kV (orders 126 ×11, 170 ×4, 72.5 ×0); the OS decides.`);
    } else if (umKv === NEUTRAL_400KV_UM) {
      cautionsZh.push(`400 kV 级绕组中性点先按 Um ${umKv} kV 选（土耳其、葡萄牙订单买 126；巴西 440/500 kV 买 72.5），以 OS 为准。`);
      cautionsEn.push(`Neutral of a 400 kV-class winding sized at Um ${umKv} kV (Turkey and Portugal orders bought 126; Brazil 440/500 kV bought 72.5); the OS decides.`);
    } else {
      cautionsZh.push(`中性点绝缘未给，先按 Um ${umKv} kV 选，以 OS 为准。`);
      cautionsEn.push(`Neutral insulation not given: sized at Um ${umKv} kV; the OS decides.`);
    }
  }
  // 2025–2026 OS: 67 tapped windings on 220 kV class and above, every one
  // CM / CM2 / SHZV, none compound. CV2's 200 kV across-tap limit does not
  // cover a 220 kV regulating winding, neutral end included.
  const highWinding = !auto && catalogueUmFromRatedKv(spec.tapKv) >= 252;
  if (highWinding) {
    cautionsZh.push("220 kV 级及以上调压绕组只用组合式（2025–2026 订单无复合式）。");
    cautionsEn.push("220 kV-class tapped winding: combined types only (no compound in 2025–2026 orders).");
  }
  if (auto) {
    if (spec.tapPoint === "auto_mv_line" && umRule === "auto_hv") {
      // 2026-11-04 audit UM-4: the HMR note printed on 400/220 at Um 252.
      if (umKv === 170) {
        cautionsZh.push("HMR 230/121 kV 先例按厂家数据用 Um 170 kV。");
        cautionsEn.push("HMR 230/121 kV orders used Um 170 kV on the maker's data.");
      } else {
        cautionsZh.push(`中压出线先按中压等级 Um ${umKv} kV 选，以 OS 为准。`);
        cautionsEn.push(`MV line lead sized at the MV class, Um ${umKv} kV; the OS decides.`);
      }
    } else if (spec.tapPoint === "auto_junction" && umKv === 252 && umRule === "auto_hv") {
      cautionsZh.push("先例：125 MVA 225/115/35 kV ±8×1.25% → 3×SHZVI-600/252D-10193W（2026-10-27）。");
      cautionsEn.push("Precedent: 125 MVA 225/115/35 kV ±8×1.25% → 3×SHZVI-600/252D-10193W (27 Oct 2026).");
    }
    cautionsZh.push("自耦变只用组合式（复合式跨调压绕组冲击上限 200 kV）。");
    cautionsEn.push("Autotransformer: combined types only (compound types stop at 200 kV across the tap winding).");
    cautionsZh.push("未核：跨调压绕组冲击（a 值）、束缚电阻。");
    cautionsEn.push("Not checked: impulse across the tap winding (a), tie-in resistor.");
    // 2026-11-04 audit D5 (IEC 60214-2 §7.2.1.4.2): HMR MV-line OS Ust ran
    // −3.6…+5.7% around nominal. A stated Ust is the floor; else say so.
    if (!(statedStepV > 0 && statedStepV >= (derivedStepV ?? 0) - 0.5)) {
      cautionsZh.push("变磁通：各档 Ust 和电流不同，极限档 Ust 未校验。请向厂家要分接表。");
      cautionsEn.push("Variable flux: Ust and current differ per tap; Ust at the extreme tap is not checked. Get the maker's per-tap table.");
    }
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
    maxRule,
    dutyA: maxA * k,
    currentKv,
    currentDivisor,
    stepV,
    combinedOnly: auto || highWinding,
    cautionsZh,
    cautionsEn,
  };
}

/**
 * Um classes the switch could take when the tender has not fixed it, lowest
 * first. Empty when the rule is settled (line end, or a stated Um).
 * 2025–2026 OS star points above 110 kV sold 72.5 / 126 / 170 / 252, and the
 * one Colin autotransformer took 252 where IEC 60214-2 and the selecting
 * manual start from the MV class. Showing the type for each class turns the
 * assumption into a choice the OEM makes from its own insulation table.
 */
export function umChoices(d: DutyBasis, spec: TransformerSpec): number[] {
  if (!d.ok || d.umRule === "explicit") return [];
  const ladder = [40.5, 72.5, 126, 170, 252, 300, 363];
  if (d.umRule === "neutral_assumed" || (d.umRule === "neutral_full" && d.umAssumed)) {
    // 35 kV-class neutrals: many orders bought 72.5, so offer it too. An
    // assumed 126/170/252 (400 kV class, market) still offers 72.5: Brazil
    // and TERNA bought it (2026-11-04 audit UM-1/UM-2).
    const top = Math.max(catalogueUmFromRatedKv(spec.tapKv), NEUTRAL_DEFAULT_UM);
    const low = Math.min(d.umKv, NEUTRAL_DEFAULT_UM);
    return ladder.filter((u) => u >= low - 0.01 && u <= top + 0.01);
  }
  if (d.umRule === "auto_hv") {
    if (spec.tapPoint === "auto_mv_line") {
      const hv = catalogueUmFromRatedKv(spec.hvKv);
      const mv = catalogueUmFromRatedKv(spec.mvKv);
      return ladder.filter((u) => u >= mv - 0.01 && u <= Math.min(hv, 363) + 0.01);
    }
    const floor = catalogueUmFromRatedKv(spec.mvKv);
    return ladder.filter((u) => u >= floor - 0.01 && u <= d.umKv + 0.01);
  }
  return [];
}

function fmtA(a: number): string {
  return (Math.round(a * 10) / 10).toFixed(1);
}

function fmtKv(kv: number): string {
  const r = Math.round(kv * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}
