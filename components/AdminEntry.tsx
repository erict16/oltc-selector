"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  adminLogout,
  getAdminSnapshot,
  getServerAdmin,
  subscribeAdmin,
} from "@/lib/adminSession";
import { t, type Lang } from "@/lib/i18n";

export function AdminEntry({ lang }: { lang: Lang }) {
  const admin = useSyncExternalStore(
    subscribeAdmin,
    getAdminSnapshot,
    getServerAdmin,
  );

  if (admin) {
    return (
      <button
        type="button"
        onClick={() => adminLogout()}
        className="shrink-0 text-[0.75rem] leading-none tracking-[0.02em] text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]"
      >
        {t(lang, "adminLogout")}
      </button>
    );
  }

  return (
    <Link
      href="/login/"
      className="shrink-0 text-[0.75rem] leading-none tracking-[0.02em] text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]"
    >
      {t(lang, "adminInternal")}
    </Link>
  );
}
