"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const controlClass =
  "h-10 w-full min-w-0 rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] bg-white px-3 text-[0.9rem] leading-snug text-[var(--color-ink)] transition-colors duration-150 hover:border-[var(--color-accent)] focus:border-[var(--color-accent)] focus:outline-none";

function isPartialDecimal(v: string): boolean {
  return v === "" || v === "." || /^\d+\.$/.test(v);
}

/**
 * Native <select> cannot type 2.5. Input + the same chevron as More options,
 * preset list underneath.
 */
export function PercentCombo({
  value,
  options,
  onChange,
  suffix = "%",
  prefix = "",
}: {
  value: number;
  options: readonly number[];
  onChange: (n: number) => void;
  suffix?: string;
  prefix?: string;
}) {
  const [raw, setRaw] = useState(value > 0 ? String(value) : "");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) return;
    setRaw(value > 0 ? String(value) : "");
  }, [value, open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={root} className="relative">
      <div className={cx(controlClass, "flex items-center pr-8")}>
        {prefix ? (
          <span className="shrink-0 text-[0.9rem] text-[var(--color-ink)]">
            {prefix}
          </span>
        ) : null}
        <input
          className="border-0 bg-transparent p-0 text-[0.9rem] leading-snug tabular-nums text-[var(--color-ink)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          style={{ width: `${Math.max(raw.length, 1) + 0.4}ch` }}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={raw}
          onChange={(e) => {
            const v = e.target.value.replace(/，/g, ".").replace(/％/g, "");
            if (v !== "" && !/^\d*\.?\d*$/.test(v)) return;
            setRaw(v);
            if (v === "") {
              onChange(0);
              return;
            }
            if (isPartialDecimal(v)) return;
            const n = Number(v);
            if (Number.isFinite(n) && n >= 0) onChange(n);
          }}
          onFocus={() => setOpen(true)}
        />
        {suffix ? (
          <span className="shrink-0 text-[0.9rem] leading-snug text-[var(--color-ink)]">
            {suffix}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        tabIndex={-1}
        aria-label="presets"
        onClick={() => setOpen((s) => !s)}
        className="absolute top-0 right-0 flex h-10 w-8 items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-ink-2)]"
      >
        <ChevronDownIcon
          className={cx("h-4 w-4 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open ? (
        <ul
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-white py-1 shadow-[0_8px_24px_oklch(24%_0.02_258_/_0.12)]"
          role="listbox"
        >
          {options.map((p) => (
            <li key={p}>
              <button
                type="button"
                role="option"
                aria-selected={p === value}
                className={cx(
                  "flex h-8 w-full items-center px-3 text-left text-[0.875rem] hover:bg-[var(--color-soft)]",
                  p === value
                    ? "font-medium text-[var(--color-accent)]"
                    : "text-[var(--color-ink)]",
                )}
                onClick={() => {
                  onChange(p);
                  setRaw(String(p));
                  setOpen(false);
                }}
              >
                {`${prefix}${p}${suffix === "%" ? "%" : suffix ? ` ${suffix}` : ""}`}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
