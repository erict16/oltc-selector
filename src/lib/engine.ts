import {
  EARTH_INSULATION,
  SERIES,
  nearestCurrent,
  nearestUm,
  phaseToken,
  pickSelectorSize,
} from "./catalog";
import { resolveTapFields } from "./tapCode";
import type {
  ModelResult,
  SelectInput,
  SelectOutput,
  SeriesDef,
  Connection,
} from "./types";

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
): string {
  // Commercial style used on quotes:
  //   SHZVIII-600Y/126C-10193W
  //   HWVIII-400Y/72.5-10193W
  //   CV2III-350D/40.5-10193W
  const conn =
    series.connections.includes("any") && connection === "any"
      ? ""
      : connection === "any"
        ? "Y"
        : connection;

  if (series.code === "HWDK") {
    // HWDKIII-1500/35
    return `${series.code}${phases}-${current}/${umToken}`;
  }

  if (!conn) {
    return `${series.code}${phases}-${current}/${umToken}-${tapCode}`;
  }
  return `${series.code}${phases}-${current}${conn}/${umToken}-${tapCode}`;
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
  // in_tank
  return s.mounting.includes("in_tank");
}

function seriesMatchesMedium(s: SeriesDef, input: SelectInput): boolean {
  if (input.mounting === "dry_type") return s.medium === "dry";
  if (input.preferVacuum) {
    // allow oil only if no vacuum alternative later — filter soft
    return true;
  }
  if (input.medium === "oil_vacuum") return s.vacuum || s.medium === "oil_vacuum";
  if (input.medium === "oil") return s.medium === "oil" || s.medium === "oil_vacuum";
  return true;
}

function scoreSeries(s: SeriesDef, input: SelectInput): number {
  let score = 100 - s.rank;
  if (input.preferVacuum && s.vacuum) score += 30;
  if (input.preferVacuum && !s.vacuum) score -= 40;
  if (input.medium === "oil_vacuum" && s.vacuum) score += 15;
  if (input.medium === "oil" && !s.vacuum) score += 10;
  if (
    (input.mounting === "on_tank" ||
      input.mounting === "external_compartment") &&
    s.id === "hwv"
  ) {
    score += 50;
  }
  if (input.mounting === "in_tank" && s.id === "shzv" && input.preferVacuum) {
    score += 20;
  }
  // step voltage fit
  if (input.stepVoltageV > s.maxStepVoltageV) score -= 1000;
  return score;
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

  // connection filter
  candidates = candidates.filter((s) => {
    if (input.connection === "any") return true;
    return (
      s.connections.includes(input.connection) ||
      s.connections.includes("any")
    );
  });

  // phase availability
  candidates = candidates.filter((s) => {
    const curr = s.currents[input.phases];
    return curr && curr.length > 0;
  });

  if (!candidates.length) {
    return {
      ok: false,
      results: [],
      errorsEn: [
        "No OLTC family matches this mounting / medium / phase combination. Adjust application filters or contact Huaming engineering.",
      ],
      errorsZh: [
        "没有系列匹配当前安装位置/介质/相数。请调整应用条件，或联系华明工程。",
      ],
    };
  }

  const results: ModelResult[] = [];

  for (const s of candidates) {
    if (input.stepVoltageV > s.maxStepVoltageV + 0.5) continue;

    const um = nearestUm(input.umKv, s.umKv);
    if (um == null) continue;
    // Don't down-rate more than one step silently for much higher request
    if (um < input.umKv - 0.1) {
      // still allow but warn
    }

    const current = nearestCurrent(input.throughCurrentA, s.currents[input.phases]);
    if (current == null) continue;

    // positions limit
    const maxPos =
      input.regulation === "linear"
        ? s.maxPositionsLinear
        : s.maxPositionsWithChangeOver;
    if (tap.positions > maxPos) continue;

    const selectorSize = s.usesSelectorSize
      ? pickSelectorSize(
          um,
          input.selectorSize ?? "auto",
          input.bilKv,
          input.pfKv,
        )
      : "";

    const umToken = formatUmToken(um, selectorSize, s.usesSelectorSize);
    const phases = phaseToken(input.phases);
    const conn: Connection =
      input.connection === "any"
        ? s.connections.includes("Y")
          ? "Y"
          : s.connections[0]
        : input.connection;

    let mduStr = "";
    const mduPref = input.mdu ?? "auto";
    if (mduPref === "none") {
      mduStr = "";
    } else if (mduPref === "auto" || !mduPref) {
      mduStr = s.id === "hwv" ? "CMA7" : s.defaultMdu;
    } else {
      mduStr = mduPref;
    }

    const model = buildModelString(
      s,
      phases,
      current,
      conn,
      umToken,
      tap.tapCode,
    );
    const modelWithMdu = mduStr ? `${model}+${mduStr}` : model;

    const reasonsEn: string[] = [];
    const reasonsZh: string[] = [];
    const warningsEn: string[] = [];
    const warningsZh: string[] = [];

    reasonsEn.push(
      `${s.nameEn}: Um ${um} kV, Ium ${current} A ≥ ${input.throughCurrentA} A.`,
    );
    reasonsZh.push(
      `${s.nameZh}：Um ${um} kV，Ium ${current} A ≥ 需求 ${input.throughCurrentA} A。`,
    );

    if (s.usesSelectorSize) {
      reasonsEn.push(
        `Tap selector insulation grade ${selectorSize} (size) selected for Um ${um} kV.`,
      );
      reasonsZh.push(
        `按 Um ${um} kV 选定分接选择器绝缘等级 ${selectorSize}。`,
      );
    }

    reasonsEn.push(
      `Tap code ${tap.tapCode}: pitch ${tap.pitch}, ${tap.positions} positions, mid ${tap.mid}, ${input.regulation}.`,
    );
    reasonsZh.push(
      `分接代码 ${tap.tapCode}：节距 ${tap.pitch}，${tap.positions} 个工作位置，中间位 ${tap.mid}，调压方式 ${input.regulation}。`,
    );

    const earth = EARTH_INSULATION[um];
    if (earth) {
      reasonsEn.push(
        `Insulation to earth (catalogue): PF ${earth.pf} kV / LI ${earth.bil} kV.`,
      );
      reasonsZh.push(
        `对地绝缘（样本）：工频 ${earth.pf} kV / 雷电冲击 ${earth.bil} kV。`,
      );
    }

    if (current > input.throughCurrentA + 0.5) {
      warningsEn.push(
        `Rounded up through-current to next catalogue rating ${current} A.`,
      );
      warningsZh.push(`通过电流已上靠至目录额定 ${current} A。`);
    }
    if (um > input.umKv + 0.1) {
      warningsEn.push(`Rounded up Um to next catalogue level ${um} kV.`);
      warningsZh.push(`Um 已上靠至目录电压 ${um} kV。`);
    }
    if (um < input.umKv - 0.1) {
      warningsEn.push(
        `Requested Um ${input.umKv} kV exceeds this family's max ${um} kV — not a valid match.`,
      );
      warningsZh.push(
        `需求 Um ${input.umKv} kV 超过该系列最高 ${um} kV — 不推荐。`,
      );
      continue;
    }

    if (
      input.switchesPerDay &&
      input.switchesPerDay > 50 &&
      !s.vacuum &&
      input.mounting === "in_tank"
    ) {
      warningsEn.push(
        "Switching >50/day: vacuum OLTC (SHZV/CM2/CV2) is usually preferred over oil switching.",
      );
      warningsZh.push(
        "日切换 >50 次：通常优先真空有载（SHZV/CM2/CV2）而非油切换。",
      );
    }

    if (input.stepVoltageV > 0 && s.stepCapacityByCurrent?.[current]) {
      const psin = s.stepCapacityByCurrent[current];
      const need = (input.throughCurrentA * input.stepVoltageV) / 1000;
      if (need > psin) {
        warningsEn.push(
          `Step capacity check: I×U ≈ ${need.toFixed(0)} kVA may exceed rated ${psin} kVA — verify envelope curve with engineering.`,
        );
        warningsZh.push(
          `级容量校核：I×U ≈ ${need.toFixed(0)} kVA 可能超过额定 ${psin} kVA，请工程按包络线确认。`,
        );
      }
    }

    warningsEn.push(
      "Indicative selection from published technical data / type designation rules. Special design, retrofit flanges, and final OS require Huaming engineering confirmation.",
    );
    warningsZh.push(
      "本结果依据公开技术样本与型号规则的选型建议。特殊设计、改造法兰与最终 OS 须华明工程确认。",
    );

    let confidence = 0.85;
    if (warningsEn.length > 2) confidence -= 0.05;
    if (s.id === "hwv" && input.mounting === "in_tank") confidence -= 0.3;
    confidence = Math.max(0.4, Math.min(0.95, confidence));

    results.push({
      seriesId: s.id,
      seriesCode: s.code,
      model,
      modelWithMdu,
      phases: input.phases,
      currentA: current,
      connection: conn,
      umKv: um,
      selectorSize,
      umToken,
      tapCode: tap.tapCode,
      regulation: input.regulation,
      changeOver: tap.changeOver,
      pitch: tap.pitch,
      positions: tap.positions,
      mid: tap.mid,
      mdu: mduStr,
      reasonsEn,
      reasonsZh,
      warningsEn,
      warningsZh,
      confidence,
    });
  }

  results.sort((a, b) => {
    const sa = SERIES.find((x) => x.id === a.seriesId)!;
    const sb = SERIES.find((x) => x.id === b.seriesId)!;
    const d = scoreSeries(sb, input) - scoreSeries(sa, input);
    if (d !== 0) return d;
    return b.confidence - a.confidence;
  });

  // If prefer vacuum, drop oil results when any vacuum exists
  let final = results;
  if (input.preferVacuum) {
    const vac = results.filter((r) => SERIES.find((s) => s.id === r.seriesId)?.vacuum);
    if (vac.length) final = vac;
  }

  if (!final.length) {
    return {
      ok: false,
      results: [],
      errorsEn: [
        "Parameters out of catalogue range (current, Um, step voltage, or positions). Try another family or contact engineering.",
      ],
      errorsZh: [
        "参数超出目录范围（电流、Um、级电压或档位数）。请调整条件或联系工程。",
      ],
    };
  }

  return {
    ok: true,
    results: final.slice(0, 6),
    errorsEn: [],
    errorsZh: [],
  };
}

/** Regression helpers for known commercial quotes */
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
      mdu: "CMA7" as const,
    },
    expectModel: "HWVIII-400Y/72.5-10193W",
    expectWithMdu: "HWVIII-400Y/72.5-10193W+CMA7",
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
      mdu: "CMA7" as const,
    },
    expectContains: "SHZVIII-1000Y/170D-12233W",
  },
};
