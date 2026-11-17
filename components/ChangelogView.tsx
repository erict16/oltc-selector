"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
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
/** "/oltc-selector" on GitHub Pages, "" locally: files in public/ need it. */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

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
          <p className="log-stats">
            {stats.map(([n, label]) => (
              <span key={label}>
                <b>{nf.format(n)}</b> {label}
              </span>
            ))}
          </p>
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

type Day = { ymd: string; count: number; total: number; rels: Release[] };

/** The work, day by day (2026-11-17 Eric: "make this the highlight, be
 *  creative"). Bars grow in on load, darker on busier days; a line climbs
 *  to the running total of commits; every release day has a marker, the
 *  major versions named. Hover or tap a day for its card;
 *  click a release day to jump to its notes. */
function Activity({ lang, releases }: { lang: Lang; releases: Release[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const start = utc(ACTIVITY_FROM).getTime();
  const n = Math.round((utc(ACTIVITY_TO).getTime() - start) / DAY_MS) + 1;
  const max = Math.max(...Object.values(COMMITS_PER_DAY));

  const byDay = new Map<string, Release[]>();
  for (const r of releases) {
    const day = RELEASE_META[r.version]?.day;
    if (day) byDay.set(day, [...(byDay.get(day) ?? []), r]);
  }
  let run = 0;
  const days: Day[] = Array.from({ length: n }, (_, i) => {
    const ymd = new Date(start + i * DAY_MS).toISOString().slice(0, 10);
    const count = COMMITS_PER_DAY[ymd] ?? 0;
    run += count;
    return { ymd, count, total: run, rels: byDay.get(ymd) ?? [] };
  });
  const total = run;

  // Running total as a line over the bars, 0..1000 wide, 100 tall.
  const x = (i: number) => ((i + 0.5) / n) * 1000;
  const y = (v: number) => 100 - (v / total) * 92;
  const line = days.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.total).toFixed(1)}`).join("");
  const area = `${line}L${x(n - 1).toFixed(1)},100L${x(0).toFixed(1)},100Z`;

  const months = days.map((d, i) => ({ ...d, i })).filter((d) => d.ymd.endsWith("-01"));
  const named = (r: Release) => r.version.endsWith(".0.0");
  const commits = t(lang, "statCommits");
  const h = hover == null ? null : days[hover];
  const jump = (d: Day) => {
    const r = d.rels[d.rels.length - 1];
    if (r) document.getElementById(anchor(r.version))?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <figure className="pulse" aria-label={t(lang, "activityAria")}>
      <div className="pulse-chart" onMouseLeave={() => setHover(null)}>
        <svg className="pulse-line" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="pulse-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0284c7" stopOpacity="0.16" />
              <stop offset="1" stopColor="#0284c7" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#pulse-fill)" className="pulse-area" />
          <path d={line} pathLength={1} className="pulse-path" vectorEffect="non-scaling-stroke" />
        </svg>

        <div className="pulse-bars">
          {days.map((d, i) => (
            <span
              key={d.ymd}
              className={`pulse-day${d.count ? "" : " is-zero"}${d.rels.length ? " is-rel" : ""}${hover === i ? " is-on" : ""}`}
              style={{ "--i": i, "--k": d.count / max } as CSSProperties}
              onMouseEnter={() => setHover(i)}
              onClick={() => (d.rels.length ? jump(d) : setHover(i))}
            >
              <i style={{ height: d.count ? `${Math.max(6, Math.sqrt(d.count / max) * 78)}%` : undefined }} />
            </span>
          ))}
        </div>

        {days.map((d, i) =>
          d.rels.length ? (
            <span
              key={`f-${d.ymd}`}
              className="pulse-flag"
              style={{ left: `${((i + 0.5) / n) * 100}%` } as CSSProperties}
              aria-hidden
            >
              {d.rels.some(named) ? (
                <b>v{d.rels.find(named)!.version.replace(/\.0$/, "")}</b>
              ) : null}
            </span>
          ) : null,
        )}

        {h ? (
          <div
            className="pulse-tip"
            style={{ left: `clamp(6rem, ${((hover! + 0.5) / n) * 100}%, calc(100% - 6rem))` }}
            role="status"
          >
            <p className="pulse-tip-date">{dateLabel(h.ymd, lang, { month: "long", day: "numeric" })}</p>
            <p className="pulse-tip-n">
              <strong>{h.count}</strong> {commits}
            </p>
            {h.rels.map((r) => (
              <p key={r.version} className="pulse-tip-rel">
                <code>v{r.version}</code> {r.title}
              </p>
            ))}
          </div>
        ) : null}
      </div>

      <div className="pulse-months" aria-hidden>
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
  const meta = RELEASE_META[rel.version]?.image;
  const image = meta ? `${BASE}${meta}` : undefined;
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
              {g.items.map((line) => (
                <li key={line}>{withCode(line)}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </li>
  );
}
