"use client";

import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { useAppLang } from "@/components/LangProvider";
import { ACTIVITY_FROM, ACTIVITY_TO, COMMITS_PER_DAY, COMMIT_TOTAL } from "@/lib/activity";
import { APP_VERSION } from "@/lib/appVersion";
import { t, type Lang } from "@/lib/i18n";
import { RELEASES, RELEASE_META, type NoteKind, type Release } from "@/lib/releaseNotes";

const KIND_KEY = {
  fix: "kindFix",
  new: "kindNew",
  imp: "kindImp",
} as const satisfies Record<NoteKind, string>;

/** Group order inside a release: what is new first. */
const KIND_ORDER: NoteKind[] = ["new", "imp", "fix"];
const DAY_MS = 86_400_000;

function anchor(version: string) {
  return `v${version.replaceAll(".", "-")}`;
}

function locale(lang: Lang) {
  return lang === "zh" ? "zh-CN" : lang;
}

function utc(ymd: string) {
  const [y, m, d = 1] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** 2026-11-14 → 2026年11月14日; 2026-09 → 2026年9月. */
function dateLabel(ymd: string, lang: Lang, opts: Intl.DateTimeFormatOptions) {
  try {
    return new Intl.DateTimeFormat(locale(lang), { ...opts, timeZone: "UTC" }).format(utc(ymd));
  } catch {
    return ymd;
  }
}

function releaseDate(rel: Release, lang: Lang) {
  const day = RELEASE_META[rel.version]?.day;
  return day
    ? dateLabel(day, lang, { year: "numeric", month: "long", day: "numeric" })
    : dateLabel(rel.date, lang, { year: "numeric", month: "long" });
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

/** Release notes that show the work (2026-11-17 Eric: "we update the app
 *  extremely frequently, I want to demonstrate the efforts"; "no need too
 *  wide"; Linear's was "meh"). One narrow column: the totals, every day's
 *  commits as a bar with release days marked, then a timeline of releases,
 *  each with a one-line title, and a screenshot where the look changed. */
export function ChangelogView() {
  const lang = useAppLang();
  const releases = RELEASES[lang];
  const changes = releases.reduce(
    (n, r) => n + r.groups.reduce((m, g) => m + g.items.length, 0),
    0,
  );
  const days = Math.round((utc(ACTIVITY_TO).getTime() - utc(ACTIVITY_FROM).getTime()) / DAY_MS) + 1;
  const nf = new Intl.NumberFormat(locale(lang));
  const stats: [number, string][] = [
    [releases.length, t(lang, "statReleases")],
    [COMMIT_TOTAL, t(lang, "statCommits")],
    [changes, t(lang, "statChanges")],
    [days, t(lang, "statDays")],
  ];

  return (
    <div className="page doc-page flex w-full min-w-0 flex-1 flex-col">
      <TopBar lang={lang} current="changelog" />

      <main lang={lang} className="log mx-auto w-full">
        <header className="log-hero">
          <h1 className="log-title">{t(lang, "changelogTitle")}</h1>
          <dl className="log-stats">
            {stats.map(([n, label]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{nf.format(n)}</dd>
              </div>
            ))}
          </dl>
          <Activity lang={lang} releases={releases} />
        </header>

        <ol className="log-list">
          {releases.map((rel) => (
            <ReleaseEntry key={rel.version} rel={rel} lang={lang} />
          ))}
        </ol>

        <p className="log-born">{t(lang, "changelogBorn")}</p>
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

/** Every day from the first commit to the last: a bar for its commits, a
 *  dot under the days a version shipped. */
function Activity({ lang, releases }: { lang: Lang; releases: Release[] }) {
  const start = utc(ACTIVITY_FROM).getTime();
  const n = Math.round((utc(ACTIVITY_TO).getTime() - start) / DAY_MS) + 1;
  const max = Math.max(...Object.values(COMMITS_PER_DAY));
  const shipped = new Map<string, string[]>();
  for (const r of releases) {
    const day = RELEASE_META[r.version]?.day;
    if (day) shipped.set(day, [...(shipped.get(day) ?? []), `v${r.version}`]);
  }
  const cols = Array.from({ length: n }, (_, i) => {
    const ymd = new Date(start + i * DAY_MS).toISOString().slice(0, 10);
    return { ymd, count: COMMITS_PER_DAY[ymd] ?? 0, versions: shipped.get(ymd) };
  });
  const months = cols
    .map((c, i) => ({ ...c, i }))
    .filter((c) => c.ymd.endsWith("-01"));
  const commits = t(lang, "statCommits");

  return (
    <figure className="log-activity" aria-label={t(lang, "activityAria")}>
      <div className="log-bars">
        {cols.map((c) => (
          <span
            key={c.ymd}
            className={c.count ? "log-bar" : "log-bar is-zero"}
            title={`${dateLabel(c.ymd, lang, { month: "short", day: "numeric" })} · ${c.count} ${commits}${
              c.versions ? ` · ${c.versions.join(" ")}` : ""
            }`}
          >
            <i style={{ height: c.count ? `${Math.max(8, Math.sqrt(c.count / max) * 100)}%` : undefined }} />
            {c.versions ? <b aria-hidden /> : null}
          </span>
        ))}
      </div>
      <div className="log-months" aria-hidden>
        {months.map((m) => (
          <span key={m.ymd} style={{ left: `${(m.i / n) * 100}%` }}>
            {dateLabel(m.ymd, lang, { month: "short" })}
          </span>
        ))}
      </div>
    </figure>
  );
}

function ReleaseEntry({ rel, lang }: { rel: Release; lang: Lang }) {
  const groups = KIND_ORDER.flatMap((k) => rel.groups.filter((g) => g.kind === k));
  const id = anchor(rel.version);
  const image = RELEASE_META[rel.version]?.image;
  const current = rel.version === APP_VERSION;
  return (
    <li id={id} className={image ? "log-rel is-big" : "log-rel"}>
      <p className="log-meta">
        <a href={`#${id}`} className="log-ver">
          v{rel.version}
        </a>
        <span>{releaseDate(rel, lang)}</span>
        {current ? <span className="log-now">{t(lang, "changelogNow")}</span> : null}
      </p>
      <h2 className="log-rel-title">{rel.title}</h2>
      {image ? (
        <figure className="log-shot">
          <a href={image} target="_blank" rel="noreferrer">
            <img src={image} alt={`v${rel.version}`} width={1600} height={1000} loading="lazy" decoding="async" />
          </a>
        </figure>
      ) : null}
      <div className="log-notes">
        {groups.map((g) => (
          <section key={g.kind}>
            <h3 className={`log-kind log-kind-${g.kind}`}>{t(lang, KIND_KEY[g.kind])}</h3>
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
    </li>
  );
}
