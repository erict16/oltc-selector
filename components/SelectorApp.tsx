"use client";

import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import {
  ArrowDownIcon,
  ShieldCheckIcon,
  CheckIcon,
  ChevronDownIcon,
  ListBulletIcon,
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
  EARTH_INSULATION,
  umForEarthInsulation,
} from "@/lib/catalog";
import {
  INITIAL_FORM,
  commitRange,
  editStepPct,
  formDiff,
  formSelectInput,
  formSpec,
  geometryForPm,
  pickKind as pickKindIn,
  pickPhases,
  pickPm,
  pickRegulation,
  readLine,
  toOctc,
  toOltc,
  type FormState,
} from "@/lib/formState";
import { copyText } from "@/lib/clipboard";
import { parseTypeString } from "@/lib/parseType";
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
  lookupByPositions,
  midControl,
  pmStepOptionsFor,
} from "@/lib/tapCode";
import { LangSwitcher } from "@/components/LangSwitcher";
import {
  TransformerSketch,
} from "@/components/TransformerPicker";
import {
  TAP_POINTS_FOR,
  deriveDuty,
  tapAfterWinding,
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

function mediumFor(
  mounting: SelectInput["mounting"],
  preferVacuum: boolean,
): SelectInput["medium"] {
  if (mounting === "dry_type") return "dry";
  // 2026-11-04: reactor is HWDK, oil only; the arc toggle is hidden there.
  if (mounting === "reactor") return "oil";
  return preferVacuum ? "oil_vacuum" : "oil";
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

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/** Label id of the enclosing <div> Field; null inside a <label> Field. */
const FieldLabelContext = createContext<string | null>(null);

/** A <select> that takes its name from a <div> Field's label. */
function FieldSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const labelledBy = useContext(FieldLabelContext);
  return (
    <select
      {...(labelledBy && !props["aria-label"] ? { "aria-labelledby": labelledBy } : {})}
      {...props}
    />
  );
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
  placeholder,
  groupedError,
  autoFocus,
}: {
  autoFocus?: boolean;
  value: number;
  onValue: (n: number) => void;
  onBlur?: () => void;
  className: string;
  placeholder?: string;
  /** A and V fields: "1.200" / "1,200" is a thousands mark, refused with this text. */
  groupedError?: string;
}) {
  const labelledBy = useContext(FieldLabelContext) ?? undefined;
  const errorId = useId();
  const [draft, setDraft] = useState(value > 0 ? String(value) : "");
  const grouped = groupedError != null && /^\d{1,3}(\.\d{3})+$/.test(draft);
  useEffect(() => {
    // Follow outside changes (preset picked) without clobbering `1.`.
    const held = grouped ? 0 : (decimalDraft(draft).value ?? 0);
    if (held !== value) setDraft(value > 0 ? String(value) : "");
  }, [value]);
  return (
    <>
      <input
        inputMode="decimal"
        autoFocus={autoFocus}
        // Opened from the menu: typing replaces the old value.
        onFocus={autoFocus ? (e) => e.currentTarget.select() : undefined}
        className={className}
        aria-labelledby={labelledBy}
        aria-invalid={grouped || undefined}
        aria-describedby={grouped ? errorId : undefined}
        placeholder={placeholder}
        value={draft}
        onChange={(e) => {
          const d = decimalDraft(e.target.value);
          if (d.draft == null) return;
          setDraft(d.draft);
          // 2026-11-07: "1.200" A in tr/id/es/vi meant 1200, not 1.2.
          const isGrouped = groupedError != null && /^\d{1,3}(\.\d{3})+$/.test(d.draft);
          onValue(isGrouped ? 0 : (d.value ?? 0));
        }}
        onBlur={onBlur}
      />
      {grouped ? (
        <span id={errorId} role="alert" className="block w-full pb-2 pl-2 text-[0.75rem] leading-snug text-[var(--color-danger)]">
          {groupedError}
        </span>
      ) : null}
    </>
  );
}

/** Shared field and segment styles live in globals.css (UI kit). */
const controlClass = "row-control";

function Field({
  label,
  tip,
  children,
  className,
  as = "label",
}: {
  label: string;
  tip?: string;
  children: React.ReactNode;
  className?: string;
  /** Rows with two controls must not use <label>: it would name only the first. */
  as?: "label" | "div";
}) {
  const Tag = as;
  // A <div> Field does not name its control: the control and the group take
  // the label by id (2026-11-07: four main dropdowns read as unnamed).
  const labelId = useId();
  const group = as === "div";
  return (
    <Tag
      className={cx("row", className)}
      {...(group ? { role: "group", "aria-labelledby": labelId } : {})}
    >
      <span id={labelId} className="row-label">
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
      <span className="row-value">
        <FieldLabelContext.Provider value={group ? labelId : null}>
          {children}
        </FieldLabelContext.Provider>
      </span>
      {tip ? (
        <span className="col-span-2 pb-2 text-[0.75rem] leading-snug text-[var(--color-muted)]">
          {tip}
        </span>
      ) : null}
    </Tag>
  );
}

/**
 * A menu of the usual values with a typed entry behind "Custom". The list
 * button brings the menu back, so a phone user is never stuck in the keyboard.
 */
function PickOrType({
  lang,
  value,
  onValue,
  options,
  optionLabel,
  unit,
  prefix,
  placeholder,
  custom,
  onCustom,
  extra,
}: {
  lang: Lang;
  value: number;
  /** fromList: picked in the menu, not typed. */
  onValue: (n: number, fromList: boolean) => void;
  options: readonly number[];
  optionLabel: (n: number) => string;
  unit?: string;
  prefix?: string;
  placeholder?: string;
  /** Controlled "typing" flag when the form keeps it; local otherwise. */
  custom?: boolean;
  onCustom?: (on: boolean) => void;
  /** Menu entries that are actions, not values. */
  extra?: Array<{ value: string; label: string; onPick: () => void }>;
}) {
  const [own, setOwn] = useState(false);
  const [focusNext, setFocusNext] = useState(false);
  const isCustom = custom ?? own;
  const setCustom = onCustom ?? setOwn;
  const listed = options.includes(value);
  if (isCustom || (value > 0 && !listed)) {
    return (
      <>
        {prefix ? <span className="row-unit pl-2">{prefix}</span> : null}
        <DecimalInput
          className="row-control"
          value={value}
          placeholder={placeholder}
          autoFocus={focusNext}
          onValue={(n) => onValue(n, false)}
          onBlur={() => {
            if (listed) setCustom(false);
          }}
        />
        {unit ? <span className="row-unit">{unit}</span> : null}
        <button
          type="button"
          className="row-back"
          title={t(lang, "pickFromList")}
          aria-label={t(lang, "pickFromList")}
          onClick={() => {
            setFocusNext(false);
            setCustom(false);
            if (!listed && value > 0) {
              // The menu needs a listed value: take the nearest one.
              const near = options.reduce((a, b) =>
                Math.abs(b - value) < Math.abs(a - value) ? b : a,
              );
              onValue(near, true);
            }
          }}
        >
          <ListBulletIcon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
        </button>
      </>
    );
  }
  return (
    <FieldSelect
      className="row-control"
      value={value > 0 ? String(value) : ""}
      onChange={(e) => {
        const v = e.target.value;
        if (v === "__custom__") {
          setFocusNext(true);
          setCustom(true);
          return;
        }
        const action = extra?.find((x) => x.value === v);
        if (action) {
          action.onPick();
          return;
        }
        setCustom(false);
        onValue(Number(v), true);
      }}
    >
      {value > 0 ? null : (
        <option value="" disabled hidden>
          —
        </option>
      )}
      {options.map((n) => (
        <option key={n} value={String(n)}>
          {optionLabel(n)}
        </option>
      ))}
      {extra?.map((x) => (
        <option key={x.value} value={x.value}>
          {x.label}
        </option>
      ))}
      <option value="__custom__">{t(lang, "custom")}</option>
    </FieldSelect>
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
    <div className="card-head">
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
  labelled,
}: {
  /** Framed button with the words beside the icon. */
  labelled?: boolean;
  lang: Lang;
  copied: boolean;
  onCopy: () => void;
  small?: boolean;
  /** 44 px target for the phone dock. */
  touch?: boolean;
}) {
  if (labelled) {
    return (
      <button type="button" onClick={onCopy} className={cx("copy-btn", copied && "is-done")}>
        {copied ? (
          <CheckIcon className="h-4 w-4" strokeWidth={2} aria-hidden />
        ) : (
          <Square2StackIcon className="h-4 w-4" strokeWidth={1.7} aria-hidden />
        )}
        <span aria-live="polite">{t(lang, copied ? "copied" : "copyType")}</span>
      </button>
    );
  }
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
  stepV,
  model,
  hideUm,
}: {
  hideUm?: boolean;
  lang: Lang;
  duty: DutyBasis;
  dutyA: number | null;
  stepV: number;
  model: ModelResult | null;
}) {
  const ok = duty.ok;
  const a = dutyA != null && dutyA > 0 ? dutyA : null;
  const u = ok && stepV > 0 ? stepV : null;
  const kva = a != null && u != null ? (a * u) / 1000 : null;
  // Insulation need: the system's IEC Um where the rule is the system
  // (line end, a full-class neutral): 33 kV line end needs 36 kV, not the
  // 40.5 class the engine then picks. An assumed or stated class is the
  // need itself.
  const umNeed = !ok
    ? null
    : (duty.umRule === "line" || duty.umRule === "neutral_full") && Number.isFinite(duty.actualUmKv)
      ? duty.actualUmKv
      : duty.umKv;
  // Every row is one line: name, duty, rating, use. An assumed Um is said
  // once, in a deriveDuty caution above the table (neutral, MV lead and,
  // since r3 UI-11, the auto junction), not again inside it.
  const rows: Array<{
    key: string;
    label: string;
    need: string;
    unit: string;
    rating: string | null;
    use: number | null;
    /** Insulation is a class, not a load: 100% is a match, not tight. */
    plain?: boolean;
  }> = [
    {
      key: "i",
      label: t(lang, "kpiImax"),
      need: a != null ? round1(a) : "—",
      unit: "A",
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
      need: umNeed != null ? round1(umNeed) : "—",
      unit: "kV",
      rating: model ? round1(model.umKv) : null,
      use: useOf(umNeed, model?.umKv),
      plain: true,
    },
  ];
  return (
    <dl className="basis">
      {rows
        // Off-circuit types carry no step rating; a row of dashes says nothing.
        .filter((r) => !(model && r.rating == null))
        // Um is the equipment's insulation level, not a load. At a star
        // neutral nothing on the duty side sets it, so the row is left out;
        // elsewhere it is a class check with no bar (2026-11-11 Eric).
        .filter((r) => !(r.plain && hideUm))
        .map((r) => {
          const pct = r.use != null ? Math.round(r.use * 100) : null;
          const tone =
            r.use == null ? "" : r.use > 1 ? "is-over" : r.use >= 0.95 && !r.plain ? "is-tight" : "";
          return (
            <div key={r.key} className={cx("basis-row", tone)}>
              <dt>{r.label}</dt>
              <dd className="num">
                <b>{r.need}</b>
                {r.rating != null ? <span> / {r.rating}</span> : null}
                <span className="basis-unit">{r.unit}</span>
                {pct != null && !r.plain ? <span className="basis-pct">{pct}%</span> : null}
                {pct != null && r.plain ? (
                  r.use! > 1 ? (
                    <ExclamationTriangleIcon className="basis-mark" strokeWidth={1.75} aria-hidden />
                  ) : (
                    <CheckIcon className="basis-mark" strokeWidth={2.4} aria-hidden />
                  )
                ) : null}
              </dd>
              {pct != null && !r.plain ? (
                <span className="basis-bar" aria-hidden>
                  <i style={{ transform: `scaleX(${Math.min(100, pct) / 100})` }} />
                </span>
              ) : null}
            </div>
          );
        })}
    </dl>
  );
}

/**
 * One spelling for an insulation class everywhere it is picked: the Um plus
 * the AC / LI a tender states, written like the card's 对地工频/雷电 value.
 */
function earthUmLabel(um: number): string {
  const e = EARTH_INSULATION[um];
  const kv = `${formatUmKv(um)} kV`;
  return e ? `${kv} · ${e.pf} / ${e.bil}` : kv;
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
  return (
    <Field label={label}>
      <PickOrType
        lang={lang}
        value={kvValue}
        options={WINDING_RATED_KV}
        optionLabel={(v) => `${v} kV`}
        unit="kV"
        // 2026-11-07: "38,5" read as 385 in a type=number field.
        onValue={(kv) => onKv(kv)}
      />
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
  // First paint is lib/formState INITIAL_FORM, so the tests start where the page does.
  const f0 = INITIAL_FORM;
  const [input, setInput] = useState<SelectInput>(f0.input);
  const [pm, setPm] = useState(f0.pm);
  /** Default: fill transformer / tap-winding voltage; engine still gets OLTC Um. */
  const [voltageMode, setVoltageMode] = useState(f0.voltageMode);
  const [windingRatedKv, setWindingRatedKv] = useState(f0.windingRatedKv);
  const [currentMode, setCurrentMode] = useState(f0.currentMode);
  const [transformerMva, setTransformerMva] = useState(f0.transformerMva);
  const [mvaCustom, setMvaCustom] = useState(f0.mvaCustom);
  const [tapPlus, setTapPlus] = useState(f0.tapPlus);
  const [tapMinus, setTapMinus] = useState(f0.tapMinus);
  const [stepPercentPct, setStepPercentPct] = useState(f0.stepPercentPct);
  const [stepPctCustom, setStepPctCustom] = useState(f0.stepPctCustom);
  const [safetyK, setSafetyK] = useState(f0.safetyK);
  const [safetyKCustom, setSafetyKCustom] = useState(false);
  const [tapRange, setTapRange] = useState(f0.tapRange);
  const [kind, setKind] = useState(f0.kind);
  const [tapPoint, setTapPoint] = useState(f0.tapPoint);
  const [winding, setWinding] = useState(f0.winding);
  /** Line end set by delta, not by the user: star puts the neutral back. */
  const [tapForced, setTapForced] = useState(f0.tapForced);
  const [hvKv, setHvKv] = useState(f0.hvKv);
  const [mvKv, setMvKv] = useState(f0.mvKv);
  /** OLTC insulation to earth stated by the OS / maker. 0 = by rule. */
  const [earthUm, setEarthUm] = useState(f0.earthUm);
  /** OS / maker Imax (A) and Ust (V) on the capacity path. 0 = not given. */
  const [osImaxA, setOsImaxA] = useState(f0.osImaxA);
  const [osUstV, setOsUstV] = useState(f0.osUstV);
  /** Buyer's country for a neutral's assumed Um ("" = voltage rule only). */
  const [market, setMarket] = useState(f0.market);
  /** Tender line as typed, and what was read from it (null = not read). */
  const [lineText, setLineText] = useState("");
  const [lineRead, setLineRead] = useState(f0.lineRead);
  const [lineFailed, setLineFailed] = useState(f0.lineFailed);
  const [everRead, setEverRead] = useState(f0.everRead);
  const [phasesByLine, setPhasesByLine] = useState(f0.phasesByLine);
  const [stepStated, setStepStated] = useState(f0.stepStated);
  const [oltcRegulation, setOltcRegulation] = useState(f0.oltcRegulation);
  const [altsOpen, setAltsOpen] = useState(false);
  const [openAlts, setOpenAlts] = useState<string[]>([]);
  const [copiedModel, setCopiedModel] = useState<string | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resultPaneRef = useRef<HTMLElement | null>(null);
  const resultCardRef = useRef<HTMLElement | null>(null);
  /** Phones: the dock hides while the full result card is on screen. */
  const [resultInView, setResultInView] = useState(false);

  const isOctc = (input.dutyKind ?? "oltc") === "octc";
  const isLinear = isOctc || input.regulation === "linear";

  /** The form as one value, for the pure transitions in lib/formState. */
  const formNow = (): FormState => ({
    input,
    pm,
    tapPlus,
    tapMinus,
    tapRange,
    stepPercentPct,
    stepPctCustom,
    currentMode,
    voltageMode,
    windingRatedKv,
    transformerMva,
    mvaCustom,
    safetyK,
    kind,
    tapPoint,
    winding,
    tapForced,
    hvKv,
    mvKv,
    earthUm,
    osImaxA,
    osUstV,
    market,
    lineRead,
    lineFailed,
    everRead,
    phasesByLine,
    stepStated,
    oltcRegulation,
  });
  const setters: { [K in Exclude<keyof FormState, "input">]: (v: FormState[K]) => void } = {
    pm: setPm,
    tapPlus: setTapPlus,
    tapMinus: setTapMinus,
    tapRange: setTapRange,
    stepPercentPct: setStepPercentPct,
    stepPctCustom: setStepPctCustom,
    currentMode: setCurrentMode,
    voltageMode: setVoltageMode,
    windingRatedKv: setWindingRatedKv,
    transformerMva: setTransformerMva,
    mvaCustom: setMvaCustom,
    safetyK: setSafetyK,
    kind: setKind,
    tapPoint: setTapPoint,
    winding: setWinding,
    tapForced: setTapForced,
    hvKv: setHvKv,
    mvKv: setMvKv,
    earthUm: setEarthUm,
    osImaxA: setOsImaxA,
    osUstV: setOsUstV,
    market: setMarket,
    lineRead: setLineRead,
    lineFailed: setLineFailed,
    everRead: setEverRead,
    phasesByLine: setPhasesByLine,
    stepStated: setStepStated,
    oltcRegulation: setOltcRegulation,
  };
  /** Run one transition and set only the fields it changed. */
  const updateForm = (step: (f: FormState) => FormState) => {
    const was = formNow();
    const { input: inputDiff, ...rest } = formDiff(was, step(was));
    if (inputDiff) setInput((s) => ({ ...s, ...inputDiff }));
    for (const k of Object.keys(rest) as Array<keyof typeof rest>) {
      (setters[k] as (v: unknown) => void)(rest[k]);
    }
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
    if (!TAP_POINTS_FOR[kind].includes(p)) return;
    if (kind === "two_winding" && winding === "delta" && p === "neutral") return;
    setTapPoint(p);
    setTapForced(false);
    // Engine Y = one switch on a common star point; D = no common star point.
    setInput((s) => ({ ...s, connection: p === "neutral" ? "Y" : "D" }));
  };

  const pickKind = (k: TransformerKind) => updateForm((f) => pickKindIn(f, k));

  const pickWinding = (w: WindingConnection) => {
    setWinding(w);
    if (kind !== "two_winding") return;
    const next = tapAfterWinding(w, tapPoint, tapForced);
    setTapForced(next.forced);
    if (next.tapPoint !== tapPoint) {
      setTapPoint(next.tapPoint);
      setInput((s) => ({ ...s, connection: next.tapPoint === "neutral" ? "Y" : "D" }));
    }
  };

  /**
   * Fill the transformer and range fields from one tender line. The kind,
   * tap point and winding come from the vector group, so a YNa0d11 line
   * cannot be sized as a two-winding job by a missed click. Same mapping as
   * the CLI --line (lib/formState readLine).
   */
  // The text the form was last filled from: notes of an older line hide once
  // the box holds other text (2026-11-07 field test).
  const [readText, setReadText] = useState("");
  const readTenderLine = (text: string = lineText) => {
    setReadText(text.trim());
    updateForm((f) => readLine(f, text));
  };
  const lineStale = lineText.trim() !== readText;

  // 2026-11-04 final UI-12: lib/formState pickRegulation, so the tests reach it.
  const setRegulation = (reg: SelectInput["regulation"]) =>
    updateForm((f) => pickRegulation(f, reg));

  // 2026-11-04: a W/G custom +a/−b takes the Fig. 3-3 row the maker sells
  // (+4/−12 → 10193W), not plus + minus + 1 positions on mid 1 (18171W).
  const commitTapRange = (plus: number, minus: number, pct: number) =>
    updateForm((f) => commitRange(f, plus, minus, pct));

  // 2026-11-04 (r3 UI-6): lib/formState pickPm; 自定义 keeps the step %.
  const applyPm = (raw: string) => updateForm((f) => pickPm(f, raw));

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

  /** Transformer → duty (lib/formState formSpec: minus steps, step %, OS figures). */
  const transformerSpec = (): TransformerSpec => formSpec(formNow());
  const transformerDuty = (): DutyBasis => deriveDuty(transformerSpec());

  const capacityThroughA = (): number | null => {
    const d = transformerDuty();
    return d.ok && Number.isFinite(d.dutyA) && d.dutyA > 0 ? d.dutyA : null;
  };

  const computedStepVoltage = (): number | null => {
    const d = transformerDuty();
    return d.ok && d.stepV != null && d.stepV > 0 ? d.stepV : null;
  };

  const dutyForSelect = ():
    | SelectInput
    | { error: true; msgKey?: string; msg?: string } => {
    const r = formSelectInput(formNow());
    if (r.ok) return r.input;
    if ("msgKey" in r) return { error: true, msgKey: r.msgKey };
    return {
      error: true,
      msg: lang === "zh" ? r.duty.errorZh : localizeNote(r.duty.errorEn ?? "", lang),
    };
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
  const listSep = lang === "zh" ? "，" : ", ";
  const transformerLine = (
    kind === "auto"
      ? [t(lang, "kindAuto"), `${round1(hvKv)}/${round1(mvKv)}\u00a0kV`]
      : [
          t(lang, "kindTwo"),
          t(lang, winding === "star" ? "windingStar" : "windingDelta"),
          `${round1(windingRatedKv)}\u00a0kV`,
        ]
  ).join(listSep);
  const cautions = [
    ...(primary ? notesFor(lang, primary.cautionsZh, primary.cautionsEn) : []),
    ...(duty.ok ? notesFor(lang, duty.cautionsZh, duty.cautionsEn) : []),
  ].filter((c, i, all) => all.indexOf(c) === i);
  return (
    <div className="page flex w-full min-w-0 flex-1 flex-col">
      <header className="topbar sticky top-0 z-30">
        <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center gap-2.5 px-4 sm:gap-3 sm:px-8">
          {/* The app's own mark (app/icon.svg): tap contacts and the selector arm. */}
          <img src="/favicon.svg" alt="" width={28} height={28} className="h-7 w-7 shrink-0" />
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
      <div className="mx-auto grid w-full max-w-[1280px] flex-1 items-start gap-4 px-0 pt-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:gap-6 sm:px-8 sm:pt-8 lg:grid-cols-[25rem_minmax(0,1fr)] lg:gap-8 lg:pb-10 xl:grid-cols-[28rem_minmax(0,1fr)]">
        <form
          className="flex min-w-0 flex-col"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="w-full">

          <div className="sheet">
            <section aria-label={t(lang, "transformer")} className="sheet-section">
              {isOctc ? (
                <p id="auto-octc-note" className="sr-only">
                  {t(lang, "autoOctcNote")}
                </p>
              ) : null}
              <CardHead title={t(lang, "transformer")} />
              <div className="rows rows-2">
                  <Field label={t(lang, "kindLabel")}>
                    <FieldSelect
                      className={controlClass}
                      value={kind}
                      aria-describedby={isOctc ? "auto-octc-note" : undefined}
                      onChange={(e) => pickKind(e.target.value as TransformerKind)}
                    >
                      <option value="two_winding">{t(lang, "kindTwo")}</option>
                      <option value="auto" disabled={isOctc}>
                        {t(lang, "kindAuto")}
                      </option>
                    </FieldSelect>
                  </Field>
                  <Field label={t(lang, "tapPoint")}>
                    <FieldSelect
                      className={controlClass}
                      value={tapPoint}
                      aria-describedby={
                        kind === "two_winding" && winding === "delta"
                          ? "delta-no-neutral"
                          : undefined
                      }
                      onChange={(e) => pickTap(e.target.value as TapPoint)}
                    >
                      {TAP_POINTS_FOR[kind].map((p) => (
                        <option
                          key={p}
                          value={p}
                          disabled={
                            kind === "two_winding" && winding === "delta" && p === "neutral"
                          }
                        >
                          {t(lang, `tap_${p}`)}
                        </option>
                      ))}
                    </FieldSelect>
                    {kind === "two_winding" && winding === "delta" ? (
                      <span id="delta-no-neutral" className="sr-only">
                        {t(lang, "deltaNoNeutral")}
                      </span>
                    ) : null}
                  </Field>
                  {kind === "two_winding" ? (
                    <Field label={t(lang, "winding")}>
                      <FieldSelect
                        className={controlClass}
                        value={winding}
                        onChange={(e) => pickWinding(e.target.value as WindingConnection)}
                      >
                        <option value="star">{t(lang, "windingStar")}</option>
                        <option value="delta">{t(lang, "windingDelta")}</option>
                      </FieldSelect>
                    </Field>
                  ) : null}
                  {kind === "auto" ? (
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
                  <Field label={t(lang, "earthUm")}>
                    <FieldSelect
                      className={controlClass}
                      value={String(earthUm)}
                      onChange={(e) => {
                        setEarthUm(Number(e.target.value));
                      }}
                    >
                      <option value="0">
                        {ruleDuty.ok
                          ? t(lang, "earthRule", { um: `${formatUmKv(ruleDuty.umKv)} kV` })
                          : t(lang, "earthRuleNone")}
                      </option>
                      {EARTH_UM_OPTIONS.map((u) => (
                        <option key={u} value={String(u)}>
                          {earthUmLabel(u)}
                        </option>
                      ))}
                    </FieldSelect>
                  </Field>
              </div>
            </section>
            <section aria-label={t(lang, "cardDuty")} className="sheet-section">
              <CardHead title={t(lang, "cardDuty")} />
              <div className="rows rows-2">
            <Field
              label={
                currentMode === "capacity"
                  ? t(lang, "transformerMva")
                  : t(lang, "throughCurrent")
              }
            >
              {currentMode === "capacity" ? (
                <PickOrType
                  lang={lang}
                  value={transformerMva}
                  options={MVA_OPTIONS}
                  optionLabel={(n) => `${n} MVA`}
                  unit="MVA"
                  placeholder={t(lang, "mvaPlaceholder")}
                  custom={mvaCustom}
                  onCustom={setMvaCustom}
                  // 2026-11-07: "12,5" read as 125 in a type=number field.
                  onValue={(n) => setTransformerMva(n)}
                  extra={[
                    {
                      value: "__current__",
                      label: t(lang, "switchToCurrent"),
                      onPick: () => setCurrentEntry("current"),
                    },
                  ]}
                />
              ) : (
                <FieldSelect
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
                </FieldSelect>
              )}
            </Field>



            {isOctc ? (
              <Field label={t(lang, "octcSeries")}>
                <FieldSelect
                  className={controlClass}
                  value={input.octcSeries ?? "auto"}
                  onChange={(e) =>
                    patch(
                      "octcSeries",
                      e.target.value as SelectInput["octcSeries"],
                    )
                  }
                >
                  <option value="auto">
                    {(() => {
                      const roman = primary
                        ? parseTypeString(primary.model)?.phases
                        : undefined;
                      return roman
                        ? `${t(lang, "auto")} · ${roman}`
                        : t(lang, "auto");
                    })()}
                  </option>
                  {OCTC_SERIES_ROMANS.map((r) => (
                    <option key={r} value={r}>
                      {t(lang, `octc${r}`)}
                    </option>
                  ))}
                </FieldSelect>
              </Field>
            ) : (
              <Field label={t(lang, "regulation")}>
                <FieldSelect
                  className={controlClass}
                  value={input.regulation}
                  onChange={(e) =>
                    setRegulation(e.target.value as SelectInput["regulation"])
                  }
                >
                  <option value="reversing">{t(lang, "regW")}</option>
                  <option value="coarse_fine">{t(lang, "regG")}</option>
                  <option value="linear">{t(lang, "regLinear")}</option>
                </FieldSelect>
              </Field>
            )}

            {isLinear ? null : (
              <Field label={t(lang, "pmSteps")}>
                <FieldSelect
                  className={controlClass}
                  value={pm}
                  onChange={(e) => applyPm(e.target.value)}
                >
                  <option value="">{t(lang, "customPos")}</option>
                  {pmOptions.map((n) => (
                    <option key={n} value={String(n)}>
                      ±{n}
                    </option>
                  ))}
                </FieldSelect>
              </Field>
            )}

            <Field label={t(lang, "stepPercent")}>
              <PickOrType
                lang={lang}
                value={stepPercentPct}
                options={STEP_PERCENT_OPTIONS}
                optionLabel={(n) => `${n}%`}
                unit="%"
                custom={stepPctCustom}
                onCustom={setStepPctCustom}
                // 2026-11-04: the untouched 无载 ±2 is a display; the duty keeps −8.
                onValue={(n, fromList) =>
                  updateForm((f) => (fromList ? editStepPct(f, n, false) : editStepPct(f, n)))
                }
              />
            </Field>

            {isLinear || !pm ? (
              <>
                <Field
                  as="div"
                  label={t(lang, "positions")}
                >
                  <div className="flex min-w-0 flex-1 gap-1">
                      <FieldSelect
                        className={controlClass}
                        value={tapPlus > 0 ? String(tapPlus) : ""}
                        onChange={(e) => {
                          const plus = Number(e.target.value);
                          setTapPlus(plus);
                          commitTapRange(plus, tapMinus, stepPercentPct);
                        }}
                        aria-label={`${t(lang, "positions")} +`}
                      >
                        {TAP_SIDE_OPTIONS.map((n) => (
                          <option key={`p${n}`} value={String(n)}>
                            +{n}
                          </option>
                        ))}
                      </FieldSelect>
                      <FieldSelect
                        className={controlClass}
                        value={tapMinus > 0 ? String(tapMinus) : ""}
                        onChange={(e) => {
                          const minus = Number(e.target.value);
                          setTapMinus(minus);
                          commitTapRange(tapPlus, minus, stepPercentPct);
                        }}
                        aria-label={`${t(lang, "positions")} −`}
                      >
                        {TAP_SIDE_OPTIONS.map((n) => (
                          <option key={`m${n}`} value={String(n)}>
                            −{n}
                          </option>
                        ))}
                      </FieldSelect>
                    </div>
                </Field>
              </>
            ) : null}

            {midCtrl.show ? (
              <Field label={t(lang, "mid")}>
                <FieldSelect
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
                </FieldSelect>
              </Field>
            ) : null}

            {/* Volt picker only when tap % cannot derive Ust (Um mode, no rated kV). */}
            {ustV == null ? (
            <Field
              label={t(lang, "ust")}
            >
              <FieldSelect
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
              </FieldSelect>
            </Field>
            ) : null}

            <Field label={t(lang, "phases")}>
              <FieldSelect
                className={controlClass}
                value={input.phases}
                onChange={(e) =>
                  updateForm((f) =>
                    pickPhases(f, e.target.value as SelectInput["phases"]),
                  )
                }
              >
                <option value="III">III</option>
                <option value="II">{t(lang, "phaseII")}</option>
                <option value="I">I</option>
              </FieldSelect>
            </Field>
              </div>
            </section>
            <section aria-label={t(lang, "cardSwitch")} className="sheet-section">
              <CardHead title={t(lang, "cardSwitch")} />
              <div id="switch-fields" className="rows rows-2">
                  <Field label={t(lang, "dutyKind")}>
                    <FieldSelect
                      className={controlClass}
                      value={input.dutyKind ?? "oltc"}
                      // 2026-11-04 (r2 UI-2…4): a switch re-maps the read line
                      // for the new mode and leaves no ±2 or winding behind.
                      onChange={(e) =>
                        updateForm(e.target.value === "octc" ? toOctc : toOltc)
                      }
                    >
                      <option value="oltc">{t(lang, "dutyOltc")}</option>
                      <option value="octc">{t(lang, "dutyOctc")}</option>
                    </FieldSelect>
                  </Field>
                  {input.mounting !== "dry_type" && input.mounting !== "reactor" ? (
                    <Field label={t(lang, "arcMode")}>
                      <FieldSelect
                        className={controlClass}
                        value={!isOctc && input.preferVacuum ? "vac" : "oil"}
                        disabled={isOctc}
                        onChange={(e) => {
                          const vac = e.target.value === "vac";
                          setInput((s) => ({
                            ...s,
                            preferVacuum: vac,
                            medium: mediumFor(s.mounting, vac),
                          }));
                        }}
                      >
                        <option value="vac">{t(lang, "arcVac")}</option>
                        <option value="oil">{t(lang, "arcOil")}</option>
                      </FieldSelect>
                    </Field>
                  ) : null}
                  <Field label={t(lang, "specStructure")}>
                    <FieldSelect
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
                    </FieldSelect>
                  </Field>

                  <Field label={t(lang, "mounting")}>
                    <FieldSelect
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
                    </FieldSelect>
                  </Field>

                  <Field as="div" label={t(lang, "acrossInsul")}>
                    <div className="flex min-w-0 flex-1 gap-1">
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
                  <Field label={t(lang, "safetyK")}>
                    <PickOrType
                      lang={lang}
                      value={safetyK > 0 ? safetyK : 1}
                      options={SAFETY_K_OPTIONS}
                      optionLabel={(n) => `×${n}`}
                      prefix="×"
                      custom={safetyKCustom}
                      onCustom={setSafetyKCustom}
                      onValue={(n) => commitSafetyK(n)}
                    />
                  </Field>
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
            <div className={cx("px-5 pt-5 sm:px-8 sm:pt-7", primary ? "plate-hero" : "pb-5")}>
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
                  <div className="flex items-center justify-between gap-3">
                    <span className="plate-badge">
                      <ShieldCheckIcon className="h-[15px] w-[15px]" strokeWidth={2} aria-hidden />
                      {t(lang, showsMinimumLabel(loose) ? "recommended" : "allRound")}
                    </span>
                    <CopyButton
                      lang={lang}
                      labelled
                      copied={copiedModel === displayModel(primary.model, lang)}
                      onCopy={() => copyModel(displayModel(primary.model, lang))}
                    />
                  </div>
                  <p
                    key={primary.model}
                    translate="no"
                    className="plate-type plate-in mt-4 text-[clamp(1.375rem,6vw,1.875rem)] leading-[1.15] font-semibold tracking-[-0.025em] text-[var(--color-ink)] lg:text-[clamp(1.625rem,2.6vw,2.375rem)]"
                  >
                    {modelNodes(displayModel(primary.model, lang))}
                  </p>
                  <TypeSegments lang={lang} r={primary} shown={displayModel(primary.model, lang)} />
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

            <div className="grid gap-x-8 gap-y-5 px-5 py-6 sm:grid-cols-[minmax(0,1fr)_14.5rem] sm:px-8">
              <BasisTable
                hideUm={tapPoint === "neutral"}
                lang={lang}
                duty={duty}
                dutyA={pickedDutyA ?? (currentMode === "capacity" ? derivedA : input.throughCurrentA)}
                stepV={pickedStepV}
                model={primary}
              />
              <div className="stage-sketch">
                <TransformerSketch
                  lang={lang}
                  kind={kind}
                  tapPoint={tapPoint}
                  winding={winding}
                  tapKv={windingRatedKv}
                  hvKv={hvKv}
                  mvKv={mvKv}
                  onTap={pickTap}
                />
              </div>
            </div>

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
                  className="flex h-12 w-full items-center justify-between px-5 text-left text-[0.8125rem] font-medium text-[var(--color-ink-2)] hover:text-[var(--color-ink)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-accent)] sm:px-8"
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

/**
 * The type string read aloud: one cell per coded part, with what it means.
 * Cut from the shown string, so the domestic spelling keeps its own letters.
 */
function TypeSegments({ lang, r, shown }: { lang: Lang; r: ModelResult; shown: string }) {
  const series = SERIES.find((s) => s.id === r.seriesId);
  const at = shown.lastIndexOf(`-${r.currentA}`);
  if (at < 0) return null;
  const head = shown.slice(0, at);
  const family = head.endsWith(r.phases) ? head.slice(0, -r.phases.length) : head;
  const cells: Array<{ code: string; says: string }> = [
    {
      code: family,
      says: `${t(lang, series?.vacuum ? "specVac" : "specOil")} · ${t(lang, structureLabelKey(series?.structure))}`,
    },
  ];
  if (family !== head) cells.push({ code: r.phases, says: t(lang, "phases") });
  cells.push({ code: String(r.currentA), says: "A" });
  if (r.connection === "Y" || r.connection === "D") {
    cells.push({
      code: r.connection,
      says: t(lang, r.connection === "Y" ? "windingStar" : "windingDelta"),
    });
  }
  cells.push({ code: r.umToken, says: "Um kV" });
  cells.push({ code: r.tapCode, says: `${t(lang, "positions")} ${r.positions}` });
  return (
    <dl className="type-segs" translate="no">
      {cells.map((c, i) => (
        <div key={i}>
          <dt>{c.code}</dt>
          <dd>{c.says}</dd>
        </div>
      ))}
    </dl>
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
      value: `Um${nb}${formatUmKv(r.umKv)} · ${r.earthPfKv}${nb}/${nb}${r.earthBilKv}${nb}kV`,
    });
  }
  items.push({
    key: "mounting",
    value: t(lang, mountLabelKey(mount)),
  });

  return (
    <dl
      className={cx(
        "grid grid-cols-2 gap-x-5 gap-y-3",
        hideRatings ? "sm:grid-cols-4" : "sm:grid-cols-3",
        compact ? "pt-1 pr-5 pb-3 pl-11 sm:pr-7 sm:pl-12" : "px-5 py-4 sm:px-8",
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


