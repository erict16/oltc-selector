import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-[var(--color-rule)] bg-[var(--color-soft)]/60">
      <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6">
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
          <div className="min-w-0 space-y-1">
            <p className="text-[0.8125rem] font-medium text-[var(--color-ink-2)]">
              OLTC Selector · 有载开关选型
            </p>
            <p className="max-w-[36rem] text-[0.75rem] leading-relaxed text-[var(--color-muted)]">
              Personal private project. Indicative type helper only — not an
              official manufacturer tool, quotation, or OS.
            </p>
            <p className="max-w-[36rem] text-[0.75rem] leading-relaxed text-[var(--color-muted)]">
              个人私人项目。示意选型工具，非正式制造商工具、报价或 OS。
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-2 sm:items-end">
            <nav
              className="flex items-center gap-3 text-[0.8125rem] text-[var(--color-ink-2)]"
              aria-label="Legal"
            >
              <Link
                href="/privacy/"
                className="transition-colors hover:text-[var(--color-accent)]"
              >
                Privacy
              </Link>
              <span className="text-[var(--color-rule-2)]" aria-hidden>
                ·
              </span>
              <Link
                href="/terms/"
                className="transition-colors hover:text-[var(--color-accent)]"
              >
                Terms
              </Link>
            </nav>
            <p className="text-[0.6875rem] text-[var(--color-muted)]">
              © {year}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
