import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--color-rule)]">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-2 px-4 py-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6 sm:px-6">
        <p className="text-[0.75rem] leading-snug text-[var(--color-muted)]">
          Private project · Reference only
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
