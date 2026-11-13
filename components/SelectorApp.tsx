"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LangSwitcher } from "@/components/LangSwitcher";
import { useAppLang } from "@/components/LangProvider";
import { ResultCard } from "@/components/selector/ResultCard";
import { ResultDock } from "@/components/selector/ResultDock";
import { DutySection } from "@/components/selector/DutySection";
import { SwitchSection } from "@/components/selector/SwitchSection";
import { TransformerSection } from "@/components/selector/TransformerSection";
import { useFormActions } from "@/components/selector/useFormActions";
import { useFormUrl } from "@/components/selector/useFormUrl";
import { useSelection } from "@/components/selector/useSelection";
import { APP_VERSION } from "@/lib/appVersion";
import { copyText } from "@/lib/clipboard";
import { INITIAL_FORM, type FormState } from "@/lib/formState";
import { setAppLang, t } from "@/lib/i18n";

export function SelectorApp() {
  const lang = useAppLang();
  // First paint is lib/formState INITIAL_FORM, so the tests start where the page does.
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const actions = useFormActions(setForm);
  const sel = useSelection(form, lang);

  /** The tender line a shared link was filled from; it stays in the link. */
  const [readText, setReadText] = useState("");

  useFormUrl(form, readText, (d) => {
    actions.replace(d.form);
    setReadText(d.line);
  });

  const [copiedModel, setCopiedModel] = useState<string | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);
  /** `mark` names what shows 已复制; the copied text itself by default. */
  const copyModel = async (text: string, mark: string = text) => {
    const ok = await copyText(text);
    if (!ok) return;
    setCopiedModel(mark);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopiedModel(null), 2000);
  };

  useEffect(() => {
    const name = t(lang, "title");
    const title = name === "OLTC Selector" ? name : `${name} · OLTC Selector`;
    document.title = title;
    // Next writes the static title again after hydration: keep ours.
    const keep = new MutationObserver(() => {
      if (document.title !== title) document.title = title;
    });
    keep.observe(document.head, { childList: true, characterData: true, subtree: true });
    return () => keep.disconnect();
  }, [lang]);

  const resultPaneRef = useRef<HTMLElement | null>(null);
  const resultCardRef = useRef<HTMLElement | null>(null);
  /** Phones: the dock hides while the full result card is on screen. */
  const [resultInView, setResultInView] = useState(false);
  useEffect(() => {
    const el = resultPaneRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setResultInView(entry.isIntersecting),
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const jumpToResult = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultPaneRef.current?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
    // The dock hides once the card is in view; keep focus somewhere visible.
    resultCardRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="page flex w-full min-w-0 flex-1 flex-col">
      <header className="topbar sticky top-0 z-30">
        <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center gap-2.5 px-4 sm:gap-3 sm:px-8">
          <div className="flex min-w-0 items-baseline gap-2 leading-tight">
            <h1 className="truncate text-[0.9375rem] font-semibold whitespace-nowrap text-[var(--color-ink)]">
              {t(lang, "title")}
            </h1>
            <Link href="/changelog/" className="topbar-version num">
              v{APP_VERSION}
            </Link>
          </div>
          <nav className="topbar-nav ml-auto" aria-label={t(lang, "title")}>
            <Link href="/agents/">{t(lang, "agentChip")}</Link>
            <Link href="/changelog/">{t(lang, "changelogTitle")}</Link>
          </nav>
          <div className="topbar-lang">
            <LangSwitcher
              lang={lang}
              onChange={setAppLang}
              ariaLabel={t(lang, "langAria")}
            />
          </div>
        </div>
      </header>
      <div className="page-grid mx-auto grid w-full max-w-[1280px] flex-1 items-start gap-4 px-0 pt-4 pb-6 sm:gap-6 sm:px-8 sm:pt-8 lg:grid-cols-[minmax(25rem,2fr)_minmax(0,3fr)] lg:gap-8 lg:pb-10">
        <form
          className="flex min-w-0 flex-col"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="w-full">

          <div className="sheet">
            <TransformerSection
              lang={lang}
              form={form}
              actions={actions}
              sel={sel}
            />
            <DutySection lang={lang} form={form} actions={actions} sel={sel} />
            <SwitchSection lang={lang} form={form} actions={actions} />
          </div>
          </div>
        </form>

        <aside
          ref={resultPaneRef}
          className="result-pane flex min-w-0 scroll-mt-16 flex-col lg:self-stretch"
        >
          <ResultCard
            lang={lang}
            form={form}
            sel={sel}
            cardRef={resultCardRef}
            onTap={actions.pickTap}
            copiedModel={copiedModel}
            copyModel={copyModel}
          />
        </aside>
      </div>

      <footer className="page-foot">
        <nav aria-label={t(lang, "title")}>
          <Link href="/changelog/" className="foot-dup">{t(lang, "changelogTitle")}</Link>
          <Link href="/agents/" className="foot-dup">{t(lang, "agentChip")}</Link>
          <Link href="/terms/">{t(lang, "navTerms")}</Link>
          <Link href="/privacy/">{t(lang, "navPrivacy")}</Link>
        </nav>
      </footer>

      <ResultDock
        lang={lang}
        sel={sel}
        hidden={resultInView}
        copiedModel={copiedModel}
        copyModel={copyModel}
        onJump={jumpToResult}
      />
    </div>
  );
}
