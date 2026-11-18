"use client";

import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { useAppLang } from "@/components/LangProvider";
import { t, type Lang } from "@/lib/i18n";
import {
  LEGAL_MAIL,
  LEGAL_UPDATED,
  LEGAL_UPDATED_LABEL,
  PRIVACY,
  TERMS,
} from "@/lib/legalText";

/** CLI flags in the text (--no-update-check) set in mono. */
function withCode(text: string) {
  const parts = text.split(/(--[a-z][a-z0-9-]*)/);
  return parts.map((p, i) => (i % 2 ? <code key={i}>{p}</code> : p));
}

function updated(lang: Lang) {
  let day = LEGAL_UPDATED;
  try {
    day = new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : lang, {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${LEGAL_UPDATED}T00:00:00Z`));
  } catch {}
  return `${LEGAL_UPDATED_LABEL[lang]} ${day}`;
}

/** Terms and Privacy (2026-11-18 redesign): the same white page, header bar
 *  and narrow column as the release notes, in the page's language. The two
 *  pages switch from the pills above the title. */
export function LegalView({ page }: { page: "terms" | "privacy" }) {
  const lang = useAppLang();
  const doc = (page === "terms" ? TERMS : PRIVACY)[lang];

  return (
    <div className="page doc-page flex w-full min-w-0 flex-1 flex-col">
      <TopBar lang={lang} current="legal" />

      <main lang={lang} className="log mx-auto w-full">
        <header className="legal-hero">
          <nav className="legal-tabs" aria-label={doc.title}>
            <Link href="/terms/" aria-current={page === "terms" ? "page" : undefined}>
              {t(lang, "navTerms")}
            </Link>
            <Link href="/privacy/" aria-current={page === "privacy" ? "page" : undefined}>
              {t(lang, "navPrivacy")}
            </Link>
          </nav>
          <h1 className="log-title">{doc.title}</h1>
          <p className="legal-date">{updated(lang)}</p>
        </header>

        <ol className="legal-list">
          {doc.sections.map((s, i) => (
            <li key={s.h} className="legal-sec">
              <h2>
                <span className="legal-num num">{i + 1}</span>
                {s.h}
              </h2>
              {s.p.map((para, j) => (
                <p key={j}>
                  {withCode(para)}
                  {s.mail && j === s.p.length - 1 && (
                    <>
                      {" "}
                      <a href={`mailto:${LEGAL_MAIL}`}>{LEGAL_MAIL}</a>
                    </>
                  )}
                </p>
              ))}
            </li>
          ))}
        </ol>
      </main>

      <footer className="page-foot">
        <nav aria-label={t(lang, "title")}>
          <Link href="/">{t(lang, "title")}</Link>
          <Link href="/agents/" className="foot-dup">
            {t(lang, "agentChip")}
          </Link>
          <Link href="/changelog/" className="foot-dup">
            {t(lang, "changelogTitle")}
          </Link>
        </nav>
      </footer>
    </div>
  );
}
