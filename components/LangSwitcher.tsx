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
      className="flex w-full max-w-full flex-wrap items-center gap-1 sm:w-auto sm:justify-end"
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
            onClick={() => onChange(opt.id)}
            className={cx(
              // Slightly tighter on narrow screens so 6 langs fit without horizontal scroll
              "inline-flex h-8 min-w-[2.5rem] flex-1 items-center justify-center rounded-[var(--radius-sm)] border px-1.5 font-mono text-[0.6875rem] tracking-wide transition-colors duration-150 sm:h-7 sm:min-w-0 sm:w-11 sm:flex-none",
              on
                ? "border-[var(--color-accent)] bg-[oklch(58%_0.2_256_/_0.1)] font-semibold text-[var(--color-accent)]"
                : "border-[var(--color-rule)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-ink-2)]",
            )}
          >
            {opt.short}
          </button>
        );
      })}
    </div>
  );
}
