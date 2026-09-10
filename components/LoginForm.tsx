"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { tryAdminLogin } from "@/lib/adminSession";
import {
  getAppLang,
  getServerLang,
  subscribeAppLang,
  t,
} from "@/lib/i18n";
import { useSyncExternalStore } from "react";

const fieldClass =
  "w-full min-w-0 rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] bg-white px-3 py-2 text-[0.9rem] leading-snug text-[var(--color-ink)] transition-colors duration-150 hover:border-[var(--color-accent)] focus:border-[var(--color-accent)] focus:outline-none";

export function LoginForm() {
  const lang = useSyncExternalStore(
    subscribeAppLang,
    getAppLang,
    getServerLang,
  );
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [wrong, setWrong] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setWrong(false);
    const ok = await tryAdminLogin(password);
    setBusy(false);
    if (!ok) {
      setWrong(true);
      return;
    }
    router.push("/");
  };

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col px-4 pt-16 pb-8 sm:px-6">
      <form
        onSubmit={onSubmit}
        className="mx-auto w-full max-w-[22rem] rounded-[var(--radius-md)] border border-[var(--color-rule)] bg-white p-6 shadow-[0_1px_2px_oklch(24%_0.02_258_/_0.04)]"
      >
        <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--color-ink)]">
          {t(lang, "adminTitle")}
        </h1>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-[var(--color-ink-2)]">
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
          disabled={busy || !password}
          className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-4 text-[0.875rem] font-medium text-[var(--color-accent-ink)] disabled:opacity-50"
        >
          {t(lang, "adminSubmit")}
        </button>
        <p className="mt-4 text-center">
          <Link
            href="/"
            className="text-[0.8125rem] text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
          >
            {t(lang, "adminBack")}
          </Link>
        </p>
      </form>
    </div>
  );
}
