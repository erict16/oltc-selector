"use client";

import {
  ArrowLongRightIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  Square2StackIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { TopBar } from "@/components/TopBar";
import { useAppLang } from "@/components/LangProvider";
import { copyText } from "@/lib/clipboard";
import { t, type Lang } from "@/lib/i18n";
import { agentGuide } from "@/lib/i18nAgents";

const NPM_PAGE = "https://www.npmjs.com/package/oltc-selector";
const INSTALL = "npm i -g oltc-selector";

/** Each example is a real run of the CLI (2026-11-17, v2.4.1). */
const EXAMPLES: { label: string; cmd: string; type: string }[] = [
  {
    label: "throughCurrent",
    cmd: "oltc --iu 350 --um 40.5 --conn D",
    type: "CV2III-350D/40.5-10193W",
  },
  {
    label: "transformerMva",
    cmd: "oltc --mva 25 --kv 110 --tap neutral",
    type: "CV2III-350Y/72.5-10193W",
  },
  {
    label: "kindAuto",
    cmd: "oltc --mva 125 --kind auto --hv 225 --mv 115",
    type: "3xCM2I-500/252D-10193W",
  },
  {
    label: "lineLabel",
    cmd: 'oltc --line "125MVA 225±8x1,25%/115/35kV YNa0d11"',
    type: "3xCM2I-500/252D-10193W",
  },
  {
    label: "dutyOctc",
    cmd: "oltc --octc --iu 800 --um 72.5 --conn D --series II --contact 6x5",
    type: "WSLII-800D/72.5-6x5A",
  },
  {
    label: "specCombined",
    cmd: "oltc --iu 600 --um 72.5 --structure combined",
    type: "CM2III-600Y/72.5B-10193W",
  },
];

/** Flag, the web form's own name for that field, what it takes. */
type Flag = [flag: string, label: string | null, values: string];
const FLAG_GROUPS: { title: string; flags: Flag[] }[] = [
  {
    title: "transformer",
    flags: [
      ["--line", "lineLabel", '"…"'],
      ["--kind", "kindLabel", "two | auto"],
      ["--tap", "tapPoint", "neutral | line | junction | mv-line"],
      ["--regulates", "autoReg", "hv | mv"],
      ["--winding", "winding", "star | delta"],
      ["--kv", "umWinding", "kV"],
      ["--hv", "hvKv", "kV"],
      ["--mv", "mvKv", "kV"],
      ["--earth-um", "earthUm", "kV"],
    ],
  },
  {
    title: "cardDuty",
    flags: [
      ["--mva", "transformerMva", "MVA"],
      ["--iu", "throughCurrent", "A"],
      ["--os-imax", "osImax", "A"],
      ["--k", "safetyK", "1.0"],
      ["--reg", "regulation", "W | G | 0"],
      ["--pm", "pmSteps", "8"],
      ["--pos", "positions", "N"],
      ["--range", "customPos", "+4/-12x1.25%"],
      ["--step-pct", "stepPercent", "1.25"],
      ["--mid", "mid", "1 | 3"],
      ["--ust", "ust", "V"],
      ["--um", "um", "kV"],
      ["--conn", "connection", "Y | D"],
      ["--phases", "phases", "I | II | III"],
    ],
  },
  {
    title: "cardSwitch",
    flags: [
      ["--octc", "dutyKind", ""],
      ["--vacuum / --oil", "arcMode", ""],
      ["--structure", "specStructure", "auto | combined | compound | cage | drum"],
      ["--series", "octcSeries", "II | IV | V | VI | VII | VIII"],
      ["--mount", "mounting", "in-tank | on-tank | dry | reactor"],
      ["--across-li / --across-ac", "insulA", "kV"],
      ["--b-li / --b-ac", "insulB", "kV"],
      ["--c1-li / --c1-ac", "insulC1", "kV"],
      ["--c2-li / --c2-ac", "insulC2", "kV"],
      ["--grade", "selectorSize", "B | C | D | DE"],
    ],
  },
];
/** Shown as a unit, not as a value to type (only when it stands alone:
 *  the V in II | IV | V is a wiring scheme). */
const UNITS = new Set(["kV", "A", "V", "MVA", "N"]);
const OUTPUT_FLAGS: Flag[] = [
  ["--json", null, ""],
  ["--lang", null, "en | zh"],
  ["--version", null, ""],
  ["--help", null, ""],
  ["--no-update-check", null, ""],
];

/** The CLI's own output for one run, in the two languages it prints. */
const DEMO_ARGS = "--mva 25 --kv 110 --tap neutral";
type Line = [kind: "type" | "why" | "dim" | "warn" | "gap" | "head" | "alt", text: string];
const DEMO: Record<"zh" | "en", Line[]> = {
  zh: [
    ["type", "CV2III-350Y/72.5-10193W"],
    ["why", "最低满足路径：CV2 箱内真空复合式有载开关（选择开关），Ium 350 A ≥ 需求 146 A，Um 72.5 kV。"],
    ["dim", "依据：I = S/(√3×110 kV) = 131.2 A，最低档 145.8 A · Ust 793.9 V · 中性点 Um 72.5"],
    ["warn", "注意：中性点绝缘未给，先按 Um 72.5 kV 选，以订货规范为准。"],
    ["gap", ""],
    ["head", "其他可选"],
    ["alt", "CV2III-600Y/72.5-10193W"],
  ],
  en: [
    ["type", "CV2III-350Y/72.5-10193W"],
    ["why", "Minimum-adequate path: CV2 in-tank vacuum compound OLTC (selector switch), Ium 350 A ≥ 146 A, Um 72.5 kV."],
    ["dim", "Basis: I = S/(√3×110 kV) = 131.2 A, lowest tap 145.8 A · Ust 793.9 V · neutral Um 72.5"],
    ["warn", "Note: Neutral insulation not given: sized at Um 72.5 kV; the order specification (OS) decides."],
    ["gap", ""],
    ["head", "Other types that cover the duty"],
    ["alt", "CV2III-600Y/72.5-10193W"],
  ],
};

type Tab = "ex" | "flags" | "install";
const TABS: Tab[] = ["ex", "flags", "install"];

/** The CLI page (2026-11-17 Eric: "get rid of Notion style", "要有指引",
 *  then: running the command is the AI agent's job; 2026-11-20 redone in
 *  the release notes' narrow column). The guide is asking an AI assistant:
 *  send this line, send the data, get the type, as a numbered timeline.
 *  Then real questions people ask and the type each one gets. The
 *  commands, flags and a manual install stay below as tabs. */
export function AgentsGuide() {
  const lang = useAppLang();
  const c = agentGuide(lang);
  const [copied, setCopied] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("ex");
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    ex: null,
    flags: null,
    install: null,
  });

  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  const onCopy = async (id: string, text: string) => {
    const ok = await copyText(text);
    if (!ok) return;
    setCopied(id);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(null), 2000);
  };

  const copyProps = { copied, copyLabel: c.copy, copiedLabel: c.copied, onCopy };
  const tabName: Record<Tab, string> = { ex: c.secEx, flags: c.secFlags, install: c.install };
  const demoCmd = `oltc ${lang === "zh" ? "" : "--lang en "}${DEMO_ARGS}`;

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = TABS[(TABS.indexOf(tab) + step + TABS.length) % TABS.length];
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="page doc-page flex w-full min-w-0 flex-1 flex-col">
      <TopBar lang={lang} current="cli" />

      <main lang={lang} className="cli mx-auto w-full">
        <header className="cli-hero">
          <h1 className="cli-title">{c.title}</h1>
          <p className="cli-lead">{c.lead}</p>
        </header>

        <ol className="cli-steps">
          <GuideStep n={1} title={c.s1t} body={c.s1b}>
            <div className="cli-prompt">
              <p>{c.s1prompt}</p>
              <CopyBtn id="prompt" text={c.s1prompt} {...copyProps} />
            </div>
          </GuideStep>
          <GuideStep n={2} title={c.s2t} body={c.s2b}>
            <p className="cli-bubble">{c.s2q}</p>
          </GuideStep>
          <GuideStep n={3} title={c.s3t} body={c.s3b}>
            <div className="cli-reply">
              <TypeRow type="CV2III-350Y/72.5-10193W" tag={c.tagOltc} />
              <TypeRow type="WSLIV-600Y/72.5-6x5A" tag={c.tagOctc} />
              <p className="cli-reply-note">
                <CheckIcon className="h-4 w-4 shrink-0" aria-hidden />
                {c.s3note}
              </p>
            </div>
          </GuideStep>
        </ol>

        <section className="cli-sec" aria-labelledby="cli-cases-h">
          <h2 id="cli-cases-h" className="cli-sec-h">
            {c.more}
          </h2>
          <ul className="cli-cases">
            <Case label={c.exDry} q={c.qDry} type="3xCZI-500/40.5-9" />
            <Case label={c.exShzv} q={c.qShzv} type="3xSHZVI-2400/72.5B-12233W" />
            <Case label={t(lang, "kindAuto")} q={c.qAuto} type="3xCM2I-500/252D-10193W" />
            <Case label={t(lang, "dutyOctc")} q={c.qOctc} type="WSLII-800D/72.5-6x5A" />
          </ul>
        </section>

        <section className="cli-sec">
          <div className="cli-tabs" role="tablist" aria-label={c.moreT} onKeyDown={onTabKey}>
            {TABS.map((k) => (
              <button
                key={k}
                ref={(el) => {
                  tabRefs.current[k] = el;
                }}
                type="button"
                role="tab"
                id={`tab-${k}`}
                aria-selected={tab === k}
                aria-controls={`panel-${k}`}
                tabIndex={tab === k ? 0 : -1}
                className="cli-tab"
                onClick={() => setTab(k)}
              >
                {tabName[k]}
              </button>
            ))}
          </div>

          <div
            role="tabpanel"
            id={`panel-${tab}`}
            aria-labelledby={`tab-${tab}`}
            className="cli-panel"
          >
            {tab === "ex" ? (
              <ul className="cli-examples">
                {EXAMPLES.map((ex, i) => (
                  <li key={ex.cmd} className="cli-ex">
                    <p className="cli-row-k">{t(lang, ex.label)}</p>
                    <div className="cli-ex-body">
                      <Cmd id={`ex-${i}`} command={ex.cmd} {...copyProps} />
                      <p className="cli-out">
                        <ArrowLongRightIcon className="h-4 w-4 shrink-0" aria-hidden />
                        <code>{ex.type}</code>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}

            {tab === "flags" ? (
              <div className="cli-flags">
                {FLAG_GROUPS.map((g) => (
                  <FlagGroup key={g.title} title={t(lang, g.title)} flags={g.flags} lang={lang} />
                ))}
                <FlagGroup title={c.outT} flags={OUTPUT_FLAGS} lang={lang} />
              </div>
            ) : null}

            {tab === "install" ? (
              <div className="cli-manual">
                <Cmd id="install" command={INSTALL} {...copyProps} />
                <Cmd id="demo" command={demoCmd} {...copyProps} />
                <Terminal lang={lang} />
              </div>
            ) : null}
          </div>
        </section>

        <div className="cli-end">
          <p className="cli-limit">
            <ExclamationTriangleIcon className="h-4 w-4 shrink-0" aria-hidden />
            {c.limit}
          </p>
          <a className="cli-link" href={NPM_PAGE} target="_blank" rel="noreferrer">
            {c.npm}
            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      </main>

      <footer className="page-foot">
        <nav aria-label={t(lang, "title")}>
          <Link href="/">{t(lang, "title")}</Link>
          <Link href="/changelog/" className="foot-dup">
            {t(lang, "changelogTitle")}
          </Link>
          <Link href="/terms/">{t(lang, "navTerms")}</Link>
          <Link href="/privacy/">{t(lang, "navPrivacy")}</Link>
        </nav>
      </footer>
    </div>
  );
}

/** One step of the guide: a numbered dot on the line, the words, then
 *  what to send or what comes back. */
function GuideStep({
  n,
  title,
  body,
  children,
}: {
  n: number;
  title: string;
  body?: string;
  children: ReactNode;
}) {
  return (
    <li className="cli-step">
      <span className="cli-step-n" aria-hidden>
        {n}
      </span>
      <h2>{title}</h2>
      {body ? <p className="cli-step-b">{body}</p> : null}
      <div className="cli-step-show">{children}</div>
    </li>
  );
}

type CopyProps = {
  copied: string | null;
  copyLabel: string;
  copiedLabel: string;
  onCopy: (id: string, text: string) => void;
};

function Terminal({ lang }: { lang: Lang }) {
  const out = lang === "zh" ? "zh" : "en";
  return (
    <div className="cli-term">
      <div className="cli-term-bar" aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <pre className="cli-term-body">
        {DEMO[out].map(([kind, text], i) => (
          <span key={i} className={`term-line term-${kind}`}>
            {text || " "}
          </span>
        ))}
      </pre>
    </div>
  );
}

function TypeRow({ type, tag }: { type: string; tag: string }) {
  return (
    <p className="cli-type-row">
      <span className="cli-tag">{tag}</span>
      <code>{type}</code>
    </p>
  );
}

function Case({ label, q, type }: { label: string; q: string; type: string }) {
  return (
    <li className="cli-case">
      <p className="cli-row-k">{label}</p>
      <div className="cli-case-body">
        <p className="cli-q">{q}</p>
        <p className="cli-out">
          <ArrowLongRightIcon className="h-4 w-4 shrink-0" aria-hidden />
          <code>{type}</code>
        </p>
      </div>
    </li>
  );
}

function FlagGroup({ title, flags, lang }: { title: string; flags: Flag[]; lang: Lang }) {
  return (
    <div className="cli-flag-group">
      <h3>{title}</h3>
      <dl>
        {flags.map(([flag, label, values]) => (
          <div key={flag} className="cli-flag">
            <dt>
              <code>{flag}</code>
            </dt>
            {label ? <dd className="cli-flag-label">{t(lang, label).replace(/…$/, "")}</dd> : null}
            {values ? (
              <dd className="cli-flag-vals">
                {values.split(" | ").map((v, _i, all) =>
                  all.length === 1 && UNITS.has(v) ? (
                    <span key={v} className="cli-flag-unit">
                      {v}
                    </span>
                  ) : (
                    <code key={v}>{v}</code>
                  ),
                )}
              </dd>
            ) : null}
          </div>
        ))}
      </dl>
    </div>
  );
}

function CopyBtn({
  id,
  text,
  copied,
  copyLabel,
  copiedLabel,
  onCopy,
  small,
}: { id: string; text: string; small?: boolean } & CopyProps) {
  const is = copied === id;
  return (
    <button
      type="button"
      className={`cli-copy${is ? " is-copied" : ""}${small ? " is-small" : ""}`}
      onClick={() => onCopy(id, text)}
      aria-label={`${is ? copiedLabel : copyLabel}: ${text}`}
    >
      {is ? (
        <CheckIcon className="h-4 w-4" aria-hidden />
      ) : (
        <Square2StackIcon className="h-4 w-4" aria-hidden />
      )}
      <span aria-live="polite">{is ? copiedLabel : copyLabel}</span>
    </button>
  );
}

function Cmd({
  id,
  label,
  command,
  copied,
  copyLabel,
  copiedLabel,
  onCopy,
}: {
  id: string;
  label?: string;
  command: string;
} & CopyProps) {
  const is = copied === id;
  return (
    <button
      type="button"
      className={`cli-cmd${is ? " is-copied" : ""}`}
      onClick={() => onCopy(id, command)}
      aria-label={`${copyLabel}: ${command}`}
    >
      {label ? <span className="cli-cmd-k">{label}</span> : null}
      <span className="cli-cmd-line">
        <span className="cli-cmd-ps" aria-hidden>
          $
        </span>
        <code>
          {command.split(" ").map((w, i) => (
            <span key={i} className="cli-word">
              {i ? " " : ""}
              {w}
            </span>
          ))}
        </code>
        <span className="cli-cmd-hint" aria-live="polite">
          {is ? (
            <CheckIcon className="h-4 w-4" aria-hidden />
          ) : (
            <Square2StackIcon className="h-4 w-4" aria-hidden />
          )}
          <span className="sr-only sm:not-sr-only">{is ? copiedLabel : copyLabel}</span>
        </span>
      </span>
    </button>
  );
}
