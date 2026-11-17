"use client";

import { ChevronRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { BoltMark } from "@/components/BoltMark";
import { TopBar } from "@/components/TopBar";
import { useAppLang } from "@/components/LangProvider";
import { APP_VERSION } from "@/lib/appVersion";
import { t, type Lang } from "@/lib/i18n";
import { RELEASES, type NoteKind, type Release } from "@/lib/releaseNotes";

const KIND_KEY = {
  fix: "kindFix",
  new: "kindNew",
  imp: "kindImp",
} as const satisfies Record<NoteKind, string>;

/** Tag order inside a release head: what is new first. */
const KIND_ORDER: NoteKind[] = ["new", "imp", "fix"];

function anchor(version: string) {
  return `v${version.replaceAll(".", "-")}`;
}

/** "2026-11" in the reader's language: 2026年11月, November 2026 … */
function monthName(ym: string, lang: Lang) {
  const [y, m] = ym.split("-").map(Number);
  const tag = lang === "zh" ? "zh-CN" : lang;
  try {
    return new Intl.DateTimeFormat(tag, { year: "numeric", month: "long", timeZone: "UTC" }).format(
      new Date(Date.UTC(y, m - 1, 1)),
    );
  } catch {
    return ym;
  }
}

/** Release notes as a Notion page (2026-11-17 Eric): a title, the months as
 *  headings, one toggle per version with coloured kind tags. The newest
 *  version starts open. */
export function ChangelogView() {
  const lang = useAppLang();
  const releases = RELEASES[lang];
  const months: { ym: string; rels: Release[] }[] = [];
  for (const rel of releases) {
    const last = months[months.length - 1];
    if (last && last.ym === rel.date) last.rels.push(rel);
    else months.push({ ym: rel.date, rels: [rel] });
  }

  return (
    <div className="page notion-page flex w-full min-w-0 flex-1 flex-col">
      <TopBar lang={lang} current="changelog" />

      <main lang={lang} className="notion mx-auto w-full max-w-[45rem] px-4 sm:px-6">
        <BoltMark className="notion-icon" />
        <h1 className="notion-title">{t(lang, "changelogTitle")}</h1>

        {months.map(({ ym, rels }) => (
          <section key={ym} className="notion-month" aria-label={monthName(ym, lang)}>
            <h2 className="notion-h2">{monthName(ym, lang)}</h2>
            {rels.map((rel) => (
              <ReleaseToggle
                key={rel.version}
                rel={rel}
                lang={lang}
                open={rel === releases[0]}
              />
            ))}
          </section>
        ))}

        <p className="notion-born">{t(lang, "changelogBorn")}</p>
      </main>

      <footer className="page-foot">
        <nav aria-label={t(lang, "title")}>
          <Link href="/">{t(lang, "title")}</Link>
          <Link href="/agents/" className="foot-dup">
            {t(lang, "agentChip")}
          </Link>
          <Link href="/terms/">{t(lang, "navTerms")}</Link>
          <Link href="/privacy/">{t(lang, "navPrivacy")}</Link>
        </nav>
      </footer>
    </div>
  );
}

function ReleaseToggle({ rel, lang, open }: { rel: Release; lang: Lang; open: boolean }) {
  const kinds = KIND_ORDER.filter((k) => rel.groups.some((g) => g.kind === k));
  const groups = KIND_ORDER.flatMap((k) => rel.groups.filter((g) => g.kind === k));
  return (
    <details id={anchor(rel.version)} className="notion-toggle" open={open}>
      <summary>
        <ChevronRightIcon className="notion-chev h-4 w-4 shrink-0" aria-hidden />
        <span className="notion-ver">v{rel.version}</span>
        {rel.version === APP_VERSION ? (
          <span className="notion-tag notion-tag-gray">{t(lang, "changelogNow")}</span>
        ) : null}
        <span className="notion-tags">
          {kinds.map((k) => (
            <span key={k} className={`notion-tag notion-tag-${k}`}>
              {t(lang, KIND_KEY[k])}
            </span>
          ))}
        </span>
      </summary>
      <div className="notion-toggle-body">
        {groups.map((g) => (
          <div key={g.kind} className="notion-group">
            <span className={`notion-tag notion-tag-${g.kind}`}>{t(lang, KIND_KEY[g.kind])}</span>
            <ul>
              {g.items.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
