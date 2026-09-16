"use client";

import { ArrowDownTrayIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LangSwitcher } from "@/components/LangSwitcher";
import { useAppLang } from "@/components/LangProvider";
import { copyText } from "@/lib/clipboard";
import { setAppLang } from "@/lib/i18n";
import { agentGuide } from "@/lib/i18nAgents";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const INSTALL = "npm i -g oltc-selector";
const RUN = "oltc --iu 350 --um 40.5 --conn D --reg W --pm 8";
const TYPE_EX1 = "CV2III-350Y/72.5-10193W";
const TYPE_EX2_OLTC = "CV2III-350Y/72.5-10193W";
const TYPE_EX2_OCTC = "WSLIV-600Y/72.5-6x5A";

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

  return (
    <article
      lang={lang}
      className="guide mx-auto w-full max-w-[38rem] px-4 pt-10 pb-16 sm:px-6 sm:pt-14 sm:pb-20"
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

      <a
        href={`${BASE}/skills/oltc-selector.zip`}
        download="oltc-selector.zip"
        className="guide-dl"
      >
        <ArrowDownTrayIcon className="h-5 w-5 shrink-0" aria-hidden />
        {c.dl}
      </a>
      <p className="guide-how">{c.how}</p>

      <section className="guide-more">
        <h2 className="guide-k">{c.say}</h2>
        <div className="guide-chat">
          <p className="guide-ex">{c.ex1}</p>
          <p className="guide-q">{c.sayBody}</p>
          <p className="guide-steps">{c.how1}</p>
          <div className="guide-a">
            <span className="guide-a-label">{c.result}</span>
            <code className="guide-type">{TYPE_EX1}</code>
          </div>
        </div>
        <div className="guide-chat">
          <p className="guide-ex">{c.ex2}</p>
          <p className="guide-q">{c.sayBody2}</p>
          <p className="guide-steps">{c.how2}</p>
          <div className="guide-a">
            <span className="guide-a-label">{c.result}</span>
            <code className="guide-type">
              {TYPE_EX2_OLTC}
              <span className="guide-tag">{c.tagOltc}</span>
            </code>
            <code className="guide-type">
              {TYPE_EX2_OCTC}
              <span className="guide-tag">{c.tagOctc}</span>
            </code>
          </div>
        </div>
        <h2 className="guide-k">{c.cli}</h2>
        <p className="guide-more-body">{c.cliBody}</p>
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
      </section>

      <p className="guide-limit">{c.limit}</p>
    </article>
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
  label: string;
  command: string;
  copied: string | null;
  copyLabel: string;
  copiedLabel: string;
  onCopy: (id: string, text: string) => void;
}) {
  const is = copied === id;
  return (
    <button
      type="button"
      className={`guide-cmd${is ? " is-copied" : ""}`}
      onClick={() => onCopy(id, command)}
      aria-label={`${copyLabel}: ${command}`}
    >
      <span className="guide-cmd-meta">
        <span className="guide-cmd-k">{label}</span>
        <span className="guide-cmd-hint" aria-live="polite">
          {is ? copiedLabel : copyLabel}
        </span>
      </span>
      <span className="guide-cmd-line">
        <span className="guide-cmd-prompt" aria-hidden>
          $
        </span>
        <code>{command}</code>
      </span>
    </button>
  );
}
