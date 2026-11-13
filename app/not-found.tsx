"use client";

import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useAppLang } from "@/components/LangProvider";
import { t } from "@/lib/i18n";

export default function NotFound() {
  const lang = useAppLang();
  return (
    <div className="mx-auto flex w-full max-w-[30rem] flex-1 flex-col items-start justify-center gap-5 px-6 py-16">
      <h1 className="text-[1.375rem] font-semibold text-[var(--color-ink)]">
        {t(lang, "notFoundTitle")}
      </h1>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center gap-1.5 text-[0.875rem] font-medium text-[var(--color-accent)] hover:underline"
      >
        <ArrowLeftIcon className="h-4 w-4 shrink-0" aria-hidden />
        {t(lang, "backToSelector")}
      </Link>
    </div>
  );
}
