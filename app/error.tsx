"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useAppLang } from "@/components/LangProvider";
import { t } from "@/lib/i18n";

/** A crash in a page shows this, not a blank screen. */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const lang = useAppLang();
  return (
    <div className="mx-auto flex w-full max-w-[30rem] flex-1 flex-col items-start justify-center gap-5 px-6 py-16">
      <img
        src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/favicon.svg`}
        alt=""
        width={36}
        height={36}
        className="h-9 w-9"
      />
      <div role="alert">
        <h1 className="text-[1.375rem] font-semibold text-[var(--color-ink)]">
          {t(lang, "errorTitle")}
        </h1>
      </div>
      <button
        type="button"
        className="copy-btn"
        onClick={() => {
          // A fresh load clears whatever state broke the page.
          try {
            window.location.reload();
          } catch {
            reset();
          }
        }}
      >
        <ArrowPathIcon className="h-4 w-4" strokeWidth={1.7} aria-hidden />
        {t(lang, "reload")}
      </button>
    </div>
  );
}
