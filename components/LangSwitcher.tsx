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
      className="flex shrink-0 flex-wrap items-center justify-end gap-1"
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
              "rounded-[var(--radius-sm)] border px-2 py-1 font-mono text-[0.6875rem] tracking-wide transition-colors duration-150",
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
