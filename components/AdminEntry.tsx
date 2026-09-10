"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { UserIcon } from "@heroicons/react/24/outline";
import {
  adminLogout,
  getAdminSnapshot,
  getServerAdmin,
  subscribeAdmin,
} from "@/lib/adminSession";
import {
  getAppLang,
  getServerLang,
  subscribeAppLang,
  t,
} from "@/lib/i18n";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function AdminEntry() {
  const pathname = usePathname();
  const lang = useSyncExternalStore(
    subscribeAppLang,
    getAppLang,
    getServerLang,
  );
  const admin = useSyncExternalStore(
    subscribeAdmin,
    getAdminSnapshot,
    getServerAdmin,
  );
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname, admin]);

  if (/\/login\/?$/.test(pathname)) return null;

  const face =
    "inline-flex h-8 w-8 items-center justify-center rounded-full border text-[0.6875rem] font-semibold leading-none transition-[transform,border-color,background-color,color] duration-150 active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]";

  return (
    <div
      ref={wrapRef}
      className="fixed top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] z-50"
    >
      {admin ? (
        <>
          <button
            type="button"
            className={cx(
              face,
              "relative border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]",
            )}
            aria-label={t(lang, "adminLoggedIn")}
            aria-expanded={open}
            aria-haspopup="menu"
            aria-controls={menuId}
            onClick={() => setOpen((v) => !v)}
          >
            ET
            <span
              className="absolute right-0 bottom-0 h-2 w-2 rounded-full border-2 border-[var(--color-paper)] bg-[oklch(62%_0.16_155)]"
              aria-hidden
            />
          </button>
          {open ? (
            <div
              id={menuId}
              role="menu"
              className="absolute right-0 mt-1.5 w-40 rounded-[var(--radius-md)] border border-[var(--color-rule)] bg-white p-1.5 shadow-[0_8px_24px_oklch(24%_0.02_258_/_0.12)]"
            >
              <p className="px-2.5 pt-1.5 pb-1 text-[0.75rem] font-medium text-[var(--color-ink)]">
                {t(lang, "adminLoggedIn")}
              </p>
              <button
                type="button"
                role="menuitem"
                className="flex w-full rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-[0.8125rem] text-[var(--color-ink-2)] transition-colors hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)] active:scale-[0.98]"
                onClick={() => {
                  setOpen(false);
                  adminLogout();
                }}
              >
                {t(lang, "adminLogout")}
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <Link
          href="/login/"
          className={cx(
            face,
            "border-[var(--color-rule-2)] bg-white text-[var(--color-ink-2)] hover:border-[var(--color-accent)] hover:text-[var(--color-ink)]",
          )}
          aria-label={t(lang, "adminTitle")}
          title={t(lang, "adminTitle")}
        >
          <UserIcon className="h-[1.125rem] w-[1.125rem]" aria-hidden />
        </Link>
      )}
    </div>
  );
}
