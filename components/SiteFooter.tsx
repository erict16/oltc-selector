"use client";

import { ArrowRightIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useAppLang } from "@/components/LangProvider";
import { APP_VERSION } from "@/lib/appVersion";
import { t } from "@/lib/i18n";
import { RELEASES, type NoteKind } from "@/lib/releaseNotes";

const KIND_KEY = {
  fix: "kindFix",
  new: "kindNew",
  imp: "kindImp",
} as const satisfies Record<NoteKind, string>;

export function SiteFooter() {
  const pathname = usePathname();
  const lang = useAppLang();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  // The popover only carries the two newest releases; /changelog has all.
  const shown = RELEASES[lang].slice(0, 2);

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

  if (/\/(privacy|terms|login|agents|changelog)\/?$/.test(pathname)) {
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
              className={`changelog-pop absolute bottom-[calc(100%+0.55rem)] left-0 z-30 max-h-[70vh] w-[min(23rem,calc(100vw-2rem))] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-rule-2)] bg-white px-3.5 pt-3 pb-2 shadow-[0_10px_28px_oklch(24%_0.02_258_/_0.08)] ${
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
                className="text-[0.6875rem] font-semibold tracking-[0.08em] text-[var(--color-caption)]"
              >
                {t(lang, "changelogTitle")}
              </h2>
              <div className="note-tl mt-2.5">
                {shown.map((rel, i) => (
                  <section
                    key={rel.version}
                    className={`note-rel pb-3 last:pb-1${i === 0 ? " cur" : ""}`}
                  >
                    <p className="flex items-baseline gap-2 text-[0.8125rem] font-semibold text-[var(--color-ink)] [font-variant-numeric:tabular-nums]">
                      v{rel.version}
                      {i === 0 ? (
                        <span className="rounded-full bg-[oklch(95%_0.03_256)] px-[7px] py-px text-[0.625rem] font-semibold text-[var(--color-accent)]">
                          {t(lang, "changelogNow")}
                        </span>
                      ) : null}
                      <span className="ml-auto text-[0.6875rem] font-normal text-[var(--color-caption)]">
                        {rel.date}
                      </span>
                    </p>
                    {rel.groups.map((g) => (
                      <div key={g.kind} className="mt-1.5">
                        <span className={`note-chip note-chip-${g.kind} mb-1`}>
                          {t(lang, KIND_KEY[g.kind])}
                        </span>
                        <ul className="list-none">
                          {g.items.map((line) => (
                            <li
                              key={line}
                              className={`mb-1 flex items-start gap-2 text-[0.8125rem] leading-snug ${
                                i === 0
                                  ? "text-[var(--color-ink-2)]"
                                  : "text-[var(--color-muted)]"
                              }`}
                            >
                              <span
                                aria-hidden
                                className="mt-1.5 size-[5px] shrink-0 rounded-full bg-[var(--color-caption)]/60"
                              />
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </section>
                ))}
              </div>
              <div className="mt-2 border-t border-[var(--color-rule)] pt-2.5 pb-1">
                <Link
                  href="/changelog/"
                  onClick={hide}
                  className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-[var(--color-accent)] transition-colors hover:text-[var(--color-ink)]"
                >
                  {t(lang, "changelogAll")}
                  <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
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
