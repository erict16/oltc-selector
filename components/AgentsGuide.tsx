"use client";

import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { LangSwitcher } from "@/components/LangSwitcher";
import { useAppLang } from "@/components/LangProvider";
import { agentGuide } from "@/lib/i18nAgents";
import { setAppLang } from "@/lib/i18n";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function AgentsGuide() {
  const lang = useAppLang();
  const c = agentGuide(lang);
  const cmdInstall = "npm i -g oltc-selector";
  const cmdRun = "oltc --iu 350 --um 40.5 --conn D --reg W --pm 8";

  return (
    <div className="mx-auto w-full max-w-[680px] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-[var(--color-accent)] hover:underline"
        >
          <ArrowLeftIcon className="h-4 w-4 shrink-0" aria-hidden />
          {c.back}
        </Link>
        <LangSwitcher lang={lang} onChange={setAppLang} ariaLabel="Language" />
      </div>
      <h1 className="font-[family-name:var(--font-display)] text-[1.65rem] font-semibold tracking-[-0.03em] text-[var(--color-ink)]">
        {c.title}
      </h1>
      <p className="mt-2 max-w-[36rem] text-[0.95rem] leading-relaxed text-[var(--color-ink-2)]">
        {c.lead}
      </p>

      <section className="mt-8 space-y-2">
        <h2 className="text-[0.95rem] font-semibold text-[var(--color-ink)]">
          1. {c.s1t}
        </h2>
        <p className="text-[0.9rem] leading-[1.7] text-[var(--color-ink-2)]">
          {c.s1}
        </p>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-[0.95rem] font-semibold text-[var(--color-ink)]">
          2. {c.s2t}
        </h2>
        <p className="text-[0.9rem] leading-[1.7] text-[var(--color-ink-2)]">
          {c.s2}
        </p>
        <pre className="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-white p-3 font-[family-name:var(--font-mono)] text-[0.8125rem]">
          {cmdInstall}
        </pre>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-[0.95rem] font-semibold text-[var(--color-ink)]">
          3. {c.s3t}
        </h2>
        <p className="text-[0.9rem] leading-[1.7] text-[var(--color-ink-2)]">
          {c.s3}
        </p>
        <pre className="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-white p-3 font-[family-name:var(--font-mono)] text-[0.8125rem]">
          {cmdRun}
        </pre>
        <p className="text-[0.9rem] leading-[1.7] text-[var(--color-ink-2)]">
          {c.s3note}
        </p>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-[0.95rem] font-semibold text-[var(--color-ink)]">
          4. {c.s4t}
        </h2>
        <pre className="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--color-rule)] bg-white p-3 font-[family-name:var(--font-mono)] text-[0.8125rem] whitespace-pre-wrap">
          {c.s4}
        </pre>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-[0.95rem] font-semibold text-[var(--color-ink)]">
          5. {c.s5t}
        </h2>
        <p className="text-[0.9rem] leading-[1.7] text-[var(--color-ink-2)]">
          {c.s5}{" "}
          <a
            className="font-medium text-[var(--color-accent)] hover:underline"
            href={`${BASE}/skills/oltc-selector.zip`}
          >
            {c.s5dl}
          </a>
        </p>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-[0.95rem] font-semibold text-[var(--color-ink)]">
          6. {c.s6t}
        </h2>
        <p className="text-[0.9rem] leading-[1.7] text-[var(--color-ink-2)]">
          {c.s6}
        </p>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-[0.95rem] font-semibold text-[var(--color-ink)]">
          7. {c.s7t}
        </h2>
        <p className="text-[0.9rem] leading-[1.7] text-[var(--color-ink-2)]">
          {c.s7}
        </p>
      </section>
    </div>
  );
}
