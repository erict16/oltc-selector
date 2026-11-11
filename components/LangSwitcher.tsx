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
    <select
      aria-label={ariaLabel}
      value={lang}
      onChange={(e) => onChange(e.target.value as Lang)}
      className="row-control lang-select"
    >
      {LANG_OPTIONS.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
