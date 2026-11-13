"use client";

import Link from "next/link";
import { useEffect, useState, type RefObject } from "react";
import {
  ChevronDownIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { TransformerSketch } from "@/components/TransformerPicker";
import { displayModel } from "@/lib/domesticModel";
import { showsMinimumLabel } from "@/lib/engine";
import { isOctc as formIsOctc, type FormState } from "@/lib/formState";
import { t, type Lang } from "@/lib/i18n";
import type { TapPoint } from "@/lib/transformer";
import { CopyButton } from "./CopyButton";
import { cx } from "./fields";
import { BasisTable, ModelSpec, TypeSegments, modelNodes } from "./resultParts";
import type { Selection } from "./useSelection";

/** Marks the link button as the one just copied. */

/** The result: type, its coded parts, cautions, loads, sketch, ratings, alternatives. */
export function ResultCard({
  lang,
  form,
  sel,
  cardRef,
  onTap,
  copiedModel,
  copyModel,
}: {
  lang: Lang;
  form: FormState;
  sel: Selection;
  cardRef: RefObject<HTMLElement | null>;
  onTap: (p: TapPoint) => void;
  /** What shows 已复制 just now. */
  copiedModel: string | null;
  copyModel: (text: string) => void;
}) {
  const { input, kind, tapPoint, winding, windingRatedKv, hvKv, mvKv, currentMode } = form;
  const {
    sized,
    calcFailed,
    primary,
    loose,
    alts,
    insuranceId,
    duty,
    derivedA,
    pickedDutyA,
    pickedStepV,
    cautions,
    emptyKey,
    emptyNotes,
    liveText,
  } = sel;
  const isOctc = formIsOctc(form);
  /** null: follow the default (open when a roomier type is offered). */
  const [altsPick, setAltsPick] = useState<boolean | null>(null);
  const [openAlts, setOpenAlts] = useState<string[]>([]);
  const primaryModel = primary?.model ?? null;
  useEffect(() => {
    setOpenAlts([]);
  }, [primaryModel]);
  const altsOpen = altsPick ?? insuranceId != null;
  const setAltsOpen = (next: (open: boolean) => boolean) => setAltsPick(next(altsOpen));
  // Screen readers hear the type once typing settles, not on every keystroke.
  const [announced, setAnnounced] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setAnnounced(liveText), 700);
    return () => clearTimeout(id);
  }, [liveText]);
  return (
    <>
      <section
        ref={cardRef}
        tabIndex={-1}
        aria-label={t(lang, "resultAria")}
        className="plate focus:outline-none"
      >
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {announced}
        </p>
        <div className={cx("px-5 pt-5 sm:px-8 sm:pt-7", primary ? "plate-hero" : "pb-5")}>
          {!primary ? (
            <div>
              <p
                className={cx(
                  "text-[0.9375rem] font-semibold",
                  sized || calcFailed ? "text-[var(--color-danger)]" : "text-[var(--color-ink)]",
                )}
              >
                {t(lang, emptyKey)}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[0.8125rem] leading-snug text-[var(--color-ink-2)]">
                {emptyNotes.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <span className="plate-badge">
                  {showsMinimumLabel(loose) ? null : (
                    <ShieldCheckIcon className="h-[15px] w-[15px]" strokeWidth={2} aria-hidden />
                  )}
                  {t(lang, showsMinimumLabel(loose) ? "recommended" : "allRound")}
                </span>
                <span className="no-print flex flex-wrap items-center gap-2">
                  <CopyButton
                    lang={lang}
                    labelled
                    copied={copiedModel === displayModel(primary.model, lang)}
                    onCopy={() => copyModel(displayModel(primary.model, lang))}
                  />
                </span>
              </div>
              <p
                key={primary.model}
                translate="no"
                className="plate-type plate-in mt-4 text-[clamp(1.375rem,6vw,1.875rem)] leading-[1.15] font-semibold tracking-[-0.025em] text-[var(--color-ink)] lg:text-[clamp(1.625rem,2.6vw,2.375rem)]"
              >
                {modelNodes(displayModel(primary.model, lang))}
              </p>
              <TypeSegments lang={lang} r={primary} shown={displayModel(primary.model, lang)} />
            </>
          )}
        </div>

        <div className="plate-body">
        {/* Right under the type, so the list opens downward. At the foot of a
            window-high card it took its room from the sketch above it, and
            its own title moved up under the pointer (2026-11-14 Eric). */}
        {primary && alts.length > 0 ? (
          <div className="plate-alts">
            <button
              type="button"
              onClick={() => setAltsOpen((o) => !o)}
              className="flex h-12 w-full items-center justify-between px-5 text-left text-[0.8125rem] font-medium text-[var(--color-ink-2)] hover:text-[var(--color-ink)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-accent)] sm:px-8"
              aria-expanded={altsOpen}
            >
              <span>{t(lang, "otherOpts", { n: alts.length })}</span>
              <ChevronDownIcon
                className={cx(
                  "h-4 w-4 shrink-0 text-[var(--color-muted)] transition-transform duration-200",
                  altsOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>
            <div
              className={cx(
                "alts-drop grid transition-[grid-template-rows,opacity] duration-200 ease-out",
                altsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="min-h-0 overflow-hidden" {...(altsOpen ? {} : { inert: true })}>
                <ul className="divide-y divide-[var(--color-rule)] border-t border-[var(--color-rule)]">
                  {alts.map((r) => {
                    const open = openAlts.includes(r.model);
                    const shown = displayModel(r.model, lang);
                    return (
                      <li key={r.model}>
                        <div className="flex items-center gap-1 pr-3 pl-3 sm:pl-4">
                          <button
                            type="button"
                            aria-expanded={open}
                            onClick={() => setOpenAlts(open ? [] : [r.model])}
                            className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-[4px] px-2 py-1.5 text-left focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
                          >
                            <ChevronDownIcon
                              className={cx(
                                "h-4 w-4 shrink-0 text-[var(--color-caption)] transition-transform duration-200",
                                open && "rotate-180",
                              )}
                              aria-hidden
                            />
                            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                              <span translate="no" className="plate-type min-w-0 text-[0.875rem] leading-snug text-[var(--color-ink)]">
                                {modelNodes(shown)}
                              </span>
                              {insuranceId === r.model ? (
                                <span className="shrink-0 text-[0.75rem] font-medium text-[var(--color-accent)]">
                                  {t(lang, "allRound")}
                                </span>
                              ) : null}
                            </span>
                          </button>
                          <CopyButton
                            lang={lang}
                            small
                            copied={copiedModel === shown}
                            onCopy={() => copyModel(shown)}
                          />
                        </div>
                        <div className={cx("more-drop", open && "more-drop-open")}>
                          <div className="min-h-0 overflow-hidden" {...(open ? {} : { inert: true })}>
                            <div className="more-drop-inner">
                              <ModelSpec
                                lang={lang}
                                r={r}
                                dutyMounting={input.mounting}
                                compact
                              />
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        ) : null}
        <div className="plate-mid px-5 py-6 sm:px-8">
          <div className="plate-facts">
            <BasisTable
              lang={lang}
              duty={duty}
              dutyA={pickedDutyA ?? (currentMode === "capacity" ? derivedA : input.throughCurrentA)}
              stepV={pickedStepV}
              model={primary}
            />
            {/* The type's own data. It was a band under the sketch until
                2026-11-14 01:24 and was taken out as clutter; Eric missed it
                the same day. It sits in the room under the loads now. */}
            {primary ? (
              <ModelSpec lang={lang} r={primary} dutyMounting={input.mounting} hideRatings inline />
            ) : null}
          </div>
          <div className="stage-sketch">
            <TransformerSketch
              lang={lang}
              kind={kind}
              tapPoint={tapPoint}
              winding={winding}
              tapKv={windingRatedKv}
              hvKv={hvKv}
              mvKv={mvKv}
              onTap={onTap}
              octc={isOctc}
            />
          </div>
        </div>

        {cautions.length > 0 ? (
          <ul className="caution-list">
            {cautions.map((c) => (
              <li key={c} className="flex gap-2">
                <ExclamationTriangleIcon
                  className="mt-px h-4 w-4 shrink-0 text-[var(--color-warn)]"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        ) : null}

        </div>
        <div className="plate-foot">
          <p>{t(lang, "disclaimer")}</p>
          <nav className="no-print" aria-label={t(lang, "navTerms")}>
            <Link href="/terms/">{t(lang, "navTerms")}</Link>
            <Link href="/privacy/">{t(lang, "navPrivacy")}</Link>
          </nav>
        </div>
      </section>
    </>
  );
}
