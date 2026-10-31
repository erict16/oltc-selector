"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDownIcon,
  CheckIcon,
  ChevronDownIcon,
  Square2StackIcon,
  ExclamationTriangleIcon,
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
import { decimalDraft } from "@/lib/decimal";
import { displayModel } from "@/lib/domesticModel";
import {
  DEFAULT_WINDING_RATED_KV,
  WINDING_RATED_KV,
  formatUmKv,
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
import {
  KindToggle,
  TapList,
  TransformerSketch,
} from "@/components/TransformerPicker";
import {
  TAP_POINTS_FOR,
  deriveDuty,
  type DutyBasis,
  type TransformerSpec,
  type TapPoint,
  type TransformerKind,
  type WindingConnection,
} from "@/lib/transformer";
import { UpSelect } from "@/components/UpSelect";
import { localizeNote, notesFor } from "@/lib/noteI18n";
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

/** Catalogue Um classes offered when the OS states the switch insulation. */
const EARTH_UM_OPTIONS = [40.5, 72.5, 126, 145, 170, 252, 300, 363] as const;

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

/**
 * Text field for a decimal the person types. Keeps the draft (`1.`, `0,`)
 * so the dot is not eaten, and reads `,` as a decimal point.
 * The form used to rebuild the text from the number: 1.43 % became 143 %.
 */
function DecimalInput({
  value,
  onValue,
  onBlur,
  className,
}: {
  value: number;
  onValue: (n: number) => void;
  onBlur?: () => void;
  className: string;
}) {
  const [draft, setDraft] = useState(value > 0 ? String(value) : "");
  useEffect(() => {
    // Follow outside changes (preset picked) without clobbering `1.`.
    const held = decimalDraft(draft).value ?? 0;
    if (held !== value) setDraft(value > 0 ? String(value) : "");
  }, [value]);
  return (
    <input
      inputMode="decimal"
      className={className}
      value={draft}
      onChange={(e) => {
        const d = decimalDraft(e.target.value);
        if (d.draft == null) return;
        setDraft(d.draft);
        onValue(d.value ?? 0);
      }}
      onBlur={onBlur}
    />
  );
}

/** Shared field and segment styles live in globals.css (UI kit). */
const controlClass = "ui-control";

function segBtn(on: boolean) {
  return cx("ui-seg", on && "is-on");
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
      <span className="flex min-h-[1.625rem] flex-nowrap items-center gap-2 overflow-visible">
        <span className="min-w-0 flex-1 text-[0.8125rem] leading-snug font-medium text-[var(--color-ink-2)]">
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
        ) : null}
        {action ? (
          <span
            className={cx(
              "shrink-0",
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

function CardHead({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex min-h-6 items-center gap-3">
      <h2 className="min-w-0 flex-1 text-[0.9375rem] leading-tight font-semibold text-[var(--color-ink)]">
        {title}
      </h2>
      {right}
    </div>
  );
}

/** Icon-only copy; says 已复制 for a moment after a click. */
function CopyButton({
  lang,
  copied,
  onCopy,
  small,
  touch,
}: {
  lang: Lang;
  copied: boolean;
  onCopy: () => void;
  small?: boolean;
  /** 44 px target for the phone dock. */
  touch?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      title={t(lang, "copyType")}
      aria-label={copied ? t(lang, "copied") : t(lang, "copyType")}
      className={cx(
        "inline-flex shrink-0 items-center justify-center gap-1 rounded-[6px] transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]",
        small ? "h-8 min-w-8" : touch ? "h-11 min-w-11" : "h-9 min-w-9",
        copied
          ? "px-2 text-[0.75rem] font-medium text-[var(--color-accent)]"
          : "text-[var(--color-caption)] hover:bg-[var(--color-field)] hover:text-[var(--color-ink)]",
      )}
    >
      {copied ? (
        <>
          <CheckIcon className="h-4 w-4" strokeWidth={2} aria-hidden />
          <span aria-live="polite">{t(lang, "copied")}</span>
        </>
      ) : (
        <Square2StackIcon className={small ? "h-4 w-4" : "h-[18px] w-[18px]"} strokeWidth={1.6} aria-hidden />
      )}
    </button>
  );
}

/** Share of a rating the duty uses; null when either side is missing. */
function useOf(need: number | null, rating: number | null | undefined): number | null {
  if (need == null || rating == null || !(need > 0) || !(rating > 0)) return null;
  return need / rating;
}

/**
 * Duty beside the chosen type's rating, one row per axis the engine checks.
 * The bar shows how much of the rating the duty takes.
 */
function BasisTable({
  lang,
  duty,
  dutyA,
  ratedA,
  stepV,
  model,
}: {
  lang: Lang;
  duty: DutyBasis;
  dutyA: number | null;
  /** Rated current when the form works from MVA; null when typed. */
  ratedA: number | null;
  stepV: number;
  model: ModelResult | null;
}) {
  const ok = duty.ok;
  const a = dutyA != null && dutyA > 0 ? dutyA : null;
  const u = ok && stepV > 0 ? stepV : null;
  const kva = a != null && u != null ? (a * u) / 1000 : null;
  const showActual =
    ok &&
    Number.isFinite(duty.actualUmKv) &&
    duty.umRule !== "neutral_full" &&
    duty.umRule !== "neutral_assumed" &&
    duty.umRule !== "explicit";
  const rows: Array<{
    key: string;
    label: string;
    need: string;
    unit: string;
    sub?: string;
    flag?: string;
    rating: string | null;
    use: number | null;
  }> = [
    {
      key: "i",
      label: t(lang, "kpiImax"),
      need: a != null ? round1(a) : "—",
      unit: "A",
      sub: ratedA != null && ratedA > 0 ? t(lang, "kpiRated", { a: round1(ratedA) }) : undefined,
      rating: model ? `${model.currentA}` : null,
      use: useOf(a, model?.currentA),
    },
    {
      key: "u",
      label: t(lang, "kpiUst"),
      need: u != null ? round1(u) : "—",
      unit: "V",
      rating: model?.maxStepVoltageV != null ? `${model.maxStepVoltageV}` : null,
      use: useOf(u, model?.maxStepVoltageV),
    },
    {
      key: "p",
      label: t(lang, "specPsin"),
      need: kva != null ? round1(kva) : "—",
      unit: "kVA",
      rating: model?.stepCapacityKva != null ? `${model.stepCapacityKva}` : null,
      use: useOf(kva, model?.stepCapacityKva),
    },
    {
      key: "um",
      label: t(lang, "kpiUm"),
      need: ok ? round1(duty.umKv) : "—",
      unit: "kV",
      sub: showActual ? t(lang, "kpiActual", { um: round1(duty.actualUmKv) }) : undefined,
      flag: ok && duty.umAssumed ? t(lang, "checkOs") : undefined,
      rating: model ? round1(model.umKv) : null,
      use: null,
    },
  ];
  return (
    <div className="plate-rule px-5 pt-4 pb-3 sm:px-6">
      <table className="basis-table">
        <thead>
          <tr>
            <th scope="col">{t(lang, "basisTitle")}</th>
            <th scope="col" className="r">{t(lang, "cardDuty")}</th>
            <th scope="col" className="r">{t(lang, "colRating")}</th>
            <th scope="col" className="r">
              <span className="sr-only">{t(lang, "colUse")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows
            // Off-circuit types carry no step rating; a row of dashes says nothing.
            .filter((r) => !(model && r.rating == null))
            .map((r) => {
            const pct = r.use != null ? Math.round(r.use * 100) : null;
            const tone = r.use == null ? "" : r.use > 1 ? "is-over" : r.use >= 0.95 ? "is-tight" : "";
            return (
              <tr key={r.key}>
                <th scope="row">
                  <span className="block">{r.label}</span>
                  {r.sub ? <span className="basis-sub">{r.sub}</span> : null}
                </th>
                <td className="r num">
                  {r.need}
                  {r.need !== "—" ? <span className="basis-unit">{r.unit}</span> : null}
                  {r.flag ? <span className="basis-flag">{r.flag}</span> : null}
                </td>
                <td className="r num">
                  {r.rating != null ? (
                    <>
                      {r.rating}
                      <span className="basis-unit">{r.unit}</span>
                    </>
                  ) : (
                    <span className="text-[var(--color-caption)]">—</span>
                  )}
                </td>
                <td className="r">
                  {pct != null ? (
                    <span className={cx("basis-use", tone)} title={`${t(lang, "colUse")} ${pct}%`}>
                      <span className="basis-bar" aria-hidden>
                        <i style={{ transform: `scaleX(${Math.min(100, pct) / 100})` }} />
                      </span>
                      <span className="num">{pct}%</span>
                    </span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function round1(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/** Rated-voltage menu with a custom entry. */
function KvField({
  lang,
  label,
  kvValue,
  onKv,
}: {
  lang: Lang;
  label: string;
  kvValue: number;
  onKv: (kv: number) => void;
}) {
  const [custom, setCustom] = useState(false);
  return (
            <Field
              as="div"
              label={label}
            >
              <div className="relative">
                {custom ||
                (kvValue > 0 &&
                  !(WINDING_RATED_KV as readonly number[]).includes(
                    kvValue,
                  )) ? (
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.1}
                    className={`${controlClass} pr-12 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                    value={kvValue > 0 ? String(kvValue) : ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        onKv(0);
                        return;
                      }
                      const n = Number(raw);
                      if (!Number.isFinite(n) || n < 0) return;
                      onKv(n);
                    }}
                    onBlur={() => {
                      if (
                        (WINDING_RATED_KV as readonly number[]).includes(
                          kvValue,
                        )
                      ) {
                        setCustom(false);
                      }
                    }}
                  />
                ) : (
                  <select
                    className={controlClass}
                    value={kvValue > 0 ? String(kvValue) : ""}
                    onChange={(e) => {
                      if (e.target.value === "__custom__") {
                        setCustom(true);
                        return;
                      }
                      setCustom(false);
                      onKv(Number(e.target.value));
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
                {custom ||
                (kvValue > 0 &&
                  !(WINDING_RATED_KV as readonly number[]).includes(
                    kvValue,
                  )) ? (
                  <span className="pointer-events-none absolute top-0 right-3 flex h-11 items-center text-[0.75rem] text-[var(--color-muted)]">
                    kV
                  </span>
                ) : null}
              </div>
            </Field>
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
  const [stepPctCustom, setStepPctCustom] = useState(false);
  const [safetyK, setSafetyK] = useState(1);
  const [safetyKCustom, setSafetyKCustom] = useState(false);
  const [tapRange, setTapRange] = useState<ParsedTapRange | null>(null);
  const [kind, setKind] = useState<TransformerKind>("two_winding");
  const [tapPoint, setTapPoint] = useState<TapPoint>("neutral");
  const [winding, setWinding] = useState<WindingConnection>("star");
  const [hvKv, setHvKv] = useState(220);
  const [mvKv, setMvKv] = useState(110);
  /** OLTC insulation to earth stated by the OS / maker. 0 = by rule. */
  const [earthUm, setEarthUm] = useState(0);
  const [altsOpen, setAltsOpen] = useState(false);
  const [openAlts, setOpenAlts] = useState<string[]>([]);
  const [copiedModel, setCopiedModel] = useState<string | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [switchOpen, setSwitchOpen] = useState(false);
  const resultPaneRef = useRef<HTMLElement | null>(null);
  const resultCardRef = useRef<HTMLElement | null>(null);
  /** Phones: the dock hides while the full result card is on screen. */
  const [resultInView, setResultInView] = useState(false);

  const isOctc = (input.dutyKind ?? "oltc") === "octc";
  const isLinear = isOctc || input.regulation === "linear";


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
  };

  const patch = <K extends keyof SelectInput>(k: K, v: SelectInput[K]) => {
    setInput((s) => {
      const next = { ...s, [k]: v };
      if (k === "connection" && voltageMode === "winding") {
        next.umKv = 0;
      }
      return next;
    });
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
  };

  const setCurrentEntry = (mode: "current" | "capacity") => {
    if (mode === currentMode) return;
    setCurrentMode(mode);
    if (mode === "capacity" && voltageMode !== "winding") {
      setVoltageEntry("winding");
      return;
    }
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
  };

  const pickTap = (p: TapPoint) => {
    if (kind === "two_winding" && winding === "delta" && p === "neutral") return;
    setTapPoint(p);
    // Engine Y = one switch on a common star point; D = no common star point.
    setInput((s) => ({ ...s, connection: p === "neutral" ? "Y" : "D" }));
  };

  const pickKind = (k: TransformerKind) => {
    if (k === kind) return;
    setKind(k);
    const p: TapPoint =
      k === "auto" ? "auto_junction" : winding === "delta" ? "line_end" : "neutral";
    setTapPoint(p);
    setInput((s) => ({ ...s, connection: p === "neutral" ? "Y" : "D" }));
  };

  const pickWinding = (w: WindingConnection) => {
    setWinding(w);
    if (w === "delta" && tapPoint === "neutral") {
      setTapPoint("line_end");
      setInput((s) => ({ ...s, connection: "D" }));
    }
  };

  const setRegulation = (reg: SelectInput["regulation"]) => {
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

  // The +/− range only drives the duty while its selects are on screen.
  // A range left from OCTC or linear used to override the ±N preset and step %.
  const rangeLive = isLinear || !pm;

  const stepFraction = (): number | null => {
    if (rangeLive && tapRange?.stepPercent && tapRange.stepPercent > 0) {
      return tapRange.stepPercent;
    }
    if (stepPercentPct > 0) return stepPercentPct / 100;
    return null;
  };

  const minusSteps = (): number => {
    if (rangeLive && tapRange && tapRange.minus > 0) return tapRange.minus;
    const n = pm && Number(pm) > 0 ? Number(pm) : input.plusMinusSteps;
    if (n != null && n > 0) return n;
    return 0;
  };

  /** Transformer → duty. The one place current, Ust and Um come from. */
  const transformerSpec = (): TransformerSpec => ({
      kind: isOctc ? "two_winding" : kind,
      tapPoint: isOctc && kind === "auto" ? "line_end" : tapPoint,
      winding,
      mva: currentMode === "capacity" ? transformerMva : 0,
      tapKv: windingRatedKv,
      hvKv,
      mvKv,
      minusSteps: minusSteps(),
      stepFraction: stepFraction(),
      safetyK,
      ...(earthUm > 0 ? { earthUmKv: earthUm } : {}),
    });
  const transformerDuty = (): DutyBasis => deriveDuty(transformerSpec());

  const capacityThroughA = (): number | null => {
    const d = transformerDuty();
    return d.ok && Number.isFinite(d.dutyA) && d.dutyA > 0 ? d.dutyA : null;
  };

  const computedStepVoltage = (): number | null => {
    const d = transformerDuty();
    return d.ok && d.stepV != null && d.stepV > 0 ? d.stepV : null;
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
    | { error: true; msgKey?: string; msg?: string } => {
    if (currentMode === "capacity") {
      if (safetyK > 0 && safetyK < 1) return { error: true, msgKey: "kBelowOne" };
      if (!(transformerMva > 0)) return { error: true, msgKey: "needMva" };
    }
    const d = transformerDuty();
    if (!d.ok) {
      return {
        error: true,
        msg: lang === "zh" ? d.errorZh : localizeNote(d.errorEn ?? "", lang),
      };
    }
    const ust = d.stepV != null && d.stepV > 0 ? d.stepV : null;
    const sized: SelectInput = {
      ...input,
      connection: d.connection,
      transformerKind: isOctc ? "two_winding" : kind,
      umKv: d.umKv,
      ...(ust != null ? { stepVoltageV: ust } : {}),
    };
    if (currentMode === "capacity") {
      if (!(d.dutyA > 0)) return { error: true, msgKey: "needMva" };
      return withOctcSeries({ ...sized, throughCurrentA: d.dutyA });
    }
    return withOctcSeries(sized);
  };

  // The engine is synchronous and cheap, so the answer is computed on every
  // render. A Select button used to let the readouts and the type disagree.
  const sizing = dutyForSelect();
  const sized = "error" in sizing ? null : sizing;
  const result: SelectOutput = sized
    ? selectOltc(sized)
    : (() => {
        const msg =
          ("error" in sizing && (sizing.msg ?? t(lang, sizing.msgKey ?? "needRated"))) || "";
        return { ok: false, results: [], errorsEn: [msg], errorsZh: [msg] };
      })();
  const pickedDutyA = sized ? sized.throughCurrentA : null;
  const pickedStepV = sized && sized.stepVoltageV > 0 ? sized.stepVoltageV : 0;

  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : lang;
  }, [lang]);

  useEffect(() => {
    const el = resultPaneRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setResultInView(entry.isIntersecting),
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const jumpToResult = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultPaneRef.current?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
    // The dock hides once the card is in view; keep focus somewhere visible.
    resultCardRef.current?.focus({ preventScroll: true });
  };

  const copyModel = async (text: string) => {
    const ok = await copyText(text);
    if (!ok) return;
    setCopiedModel(text);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopiedModel(null), 2000);
  };

  const primary = result.ok ? (result.results[0] ?? null) : null;
  const primaryModel = primary?.model ?? null;
  useEffect(() => {
    setOpenAlts([]);
  }, [primaryModel]);
  // Screen readers hear the type once typing settles, not on every keystroke.
  const liveText = primary
    ? displayModel(primary.model, lang)
    : t(lang, sized ? "noMatch" : "needInput");
  const [announced, setAnnounced] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setAnnounced(liveText), 700);
    return () => clearTimeout(id);
  }, [liveText]);
  const marginNeed = {
    acrossTapBilKv: input.acrossTapBilKv,
    acrossTapPfKv: input.acrossTapPfKv,
  };
  const loose =
    primary != null &&
    pickedDutyA != null &&
    primaryIsInsurance(primary, pickedDutyA, pickedStepV, marginNeed);
  const alts =
    result?.ok && pickedDutyA != null
      ? optionsWithInsurance(
          result.results,
          pickedDutyA,
          pickedStepV,
          3,
          marginNeed,
        )
      : [];
  const insuranceId =
    !loose && result?.ok && pickedDutyA != null
      ? insuranceModel(result.results, pickedDutyA, pickedStepV, marginNeed)
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
  const ustV = computedStepVoltage();
  const duty = transformerDuty();
  const ruleDuty = deriveDuty({ ...transformerSpec(), earthUmKv: undefined });
  const kindEff: TransformerKind = isOctc ? "two_winding" : kind;
  const tapEff: TapPoint = isOctc && kind === "auto" ? "line_end" : tapPoint;
  const listSep = lang === "zh" ? "，" : ", ";
  const transformerLine = (
    kindEff === "auto"
      ? [t(lang, "kindAuto"), `${round1(hvKv)}/${round1(mvKv)} kV`]
      : [
          t(lang, "kindTwo"),
          t(lang, winding === "star" ? "windingStar" : "windingDelta"),
          `${round1(windingRatedKv)} kV`,
        ]
  ).join(listSep);
  const cautions = [
    ...(primary ? notesFor(lang, primary.cautionsZh, primary.cautionsEn) : []),
    ...(duty.ok ? notesFor(lang, duty.cautionsZh, duty.cautionsEn) : []),
  ].filter((c, i, all) => all.indexOf(c) === i);
  // Folded switch section: one line that says what the hidden fields hold.
  // Settings that change the result lead, so a clamped line still shows them.
  const switchSummary = [
    ...(input.acrossTapBilKv ? [`LI ${input.acrossTapBilKv} kV`] : []),
    ...(input.acrossTapPfKv ? [`PF ${input.acrossTapPfKv} kV`] : []),
    ...(safetyK > 1 ? [`${t(lang, "safetyK")} ×${safetyK}`] : []),
    t(lang, isOctc ? "dutyOctc" : "dutyOltc"),
    ...(input.mounting !== "dry_type" && input.mounting !== "reactor"
      ? [t(lang, isOctc || !input.preferVacuum ? "arcOil" : "arcVac")]
      : []),
    input.preferStructure && input.preferStructure !== "auto"
      ? t(lang, structureLabelKey(input.preferStructure))
      : `${t(lang, "specStructure")} ${t(lang, "auto")}`,
    t(lang, mountLabelKey(input.mounting)),
  ].join(listSep);
  return (
    <div className="flex w-full min-w-0 flex-1 flex-col">
      <header className="topbar sticky top-0 z-30">
        <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center gap-2.5 px-4 sm:gap-3 sm:px-8">
          <div className="min-w-0 leading-tight">
            <h1 className="truncate text-[0.9375rem] font-semibold whitespace-nowrap text-[var(--color-ink)]">
              {t(lang, "title")}
            </h1>
          </div>
          <div className="ml-auto">
            <LangSwitcher
              lang={lang}
              onChange={setLang}
              ariaLabel={t(lang, "langAria")}
            />
          </div>
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-[1280px] flex-1 items-start gap-4 px-0 pt-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:gap-8 sm:px-8 sm:pt-6 lg:grid-cols-[minmax(0,1fr)_27rem] lg:gap-10 lg:pt-8 lg:pb-8 xl:grid-cols-[minmax(0,1fr)_30rem] xl:gap-14">
        <form
          className="flex min-w-0 flex-col"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="w-full">

          <div className="sheet">
            <section aria-label={t(lang, "transformer")} className="sheet-section">
              <CardHead
                title={t(lang, "transformer")}
                right={
                  kindEff === "auto" ? (
                    <span className="shrink-0 text-[0.75rem] font-medium text-[var(--color-accent)]">
                      {t(lang, "combinedOnly")}
                    </span>
                  ) : undefined
                }
              />
              <KindToggle
                lang={lang}
                kind={kindEff}
                onKind={pickKind}
                autoDisabled={isOctc}
              />
              {isOctc ? (
                <p className="mt-2 text-[0.75rem] leading-snug text-[var(--color-muted)]">
                  {t(lang, "autoOctcNote")}
                </p>
              ) : null}
              <div className="mt-5 grid items-center gap-6 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
                <div className="sketch-stage flex justify-center px-3 py-2 sm:py-4">
                  <TransformerSketch
                    lang={lang}
                    kind={kindEff}
                    tapPoint={isOctc && kind === "auto" ? "line_end" : tapPoint}
                    winding={winding}
                    tapKv={windingRatedKv}
                    hvKv={hvKv}
                    mvKv={mvKv}
                    onTap={pickTap}
                  />
                </div>
                <div className="flex min-w-0 flex-col gap-3">
                  <Field as="div" label={t(lang, "tapPoint")}>
                    <TapList
                      lang={lang}
                      kind={kindEff}
                      winding={winding}
                      tapPoint={isOctc && kind === "auto" ? "line_end" : tapPoint}
                      onTap={pickTap}
                    />
                  </Field>
                  {kindEff === "two_winding" ? (
                    <Field as="div" label={t(lang, "winding")}>
                      <div role="radiogroup" aria-label={t(lang, "winding")} className="ui-track">
                        {(["star", "delta"] as const).map((w) => (
                          <button
                            key={w}
                            type="button"
                            role="radio"
                            aria-checked={winding === w}
                            className={segBtn(winding === w)}
                            onClick={() => pickWinding(w)}
                          >
                            {t(lang, w === "star" ? "windingStar" : "windingDelta")}
                          </button>
                        ))}
                      </div>
                    </Field>
                  ) : null}
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-4">
                {kindEff === "auto" ? (
                  <>
                    <KvField
                      lang={lang}
                      label={t(lang, "hvKv")}
                      kvValue={hvKv}
                      onKv={(kv) => {
                        setHvKv(kv);
                      }}
                    />
                    <KvField
                      lang={lang}
                      label={t(lang, "mvKv")}
                      kvValue={mvKv}
                      onKv={(kv) => {
                        setMvKv(kv);
                      }}
                    />
                  </>
                ) : (
                  <KvField
                    lang={lang}
                    label={t(lang, "umWinding")}
                    kvValue={windingRatedKv}
                    onKv={setVoltageKv}
                  />
                )}
                <Field
                  label={t(lang, "earthUm")}
                >
                  <select
                    className={controlClass}
                    value={String(earthUm)}
                    onChange={(e) => {
                      setEarthUm(Number(e.target.value));
                    }}
                  >
                    <option value="0">
                      {ruleDuty.ok
                        ? t(lang, "earthRule", { um: `Um ${formatUmKv(ruleDuty.umKv)} kV` })
                        : t(lang, "earthRuleNone")}
                    </option>
                    {EARTH_UM_OPTIONS.map((u) => (
                      <option key={u} value={String(u)}>
                        Um {u} kV
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </section>
            <section aria-label={t(lang, "cardDuty")} className="sheet-section">
              <CardHead title={t(lang, "cardDuty")} />
              <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-4">
            <Field
              as="div"
              label={
                currentMode === "capacity"
                  ? t(lang, "transformerMva")
                  : t(lang, "throughCurrent")
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
                          return;
                        }
                        const n = Number(raw);
                        if (!Number.isFinite(n) || n < 0) return;
                        setTransformerMva(n);
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
                      {lang === "zh" ? " 级" : ""}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field
              as="div"
              label={t(lang, "stepPercent")}
            >
              <div className="relative">
                {stepPctCustom ||
                (stepPercentPct > 0 &&
                  !(STEP_PERCENT_OPTIONS as readonly number[]).includes(
                    stepPercentPct,
                  )) ? (
                  <DecimalInput
                    className={`${controlClass} pr-8`}
                    value={stepPercentPct}
                    onValue={(n) => {
                      setStepPercentPct(n);
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
                >
                  <div className="grid grid-cols-2 gap-2">
                      <select
                        className={controlClass}
                        value={tapPlus > 0 ? String(tapPlus) : ""}
                        onChange={(e) => {
                          const plus = Number(e.target.value);
                          setTapPlus(plus);
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
              </div>
            </section>
            <section aria-label={t(lang, "cardSwitch")} className="sheet-section sheet-section-fold">
              <button
                type="button"
                aria-expanded={switchOpen}
                aria-controls="switch-fields"
                onClick={() => setSwitchOpen((o) => !o)}
                className="fold-head"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.9375rem] leading-tight font-semibold text-[var(--color-ink)]">
                    {t(lang, "cardSwitch")}
                  </span>
                  <span className="mt-1 line-clamp-2 text-[0.8125rem] leading-snug text-[var(--color-muted)]">
                    {switchSummary}
                  </span>
                </span>
                <ChevronDownIcon
                  className={cx(
                    "h-5 w-5 shrink-0 text-[var(--color-muted)] transition-transform duration-200",
                    switchOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
              <div className={cx("more-drop", switchOpen && "more-drop-open")}>
              <div className="-mx-1 min-h-0 overflow-hidden px-1" {...(switchOpen ? {} : { inert: true })}>
              <div id="switch-fields" className="grid grid-cols-2 gap-x-3 gap-y-5 pt-5 sm:gap-x-4">
                  <Field label={t(lang, "dutyKind")} as="div">
                    <div
                      className="ui-track"
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
                                return;
                              }
                              setInput((s) => {
                                const n = Number(pm);
                                // OCTC +/− edits rewrote positions; put the ±N preset back.
                                return s.regulation !== "linear" && n > 0
                                  ? {
                                      ...s,
                                      dutyKind: "oltc",
                                      preferStructure: "auto",
                                      ...geometryForPm(n, s.regulation),
                                    }
                                  : { ...s, dutyKind: "oltc", preferStructure: "auto" };
                              });
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
                        className={cx("ui-track", isOctc && "opacity-45")}
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
                              }}
                              className={segBtn(on)}
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

                  <Field as="div" label={t(lang, "acrossInsul")} className="col-span-2 sm:col-span-1">
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
                        <DecimalInput
                          className={`${controlClass} pl-7`}
                          value={safetyK}
                          onValue={commitSafetyK}
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
              </div>
              </div>
            </section>
          </div>
          </div>
        </form>

        <aside
          ref={resultPaneRef}
          className="flex min-w-0 scroll-mt-16 flex-col gap-3 quiet-scroll lg:sticky lg:top-[5.5rem] lg:max-h-[calc(100dvh-6.5rem)] lg:overflow-y-auto lg:pb-2"
        >
          <section
            ref={resultCardRef}
            tabIndex={-1}
            aria-label={t(lang, "resultAria")}
            className="plate focus:outline-none"
          >
            <p className="sr-only" aria-live="polite">
              {announced}
            </p>
            <div className="px-5 pt-5 pb-4 sm:px-6">
              {!primary ? (
                <div>
                  <p
                    className={cx(
                      "text-[0.9375rem] font-semibold",
                      sized ? "text-[var(--color-danger)]" : "text-[var(--color-ink)]",
                    )}
                  >
                    {sized ? t(lang, "noMatch") : t(lang, "needInput")}
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.8125rem] leading-snug text-[var(--color-ink-2)]">
                    {notesFor(lang, result.errorsZh, result.errorsEn).map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <>
                  <p className="text-[0.8125rem] font-medium text-[var(--color-accent)]">
                    {t(lang, showsMinimumLabel(loose) ? "recommended" : "allRound")}
                  </p>
                  <div className="mt-1.5 flex items-start gap-2">
                    <p
                      key={primary.model}
                      translate="no"
                      className="plate-type plate-in min-w-0 flex-1 text-[clamp(1.25rem,5.6vw,1.75rem)] leading-[1.2] font-semibold tracking-[-0.02em] text-[var(--color-ink)] lg:text-[clamp(1.375rem,1.8vw,1.75rem)]"
                    >
                      {modelNodes(displayModel(primary.model, lang))}
                    </p>
                    <CopyButton
                      lang={lang}
                      copied={copiedModel === displayModel(primary.model, lang)}
                      onCopy={() => copyModel(displayModel(primary.model, lang))}
                    />
                  </div>
                  <p className="mt-2 text-[0.8125rem] leading-snug text-[var(--color-muted)]">
                    {[t(lang, `tapShort_${tapEff}`), transformerLine].join(listSep)}
                  </p>
                </>
              )}
            </div>

            {cautions.length > 0 ? (
              <ul className="caution-list">
                {cautions.map((c) => (
                  <li key={c} className="flex gap-2">
                    <ExclamationTriangleIcon
                      className="mt-px h-4 w-4 shrink-0 text-[var(--color-warn)]"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <BasisTable
              lang={lang}
              duty={duty}
              dutyA={pickedDutyA ?? (currentMode === "capacity" ? derivedA : input.throughCurrentA)}
              ratedA={currentMode === "capacity" && duty.ok ? duty.ratedA : null}
              stepV={pickedStepV}
              model={primary}
            />

            {primary ? (
              <div className="plate-rule">
                <ModelSpec lang={lang} r={primary} dutyMounting={input.mounting} hideRatings />
              </div>
            ) : null}

            {primary && alts.length > 0 ? (
              <div className="plate-rule">
                <button
                  type="button"
                  onClick={() => setAltsOpen((o) => !o)}
                  className="flex h-12 w-full items-center justify-between px-5 text-left text-[0.8125rem] font-medium text-[var(--color-ink-2)] hover:text-[var(--color-ink)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-accent)] sm:px-6"
                  aria-expanded={altsOpen}
                >
                  <span>{t(lang, "otherOpts", { n: alts.length })}</span>
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
                    "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
                    altsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="min-h-0 overflow-hidden" {...(altsOpen ? {} : { inert: true })}>
                    <ul className="divide-y divide-[var(--color-rule)] border-t border-[var(--color-rule)]">
                      {alts.map((r) => {
                        const open = openAlts.includes(r.model);
                        const shown = displayModel(r.model, lang);
                        return (
                          <li key={r.model}>
                            <div className="flex items-center gap-1 pr-3 pl-3 sm:pl-4">
                              <button
                                type="button"
                                aria-expanded={open}
                                onClick={() => setOpenAlts(open ? [] : [r.model])}
                                className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-[4px] px-2 py-1.5 text-left focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
                              >
                                <ChevronDownIcon
                                  className={cx(
                                    "h-4 w-4 shrink-0 text-[var(--color-caption)] transition-transform duration-200",
                                    open && "rotate-180",
                                  )}
                                  aria-hidden
                                />
                                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                                  <span translate="no" className="plate-type min-w-0 text-[0.875rem] leading-snug text-[var(--color-ink)]">
                                    {modelNodes(shown)}
                                  </span>
                                  {insuranceId === r.model ? (
                                    <span className="shrink-0 text-[0.75rem] font-medium text-[var(--color-accent)]">
                                      {t(lang, "allRound")}
                                    </span>
                                  ) : null}
                                </span>
                              </button>
                              <CopyButton
                                lang={lang}
                                small
                                copied={copiedModel === shown}
                                onCopy={() => copyModel(shown)}
                              />
                            </div>
                            <div className={cx("more-drop", open && "more-drop-open")}>
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
          </section>
          <p className="px-4 text-[0.75rem] leading-snug text-[var(--color-caption)] sm:px-1">
            {t(lang, "disclaimer")}
          </p>
        </aside>
      </div>

      {/* Phones: the current type rides along at the bottom while the form scrolls. */}
      <div className={cx("result-dock", resultInView && "is-hidden")} {...(resultInView ? { inert: true } : {})}>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[0.6875rem] font-medium text-[var(--color-muted)]">
            {primary
              ? t(lang, showsMinimumLabel(loose) ? "recommended" : "allRound")
              : sized
                ? t(lang, "noMatch")
                : t(lang, "needInput")}
          </span>
          <span
            translate="no"
            className={cx(
              "line-clamp-2 text-[0.9375rem] leading-snug font-semibold",
              primary
                ? "plate-type text-[var(--color-ink)]"
                : sized
                  ? "text-[var(--color-danger)]"
                  : "text-[var(--color-caption)]",
            )}
          >
            {primary ? modelNodes(displayModel(primary.model, lang)) : "—"}
          </span>
        </div>
        {primary ? (
          <CopyButton
            lang={lang}
            touch
            copied={copiedModel === displayModel(primary.model, lang)}
            onCopy={() => copyModel(displayModel(primary.model, lang))}
          />
        ) : null}
        <button
          type="button"
          onClick={jumpToResult}
          aria-label={t(lang, "showResult")}
          title={t(lang, "showResult")}
          className="dock-jump"
        >
          <ArrowDownIcon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
        </button>
      </div>
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
  hideRatings,
}: {
  lang: Lang;
  r: ModelResult;
  dutyMounting: SelectInput["mounting"];
  compact?: boolean;
  /** The basis table already shows max Ust and step capacity. */
  hideRatings?: boolean;
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
  if (!hideRatings && r.maxStepVoltageV != null) {
    items.push({ key: "specUst", value: `${r.maxStepVoltageV}${nb}V` });
  }
  if (!hideRatings && r.stepCapacityKva != null) {
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
        compact ? "pt-1 pr-5 pb-3 pl-11" : "px-5 py-4 sm:px-6",
      )}
    >
      {items.map((item) => (
        <div key={item.key} className="min-w-0">
          <dt className="text-[0.75rem] leading-snug break-words text-[var(--color-muted)]">
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


