"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import {
  ACROSS_BIL_MENU,
  ACROSS_BIL_OPTIONS_KV,
  ACROSS_PF_MENU,
  ACROSS_PF_OPTIONS_KV,
  CURRENT_MENU,
  SERIES,
  STEP_VOLTAGE_MENU,
  STEP_VOLTAGE_OPTIONS_V,
} from "@/lib/catalog";
import { copyText } from "@/lib/clipboard";
import {
  DEFAULT_WINDING_RATED_KV,
  WINDING_RATED_KV,
  formatUmKv,
  maxThroughCurrent,
  oltcUmFromRatedKv,
  stepVoltageFromPercent,
  throughCurrentFromRated,
} from "@/lib/deriveUm";

import {
  insuranceModel,
  optionsWithInsurance,
  primaryIsInsurance,
  showsMinimumLabel,
  selectOltc,
} from "@/lib/engine";
import { safetyKKeepsCapacity } from "@/lib/safetyK";
import {
  defaultMid,
  defaultPitch,
  lookupByPositions,
  lookupDiagram,
  midControl,
  pitchFromPlusMinus,
  pmStepOptionsFor,
  positionsFor,
  preferredMid,
  type ParsedTapRange,
} from "@/lib/tapCode";
import { LangSwitcher } from "@/components/LangSwitcher";
import { UpSelect } from "@/components/UpSelect";
import { useAppLang } from "@/components/LangProvider";
import {
  currentLabel,
  setAppLang,
  t,
  type Lang,
} from "@/lib/i18n";
import {
  OCTC_SERIES_ROMANS,
  type ModelResult,
  type SelectInput,
  type SelectOutput,
  type StructureKind,
} from "@/lib/types";

/** Apply brochure (±N, mid) geometry onto a SelectInput patch. */
function mediumFor(
  mounting: SelectInput["mounting"],
  preferVacuum: boolean,
): SelectInput["medium"] {
  if (mounting === "dry_type") return "dry";
  return preferVacuum ? "oil_vacuum" : "oil";
}

function geometryForPm(
  n: number,
  regulation: SelectInput["regulation"],
  mid?: 1 | 3,
): Pick<SelectInput, "plusMinusSteps" | "positions" | "midPositions" | "pitch"> {
  const m = mid ?? preferredMid(n, regulation);
  const row = lookupDiagram(n, m, regulation);
  return {
    plusMinusSteps: n,
    midPositions: m,
    positions: row?.positions ?? positionsFor(n, m),
    pitch: (row?.pitch ?? pitchFromPlusMinus(n, m)) as 10 | 12 | 14 | 16 | 18,
  };
}

const MVA_OPTIONS = [
  16, 25, 31.5, 40, 50, 63, 80, 100, 160, 250, 400, 500,
] as const;
const STEP_PERCENT_OPTIONS = [
  0.5, 0.625, 0.8, 1, 1.25, 1.5, 1.67, 2, 2.25, 2.5, 2.75, 3, 3.33, 4, 5, 6.25,
  7.5, 10,
] as const;
const TAP_SIDE_OPTIONS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
] as const;
const SAFETY_K_OPTIONS = [
  1, 1.1, 1.15, 1.2, 1.25, 1.3, 1.35, 1.4, 1.5, 1.6, 1.7, 1.8,
] as const;

const defaultInput: SelectInput = {
  mounting: "in_tank",
  medium: "oil_vacuum",
  preferVacuum: true,
  phases: "III",
  connection: "Y",
  throughCurrentA: 400,
  umKv: 0,
  stepVoltageV: 1500,
  regulation: "reversing",
  // Brochure default: ±8 mid3 → 10193W (most common); must stay in sync with `pm`
  plusMinusSteps: 8,
  positions: 19,
  pitch: 10,
  midPositions: 3,
  selectorSize: "auto",
  preferStructure: "auto",
  mdu: "none",
  dutyKind: "oltc",
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function CaptionSub({
  name,
  sub,
  eq,
  value,
  unit,
  raised = false,
}: {
  name: string;
  sub: string;
  eq?: boolean;
  value: string;
  unit: string;
  /** Um's m sits on the top of the letter. Imax and Ust stay calculated subscripts. */
  raised?: boolean;
}) {
  const mark = raised ? (
    <span className="ml-px align-top text-[0.62em] leading-none" data-caption={sub}>
      {sub}
    </span>
  ) : (
    <sub className="relative top-[0.22em] ml-px text-[0.62em] leading-none" data-caption={sub}>
      {sub}
    </sub>
  );
  return (
    <>
      {name}
      {mark}
      {eq !== false ? " = " : " "}
      {value}
      {unit}
    </>
  );
}

/** Comfortable control — one hover signal (border), shared height */
const controlClass =
  "h-11 w-full min-w-0 rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] bg-white px-3 text-[0.9rem] leading-snug text-[var(--color-ink)] transition-colors duration-150 hover:border-[var(--color-accent)] focus:border-[var(--color-accent)] focus:outline-none";

/** Same white field as the menus. The accent border is the only selected mark. */
function segBtn(on: boolean) {
  return cx(
    "inline-flex h-11 items-center justify-center rounded-[var(--radius-sm)] border bg-white text-[0.9rem] text-[var(--color-ink)] transition-colors duration-150",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
    on
      ? "border-[var(--color-accent)] font-medium"
      : "border-[var(--color-rule-2)] hover:border-[var(--color-accent)]",
  );
}

function Field({
  label,
  tip,
  meta,
  children,
  className,
  action,
  actionKind = "caption",
  as = "label",
}: {
  label: string;
  tip?: string;
  /** Same-row note (e.g. 最大 251 A) — does not add a second line. */
  meta?: string;
  children: React.ReactNode;
  className?: string;
  /** Far-right of the label row */
  action?: React.ReactNode;
  /** caption = Imax/Um/Ust; plain = capacity/current pills */
  actionKind?: "caption" | "plain";
  /** Button groups must not use <label> — a click on the tip would fire the first button. */
  as?: "label" | "div";
}) {
  const Tag = as;
  return (
    <Tag className={cx("flex min-w-0 flex-col gap-2 overflow-visible", className)}>
      <span className="flex h-[1.625rem] flex-nowrap items-center gap-2 overflow-visible">
        <span
          className={cx(
            "shrink-0 whitespace-nowrap text-[0.8125rem] leading-snug font-medium text-[var(--color-ink)]",
          )}
        >
          {label.split("ᵤ").map((part, i, arr) =>
            i < arr.length - 1 ? (
              <span key={i}>
                {part}
                <sub className="text-[0.7em]">u</sub>
              </span>
            ) : (
              part
            ),
          )}
        </span>
        {meta ? (
          <span className="min-w-0 truncate text-[0.75rem] leading-none tabular-nums text-[var(--color-muted)]">
            {meta}
          </span>
        ) : (
          <span className="min-w-0 flex-1" />
        )}
        {action ? (
          <span
            className={cx(
              "ml-auto shrink-0",
              actionKind === "caption" &&
                "whitespace-nowrap text-[0.75rem] leading-none tabular-nums text-[var(--color-caption)]",
            )}
          >
            {action}
          </span>
        ) : null}
      </span>
      {children}
      {tip ? (
        <span className="text-[0.75rem] leading-snug text-[var(--color-muted)]">
          {tip}
        </span>
      ) : null}
    </Tag>
  );
}

/** Break a type string after "-" and "/", never in the middle of a token. */
function modelNodes(model: string) {
  return model.split(/([-/])/).map((part, i) =>
    part === "-" || part === "/" ? (
      <span key={i}>
        {part}
        <wbr />
      </span>
    ) : (
      part
    ),
  );
}

function formatAmps(a: number): string {
  if (!Number.isFinite(a) || a <= 0) return "";
  const r = Math.round(a * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/** Ceiling tip from in-tank vacuum III axes only (not dry-type 160 A). */
export function SelectorApp() {
  const lang = useAppLang();
  const setLang = setAppLang;
  const [input, setInput] = useState<SelectInput>(defaultInput);
  const [pm, setPm] = useState("8");
  /** Default: fill transformer / tap-winding voltage; engine still gets OLTC Um. */
  const [voltageMode, setVoltageMode] = useState<"winding" | "equipment">(
    "winding",
  );
  const [windingRatedKv, setWindingRatedKv] = useState(
    DEFAULT_WINDING_RATED_KV,
  );
  const [currentMode, setCurrentMode] = useState<"current" | "capacity">(
    "capacity",
  );
  const [transformerMva, setTransformerMva] = useState(25);
  const [mvaCustom, setMvaCustom] = useState(false);
  const [kvCustom, setKvCustom] = useState(false);
  const [tapPlus, setTapPlus] = useState(8);
  const [tapMinus, setTapMinus] = useState(8);
  const [stepPercentPct, setStepPercentPct] = useState(1.25);
  const [stepPctCustom, setStepPctCustom] = useState(false);
  const [safetyK, setSafetyK] = useState(1);
  const [safetyKCustom, setSafetyKCustom] = useState(false);
  const [tapRange, setTapRange] = useState<ParsedTapRange | null>(null);
  const [altsOpen, setAltsOpen] = useState(false);
  const [openAlts, setOpenAlts] = useState<string[]>([]);
  const [copiedModel, setCopiedModel] = useState<string | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [result, setResult] = useState<SelectOutput | null>(null);
  /** Through-current actually sent on the last successful sizing. */
  const [pickedDutyA, setPickedDutyA] = useState<number | null>(null);
  const [pickedStepV, setPickedStepV] = useState(0);
  const [resultKey, setResultKey] = useState(0);
  const [hasRun, setHasRun] = useState(false);
  const [stale, setStale] = useState(false);
  const [running, setRunning] = useState(false);
  const runTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultPaneRef = useRef<HTMLElement | null>(null);

  const isOctc = (input.dutyKind ?? "oltc") === "octc";
  const isLinear = isOctc || input.regulation === "linear";

  const touch = () => {
    if (hasRun) setStale(true);
  };

  const commitSafetyK = (n: number) => {
    setSafetyK(n);
    const nextMode = safetyKKeepsCapacity({
      currentMode,
      transformerMva,
      windingRatedKv,
    });
    if (nextMode !== currentMode) {
      setCurrentMode(nextMode);
      if (nextMode === "capacity" && voltageMode !== "winding") {
        setVoltageMode("winding");
      }
    }
    touch();
  };

  const patch = <K extends keyof SelectInput>(k: K, v: SelectInput[K]) => {
    setInput((s) => {
      const next = { ...s, [k]: v };
      if (k === "connection" && voltageMode === "winding") {
        next.umKv = 0;
      }
      return next;
    });
    touch();
  };

  const setVoltageEntry = (mode: "winding" | "equipment") => {
    if (mode === voltageMode) return;
    setVoltageMode(mode);
    if (mode === "winding") {
      setWindingRatedKv((kv) => (kv > 0 ? kv : DEFAULT_WINDING_RATED_KV));
      setInput((s) => ({ ...s, umKv: 0 }));
    } else {
      setWindingRatedKv(0);
      setInput((s) => ({ ...s, umKv: 0 }));
      if (currentMode === "capacity") setCurrentMode("current");
    }
    touch();
  };

  const setCurrentEntry = (mode: "current" | "capacity") => {
    if (mode === currentMode) return;
    setCurrentMode(mode);
    if (mode === "capacity" && voltageMode !== "winding") {
      setVoltageEntry("winding");
      return;
    }
    touch();
  };

  const setVoltageKv = (kv: number) => {
    if (voltageMode === "winding") {
      setWindingRatedKv(kv);
      setInput((s) => ({ ...s, umKv: 0 }));
    } else {
      setWindingRatedKv(0);
      patch("umKv", kv);
      return;
    }
    touch();
  };

  const setRegulation = (reg: SelectInput["regulation"]) => {
    touch();
    if (reg === "linear") {
      setPm("");
      const plus = tapPlus > 0 ? tapPlus : 4;
      const minus = tapMinus > 0 ? tapMinus : 4;
      setTapPlus(plus);
      setTapMinus(minus);
      const range: ParsedTapRange = {
        plus,
        minus,
        positions: plus + minus + 1,
        stepPercent: stepPercentPct > 0 ? stepPercentPct / 100 : null,
      };
      setTapRange(range);
      setInput((s) => ({
        ...s,
        regulation: reg,
        plusMinusSteps: undefined,
        positions: range.positions,
        midPositions: 0,
        pitch: defaultPitch(range.positions, "linear") as
          | 10
          | 12
          | 14
          | 16
          | 18,
      }));
      return;
    }
    // G brochure set starts at ±8; clamp small W-only steps when switching to G
    const allowed = pmStepOptionsFor(reg);
    let n = pm && Number(pm) > 0 ? Number(pm) : 8;
    if (!allowed.includes(n)) n = allowed[0] ?? 8;
    setPm(String(n));
    setInput((s) => ({
      ...s,
      regulation: reg,
      ...geometryForPm(n, reg),
    }));
  };

  const commitTapRange = (
    plus: number,
    minus: number,
    pct: number,
  ) => {
    if (!(plus > 0) || !(minus > 0)) {
      setTapRange(null);
      return;
    }
    const range: ParsedTapRange = {
      plus,
      minus,
      positions: plus + minus + 1,
      stepPercent: pct > 0 ? pct / 100 : null,
    };
    setTapRange(range);
    setInput((s) => ({
      ...s,
      positions: range.positions,
      plusMinusSteps: undefined,
      midPositions: s.regulation === "linear" ? 0 : 1,
      pitch: defaultPitch(range.positions, s.regulation) as
        | 10
        | 12
        | 14
        | 16
        | 18,
    }));
  };

  const applyPm = (raw: string) => {
    setPm(raw);
    touch();
    if (!raw) {
      const n = Number(pm) > 0 ? Number(pm) : 8;
      setTapPlus(n);
      setTapMinus(n);
      setStepPercentPct(1.25);
      commitTapRange(n, n, 1.25);
      return;
    }
    setTapRange(null);
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return;
    // Always snap to brochure preferred mid for this ±N.
    // Carrying mid=1 from ±4…±7 onto ±8 would silently emit 18171W
    // instead of commercial 10193W (P=19, mid3).
    setInput((s) => ({
      ...s,
      ...geometryForPm(n, s.regulation),
    }));
  };

  const applyMid = (raw: string) => {
    const mid = (Number(raw) === 1 ? 1 : 3) as 1 | 3;
    touch();
    setInput((s) => {
      const n = s.plusMinusSteps;
      if (n != null && n > 0) {
        // Mid is part of the connection diagram: P and pitch must follow
        return { ...s, ...geometryForPm(n, s.regulation, mid) };
      }
      // Custom P: keep position count, take pitch from the matching Fig. 3-3 row.
      const positions = s.positions ?? 19;
      const row = lookupByPositions(positions, mid, s.regulation);
      return {
        ...s,
        midPositions: mid,
        pitch: (row?.pitch ?? s.pitch ?? 10) as 10 | 12 | 14 | 16 | 18,
      };
    });
  };

  const stepFraction = (): number | null => {
    if (tapRange?.stepPercent && tapRange.stepPercent > 0) {
      return tapRange.stepPercent;
    }
    if (stepPercentPct > 0) return stepPercentPct / 100;
    return null;
  };

  const minusSteps = (): number => {
    if (tapRange && tapRange.minus > 0) return tapRange.minus;
    const n = pm && Number(pm) > 0 ? Number(pm) : input.plusMinusSteps;
    if (n != null && n > 0) return n;
    return 0;
  };

  const capacityThroughA = (): number | null => {
    if (!(transformerMva > 0) || !(windingRatedKv > 0)) return null;
    const rated = throughCurrentFromRated(
      transformerMva,
      windingRatedKv,
      input.connection,
    );
    if (!Number.isFinite(rated) || rated <= 0) return null;
    const minus = minusSteps();
    const pct = stepFraction();
    const iMax =
      minus > 0 && pct != null && pct > 0
        ? maxThroughCurrent(rated, minus, pct)
        : rated;
    const k = safetyK > 0 ? safetyK : 1;
    return iMax * k;
  };

  const computedStepVoltage = (): number | null => {
    const pct = stepFraction();
    if (!(windingRatedKv > 0) || pct == null || !(pct > 0)) return null;
    const v = stepVoltageFromPercent(
      windingRatedKv,
      pct,
      input.connection,
    );
    return Number.isFinite(v) && v > 0 ? v : null;
  };

  const withOctcSeries = (duty: SelectInput): SelectInput => {
    if ((duty.dutyKind ?? "oltc") !== "octc") return duty;
    const series =
      duty.octcSeries && duty.octcSeries !== "auto"
        ? duty.octcSeries
        : "IV";
    return {
      ...duty,
      octcSeries: series,
      preferVacuum: false,
      medium: "oil",
    };
  };

  const dutyForSelect = ():
    | SelectInput
    | { error: true; msgKey: string } => {
    if (currentMode === "capacity") {
      if (!(transformerMva > 0)) return { error: true, msgKey: "needMva" };
      if (!(windingRatedKv > 0)) return { error: true, msgKey: "needRated" };
      const i = capacityThroughA();
      if (i == null) return { error: true, msgKey: "needMva" };
      const ust = computedStepVoltage();
      return withOctcSeries({
        ...input,
        throughCurrentA: i,
        // Catalogue switch Um (same number the caption shows), not Un/√3.
        umKv: oltcUmFromRatedKv(windingRatedKv, input.connection),
        ...(ust != null ? { stepVoltageV: ust } : {}),
      });
    }
    if (voltageMode === "winding") {
      if (!(windingRatedKv > 0)) return { error: true, msgKey: "needRated" };
      const ust = computedStepVoltage();
      return withOctcSeries({
        ...input,
        umKv: oltcUmFromRatedKv(windingRatedKv, input.connection),
        ...(ust != null ? { stepVoltageV: ust } : {}),
      });
    }
    if (!(input.umKv > 0)) return { error: true, msgKey: "needUm" };
    return withOctcSeries({ ...input, umKv: input.umKv });
  };

  const runSelect = () => {
    if (runTimer.current) clearTimeout(runTimer.current);
    setRunning(true);
    setAltsOpen(false);
    setOpenAlts([]);
    runTimer.current = setTimeout(() => {
      const duty = dutyForSelect();
      if ("error" in duty) {
        const msg = t(lang, duty.msgKey);
        setPickedDutyA(null);
        setPickedStepV(0);
        setResult({
          ok: false,
          results: [],
          errorsEn: [msg],
          errorsZh: [msg],
        });
        setResultKey((k) => k + 1);
        setHasRun(true);
        setStale(false);
        setRunning(false);
        return;
      }
      setPickedDutyA(duty.throughCurrentA);
      setPickedStepV(duty.stepVoltageV > 0 ? duty.stepVoltageV : 0);
      const out = selectOltc(duty);
      setResult(out);
      setResultKey((k) => k + 1);
      setHasRun(true);
      setStale(false);
      setRunning(false);
      setAltsOpen(out.ok && out.results.length > 1);
      // Narrow screens stack the answer above the form — bring it back into view.
      if (
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 1023px)").matches
      ) {
        window.setTimeout(() => {
          resultPaneRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 40);
      }
    }, 280);
  };

  useEffect(() => {
    return () => {
      if (runTimer.current) clearTimeout(runTimer.current);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : lang;
  }, [lang]);

  useEffect(() => {
    setOpenAlts([]);
  }, [resultKey]);

  const copyModel = async (text: string) => {
    const ok = await copyText(text);
    if (!ok) return;
    setCopiedModel(text);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopiedModel(null), 2000);
  };

  const primary = result?.ok ? result.results[0] : null;
  const loose =
    primary != null &&
    pickedDutyA != null &&
    primaryIsInsurance(primary, pickedDutyA, pickedStepV);
  const alts =
    result?.ok && pickedDutyA != null
      ? optionsWithInsurance(result.results, pickedDutyA, pickedStepV, 3)
      : [];
  const insuranceAlt =
    result?.ok && pickedDutyA != null
      ? insuranceModel(result.results, pickedDutyA, pickedStepV)
      : null;
  const posHint =
    !isLinear && input.positions != null
      ? t(lang, "posHint", { n: input.positions })
      : null;

  const pmOptions = pmStepOptionsFor(input.regulation);
  const pmN =
    pm && Number(pm) > 0
      ? Number(pm)
      : input.plusMinusSteps && input.plusMinusSteps > 0
        ? input.plusMinusSteps
        : null;
  const midCtrl = !pm
    ? { show: false, options: [] as Array<1 | 3> }
    : midControl(pmN, input.regulation, input.positions);
  const midOpts = midCtrl.options;
  const derivedA = currentMode === "capacity" ? capacityThroughA() : null;
  const derivedOk =
    derivedA != null && Number.isFinite(derivedA) && derivedA > 0;
  const ustV = computedStepVoltage();
  const um =
    voltageMode === "winding" && windingRatedKv > 0
      ? oltcUmFromRatedKv(windingRatedKv, input.connection)
      : NaN;

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col lg:grid lg:h-dvh lg:grid-cols-2 lg:overflow-hidden">
        <form
          className="pane-in pane-in-late order-2 flex min-w-0 flex-col overflow-y-auto bg-[#f4f7fb] px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-7 sm:py-8 lg:col-start-2 lg:row-start-1 lg:h-dvh lg:min-h-0 lg:px-8 lg:py-6"
          onSubmit={(e) => {
            e.preventDefault();
            runSelect();
          }}
        >
          <div className="mx-auto my-auto w-full">
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 className="shrink-0 whitespace-nowrap font-[family-name:var(--font-display)] text-[0.9375rem] font-semibold leading-none text-[var(--color-ink)]">
              {t(lang, "duty")}
            </h2>
            <LangSwitcher
              lang={lang}
              onChange={setLang}
              ariaLabel={t(lang, "langAria")}
            />
          </div>

          <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
            <Field
              as="div"
              label={
                currentMode === "capacity"
                  ? t(lang, "transformerMva")
                  : t(lang, "throughCurrent")
              }
              action={
                currentMode === "capacity" && derivedOk && derivedA != null ? (
                  <CaptionSub
                    name="I"
                    sub="max"
                    value={formatAmps(derivedA)}
                    unit="A"
                  />
                ) : undefined
              }
            >
              {currentMode === "capacity" ? (
                <div className="relative">
                  {mvaCustom ||
                  (transformerMva > 0 &&
                    !(MVA_OPTIONS as readonly number[]).includes(
                      transformerMva,
                    )) ? (
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={0.1}
                      className={`${controlClass} pr-12 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                      value={transformerMva > 0 ? String(transformerMva) : ""}
                      placeholder={t(lang, "mvaPlaceholder")}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === "") {
                          setTransformerMva(0);
                          touch();
                          return;
                        }
                        const n = Number(raw);
                        if (!Number.isFinite(n) || n < 0) return;
                        setTransformerMva(n);
                        touch();
                      }}
                      onBlur={() => {
                        if (
                          (MVA_OPTIONS as readonly number[]).includes(
                            transformerMva,
                          )
                        ) {
                          setMvaCustom(false);
                        }
                      }}
                    />
                  ) : (
                    <select
                      className={controlClass}
                      value={
                        transformerMva > 0 ? String(transformerMva) : ""
                      }
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setMvaCustom(true);
                          return;
                        }
                        if (e.target.value === "__current__") {
                          setCurrentEntry("current");
                          return;
                        }
                        setTransformerMva(Number(e.target.value));
                        setMvaCustom(false);
                        touch();
                      }}
                    >
                      <option value="__custom__">{t(lang, "custom")}</option>
                      <option value="__current__">
                        {t(lang, "switchToCurrent")}
                      </option>
                      {MVA_OPTIONS.map((n) => (
                        <option key={n} value={String(n)}>
                          {n} MVA
                        </option>
                      ))}
                    </select>
                  )}
                  {mvaCustom ||
                  (transformerMva > 0 &&
                    !(MVA_OPTIONS as readonly number[]).includes(
                      transformerMva,
                    )) ? (
                    <span className="pointer-events-none absolute top-0 right-3 flex h-11 items-center text-[0.75rem] text-[var(--color-muted)]">
                      MVA
                    </span>
                  ) : null}
                </div>
              ) : (
                <select
                  className={controlClass}
                  value={String(input.throughCurrentA)}
                  onChange={(e) => {
                    if (e.target.value === "__capacity__") {
                      setCurrentEntry("capacity");
                      return;
                    }
                    patch("throughCurrentA", Number(e.target.value));
                  }}
                >
                  <option value="__capacity__">
                    {t(lang, "switchToCapacity")}
                  </option>
                  {CURRENT_MENU.map((c) => (
                    <option key={c.value} value={c.value}>
                      {currentLabel(lang, c.labelZh, c.labelEn)}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <Field
              as="div"
              label={t(lang, "umWinding")}
              action={
                Number.isFinite(um) && um > 0 ? (
                  <CaptionSub
                    name="U"
                    sub="m"
                    raised
                    value={formatUmKv(um)}
                    unit="kV"
                  />
                ) : undefined
              }
            >
              <div className="relative">
                {kvCustom ||
                (windingRatedKv > 0 &&
                  !(WINDING_RATED_KV as readonly number[]).includes(
                    windingRatedKv,
                  )) ? (
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.1}
                    className={`${controlClass} pr-12 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                    value={windingRatedKv > 0 ? String(windingRatedKv) : ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        setVoltageKv(0);
                        return;
                      }
                      const n = Number(raw);
                      if (!Number.isFinite(n) || n < 0) return;
                      setVoltageKv(n);
                    }}
                    onBlur={() => {
                      if (
                        (WINDING_RATED_KV as readonly number[]).includes(
                          windingRatedKv,
                        )
                      ) {
                        setKvCustom(false);
                      }
                    }}
                  />
                ) : (
                  <select
                    className={controlClass}
                    value={windingRatedKv > 0 ? String(windingRatedKv) : ""}
                    onChange={(e) => {
                      if (e.target.value === "__custom__") {
                        setKvCustom(true);
                        return;
                      }
                      setKvCustom(false);
                      setVoltageKv(Number(e.target.value));
                    }}
                  >
                    <option value="__custom__">{t(lang, "custom")}</option>
                    {WINDING_RATED_KV.map((v) => (
                      <option key={v} value={v}>
                        {v} kV
                      </option>
                    ))}
                  </select>
                )}
                {kvCustom ||
                (windingRatedKv > 0 &&
                  !(WINDING_RATED_KV as readonly number[]).includes(
                    windingRatedKv,
                  )) ? (
                  <span className="pointer-events-none absolute top-0 right-3 flex h-11 items-center text-[0.75rem] text-[var(--color-muted)]">
                    kV
                  </span>
                ) : null}
              </div>
            </Field>

            <Field as="div" label={t(lang, "connection")}>
              <select
                className={controlClass}
                value={input.connection}
                onChange={(e) =>
                  patch(
                    "connection",
                    e.target.value as SelectInput["connection"],
                  )
                }
              >
                <option value="Y">{t(lang, "connY")}</option>
                <option value="D">{t(lang, "connD")}</option>
                <option value="any">{t(lang, "connAny")}</option>
              </select>
            </Field>

            {isOctc ? (
              <Field label={t(lang, "octcSeries")}>
                <select
                  className={controlClass}
                  value={
                    input.octcSeries && input.octcSeries !== "auto"
                      ? input.octcSeries
                      : "IV"
                  }
                  onChange={(e) =>
                    patch(
                      "octcSeries",
                      e.target.value as SelectInput["octcSeries"],
                    )
                  }
                >
                  {OCTC_SERIES_ROMANS.map((r) => (
                    <option key={r} value={r}>
                      {t(lang, `octc${r}`)}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label={t(lang, "regulation")}>
                <select
                  className={controlClass}
                  value={input.regulation}
                  onChange={(e) =>
                    setRegulation(e.target.value as SelectInput["regulation"])
                  }
                >
                  <option value="reversing">{t(lang, "regW")}</option>
                  <option value="coarse_fine">{t(lang, "regG")}</option>
                  <option value="linear">{t(lang, "regLinear")}</option>
                </select>
              </Field>
            )}

            {isLinear ? null : (
              <Field
                as="div"
                label={t(lang, "pmSteps")}
                action={posHint && pm ? posHint : undefined}
              >
                <select
                  className={controlClass}
                  value={pm}
                  onChange={(e) => applyPm(e.target.value)}
                >
                  <option value="">{t(lang, "customPos")}</option>
                  {pmOptions.map((n) => (
                    <option key={n} value={String(n)}>
                      ±{n}
                      {lang === "zh" ? " 级" : lang === "ru" ? " ст." : ""}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field
              as="div"
              label={t(lang, "stepPercent")}
              action={
                ustV != null ? (
                  <CaptionSub
                    name="U"
                    sub="st"
                    value={String(Math.round(ustV))}
                    unit="V"
                  />
                ) : undefined
              }
            >
              <div className="relative">
                {stepPctCustom ||
                (stepPercentPct > 0 &&
                  !(STEP_PERCENT_OPTIONS as readonly number[]).includes(
                    stepPercentPct,
                  )) ? (
                  <input
                    inputMode="decimal"
                    className={`${controlClass} pr-8 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                    value={stepPercentPct > 0 ? String(stepPercentPct) : ""}
                    onChange={(e) => {
                      const v = e.target.value.replace(/，/g, ".");
                      if (v !== "" && !/^\d*\.?\d*$/.test(v)) return;
                      if (v === "" || v === ".") {
                        setStepPercentPct(0);
                        touch();
                        return;
                      }
                      const n = Number(v);
                      if (!Number.isFinite(n) || n < 0) return;
                      setStepPercentPct(n);
                      touch();
                      if (isLinear || !pm) commitTapRange(tapPlus, tapMinus, n);
                    }}
                    onBlur={() => {
                      if (
                        (STEP_PERCENT_OPTIONS as readonly number[]).includes(
                          stepPercentPct,
                        )
                      ) {
                        setStepPctCustom(false);
                      }
                    }}
                  />
                ) : (
                  <select
                    className={controlClass}
                    value={
                      stepPercentPct > 0 ? String(stepPercentPct) : ""
                    }
                    onChange={(e) => {
                      if (e.target.value === "__custom__") {
                        setStepPctCustom(true);
                        return;
                      }
                      const n = Number(e.target.value);
                      setStepPercentPct(n);
                      setStepPctCustom(false);
                      touch();
                      if (isLinear || !pm) {
                        commitTapRange(tapPlus, tapMinus, n);
                      }
                    }}
                  >
                    <option value="__custom__">{t(lang, "custom")}</option>
                    {STEP_PERCENT_OPTIONS.map((n) => (
                      <option key={n} value={String(n)}>
                        {n}%
                      </option>
                    ))}
                  </select>
                )}
                {stepPctCustom ||
                (stepPercentPct > 0 &&
                  !(STEP_PERCENT_OPTIONS as readonly number[]).includes(
                    stepPercentPct,
                  )) ? (
                  <span className="pointer-events-none absolute top-0 right-3 flex h-11 items-center text-[0.9rem] text-[var(--color-ink)]">
                    %
                  </span>
                ) : null}
              </div>
            </Field>

            {isLinear || !pm ? (
              <>
                <Field
                  as="div"
                  label={t(lang, "positions")}
                  action={
                    input.positions != null
                      ? t(lang, "posHint", { n: input.positions })
                      : undefined
                  }
                >
                  <div className="grid grid-cols-2 gap-2">
                      <select
                        className={controlClass}
                        value={tapPlus > 0 ? String(tapPlus) : ""}
                        onChange={(e) => {
                          const plus = Number(e.target.value);
                          setTapPlus(plus);
                          touch();
                          commitTapRange(plus, tapMinus, stepPercentPct);
                        }}
                        aria-label="+"
                      >
                        {TAP_SIDE_OPTIONS.map((n) => (
                          <option key={`p${n}`} value={String(n)}>
                            +{n}
                          </option>
                        ))}
                      </select>
                      <select
                        className={controlClass}
                        value={tapMinus > 0 ? String(tapMinus) : ""}
                        onChange={(e) => {
                          const minus = Number(e.target.value);
                          setTapMinus(minus);
                          touch();
                          commitTapRange(tapPlus, minus, stepPercentPct);
                        }}
                        aria-label="−"
                      >
                        {TAP_SIDE_OPTIONS.map((n) => (
                          <option key={`m${n}`} value={String(n)}>
                            −{n}
                          </option>
                        ))}
                      </select>
                    </div>
                </Field>
              </>
            ) : null}

            {midCtrl.show ? (
              <Field label={t(lang, "mid")}>
                <select
                  className={controlClass}
                  value={String(
                    midOpts.includes((input.midPositions as 1 | 3) ?? 3)
                      ? input.midPositions
                      : midOpts[0] ?? 3,
                  )}
                  onChange={(e) => applyMid(e.target.value)}
                >
                  {midOpts.map((m) => (
                    <option key={m} value={String(m)}>
                      {m === 1 ? t(lang, "midOpt1") : t(lang, "midOpt3")}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            {/* Volt picker only when tap % cannot derive Ust (Um mode, no rated kV). */}
            {ustV == null ? (
            <Field
              label={t(lang, "ust")}
            >
              <select
                className={controlClass}
                value={
                  STEP_VOLTAGE_OPTIONS_V.includes(
                    input.stepVoltageV as (typeof STEP_VOLTAGE_OPTIONS_V)[number],
                  )
                    ? String(input.stepVoltageV)
                    : String(
                        [...STEP_VOLTAGE_OPTIONS_V].find(
                          (v) => v >= input.stepVoltageV,
                        ) ?? input.stepVoltageV,
                      )
                }
                onChange={(e) => patch("stepVoltageV", Number(e.target.value))}
              >
                {/* Keep odd calculated values visible if example set one */}
                {!STEP_VOLTAGE_OPTIONS_V.includes(
                  input.stepVoltageV as (typeof STEP_VOLTAGE_OPTIONS_V)[number],
                ) && input.stepVoltageV > 0 ? (
                  <option value={input.stepVoltageV}>
                    {input.stepVoltageV} V
                  </option>
                ) : null}
                {STEP_VOLTAGE_MENU.map((item) => (
                  <option key={item.value} value={item.value}>
                    {currentLabel(lang, item.labelZh, item.labelEn)}
                  </option>
                ))}
              </select>
            </Field>
            ) : null}

            <Field label={t(lang, "phases")}>
              <select
                className={controlClass}
                value={input.phases}
                onChange={(e) =>
                  patch("phases", e.target.value as SelectInput["phases"])
                }
              >
                <option value="III">III</option>
                <option value="II">{t(lang, "phaseII")}</option>
                <option value="I">I</option>
              </select>
            </Field>
                  <Field label={t(lang, "dutyKind")} as="div">
                    <div
                      className="grid h-11 grid-cols-2 gap-2"
                      role="group"
                      aria-label={t(lang, "dutyKind")}
                    >
                      {(["oltc", "octc"] as const).map((k) => {
                        const on = (input.dutyKind ?? "oltc") === k;
                        return (
                          <button
                            key={k}
                            type="button"
                            aria-pressed={on}
                            onClick={() => {
                              if (k === "octc") {
                                setInput((s) => ({
                                  ...s,
                                  dutyKind: "octc",
                                  preferStructure: "auto",
                                  octcSeries:
                                    s.octcSeries && s.octcSeries !== "auto"
                                      ? s.octcSeries
                                      : "IV",
                                }));
                                touch();
                                return;
                              }
                              setInput((s) => ({
                                ...s,
                                dutyKind: "oltc",
                                preferStructure: "auto",
                              }));
                              touch();
                            }}
                            className={segBtn(on)}
                          >
                            {t(lang, k === "oltc" ? "dutyOltc" : "dutyOctc")}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                  {input.mounting !== "dry_type" && input.mounting !== "reactor" ? (
                    <Field label={t(lang, "arcMode")} as="div">
                      <div
                        className={cx(
                          "grid h-11 grid-cols-2 gap-2",
                          isOctc && "opacity-45",
                        )}
                        role="group"
                        aria-label={t(lang, "arcMode")}
                        aria-disabled={isOctc || undefined}
                      >
                        {(
                          [
                            [true, "arcVac"],
                            [false, "arcOil"],
                          ] as const
                        ).map(([vac, key]) => {
                          const on = isOctc ? !vac : input.preferVacuum === vac;
                          return (
                            <button
                              key={key}
                              type="button"
                              aria-pressed={on}
                              disabled={isOctc}
                              onClick={() => {
                                if (isOctc) return;
                                setInput((s) => ({
                                  ...s,
                                  preferVacuum: vac,
                                  medium: mediumFor(s.mounting, vac),
                                }));
                                touch();
                              }}
                              className={cx(
                                segBtn(on),
                                isOctc &&
                                  "cursor-not-allowed hover:border-[var(--color-rule-2)]",
                              )}
                            >
                              {t(lang, key)}
                            </button>
                          );
                        })}
                      </div>
                    </Field>
                  ) : null}
                  <Field label={t(lang, "specStructure")}>
                    <select
                      className={controlClass}
                      value={input.preferStructure ?? "auto"}
                      onChange={(e) =>
                        patch(
                          "preferStructure",
                          e.target.value as SelectInput["preferStructure"],
                        )
                      }
                    >
                      <option value="auto">{t(lang, "auto")}</option>
                      {isOctc ? (
                        <>
                          <option value="cage">{t(lang, "specCage")}</option>
                          <option value="drum">{t(lang, "specDrum")}</option>
                        </>
                      ) : (
                        <>
                          <option value="compound">
                            {t(lang, "specCompound")}
                          </option>
                          <option value="combined">
                            {t(lang, "specCombined")}
                          </option>
                        </>
                      )}
                    </select>
                  </Field>

                  <Field label={t(lang, "mounting")}>
                    <select
                      className={controlClass}
                      value={input.mounting}
                      onChange={(e) => {
                        const mounting = e.target
                          .value as SelectInput["mounting"];
                        setInput((s) => ({
                          ...s,
                          mounting,
                          medium: mediumFor(mounting, s.preferVacuum),
                        }));
                        touch();
                      }}
                    >
                      <option value="in_tank">{t(lang, "mountIn")}</option>
                      <option value="on_tank">{t(lang, "mountOn")}</option>
                      <option value="external_compartment">
                        {t(lang, "mountExt")}
                      </option>
                      <option value="dry_type">{t(lang, "mountDry")}</option>
                      <option value="reactor">
                        {t(lang, "mountReactor")}
                      </option>
                    </select>
                  </Field>

                  <Field as="div" label={t(lang, "acrossInsul")}>
                    <div className="grid grid-cols-2 gap-2">
                      <UpSelect
                        label={t(lang, "acrossBil")}
                        value={
                          input.acrossTapBilKv != null &&
                          input.acrossTapBilKv > 0
                            ? String(input.acrossTapBilKv)
                            : ""
                        }
                        onChange={(raw) =>
                          patch(
                            "acrossTapBilKv",
                            raw === "" ? undefined : Number(raw),
                          )
                        }
                        options={[
                          { value: "", label: t(lang, "acrossUnset") },
                          ...(input.acrossTapBilKv != null &&
                          input.acrossTapBilKv > 0 &&
                          !(ACROSS_BIL_OPTIONS_KV as readonly number[]).includes(
                            input.acrossTapBilKv,
                          )
                            ? [
                                {
                                  value: String(input.acrossTapBilKv),
                                  label: `${input.acrossTapBilKv} kV`,
                                },
                              ]
                            : []),
                          ...ACROSS_BIL_MENU.map((item) => ({
                            value: String(item.value),
                            label: currentLabel(lang, item.labelZh, item.labelEn),
                          })),
                        ]}
                      />
                      <UpSelect
                        label={t(lang, "acrossPf")}
                        value={
                          input.acrossTapPfKv != null &&
                          input.acrossTapPfKv > 0
                            ? String(input.acrossTapPfKv)
                            : ""
                        }
                        onChange={(raw) =>
                          patch(
                            "acrossTapPfKv",
                            raw === "" ? undefined : Number(raw),
                          )
                        }
                        options={[
                          { value: "", label: t(lang, "acrossUnset") },
                          ...(input.acrossTapPfKv != null &&
                          input.acrossTapPfKv > 0 &&
                          !(ACROSS_PF_OPTIONS_KV as readonly number[]).includes(
                            input.acrossTapPfKv,
                          )
                            ? [
                                {
                                  value: String(input.acrossTapPfKv),
                                  label: `${input.acrossTapPfKv} kV`,
                                },
                              ]
                            : []),
                          ...ACROSS_PF_MENU.map((item) => ({
                            value: String(item.value),
                            label: currentLabel(lang, item.labelZh, item.labelEn),
                          })),
                        ]}
                      />
                    </div>
                  </Field>
                  <Field as="div" label={t(lang, "safetyK")}>
                    <div className="relative">
                      {safetyKCustom ||
                      (safetyK > 0 &&
                        !(SAFETY_K_OPTIONS as readonly number[]).includes(
                          safetyK,
                        )) ? (
                        <input
                          inputMode="decimal"
                          className={`${controlClass} pl-7 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                          value={safetyK > 0 ? String(safetyK) : ""}
                          onChange={(e) => {
                            const v = e.target.value.replace(/，/g, ".");
                            if (v !== "" && !/^\d*\.?\d*$/.test(v)) return;
                            if (v === "" || v === ".") {
                              commitSafetyK(0);
                              return;
                            }
                            const n = Number(v);
                            if (!Number.isFinite(n) || n < 0) return;
                            commitSafetyK(n);
                          }}
                          onBlur={() => {
                            if (
                              (SAFETY_K_OPTIONS as readonly number[]).includes(
                                safetyK,
                              )
                            ) {
                              setSafetyKCustom(false);
                            }
                          }}
                        />
                      ) : (
                        <UpSelect
                          label={t(lang, "safetyK")}
                          value={safetyK > 0 ? String(safetyK) : "1"}
                          onChange={(raw) => {
                            if (raw === "__custom__") {
                              setSafetyKCustom(true);
                              return;
                            }
                            setSafetyKCustom(false);
                            commitSafetyK(Number(raw));
                          }}
                          options={[
                            { value: "__custom__", label: t(lang, "custom") },
                            ...SAFETY_K_OPTIONS.map((n) => ({
                              value: String(n),
                              label: `×${n}`,
                            })),
                          ]}
                        />
                      )}
                      {safetyKCustom ||
                      (safetyK > 0 &&
                        !(SAFETY_K_OPTIONS as readonly number[]).includes(
                          safetyK,
                        )) ? (
                        <span className="pointer-events-none absolute top-0 left-3 flex h-11 items-center text-[0.9rem] text-[var(--color-ink)]">
                          ×
                        </span>
                      ) : null}
                    </div>
                  </Field>
          </div>

          <div className="mt-[30px] flex flex-col items-stretch gap-2">
            <button
              type="submit"
              disabled={
                running ||
                (currentMode === "capacity"
                  ? !derivedOk
                  : !input.throughCurrentA)
              }
              className={cx(
                "inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-6 text-[0.9375rem] font-semibold whitespace-nowrap text-[var(--color-accent-ink)] transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)]",
                "hover:opacity-90 active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
                "disabled:cursor-not-allowed disabled:opacity-50",
                running && "pointer-events-none",
              )}
            >
              {running ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {t(lang, "working")}
                </>
              ) : stale ? (
                t(lang, "selectAgain")
              ) : (
                t(lang, "select")
              )}
            </button>
          </div>
          </div>
        </form>

        <div className="pane-in order-1 bg-[#0A386A] text-white lg:col-start-1 lg:row-start-1">
          <aside
            ref={resultPaneRef}
            className="flex flex-col px-5 pt-5 pb-4 sm:px-8 lg:sticky lg:top-0 lg:h-dvh lg:min-h-0 lg:px-8 lg:pt-7 lg:pb-6"
          >
            <h1 className="shrink-0 text-[1.0625rem] font-semibold tracking-[0.08em] text-[#d7e4f0]">
              {t(lang, "title")}
            </h1>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-clip overflow-y-auto">
            <div className="w-full py-4 lg:my-auto lg:py-8">
          {!hasRun || !result ? (
            <IdlePanel lang={lang} running={running} />
          ) : (
            <div
              className={cx(
                "result-stage",
                stale && !running && "is-stale",
                running && "is-running",
              )}
            >
              {stale && !running ? (
                <p className="mb-3 text-[0.8125rem] leading-snug text-[#f3d48a]">
                  {t(lang, "stale")}
                </p>
              ) : null}
              <div className="grid">
                <div key={resultKey} className="result-pop col-start-1 row-start-1">
              {!result.ok || !primary ? (
                <>
                  <p className="text-[0.9375rem] font-semibold text-[#ffb4b4]">
                    {t(lang, "noMatch")}
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.8125rem] leading-snug text-[#ffd0d0]">
                    {(lang === "zh" ? result.errorsZh : result.errorsEn).map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <p className="text-[0.75rem] font-semibold tracking-[0.08em] text-[#8fd0e2]">
                    {t(
                      lang,
                      showsMinimumLabel(loose, insuranceAlt)
                        ? "recommended"
                        : "allRound",
                    )}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="min-w-0 flex-1 font-mono text-[1rem] leading-[1.2] font-medium tracking-tight break-words text-white sm:text-[clamp(1.375rem,2.4vw,2rem)]">
                      {modelNodes(primary.model)}
                    </p>
                    <button
                      type="button"
                      onClick={() => copyModel(primary.model)}
                      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border border-white px-3 text-[0.8125rem] font-semibold text-white transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-white/10 active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      aria-label={
                        copiedModel === primary.model
                          ? t(lang, "copied")
                          : t(lang, "copyType")
                      }
                    >
                      {copiedModel === primary.model ? (
                        <CheckIcon className="h-4 w-4" strokeWidth={2} aria-hidden />
                      ) : (
                        <ClipboardDocumentIcon className="h-4 w-4" strokeWidth={2} aria-hidden />
                      )}
                      <span aria-live="polite">
                        {copiedModel === primary.model
                          ? t(lang, "copied")
                          : t(lang, "copy")}
                      </span>
                    </button>
                  </div>

                  <ModelSpec
                    lang={lang}
                    r={primary}
                    dutyMounting={input.mounting}
                    inverse
                  />

                  {alts.length > 0 ? (
                    <div className="mt-7 border-t border-white/15 pt-4">
                      <button
                        type="button"
                        onClick={() => setAltsOpen((o) => !o)}
                        className="flex w-full items-center justify-between text-left text-[0.75rem] font-medium text-[#d5e2ef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        aria-expanded={altsOpen}
                      >
                        <span>
                          {t(lang, "otherOpts", { n: alts.length })}
                        </span>
                        <ChevronDownIcon
                          className={cx(
                            "h-4 w-4 shrink-0 text-[#9bb4c9] transition-transform duration-200",
                            altsOpen && "rotate-180",
                          )}
                          aria-hidden
                        />
                      </button>
                      <div
                        className={cx(
                          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                          altsOpen
                            ? "grid-rows-[1fr] opacity-100"
                            : "grid-rows-[0fr] opacity-0",
                        )}
                      >
                        <div className="min-h-0 overflow-hidden">
                          <ul className="space-y-2 pt-2.5 pb-0.5">
                            {alts.map((r) => {
                              const open = openAlts.includes(r.model);
                              return (
                                <li
                                  key={r.model}
                                  className="rounded-[var(--radius-sm)] border border-white/20"
                                >
                                  <div className="flex items-center gap-1.5 px-3 py-2">
                                    <button
                                      type="button"
                                      aria-expanded={open}
                                      onClick={() =>
                                        setOpenAlts(open ? [] : [r.model])
                                      }
                                      className="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-sm)] px-0.5 py-0.5 text-left text-white transition-colors hover:text-[#8fd0e2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                                    >
                                      <ChevronDownIcon
                                        className={cx(
                                          "h-4 w-4 shrink-0 text-[#9bb4c9] transition-transform duration-200",
                                          open && "rotate-180",
                                        )}
                                        aria-hidden
                                      />
                                      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1">
                                        <span className="min-w-0 break-words font-mono text-[0.8125rem] leading-snug text-white sm:text-[0.875rem]">
                                          {modelNodes(r.model)}
                                        </span>
                                        {insuranceAlt != null &&
                                        r.model === insuranceAlt ? (
                                          <span className="shrink-0 rounded-full border border-[#8fd0e2]/55 bg-[#8fd0e2]/10 px-2 py-1 text-[0.75rem] font-semibold leading-none tracking-[0.04em] text-[#8fd0e2]">
                                            {t(lang, "allRound")}
                                          </span>
                                        ) : null}
                                      </span>
                                    </button>
                                    <span className="flex shrink-0 items-center">
                                      <button
                                        type="button"
                                        onClick={() => copyModel(r.model)}
                                        className="inline-flex h-8 shrink-0 items-center rounded-[var(--radius-sm)] px-2 text-[0.75rem] font-semibold text-[#8fd0e2] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                                        aria-label={
                                          copiedModel === r.model
                                            ? t(lang, "copied")
                                            : t(lang, "copy")
                                        }
                                      >
                                        <span aria-live="polite">
                                          {copiedModel === r.model
                                            ? t(lang, "copied")
                                            : t(lang, "copy")}
                                        </span>
                                      </button>
                                    </span>
                                  </div>
                                  <div
                                    className={cx(
                                      "more-drop",
                                      open && "more-drop-open",
                                    )}
                                  >
                                    <div className="min-h-0 overflow-hidden">
                                      <div className="more-drop-inner">
                                        <ModelSpec
                                          lang={lang}
                                          r={r}
                                          dutyMounting={input.mounting}
                                          compact
                                          inverse
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
                </div>
                {running ? (
                  <div className="result-work result-work-delay col-start-1 row-start-1 flex items-center gap-2.5 self-center text-[0.9375rem] text-[#d5e2ef]">
                    <span className="h-[18px] w-[18px] shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {t(lang, "selecting")}
                  </div>
                ) : null}
              </div>
            </div>
          )}
            </div>
            </div>
            <div className="flex shrink-0 items-center pt-3">
              <p className="min-w-0 text-[0.75rem] leading-snug text-[#8aa4bb]">
                {t(lang, "disclaimer")}
              </p>
            </div>
          </aside>
        </div>
    </div>
  );
}

function IdlePanel({ lang, running }: { lang: Lang; running: boolean }) {
  if (running) {
    return (
      <div className="flex items-center gap-2.5 text-[0.9375rem] text-[#d5e2ef]">
        <span className="h-[18px] w-[18px] shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        <p>{t(lang, "selecting")}</p>
      </div>
    );
  }
  return (
    <div>
      <p className="font-[family-name:var(--font-display)] text-[1.875rem] font-semibold leading-[1.15] tracking-[-0.03em] text-white lg:text-[2.5rem]">
        {t(lang, "idleTitle")}
      </p>
      <p className="mt-2 max-w-[22rem] text-base leading-snug text-[#d5e2ef] lg:mt-3 lg:text-[1.125rem]">
        {t(lang, "idleBody")}
      </p>
    </div>
  );
}

function mountLabelKey(m: SelectInput["mounting"]): string {
  switch (m) {
    case "on_tank":
      return "mountOn";
    case "external_compartment":
      return "mountExt";
    case "dry_type":
      return "mountDry";
    case "reactor":
      return "mountReactor";
    default:
      return "mountIn";
  }
}

function structureLabelKey(structure: StructureKind | undefined): string {
  switch (structure) {
    case "combined":
      return "specCombined";
    case "compound":
      return "specCompound";
    case "cage":
      return "specCage";
    case "drum":
      return "specDrum";
    default:
      return "specCompound";
  }
}

function ModelSpec({
  lang,
  r,
  dutyMounting,
  compact,
  inverse,
}: {
  lang: Lang;
  r: ModelResult;
  dutyMounting: SelectInput["mounting"];
  compact?: boolean;
  inverse?: boolean;
}) {
  const nb = "\u00a0";
  const series = SERIES.find((s) => s.id === r.seriesId);
  const vacuum = series?.vacuum === true;
  const mount =
    series?.mounting.includes(dutyMounting)
      ? dutyMounting
      : (series?.mounting[0] ?? dutyMounting);
  const items: Array<{ key: string; value: string }> = [
    {
      key: "specArc",
      value: t(lang, vacuum ? "specVac" : "specOil"),
    },
  ];
  if (r.maxStepVoltageV != null) {
    items.push({ key: "specUst", value: `${r.maxStepVoltageV}${nb}V` });
  }
  if (r.stepCapacityKva != null) {
    items.push({ key: "specPsin", value: `${r.stepCapacityKva}${nb}kVA` });
  }
  items.push({
    key: "specStructure",
    value: t(lang, structureLabelKey(series?.structure)),
  });
  if (r.earthPfKv != null && r.earthBilKv != null) {
    items.push({
      key: "specEarth",
      value: `${r.earthPfKv}${nb}/${nb}${r.earthBilKv}${nb}kV`,
    });
  }
  items.push({
    key: "mounting",
    value: t(lang, mountLabelKey(mount)),
  });

  return (
    <dl
      className={cx(
        "grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3",
        compact
          ? inverse
            ? "mt-3 border-t border-white/15 px-3 py-2.5"
            : "shrink-0 border-t border-[var(--color-rule)] px-3 py-2.5"
          : inverse
            ? "mt-4 px-0 py-0"
            : "shrink-0 gap-x-5 gap-y-2 px-4 py-2.5",
      )}
    >
      {items.map((item) => (
        <div key={item.key} className="min-w-0">
          <dt
            className={cx(
              "text-[0.6875rem] leading-snug",
              inverse ? "text-[#9bb4c9]" : "text-[var(--color-muted)]",
            )}
          >
            {t(lang, item.key)}
          </dt>
          <dd
            className={cx(
              "mt-0.5 text-[0.875rem] leading-snug tabular-nums",
              inverse ? "text-white" : "text-[var(--color-ink)]",
            )}
            translate="no"
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}


