"use client";

import { ArrowRightIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAppLang } from "@/components/LangProvider";
import { t } from "@/lib/i18n";

const STORAGE = "oltc-agent-dock-seen";
const LEGACY_STORAGE = "oltc-agent-dock";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const OPEN_DELAY_MS = 500;

function brand(file: string) {
  return `${BASE}/brand/${file}`;
}

const SATS = [
  { src: "openai.svg", cls: "s1", cover: false },
  { src: "claude.svg", cls: "s2", cover: false },
  { src: "grok.svg", cls: "s3", cover: false },
  { src: "kimi.svg", cls: "s4", cover: false },
  { src: "zhipu.png", cls: "s5", cover: true },
] as const;

function Orbit() {
  return (
    <div className="agent-orbit" aria-hidden>
      <span className="agent-p agent-hub">
        <img src={brand("workbuddy.svg")} alt="" />
      </span>
      {SATS.map((s) => (
        <span
          key={s.src}
          className={`agent-p agent-sat ${s.cls}${s.cover ? " agent-cover" : ""}`}
        >
          <img src={brand(s.src)} alt="" />
        </span>
      ))}
    </div>
  );
}

function seenBefore() {
  try {
    return (
      localStorage.getItem(STORAGE) === "1" ||
      localStorage.getItem(LEGACY_STORAGE) === "closed"
    );
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    localStorage.setItem(STORAGE, "1");
  } catch {
    /* ignore */
  }
}

export function AgentDock() {
  const lang = useAppLang();
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Auto-open once, on the first visit only, after a short beat. Anyone
  // who has seen it (or dismissed an earlier version) gets just the chip.
  useEffect(() => {
    setHydrated(true);
    if (seenBefore()) return;
    markSeen();
    let raf1 = 0;
    let raf2 = 0;
    const timer = setTimeout(() => {
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setOpen(true));
      });
    }, OPEN_DELAY_MS);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);

  // Same dismissal contract as the footer version popover: Escape or a
  // pointer-down anywhere outside the dock closes the bubble.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPtr = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPtr);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPtr);
    };
  }, [open]);

  if (!hydrated) return null;

  return (
    <div ref={rootRef} className={`agent-dock${open ? " is-open" : ""}`}>
      <aside
        className="agent-bubble"
        role="dialog"
        aria-labelledby="agent-dock-title"
        aria-hidden={!open}
      >
        <button
          type="button"
          className="agent-x"
          onClick={() => setOpen(false)}
          aria-label={t(lang, "agentClose")}
          tabIndex={open ? 0 : -1}
        >
          <XMarkIcon className="h-4 w-4" aria-hidden />
        </button>
        <div className="agent-clip">
          <div className="agent-inner">
            <Orbit />
            <div className="agent-copy min-w-0 flex-1">
              <h2
                id="agent-dock-title"
                className="pr-7 text-[0.98rem] font-semibold tracking-[-0.02em] text-[var(--color-ink)]"
              >
                {t(lang, "agentTitle")}
              </h2>
              <p className="mt-1.5 text-[13px] leading-snug text-[var(--color-muted)]">
                {t(lang, "agentBody")}
              </p>
              <Link
                href="/agents/"
                className="agent-cta"
                tabIndex={open ? 0 : -1}
              >
                {t(lang, "agentCta")}
                <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </aside>
      <button
        type="button"
        className="agent-chip"
        onClick={() => setOpen(true)}
        aria-label={t(lang, "agentOpen")}
        tabIndex={open ? -1 : 0}
      >
        <span className="agent-chip-mark">
          <img src={brand("workbuddy.svg")} alt="" />
        </span>
        {t(lang, "agentChip")}
      </button>
    </div>
  );
}
