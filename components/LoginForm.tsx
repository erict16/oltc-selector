"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { tryAdminLogin } from "@/lib/adminSession";
import {
  getAppLang,
  getServerLang,
  subscribeAppLang,
  t,
} from "@/lib/i18n";
import { useSyncExternalStore } from "react";

const fieldClass =
  "mt-1.5 block w-full min-w-0 rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] bg-white px-3 py-2 text-[0.9rem] leading-snug text-[var(--color-ink)] transition-colors duration-150 hover:border-[var(--color-accent)] focus:border-[var(--color-accent)] focus:outline-none";

export function LoginForm() {
  const lang = useSyncExternalStore(
    subscribeAppLang,
    getAppLang,
    getServerLang,
  );
  const router = useRouter();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [wrong, setWrong] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setWrong(false);
    const ok = await tryAdminLogin(user, password);
    setBusy(false);
    if (!ok) {
      setWrong(true);
      return;
    }
    router.push("/");
  };

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
      <Link
        href="/"
        aria-label={t(lang, "adminBack")}
        className="absolute top-[max(0.75rem,env(safe-area-inset-top))] left-[max(0.75rem,env(safe-area-inset-left))] inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-ink-2)] transition-[transform,color] duration-150 hover:text-[var(--color-ink)] active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
      >
        <ArrowLeftIcon className="h-5 w-5" aria-hidden />
      </Link>
      <form onSubmit={onSubmit} className="w-full max-w-[22rem]">
        <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
          {t(lang, "adminTitle")}
        </h1>
        <label className="mt-6 block">
          <span className="text-[0.8125rem] font-medium text-[var(--color-ink-2)]">
            {t(lang, "adminUser")}
          </span>
          <input
            className={fieldClass}
            type="text"
            name="username"
            autoComplete="username"
            value={user}
            onChange={(e) => {
              setUser(e.target.value);
              setWrong(false);
            }}
          />
        </label>
        <label className="mt-4 block">
          <span className="text-[0.8125rem] font-medium text-[var(--color-ink-2)]">
            {t(lang, "adminPassword")}
          </span>
          <input
            className={fieldClass}
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setWrong(false);
            }}
          />
        </label>
        {wrong ? (
          <p className="mt-2 text-[0.8125rem] text-[var(--color-err)]">
            {t(lang, "adminWrong")}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy || !user || !password}
          className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-4 text-[0.875rem] font-medium text-[var(--color-accent-ink)] transition-transform duration-150 active:scale-[0.98] disabled:opacity-50"
        >
          {t(lang, "adminSubmit")}
        </button>
      </form>
    </div>
  );
}
