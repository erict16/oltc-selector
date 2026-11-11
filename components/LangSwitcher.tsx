"use client";

import { LanguageIcon } from "@heroicons/react/24/outline";

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
    <span className="lang-btn">
      <LanguageIcon className="h-5 w-5" strokeWidth={1.6} aria-hidden />
      {/* The native menu sits invisibly over the icon, so a tap opens it. */}
      <select
        aria-label={ariaLabel}
        value={lang}
        onChange={(e) => onChange(e.target.value as Lang)}
      >
        {LANG_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </span>
  );
}
