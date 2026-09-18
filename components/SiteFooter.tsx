"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useAppLang } from "@/components/LangProvider";
import { APP_VERSION } from "@/lib/appVersion";
import { t } from "@/lib/i18n";
import { RELEASE_NOTES } from "@/lib/releaseNotes";

export function SiteFooter() {
  const pathname = usePathname();
  const lang = useAppLang();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const notes = RELEASE_NOTES[lang];

  const show = () => {
    setMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setOpen(true));
    });
  };
  const hide = () => setOpen(false);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    const onPtr = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) hide();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPtr);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPtr);
    };
  }, [mounted]);

  if (/\/(privacy|terms|login|agents)\/?$/.test(pathname)) {
    return null;
  }

  const chrome =
    "text-[0.75rem] leading-none tracking-[0.02em] text-[var(--color-muted)] transition-[color,transform] duration-150 [@media(hover:hover)]:hover:text-[var(--color-ink-2)]";

  return (
    <footer className="shrink-0 bg-[var(--color-paper)] pt-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom,0px))]">
      <div className="relative mx-auto flex w-full max-w-[1100px] flex-wrap items-baseline justify-between gap-x-6 gap-y-1.5 px-4 sm:px-6">
        <div ref={rootRef} className="relative">
          {mounted ? (
            <div
              id={panelId}
              role="dialog"
              aria-labelledby={`${panelId}-title`}
              className={`changelog-pop absolute bottom-[calc(100%+0.55rem)] left-0 z-30 w-[min(22.5rem,calc(100vw-2rem))] rounded-[var(--radius-md)] border border-[var(--color-rule-2)] bg-white px-3.5 pt-3.5 pb-3 shadow-[0_10px_28px_oklch(24%_0.02_258_/_0.08)] ${
                open ? "is-open" : "is-closing"
              }`}
              onTransitionEnd={(e) => {
                if (e.propertyName !== "opacity") return;
                if (!open) setMounted(false);
              }}
            >
              <button
                type="button"
                className="agent-x"
                onClick={hide}
                aria-label={t(lang, "agentClose")}
              >
                <XMarkIcon className="h-4 w-4" aria-hidden />
              </button>
              <h2
                id={`${panelId}-title`}
                className="pr-8 text-[0.875rem] font-semibold tracking-[-0.02em] text-[var(--color-ink)]"
              >
                v{APP_VERSION}
                <span className="ml-2 text-[0.75rem] font-medium text-[var(--color-accent)]">
                  {t(lang, "changelogNow")}
                </span>
              </h2>
              <section className="mt-3">
                <p className="text-[0.75rem] font-semibold text-[var(--color-ink)]">
                  {notes.currentLabel}
                </p>
                <ul className="mt-1.5 list-disc space-y-1.5 pl-4 text-[0.8125rem] leading-snug text-[var(--color-ink-2)]">
                  {notes.current.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </section>
              <section className="mt-3">
                <p className="text-[0.75rem] font-semibold text-[var(--color-ink)]">
                  {notes.earlierLabel}
                </p>
                <ul className="mt-1.5 list-disc space-y-1.5 pl-4 text-[0.8125rem] leading-snug text-[var(--color-ink-2)]">
                  {notes.earlier.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </section>
            </div>
          ) : null}
          <button
            type="button"
            className={`inline-flex min-h-10 items-center active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ${chrome}`}
            aria-expanded={open}
            aria-controls={mounted ? panelId : undefined}
            aria-haspopup="dialog"
            onClick={() => (open ? hide() : show())}
          >
            v{APP_VERSION}
          </button>
        </div>
        <nav
          className="flex items-baseline gap-3 text-[0.75rem] leading-none tracking-[0.02em]"
          aria-label="Legal"
        >
          <Link href="/privacy/" className={chrome}>
            Privacy
          </Link>
          <Link href="/terms/" className={chrome}>
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
