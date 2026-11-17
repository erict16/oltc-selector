"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BoltMark } from "@/components/BoltMark";
import { LangSwitcher } from "@/components/LangSwitcher";
import { APP_VERSION } from "@/lib/appVersion";
import { setAppLang, t, type Lang } from "@/lib/i18n";

/** The header of the selector and the CLI page: mark, name, version, the
 *  two other pages, the language menu. Away from `/` the name links home. */
export function TopBar({
  lang,
  current,
}: {
  lang: Lang;
  current: "home" | "cli";
}) {
  /** A hairline shadow once the page moves under it. */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const brand = (
    <>
      <BoltMark className="brand-mark" />
      {current === "home" ? (
        <h1 className="brand-name truncate">{t(lang, "title")}</h1>
      ) : (
        <span className="brand-name truncate">{t(lang, "title")}</span>
      )}
    </>
  );

  return (
    <header className="topbar sticky top-0 z-30" data-scrolled={scrolled || undefined}>
      <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center gap-3 px-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          {current === "home" ? (
            brand
          ) : (
            <Link href="/" className="brand-link flex min-w-0 items-center gap-2.5">
              {brand}
            </Link>
          )}
          <Link href="/changelog/" className="topbar-version num">
            v{APP_VERSION}
          </Link>
        </div>
        <nav className="topbar-nav ml-auto" aria-label={t(lang, "title")}>
          <Link href="/agents/" aria-current={current === "cli" ? "page" : undefined}>
            {t(lang, "agentChip")}
          </Link>
          <Link href="/changelog/">{t(lang, "changelogTitle")}</Link>
        </nav>
        <div className="topbar-lang">
          <LangSwitcher
            lang={lang}
            onChange={setAppLang}
            ariaLabel={t(lang, "langAria")}
            showLabel
          />
        </div>
      </div>
    </header>
  );
}
