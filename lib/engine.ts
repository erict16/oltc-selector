import {
  EARTH_INSULATION,
  FAMILY_MIN_RANK,
  SERIES,
  coveringUms,
  internalInsulation,
  nearestCurrent,
  nearestUm,
  phaseToken,
  resolveSelectorSize,
  stepCapacityKva,
  umForEarthInsulation,
} from "./catalog";
import {
  commercialTypeExists,
  connectionLetterOnPhase,
  phaseConnectionLegal,
  resolveOctcListModel,
} from "./typeExists";
import { catalogueUmFromRatedKv } from "./deriveUm";
import { parseTypeString } from "./parseType";
import { resolveTapFields } from "./tapCode";
import type {
  Connection,
  ModelResult,
  OctcSeriesChoice,
  OctcSeriesRoman,
  PhaseCode,
  SelectInput,
  SelectOutput,
  SelectorSize,
  SeriesDef,
} from "./types";

function normOctcContact(raw: string | undefined): string {
  const t = (raw ?? "").replace(/\s+/g, "").toLowerCase();
  const m = t.match(/^(\d+)x(\d+)$/);
  if (!m) return "";
  return `${Number(m[1])}x${Number(m[2])}`;
}

/**
 * DETC contact from service positions (or ±N → 2N+1).
 * 2025 list also has 8x7 / 9x8 / 10x9 / 16x15 — map those when P needs them.
 * A known OS contact (`input.octcContact`) wins.
 */
export function octcContactCode(
  input: SelectInput,
  seriesId?: string,
): string {
  const hinted = normOctcContact(input.octcContact);
  let pos = input.positions;
  if (input.plusMinusSteps != null && input.plusMinusSteps > 0) {
    pos = 2 * input.plusMinusSteps + 1;
  }
  // 2026-11-04: drum contacts must cover the positions; "" = no type. A 6x5
  // used to stand for 7–12 positions and a 12x12 hint made WSGVII strings.
  if (seriesId === "wsg") {
    if (pos != null && pos > 6) return "";
    if (hinted) return hinted === "4x5" || hinted === "6x5" ? hinted : "";
    if (pos == null || pos <= 5) return "4x5";
    return "6x5";
  }
  if (seriesId === "wdg" || seriesId === "wlg") {
    const roman = input.octcSeries ?? "auto";
    let drum = "";
    if (seriesId === "wlg") {
      if (roman === "VIII" && (pos == null || pos <= 5)) drum = "4x2";
    } else if (roman === "V") {
      if (pos == null || pos <= 6) drum = "6x5";
    } else if (roman === "auto" || roman === "IV") {
      if (pos == null || pos <= 5) drum = "5x5";
    }
    return hinted && hinted !== drum ? "" : drum;
  }
  if (hinted) return hinted;
  // 2026-11-04: every sold WSLVIII is 5x2 (web has no contact field). More
  // positions keep the derivation, so the list decides.
  if (input.octcSeries === "VIII" && (pos == null || pos <= 5)) return "5x2";
  if (pos == null || pos <= 6) return "6x5";
  if (pos <= 7) return "7x6";
  if (pos <= 8) return "8x7";
  if (pos <= 9) return "9x8";
  if (pos <= 10) return "10x9";
  if (pos <= 12) return "12x11";
  if (pos <= 16) return "16x15";
  return "18x17";
}

/** WSL size letter from 2025 list / OS. */
export function octcSizeLetter(
  um: number,
  contact: string,
  requested?: SelectorSize | "auto",
  acrossTapGiven = false,
): SelectorSize {
  if (requested && requested !== "auto") {
    if (requested === "DE") return "E";
    return requested;
  }
  const c = contact.toLowerCase();
  if (c === "18x17" || c === "16x15") return "E";
  if (c === "12x11" || c === "10x9" || c === "12x12") return "D";
  // 2026-11-04: sales write A up to 145 kV (126-6x5A ×5). The letter may be
  // an inner-insulation size, so a stated across-tap stress keeps B above 72.5.
  if (
    um <= (acrossTapGiven ? 72.5 : 145) + 0.1 &&
    ["6x5", "4x5", "5x4", "5x2", "4x3", "3x2", "7x6"].includes(c)
  ) {
    return "A";
  }
  return "B";
}

/**
 * Product series roman, not phase.
 * Explicit octcSeries wins. Else 5x2 → VIII, 3x2 → VI, 5x4 → V, 12x12 → VII.
 * Otherwise linear IV for both Y and D. Delta is not reversing.
 * WSG auto on D stays II: that drum row is the quoted type, and WSG is not list-gated.
 */
export function octcRoman(
  connection: Connection,
  contact?: string,
  series?: OctcSeriesChoice,
  familyCode?: string,
): OctcSeriesRoman {
  if (series && series !== "auto") return series;
  const c = (contact ?? "").toLowerCase();
  if (c === "5x2" || c === "12x2") return "VIII";
  if (c === "3x2" || c === "6x2") return "VI";
  if (c === "5x4" || c === "4x3") return "V";
  if (c === "12x12") return "VII";
  if (familyCode === "WSG" && connection === "D") return "II";
  return "IV";
}

function isOctcSeries(s: SeriesDef): boolean {
  return s.dutyKind === "octc";
}

/** 2026-11-04: single-phase drum OCTC. A 3x set is the normal product, ranked as one unit. */
const DRUM_SINGLE = new Set(["wdg", "wlg"]);
function rankUnits(seriesId: string, unitCount: number): number {
  return DRUM_SINGLE.has(seriesId) ? 1 : unitCount;
}

/** CV2 brochure: 2000 V @ 10 contacts, 1500 V @ 12 contacts (approx by pitch). */
function maxStepVoltageForSeries(
  s: SeriesDef,
  pitch: number,
  current?: number,
): number {
  const byCurrent = current != null ? s.maxStepVoltageByCurrent?.[current] : undefined;
  if (byCurrent != null) return byCurrent;
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
  octcSeries?: OctcSeriesChoice,
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
  if (isOctcSeries(series)) {
    // tapCode already includes contact + size (6x5B). Roman is the product series, not phase.
    const yd: "Y" | "D" = conn === "D" ? "D" : "Y";
    const roman = octcRoman(
      yd,
      tapCode.replace(/[A-E]$/i, ""),
      octcSeries,
      series.code,
    );
    // 2026-11-04: single-phase drum strings carry no Y/D (WDGIV-800/40.5-5x5A).
    const ydToken = DRUM_SINGLE.has(series.id) ? "" : yd;
    core = `${series.code}${roman}-${current}${ydToken}/${umToken}-${tapCode}`;
  } else if (series.code === "HWDK") {
    core = `${series.code}${phases}-${current}/${umToken}`;
    if (tapCode && /^\d+$/.test(tapCode)) core += `-${tapCode}`;
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
  // OCTC is oil-immersed cage/drum. The 2025 list has no vacuum row.
  if (input.dutyKind === "octc") return s.medium === "oil" && !s.vacuum;
  if (input.mounting === "dry_type") return s.medium === "dry";
  if (input.preferVacuum) return true; // soft — oil filtered later if vacuum exists
  if (input.medium === "oil_vacuum") return s.vacuum || s.medium === "oil_vacuum";
  // 油灭弧 is a hard lock. oil_vacuum families (SHZV/SHZVG/SDZV/CM2/CV2)
  // sit in transformer oil but switch in vacuum — they must not leak through
  // when no oil type covers a high Iᵤ.
  if (input.medium === "oil") return s.medium === "oil" && !s.vacuum;
  return true;
}

/**
 * Higher score = better primary pick.
 *
 * Commercial min-adequate (2025 catalogue + sales practice):
 *   1. Family: CV2 → CM2 → SHZV → SDZV → SHZVG
 *      (never SHZV-400 over CV2/CM2 on exact I; SDZV only when SHZV Ust/capacity is short).
 *   2. **Only emit a type that exists in the brochure.**
 *      CM2III-…D is not a type → do not emit it. CV2III-…D and HWVIII-…D exist.
 *      3× I is used when that single-phase type exists and III does not cover
 *      (missing III connection, or Iᵤ above III max).
 *      One legal III still beats 3× when both exist (SHZV-1000 vs 3×CM2I-800).
 *   3. Mild tighter catalogue current / Um.
 */
function adequacyScore(
  s: SeriesDef,
  input: SelectInput,
  current: number,
  um: number,
  unitCount: number,
  pitch: number,
): number {
  let score = 10000;

  // Dominant: family minimum path (lower FAMILY_MIN_RANK → higher score)
  const fam = FAMILY_MIN_RANK[s.id] ?? s.rank;
  score -= fam * 100;

  // Vacuum / oil preference
  if (input.preferVacuum && s.vacuum) score += 40;
  if (input.preferVacuum && !s.vacuum) score -= 800;
  if (!input.preferVacuum && input.medium === "oil" && !s.vacuum) score += 40;
  if (!input.preferVacuum && input.medium === "oil" && s.vacuum) score -= 800;

  // Mounting lock
  if (
    (input.mounting === "on_tank" ||
      input.mounting === "external_compartment") &&
    s.id === "hwv"
  ) {
    score += 2500;
  }
  if (input.mounting === "in_tank" && s.id === "hwv") score -= 4000;

  // Sales-practice exceptions to the family order (2026-11-04 audit, OS
  // 2025–2026). Each moves the primary only; the other family stays listed.
  // FAM-1: oil CV/SV past the 90% Ust line. Promotes the insurance card
  // (CM) to primary: CM sold on 8 of 9 such rows. Counter-case: ELIZ
  // E-V250092 bought CVIII-350Y at 1368 V (91%).
  if (
    (s.id === "cv" || s.id === "sv") &&
    input.stepVoltageV > STEP_VOLTAGE_LINE * maxStepVoltageForSeries(s, pitch)
  ) {
    score -= 3500;
  }
  // FAM-4: single-phase duty takes combined CM2I, not compound CV2I
  // (E-CM2250006, E-CM2250242, E-CM2260142-143). Oil CVI stays: Sanaky.
  if (input.phases === "I" && s.id === "cv2") score -= 3500;
  // FAM-2: tapped winding of 400 kV class: SHZV on 15 of 17 orders (HMT,
  // TAMINI, Brazil); EFACEC bought CM2 twice.
  // FAM-3 (low confidence, fitted on 3 rows: E-SHZV250020-023 453 A,
  // E-SHZV260095-098 571 A, E-SHZV260105 446 A): 220–275 kV class, one III
  // unit above 430 A went SHZV. E-CM2260140 at 423 A stayed CM2. One III
  // unit only: 3× moved R02 to 3xSHZVI-1500, not in the SHZV data.
  const windUm = input.tapWindingKv ? catalogueUmFromRatedKv(input.tapWindingKv) : 0;
  if (
    s.id === "shzv" &&
    (windUm >= 420 ||
      (unitCount === 1 &&
        input.phases === "III" &&
        windUm >= 252 &&
        input.throughCurrentA > 430))
  ) {
    score += 1700;
  }

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
  const psin = stepCapacityKva(s, current, pitch, input.throughCurrentA);
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
  /** 3× because combined III cannot sit on delta / line-end */
  deltaForced?: boolean;
};

/**
 * Catalogue I covers duty: not less than the duty (IEC 60214-2, SelMan).
 * 2026-11-04 audit D2: the 1% tolerance put 351–353 A on 350 A units where
 * Huaming sold the next size 4 times; only 2 sales (603.75 / 603.86 A on
 * CV2-600) ever used it.
 */
function ratingCoversDuty(wanted: number, rating: number): boolean {
  return wanted <= rating + 0.01;
}

function buildAttempts(s: SeriesDef, input: SelectInput): Attempt[] {
  const out: Attempt[] = [];
  const covering = coveringUms(input.umKv, s.umKv).filter(
    (u) => u >= input.umKv - 0.1,
  );
  if (!covering.length) return out;
  const um0 = covering[0];
  // 126 twin only on the min-adequate families (CV2/CM2/…). SHZV extra Ums
  // crowd the ranked list and hide customer-locked oil CM rows (QS2607197).
  // OCTC never takes the twin: WSL @72.5 used to beat WSG @40.5 by 4 points.
  // 2026-11-04: except a cage lock. The list has 5 WSL rows at 40.5; the 35 kV
  // class cage sales are all WSL @72.5. The Um overshoot keeps 40.5 first.
  const ums =
    !isOctcSeries(s) && (FAMILY_MIN_RANK[s.id] ?? s.rank) < 40
      ? covering
      : s.id === "wsl" && input.preferStructure === "cage"
        ? covering
        : [um0];

  // 2026-11-04: single-phase drum, one unit per phase. A drum lock takes the
  // next Um too, as the cage lock does: the sold rows are the list, and 19 of
  // 36 drum sales on 35 kV windings are @72.5 (no WDGIV-1250/40.5 row).
  if (DRUM_SINGLE.has(s.id)) {
    const curI = nearestCurrent(input.throughCurrentA, s.currents.I ?? []);
    if (curI != null && ratingCoversDuty(input.throughCurrentA, curI)) {
      for (const um of input.preferStructure === "drum" ? covering : [um0]) {
        out.push({
          series: s,
          phases: "I",
          current: curI,
          um,
          unitCount: input.phases === "I" ? 1 : input.phases === "II" ? 2 : 3,
        });
      }
    }
    return out;
  }

  // CZ dry: 2025 list + 2026 OS are 3×CZI only (no CZIII / CZI row).
  // Do not emit a single-unit CZIII — ranking would put it first.
  if (s.id === "cz") {
    const curI = nearestCurrent(input.throughCurrentA, s.currents.I ?? []);
    if (curI != null && ratingCoversDuty(input.throughCurrentA, curI)) {
      out.push({
        series: s,
        phases: "I",
        current: curI,
        um: um0,
        unitCount: 3,
      });
    }
    return out;
  }

  const list = s.currents[input.phases];
  const maxPhase = list?.length ? Math.max(...list) : null;
  const connIllegal = !phaseConnectionLegal(
    s,
    input.phases,
    input.connection,
  );

  // Primary phase as requested when a brochure type exists for this connection.
  if (
    !connIllegal &&
    maxPhase != null &&
    ratingCoversDuty(input.throughCurrentA, maxPhase)
  ) {
    const cur = nearestCurrent(input.throughCurrentA, list);
    if (cur != null) {
      for (const um of ums) {
        out.push({
          series: s,
          phases: input.phases,
          current: cur,
          um,
          unitCount: 1,
        });
      }
    }
  }

  // OCTC: never 3× singles.
  // 3× I-units: always emit a covering set so a customer-locked 3× stays
  // eligible. Ranking still puts any legal single III first.
  // Extra Um is only for single-unit alts (the 126 twin), not 3×.
  if (isOctcSeries(s)) return out;
  if (
    s.currents.I?.length &&
    (input.phases === "III" || connIllegal)
  ) {
    const curI = nearestCurrent(input.throughCurrentA, s.currents.I);
    if (curI != null) {
      out.push({
        series: s,
        phases: "I",
        current: curI,
        um: um0,
        unitCount: 3,
        deltaForced: connIllegal,
      });
    }
  }

  return out;
}

/**
 * Other-options order: same family next I → next list Um (126 after 72.5) →
 * next family at the duty Um → then SHZV / 3×. Stops SHZV filling the first
 * three alts when a 126 twin is on the 2025 list (2026 OS).
 */
function diversifyResults(ranked: ModelResult[]): ModelResult[] {
  if (ranked.length <= 1) return ranked;
  const primary = ranked[0];
  const used = new Set<string>([primary.model]);
  const rest: ModelResult[] = [];

  const take = (pred: (r: ModelResult) => boolean) => {
    const hit = ranked.find((r) => !used.has(r.model) && pred(r));
    if (hit) {
      rest.push(hit);
      used.add(hit.model);
    }
  };

  take(
    (r) =>
      r.seriesId === primary.seriesId &&
      r.unitCount === primary.unitCount &&
      Math.abs(r.umKv - primary.umKv) < 0.1 &&
      r.currentA !== primary.currentA,
  );
  take(
    (r) =>
      r.seriesId === primary.seriesId &&
      r.unitCount === primary.unitCount &&
      r.umKv > primary.umKv + 0.1,
  );
  take(
    (r) =>
      r.seriesId !== primary.seriesId &&
      r.unitCount === 1 &&
      r.umKv <= primary.umKv + 0.1,
  );

  for (const r of ranked) {
    if (used.has(r.model)) continue;
    rest.push(r);
    used.add(r.model);
  }
  return [primary, ...rest];
}

type TapFields = ReturnType<typeof resolveTapFields>;
type LimitAxis = "um" | "current" | "positions" | "ust" | "kva";
/** One catalogue limit a family misses: what the duty needs, what it has. */
type LimitBlock = { axis: LimitAxis; need: number; limit: number; label: string };
type FamilyMiss = { s: SeriesDef; blocks: LimitBlock[]; worst: number };

const LIMIT_AXES: LimitAxis[] = ["um", "current", "positions", "ust", "kva"];

/** Mounting + arc medium words for a no-result line (noteI18n translates them). */
function limitScope(input: SelectInput): { en: string; zh: string } {
  if (input.dutyKind === "octc") return { en: "OCTC", zh: "无载" };
  if (input.mounting === "dry_type") return { en: "dry-type", zh: "干式" };
  if (input.mounting === "reactor") return { en: "reactor", zh: "电抗式" };
  const on =
    input.mounting === "on_tank" || input.mounting === "external_compartment";
  const vac = input.preferVacuum || input.medium === "oil_vacuum";
  const oil = !vac && input.medium === "oil";
  return {
    en: `${on ? "on-tank" : "in-tank"}${vac ? " vacuum" : oil ? " oil" : ""}`,
    zh: `${on ? "箱外" : "箱内"}${vac ? "真空" : oil ? "油浸" : ""}`,
  };
}

/** Every limit this family misses for the duty. Null when no type of it exists for the phase / connection. */
function familyMiss(s: SeriesDef, input: SelectInput, tap: TapFields): FamilyMiss | null {
  const octc = isOctcSeries(s);
  const ratings: { current: number; label: string }[] = [];
  if (s.id === "cz") {
    for (const c of s.currents.I ?? []) ratings.push({ current: c, label: `3×${s.code}I-${c}` });
  } else {
    const legal = phaseConnectionLegal(s, input.phases, input.connection);
    if (legal) {
      for (const c of s.currents[input.phases] ?? []) {
        ratings.push({ current: c, label: `${s.code}${input.phases}-${c}` });
      }
    }
    if (!octc && (input.phases === "III" || !legal)) {
      for (const c of s.currents.I ?? []) ratings.push({ current: c, label: `3×${s.code}I-${c}` });
    }
  }
  if (!ratings.length) return null;

  const blocks: LimitBlock[] = [];
  if (!s.umKv.some((u) => u >= input.umKv - 0.1)) {
    blocks.push({ axis: "um", need: input.umKv, limit: Math.max(...s.umKv), label: s.code });
  }
  const top = ratings.reduce((a, b) => (b.current > a.current ? b : a));
  const covering = ratings.filter((r) => ratingCoversDuty(input.throughCurrentA, r.current));
  if (!covering.length) {
    blocks.push({ axis: "current", need: input.throughCurrentA, limit: top.current, label: top.label });
  }
  const pool = covering.length ? covering : [top];

  if (octc) {
    let pos = input.positions;
    if (input.plusMinusSteps != null && input.plusMinusSteps > 0) pos = 2 * input.plusMinusSteps + 1;
    if (pos != null && pos > s.maxPositionsLinear) {
      blocks.push({ axis: "positions", need: pos, limit: s.maxPositionsLinear, label: s.code });
    }
  } else {
    const maxPos =
      input.regulation === "linear" ? s.maxPositionsLinear : s.maxPositionsWithChangeOver;
    if (tap.positions > maxPos) {
      blocks.push({ axis: "positions", need: tap.positions, limit: maxPos, label: s.code });
    }
    if (input.stepVoltageV > 0) {
      const ust = Math.max(
        ...pool.map((r) => maxStepVoltageForSeries(s, tap.pitch, r.current)),
      );
      if (input.stepVoltageV > ust + 0.5) {
        blocks.push({ axis: "ust", need: input.stepVoltageV, limit: ust, label: s.code });
      }
      const caps = pool.map((r) => ({
        r,
        kva: stepCapacityKva(s, r.current, tap.pitch, input.throughCurrentA),
      }));
      const needKva = (input.throughCurrentA * input.stepVoltageV) / 1000;
      if (caps.every((c) => c.kva != null)) {
        const best = caps.reduce((a, b) => ((b.kva ?? 0) > (a.kva ?? 0) ? b : a));
        if (needKva > (best.kva ?? 0) + 0.5) {
          blocks.push({ axis: "kva", need: needKva, limit: best.kva ?? 0, label: best.r.label });
        }
      }
    }
  }
  const worst = Math.max(0, ...blocks.map((b) => (b.limit > 0 ? b.need / b.limit : Infinity)));
  return { s, blocks, worst };
}

function fmtNeed(axis: LimitAxis, v: number): string {
  if (axis === "um") return String(v);
  if (axis === "current" && v < 100) return String(Math.round(v * 10) / 10);
  return String(Math.round(v));
}

/** A limit that blocks every family: the duty against the catalogue ceiling. */
function everyFamilyLine(
  b: LimitBlock,
  scope: { en: string; zh: string },
  pitch: number,
): { en: string; zh: string } {
  const n = fmtNeed(b.axis, b.need);
  const max = fmtNeed(b.axis, b.limit);
  switch (b.axis) {
    case "um":
      return {
        en: `Um ${n} kV is above the highest ${scope.en} class (${max} kV, ${b.label}).`,
        zh: `Um ${n} kV 超出${scope.zh}最高等级（${max} kV，${b.label}）。`,
      };
    case "current":
      return {
        en: `Through-current ${n} A is above the largest ${scope.en} rating (${max} A, ${b.label}).`,
        zh: `通过电流 ${n} A 超出${scope.zh}最大额定（${max} A，${b.label}）。`,
      };
    case "positions":
      return {
        en: `${n} positions are above every ${scope.en} family (max ${max}, ${b.label}).`,
        zh: `${n} 个工作位置超出${scope.zh}所有系列（最多 ${max}，${b.label}）。`,
      };
    case "ust":
      return {
        en: `Step voltage ${n} V is above every ${scope.en} family at pitch ${pitch} (max ${max} V, ${b.label}).`,
        zh: `级电压 ${n} V 超出节距 ${pitch} 下${scope.zh}所有系列（最高 ${max} V，${b.label}）。`,
      };
    case "kva":
      return {
        en: `Step capacity ${n} kVA is above every ${scope.en} family at pitch ${pitch} (max ${max} kVA, ${b.label}).`,
        zh: `级容量 ${n} kVA 超出节距 ${pitch} 下${scope.zh}所有系列（最大 ${max} kVA，${b.label}）。`,
      };
  }
}

/** One family's own limit, when no single limit blocks every family. */
function familyLine(code: string, b: LimitBlock, pitch: number): { en: string; zh: string } {
  const n = fmtNeed(b.axis, b.need);
  const max = fmtNeed(b.axis, b.limit);
  switch (b.axis) {
    case "um":
      return {
        en: `${code}: Um ${n} kV is above its ${max} kV.`,
        zh: `${code}：Um ${n} kV 超出其 ${max} kV。`,
      };
    case "current":
      return {
        en: `${code}: through-current ${n} A is above its ${max} A.`,
        zh: `${code}：通过电流 ${n} A 超出其 ${max} A。`,
      };
    case "positions":
      return {
        en: `${code}: ${n} positions are above its ${max}.`,
        zh: `${code}：${n} 个工作位置超出其 ${max}。`,
      };
    case "ust":
      return {
        en: `${code}: step voltage ${n} V is above its ${max} V at pitch ${pitch}.`,
        zh: `${code}：级电压 ${n} V 超出其节距 ${pitch} 下的 ${max} V。`,
      };
    case "kva":
      return {
        en: `${code}: step capacity ${n} kVA is above its ${max} kVA at pitch ${pitch}.`,
        zh: `${code}：级容量 ${n} kVA 超出其节距 ${pitch} 下的 ${max} kVA。`,
      };
  }
}

/**
 * Why nothing fits, in one or two lines. A limit that blocks every family is
 * reported against the catalogue ceiling. Otherwise the family closest to
 * fitting (fewest misses, smallest overshoot) and the nearest family that
 * clears its limit each name what stops them. Null when some family clears
 * every limit here (type existence, selector grade): the caller keeps its
 * own message.
 */
function noFitReasons(
  families: SeriesDef[],
  input: SelectInput,
  tap: TapFields,
): { en: string[]; zh: string[] } | null {
  const misses = families
    .map((s) => familyMiss(s, input, tap))
    .filter((m): m is FamilyMiss => m != null);
  if (!misses.length || misses.some((m) => !m.blocks.length)) return null;
  const pitch = tap.pitch;
  const en: string[] = [];
  const zh: string[] = [];

  const everywhere = LIMIT_AXES.filter((ax) =>
    misses.every((m) => m.blocks.some((b) => b.axis === ax)),
  ).filter((ax, _, all) => !(ax === "kva" && all.includes("current"))); // kVA follows from I
  if (everywhere.length) {
    const scope = limitScope(input);
    for (const ax of everywhere.slice(0, 2)) {
      const blocks = misses
        .map((m) => ({ m, b: m.blocks.find((b) => b.axis === ax)! }))
        .sort((x, y) => y.b.limit - x.b.limit || x.m.s.rank - y.m.s.rank);
      const ceiling = blocks[0].b;
      // Families that share a code-level ceiling (35 positions) are listed together.
      const label =
        ax === "current" || ax === "kva"
          ? ceiling.label
          : [...new Set(blocks.filter((x) => x.b.limit === ceiling.limit).map((x) => x.m.s.code))]
              .slice(0, 3)
              .join("/");
      const line = everyFamilyLine({ ...ceiling, label }, scope, pitch);
      en.push(line.en);
      zh.push(line.zh);
    }
    return { en, zh };
  }

  const ranked = [...misses].sort(
    (a, b) => a.blocks.length - b.blocks.length || a.worst - b.worst || a.s.rank - b.s.rank,
  );
  const ratio = (b: LimitBlock) => (b.limit > 0 ? b.need / b.limit : Infinity);
  const worstBlock = (m: FamilyMiss) =>
    m.blocks.reduce((a, b) => (ratio(b) > ratio(a) ? b : a));
  const closest = ranked[0];
  const bind = worstBlock(closest);
  const first = familyLine(closest.s.code, bind, pitch);
  en.push(first.en);
  zh.push(first.zh);
  const clears = ranked.find(
    (m) => m !== closest && !m.blocks.some((b) => b.axis === bind.axis),
  );
  if (clears) {
    const second = familyLine(clears.s.code, worstBlock(clears), pitch);
    en.push(second.en);
    zh.push(second.zh);
  }
  return { en, zh };
}

export function selectOltc(input: SelectInput): SelectOutput {
  const errorsEn: string[] = [];
  const errorsZh: string[] = [];

  if (!(Number.isFinite(input.throughCurrentA) && input.throughCurrentA > 0)) {
    errorsEn.push("Enter rated through-current (A).");
    errorsZh.push("请填写额定通过电流（A）。");
  }
  if (!(Number.isFinite(input.umKv) && input.umKv > 0)) {
    errorsEn.push("Enter highest voltage for equipment Um (kV).");
    errorsZh.push("请填写设备最高电压 Um（kV）。");
  }
  // NaN / undefined used to pass and skip the Ust and step-capacity checks.
  // 0 is allowed: it means not given, and every card says so.
  if (!Number.isFinite(input.stepVoltageV) || input.stepVoltageV < 0) {
    errorsEn.push("Step voltage must be a number ≥ 0 (0 = not given).");
    errorsZh.push("级电压须为 ≥ 0 的数字（0 表示未给）。");
  }

  if (errorsEn.length) {
    return { ok: false, results: [], errorsEn, errorsZh };
  }

  // Earth BIL / PF above the Um class is a higher Um, not a stronger grade.
  if ((input.bilKv ?? 0) > 0 || (input.pfKv ?? 0) > 0) {
    const earthUm = umForEarthInsulation(input.umKv, input.bilKv, input.pfKv);
    if (earthUm == null) {
      return {
        ok: false,
        results: [],
        errorsEn: [
          `Earth insulation LI ${input.bilKv ?? "—"} / PF ${input.pfKv ?? "—"} kV is above every catalogue Um. Contact engineering.`,
        ],
        errorsZh: [
          `对地绝缘 雷电 ${input.bilKv ?? "—"} / 工频 ${input.pfKv ?? "—"} kV 超出所有目录 Um。请联系工程。`,
        ],
      };
    }
    if (earthUm > input.umKv + 0.01) input = { ...input, umKv: earthUm };
  }

  const tap = resolveTapFields({
    regulation: input.regulation,
    positions: input.positions,
    plusMinusSteps: input.plusMinusSteps,
    pitch: input.pitch,
    midPositions: input.midPositions,
  });

  const wantOctc = input.dutyKind === "octc";
  let candidates = SERIES.filter((s) => {
    if (isOctcSeries(s) !== wantOctc) return false;
    return seriesMatchesMounting(s, input) && seriesMatchesMedium(s, input);
  });

  candidates = candidates.filter((s) => {
    if (input.connection === "any") return true;
    return (
      s.connections.includes(input.connection) ||
      s.connections.includes("any")
    );
  });
  // 2026-11-04: WSG is quoted as II only and never sold; VI–VIII gave invented strings.
  candidates = candidates.filter(
    (s) =>
      s.id !== "wsg" ||
      ["auto", "II", "IV", "V"].includes(input.octcSeries ?? "auto"),
  );

  const wantStruct = input.preferStructure;
  const autoKind = input.transformerKind === "auto";
  if ((autoKind || input.combinedOnly) && !wantOctc) {
    if (wantStruct === "compound") {
      return {
        ok: false,
        results: [],
        errorsEn: [
          autoKind
            ? "Autotransformers take combined types only: compound types (CV/CV2/SV) stop at 200 kV across the tap winding."
            : "Tapped windings of 220 kV class and above take combined types only: compound types (CV/CV2/SV) stop at 200 kV across the tap winding.",
        ],
        errorsZh: [
          autoKind
            ? "自耦变只用组合式：复合式（CV/CV2/SV）跨调压绕组冲击上限 200 kV。"
            : "220 kV 级及以上调压绕组只用组合式：复合式（CV/CV2/SV）跨调压绕组冲击上限 200 kV。",
        ],
      };
    }
    candidates = candidates.filter((s) => s.structure !== "compound");
  }
  if (wantStruct && wantStruct !== "auto") {
    candidates = candidates.filter((s) => s.structure === wantStruct);
  }

  if (!candidates.length) {
    return {
      ok: false,
      results: [],
      errorsEn: [
        wantOctc
          ? "No OCTC family matches this mounting / medium combination. Adjust filters or contact engineering."
          : "No OLTC family matches this mounting / medium combination. Adjust filters or contact engineering.",
      ],
      errorsZh: [
        wantOctc
          ? "没有无载系列匹配当前安装位置/介质。请调整条件，或联系工程确认。"
          : "没有系列匹配当前安装位置/介质。请调整条件，或联系工程确认。",
      ],
    };
  }

  const results: ModelResult[] = [];
  const seen = new Set<string>();
  /** A family fit on current/Um/Ust but no grade covered the across-tap stress. */
  let acrossTapShort = false;

  for (const s of candidates) {
      if (!compoundCoversAcrossTap(s, input)) {
        acrossTapShort = true;
        continue;
      }

      // Pitch-aware Ust limit (CV2 brochure: 2000 V @ 10 contacts, 1500 V @ 12).
      // Hard reject — do not keep the family by bumping current.
      // OCTC is de-energized: skip OLTC tap-position / pitch envelope.
      if (!isOctcSeries(s)) {
        const pitchMaxUst = maxStepVoltageForSeries(s, tap.pitch);
        if (input.stepVoltageV > pitchMaxUst + 0.5) continue;

        const maxPos =
          input.regulation === "linear"
            ? s.maxPositionsLinear
            : s.maxPositionsWithChangeOver;
        if (tap.positions > maxPos) continue;
      } else {
        let octcPos = input.positions;
        if (input.plusMinusSteps != null && input.plusMinusSteps > 0) {
          octcPos = 2 * input.plusMinusSteps + 1;
        }
        if (octcPos != null && octcPos > s.maxPositionsLinear) continue;
      }

      for (const att of buildAttempts(s, input)) {
        const phaseCurrents = s.currents[att.phases] ?? s.currents.I ?? [];

        // Covering catalogue I: smallest first, then the next step so a
        // customer-locked larger rating (CM-600, SHZV-1000, SHZVG-1500)
        // still appears in the ranked list.
        const need =
          input.stepVoltageV > 0
            ? (input.throughCurrentA * input.stepVoltageV) / 1000
            : 0;
        const capacityOk = (c: number) => {
          const psin = stepCapacityKva(s, c, tap.pitch, input.throughCurrentA);
          if (psin != null && need > psin + 0.5) return false;
          if (input.stepVoltageV > maxStepVoltageForSeries(s, tap.pitch, c) + 0.5) return false;
          return true;
        };
        // Nameplate current already includes short-time overload.
        // 342 A stays on 350. 600 is 综合保险 only when current is the tight
        // axis. The same step-voltage ceiling does not insure a low current.
        const covering = phaseCurrents.filter(
          (c) => ratingCoversDuty(input.throughCurrentA, c) && capacityOk(c),
        );
        if (!covering.length) continue;
        // Two covering ratings, plus the next catalogue step in this family.
        // The later family stays in the full list for replay. 综合保险 picks
        // it only when this current step does not raise the tight limit.
        const currentsToEmit = covering.slice(0, 2);
        const topEmitted = Math.max(...currentsToEmit);
        const stepUpCurrent = [...phaseCurrents]
          .sort((a, b) => a - b)
          .find(
            (c) =>
              c > topEmitted + 0.5 &&
              ratingCoversDuty(input.throughCurrentA, c) &&
              capacityOk(c),
          );
        if (stepUpCurrent != null && !currentsToEmit.includes(stepUpCurrent)) {
          currentsToEmit.push(stepUpCurrent);
        }

        for (const current of currentsToEmit) {
        const octc = isOctcSeries(s);
        const contact = octc ? octcContactCode(input, s.id) : "";
        if (octc && !contact) continue;
        const gradePick =
          !octc && s.usesSelectorSize
            ? resolveSelectorSize(
                att.um,
                input.selectorSize ?? "auto",
                input.acrossTapBilKv,
                input.acrossTapPfKv,
                s.id,
                // Only a, not b, is checked: the stated stress may lower the
                // grade where no phase-to-phase gap matters (2026-11-04 GRADE-2).
                att.phases === "I" || (att.phases === "III" && input.connection === "Y"),
              )
            : null;
        if (gradePick && gradePick.size == null) {
          // Above DE on this Um: do not hand back a grade that does not cover.
          acrossTapShort = true;
          continue;
        }
        let selectorSize: SelectorSize = octc
          ? octcSizeLetter(
              att.um,
              contact,
              input.selectorSize ?? "auto",
              (input.acrossTapBilKv ?? 0) > 0 || (input.acrossTapPfKv ?? 0) > 0,
            )
          : (gradePick?.size ?? "");
        const tapCode = octc ? contact : tap.tapCode;
        // 2026-11-04: HWDK writes 2N+1 (sold HWDKI-1500/40.5-17 for ±8, not
        // Fig. 3-3's 19). CVT writes pitch 09 + positions (brochure 0909).
        const modelTap = octc
          ? `${contact}${selectorSize}`
          : s.id === "cz"
            ? String(tap.positions)
            : s.id === "hwdk"
              ? String(
                  input.plusMinusSteps != null && input.plusMinusSteps > 0
                    ? 2 * input.plusMinusSteps + 1
                    : tap.positions,
                )
              : s.id === "cvt"
                ? `09${String(tap.positions).padStart(2, "0")}`
                : tap.tapCode;

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

        // I (and CM2/CM/CMD II) omit Y/D after current. D after Um is size.
        const modelConn: Connection = connectionLetterOnPhase(
          s,
          att.phases,
          conn,
        );

        let finalModel = buildModelString(
          s,
          phases,
          current,
          modelConn,
          umToken,
          modelTap,
          att.unitCount,
          input.octcSeries,
        );
        if (att.phases === "I") {
          finalModel = finalModel.replace(
            new RegExp(`(${s.code}I-\\d+)[YD]/`),
            "$1/",
          );
        } else if (att.phases === "II" && modelConn === "any") {
          finalModel = finalModel.replace(
            new RegExp(`(${s.code}II-\\d+)[YD]/`),
            "$1/",
          );
        }

        if (octc) {
          const listed = resolveOctcListModel(finalModel);
          if (!listed) continue;
          finalModel = listed;
          // 2026-11-04: the list row's letter wins when the resolver fell back.
          const listedSize = parseTypeString(listed)?.selectorSize;
          if (listedSize) selectorSize = listedSize as SelectorSize;
        } else if (!commercialTypeExists(finalModel, s)) {
          continue;
        }

        if (seen.has(finalModel)) continue;
        seen.add(finalModel);

        const modelWithMdu = mduStr ? `${finalModel}+${mduStr}` : finalModel;
        const score = adequacyScore(
          s,
          input,
          current,
          att.um,
          rankUnits(s.id, att.unitCount),
          tap.pitch,
        );

        const reasonsEn: string[] = [];
        const reasonsZh: string[] = [];
        const warningsEn: string[] = [];
        const warningsZh: string[] = [];
        const cautionsEn: string[] = [];
        const cautionsZh: string[] = [];

        if (!octc && !(input.stepVoltageV > 0)) {
          cautionsEn.push(
            "Step voltage not given: step-voltage and step-capacity limits were not checked.",
          );
          cautionsZh.push("未给级电压：级电压和级容量都没有校验。");
        }
        if (!octc && !tap.standard) {
          cautionsEn.push(
            `Tap code ${tap.tapCode} is not a brochure Fig. 3-3 diagram. Engineering must confirm the connection.`,
          );
          cautionsZh.push(
            `分接代码 ${tap.tapCode} 不在样本图 3-3 标准接线内，须工程确认接线。`,
          );
        }
        if (!octc) {
          // Huaming 选型培训 (JL 2024-05): these go to technical special review.
          const review: string[] = [];
          const reviewZh: string[] = [];
          if (s.id === "cm2" && input.stepVoltageV > 2500 + 0.5) {
            review.push("CM2 step voltage above 2500 V");
            reviewZh.push("CM2 级电压超过 2500 V");
          }
          if (s.id === "shzv" && input.stepVoltageV > 3300 + 0.5) {
            review.push("SHZV step voltage above 3300 V");
            reviewZh.push("SHZV 级电压超过 3300 V");
          }
          if (selectorSize === "DE" || selectorSize === "E") {
            review.push(`selector grade ${selectorSize}`);
            reviewZh.push(`选择器 ${selectorSize} 级`);
          }
          if (att.um >= 300) {
            review.push(`Um ${att.um} kV`);
            reviewZh.push(`Um ${att.um} kV`);
          }
          if (review.length) {
            cautionsEn.push(`Needs Huaming technical review: ${review.join(", ")}.`);
            cautionsZh.push(`须华明技术特别评审：${reviewZh.join("，")}。`);
          }
          // Change-over selector recovery voltage: 35 kV combined, 15 kV CV2.
          if (
            tap.changeOver !== "0" &&
            input.transformerKind !== "auto" &&
            (input.tapWindingKv ?? 0) > 121
          ) {
            cautionsEn.push(
              "Change-over selector above 110 kV: check the recovery voltage and quote the tie-in resistor as an option (maker's Cw/Ce needed).",
            );
            cautionsZh.push("110 kV 以上正反调/粗细调：核恢复电压，束缚电阻作为可选项报价（需变压器厂 Cw/Ce）。");
          }
        }
        if (gradePick?.raisedFrom) {
          cautionsEn.push(
            `Selector grade raised from ${gradePick.raisedFrom} to ${selectorSize} (Um ${att.um} kV / across-tap stress).`,
          );
          cautionsZh.push(
            `选择器等级已由 ${gradePick.raisedFrom} 升为 ${selectorSize}（Um ${att.um} kV 或调压绕组间绝缘要求）。`,
          );
        }
        if (
          !octc &&
          !s.usesSelectorSize &&
          s.structure !== "compound" &&
          ((input.acrossTapBilKv ?? 0) > 0 || (input.acrossTapPfKv ?? 0) > 0)
        ) {
          cautionsEn.push(
            `${s.code} across-tap withstand is not in the catalogue data: across-tap stress not checked.`,
          );
          cautionsZh.push(
            `${s.code} 调压绕组间耐受不在目录数据里：调压绕组间绝缘未校验。`,
          );
        }

        // 需求电流取整展示：174.954… 这种长小数没有工程意义
        const dutyA =
          input.throughCurrentA >= 100
            ? String(Math.round(input.throughCurrentA))
            : String(Math.round(input.throughCurrentA * 10) / 10);
        reasonsEn.push(
          `Minimum-adequate path: ${s.nameEn}, Ium ${current} A ≥ ${dutyA} A, Um ${att.um} kV.`,
        );
        reasonsZh.push(
          `最低满足路径：${s.nameZh}，Ium ${current} A ≥ 需求 ${dutyA} A，Um ${att.um} kV。`,
        );

        if (s.structure === "compound" && !octc) {
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

        if (octc) {
          const roman = octcRoman(conn, contact, input.octcSeries, s.code);
          reasonsEn.push(
            `OCTC contact ${contact}${selectorSize} (${s.code}${roman}).`,
          );
          reasonsZh.push(
            `无载触头 ${contact}${selectorSize}（${s.code}${roman}）。`,
          );
        } else {
          reasonsEn.push(
            `Tap code ${tap.tapCode}: pitch ${tap.pitch}, ${tap.positions} pos, mid ${tap.mid}, ${input.regulation}.`,
          );
          reasonsZh.push(
            `分接代码 ${tap.tapCode}：节距 ${tap.pitch}，${tap.positions} 位，中间位 ${tap.mid}。`,
          );
        }

        if (rankUnits(s.id, att.unitCount) > 1) {
          if (att.deltaForced) {
            reasonsEn.push(
              `${att.unitCount}× single-phase — no brochure III type for this connection (e.g. CM2III-…D does not exist).`,
            );
            reasonsZh.push(
              `${att.unitCount} 台单相 — 样本没有这个连接的三相型号（没有 CM2III-…D）。`,
            );
          } else {
            reasonsEn.push(
              `${att.unitCount}× single-phase — no single III unit covers this Iᵤ (prefer one SHZV/SHZVG when it fits; 3× costs more).`,
            );
            reasonsZh.push(
              `${att.unitCount} 台单相 — 无三相整机可覆盖此电流（有 SHZV/SHZVG 整机时优先；3× 更贵）。`,
            );
          }
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
        const coveringUm = nearestUm(input.umKv, s.umKv);
        const extraUm =
          coveringUm != null && att.um > coveringUm + 0.1;
        if (extraUm) {
          reasonsEn.push(
            `Next catalogue Um ${att.um} kV (list twin of ${coveringUm} kV).`,
          );
          reasonsZh.push(
            `目录下一档 Um ${att.um} kV（${coveringUm} kV 的价目表配对）。`,
          );
        } else if (att.um > input.umKv + 0.1) {
          warningsEn.push(`Um rounded up to ${att.um} kV.`);
          warningsZh.push(`Um 已上靠至 ${att.um} kV。`);
        }

        warningsEn.push(
          "Indicative selection from published technical data. Final OS requires engineering confirmation.",
        );
        warningsZh.push(
          "依据公开技术样本的选型建议。最终 OS 须工程确认。",
        );

        const maxStepVoltageV = octc
          ? null
          : maxStepVoltageForSeries(s, tap.pitch, current);
        const stepCapacity = stepCapacityKva(s, current, tap.pitch, input.throughCurrentA);

        let confidence = 0.88;
        if (rankUnits(s.id, att.unitCount) > 1) confidence -= 0.08;
        confidence -= 0.05 * cautionsEn.length;
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
          tapCode,
          regulation: input.regulation,
          changeOver: octc ? "0" : tap.changeOver,
          pitch: octc ? 0 : tap.pitch,
          positions: octc
            ? input.positions ??
              (input.plusMinusSteps != null && input.plusMinusSteps > 0
                ? 2 * input.plusMinusSteps + 1
                : 5)
            : tap.positions,
          mid: octc ? 0 : tap.mid,
          mdu: mduStr,
          unitCount: att.unitCount,
          maxStepVoltageV,
          stepCapacityKva: stepCapacity,
          earthPfKv: earth?.pf ?? null,
          earthBilKv: earth?.bil ?? null,
          reasonsEn,
          reasonsZh,
          warningsEn,
          warningsZh,
          cautionsEn,
          cautionsZh,
          confidence,
          adequacyScore: score,
        });
        }
      }
    }

  // Vacuum / oil are hard locks. Do not fall back across the arc mode
  // (oil 2915 A used to leak 3xSHZVGI; on-tank vacuum used to leak HWDK).
  // OCTC has no vacuum row. A leftover preferVacuum used to wipe the cage
  // and report "out of catalogue" even though WSL was already admitted.
  let final = results;
  if (wantOctc) {
    final = results.filter((r) => {
      const s = SERIES.find((x) => x.id === r.seriesId);
      return s != null && s.medium === "oil" && !s.vacuum;
    });
  } else if (input.preferVacuum) {
    final = results.filter(
      (r) => SERIES.find((s) => s.id === r.seriesId)?.vacuum,
    );
  } else if (input.medium === "oil") {
    final = results.filter(
      (r) => SERIES.find((s) => s.id === r.seriesId)?.vacuum === false,
    );
  }

  final.sort((a, b) => {
    // Hard rule: any brochure-legal single-unit outranks any multi.
    const ua = rankUnits(a.seriesId, a.unitCount);
    const ub = rankUnits(b.seriesId, b.unitCount);
    if (ua !== ub) return ua - ub;
    if (b.adequacyScore !== a.adequacyScore)
      return b.adequacyScore - a.adequacyScore;
    return b.confidence - a.confidence;
  });

  if (!final.length) {
    // Name the limit that blocks. Arc medium is a hard lock, so only the
    // families the result filter keeps count.
    const locked = candidates.filter((s) =>
      wantOctc
        ? s.medium === "oil" && !s.vacuum
        : input.preferVacuum
          ? s.vacuum
          : input.medium === "oil"
            ? !s.vacuum
            : true,
    );
    const why = noFitReasons(locked, input, tap);
    if (why) {
      return { ok: false, results: [], errorsEn: why.en, errorsZh: why.zh };
    }
    return {
      ok: false,
      results: [],
      errorsEn: [
        acrossTapShort
          ? "Across-tap insulation is above every selector grade that fits this duty. Contact engineering."
          : "Parameters out of catalogue range (current, Um, step voltage, or positions).",
      ],
      errorsZh: [
        acrossTapShort
          ? "调压绕组间绝缘超出满足此工况的所有选择器等级。请联系工程。"
          : "参数超出目录范围（电流、Um、级电压或档位数）。",
      ],
    };
  }

  return {
    ok: true,
    results: diversifyResults(final).slice(0, 20),
    errorsEn: [],
    errorsZh: [],
  };
}

/** Same family / phase / unit count, next catalogue current above the primary. */
export function stepUpOf(
  primary: ModelResult,
  results: ModelResult[],
): ModelResult | null {
  const same = results.filter(
    (r) =>
      r.model !== primary.model &&
      r.seriesId === primary.seriesId &&
      r.phases === primary.phases &&
      r.unitCount === primary.unitCount &&
      r.currentA > primary.currentA,
  );
  if (!same.length) return null;
  same.sort((a, b) => {
    const aUm = Math.abs(a.umKv - primary.umKv) < 0.1 ? 0 : 1;
    const bUm = Math.abs(b.umKv - primary.umKv) < 0.1 ? 0 : 1;
    return aUm - bUm || a.currentA - b.currentA;
  });
  return same[0];
}

/**
 * One price step. 其他可选 may show this family after the primary.
 * It does not jump CM2 → SHZVG, and it does not offer SDZV or SHZVG
 * as a safety upsell of a switch that already covers the duty.
 */
const NEXT_FAMILY: Record<string, string> = {
  cv2: "cm2",
  cm2: "shzv",
  cv: "sv",
  sv: "cm",
  cm: "cmd",
};

function sameMachine(a: ModelResult, b: ModelResult): boolean {
  return a.unitCount === b.unitCount && a.phases === b.phases;
}

/** Same family, the next higher catalogue Um, current not below the primary. */
function nextUmOf(
  primary: ModelResult,
  results: ModelResult[],
): ModelResult | null {
  const higher = results.filter(
    (r) =>
      r.model !== primary.model &&
      r.seriesId === primary.seriesId &&
      sameMachine(r, primary) &&
      r.umKv > primary.umKv + 0.1 &&
      r.currentA + 0.5 >= primary.currentA,
  );
  if (!higher.length) return null;
  const minUm = Math.min(...higher.map((r) => r.umKv));
  const at = higher.filter((r) => Math.abs(r.umKv - minUm) < 0.1);
  at.sort((a, b) => {
    const aSame = Math.abs(a.currentA - primary.currentA) < 0.5 ? 0 : 1;
    const bSame = Math.abs(b.currentA - primary.currentA) < 0.5 ? 0 : 1;
    return aSame - bSame || a.currentA - b.currentA;
  });
  return at[0] ?? null;
}

/** The adjacent family only, same number of units, current and Um not lower. */
function nextFamilyOf(
  primary: ModelResult,
  results: ModelResult[],
): ModelResult | null {
  const nextId = NEXT_FAMILY[primary.seriesId];
  if (!nextId) return null;
  const cands = results.filter(
    (r) =>
      r.seriesId === nextId &&
      sameMachine(r, primary) &&
      r.currentA + 0.5 >= primary.currentA &&
      r.umKv + 0.1 >= primary.umKv,
  );
  if (!cands.length) return null;
  cands.sort((a, b) => {
    const aUm = Math.abs(a.umKv - primary.umKv) < 0.1 ? 0 : 1;
    const bUm = Math.abs(b.umKv - primary.umKv) < 0.1 ? 0 : 1;
    return aUm - bUm || a.umKv - b.umKv || a.currentA - b.currentA;
  });
  return cands[0] ?? null;
}

/**
 * Visible other options. Not padded to three.
 * Same-family next current, then the next Um, then one family up the ladder.
 */
export function pickOtherOptions(
  results: ModelResult[],
  n = 3,
): ModelResult[] {
  if (results.length <= 1) return [];
  const primary = results[0];
  const picked: ModelResult[] = [];
  const push = (row: ModelResult | null) => {
    if (!row) return;
    if (picked.some((x) => x.model === row.model)) return;
    picked.push(row);
  };
  push(stepUpOf(primary, results));
  push(nextUmOf(primary, results));
  push(nextFamilyOf(primary, results));
  // SHZV-1000 has no bigger III current and no 126 row in the list.
  // Still show the next single III. The page labels that row 综合保险.
  if (!picked.length) push(nextSingleIii(primary, results));
  return picked.slice(0, n);
}

/** Next single III above a family that has no same-series step left. */
function nextSingleIii(
  primary: ModelResult,
  results: ModelResult[],
): ModelResult | null {
  if (primary.seriesId !== "shzv" || primary.currentA + 0.5 < 1000) return null;
  const later = results.filter(
    (r) =>
      r.seriesId === "shzvg" &&
      sameMachine(r, primary) &&
      r.currentA + 0.5 >= primary.currentA &&
      r.umKv + 0.1 >= primary.umKv,
  );
  later.sort((a, b) => a.currentA - b.currentA || a.umKv - b.umKv);
  return later[0] ?? null;
}

/**
 * Label lines only. They do not change which model is the primary.
 * Past the line (`>`, so sitting on it still counts as 综合保险):
 * current 95%, step voltage 90% (orders leave a lower Ust ceiling by 0.91),
 * step capacity 95%, across-tap lightning / power frequency 95% when a
 * number was typed. Blank 自动 does not count.
 */
const CURRENT_LINE = 0.95;
const STEP_VOLTAGE_LINE = 0.9;
const STEP_CAPACITY_LINE = 0.95;
const INSULATION_LINE = 0.95;
const LINE_EPS = 1e-9;

export type MarginNeed = {
  acrossTapBilKv?: number;
  acrossTapPfKv?: number;
};

type DutyUse = { iUse: number; uUse: number; pUse: number; nUse: number };

function pastLine(use: number, line: number): boolean {
  return use > line + LINE_EPS;
}

/** Across-tap fill against this model's own withstand. No number → 0. */
function insulationUse(row: ModelResult, need?: MarginNeed): number {
  const bil = need?.acrossTapBilKv ?? 0;
  const pf = need?.acrossTapPfKv ?? 0;
  if (bil <= 0 && pf <= 0) return 0;
  const series = SERIES.find((s) => s.id === row.seriesId);
  let aLi = 0;
  let aPf = 0;
  if (series?.structure === "compound") {
    // Same fixed a-distance as compoundCoversAcrossTap.
    aLi = 200;
    aPf = 50;
  } else if (row.selectorSize) {
    const ins = internalInsulation(row.seriesId, row.selectorSize);
    aLi = ins?.a_li ?? 0;
    aPf = ins?.a_pf ?? 0;
  }
  let peak = 0;
  if (bil > 0 && aLi > 0) peak = Math.max(peak, bil / aLi);
  if (pf > 0 && aPf > 0) peak = Math.max(peak, pf / aPf);
  return peak;
}

/**
 * Display only. Does not choose a larger type.
 * True when current, Ust, step capacity, and a typed across-tap stress
 * all stay on or under their lines. 486 A on CV2-600 (81%) is still this
 * card. 342 A on CV2-350 (97%) is not.
 */
export function primaryIsInsurance(
  primary: ModelResult,
  dutyA: number,
  stepVoltageV: number,
  need?: MarginNeed,
): boolean {
  if (!(dutyA > 0) || !(primary.currentA > dutyA)) return false;
  const u = dutyUse(primary, dutyA, stepVoltageV, need);
  return (
    !pastLine(u.iUse, CURRENT_LINE) &&
    !pastLine(u.uUse, STEP_VOLTAGE_LINE) &&
    !pastLine(u.pUse, STEP_CAPACITY_LINE) &&
    !pastLine(u.nUse, INSULATION_LINE)
  );
}

function dutyUse(
  row: ModelResult,
  dutyA: number,
  stepVoltageV: number,
  need?: MarginNeed,
): DutyUse {
  const iUse = row.currentA > 0 ? dutyA / row.currentA : 1;
  const uUse =
    stepVoltageV > 0 && row.maxStepVoltageV && row.maxStepVoltageV > 0
      ? stepVoltageV / row.maxStepVoltageV
      : 0;
  const needKva = stepVoltageV > 0 ? (dutyA * stepVoltageV) / 1000 : 0;
  const pUse =
    needKva > 0 && row.stepCapacityKva && row.stepCapacityKva > 0
      ? needKva / row.stepCapacityKva
      : 0;
  return { iUse, uUse, pUse, nUse: insulationUse(row, need) };
}

/**
 * Same-series next current shares the step-voltage ceiling (CV2 350 and
 * 600 are both 2000 V) and the compound across-tap limit. It insures only
 * when current is the tight axis. 342 A on 350 qualifies. 188 A at 1949 V
 * does not — Ust is tighter.
 */
function currentStepInsures(
  primary: ModelResult,
  step: ModelResult,
  dutyA: number,
  stepVoltageV: number,
  need?: MarginNeed,
): boolean {
  const a = dutyUse(primary, dutyA, stepVoltageV, need);
  if (a.uUse >= a.iUse - 1e-9) return false;
  if (a.pUse >= a.iUse - 1e-9) return false;
  if (a.nUse >= a.iUse - 1e-9) return false;
  const b = dutyUse(step, dutyA, stepVoltageV, need);
  return b.iUse < a.iUse - 1e-9;
}

/** Next family insures when it lowers the worst axis, including across-tap. */
function familyInsures(
  primary: ModelResult,
  family: ModelResult,
  dutyA: number,
  stepVoltageV: number,
  need?: MarginNeed,
): boolean {
  const a = dutyUse(primary, dutyA, stepVoltageV, need);
  const b = dutyUse(family, dutyA, stepVoltageV, need);
  const peak = Math.max(a.iUse, a.uUse, a.pUse, a.nUse);
  const next = Math.max(b.iUse, b.uUse, b.pUse, b.nUse);
  return next < peak - 1e-9;
}

/**
 * Smallest row on `seriesId` that actually lowers the primary's peak.
 * Same Um first, then the lowest current. A same-amp CM2-600 does not
 * qualify when current is what is tight.
 */
function insuringOnFamily(
  seriesId: string,
  primary: ModelResult,
  results: ModelResult[],
  dutyA: number,
  stepVoltageV: number,
  need?: MarginNeed,
): ModelResult | null {
  const cands = results.filter(
    (r) =>
      r.seriesId === seriesId &&
      sameMachine(r, primary) &&
      r.currentA + 0.5 >= primary.currentA &&
      r.umKv + 0.1 >= primary.umKv &&
      familyInsures(primary, r, dutyA, stepVoltageV, need),
  );
  if (!cands.length) return null;
  cands.sort((a, b) => {
    const aUm = Math.abs(a.umKv - primary.umKv) < 0.1 ? 0 : 1;
    const bUm = Math.abs(b.umKv - primary.umKv) < 0.1 ? 0 : 1;
    return aUm - bUm || a.umKv - b.umKv || a.currentA - b.currentA;
  });
  return cands[0] ?? null;
}

/**
 * Model that wears 综合保险方案 beside a true minimum.
 * Same-family next current when that current is what is tight.
 * Otherwise the first later family that lowers the peak. A same-amp
 * neighbour does not count: CV2-600 and CM2-600 are both 600 A, so a
 * current past 95% continues to SHZV-1000. CM2 still wears the tag when
 * it is the axis that is tight (step voltage, step capacity, across-tap).
 * SHZV-1000 tags SHZVG. Null when the primary is already inside every line,
 * or when no later row lowers the peak.
 */
export function insuranceModel(
  results: ModelResult[],
  dutyA: number,
  stepVoltageV: number,
  need?: MarginNeed,
): string | null {
  const primary = results[0];
  if (!primary) return null;
  if (primaryIsInsurance(primary, dutyA, stepVoltageV, need)) return null;
  const step = stepUpOf(primary, results);
  if (step && currentStepInsures(primary, step, dutyA, stepVoltageV, need)) {
    return step.model;
  }
  const seen = new Set<string>();
  let seriesId: string | undefined = primary.seriesId;
  while (seriesId && !seen.has(seriesId)) {
    seen.add(seriesId);
    // Explicit type: assigning this back onto seriesId is TS7022, and next build fails on it.
    const nextId: string | undefined = NEXT_FAMILY[seriesId];
    if (!nextId) break;
    const hit = insuringOnFamily(
      nextId,
      primary,
      results,
      dutyA,
      stepVoltageV,
      need,
    );
    if (hit) return hit.model;
    seriesId = nextId;
  }
  const single = nextSingleIii(primary, results);
  if (single && familyInsures(primary, single, dutyA, stepVoltageV, need)) {
    return single.model;
  }
  return null;
}

/**
 * 满足最低要求 when any axis is past its line.
 * No bigger catalogue step does not rename a snug rating to 综合保险.
 * 684 A on SHZV-1000 is under 95%, so the card itself stays 综合保险.
 */
export function showsMinimumLabel(loose: boolean): boolean {
  return !loose;
}

/**
 * One other row. Inside every line: the same-family next current only
 * (300 A → CV2-600, not CM2), and the page does not tag it.
 * Past a line: only the model insuranceModel names. No next Um.
 */
export function optionsWithInsurance(
  results: ModelResult[],
  dutyA: number,
  stepVoltageV: number,
  n = 3,
  need?: MarginNeed,
): ModelResult[] {
  const primary = results[0];
  if (!primary) return [];
  const id = insuranceModel(results, dutyA, stepVoltageV, need);
  if (id) {
    const found = results.find((r) => r.model === id);
    return found ? [found].slice(0, n) : [];
  }
  const step = stepUpOf(primary, results);
  return step ? [step].slice(0, n) : [];
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
  /** UI chips: 66 / 110 star → 72.5; 220 star → 252. Fixtures keep explicit Um for the fill-Um path. */
  preset66: {
    input: {
      mounting: "in_tank" as const,
      medium: "oil_vacuum" as const,
      preferVacuum: true,
      phases: "III" as const,
      connection: "Y" as const,
      throughCurrentA: 350,
      umKv: 72.5,
      stepVoltageV: 1000,
      regulation: "reversing" as const,
      plusMinusSteps: 8,
      positions: 19,
      midPositions: 3 as const,
      pitch: 10 as const,
      mdu: "none" as const,
    },
    expectModel: "CV2III-350Y/72.5-10193W",
  },
  preset110: {
    input: {
      mounting: "in_tank" as const,
      medium: "oil_vacuum" as const,
      preferVacuum: true,
      phases: "III" as const,
      connection: "Y" as const,
      throughCurrentA: 400,
      umKv: 126,
      stepVoltageV: 1400,
      regulation: "reversing" as const,
      plusMinusSteps: 8,
      positions: 19,
      midPositions: 3 as const,
      pitch: 10 as const,
      mdu: "none" as const,
    },
    expectModel: "CV2III-600Y/126-10193W",
  },
  preset220: {
    input: {
      mounting: "in_tank" as const,
      medium: "oil_vacuum" as const,
      preferVacuum: true,
      phases: "III" as const,
      connection: "Y" as const,
      throughCurrentA: 500,
      umKv: 252,
      stepVoltageV: 1800,
      regulation: "reversing" as const,
      plusMinusSteps: 8,
      positions: 19,
      midPositions: 3 as const,
      pitch: 10 as const,
      mdu: "none" as const,
    },
    expectModel: "CM2III-500Y/252D-10193W",
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
  /** Training case 2 — 489.7 A stays on CM2-500; 600 is the insurance step. Grade C from across-tap BIL 285. */
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
    expectModel: "CM2III-500Y/72.5C-10193W",
  },
  /** Training case 5 — CV2-600D/145 */
  /**
   * Training case 5 — CV2 @ 145 kV Δ, 12-contact path.
   * Brochure: max Ust 1500 V @ 12 contacts (not 1650). Use 1500 so CV2 remains valid.
   */
  case5Cv2_145: {
    input: {
      mounting: "in_tank" as const,
      medium: "oil_vacuum" as const,
      preferVacuum: true,
      phases: "III" as const,
      connection: "D" as const,
      throughCurrentA: 346.34,
      umKv: 145,
      stepVoltageV: 1500,
      regulation: "reversing" as const,
      positions: 23,
      midPositions: 3 as const,
      pitch: 12 as const,
      acrossTapBilKv: 200,
      acrossTapPfKv: 50,
      mdu: "none" as const,
    },
    expectModel: "CV2III-350D/145-12233W",
  },
  /**
   * Training sheet: 220 MVA Δ, I≈626 → 3×CM2I-800.
   * Combined III is star-point only — do not emit SHZVIII-1000D.
   */
  case7Cm2I800: {
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
    expectModel: "3xCM2I-800/72.5C-10191W",
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
