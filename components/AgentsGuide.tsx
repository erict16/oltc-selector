"use client";

import {
  ArrowLeftIcon,
  CheckIcon,
  Square2StackIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LangSwitcher } from "@/components/LangSwitcher";
import { useAppLang } from "@/components/LangProvider";
import { copyText } from "@/lib/clipboard";
import { setAppLang } from "@/lib/i18n";
import { agentGuide } from "@/lib/i18nAgents";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const ZIP = "https://github.com/erict16/huaming-oltc-selector/archive/refs/heads/main.zip";
const INSTALL = "npx -y oltc-selector@1.2.9";
const RUN = "npx -y oltc-selector@1.2.9 --iu 350 --um 40.5 --conn D --reg W --pm 8";
const WB_PAGE = "https://skillhub.cn/@indiv-erict16/huaming-oltc-selector";
const TYPE_OLTC = "CV2III-350Y/72.5-10193W";
const TYPE_OCTC = "WSLIV-600Y/72.5-6x5A";
const TYPE_DRY = "3xCZI-500/40.5-9";
const TYPE_SHZV = "3xSHZVI-2400/72.5B-12233W";

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

  const promptBox = (
    <div className="guide-prompt">
      <p className="guide-prompt-text">{c.s1prompt}</p>
      <CopyBtn
        id="install-prompt"
        text={c.s1prompt}
        copied={copied}
        copyLabel={c.copy}
        copiedLabel={c.copied}
        onCopy={onCopy}
      />
    </div>
  );

  return (
    <article
      lang={lang}
      className="guide mx-auto w-full max-w-[50rem] px-4 pt-10 pb-16 sm:px-6 sm:pt-14 sm:pb-20"
    >
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="guide-back">
          <ArrowLeftIcon className="h-4 w-4 shrink-0" aria-hidden />
          {c.back}
        </Link>
        <LangSwitcher lang={lang} onChange={setAppLang} ariaLabel="Language" />
      </div>

      <h1 className="guide-title font-[family-name:var(--font-display)] text-[2.05rem] font-semibold leading-[1.18] text-[var(--color-ink)] sm:text-[2.35rem]">
        {c.title}
      </h1>
      <p className="guide-lead mt-3 text-[1.02rem] leading-[1.7] text-[var(--color-ink-2)]">
        {c.lead}
      </p>

      <ol className="guide-steps">
        <li className="guide-step">
          <span className="guide-rail" aria-hidden>
            <span className="guide-n">1</span>
            <span className="guide-rail-line" />
          </span>
          <div className="guide-step-body">
            <h2>{c.s1t}</h2>
            {c.s1wb ? (
              <div className="guide-way">
                <p className="guide-way-k">{c.s1wb}</p>
                <p>{c.s1b}</p>
                {c.s1wbBody ? <p>{c.s1wbBody}</p> : null}
                {c.wbShot ? (
                  <figure className="guide-shot">
                    <img
                      src={`${BASE}/agents/workbuddy-skillhub.jpg`}
                      alt={c.wbShotAlt ?? c.wbShot}
                      width={1936}
                      height={1243}
                    />
                  </figure>
                ) : null}
              </div>
            ) : (
              <p>{c.s1b}</p>
            )}
            {c.s1other ? (
              <div className="guide-way">
                <p>{c.s1other}</p>
                {c.s1otherBody ? <p>{c.s1otherBody}</p> : null}
                {promptBox}
              </div>
            ) : (
              promptBox
            )}
            <p className="guide-alt">
              {c.s1alt}{" "}
              <a href={ZIP} download="huaming-oltc-selector.zip">
                {c.dl}
              </a>{" "}
              ·{" "}
              <a href={WB_PAGE} target="_blank" rel="noreferrer">
                {c.hub}
              </a>
            </p>
          </div>
        </li>

        <li className="guide-step">
          <span className="guide-rail" aria-hidden>
            <span className="guide-n">2</span>
            <span className="guide-rail-line" />
          </span>
          <div className="guide-step-body">
            <h2>{c.s2t}</h2>
            <p>{c.s2b}</p>
            <div className="guide-mini">
              <p className="guide-q">{c.s2q}</p>
            </div>
          </div>
        </li>

        <li className="guide-step">
          <span className="guide-rail" aria-hidden>
            <span className="guide-n">3</span>
            <span className="guide-rail-line" />
          </span>
          <div className="guide-step-body">
            <h2>{c.s3t}</h2>
            <p>{c.s3b}</p>
            <div className="guide-mini">
              <code className="guide-type">
                {TYPE_OLTC}
                <span className="guide-tag">{c.tagOltc}</span>
              </code>{" "}
              <code className="guide-type">
                {TYPE_OCTC}
                <span className="guide-tag">{c.tagOctc}</span>
              </code>
              <p className="guide-note">{c.s3note}</p>
            </div>
          </div>
        </li>
      </ol>

      <details className="guide-cli">
        <summary>{c.cli}</summary>
        <div className="guide-cli-wrap">
          <p className="guide-cli-body">{c.cliBody}</p>
          <div className="guide-term">
            <Cmd
              id="install"
              label={c.install}
              command={INSTALL}
              copied={copied}
              copyLabel={c.copy}
              copiedLabel={c.copied}
              onCopy={onCopy}
            />
            <Cmd
              id="run"
              label={c.run}
              command={RUN}
              copied={copied}
              copyLabel={c.copy}
              copiedLabel={c.copied}
              onCopy={onCopy}
            />
          </div>
        </div>
      </details>

      <details className="guide-cli">
        <summary>{c.more}</summary>
        <div className="guide-cli-wrap">
          <p className="guide-cli-body">{c.moreLead}</p>
          <div className="guide-mini">
            <p className="guide-ex">{c.exDry}</p>
            <p className="guide-q">{c.qDry}</p>
            <div className="guide-a">
              <code className="guide-type">
                {TYPE_DRY}
                <span className="guide-tag">{c.tagDry}</span>
              </code>
            </div>
          </div>
          <div className="guide-mini">
            <p className="guide-ex">{c.exShzv}</p>
            <p className="guide-q">{c.qShzv}</p>
            <div className="guide-a">
              <code className="guide-type">{TYPE_SHZV}</code>
            </div>
          </div>
        </div>
      </details>

      <p className="guide-limit">{c.limit}</p>
    </article>
  );
}

function CopyBtn({
  id,
  text,
  copied,
  copyLabel,
  copiedLabel,
  onCopy,
}: {
  id: string;
  text: string;
  copied: string | null;
  copyLabel: string;
  copiedLabel: string;
  onCopy: (id: string, text: string) => void;
}) {
  const is = copied === id;
  return (
    <button
      type="button"
      className={`guide-copy${is ? " is-copied" : ""}`}
      onClick={() => onCopy(id, text)}
      aria-label={`${is ? copiedLabel : copyLabel}: ${text}`}
    >
      <span className="guide-copy-track" aria-live="polite">
        <span className="guide-copy-idle">
          <Square2StackIcon className="guide-copy-ico" aria-hidden />
          <span>{copyLabel}</span>
        </span>
        <span className="guide-copy-done">
          <CheckIcon className="guide-copy-ico" aria-hidden />
          <span>{copiedLabel}</span>
        </span>
      </span>
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
  bare,
}: {
  id: string;
  label: string;
  command: string;
  copied: string | null;
  copyLabel: string;
  copiedLabel: string;
  onCopy: (id: string, text: string) => void;
  bare?: boolean;
}) {
  const is = copied === id;
  return (
    <button
      type="button"
      className={`guide-cmd${is ? " is-copied" : ""}${bare ? " guide-cmd-bare" : ""}`}
      onClick={() => onCopy(id, command)}
      aria-label={`${copyLabel}: ${command}`}
    >
      <span className="guide-cmd-meta">
        <span className="guide-cmd-k">{label}</span>
        <span className="guide-cmd-hint" aria-live="polite">
          <Square2StackIcon className="h-3.5 w-3.5" aria-hidden />
          {is ? copiedLabel : copyLabel}
        </span>
      </span>
      <span className="guide-cmd-line">
        {bare ? null : (
          <span className="guide-cmd-prompt" aria-hidden>
            $
          </span>
        )}
        <code>{command}</code>
      </span>
    </button>
  );
}
