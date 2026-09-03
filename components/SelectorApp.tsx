"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
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
  LINEAR_POSITION_OPTIONS,
  POSITION_OPTIONS,
  SERIES,
  STEP_VOLTAGE_OPTIONS_V,
  UM_MENU,
} from "@/lib/catalog";
import { FIXTURES, selectOltc, stepUpOf } from "@/lib/engine";
import {
  lookupDiagram,
  midOptionsFor,
  pitchFromPlusMinus,
  pmStepOptionsFor,
  positionsFor,
  preferredMid,
} from "@/lib/tapCode";
import { LangSwitcher } from "@/components/LangSwitcher";
import { AltListAmount, ListPrice, useListFx } from "@/components/ListPrice";
import {
  currentLabel,
  getAppLang,
  getServerLang,
  setAppLang,
  subscribeAppLang,
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

const defaultInput: SelectInput = {
  mounting: "in_tank",
  medium: "oil_vacuum",
  preferVacuum: true,
  phases: "III",
  connection: "Y",
  throughCurrentA: 400,
  umKv: 72.5,
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

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/** Comfortable control — one hover signal (border), shared height */
const controlClass =
  "h-10 w-full min-w-0 rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] bg-white px-3 text-[0.9rem] leading-snug text-[var(--color-ink)] transition-colors duration-150 hover:border-[var(--color-accent)] focus:border-[var(--color-accent)] focus:outline-none";

function Field({
  label,
  tip,
  children,
  className,
  action,
}: {
  label: string;
  tip?: string;
  children: React.ReactNode;
  className?: string;
  /** Right-side of the label row (e.g. →19位 next to ±级数) */
  action?: React.ReactNode;
}) {
  return (
    <label className={cx("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="flex min-h-[1.25rem] items-center gap-2">
        <span className="min-w-0 text-[0.8125rem] leading-snug font-medium text-[var(--color-ink)]">
          {label}
        </span>
        {action ? (
          <span className="shrink-0 whitespace-nowrap text-[0.75rem] leading-none text-[var(--color-muted)]">
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
    </label>
  );
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
  const lang = useSyncExternalStore(
    subscribeAppLang,
    getAppLang,
    getServerLang,
  );
  const setLang = setAppLang;
  const [input, setInput] = useState<SelectInput>(defaultInput);
  const [pm, setPm] = useState("8");
  const [activeExample, setActiveExample] = useState<ExampleKey | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [altsOpen, setAltsOpen] = useState(false);
  const [openAlts, setOpenAlts] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const beforePreset = useRef<{
    input: SelectInput;
    pm: string;
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

  const isLinear = input.regulation === "linear";
  const selectorVisible = showSelectorSize(input);

  const touch = () => {
    if (hasRun) setStale(true);
    setActiveExample(null);
  };

  const patch = <K extends keyof SelectInput>(k: K, v: SelectInput[K]) => {
    setInput((s) => ({ ...s, [k]: v }));
    touch();
  };

  const setRegulation = (reg: SelectInput["regulation"]) => {
    touch();
    if (reg === "linear") {
      setPm("");
      setInput((s) => ({
        ...s,
        regulation: reg,
        plusMinusSteps: undefined,
        positions: s.positions && s.positions <= 18 ? s.positions : 9,
        midPositions: 0,
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

  const applyPm = (raw: string) => {
    setPm(raw);
    touch();
    if (!raw) {
      setInput((s) => ({ ...s, plusMinusSteps: undefined }));
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return;
    // Changing ±N resets mid to brochure preferred and recomputes P = 2N+mid
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
      return { ...s, midPositions: mid };
    });
  };

  const runSelect = () => {
    if (runTimer.current) clearTimeout(runTimer.current);
    setRunning(true);
    setAltsOpen(false);
    setOpenAlts([]);
    runTimer.current = setTimeout(() => {
      const out = selectOltc(input);
      setResult(out);
      setResultKey((k) => k + 1);
      setHasRun(true);
      setStale(false);
      setRunning(false);
      setAltsOpen(out.ok && out.results.length > 1);
      // Mobile: result sits below the form — scroll it into view after select
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

  const copyModel = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
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
      } else {
        setInput(defaultInput);
        setPm("8");
      }
      setActiveExample(null);
      clearResult();
      return;
    }
    if (activeExample == null) {
      beforePreset.current = { input, pm };
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
    setInput(next);
    setActiveExample(ex.key);
    clearResult();
  };

  const primary = result?.ok ? result.results[0] : null;
  const stepUp =
    result?.ok && primary ? stepUpOf(primary, result.results) : null;
  const alts = (() => {
    if (!result?.ok || !primary) return [];
    const out: typeof result.results = [];
    if (stepUp) out.push(stepUp);
    for (const r of result.results.slice(1)) {
      if (out.length >= 3) break;
      if (r.model === primary.model) continue;
      if (out.some((x) => x.model === r.model)) continue;
      out.push(r);
    }
    return out;
  })();
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
  const midOpts =
    !isLinear && pmN != null
      ? midOptionsFor(pmN, input.regulation)
      : ([3, 1] as Array<1 | 3>);
  /** Collapsed “more options” summary — non-default advanced fields */
  const moreBits: string[] = [];
  if (input.dutyKind === "octc") moreBits.push(t(lang, "dutyOctc"));
  if (input.mounting !== "in_tank") {
    moreBits.push(
      t(
        lang,
        input.mounting === "on_tank"
          ? "mountOn"
          : input.mounting === "external_compartment"
            ? "mountExt"
            : input.mounting === "dry_type"
              ? "mountDry"
              : "mountReactor",
      ),
    );
  }
  if (input.acrossTapBilKv != null && input.acrossTapBilKv > 0) {
    moreBits.push(`BIL ${input.acrossTapBilKv} kV`);
  }
  if (input.acrossTapPfKv != null && input.acrossTapPfKv > 0) {
    moreBits.push(`PF ${input.acrossTapPfKv} kV`);
  }
  if (
    selectorVisible &&
    input.selectorSize &&
    input.selectorSize !== "auto"
  ) {
    moreBits.push(`${t(lang, "selectorSize")} ${input.selectorSize}`);
  }
  const moreSummaryCount = moreBits.length;
  const moreSummaryText = moreBits.join(" · ");

  return (
    <div className="selector-shell mx-auto flex w-full min-w-0 max-w-[1100px] flex-col gap-5 px-4 pt-6 pb-6 sm:gap-6 sm:px-6 sm:pt-8 sm:pb-8">
      {/* Stack on phone: title full width, langs row below — avoids squashed header */}
      <header className="flex shrink-0 flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-[family-name:var(--font-display)] text-[1.45rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--color-ink)] sm:text-[1.8rem]">
            {t(lang, "title")}
          </h1>
          <p className="mt-1.5 max-w-[52rem] text-[0.875rem] leading-snug text-[var(--color-muted)] sm:text-[0.9rem]">
            {t(lang, "subtitle")}
          </p>
        </div>
        <LangSwitcher
          lang={lang}
          onChange={setLang}
          ariaLabel={t(lang, "langAria")}
        />
      </header>

      {/* Leftover space, biased slightly up (bottom spacer grows more). Collapses when the page scrolls. */}
      <div className="min-h-0 flex-1" aria-hidden />

      {/* Single column phone → two columns desktop; result below form on mobile */}
      <div
        className={cx(
          "grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-2 lg:gap-6",
          moreOpen ? "lg:items-start" : "lg:items-stretch",
        )}
      >
        {/* —— Form —— */}
        <form
          ref={formRef}
          className="min-w-0 rounded-[var(--radius-md)] border border-[var(--color-rule)] bg-white p-4 shadow-[0_1px_2px_oklch(24%_0.02_258_/_0.04)] sm:p-6"
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
            <Field label={t(lang, "throughCurrent")}>
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
            </Field>

            <Field
              label={t(lang, "um")}
            >
              <select
                className={controlClass}
                value={String(input.umKv)}
                onChange={(e) => patch("umKv", Number(e.target.value))}
              >
                {UM_MENU.map((u) => (
                  <option key={u.value} value={u.value}>
                    {currentLabel(lang, u.labelZh, u.labelEn)}
                  </option>
                ))}
              </select>
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

            {input.mounting !== "dry_type" && input.mounting !== "reactor" ? (
              <Field label={t(lang, "arcMode")} tip={t(lang, "arcTip")}>
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

            {isLinear ? (
              <Field label={t(lang, "positions")}>
                <select
                  className={controlClass}
                  value={input.positions ?? 9}
                  onChange={(e) => patch("positions", Number(e.target.value))}
                >
                  {LINEAR_POSITION_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field
                label={t(lang, "pmSteps")}
                action={
                  posHint ? (
                    <span className="font-mono font-medium tabular-nums">
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
                  {pmOptions.map((n) => (
                    <option key={n} value={String(n)}>
                      ±{n}
                      {lang === "zh" ? " 级" : lang === "ru" ? " ст." : ""}
                    </option>
                  ))}
                  <option value="">
                    {t(lang, "customPos")}
                  </option>
                </select>
              </Field>
            )}

            {!isLinear && !pm ? (
              <Field label={t(lang, "positions")}>
                <select
                  className={controlClass}
                  value={input.positions ?? 19}
                  onChange={(e) => {
                    touch();
                    setInput((s) => ({
                      ...s,
                      positions: Number(e.target.value),
                      plusMinusSteps: undefined,
                    }));
                  }}
                >
                  {POSITION_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            {!isLinear && midOpts.length > 1 ? (
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
                {STEP_VOLTAGE_OPTIONS_V.map((v) => (
                  <option key={v} value={v}>
                    {v} V
                  </option>
                ))}
              </select>
            </Field>

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

          {/* More options — same plain grid as main duty fields */}
          <div className="mt-4 border-t border-[var(--color-rule)] pt-2.5">
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-3 py-1.5 text-left"
              aria-expanded={moreOpen}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="text-[0.8125rem] font-medium text-[var(--color-ink)]">
                  {t(lang, "more")}
                </span>
                {moreSummaryCount > 0 ? (
                  <span className="truncate text-[0.72rem] text-[var(--color-muted)]">
                    {moreSummaryText}
                  </span>
                ) : null}
              </span>
              <ChevronDownIcon
                className={cx(
                  "h-4 w-4 shrink-0 text-[var(--color-muted)] transition-transform duration-200",
                  moreOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>

            <div
              className={cx(
                "grid transition-[grid-template-rows] duration-200 ease-out",
                moreOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div
                className={cx(
                  "min-h-0",
                  moreOpen ? "overflow-visible" : "overflow-hidden",
                )}
              >
                <div className="grid gap-x-4 gap-y-3.5 pt-3 sm:grid-cols-2">
                  <Field label={t(lang, "dutyKind")}>
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

                  <div className="col-span-full grid grid-cols-2 gap-x-4">
                    <Field label={t(lang, "acrossBil")}>
                      <select
                        className={controlClass}
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
                    </Field>
                    <Field label={t(lang, "acrossPf")}>
                      <select
                        className={controlClass}
                        value={
                          input.acrossTapPfKv != null && input.acrossTapPfKv > 0
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
                    </Field>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
            <button
              type="submit"
              disabled={running || !input.throughCurrentA}
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
            "flex min-w-0 flex-col scroll-mt-16 lg:h-full lg:sticky lg:top-6",
            idle && !running && "max-lg:hidden",
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
                        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-rule)] px-2.5 text-[0.75rem] font-medium text-[var(--color-ink-2)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                        aria-label={t(lang, "copyType")}
                      >
                        <ClipboardDocumentIcon className="h-4 w-4" aria-hidden />
                        <span className="hidden min-[380px]:inline">
                          {copied ? t(lang, "copied") : t(lang, "copy")}
                        </span>
                      </button>
                    </div>
                    <p className="mt-2.5 min-w-0 font-mono text-[1.0625rem] leading-snug font-medium tracking-tight break-words text-[var(--color-ink)] sm:text-[1.1875rem]">
                      {primary.model}
                    </p>
                  </div>

                  <ModelSpec
                    lang={lang}
                    r={primary}
                    dutyMounting={input.mounting}
                  />

                  <ListPrice
                    model={primary.model}
                    lang={lang}
                    currency={currency}
                    fx={fx}
                    onCurrency={setCurrency}
                  />

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
                                        {stepUp?.model === r.model ? (
                                          <span className="shrink-0 rounded-full border border-[var(--color-rule-2)] px-1.5 py-0.5 text-[0.625rem] leading-none text-[var(--color-ink-2)]">
                                            {t(lang, "stepUp")}
                                          </span>
                                        ) : null}
                                      </span>
                                    </button>
                                    <span className="flex shrink-0 items-center gap-1.5">
                                      <AltListAmount
                                        model={r.model}
                                        lang={lang}
                                        currency={currency}
                                        fx={fx}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => copyModel(r.model)}
                                        className="inline-flex h-8 shrink-0 items-center rounded-[var(--radius-sm)] px-2 text-[0.75rem] text-[var(--color-accent)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
                                        aria-label={t(lang, "copy")}
                                      >
                                        {t(lang, "copy")}
                                      </button>
                                    </span>
                                  </div>
                                  {open ? (
                                    <ModelSpec
                                      lang={lang}
                                      r={r}
                                      dutyMounting={input.mounting}
                                      compact
                                    />
                                  ) : null}
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
        "flex h-full min-h-[22rem] flex-col items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--color-rule-2)] bg-[var(--color-soft)] px-5 py-8 text-center transition-opacity duration-200 sm:px-6 sm:py-10",
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


