"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import {
  getAppLang,
  subscribeAppLang,
  type Lang,
} from "@/lib/i18n";

const ServerLang = createContext<Lang>("zh");

export function LangProvider({
  initial,
  children,
}: {
  initial: Lang;
  children: ReactNode;
}) {
  return (
    <ServerLang.Provider value={initial}>{children}</ServerLang.Provider>
  );
}

export function useAppLang(): Lang {
  const initial = useContext(ServerLang);
  return useSyncExternalStore(subscribeAppLang, getAppLang, () => initial);
}
