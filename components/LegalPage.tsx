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
    <div className="mx-auto w-full max-w-[720px] px-4 py-10 sm:px-6 sm:py-14">
      <p className="mb-4 text-[0.8125rem]">
        <Link
          href="/"
          className="font-medium text-[var(--color-accent)] hover:underline"
        >
          ← OLTC Selector
        </Link>
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-[1.65rem] font-semibold tracking-[-0.03em] text-[var(--color-ink)]">
        {title}
      </h1>
      <p className="mt-1 text-[0.9rem] text-[var(--color-muted)]">{titleZh}</p>
      <div className="prose-legal mt-8 space-y-5 text-[0.9rem] leading-relaxed text-[var(--color-ink-2)]">
        {children}
      </div>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-[0.95rem] font-semibold text-[var(--color-ink)]">
        {title}
      </h2>
      <div className="space-y-2 text-[var(--color-ink-2)]">{children}</div>
    </section>
  );
}
