"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import {
  getAppLang,
  subscribeAppLang,
  t,
  type Lang,
} from "@/lib/i18n";

const ServerLang = createContext<Lang>("zh");

/** BCP 47 tag for <html lang> and lang attributes. */
export function htmlLang(lang: Lang): string {
  return lang === "zh" ? "zh-CN" : lang;
}

export function LangProvider({
  initial,
  children,
}: {
  initial: Lang;
  children: ReactNode;
}) {
  return (
    <ServerLang.Provider value={initial}>
      <HtmlLang />
      {children}
    </ServerLang.Provider>
  );
}

/** Every page: <html lang> follows the chosen language. */
function HtmlLang() {
  const lang = useAppLang();
  useEffect(() => {
    document.documentElement.lang = htmlLang(lang);
  }, [lang]);
  return null;
}

export function SkipLink() {
  const lang = useAppLang();
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-[var(--radius-sm)] focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
    >
      {t(lang, "skipLink")}
    </a>
  );
}

export function useAppLang(): Lang {
  const initial = useContext(ServerLang);
  return useSyncExternalStore(subscribeAppLang, getAppLang, () => initial);
}
