import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--color-rule)]">
      <div className="mx-auto flex w-full max-w-[1100px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3.5 sm:px-6">
        <p className="text-[0.75rem] text-[var(--color-muted)]">
          私人项目 · Private project · 仅供参考
        </p>
        <nav
          className="flex items-center gap-4 text-[0.75rem] text-[var(--color-muted)]"
          aria-label="Legal"
        >
          <Link
            href="/privacy/"
            className="transition-colors hover:text-[var(--color-ink)]"
          >
            Privacy
          </Link>
          <Link
            href="/terms/"
            className="transition-colors hover:text-[var(--color-ink)]"
          >
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
