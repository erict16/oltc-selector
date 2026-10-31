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
  /** Kept for older call sites; the switch has one look. */
  tone?: "light" | "dark";
}) {
  return (
    <>
      {/* Phones: one native menu instead of six chips. */}
      <select
        aria-label={ariaLabel}
        value={lang}
        onChange={(e) => onChange(e.target.value as Lang)}
        className="ui-control ui-control-sm w-auto sm:hidden"
      >
        {LANG_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.short}
          </option>
        ))}
      </select>
      {/* .ui-track sets display outside a layer, which beats Tailwind's hidden. */}
      <div className="hidden sm:block">
        <div className="ui-track ui-track-sm" role="group" aria-label={ariaLabel}>
          {LANG_OPTIONS.map((opt) => {
            const on = lang === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                title={opt.label}
                aria-pressed={on}
                onClick={() => onChange(opt.id)}
                className={cx("ui-seg w-10", on && "is-on")}
              >
                {opt.short}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
