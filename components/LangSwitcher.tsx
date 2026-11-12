"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CheckIcon, LanguageIcon } from "@heroicons/react/24/outline";

import { LANG_OPTIONS, type Lang } from "@/lib/i18n";

/** Icon button that opens a small menu of languages, each in its own name. */
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
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();

  const focusItem = (i: number) => {
    const n = LANG_OPTIONS.length;
    itemRefs.current[((i % n) + n) % n]?.focus();
  };

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) btnRef.current?.focus();
  };

  // On open, put focus on the current language.
  useEffect(() => {
    if (!open) return;
    focusItem(Math.max(0, LANG_OPTIONS.findIndex((o) => o.id === lang)));
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onMenuKey = (e: React.KeyboardEvent) => {
    const i = itemRefs.current.findIndex((el) => el === document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusItem(i + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusItem(i - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusItem(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusItem(LANG_OPTIONS.length - 1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="lang-switch">
      <button
        ref={btnRef}
        type="button"
        className="lang-btn"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        data-open={open || undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <LanguageIcon className="h-5 w-5" strokeWidth={1.6} aria-hidden />
      </button>
      {open ? (
        <div id={menuId} role="menu" aria-label={ariaLabel} className="lang-menu" onKeyDown={onMenuKey}>
          {LANG_OPTIONS.map((opt, i) => {
            const on = opt.id === lang;
            return (
              <button
                key={opt.id}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={on}
                lang={opt.id}
                tabIndex={-1}
                className="lang-item"
                onClick={() => {
                  if (!on) onChange(opt.id);
                  close(true);
                }}
              >
                <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                {on ? <CheckIcon className="lang-tick" strokeWidth={2.2} aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
