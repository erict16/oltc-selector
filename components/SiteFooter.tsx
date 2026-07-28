import Link from "next/link";

const YEAR = new Date().getFullYear();

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--color-rule)] bg-[oklch(97.5%_0.005_250)]">
      <div className="mx-auto w-full max-w-[1100px] px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <div className="min-w-0 space-y-1.5">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.8125rem]">
              <Link
                href="/"
                className="font-semibold tracking-[-0.01em] text-[var(--color-ink)] transition-colors hover:text-[var(--color-accent)]"
              >
                OLTC Selector
              </Link>
              <span
                className="hidden text-[var(--color-rule-2)] sm:inline"
                aria-hidden
              >
                ·
              </span>
              <span className="text-[0.75rem] text-[var(--color-muted)]">
                有载开关选型
              </span>
            </p>
            <p className="max-w-md text-[0.72rem] leading-relaxed text-[var(--color-muted)]">
              Personal project · 私人项目 · Indicative only — confirm with
              engineering before any OS.
            </p>
          </div>

          <nav
            className="flex shrink-0 flex-wrap items-center gap-x-1 gap-y-1 text-[0.75rem]"
            aria-label="Legal"
          >
            <Link
              href="/privacy/"
              className="rounded-[var(--radius-sm)] px-2 py-1 text-[var(--color-ink-2)] transition-colors hover:bg-white hover:text-[var(--color-accent)]"
            >
              Privacy
              <span className="ml-1 text-[var(--color-muted)]">隐私</span>
            </Link>
            <span
              className="select-none text-[var(--color-rule-2)]"
              aria-hidden
            >
              |
            </span>
            <Link
              href="/terms/"
              className="rounded-[var(--radius-sm)] px-2 py-1 text-[var(--color-ink-2)] transition-colors hover:bg-white hover:text-[var(--color-accent)]"
            >
              Terms
              <span className="ml-1 text-[var(--color-muted)]">条款</span>
            </Link>
          </nav>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-[var(--color-rule)]/80 pt-3">
          <p className="font-mono text-[0.65rem] tracking-wide text-[var(--color-muted)]">
            © {YEAR}
          </p>
          <p className="text-[0.65rem] text-[var(--color-muted)]">
            Not an official manufacturer tool
          </p>
        </div>
      </div>
    </footer>
  );
}
