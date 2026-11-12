"use client";

import { ArrowDownIcon } from "@heroicons/react/24/outline";
import { displayModel } from "@/lib/domesticModel";
import { showsMinimumLabel } from "@/lib/engine";
import { t, type Lang } from "@/lib/i18n";
import { CopyButton } from "./CopyButton";
import { cx } from "./fields";
import { modelNodes } from "./resultParts";
import type { Selection } from "./useSelection";

/** Phones: the current type rides along at the bottom while the form scrolls. */
export function ResultDock({
  lang,
  sel,
  hidden,
  copiedModel,
  copyModel,
  onJump,
}: {
  lang: Lang;
  sel: Selection;
  /** The full result card is on screen. */
  hidden: boolean;
  copiedModel: string | null;
  copyModel: (text: string) => void;
  onJump: () => void;
}) {
  const { primary, loose, sized, calcFailed, emptyKey } = sel;
  return (
    <div className={cx("result-dock", hidden && "is-hidden")} {...(hidden ? { inert: true } : {})}>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[0.6875rem] font-medium text-[var(--color-muted)]">
          {primary
            ? t(lang, showsMinimumLabel(loose) ? "recommended" : "allRound")
            : t(lang, emptyKey)}
        </span>
        <span
          translate="no"
          className={cx(
            "line-clamp-2 text-[0.9375rem] leading-snug font-semibold",
            primary
              ? "plate-type text-[var(--color-ink)]"
              : sized || calcFailed
                ? "text-[var(--color-danger)]"
                : "text-[var(--color-caption)]",
          )}
        >
          {primary ? modelNodes(displayModel(primary.model, lang)) : "—"}
        </span>
      </div>
      {primary ? (
        <CopyButton
          lang={lang}
          touch
          copied={copiedModel === displayModel(primary.model, lang)}
          onCopy={() => copyModel(displayModel(primary.model, lang))}
        />
      ) : null}
      <button
        type="button"
        onClick={onJump}
        aria-label={t(lang, "showResult")}
        title={t(lang, "showResult")}
        className="dock-jump"
      >
        <ArrowDownIcon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
