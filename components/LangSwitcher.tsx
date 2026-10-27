"use client";

import { LANG_OPTIONS, type Lang } from "@/lib/i18n";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function LangSwitcher({
  lang,
  onChange,
  ariaLabel,
}: {
  lang: Lang;
  onChange: (l: Lang) => void;
  ariaLabel: string;
}) {
  return (
    <div
      className="ml-auto flex w-auto max-w-full shrink-0 flex-nowrap items-center justify-end gap-0.5 rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] bg-[#e8ecf0] p-[2px]"
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
              "inline-flex h-7 w-8 shrink-0 sm:w-9 items-center justify-center rounded-[4px] text-[0.75rem] font-medium leading-none transition-[background-color,color,box-shadow] duration-150",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]",
              on
                ? "bg-white font-semibold text-[var(--color-ink)] shadow-[0_1px_2px_rgb(21_33_46/0.12),0_0_0_1px_rgb(21_33_46/0.05)]"
                : "text-[var(--color-muted)] hover:text-[var(--color-ink)]",
            )}
          >
            {opt.short}
          </button>
        );
      })}
    </div>
  );
}
