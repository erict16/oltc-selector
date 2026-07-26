import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--color-rule)]">
      <div className="mx-auto flex w-full max-w-[1100px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 sm:px-6">
        <p className="text-[0.6875rem] text-[var(--color-muted)]">
          Personal project · 私人项目 · reference only
        </p>
        <nav
          className="flex items-center gap-3 text-[0.6875rem] text-[var(--color-muted)]"
          aria-label="Legal"
        >
          <Link href="/privacy/" className="hover:text-[var(--color-ink-2)]">
            Privacy
          </Link>
          <Link href="/terms/" className="hover:text-[var(--color-ink-2)]">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
