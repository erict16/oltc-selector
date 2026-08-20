import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({
  title,
  titleZh,
  children,
}: {
  title: string;
  titleZh: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[880px] px-4 py-10 sm:px-6 sm:py-14">
      <p className="mb-4 text-[0.8125rem]">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-medium text-[var(--color-accent)] hover:underline"
        >
          <ArrowLeftIcon className="h-4 w-4 shrink-0" aria-hidden />
          OLTC Selector
        </Link>
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-[1.65rem] font-semibold tracking-[-0.03em] text-[var(--color-ink)]">
        {title}
      </h1>
      <p className="mt-1 text-[0.9rem] text-[var(--color-muted)]">{titleZh}</p>
      <div className="prose-legal mt-8 space-y-8 text-[var(--color-ink-2)]">
        {children}
      </div>
    </div>
  );
}

export function LegalPair({
  title,
  en,
  zh,
}: {
  title: string;
  en: ReactNode;
  zh: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-[0.95rem] font-semibold text-[var(--color-ink)]">
        {title}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-x-10">
        <div lang="en" className="space-y-2 text-[0.9rem] leading-[1.7]">
          {en}
        </div>
        <div
          lang="zh"
          className="space-y-2 text-[0.9rem] leading-[1.75] sm:border-l sm:border-[var(--color-rule)] sm:pl-10"
        >
          {zh}
        </div>
      </div>
    </section>
  );
}
