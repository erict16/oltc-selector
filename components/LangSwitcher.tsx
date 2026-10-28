"use client";

import { LANG_OPTIONS, type Lang } from "@/lib/i18n";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function LangSwitcher({
  lang,
  onChange,
  ariaLabel,
  tone = "light",
}: {
  lang: Lang;
  onChange: (l: Lang) => void;
  ariaLabel: string;
  /** dark = on the app's navy header bar */
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <>
      {/* Phones: one native menu instead of six chips. */}
      <select
        aria-label={ariaLabel}
        value={lang}
        onChange={(e) => onChange(e.target.value as Lang)}
        className={cx(
          "lang-select h-8 rounded-[6px] border pr-7 pl-2.5 text-[0.8125rem] font-medium sm:hidden",
          dark
            ? "border-white/20 bg-white/10 text-white"
            : "border-[var(--color-rule-2)] bg-white text-[var(--color-ink)]",
        )}
      >
        {LANG_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.short}
          </option>
        ))}
      </select>
      <div
        className={cx(
          "ml-auto hidden w-auto max-w-full shrink-0 flex-nowrap items-center justify-end gap-0.5 rounded-[var(--radius-sm)] border p-[2px] sm:flex",
          dark ? "border-white/12 bg-white/[0.07]" : "border-[var(--color-rule-2)] bg-[#e8ecf0]",
        )}
        role="group"
        aria-label={ariaLabel}
      >
        {LANG_OPTIONS.map((opt) => {
          const on = lang === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              title={opt.label}
              aria-pressed={on}
              onClick={() => onChange(opt.id)}
              className={cx(
                "inline-flex h-7 w-9 shrink-0 items-center justify-center rounded-[4px] text-[0.75rem] font-medium leading-none transition-[background-color,color,box-shadow] duration-150",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
                dark ? "focus-visible:outline-white" : "focus-visible:outline-[var(--color-accent)]",
                on
                  ? "bg-white font-semibold text-[var(--color-ink)] shadow-[0_1px_2px_rgb(21_33_46/0.12),0_0_0_1px_rgb(21_33_46/0.05)]"
                  : dark
                    ? "text-white/70 hover:text-white"
                    : "text-[var(--color-muted)] hover:text-[var(--color-ink)]",
              )}
            >
              {opt.short}
            </button>
          );
        })}
      </div>
    </>
  );
}
