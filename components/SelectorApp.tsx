"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDownIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import {
  ACROSS_BIL_OPTIONS_KV,
  ACROSS_PF_OPTIONS_KV,
  CURRENT_MENU,
  LINEAR_POSITION_OPTIONS,
  POSITION_OPTIONS,
  STEP_VOLTAGE_OPTIONS_V,
  UM_OPTIONS_KV,
  nearestCurrent,
} from "@/lib/catalog";
import { FIXTURES, selectOltc } from "@/lib/engine";
import {
  lookupDiagram,
  midOptionsFor,
  pitchFromPlusMinus,
  pmStepOptionsFor,
  positionsFor,
  preferredMid,
} from "@/lib/tapCode";
import { LangSwitcher } from "@/components/LangSwitcher";
import { currentLabel, t, type Lang } from "@/lib/i18n";
import type { ModelResult, SelectInput, SelectOutput } from "@/lib/types";

/** Apply brochure (±N, mid) geometry onto a SelectInput patch. */
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
};

type ExampleKey = "case1Cv2" | "case2Cm2" | "case5Cv2_145";

const EXAMPLES: { key: ExampleKey; pm: string; labelKey: string; hintKey: string }[] = [
  { key: "case1Cv2", pm: "8", labelKey: "exSmall", hintKey: "exHint1" },
  { key: "case2Cm2", pm: "8", labelKey: "exMv", hintKey: "exHint2" },
  { key: "case5Cv2_145", pm: "10", labelKey: "ex145", hintKey: "exHint3" },
];

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/** Comfortable control — slightly tighter than first draft, not cramped */
const controlClass =
  "w-full rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] bg-white px-3 py-2 text-[0.9rem] leading-snug text-[var(--color-ink)] transition-[border-color,box-shadow] duration-150 hover:border-[oklch(70%_0.03_256)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[oklch(58%_0.2_256_/_0.15)]";

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
      <span className="flex min-h-[1.125rem] items-center justify-between gap-2">
        <span className="text-[0.8125rem] font-medium text-[var(--color-ink)]">
          {label}
        </span>
        {action ? (
          <span className="shrink-0 text-[0.75rem] leading-none text-[var(--color-accent)]">
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

function isMenuCurrent(a: number): boolean {
  return CURRENT_MENU.some((c) => Math.abs(c.value - a) < 0.01);
}

/** Ceiling tip from in-tank vacuum III axes only (not dry-type 160 A). */
export function SelectorApp() {
  const [lang, setLang] = useState<Lang>("zh");
  const [input, setInput] = useState<SelectInput>(defaultInput);
  const [iCustom, setICustom] = useState(false);
  const [pm, setPm] = useState("8");
  const [activeExample, setActiveExample] = useState<ExampleKey | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [altsOpen, setAltsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const [result, setResult] = useState<SelectOutput | null>(null);
  const [resultKey, setResultKey] = useState(0);
  const [hasRun, setHasRun] = useState(false);
  const [stale, setStale] = useState(false);
  const [running, setRunning] = useState(false);
  const runTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    runTimer.current = setTimeout(() => {
      const out = selectOltc(input);
      setResult(out);
      setResultKey((k) => k + 1);
      setHasRun(true);
      setStale(false);
      setRunning(false);
    }, 280);
  };

  useEffect(() => {
    return () => {
      if (runTimer.current) clearTimeout(runTimer.current);
    };
  }, []);

  const copyModel = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  const loadExample = (ex: (typeof EXAMPLES)[number]) => {
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
    setICustom(!isMenuCurrent(next.throughCurrentA));
    setActiveExample(ex.key);
    setResult(null);
    setHasRun(false);
    setStale(false);
    setAltsOpen(false);
  };

  const primary = result?.ok ? result.results[0] : null;
  const alts = result?.ok ? result.results.slice(1, 4) : [];
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
  const iIsCustom = iCustom || !isMenuCurrent(input.throughCurrentA);

  /** Collapsed “more options” summary — non-default advanced fields */
  const moreBits: string[] = [];
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
  if (input.medium !== "oil_vacuum") {
    moreBits.push(
      t(lang, input.medium === "oil" ? "medOil" : "medDry"),
    );
  }
  if (!input.preferVacuum) moreBits.push(t(lang, "preferVacOff"));
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
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-[family-name:var(--font-display)] text-[1.65rem] font-semibold tracking-[-0.03em] text-[var(--color-ink)] sm:text-[1.8rem]">
            {t(lang, "title")}
          </h1>
          <p className="mt-1 text-[0.9rem] text-[var(--color-muted)]">
            {t(lang, "subtitle")}
          </p>
        </div>
        <LangSwitcher
          lang={lang}
          onChange={setLang}
          ariaLabel={t(lang, "langAria")}
        />
      </header>

      {/* Equal halves, centered page */}
      <div className="grid items-stretch gap-5 lg:grid-cols-2 lg:gap-6">
        {/* —— Form —— */}
        <form
          className="rounded-[var(--radius-md)] border border-[var(--color-rule)] bg-white p-5 shadow-[0_1px_2px_oklch(24%_0.02_258_/_0.04)] sm:p-6"
          onSubmit={(e) => {
            e.preventDefault();
            runSelect();
          }}
        >
          <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--color-ink)]">
              {t(lang, "duty")}
            </h2>
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-label={t(lang, "examplesAria")}
            >
              {EXAMPLES.map((ex) => {
                const on = activeExample === ex.key;
                return (
                  <button
                    key={ex.key}
                    type="button"
                    onClick={() => loadExample(ex)}
                    title={t(lang, ex.hintKey)}
                    className={cx(
                      "rounded-full border px-2.5 py-1 text-[0.75rem] transition-colors duration-150",
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
              label={t(lang, "throughCurrent")}
              action={
                iIsCustom ? (
                  <button
                    type="button"
                    className="text-[0.6875rem] text-[var(--color-accent)] hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      setICustom(false);
                      const vals = CURRENT_MENU.map((c) => c.value);
                      const n = nearestCurrent(input.throughCurrentA, vals);
                      patch("throughCurrentA", n ?? 400);
                    }}
                  >
                    {t(lang, "ratings")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="text-[0.6875rem] text-[var(--color-muted)] hover:text-[var(--color-accent)] hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      setICustom(true);
                      touch();
                    }}
                  >
                    {t(lang, "custom")}
                  </button>
                )
              }
            >
              {/* Single control slot — swap in place so examples don't reflow */}
              {iIsCustom ? (
                <div className="relative">
                  <input
                    className={cx(controlClass, "pr-9")}
                    type="number"
                    min={1}
                    step="any"
                    required
                    value={input.throughCurrentA || ""}
                    onChange={(e) =>
                      patch("throughCurrentA", Number(e.target.value) || 0)
                    }
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-xs text-[var(--color-muted)]">
                    A
                  </span>
                </div>
              ) : (
                <select
                  className={controlClass}
                  value={String(input.throughCurrentA)}
                  onChange={(e) => {
                    setICustom(false);
                    patch("throughCurrentA", Number(e.target.value));
                  }}
                >
                  {CURRENT_MENU.map((c) => (
                    <option key={c.value} value={c.value}>
                      {currentLabel(lang, c.labelZh, c.labelEn)}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <Field
              label={t(lang, "um")}
            >
              <select
                className={controlClass}
                value={String(input.umKv)}
                onChange={(e) => patch("umKv", Number(e.target.value))}
              >
                {UM_OPTIONS_KV.map((u) => (
                  <option key={u} value={u}>
                    {u} kV
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

            <Field label={t(lang, "phases")}>
              <select
                className={controlClass}
                value={input.phases}
                onChange={(e) =>
                  patch("phases", e.target.value as SelectInput["phases"])
                }
              >
                <option value="III">III</option>
                <option value="II">II</option>
                <option value="I">I</option>
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

            {!isLinear ? (
              <Field label={t(lang, "mid")}>
                <select
                  className={controlClass}
                  value={String(
                    midOpts.includes((input.midPositions as 1 | 3) ?? 3)
                      ? input.midPositions
                      : midOpts[0] ?? 3,
                  )}
                  onChange={(e) => applyMid(e.target.value)}
                  disabled={midOpts.length <= 1}
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
              <div className="overflow-hidden">
                <div className="grid gap-x-4 gap-y-3.5 pt-3 sm:grid-cols-2">
                  <Field label={t(lang, "mounting")}>
                    <select
                      className={controlClass}
                      value={input.mounting}
                      onChange={(e) =>
                        patch(
                          "mounting",
                          e.target.value as SelectInput["mounting"],
                        )
                      }
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
                  <Field label={t(lang, "medium")}>
                    <select
                      className={controlClass}
                      value={input.medium}
                      onChange={(e) =>
                        patch(
                          "medium",
                          e.target.value as SelectInput["medium"],
                        )
                      }
                    >
                      <option value="oil_vacuum">{t(lang, "medVac")}</option>
                      <option value="oil">{t(lang, "medOil")}</option>
                      <option value="dry">{t(lang, "medDry")}</option>
                    </select>
                  </Field>

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
                      {ACROSS_BIL_OPTIONS_KV.map((v) => (
                        <option key={v} value={v}>
                          {v} kV
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
                      {ACROSS_PF_OPTIONS_KV.map((v) => (
                        <option key={v} value={v}>
                          {v} kV
                        </option>
                      ))}
                    </select>
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

                  <label className="flex items-center gap-2 self-end pb-1.5 text-[0.8125rem] text-[var(--color-ink-2)]">
                    <input
                      type="checkbox"
                      className="size-3.5 accent-[var(--color-accent)]"
                      checked={input.preferVacuum}
                      onChange={(e) =>
                        patch("preferVacuum", e.target.checked)
                      }
                    />
                    {t(lang, "preferVac")}
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={running || !input.throughCurrentA}
              className={cx(
                "inline-flex min-h-[2.6rem] flex-1 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-5 text-[0.9rem] font-semibold text-[var(--color-accent-ink)] transition-[transform,opacity,background-color] duration-150",
                "hover:brightness-105 active:scale-[0.98]",
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
            <p className="text-center text-[0.75rem] text-[var(--color-muted)] sm:max-w-[14rem] sm:text-left">
              {t(lang, "reRunHint")}
            </p>
          </div>
        </form>

        {/* —— Result pane —— */}
        <aside className="min-w-0 lg:sticky lg:top-6">
          {!hasRun || !result ? (
            <IdlePanel lang={lang} running={running} />
          ) : (
            <div
              key={resultKey}
              className={cx(
                "result-enter h-full rounded-[var(--radius-md)] border border-[var(--color-rule)] bg-white shadow-[0_1px_2px_oklch(24%_0.02_258_/_0.04)]",
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
                  <div className="border-b border-[var(--color-rule)] px-4 pt-4 pb-3">
                    <p className="font-mono text-[10px] tracking-[0.08em] text-[var(--color-accent)] uppercase">
                      {t(lang, "recommended")}
                    </p>
                    <p className="mt-2 break-all font-mono text-[1.05rem] leading-snug font-medium tracking-tight text-[var(--color-ink)] sm:text-[1.15rem]">
                      {primary.model}
                    </p>
                    <button
                      type="button"
                      onClick={() => copyModel(primary.model)}
                      className="mt-3 rounded-[var(--radius-sm)] bg-[var(--color-graphite)] px-3 py-1.5 text-[0.8125rem] font-medium text-white transition-opacity hover:opacity-90"
                    >
                      {copied ? t(lang, "copied") : t(lang, "copyType")}
                    </button>
                  </div>

                  <div className="space-y-2 px-4 py-3 text-[0.8125rem] leading-relaxed text-[var(--color-ink-2)]">
                    <p>{plainWhy(lang, primary)}</p>
                    <p className="text-[0.75rem] text-[var(--color-muted)]">
                      {t(lang, "disclaimer")}
                    </p>
                  </div>

                  {alts.length > 0 ? (
                    <div className="border-t border-[var(--color-rule)] px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => setAltsOpen((o) => !o)}
                        className="flex w-full items-center justify-between text-left text-[0.75rem] font-medium text-[var(--color-ink-2)]"
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
                        <div className="overflow-hidden">
                          <ul className="space-y-1.5 pt-2 pb-0.5">
                            {alts.map((r) => (
                              <li
                                key={r.model}
                                className="flex items-start justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--color-rule)] px-2.5 py-1.5"
                              >
                                <span className="break-all font-mono text-[0.75rem] text-[var(--color-ink)]">
                                  {r.model}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copyModel(r.model)}
                                  className="shrink-0 text-[0.6875rem] text-[var(--color-accent)] hover:underline"
                                >
                                  {t(lang, "copy")}
                                </button>
                              </li>
                            ))}
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
    </div>
  );
}

function IdlePanel({ lang, running }: { lang: Lang; running: boolean }) {
  return (
    <div
      className={cx(
        "flex h-full min-h-[280px] flex-col items-center justify-center rounded-[var(--radius-md)] border border-dashed border-[var(--color-rule-2)] bg-[var(--color-soft)] px-6 py-10 text-center transition-opacity duration-200",
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

function plainWhy(lang: Lang, r: ModelResult): string {
  return t(lang, "why", {
    code: r.seriesCode,
    i: r.currentA,
    um: r.umKv,
    sel: r.selectorSize ? t(lang, "whySel", { s: r.selectorSize }) : "",
    multi: r.unitCount > 1 ? t(lang, "whyMulti", { n: r.unitCount }) : "",
  });
}
