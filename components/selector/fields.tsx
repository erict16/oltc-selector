"use client";

import { createContext, useContext, useEffect, useId, useState } from "react";
import { ListBulletIcon } from "@heroicons/react/24/outline";
import { decimalDraft, pastedDecimal } from "@/lib/decimal";
import { WINDING_RATED_KV } from "@/lib/deriveUm";
import { t, type Lang } from "@/lib/i18n";
import { MenuSelect } from "./MenuSelect";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/** Label id of the enclosing <div> Field; null inside a <label> Field. */
const FieldLabelContext = createContext<string | null>(null);

/** Label id of the enclosing Field, <label> or <div>. */
const RowLabelContext = createContext<string | null>(null);

/** A menu that takes its name from the Field's label. */
export function FieldSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const groupLabel = useContext(FieldLabelContext);
  const rowLabel = useContext(RowLabelContext);
  return <MenuSelect {...props} labelId={groupLabel} ownLabelId={rowLabel} />;
}

/**
 * Text field for a decimal the person types. Keeps the draft (`1.`, `0,`)
 * so the dot is not eaten, and reads `,` as a decimal point.
 * The form used to rebuild the text from the number: 1.43 % became 143 %.
 */
export function DecimalInput({
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
    // Runs only when the outside value changes; the draft is read, not watched.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const take = (next: string, n: number | null) => {
    setDraft(next);
    // 2026-11-07: "1.200" A in tr/id/es/vi meant 1200, not 1.2.
    const isGrouped = groupedError != null && /^\d{1,3}(\.\d{3})+$/.test(next);
    onValue(isGrouped ? 0 : (n ?? 0));
  };
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
          take(d.draft, d.value);
        }}
        // A pasted "25 MVA" keeps its number; typing a letter is still refused.
        onPaste={(e) => {
          const d = pastedDecimal(e.clipboardData.getData("text"));
          if (!d) return;
          e.preventDefault();
          take(d.draft, d.value);
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
export const controlClass = "row-control";

export function Field({
  label,
  children,
  className,
  as = "label",
}: {
  label: string;
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
          <RowLabelContext.Provider value={labelId}>{children}</RowLabelContext.Provider>
        </FieldLabelContext.Provider>
      </span>
    </Tag>
  );
}

/**
 * A menu of the usual values with a typed entry behind "Custom". The list
 * button brings the menu back, so a phone user is never stuck in the keyboard.
 */
export function PickOrType({
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
  groupedError,
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
  /** A and V fields: refuse "1.200" with this text. */
  groupedError?: string;
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
          groupedError={groupedError}
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

export function CardHead({
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

/** Rated-voltage menu with a custom entry. */
export function KvField({
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
