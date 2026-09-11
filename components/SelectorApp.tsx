"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  AdjustmentsHorizontalIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardDocumentIcon,
  ClipboardDocumentListIcon,
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
  maxThroughCurrent,
  oltcUmFromRatedKv,
  stepVoltageFromPercent,
  throughCurrentFromRated,
} from "@/lib/deriveUm";
import { PercentCombo } from "@/components/PercentCombo";
import { FIXTURES, pickOtherOptions, selectOltc } from "@/lib/engine";
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
import { AltListAmount, ListPrice, useListFx } from "@/components/ListPrice";
import {
  getAdminSnapshot,
  getServerAdmin,
  subscribeAdmin,
} from "@/lib/adminSession";
import { useAppLang } from "@/components/LangProvider";
import {
  currentLabel,
  setAppLang,
  t,
  type Lang,
} from "@/lib/i18n";
import type { ModelResult, SelectInput, SelectOutput } from "@/lib/types";

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
  6.3, 8, 10, 12.5, 16, 20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250,
  315, 400, 500,
] as const;
const STEP_PERCENT_OPTIONS = [
  0.5, 0.625, 0.8, 1, 1.25, 1.5, 1.67, 2, 2.25, 2.5, 2.75, 3, 3.33, 4, 5, 6.25,
  7.5, 10,
] as const;
const TAP_SIDE_OPTIONS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
] as const;
const SAFETY_K_OPTIONS = [
  1.1, 1.15, 1.2, 1.25, 1.3, 1.35, 1.4, 1.5, 1.6, 1.7, 1.8,
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
  mdu: "none",
  dutyKind: "oltc",
};

type ExampleKey = "preset66" | "preset110" | "preset220";

const EXAMPLES: { key: ExampleKey; pm: string; labelKey: string; hintKey: string }[] = [
  { key: "preset66", pm: "8", labelKey: "ex66", hintKey: "exHint66" },
  { key: "preset110", pm: "8", labelKey: "ex110", hintKey: "exHint110" },
  { key: "preset220", pm: "8", labelKey: "ex220", hintKey: "exHint220" },
];

const EXAMPLE_RATED_KV: Record<ExampleKey, number> = {
  preset66: 66,
  preset110: 110,
  preset220: 220,
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const fieldCaptionClass =
  "pointer-events-none absolute top-full right-0 mt-1.5 text-right text-[0.75rem] leading-none tabular-nums text-[var(--color-muted)]";

function CaptionSub({
  name,
  sub,
  eq,
  value,
  unit,
}: {
  name: string;
  sub: string;
  eq?: boolean;
  value: string;
  unit: string;
}) {
  return (
    <>
      {name}
      <sub className="relative top-[0.22em] ml-px text-[0.62em] leading-none">
        {sub}
      </sub>
      {eq !== false ? " = " : " "}
      {value}
      {unit}
    </>
  );
}

/** Comfortable control — one hover signal (border), shared height */
const controlClass =
  "h-10 w-full min-w-0 rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] bg-white px-3 text-[0.9rem] leading-snug text-[var(--color-ink)] transition-colors duration-150 hover:border-[var(--color-accent)] focus:border-[var(--color-accent)] focus:outline-none";

function Field({
  label,
  tip,
  meta,
  children,
  className,
  action,
  as = "label",
}: {
  label: string;
  tip?: string;
  /** Same-row note (e.g. 最大 251 A) — does not add a second line. */
  meta?: string;
  children: React.ReactNode;
  className?: string;
  /** Right-side of the label row (e.g. →19位 next to ±级数) */
  action?: React.ReactNode;
  /** Button groups must not use <label> — a click on the tip would fire the first button. */
  as?: "label" | "div";
}) {
  const Tag = as;
  return (
    <Tag className={cx("flex min-w-0 flex-col gap-1.5 overflow-visible", className)}>
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
          <span className="ml-auto shrink-0 whitespace-nowrap text-[0.75rem] leading-none">
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

function ModeSeg<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
}: {
  ariaLabel: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <div
      className="inline-flex h-7 box-border items-stretch overflow-hidden rounded-full bg-[var(--color-soft)] p-0.5"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const on = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(opt.id)}
            className={cx(
              "inline-flex h-full items-center rounded-full px-2.5 text-[0.6875rem] leading-none whitespace-nowrap transition-colors duration-150",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
              on
                ? "bg-white font-medium text-[var(--color-ink)] shadow-[0_1px_2px_oklch(24%_0.02_258_/_0.08)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-ink-2)]",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function formatAmps(a: number): string {
  if (!Number.isFinite(a) || a <= 0) return "";
  const r = Math.round(a * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function showSelectorSize(input: SelectInput) {
  if (input.mounting === "dry_type" || input.mounting === "reactor") return false;
  if (
    input.mounting === "on_tank" ||
    input.mounting === "external_compartment"
  ) {
    return false;
  }
  return true;
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
  const [tapPlus, setTapPlus] = useState(8);
  const [tapMinus, setTapMinus] = useState(8);
  const [stepPercentPct, setStepPercentPct] = useState(1.25);
  const [safetyK, setSafetyK] = useState(1.2);
  const [tapRange, setTapRange] = useState<ParsedTapRange | null>(null);
  const [activeExample, setActiveExample] = useState<ExampleKey | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreUnlocked, setMoreUnlocked] = useState(false);
  const [altsOpen, setAltsOpen] = useState(false);
  const [openAlts, setOpenAlts] = useState<string[]>([]);
  const [copiedModel, setCopiedModel] = useState<string | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const beforePreset = useRef<{
    input: SelectInput;
    pm: string;
    voltageMode: "winding" | "equipment";
    windingRatedKv: number;
    currentMode: "current" | "capacity";
    transformerMva: number;
    tapPlus: number;
    tapMinus: number;
    stepPercentPct: number;
    safetyK: number;
    tapRange: ParsedTapRange | null;
  } | null>(null);

  const [result, setResult] = useState<SelectOutput | null>(null);
  const [resultKey, setResultKey] = useState(0);
  const [hasRun, setHasRun] = useState(false);
  const [stale, setStale] = useState(false);
  const [running, setRunning] = useState(false);
  const runTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultPaneRef = useRef<HTMLElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [paneMinH, setPaneMinH] = useState<number | undefined>(undefined);
  const { currency, fx, setCurrency } = useListFx();
  const admin = useSyncExternalStore(
    subscribeAdmin,
    getAdminSnapshot,
    getServerAdmin,
  );

  const isLinear = input.regulation === "linear";
  const selectorVisible = showSelectorSize(input);

  const touch = () => {
    if (hasRun) setStale(true);
    setActiveExample(null);
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

  const dutyForSelect = ():
    | SelectInput
    | { error: true; msgKey: string } => {
    if (currentMode === "capacity") {
      if (!(transformerMva > 0)) return { error: true, msgKey: "needMva" };
      if (!(windingRatedKv > 0)) return { error: true, msgKey: "needRated" };
      const i = capacityThroughA();
      if (i == null) return { error: true, msgKey: "needMva" };
      const ust = computedStepVoltage();
      return {
        ...input,
        throughCurrentA: i,
        umKv: oltcUmFromRatedKv(windingRatedKv, input.connection),
        ...(ust != null ? { stepVoltageV: ust } : {}),
      };
    }
    if (voltageMode === "winding") {
      if (!(windingRatedKv > 0)) return { error: true, msgKey: "needRated" };
      const ust = computedStepVoltage();
      return {
        ...input,
        umKv: oltcUmFromRatedKv(windingRatedKv, input.connection),
        ...(ust != null ? { stepVoltageV: ust } : {}),
      };
    }
    if (!(input.umKv > 0)) return { error: true, msgKey: "needUm" };
    return { ...input, umKv: input.umKv };
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
      const out = selectOltc(duty);
      setResult(out);
      setResultKey((k) => k + 1);
      setHasRun(true);
      setStale(false);
      setRunning(false);
      setAltsOpen(out.ok && out.results.length > 1);
      // Mobile: result sits below the form — scroll it into view after select
      if (
        typeof window !== "undefined" &&
        window.matchMedia("(max-width: 767px)").matches
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

  useLayoutEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const sync = () => {
      if (!moreOpen) setPaneMinH(form.offsetHeight);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(form);
    return () => ro.disconnect();
  }, [moreOpen]);

  useEffect(() => {
    if (!moreOpen) {
      setMoreUnlocked(false);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMoreUnlocked(true);
    }
  }, [moreOpen]);

  const copyModel = async (text: string) => {
    const ok = await copyText(text);
    if (!ok) return;
    setCopiedModel(text);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopiedModel(null), 2000);
  };

  const clearResult = () => {
    setResult(null);
    setHasRun(false);
    setStale(false);
    setAltsOpen(false);
    setOpenAlts([]);
  };

  const loadExample = (ex: (typeof EXAMPLES)[number]) => {
    if (activeExample === ex.key) {
      const prev = beforePreset.current;
      beforePreset.current = null;
      if (prev) {
        setInput(prev.input);
        setPm(prev.pm);
        setVoltageMode(prev.voltageMode);
        setWindingRatedKv(prev.windingRatedKv);
        setCurrentMode(prev.currentMode);
        setTransformerMva(prev.transformerMva);
        setTapPlus(prev.tapPlus);
        setTapMinus(prev.tapMinus);
        setStepPercentPct(prev.stepPercentPct);
        setSafetyK(prev.safetyK);
        setTapRange(prev.tapRange);
      } else {
        setInput(defaultInput);
        setPm("8");
        setVoltageMode("winding");
        setWindingRatedKv(DEFAULT_WINDING_RATED_KV);
        setCurrentMode("capacity");
        setTransformerMva(25);
        setTapPlus(8);
        setTapMinus(8);
        setStepPercentPct(1.25);
        setSafetyK(1.2);
        setTapRange(null);
      }
      setActiveExample(null);
      clearResult();
      return;
    }
    if (activeExample == null) {
      beforePreset.current = {
        input,
        pm,
        voltageMode,
        windingRatedKv,
        currentMode,
        transformerMva,
        tapPlus,
        tapMinus,
        stepPercentPct,
        safetyK,
        tapRange,
      };
    }
    const f = FIXTURES[ex.key];
    let next: SelectInput = { ...f.input, mdu: "none" };
    if (ex.pm && Number(ex.pm) > 0) {
      const n = Number(ex.pm);
      setPm(ex.pm);
      next = {
        ...next,
        ...geometryForPm(n, next.regulation),
      };
    } else {
      setPm("");
    }
    const rated = EXAMPLE_RATED_KV[ex.key];
    setWindingRatedKv(rated);
    setVoltageMode("winding");
    setCurrentMode("current");
    setTransformerMva(0);
    setTapPlus(8);
    setTapMinus(8);
    setStepPercentPct(1.25);
    setSafetyK(1.2);
    setTapRange(null);
    setInput({
      ...next,
      umKv: 0,
    });
    setActiveExample(ex.key);
    clearResult();
  };

  const primary = result?.ok ? result.results[0] : null;
  const alts = result?.ok ? pickOtherOptions(result.results, 3) : [];
  const idle = !hasRun || !result;
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
  const umKvShow =
    windingRatedKv > 0
      ? oltcUmFromRatedKv(windingRatedKv, input.connection)
      : null;

  return (
    <div className="selector-shell mx-auto flex w-full min-w-0 max-w-[1100px] flex-col gap-5 px-4 pt-8 pb-8 sm:px-6 md:gap-4 md:pt-6 md:pb-4">
      {/* Leftover viewport around the whole workbench (title + cards).
          Bottom spacer grows more so the block sits slightly above true center.
          Collapses when the page needs to scroll. */}
      <div className="min-h-0 flex-1" aria-hidden />

      {/* Stack on phone: title full width, langs row below — avoids squashed header */}
      <header className="flex shrink-0 flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 max-sm:pr-11">
          <h1 className="font-[family-name:var(--font-display)] text-[1.45rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--color-ink)] sm:text-[1.8rem]">
            {t(lang, "title")}
          </h1>
          <p className="mt-1.5 max-w-[52rem] text-[0.875rem] leading-snug text-[var(--color-muted)] sm:text-[0.9rem]">
            {t(lang, "subtitle")}
          </p>
        </div>
        <div className="flex w-full max-w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
          <LangSwitcher
            lang={lang}
            onChange={setLang}
            ariaLabel={t(lang, "langAria")}
          />
        </div>
      </header>

      {/* Single column phone → two columns desktop; result below form on mobile */}
      <div
        className={cx(
          "grid min-w-0 gap-4 sm:gap-5 md:grid-cols-2 md:gap-5",
          moreOpen ? "md:items-start" : "md:items-stretch",
        )}
      >
        {/* —— Form —— */}
        <form
          ref={formRef}
          className="min-w-0 rounded-[var(--radius-md)] border border-[var(--color-rule)] bg-white p-4 shadow-[0_1px_2px_oklch(24%_0.02_258_/_0.04)] sm:p-5"
          onSubmit={(e) => {
            e.preventDefault();
            runSelect();
          }}
        >
          <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="shrink-0 font-[family-name:var(--font-display)] text-base font-semibold text-[var(--color-ink)]">
              {t(lang, "presets")}
            </h2>
            <div
              className="grid w-full grid-cols-3 gap-1.5 sm:w-[18.5rem] sm:shrink-0"
              role="group"
              aria-label={t(lang, "presets")}
            >
              {EXAMPLES.map((ex) => {
                const on = activeExample === ex.key;
                return (
                  <button
                    key={ex.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => loadExample(ex)}
                    title={t(lang, ex.hintKey)}
                    className={cx(
                      "inline-flex h-8 w-full items-center justify-center whitespace-nowrap rounded-full border px-1.5 text-center text-[0.75rem] leading-none transition-colors duration-150 sm:h-7",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
                      on
                        ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                        : "border-[var(--color-rule)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
                    )}
                  >
                    {t(lang, ex.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-x-4 gap-y-3.5 sm:grid-cols-2">
            <Field
              as="div"
              label={
                currentMode === "capacity"
                  ? t(lang, "transformerMva")
                  : t(lang, "throughCurrent")
              }
              action={
                <ModeSeg
                  ariaLabel={t(lang, "currentModeAria")}
                  value={currentMode}
                  options={[
                    { id: "capacity", label: t(lang, "capacityBtn") },
                    { id: "current", label: t(lang, "currentBtn") },
                  ]}
                  onChange={setCurrentEntry}
                />
              }
            >
              {currentMode === "capacity" ? (
                <>
                  <div className="relative pb-5">
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
                          setTransformerMva(Number(e.target.value));
                          setMvaCustom(false);
                          touch();
                        }}
                      >
                        {MVA_OPTIONS.map((n) => (
                          <option key={n} value={String(n)}>
                            {n} MVA
                          </option>
                        ))}
                        <option value="__custom__">
                          {t(lang, "custom")}
                        </option>
                      </select>
                    )}
                    {mvaCustom ||
                    (transformerMva > 0 &&
                      !(MVA_OPTIONS as readonly number[]).includes(
                        transformerMva,
                      )) ? (
                      <span className="pointer-events-none absolute top-0 right-3 flex h-10 items-center text-[0.75rem] text-[var(--color-muted)]">
                        MVA
                      </span>
                    ) : null}
                    {derivedOk && derivedA != null ? (
                      <span className={fieldCaptionClass}>
                        <CaptionSub
                          name="I"
                          sub="max"
                          value={formatAmps(derivedA)}
                          unit="A"
                        />
                      </span>
                    ) : null}
                  </div>
                </>
              ) : (
                <select
                  className={controlClass}
                  value={String(input.throughCurrentA)}
                  onChange={(e) =>
                    patch("throughCurrentA", Number(e.target.value))
                  }
                >
                  {CURRENT_MENU.map((c) => (
                    <option key={c.value} value={c.value}>
                      {currentLabel(lang, c.labelZh, c.labelEn)}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <Field as="div" label={t(lang, "umWinding")}>
              <div className="relative pb-5">
                <select
                  className={controlClass}
                  value={windingRatedKv ? String(windingRatedKv) : ""}
                  onChange={(e) => setVoltageKv(Number(e.target.value))}
                >
                  <option value="">{t(lang, "pickVoltage")}</option>
                  {WINDING_RATED_KV.map((v) => (
                    <option key={v} value={v}>
                      {v} kV
                    </option>
                  ))}
                </select>
                {umKvShow != null ? (
                  <span className={fieldCaptionClass}>
                    OLTC{" "}
                    <CaptionSub
                      name="U"
                      sub="m"
                      value={String(umKvShow)}
                      unit=" kV"
                    />
                  </span>
                ) : null}
              </div>
            </Field>

            <Field
              label={t(lang, "connection")}
            >
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

            <Field
              label={t(lang, "regulation")}
            >
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

            {isLinear ? null : (
              <Field
                as="div"
                className="relative"
                label={t(lang, "pmSteps")}
                action={
                  posHint && pm ? (
                    <span className="font-medium tabular-nums text-[var(--color-muted)]">
                      {posHint}
                    </span>
                  ) : undefined
                }
              >
                <select
                  className={controlClass}
                  value={pm}
                  onChange={(e) => applyPm(e.target.value)}
                >
                  <option value="">
                    {t(lang, "customPos")}
                  </option>
                  {pmOptions.map((n) => (
                    <option key={n} value={String(n)}>
                      ±{n}
                      {lang === "zh" ? " 级" : lang === "ru" ? " ст." : ""}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field as="div" label={t(lang, "stepPercent")}>
              <div className="relative pb-5">
                <PercentCombo
                  value={stepPercentPct}
                  options={STEP_PERCENT_OPTIONS}
                  onChange={(pct) => {
                    setStepPercentPct(pct);
                    touch();
                    if (isLinear || !pm) {
                      commitTapRange(tapPlus, tapMinus, pct);
                    }
                  }}
                />
                {ustV != null ? (
                  <span className={fieldCaptionClass}>
                    <CaptionSub
                      name="U"
                      sub="st"
                      value={String(Math.round(ustV))}
                      unit="V"
                    />
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
                    input.positions != null ? (
                      <span className="font-medium tabular-nums text-[var(--color-muted)]">
                        {t(lang, "posHint", { n: input.positions })}
                      </span>
                    ) : undefined
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
          </div>

          {/* More options — hairline + button; panel drops */}
          <div className="mt-4 border-t border-[var(--color-rule)] pt-4">
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className={cx(
                "flex w-full min-h-11 items-center gap-2.5 rounded-[var(--radius-sm)] border bg-white px-3 py-2 text-left",
                "transition-[border-color,background-color] duration-150",
                "hover:border-[var(--color-accent)]",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
                moreOpen
                  ? "border-[var(--color-accent)] bg-[oklch(58%_0.2_256_/_0.04)]"
                  : "border-[var(--color-rule-2)]",
              )}
              aria-expanded={moreOpen}
            >
              <AdjustmentsHorizontalIcon
                className="h-4 w-4 shrink-0 text-[var(--color-muted)]"
                aria-hidden
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[0.875rem] font-semibold text-[var(--color-ink)]">
                  {t(lang, "more")}
                </span>
                <span className="truncate text-[0.75rem] leading-snug text-[var(--color-muted)]">
                  {t(lang, "moreLead")}
                </span>
              </span>
              <ChevronDownIcon
                className={cx(
                  "h-4 w-4 shrink-0 text-[var(--color-muted)] transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
                  moreOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>

            <div
              className={cx("more-drop", moreOpen && "more-drop-open")}
              onTransitionEnd={(e) => {
                if (e.propertyName !== "grid-template-rows") return;
                if (moreOpen) setMoreUnlocked(true);
              }}
            >
              <div
                className={cx(
                  "min-h-0",
                  moreUnlocked ? "overflow-visible" : "overflow-hidden",
                )}
              >
                <div className="more-drop-inner grid gap-x-4 gap-y-3.5 pt-3 sm:grid-cols-2">
                  <Field label={t(lang, "dutyKind")} as="div">
                    <div
                      className="grid h-10 grid-cols-2 gap-1"
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
                            onClick={() => patch("dutyKind", k)}
                            className={cx(
                              "inline-flex h-10 items-center justify-center rounded-[var(--radius-sm)] border text-[0.8125rem] transition-colors duration-150",
                              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
                              on
                                ? "border-[var(--color-accent)] font-medium text-[var(--color-accent)]"
                                : "border-[var(--color-rule-2)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-ink-2)]",
                            )}
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
                        className="grid h-10 grid-cols-2 gap-1"
                        role="group"
                        aria-label={t(lang, "arcMode")}
                      >
                        {(
                          [
                            [true, "arcVac"],
                            [false, "arcOil"],
                          ] as const
                        ).map(([vac, key]) => {
                          const on = input.preferVacuum === vac;
                          return (
                            <button
                              key={key}
                              type="button"
                              aria-pressed={on}
                              onClick={() => {
                                setInput((s) => ({
                                  ...s,
                                  preferVacuum: vac,
                                  medium: mediumFor(s.mounting, vac),
                                }));
                                touch();
                              }}
                              className={cx(
                                "inline-flex h-10 items-center justify-center rounded-[var(--radius-sm)] border text-[0.8125rem] transition-colors duration-150",
                                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
                                on
                                  ? "border-[var(--color-accent)] font-medium text-[var(--color-accent)]"
                                  : "border-[var(--color-rule-2)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-ink-2)]",
                              )}
                            >
                              {t(lang, key)}
                            </button>
                          );
                        })}
                      </div>
                    </Field>
                  ) : null}
                  {selectorVisible ? (
                    <Field label={t(lang, "selectorSize")}>
                      <select
                        className={controlClass}
                        value={input.selectorSize ?? "auto"}
                        onChange={(e) =>
                          patch(
                            "selectorSize",
                            e.target.value as SelectInput["selectorSize"],
                          )
                        }
                      >
                        <option value="auto">{t(lang, "auto")}</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                        <option value="DE">DE</option>
                      </select>
                    </Field>
                  ) : null}

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
                      <select
                        className={controlClass}
                        aria-label={t(lang, "acrossBil")}
                        value={
                          input.acrossTapBilKv != null &&
                          input.acrossTapBilKv > 0
                            ? String(input.acrossTapBilKv)
                            : ""
                        }
                        onChange={(e) =>
                          patch(
                            "acrossTapBilKv",
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value),
                          )
                        }
                      >
                        <option value="">{t(lang, "acrossUnset")}</option>
                        {input.acrossTapBilKv != null &&
                        input.acrossTapBilKv > 0 &&
                        !(ACROSS_BIL_OPTIONS_KV as readonly number[]).includes(
                          input.acrossTapBilKv,
                        ) ? (
                          <option value={input.acrossTapBilKv}>
                            {input.acrossTapBilKv} kV
                          </option>
                        ) : null}
                        {ACROSS_BIL_MENU.map((item) => (
                          <option key={item.value} value={item.value}>
                            {currentLabel(lang, item.labelZh, item.labelEn)}
                          </option>
                        ))}
                      </select>
                      <select
                        className={controlClass}
                        aria-label={t(lang, "acrossPf")}
                        value={
                          input.acrossTapPfKv != null &&
                          input.acrossTapPfKv > 0
                            ? String(input.acrossTapPfKv)
                            : ""
                        }
                        onChange={(e) =>
                          patch(
                            "acrossTapPfKv",
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value),
                          )
                        }
                      >
                        <option value="">{t(lang, "acrossUnset")}</option>
                        {input.acrossTapPfKv != null &&
                        input.acrossTapPfKv > 0 &&
                        !(ACROSS_PF_OPTIONS_KV as readonly number[]).includes(
                          input.acrossTapPfKv,
                        ) ? (
                          <option value={input.acrossTapPfKv}>
                            {input.acrossTapPfKv} kV
                          </option>
                        ) : null}
                        {ACROSS_PF_MENU.map((item) => (
                          <option key={item.value} value={item.value}>
                            {currentLabel(lang, item.labelZh, item.labelEn)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </Field>
                  <Field as="div" label={t(lang, "safetyK")}>
                    <PercentCombo
                      value={safetyK}
                      options={SAFETY_K_OPTIONS}
                      prefix="×"
                      suffix=""
                      onChange={(k) => {
                        setSafetyK(k);
                        touch();
                      }}
                    />
                  </Field>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
            <button
              type="submit"
              disabled={
                running ||
                (currentMode === "capacity"
                  ? !derivedOk
                  : !input.throughCurrentA)
              }
              className={cx(
                "inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-6 text-[0.9375rem] font-semibold whitespace-nowrap text-[var(--color-accent-ink)] transition-[opacity,transform] duration-150",
                "sm:h-11 sm:w-auto sm:min-w-[12.5rem] sm:shrink-0 sm:px-8",
                "hover:opacity-90 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
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
            <p className="text-center text-[0.8125rem] leading-snug text-[var(--color-muted)] sm:max-w-[22rem] sm:text-left">
              {t(lang, "reRunHint")}
            </p>
          </div>
        </form>

        {/* —— Result pane —— */}
        <aside
          ref={resultPaneRef}
          className={cx(
            "flex min-w-0 flex-col scroll-mt-16 md:h-full md:sticky md:top-4",
            idle && !running && "max-md:hidden",
          )}
          style={
            moreOpen && paneMinH
              ? { minHeight: paneMinH }
              : undefined
          }
        >
          {!hasRun || !result ? (
            <IdlePanel lang={lang} running={running} />
          ) : (
            <div
              key={resultKey}
              className={cx(
                "result-enter flex h-full min-h-full flex-col rounded-[var(--radius-md)] border border-[var(--color-rule)] bg-white shadow-[0_1px_2px_oklch(24%_0.02_258_/_0.04)]",
                stale && "opacity-70",
              )}
            >
              {stale ? (
                <div className="border-b border-[var(--color-rule)] bg-[oklch(96%_0.03_85)] px-4 py-1.5 text-center text-[0.75rem] text-[var(--color-warn)]">
                  {t(lang, "stale")}
                </div>
              ) : null}

              {!result.ok || !primary ? (
                <div className="p-5">
                  <p className="font-[family-name:var(--font-display)] text-[0.9375rem] font-semibold text-[var(--color-err)]">
                    {t(lang, "noMatch")}
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.8125rem] text-[var(--color-ink-2)]">
                    {(lang === "zh" ? result.errorsZh : result.errorsEn).map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <>
                  <div className="shrink-0 border-b border-[var(--color-rule)] px-4 pt-3.5 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[0.75rem] font-medium text-[var(--color-accent)]">
                          {t(lang, "recommended")}
                        </p>
                        <p className="mt-0.5 text-[0.6875rem] leading-snug text-[var(--color-muted)]">
                          {t(lang, "recommendedHint")}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyModel(primary.model)}
                        className={cx(
                          "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 text-[0.75rem] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
                          copiedModel === primary.model
                            ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                            : "border-[var(--color-rule)] text-[var(--color-ink-2)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
                        )}
                        aria-label={
                          copiedModel === primary.model
                            ? t(lang, "copied")
                            : t(lang, "copyType")
                        }
                      >
                        {copiedModel === primary.model ? (
                          <CheckIcon className="h-4 w-4" aria-hidden />
                        ) : (
                          <ClipboardDocumentIcon className="h-4 w-4" aria-hidden />
                        )}
                        <span aria-live="polite">
                          {copiedModel === primary.model
                            ? t(lang, "copied")
                            : t(lang, "copy")}
                        </span>
                      </button>
                    </div>
                    <p className="mt-2.5 min-w-0 font-mono text-[1.0625rem] leading-snug font-medium tracking-tight break-words text-[var(--color-ink)] sm:text-[1.1875rem]">
                      {primary.model}
                    </p>
                    {voltageMode === "winding" ? (
                      <p className="mt-1.5 text-[0.75rem] leading-snug text-[var(--color-muted)]">
                        {t(
                          lang,
                          input.connection === "Y"
                            ? "umResultStar"
                            : "umResultLine",
                          {
                            rated: windingRatedKv,
                            um: oltcUmFromRatedKv(
                              windingRatedKv,
                              input.connection,
                            ),
                          },
                        )}
                      </p>
                    ) : null}
                  </div>

                  <ModelSpec
                    lang={lang}
                    r={primary}
                    dutyMounting={input.mounting}
                  />

                  {admin ? (
                    <ListPrice
                      model={primary.model}
                      lang={lang}
                      currency={currency}
                      fx={fx}
                      onCurrency={setCurrency}
                    />
                  ) : null}

                  {alts.length > 0 ? (
                    <div className="shrink-0 border-t border-[var(--color-rule)] px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => setAltsOpen((o) => !o)}
                        className="flex w-full items-center justify-between text-left text-[0.75rem] font-medium text-[var(--color-ink-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                        aria-expanded={altsOpen}
                      >
                        <span>
                          {t(lang, "otherOpts", { n: alts.length })}
                        </span>
                        <ChevronDownIcon
                          className={cx(
                            "h-4 w-4 shrink-0 text-[var(--color-muted)] transition-transform duration-200",
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
                            {alts.map((r, i) => {
                              const open = openAlts.includes(r.model);
                              return (
                                <li
                                  key={r.model}
                                  className="rounded-[var(--radius-sm)] border border-[var(--color-rule)]"
                                >
                                  <div className="flex items-center gap-1.5 px-3 py-2">
                                    <button
                                      type="button"
                                      aria-expanded={open}
                                      onClick={() =>
                                        setOpenAlts((cur) =>
                                          open
                                            ? cur.filter((m) => m !== r.model)
                                            : [...cur, r.model],
                                        )
                                      }
                                      className="flex min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-sm)] px-0.5 py-0.5 text-left transition-colors hover:text-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                                    >
                                      <ChevronDownIcon
                                        className={cx(
                                          "h-4 w-4 shrink-0 text-[var(--color-muted)] transition-transform duration-200",
                                          open && "rotate-180",
                                        )}
                                        aria-hidden
                                      />
                                      <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                        <span className="min-w-0 break-all font-mono text-[0.875rem] leading-snug text-[var(--color-ink)]">
                                          {r.model}
                                        </span>
                                        {i === 0 ? (
                                          <span className="shrink-0 rounded-full border border-[var(--color-rule-2)] px-1.5 py-0.5 text-[0.625rem] leading-none text-[var(--color-ink-2)]">
                                            {t(lang, "allRound")}
                                          </span>
                                        ) : null}
                                      </span>
                                    </button>
                                    <span className="flex shrink-0 items-center gap-1.5">
                                      {admin ? (
                                        <AltListAmount
                                          model={r.model}
                                          lang={lang}
                                          currency={currency}
                                          fx={fx}
                                        />
                                      ) : null}
                                      <button
                                        type="button"
                                        onClick={() => copyModel(r.model)}
                                        className="inline-flex h-8 shrink-0 items-center rounded-[var(--radius-sm)] px-2 text-[0.75rem] text-[var(--color-accent)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
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
          )}
        </aside>
      </div>
      <div className="min-h-0 flex-[1.55]" aria-hidden />
    </div>
  );
}

function IdlePanel({ lang, running }: { lang: Lang; running: boolean }) {
  return (
    <div
      className={cx(
        "flex h-full min-h-[22rem] flex-col items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--color-rule-2)] bg-[var(--color-soft)] px-5 py-8 text-center transition-opacity duration-200 sm:px-6 sm:py-10 md:min-h-0 md:py-8",
        running && "opacity-70",
      )}
    >
      {running ? (
        <>
          <span className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-rule-2)] border-t-[var(--color-accent)]" />
          <p className="text-sm text-[var(--color-ink-2)]">{t(lang, "selecting")}</p>
        </>
      ) : (
        <>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-rule)] bg-white text-[var(--color-muted)]">
            <ClipboardDocumentListIcon className="h-5 w-5" aria-hidden />
          </div>
          <p className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--color-ink)]">
            {t(lang, "idleTitle")}
          </p>
          <p className="mt-2 max-w-[28ch] text-[0.875rem] leading-relaxed text-[var(--color-muted)]">
            {t(lang, "idleBody")}
          </p>
        </>
      )}
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

function ModelSpec({
  lang,
  r,
  dutyMounting,
  compact,
}: {
  lang: Lang;
  r: ModelResult;
  dutyMounting: SelectInput["mounting"];
  compact?: boolean;
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
  items.push({ key: "specPos", value: String(r.positions) });
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
        "grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3",
        compact
          ? "shrink-0 border-t border-[var(--color-rule)] px-3 py-2.5"
          : "shrink-0 border-b border-[var(--color-rule)] px-4 py-2.5 gap-x-5 gap-y-2",
      )}
    >
      {items.map((item) => (
        <div key={item.key} className="min-w-0">
          <dt className="text-[0.6875rem] leading-snug text-[var(--color-muted)]">
            {t(lang, item.key)}
          </dt>
          <dd
            className="mt-0.5 text-[0.875rem] leading-snug tabular-nums text-[var(--color-ink)]"
            translate="no"
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}


