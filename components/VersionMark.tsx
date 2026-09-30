"use client";

import { ArrowRightIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
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

/** Version in the result pane. Click opens the same changelog card as before. */
export function VersionMark() {
  const lang = useAppLang();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);
  const openGen = useRef(0);
  const hideTimer = useRef<number | null>(null);
  const panelId = useId();
  const shown = RELEASES[lang].slice(0, 2);
  openRef.current = open;

  const clearHide = () => {
    if (hideTimer.current != null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const show = () => {
    const gen = ++openGen.current;
    clearHide();
    setMounted(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (openGen.current !== gen) return;
        setOpen(true);
      });
    });
  };
  // Escape before the open frames paint never starts a transition, so
  // transitionend cannot unmount the dialog. Drop it immediately in that case.
  const hide = () => {
    openGen.current += 1;
    clearHide();
    if (!openRef.current) {
      setOpen(false);
      setMounted(false);
      return;
    }
    setOpen(false);
    const wait = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : 170;
    hideTimer.current = window.setTimeout(() => setMounted(false), wait);
  };
  const hideRef = useRef(hide);
  hideRef.current = hide;

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hideRef.current();
    };
    const onPtr = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) hideRef.current();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPtr);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPtr);
    };
  }, [mounted]);

  useEffect(() => () => clearHide(), []);

  return (
    <div ref={rootRef} className="relative shrink-0">
      {mounted ? (
        <div
          id={panelId}
          role="dialog"
          aria-labelledby={`${panelId}-title`}
          className={`changelog-pop absolute right-0 bottom-[calc(100%+0.55rem)] z-30 max-h-[70vh] w-[min(23rem,calc(100vw-2rem))] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-rule)] bg-white px-3.5 pt-3 pb-2 text-left shadow-[0_10px_28px_oklch(24%_0.02_258_/_0.08)] ${
            open ? "is-open" : "is-closing"
          }`}
          onTransitionEnd={(e) => {
            if (e.propertyName !== "opacity") return;
            if (!open) {
              clearHide();
              setMounted(false);
            }
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
                <p className="flex items-center gap-2 text-[0.8125rem] font-semibold text-[var(--color-ink)] [font-variant-numeric:tabular-nums]">
                  v{rel.version}
                  {i === 0 ? (
                    <span className="changelog-now rounded-full bg-[oklch(95%_0.03_256)] px-[7px] py-px text-[0.625rem] font-semibold leading-none text-[var(--color-accent)]">
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
        className="inline-flex min-h-10 items-center text-[0.75rem] leading-none tracking-[0.02em] text-[#8aa4bb] tabular-nums transition-colors duration-150 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-[0.96]"
        aria-expanded={open}
        aria-controls={mounted ? panelId : undefined}
        aria-haspopup="dialog"
        onClick={() => (open ? hide() : show())}
      >
        v{APP_VERSION}
      </button>
    </div>
  );
}
