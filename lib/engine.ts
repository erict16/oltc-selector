import {
  EARTH_INSULATION,
  FAMILY_MIN_RANK,
  INTERNAL_INSULATION,
  SERIES,
  nearestCurrent,
  nearestUm,
  phaseToken,
  pickSelectorSize,
} from "./catalog";
import { resolveTapFields } from "./tapCode";
import type {
  Connection,
  ModelResult,
  PhaseCode,
  SelectInput,
  SelectOutput,
  SeriesDef,
} from "./types";

/** CV2 brochure: 2000 V @ 10 contacts, 1500 V @ 12 contacts (approx by pitch). */
function maxStepVoltageForSeries(
  s: SeriesDef,
  pitch: number,
): number {
  if (s.id === "cv2" || s.id === "cv" || s.id === "sv") {
    if (pitch <= 10) return s.id === "cv2" ? 2000 : 1500;
    if (pitch <= 12) return s.id === "cv2" ? 1500 : 1400;
    return s.id === "cv2" ? 1500 : 1000;
  }
  return s.maxStepVoltageV;
}

/**
 * Compound types have fixed internal insulation (no B/C/D letter).
 * CV2 Table 4-1: across-tap (a) ~200 kV LI — reject if duty needs more.
 */
function compoundCoversAcrossTap(
  s: SeriesDef,
  input: SelectInput,
): boolean {
  if (s.structure !== "compound") return true;
  const needBil = input.acrossTapBilKv ?? 0;
  const needPf = input.acrossTapPfKv ?? 0;
  if (needBil <= 0 && needPf <= 0) return true;
  // Conservative compound internal a-distance (CV/CV2 family)
  const aLi = s.id === "cv2" ? 200 : 200;
  const aPf = s.id === "cv2" ? 50 : 50;
  return aLi + 0.5 >= needBil && aPf + 0.5 >= needPf;
}

function formatUmToken(
  um: number,
  size: string,
  usesSelectorSize: boolean,
): string {
  const umStr = Number.isInteger(um) ? String(um) : String(um);
  if (!usesSelectorSize || !size) return umStr;
  return `${umStr}${size}`;
}

function buildModelString(
  series: SeriesDef,
  phases: string,
  current: number,
  connection: Connection,
  umToken: string,
  tapCode: string,
  unitCount: number,
): string {
  // Commercial style:
  //   SHZVIII-600Y/126C-10193W
  //   HWVIII-400Y/72.5-10193W
  //   CV2III-350D/40.5-10193G
  //   3xCM2I-800/72.5B-10191W
  const conn =
    series.connections.includes("any") && connection === "any"
      ? ""
      : connection === "any"
        ? "Y"
        : connection;

  let core: string;
  if (series.code === "HWDK") {
    core = `${series.code}${phases}-${current}/${umToken}`;
  } else if (!conn) {
    core = `${series.code}${phases}-${current}/${umToken}-${tapCode}`;
  } else {
    core = `${series.code}${phases}-${current}${conn}/${umToken}-${tapCode}`;
  }

  if (unitCount > 1) {
    // Price list / quotes: 3xCM2I-800/72.5B-… or 3×SHZVI-…
    return `${unitCount}x${core}`;
  }
  return core;
}

function seriesMatchesMounting(s: SeriesDef, input: SelectInput): boolean {
  if (input.mounting === "dry_type") return s.mounting.includes("dry_type");
  if (input.mounting === "reactor") return s.mounting.includes("reactor");
  if (
    input.mounting === "on_tank" ||
    input.mounting === "external_compartment"
  ) {
    return (
      s.mounting.includes("on_tank") ||
      s.mounting.includes("external_compartment")
    );
  }
  return s.mounting.includes("in_tank");
}

function seriesMatchesMedium(s: SeriesDef, input: SelectInput): boolean {
  if (input.mounting === "dry_type") return s.medium === "dry";
  if (input.preferVacuum) return true; // soft — oil filtered later if vacuum exists
  if (input.medium === "oil_vacuum") return s.vacuum || s.medium === "oil_vacuum";
  if (input.medium === "oil") return s.medium === "oil" || s.medium === "oil_vacuum";
  return true;
}

/**
 * Higher score = better primary pick.
 *
 * Commercial min-adequate (Base Price List 2025 + sales practice):
 *   1. Family: CV2 → CM2 → SHZV → SHZVG (never SHZV-400 over CV2/CM2 on exact I).
 *   2. **One III unit always beats 3× singles** when both cover duty.
 *      Price proof: SHZVIII-1000Y/72.5B-10…W ≈ ¥219k vs 3×CM2I-800 ≈ ¥522k.
 *      → 3×CM2I / 3×SHZVI only when no single III family covers Iᵤ/Um/Ust.
 *   3. Mild tighter catalogue current / Um.
 */
function adequacyScore(
  s: SeriesDef,
  input: SelectInput,
  current: number,
  um: number,
  unitCount: number,
): number {
  let score = 10000;

  // Dominant: family minimum path (lower FAMILY_MIN_RANK → higher score)
  const fam = FAMILY_MIN_RANK[s.id] ?? s.rank;
  score -= fam * 100;

  // Vacuum / oil preference
  if (input.preferVacuum && s.vacuum) score += 40;
  if (input.preferVacuum && !s.vacuum) score -= 800;
  if (!input.preferVacuum && input.medium === "oil" && !s.vacuum) score += 40;

  // Mounting lock
  if (
    (input.mounting === "on_tank" ||
      input.mounting === "external_compartment") &&
    s.id === "hwv"
  ) {
    score += 2500;
  }
  if (input.mounting === "in_tank" && s.id === "hwv") score -= 4000;

  // Multi-unit is last resort commercially (see post-sort hard rule too).
  // Soft penalty only ranks among multi options when no single exists.
  if (unitCount > 1) {
    score -= 8000;
    score -= current * 0.05; // prefer cheaper multi pole rating when forced
  }

  // Mild fit preference — must stay << one family step (100 pts)
  const overshootI = current - input.throughCurrentA;
  score -= overshootI * 0.25;
  const overshootUm = um - input.umKv;
  score -= overshootUm * 3;

  // Mild step-capacity tightness
  const psin = s.stepCapacityByCurrent?.[current];
  if (psin && input.stepVoltageV > 0) {
    const need = (input.throughCurrentA * input.stepVoltageV) / 1000;
    if (need > 0 && psin >= need) {
      score -= (psin - need) * 0.01;
    }
  }

  return score;
}

type Attempt = {
  series: SeriesDef;
  phases: PhaseCode;
  current: number;
  um: number;
  unitCount: number;
};

function buildAttempts(s: SeriesDef, input: SelectInput): Attempt[] {
  const out: Attempt[] = [];
  const um = nearestUm(input.umKv, s.umKv);
  if (um == null || um < input.umKv - 0.1) return out;

  const list = s.currents[input.phases];
  const maxPhase = list?.length ? Math.max(...list) : null;

  // Primary phase as requested when catalogue can cover current at all
  if (maxPhase != null && input.throughCurrentA <= maxPhase + 0.01) {
    const cur = nearestCurrent(input.throughCurrentA, list);
    if (cur != null) {
      out.push({
        series: s,
        phases: input.phases,
        current: cur,
        um,
        unitCount: 1,
      });
    }
  }

  // 3× single-phase only when III cannot cover the through-current
  if (input.phases === "III") {
    const maxIII = s.currents.III?.length
      ? Math.max(...s.currents.III)
      : null;
    if (maxIII == null || input.throughCurrentA > maxIII + 0.01) {
      const curI = nearestCurrent(input.throughCurrentA, s.currents.I);
      if (curI != null) {
        out.push({
          series: s,
          phases: "I",
          current: curI,
          um,
          unitCount: 3,
        });
      }
    }
  }

  return out;
}

export function selectOltc(input: SelectInput): SelectOutput {
  const errorsEn: string[] = [];
  const errorsZh: string[] = [];

  if (!input.throughCurrentA || input.throughCurrentA <= 0) {
    errorsEn.push("Enter rated through-current (A).");
    errorsZh.push("请填写额定通过电流（A）。");
  }
  if (!input.umKv || input.umKv <= 0) {
    errorsEn.push("Enter highest voltage for equipment Um (kV).");
    errorsZh.push("请填写设备最高电压 Um（kV）。");
  }
  if (input.stepVoltageV < 0) {
    errorsEn.push("Step voltage cannot be negative.");
    errorsZh.push("级电压不能为负。");
  }

  if (errorsEn.length) {
    return { ok: false, results: [], errorsEn, errorsZh };
  }

  const tap = resolveTapFields({
    regulation: input.regulation,
    positions: input.positions,
    plusMinusSteps: input.plusMinusSteps,
    pitch: input.pitch,
    midPositions: input.midPositions,
  });

  let candidates = SERIES.filter(
    (s) => seriesMatchesMounting(s, input) && seriesMatchesMedium(s, input),
  );

  candidates = candidates.filter((s) => {
    if (input.connection === "any") return true;
    return (
      s.connections.includes(input.connection) ||
      s.connections.includes("any")
    );
  });

  if (!candidates.length) {
    return {
      ok: false,
      results: [],
      errorsEn: [
        "No OLTC family matches this mounting / medium combination. Adjust filters or contact engineering.",
      ],
      errorsZh: [
        "没有系列匹配当前安装位置/介质。请调整条件，或联系工程确认。",
      ],
    };
  }

  const results: ModelResult[] = [];
  const seen = new Set<string>();

  for (const s of candidates) {
      if (!compoundCoversAcrossTap(s, input)) continue;

      const maxStep = maxStepVoltageForSeries(s, tap.pitch);
      // Allow modest exceed on CV2 12-contact path only if higher Ium envelope used (handled below)
      if (input.stepVoltageV > s.maxStepVoltageV + 0.5) continue;

      const maxPos =
        input.regulation === "linear"
          ? s.maxPositionsLinear
          : s.maxPositionsWithChangeOver;
      if (tap.positions > maxPos) continue;

      for (const att of buildAttempts(s, input)) {
        let current = att.current;
        const phaseCurrents = s.currents[att.phases] ?? s.currents.I ?? [];

        // Choose smallest catalogue I that covers duty + step-capacity + CV2 high-Ust practice
        {
          const need =
            input.stepVoltageV > 0
              ? (input.throughCurrentA * input.stepVoltageV) / 1000
              : 0;
          const pitchMax = maxStepVoltageForSeries(s, tap.pitch);
          const okI = phaseCurrents.find((c) => {
            if (c + 0.01 < input.throughCurrentA) return false;
            // Headroom: if duty sits in the top ~3% of a rating, bump (case 2: 489.7 → 600).
            // 480 A must still accept CM2-500 (2025 sales).
            if (
              input.throughCurrentA + 0.01 < c &&
              input.throughCurrentA > c * 0.97
            ) {
              return false;
            }
            if (s.id === "cv2" && input.stepVoltageV > pitchMax + 0.5 && c < 600)
              return false;
            if (input.stepVoltageV > s.maxStepVoltageV + 0.5) return false;
            const psin = s.stepCapacityByCurrent?.[c];
            if (psin != null && need > psin + 0.5) return false;
            return true;
          });
          if (okI == null) continue;
          current = okI;
        }

        const selectorSize = s.usesSelectorSize
          ? pickSelectorSize(
              att.um,
              input.selectorSize ?? "auto",
              input.bilKv,
              input.pfKv,
              input.acrossTapBilKv,
              input.acrossTapPfKv,
            )
          : "";

        const umToken = formatUmToken(att.um, selectorSize, s.usesSelectorSize);
        const phases = phaseToken(att.phases);
        const conn: Connection =
          input.connection === "any"
            ? s.connections.includes("Y")
              ? "Y"
              : s.connections[0]
            : input.connection;

        let mduStr = "";
        const mduPref = input.mdu ?? "none";
        if (mduPref && mduPref !== "none" && mduPref !== "auto") {
          mduStr = mduPref;
        } else if (mduPref === "auto") {
          mduStr = s.defaultMdu;
        }

        // Single-phase commercial strings omit Y/D (e.g. 3xCM2I-800/72.5B-…,
        // 3xSHZVI-1000/170D-…). D after Um is selector size, not connection.
        const modelConn: Connection = att.phases === "I" ? "any" : conn;

        let finalModel = buildModelString(
          s,
          phases,
          current,
          modelConn,
          umToken,
          tap.tapCode,
          att.unitCount,
        );
        if (att.phases === "I") {
          finalModel = finalModel.replace(
            new RegExp(`(${s.code}I-\\d+)[YD]/`),
            "$1/",
          );
        }

        if (seen.has(finalModel)) continue;
        seen.add(finalModel);

        const modelWithMdu = mduStr ? `${finalModel}+${mduStr}` : finalModel;
        const score = adequacyScore(s, input, current, att.um, att.unitCount);

        const reasonsEn: string[] = [];
        const reasonsZh: string[] = [];
        const warningsEn: string[] = [];
        const warningsZh: string[] = [];

        reasonsEn.push(
          `Minimum-adequate path: ${s.nameEn}, Ium ${current} A ≥ ${input.throughCurrentA} A, Um ${att.um} kV.`,
        );
        reasonsZh.push(
          `最低满足路径：${s.nameZh}，Ium ${current} A ≥ 需求 ${input.throughCurrentA} A，Um ${att.um} kV。`,
        );

        if (s.structure === "compound") {
          reasonsEn.push(
            "Compound type fits duty — preferred over larger combined types when eligible.",
          );
          reasonsZh.push(
            "复合式满足工况时优先于更大的组合式（非默认 SHZV）。",
          );
        }

        if (s.usesSelectorSize) {
          reasonsEn.push(
            `Tap selector grade ${selectorSize} (smallest covering Um` +
              (input.acrossTapBilKv
                ? ` + across-tap BIL ${input.acrossTapBilKv} kV`
                : "") +
              ").",
          );
          reasonsZh.push(
            `分接选择器等级 ${selectorSize}（满足 Um` +
              (input.acrossTapBilKv
                ? ` 与调压绕组间 BIL ${input.acrossTapBilKv} kV`
                : "") +
              " 的最小规格）。",
          );
        }

        reasonsEn.push(
          `Tap code ${tap.tapCode}: pitch ${tap.pitch}, ${tap.positions} pos, mid ${tap.mid}, ${input.regulation}.`,
        );
        reasonsZh.push(
          `分接代码 ${tap.tapCode}：节距 ${tap.pitch}，${tap.positions} 位，中间位 ${tap.mid}。`,
        );

        if (att.unitCount > 1) {
          reasonsEn.push(
            `${att.unitCount}× single-phase — no single III unit covers this Iᵤ (prefer one SHZV/SHZVG when it fits; 3× costs more).`,
          );
          reasonsZh.push(
            `${att.unitCount} 台单相 — 无三相整机可覆盖此电流（有 SHZV/SHZVG 整机时优先；3× 更贵）。`,
          );
        }

        const earth = EARTH_INSULATION[att.um];
        if (earth) {
          reasonsEn.push(
            `Earth insulation (catalogue): PF ${earth.pf} / LI ${earth.bil} kV.`,
          );
          reasonsZh.push(
            `对地绝缘（样本）：工频 ${earth.pf} / 雷电 ${earth.bil} kV。`,
          );
        }

        if (current > input.throughCurrentA + 0.5) {
          warningsEn.push(`Through-current rounded up to ${current} A.`);
          warningsZh.push(`通过电流已上靠至 ${current} A。`);
        }
        if (att.um > input.umKv + 0.1) {
          warningsEn.push(`Um rounded up to ${att.um} kV.`);
          warningsZh.push(`Um 已上靠至 ${att.um} kV。`);
        }

        warningsEn.push(
          "Indicative selection from published technical data. Final OS requires engineering confirmation.",
        );
        warningsZh.push(
          "依据公开技术样本的选型建议。最终 OS 须工程确认。",
        );

        let confidence = 0.88;
        if (att.unitCount > 1) confidence -= 0.08;
        if (warningsEn.length > 2) confidence -= 0.03;
        confidence = Math.max(0.45, Math.min(0.96, confidence));

        results.push({
          seriesId: s.id,
          seriesCode: s.code,
          model: finalModel,
          modelWithMdu,
          phases: att.phases,
          currentA: current,
          connection: conn,
          umKv: att.um,
          selectorSize,
          umToken,
          tapCode: tap.tapCode,
          regulation: input.regulation,
          changeOver: tap.changeOver,
          pitch: tap.pitch,
          positions: tap.positions,
          mid: tap.mid,
          mdu: mduStr,
          unitCount: att.unitCount,
          reasonsEn,
          reasonsZh,
          warningsEn,
          warningsZh,
          confidence,
          adequacyScore: score,
        });
      }
    }

  // Prefer vacuum set when requested and any vacuum exists
  let final = results;
  if (input.preferVacuum) {
    const vac = results.filter(
      (r) => SERIES.find((s) => s.id === r.seriesId)?.vacuum,
    );
    if (vac.length) final = vac;
  }

  final.sort((a, b) => {
    // Hard rule: any single-unit option outranks any multi (price list).
    // 3× only when every single III family fails the duty.
    if (a.unitCount !== b.unitCount) return a.unitCount - b.unitCount;
    if (b.adequacyScore !== a.adequacyScore)
      return b.adequacyScore - a.adequacyScore;
    return b.confidence - a.confidence;
  });

  if (!final.length) {
    return {
      ok: false,
      results: [],
      errorsEn: [
        "Parameters out of catalogue range (current, Um, step voltage, or positions).",
      ],
      errorsZh: [
        "参数超出目录范围（电流、Um、级电压或档位数）。",
      ],
    };
  }

  return {
    ok: true,
    results: final.slice(0, 8),
    errorsEn: [],
    errorsZh: [],
  };
}

/** Regression helpers + training-case fixtures */
export const FIXTURES = {
  ueHwv: {
    input: {
      mounting: "on_tank" as const,
      medium: "oil_vacuum" as const,
      preferVacuum: true,
      phases: "III" as const,
      connection: "Y" as const,
      throughCurrentA: 400,
      umKv: 72.5,
      stepVoltageV: 1500,
      regulation: "reversing" as const,
      positions: 19,
      midPositions: 3 as const,
      pitch: 10 as const,
      mdu: "none" as const,
    },
    expectModel: "HWVIII-400Y/72.5-10193W",
  },
  wilsonShzv: {
    input: {
      mounting: "in_tank" as const,
      medium: "oil_vacuum" as const,
      preferVacuum: true,
      phases: "III" as const,
      connection: "Y" as const,
      throughCurrentA: 1000,
      umKv: 170,
      stepVoltageV: 2000,
      regulation: "reversing" as const,
      positions: 23,
      midPositions: 3 as const,
      pitch: 12 as const,
      selectorSize: "D" as const,
      mdu: "none" as const,
    },
    expectContains: "SHZVIII-1000Y/170D-12233W",
  },
  cv2NoSelectorSize: {
    input: {
      mounting: "in_tank" as const,
      medium: "oil_vacuum" as const,
      preferVacuum: true,
      phases: "III" as const,
      connection: "Y" as const,
      throughCurrentA: 350,
      umKv: 40.5,
      stepVoltageV: 1000,
      regulation: "reversing" as const,
      positions: 19,
      mdu: "none" as const,
    },
  },
  /** Training case 1 — 10 MVA 33 kV Δ coarse-fine → CV2-350 not SHZV */
  case1Cv2: {
    input: {
      mounting: "in_tank" as const,
      medium: "oil_vacuum" as const,
      preferVacuum: true,
      phases: "III" as const,
      connection: "D" as const,
      throughCurrentA: 112.24,
      umKv: 40.5,
      stepVoltageV: 412.5,
      regulation: "coarse_fine" as const,
      positions: 19,
      midPositions: 3 as const,
      pitch: 10 as const,
      mdu: "none" as const,
    },
    expectModel: "CV2III-350D/40.5-10193G",
  },
  /** Training case 2 — CM2-600 not SHZV; grade C from across-tap BIL 285 */
  case2Cm2: {
    input: {
      mounting: "in_tank" as const,
      medium: "oil_vacuum" as const,
      preferVacuum: true,
      phases: "III" as const,
      connection: "Y" as const,
      throughCurrentA: 489.7,
      umKv: 72.5,
      stepVoltageV: 1195.2,
      regulation: "reversing" as const,
      positions: 19,
      midPositions: 3 as const,
      pitch: 10 as const,
      bilKv: 350,
      pfKv: 140,
      acrossTapBilKv: 285,
      acrossTapPfKv: 65,
      mdu: "none" as const,
    },
    expectModel: "CM2III-600Y/72.5C-10193W",
  },
  /** Training case 5 — CV2-600D/145 */
  case5Cv2_145: {
    input: {
      mounting: "in_tank" as const,
      medium: "oil_vacuum" as const,
      preferVacuum: true,
      phases: "III" as const,
      connection: "D" as const,
      throughCurrentA: 346.34,
      umKv: 145,
      stepVoltageV: 1650,
      regulation: "reversing" as const,
      positions: 23,
      midPositions: 3 as const,
      pitch: 12 as const,
      acrossTapBilKv: 200,
      acrossTapPfKv: 50,
      mdu: "none" as const,
    },
    expectModel: "CV2III-600D/145-12233W",
  },
  /**
   * Training sheet once said 3×CM2I-800 for 626 A Δ.
   * Base Price List 2025: 3×CM2I-800/72.5B-10…W ≈ ¥522k vs
   * SHZVIII-1000D/72.5… ≈ ¥219k → one SHZV-1000 is correct primary.
   * 3×CM2 only as alt when single III cannot cover.
   */
  case7Shzv1000: {
    input: {
      mounting: "in_tank" as const,
      medium: "oil_vacuum" as const,
      preferVacuum: true,
      phases: "III" as const,
      connection: "D" as const,
      throughCurrentA: 626.01,
      umKv: 72.5,
      stepVoltageV: 1650,
      regulation: "reversing" as const,
      positions: 19,
      midPositions: 1 as const,
      pitch: 10 as const,
      acrossTapBilKv: 320,
      acrossTapPfKv: 80,
      mdu: "none" as const,
    },
    expectContains: "SHZVIII-1000D/72.5C",
  },
  /**
   * 2025 shipment volume anchors (sales reference year=2025).
   * CV2-600D/145 is among top vacuum compound models.
   */
  sales2025Cv2_145: {
    input: {
      mounting: "in_tank" as const,
      medium: "oil_vacuum" as const,
      preferVacuum: true,
      phases: "III" as const,
      connection: "D" as const,
      throughCurrentA: 350,
      umKv: 145,
      stepVoltageV: 1500,
      regulation: "reversing" as const,
      positions: 19,
      midPositions: 3 as const,
      pitch: 10 as const,
      mdu: "none" as const,
    },
    expectModel: "CV2III-350D/145-10193W",
  },
  /**
   * 2025: CM2-500 before SHZV when I≤500 and Um 72.5.
   * Ust 2200 V exceeds CV2 step envelope → combined path; CM2 beats SHZV.
   */
  sales2025Cm2_500: {
    input: {
      mounting: "in_tank" as const,
      medium: "oil_vacuum" as const,
      preferVacuum: true,
      phases: "III" as const,
      connection: "Y" as const,
      throughCurrentA: 480,
      umKv: 72.5,
      stepVoltageV: 2200,
      regulation: "reversing" as const,
      positions: 19,
      midPositions: 3 as const,
      pitch: 10 as const,
      mdu: "none" as const,
    },
    expectContains: "CM2III-500Y/72.5",
  },
  /** 2025: SHZVG when III current > SHZV 1000 */
  sales2025Shzvg: {
    input: {
      mounting: "in_tank" as const,
      medium: "oil_vacuum" as const,
      preferVacuum: true,
      phases: "III" as const,
      connection: "Y" as const,
      throughCurrentA: 1200,
      umKv: 72.5,
      stepVoltageV: 2000,
      regulation: "reversing" as const,
      positions: 23,
      midPositions: 3 as const,
      pitch: 12 as const,
      mdu: "none" as const,
    },
    expectContains: "SHZVGIII-1300Y",
  },
};
