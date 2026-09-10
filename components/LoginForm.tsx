"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { tryAdminLogin } from "@/lib/adminSession";
import { useAppLang } from "@/components/LangProvider";
import { t } from "@/lib/i18n";

/** Tailwind Plus · Application UI / Forms / Sign-in / Simple, recolored. */
const fieldClass =
  "block w-full rounded-md bg-white px-3 py-1.5 text-base text-[var(--color-ink)] outline-1 -outline-offset-1 outline-[var(--color-rule-2)] placeholder:text-[var(--color-muted)] focus:outline-2 focus:-outline-offset-2 focus:outline-[var(--color-accent)] sm:text-sm/6";

export function LoginForm() {
  const lang = useAppLang();
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
    <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h1 className="text-center text-2xl/9 font-bold tracking-tight text-[var(--color-ink)]">
          {t(lang, "adminTitle")}
        </h1>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="username"
              className="block text-sm/6 font-medium text-[var(--color-ink)]"
            >
              {t(lang, "adminUser")}
            </label>
            <div className="mt-2">
              <input
                id="username"
                className={fieldClass}
                type="text"
                name="username"
                autoComplete="username"
                required
                value={user}
                onChange={(e) => {
                  setUser(e.target.value);
                  setWrong(false);
                }}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm/6 font-medium text-[var(--color-ink)]"
            >
              {t(lang, "adminPassword")}
            </label>
            <div className="mt-2">
              <input
                id="password"
                className={fieldClass}
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setWrong(false);
                }}
              />
            </div>
          </div>

          {wrong ? (
            <p className="text-sm/6 text-[var(--color-err)]">
              {t(lang, "adminWrong")}
            </p>
          ) : null}

          <div>
            <button
              type="submit"
              disabled={busy || !user || !password}
              className="flex w-full justify-center rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-sm/6 font-semibold text-[var(--color-accent-ink)] shadow-xs hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:opacity-50"
            >
              {t(lang, "adminSubmit")}
            </button>
          </div>
        </form>

        <p className="mt-10 text-center text-sm/6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-accent)] hover:brightness-110"
          >
            <ArrowLeftIcon className="h-4 w-4" aria-hidden />
            {t(lang, "adminBack")}
          </Link>
        </p>
      </div>
    </div>
  );
}
