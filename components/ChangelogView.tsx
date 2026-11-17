"use client";

import Link from "next/link";
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

/** Group order inside a release: what is new first. */
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

/** "命令行：…" / "CLI: …" → the area in bold, then the sentence. */
function splitArea(line: string): [string | null, string] {
  const m = /^([^：:。.]{1,16})(：|: )(.+)$/s.exec(line);
  return m ? [m[1], m[3]] : [null, line];
}

/** CLI flags in a note (--json, --flag=value) set in mono. */
function withCode(text: string) {
  const parts = text.split(/(--[a-z][a-z0-9-]*(?:=[^\s，。；、,;)）]+)?)/);
  return parts.map((p, i) => (i % 2 ? <code key={i}>{p}</code> : p));
}

/** Release notes in the style of Linear / Cursor (2026-11-17 Eric: "get rid
 *  of Notion style"): every release open, version and month in a sticky
 *  left column, the notes grouped by kind on the right. */
export function ChangelogView() {
  const lang = useAppLang();
  const releases = RELEASES[lang];

  return (
    <div className="page doc-page flex w-full min-w-0 flex-1 flex-col">
      <TopBar lang={lang} current="changelog" />

      <main lang={lang} className="doc mx-auto w-full">
        <header className="doc-hero">
          <h1 className="doc-title">{t(lang, "changelogTitle")}</h1>
        </header>

        <div className="rel-list">
          {releases.map((rel) => (
            <ReleaseEntry key={rel.version} rel={rel} lang={lang} />
          ))}
        </div>

        <p className="rel-born">{t(lang, "changelogBorn")}</p>
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

function ReleaseEntry({ rel, lang }: { rel: Release; lang: Lang }) {
  const groups = KIND_ORDER.flatMap((k) => rel.groups.filter((g) => g.kind === k));
  const id = anchor(rel.version);
  return (
    <article id={id} className="rel" aria-labelledby={`${id}-h`}>
      <div className="rel-meta">
        <h2 id={`${id}-h`} className="rel-ver">
          <a href={`#${id}`}>v{rel.version}</a>
        </h2>
        <p className="rel-date">{monthName(rel.date, lang)}</p>
        {rel.version === APP_VERSION ? (
          <span className="rel-now">{t(lang, "changelogNow")}</span>
        ) : null}
      </div>
      <div className="rel-body">
        {groups.map((g) => (
          <section key={g.kind} className="rel-group">
            <h3 className={`rel-kind rel-kind-${g.kind}`}>{t(lang, KIND_KEY[g.kind])}</h3>
            <ul>
              {g.items.map((line) => {
                const [area, text] = splitArea(line);
                return (
                  <li key={line}>
                    {area ? <strong>{area}</strong> : null}
                    {withCode(text)}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </article>
  );
}
