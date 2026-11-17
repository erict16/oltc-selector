"use client";

import {
  ArrowLongRightIcon,
  ArrowTopRightOnSquareIcon,
  CheckIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  Square2StackIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
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
      ["--across-li", "acrossBil", "kV"],
      ["--across-ac", "acrossPf", "kV"],
    ],
  },
];
/** Shown as a unit, not as a value to type. */
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

const NODE_PAGE = "https://nodejs.org/";

/** The CLI page for an ordinary user (2026-11-17 Eric: "only teach how to
 *  install, and show an example of the output"). The AI assistant, the
 *  examples and the flags stay on the page, folded. */
export function AgentsGuide() {
  const lang = useAppLang();
  const c = agentGuide(lang);
  const [copied, setCopied] = useState<string | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  return (
    <div className="page cli-page flex w-full min-w-0 flex-1 flex-col">
      <TopBar lang={lang} current="cli" />

      <main lang={lang} className="cli mx-auto w-full max-w-[46rem] px-4 sm:px-6">
        <div className="cli-head">
          <h1 className="cli-title">{c.title}</h1>
          <p className="cli-lead">{c.lead}</p>
        </div>

        <ol className="cli-how">
          <li className="cli-how-step">
            <span className="cli-how-n" aria-hidden>
              1
            </span>
            <div className="cli-how-body">
              <h2>{c.install}</h2>
              <p>
                {c.needNode}{" "}
                <a className="cli-link" href={NODE_PAGE} target="_blank" rel="noreferrer">
                  {c.nodeLink}
                  <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden />
                </a>
              </p>
              <Cmd id="install" command={INSTALL} {...copyProps} />
            </div>
          </li>
          <li className="cli-how-step">
            <span className="cli-how-n" aria-hidden>
              2
            </span>
            <div className="cli-how-body">
              <h2>{c.runT}</h2>
              <Terminal lang={lang} {...copyProps} />
              <p>{c.readOut}</p>
            </div>
          </li>
        </ol>

        <section className="cli-more" aria-label={c.moreT}>
          <h2 className="cli-more-h">{c.moreT}</h2>

          <Fold title={c.secAi}>
            <ol className="cli-steps">
              <Step n={1} title={c.s1t} body={c.s1b}>
                <div className="cli-prompt">
                  <p>{c.s1prompt}</p>
                  <CopyBtn id="prompt" text={c.s1prompt} {...copyProps} />
                </div>
              </Step>
              <Step n={2} title={c.s2t} body={c.s2b}>
                <p className="cli-bubble">{c.s2q}</p>
              </Step>
              <Step n={3} title={c.s3t} body={c.s3b}>
                <div className="cli-answer">
                  <TypeChip type="CV2III-350Y/72.5-10193W" tag={c.tagOltc} />
                  <TypeChip type="WSLIV-600Y/72.5-6x5A" tag={c.tagOctc} />
                  <p className="cli-answer-note">
                    <CheckIcon className="h-4 w-4 shrink-0" aria-hidden />
                    {c.s3note}
                  </p>
                </div>
              </Step>
            </ol>
            <h3 className="cli-h3">{c.more}</h3>
            <div className="cli-more-cases">
              <Case label={c.exDry} q={c.qDry} type="3xCZI-500/40.5-9" tag={c.tagDry} />
              <Case label={c.exShzv} q={c.qShzv} type="3xSHZVI-2400/72.5B-12233W" />
            </div>
          </Fold>

          <Fold title={c.secEx}>
            <div className="cli-examples">
              {EXAMPLES.map((ex, i) => (
                <div key={ex.cmd} className="cli-ex">
                  <p className="cli-ex-k">{t(lang, ex.label)}</p>
                  <Cmd id={`ex-${i}`} command={ex.cmd} dark {...copyProps} />
                  <p className="cli-ex-out">
                    <ArrowLongRightIcon className="h-4 w-4 shrink-0" aria-hidden />
                    <code>{ex.type}</code>
                  </p>
                </div>
              ))}
            </div>
          </Fold>

          <Fold title={c.secFlags}>
            <div className="cli-flags">
              {FLAG_GROUPS.map((g) => (
                <FlagCard key={g.title} title={t(lang, g.title)} flags={g.flags} lang={lang} />
              ))}
              <FlagCard title={c.outT} flags={OUTPUT_FLAGS} lang={lang} />
            </div>
          </Fold>

          <p className="cli-npm">
            <a className="cli-link" href={NPM_PAGE} target="_blank" rel="noreferrer">
              {c.npm}
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden />
            </a>
          </p>
        </section>

        <p className="cli-limit">
          <ExclamationTriangleIcon className="mt-px h-4 w-4 shrink-0" aria-hidden />
          {c.limit}
        </p>
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

/** A folded section, like a Notion toggle. */
function Fold({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="cli-fold">
      <summary>
        <ChevronRightIcon className="cli-fold-chev h-4 w-4 shrink-0" aria-hidden />
        {title}
      </summary>
      <div className="cli-fold-body">{children}</div>
    </details>
  );
}

type CopyProps = {
  copied: string | null;
  copyLabel: string;
  copiedLabel: string;
  onCopy: (id: string, text: string) => void;
};

function Terminal({ lang, ...copy }: { lang: Lang } & CopyProps) {
  const out = lang === "zh" ? "zh" : "en";
  const cmd = `oltc ${out === "en" ? "--lang en " : ""}${DEMO_ARGS}`;
  return (
    <div className="cli-term">
      <div className="cli-term-bar">
        <span className="cli-term-name">oltc</span>
        <CopyBtn id="demo" text={cmd} small {...copy} />
      </div>
      <pre className="cli-term-body">
        <span className="term-line term-cmd" style={{ "--i": 0 } as CSSProperties}>
          <span className="term-ps" aria-hidden>
            ${" "}
          </span>
          {cmd}
        </span>
        {DEMO[out].map(([kind, text], i) => (
          <span
            key={i}
            className={`term-line term-${kind}`}
            style={{ "--i": i + 2 } as CSSProperties}
          >
            {text || " "}
          </span>
        ))}
      </pre>
    </div>
  );
}

function Step({
  n,
  title,
  body,
  children,
}: {
  n: number;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <li className="cli-step">
      <div className="cli-step-text">
        <span className="cli-step-n" aria-hidden>
          {n}
        </span>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
      <div className="cli-step-show">{children}</div>
    </li>
  );
}

function TypeChip({ type, tag }: { type: string; tag?: string }) {
  return (
    <code className="cli-type">
      {type}
      {tag ? <span className="cli-type-tag">{tag}</span> : null}
    </code>
  );
}

function Case({ label, q, type, tag }: { label: string; q: string; type: string; tag?: string }) {
  return (
    <div className="cli-case">
      <p className="cli-ex-k">{label}</p>
      <p className="cli-bubble">{q}</p>
      <p className="cli-ex-out">
        <ArrowLongRightIcon className="h-4 w-4 shrink-0" aria-hidden />
        <TypeChip type={type} tag={tag} />
      </p>
    </div>
  );
}

function FlagCard({ title, flags, lang }: { title: string; flags: Flag[]; lang: Lang }) {
  return (
    <div className="cli-flag-card">
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
                {values.split(" | ").map((v) =>
                  UNITS.has(v) ? (
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
  dark,
  copied,
  copyLabel,
  copiedLabel,
  onCopy,
}: {
  id: string;
  label?: string;
  command: string;
  dark?: boolean;
} & CopyProps) {
  const is = copied === id;
  return (
    <button
      type="button"
      className={`cli-cmd${dark ? " is-dark" : ""}${is ? " is-copied" : ""}`}
      onClick={() => onCopy(id, command)}
      aria-label={`${copyLabel}: ${command}`}
    >
      {label ? <span className="cli-cmd-k">{label}</span> : null}
      <span className="cli-cmd-line">
        <span className="cli-cmd-ps" aria-hidden>
          $
        </span>
        <code>{command}</code>
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
