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

  const btn =
    "shrink-0 inline-flex h-8 items-center rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] px-2.5 text-[0.75rem] leading-none tracking-[0.02em] text-[var(--color-ink-2)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-ink)]";

  if (admin) {
    return (
      <button type="button" onClick={() => adminLogout()} className={btn}>
        {t(lang, "adminLogout")}
      </button>
    );
  }

  return (
    <Link href="/login/" className={btn}>
      {t(lang, "adminInternal")}
    </Link>
  );
}
