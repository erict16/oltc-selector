"use client";

import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LangSwitcher } from "@/components/LangSwitcher";
import { useAppLang } from "@/components/LangProvider";
import { APP_VERSION } from "@/lib/appVersion";
import { setAppLang, t } from "@/lib/i18n";
import { RELEASES, type NoteKind } from "@/lib/releaseNotes";

const KIND_KEY = {
  fix: "kindFix",
  new: "kindNew",
  imp: "kindImp",
} as const satisfies Record<NoteKind, string>;

function anchor(version: string) {
  return `v${version.replaceAll(".", "-")}`;
}

function minorOf(version: string) {
  return version.split(".").slice(0, 2).join(".");
}

export function ChangelogView() {
  const lang = useAppLang();
  const releases = RELEASES[lang];
  // Major-version groups, newest first. Once a 2.x exists, the sidebar
  // grows one tab per major and older majors fold into their own tab.
  const majors = [...new Set(releases.map((r) => r.version.split(".")[0]))];
  const [major, setMajor] = useState(majors[0]);
  const shown = releases.filter((r) => r.version.split(".")[0] === major);

  // The sidebar collapses patch releases into minor lines (v1.2, v1.1 …),
  // each pointing at the newest patch of that line.
  const minors = [...new Set(shown.map((r) => minorOf(r.version)))].map(
    (minor) => ({
      minor,
      target: anchor(shown.find((r) => minorOf(r.version) === minor)!.version),
    }),
  );
  const [activeMinor, setActiveMinor] = useState<string | null>(null);
  const current = activeMinor ?? minors[0]?.minor;
  const tlRef = useRef<HTMLDivElement>(null);
  // A sidebar click pins the highlight; the next genuine user scroll
  // (wheel / touch / keys) releases it back to the scroll-spy.
  const pinRef = useRef<string | null>(null);

  useEffect(() => {
    const root = tlRef.current;
    if (!root) return;
    const onScroll = () => {
      if (pinRef.current) return;
      const sections = Array.from(
        root.querySelectorAll<HTMLElement>("[data-minor]"),
      );
      if (!sections.length) return;
      const mark = window.scrollY + window.innerHeight * 0.35;
      let next = sections[0].getAttribute("data-minor");
      for (const s of sections) {
        const top = s.getBoundingClientRect().top + window.scrollY;
        if (top <= mark) next = s.getAttribute("data-minor");
        else break;
      }
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) {
        next = sections[sections.length - 1].getAttribute("data-minor");
      }
      setActiveMinor(next);
    };
    const unpin = () => {
      pinRef.current = null;
      onScroll();
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", unpin, { passive: true });
    window.addEventListener("touchmove", unpin, { passive: true });
    window.addEventListener("keydown", unpin);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", unpin);
      window.removeEventListener("touchmove", unpin);
      window.removeEventListener("keydown", unpin);
    };
  }, [major, lang]);

  return (
    <div className="mx-auto w-full max-w-[880px] px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden />
          {t(lang, "backToSelector")}
        </Link>
        <LangSwitcher lang={lang} onChange={setAppLang} ariaLabel="Language" />
      </div>
      <h1 className="mt-4 text-[1.375rem] font-bold tracking-[-0.02em] text-[var(--color-ink)]">
        {t(lang, "changelogTitle")}
      </h1>
      <p className="mt-1 text-[0.8125rem] text-[var(--color-muted)]">
        {t(lang, "changelogSub")}
      </p>

      <div className="mt-7 grid gap-8 sm:grid-cols-[9.5rem_1fr]">
        <nav
          className="flex flex-wrap items-baseline gap-x-3 gap-y-1 self-start sm:sticky sm:top-6 sm:block"
          aria-label={t(lang, "changelogVersions")}
        >
          {majors.length > 1 ? (
            <div className="mb-3 flex gap-1.5">
              {majors.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMajor(m);
                    setActiveMinor(null);
                  }}
                  aria-pressed={m === major}
                  className={`h-[26px] rounded-full border px-3 text-[0.75rem] font-medium transition-colors ${
                    m === major
                      ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-accent-ink)]"
                      : "border-[var(--color-rule-2)] bg-white text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  {m}.x
                </button>
              ))}
            </div>
          ) : null}
          <p className="mb-2 hidden text-[0.6875rem] font-semibold tracking-[0.08em] text-[var(--color-caption)] sm:block">
            {t(lang, "changelogVersions")}
          </p>
          {minors.map((m) => (
            <a
              key={m.minor}
              href={`#${m.target}`}
              onClick={() => {
                pinRef.current = m.minor;
                setActiveMinor(m.minor);
              }}
              aria-current={m.minor === current ? "true" : undefined}
              className={`border-l-2 py-1 pl-2.5 text-[0.8125rem] [font-variant-numeric:tabular-nums] transition-colors sm:block ${
                m.minor === current
                  ? "border-[var(--color-accent)] font-semibold text-[var(--color-ink)]"
                  : "border-[var(--color-rule)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              }`}
            >
              v{m.minor}
            </a>
          ))}
        </nav>

        <div>
          <div className="note-tl" ref={tlRef}>
            {shown.map((rel) => (
              <section
                key={rel.version}
                id={anchor(rel.version)}
                data-minor={minorOf(rel.version)}
                className={`note-rel scroll-mt-6 pb-7 last:pb-1${
                  rel.version === APP_VERSION ? " cur" : ""
                }`}
              >
                <p className="flex flex-wrap items-baseline gap-2 text-[0.9375rem] font-bold text-[var(--color-ink)] [font-variant-numeric:tabular-nums]">
                  v{rel.version}
                  {rel.version === APP_VERSION ? (
                    <span className="rounded-full bg-[oklch(95%_0.03_256)] px-[7px] py-px text-[0.625rem] font-semibold text-[var(--color-accent)]">
                      {t(lang, "changelogNow")}
                    </span>
                  ) : null}
                  <span className="text-[0.6875rem] font-normal text-[var(--color-caption)]">
                    {rel.date}
                  </span>
                </p>
                {rel.groups.map((g) => (
                  <div key={g.kind} className="mt-2">
                    <span className={`note-chip note-chip-${g.kind} mb-1`}>
                      {t(lang, KIND_KEY[g.kind])}
                    </span>
                    <ul className="list-none">
                      {g.items.map((line) => (
                        <li
                          key={line}
                          className="mb-1.5 flex items-start gap-2 text-[0.8125rem] leading-relaxed text-[var(--color-ink-2)]"
                        >
                          <span
                            aria-hidden
                            className="mt-2 size-[5px] shrink-0 rounded-full bg-[var(--color-caption)]/60"
                          />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            ))}
            {/* The timeline ends where the project began. */}
            <p
              className="note-rel text-[0.75rem] text-[var(--color-caption)]"
              data-minor={minorOf(shown[shown.length - 1]?.version ?? "")}
            >
              {t(lang, "changelogBorn")}
            </p>
          </div>
          {/* Scroll room so the last anchors can actually move and the
              scroll-spy mark can reach the trailing minor lines. */}
          <div aria-hidden className="h-[35vh]" />
        </div>
      </div>
    </div>
  );
}
