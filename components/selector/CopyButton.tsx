"use client";

import { CheckIcon, LinkIcon, Square2StackIcon } from "@heroicons/react/24/outline";
import { t, type Lang } from "@/lib/i18n";
import { cx } from "./fields";

/** Icon-only copy; says 已复制 for a moment after a click. */
export function CopyButton({
  lang,
  copied,
  onCopy,
  small,
  touch,
  labelled,
  link,
}: {
  /** Framed button with the words beside the icon. */
  labelled?: boolean;
  /** Copies the page link, not the type. */
  link?: boolean;
  lang: Lang;
  copied: boolean;
  onCopy: () => void;
  small?: boolean;
  /** 44 px target for the phone dock. */
  touch?: boolean;
}) {
  if (labelled) {
    const Idle = link ? LinkIcon : Square2StackIcon;
    return (
      <button type="button" onClick={onCopy} className={cx("copy-btn", copied && "is-done")}>
        {copied ? (
          <CheckIcon className="h-4 w-4" strokeWidth={2} aria-hidden />
        ) : (
          <Idle className="h-4 w-4" strokeWidth={1.7} aria-hidden />
        )}
        <span aria-live="polite">{t(lang, copied ? "copied" : link ? "copyLink" : "copyType")}</span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onCopy}
      title={t(lang, "copyType")}
      aria-label={copied ? t(lang, "copied") : t(lang, "copyType")}
      className={cx(
        "inline-flex shrink-0 items-center justify-center gap-1 rounded-[6px] transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-accent)]",
        small ? "h-11 min-w-11 lg:h-8 lg:min-w-8" : touch ? "h-11 min-w-11" : "h-9 min-w-9",
        copied
          ? "px-2 text-[0.75rem] font-medium text-[var(--color-accent)]"
          : "text-[var(--color-caption)] hover:bg-[var(--color-field)] hover:text-[var(--color-ink)]",
      )}
    >
      {copied ? (
        <>
          <CheckIcon className="h-4 w-4" strokeWidth={2} aria-hidden />
          <span aria-live="polite">{t(lang, "copied")}</span>
        </>
      ) : (
        <Square2StackIcon className={small ? "h-4 w-4" : "h-[18px] w-[18px]"} strokeWidth={1.6} aria-hidden />
      )}
    </button>
  );
}
