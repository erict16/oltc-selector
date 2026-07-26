import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-[var(--color-rule)] bg-white/80">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="max-w-[42rem] text-[0.75rem] leading-relaxed text-[var(--color-muted)]">
          Personal private project · 个人私人项目. Indicative OLTC type helper
          only — not an official manufacturer tool, not a quotation or OS.{" "}
          <span className="text-[var(--color-ink-2)]">
            © {year} Project author. All rights reserved.
          </span>
        </p>
        <nav
          className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 text-[0.75rem] font-medium text-[var(--color-ink-2)]"
          aria-label="Legal"
        >
          <Link
            href="/privacy/"
            className="hover:text-[var(--color-accent)] hover:underline"
          >
            Privacy
          </Link>
          <Link
            href="/terms/"
            className="hover:text-[var(--color-accent)] hover:underline"
          >
            Terms
          </Link>
          <a
            href="https://github.com/erict16/oltc-selector"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--color-accent)] hover:underline"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
