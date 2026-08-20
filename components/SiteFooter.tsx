"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getAppLang,
  getServerLang,
  subscribeAppLang,
  t,
} from "@/lib/i18n";

export function SiteFooter() {
  const pathname = usePathname();
  const lang = useSyncExternalStore(
    subscribeAppLang,
    getAppLang,
    getServerLang,
  );

  if (/\/(privacy|terms)\/?$/.test(pathname)) {
    return null;
  }

  return (
    <footer className="shrink-0 bg-[var(--color-paper)] pt-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom,0px))]">
      <div className="mx-auto flex w-full max-w-[1100px] flex-wrap items-baseline justify-between gap-x-6 gap-y-1.5 px-4 sm:px-6">
        <p className="text-[0.75rem] leading-none tracking-[0.02em] text-[var(--color-muted)]">
          {t(lang, "footerNote")}
        </p>
        <nav
          className="flex items-baseline gap-3 text-[0.75rem] leading-none tracking-[0.02em] text-[var(--color-muted)]"
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
