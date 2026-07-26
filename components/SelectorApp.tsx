"use client";

import { useEffect, useRef, useState } from "react";
import {
  CURRENT_OPTIONS_A,
  LINEAR_POSITION_OPTIONS,
  PM_STEP_OPTIONS,
  POSITION_OPTIONS,
  SERIES,
  STEP_VOLTAGE_OPTIONS_V,
  UM_OPTIONS_KV,
  nearestCurrent,
} from "@/lib/catalog";
import { FIXTURES, selectOltc } from "@/lib/engine";
import { positionsFromPlusMinus } from "@/lib/tapCode";
import type { Lang, ModelResult, SelectInput, SelectOutput } from "@/lib/types";

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
  positions: 19,
  pitch: 10,
  midPositions: 3,
  selectorSize: "auto",
  mdu: "none",
};

type ExampleKey = "case1Cv2" | "case2Cm2" | "case5Cv2_145";

const EXAMPLES: {
  key: ExampleKey;
  pm: string;
  zh: string;
  en: string;
  hintZh: string;
  hintEn: string;
}[] = [
  {
    key: "case1Cv2",
    pm: "8",
    zh: "小容量 Δ",
    en: "Small Δ",
    hintZh: "CV2 · 33 kV 线端",
    hintEn: "CV2 · 33 kV delta / line end",
  },
  {
    key: "case2Cm2",
    pm: "8",
    zh: "中压 Y",
    en: "MV Y",
    hintZh: "CM2 · 72.5C 星点",
    hintEn: "CM2 · 72.5C neutral point",
  },
  {
    key: "case5Cv2_145",
    pm: "10",
    zh: "145 kV",
    en: "145 kV",
    hintZh: "CV2 · 线端",
    hintEn: "CV2 · line-end regulation",
  },
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
  /** Right-side label action (same row as label — no height jump) */
  action?: React.ReactNode;
}) {
  return (
    <label className={cx("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="flex items-center justify-between gap-2">
        <span className="text-[0.8125rem] font-medium text-[var(--color-ink)]">
          {label}
        </span>
        {action}
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

function isCatalogueCurrent(a: number): boolean {
  return (CURRENT_OPTIONS_A as readonly number[]).some(
    (c) => Math.abs(c - a) < 0.01,
  );
}

/** Ceiling tip from in-tank vacuum III axes only (not dry-type 160 A). */
function iRoundTip(lang: Lang, wanted: number) {
  if (!wanted || isCatalogueCurrent(wanted)) return "";
  const pools = SERIES.filter(
    (s) => s.mounting.includes("in_tank") && s.vacuum,
  ).flatMap((s) => [...(s.currents.III ?? []), ...(s.currents.I ?? [])]);
  const uniq = [...new Set(pools)].sort((a, b) => a - b);
  const n = nearestCurrent(wanted, uniq);
  if (n == null || Math.abs(n - wanted) < 0.5) return "";
  return lang === "zh" ? `目录上靠 ${n} A` : `Rounds up to ${n} A`;
}

export function SelectorApp() {
  const [lang, setLang] = useState<Lang>("zh");
  const [input, setInput] = useState<SelectInput>(defaultInput);
  const [iCustom, setICustom] = useState(false);
  const [pm, setPm] = useState("9");
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

  const zh = lang === "zh";
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
    const n = pm && Number(pm) > 0 ? Number(pm) : 9;
    setPm(String(n));
    setInput((s) => ({
      ...s,
      regulation: reg,
      plusMinusSteps: n,
      positions: positionsFromPlusMinus(n),
      midPositions: 3,
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
    setInput((s) => ({
      ...s,
      plusMinusSteps: n,
      positions: positionsFromPlusMinus(n),
    }));
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
    const next = { ...f.input, mdu: "none" as const };
    setInput(next);
    setICustom(!isCatalogueCurrent(next.throughCurrentA));
    // Keep fixture positions; only set ± display when it matches
    if (ex.pm && next.positions != null) {
      setPm(ex.pm);
    } else {
      setPm("");
    }
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
      ? zh
        ? `${input.positions} 位`
        : `${input.positions} positions`
      : null;

  const iIsCustom = iCustom || !isCatalogueCurrent(input.throughCurrentA);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-[family-name:var(--font-display)] text-[1.65rem] font-semibold tracking-[-0.03em] text-[var(--color-ink)] sm:text-[1.8rem]">
            {zh ? "有载开关选型" : "OLTC Selector"}
          </h1>
          <p className="mt-1 text-[0.9rem] text-[var(--color-muted)]">
            {zh
              ? "填工况，点选型，拿最低满足型号。"
              : "Enter the duty, run Select, get the lowest-fit type."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setLang((l) => (l === "en" ? "zh" : "en"))}
          className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] px-3 py-1.5 font-mono text-xs text-[var(--color-ink-2)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          {zh ? "EN" : "中文"}
        </button>
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
              {zh ? "工况" : "Duty parameters"}
            </h2>
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-label={zh ? "示例工况" : "Load an example"}
            >
              {EXAMPLES.map((ex) => {
                const on = activeExample === ex.key;
                return (
                  <button
                    key={ex.key}
                    type="button"
                    onClick={() => loadExample(ex)}
                    title={zh ? ex.hintZh : ex.hintEn}
                    className={cx(
                      "rounded-full border px-2.5 py-1 text-[0.75rem] transition-colors duration-150",
                      on
                        ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                        : "border-[var(--color-rule)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
                    )}
                  >
                    {zh ? ex.zh : ex.en}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-x-4 gap-y-3.5 sm:grid-cols-2">
            <Field
              label={zh ? "通过电流 Iᵤ" : "Through-current Iᵤ"}
              tip={
                // Fixed-height slot so examples / custom never reflow the form
                iIsCustom
                  ? iRoundTip(lang, input.throughCurrentA) || "\u00a0"
                  : "\u00a0"
              }
              action={
                iIsCustom ? (
                  <button
                    type="button"
                    className="text-[0.6875rem] text-[var(--color-accent)] hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      setICustom(false);
                      const n = nearestCurrent(
                        input.throughCurrentA,
                        [...CURRENT_OPTIONS_A],
                      );
                      patch("throughCurrentA", n ?? 400);
                    }}
                  >
                    {zh ? "目录" : "Ratings"}
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
                    {zh ? "自定义" : "Custom"}
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
                    const v = e.target.value;
                    if (v === "custom") {
                      setICustom(true);
                      touch();
                      return;
                    }
                    setICustom(false);
                    patch("throughCurrentA", Number(v));
                  }}
                >
                  {CURRENT_OPTIONS_A.map((a) => (
                    <option key={a} value={a}>
                      {a} A
                    </option>
                  ))}
                </select>
              )}
            </Field>

            <Field
              label={
                zh ? "最高电压 Um" : "Highest voltage Um"
              }
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
              label={zh ? "开关连接" : "Connection"}
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
                <option value="Y">
                  {zh ? "Y · 星点" : "Y · neutral point"}
                </option>
                <option value="D">
                  {zh ? "D · 角形 / 线端" : "D · delta / line end"}
                </option>
                <option value="any">{zh ? "不限" : "Any"}</option>
              </select>
            </Field>

            <Field
              label={zh ? "调压方式" : "Tap winding"}
            >
              <select
                className={controlClass}
                value={input.regulation}
                onChange={(e) =>
                  setRegulation(e.target.value as SelectInput["regulation"])
                }
              >
                <option value="reversing">
                  {zh ? "正反调（W）" : "Reversing (W)"}
                </option>
                <option value="coarse_fine">
                  {zh ? "粗细调（G）" : "Coarse–fine (G)"}
                </option>
                <option value="linear">
                  {zh ? "线性调（无转换）" : "Linear (no change-over)"}
                </option>
              </select>
            </Field>

            {isLinear ? (
              <Field label={zh ? "工作位置数" : "Service positions"}>
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
                label={zh ? "± 级数" : "± steps"}
                tip={
                  posHint
                    ? zh
                      ? `→ ${posHint}`
                      : `→ ${posHint}`
                    : undefined
                }
              >
                <select
                  className={controlClass}
                  value={pm}
                  onChange={(e) => applyPm(e.target.value)}
                >
                  {PM_STEP_OPTIONS.map((n) => (
                    <option key={n} value={String(n)}>
                      ±{n}
                      {zh ? " 级" : ""}
                    </option>
                  ))}
                  <option value="">
                    {zh ? "自定义位置…" : "Custom positions…"}
                  </option>
                </select>
              </Field>
            )}

            {!isLinear && !pm ? (
              <Field label={zh ? "工作位置数" : "Service positions"}>
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

            <Field
              label={zh ? "最大级电压 Ust" : "Max step voltage Ust"}
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

          {/* More options */}
          <div className="mt-4 border-t border-[var(--color-rule)] pt-2.5">
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className="flex w-full items-center justify-between py-1 text-left text-[0.8125rem] font-medium text-[var(--color-ink-2)]"
              aria-expanded={moreOpen}
            >
              <span>{zh ? "更多选项" : "More options"}</span>
              <span
                className={cx(
                  "font-mono text-xs text-[var(--color-muted)] transition-transform duration-200",
                  moreOpen && "rotate-180",
                )}
              >
                ▾
              </span>
            </button>

            <div
              className={cx(
                "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                moreOpen
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <div className="grid gap-x-4 gap-y-3.5 pt-3 sm:grid-cols-2">
                  <Field label={zh ? "安装" : "Mounting"}>
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
                      <option value="in_tank">
                        {zh ? "箱内" : "In tank"}
                      </option>
                      <option value="on_tank">
                        {zh ? "箱顶 / 侧" : "On tank / side"}
                      </option>
                      <option value="external_compartment">
                        {zh ? "外置油室" : "External compartment"}
                      </option>
                      <option value="dry_type">
                        {zh ? "干式" : "Dry type"}
                      </option>
                      <option value="reactor">
                        {zh ? "电抗器" : "Reactor"}
                      </option>
                    </select>
                  </Field>
                  <Field label={zh ? "切换介质" : "Switching medium"}>
                    <select
                      className={controlClass}
                      value={input.medium}
                      onChange={(e) =>
                        patch("medium", e.target.value as SelectInput["medium"])
                      }
                    >
                      <option value="oil_vacuum">
                        {zh ? "油 + 真空" : "Oil + vacuum"}
                      </option>
                      <option value="oil">{zh ? "油" : "Oil"}</option>
                      <option value="dry">{zh ? "干式" : "Dry"}</option>
                    </select>
                  </Field>
                  <Field label={zh ? "相数" : "Phases"}>
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
                  <label className="flex items-center gap-2 self-end pb-1.5 text-[0.8125rem] text-[var(--color-ink-2)]">
                    <input
                      type="checkbox"
                      className="accent-[var(--color-accent)]"
                      checked={input.preferVacuum}
                      onChange={(e) => patch("preferVacuum", e.target.checked)}
                    />
                    {zh ? "优先真空" : "Prefer vacuum"}
                  </label>
                  <Field
                    label={
                      zh
                        ? "调压绕组间 BIL（kV）"
                        : "Across-tap BIL (kV)"
                    }
                    tip={
                      zh
                        ? "抬 B/C/D；空则按 Um"
                        : "Raises B/C/D. Leave blank to use the Um default."
                    }
                  >
                    <input
                      className={controlClass}
                      type="number"
                      min={0}
                      step={1}
                      placeholder={zh ? "如 285" : "e.g. 285"}
                      value={input.acrossTapBilKv ?? ""}
                      onChange={(e) =>
                        patch(
                          "acrossTapBilKv",
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
                        )
                      }
                    />
                  </Field>
                  <Field
                    label={
                      zh
                        ? "调压绕组间工频（kV）"
                        : "Across-tap power-frequency (kV)"
                    }
                  >
                    <input
                      className={controlClass}
                      type="number"
                      min={0}
                      step={1}
                      placeholder={zh ? "如 65" : "e.g. 65"}
                      value={input.acrossTapPfKv ?? ""}
                      onChange={(e) =>
                        patch(
                          "acrossTapPfKv",
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
                        )
                      }
                    />
                  </Field>
                  {selectorVisible ? (
                    <Field
                      label={zh ? "选择器等级" : "Tap-selector size"}
                      tip={
                        zh
                          ? "组合式；一般自动"
                          : "Combined types only. Auto is usually fine."
                      }
                    >
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
                        <option value="auto">{zh ? "自动" : "Auto"}</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                        <option value="DE">DE</option>
                      </select>
                    </Field>
                  ) : null}
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
                  {zh ? "计算中…" : "Working…"}
                </>
              ) : stale ? (
                zh ? (
                  "重新选型"
                ) : (
                  "Select again"
                )
              ) : zh ? (
                "选型"
              ) : (
                "Select"
              )}
            </button>
            <p className="text-center text-[0.75rem] text-[var(--color-muted)] sm:max-w-[14rem] sm:text-left">
              {zh
                ? "改参后需再点选型"
                : "Run Select again after you change inputs."}
            </p>
          </div>
        </form>

        {/* —— Result pane —— */}
        <aside className="min-w-0 lg:sticky lg:top-6">
          {!hasRun || !result ? (
            <IdlePanel zh={zh} running={running} />
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
                  {zh
                    ? "参数已改，请再点「重新选型」"
                    : "Parameters changed — click Select again"}
                </div>
              ) : null}

              {!result.ok || !primary ? (
                <div className="p-5">
                  <p className="font-[family-name:var(--font-display)] text-[0.9375rem] font-semibold text-[var(--color-err)]">
                    {zh ? "没有合规格型号" : "No matching type"}
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.8125rem] text-[var(--color-ink-2)]">
                    {(zh ? result.errorsZh : result.errorsEn).map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <>
                  <div className="border-b border-[var(--color-rule)] px-4 pt-4 pb-3">
                    <p className="font-mono text-[10px] tracking-[0.08em] text-[var(--color-accent)] uppercase">
                      {zh ? "推荐 · 最低满足" : "Recommended · lowest fit"}
                    </p>
                    <p className="mt-2 break-all font-mono text-[1.05rem] leading-snug font-medium tracking-tight text-[var(--color-ink)] sm:text-[1.15rem]">
                      {primary.model}
                    </p>
                    <button
                      type="button"
                      onClick={() => copyModel(primary.model)}
                      className="mt-3 rounded-[var(--radius-sm)] bg-[var(--color-graphite)] px-3 py-1.5 text-[0.8125rem] font-medium text-white transition-opacity hover:opacity-90"
                    >
                      {copied
                        ? zh
                          ? "已复制"
                          : "Copied"
                        : zh
                          ? "复制型号"
                          : "Copy type"}
                    </button>
                  </div>

                  <div className="space-y-2 px-4 py-3 text-[0.8125rem] leading-relaxed text-[var(--color-ink-2)]">
                    <p>{zh ? plainWhyZh(primary) : plainWhyEn(primary)}</p>
                    <p className="text-[0.75rem] text-[var(--color-muted)]">
                      {zh
                        ? "仅供参考，正式 OS 以工程确认为准。"
                        : "For reference only. Confirm with engineering before the OS."}
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
                          {zh
                            ? `其他可选（${alts.length}）`
                            : `Other options (${alts.length})`}
                        </span>
                        <span
                          className={cx(
                            "font-mono text-[0.6875rem] transition-transform duration-200",
                            altsOpen && "rotate-180",
                          )}
                        >
                          ▾
                        </span>
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
                                  {zh ? "复制" : "Copy"}
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

function IdlePanel({ zh, running }: { zh: boolean; running: boolean }) {
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
          <p className="text-sm text-[var(--color-ink-2)]">
            {zh ? "正在选型…" : "Selecting…"}
          </p>
        </>
      ) : (
        <>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-rule)] bg-white font-mono text-sm text-[var(--color-muted)]">
            →
          </div>
          <p className="font-[family-name:var(--font-display)] text-base font-semibold text-[var(--color-ink)]">
            {zh ? "还没选型" : "No result yet"}
          </p>
          <p className="mt-2 max-w-[26ch] text-[0.875rem] leading-relaxed text-[var(--color-muted)]">
            {zh
              ? "左边填参数，点「选型」。或先点上方示例。"
              : "Fill in the parameters on the left, then click Select. Or start from an example above."}
          </p>
        </>
      )}
    </div>
  );
}

function plainWhyZh(r: ModelResult): string {
  const bits = [
    `${r.seriesCode}，${r.currentA} A，Um ${r.umKv} kV`,
    r.selectorSize ? `选择器 ${r.selectorSize}` : null,
    r.unitCount > 1 ? `${r.unitCount} 台单相` : null,
  ].filter(Boolean);
  return bits.join(" · ") + "。满足工况的最低目录档。";
}

function plainWhyEn(r: ModelResult): string {
  const bits = [
    `${r.seriesCode}, ${r.currentA} A, Um ${r.umKv} kV`,
    r.selectorSize ? `tap selector ${r.selectorSize}` : null,
    r.unitCount > 1 ? `${r.unitCount}× single-phase` : null,
  ].filter(Boolean);
  return (
    bits.join(" · ") +
    ". Lowest catalogue rating that covers this duty."
  );
}
