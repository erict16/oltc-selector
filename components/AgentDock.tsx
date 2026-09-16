"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppLang } from "@/components/LangProvider";
import { t } from "@/lib/i18n";

const STORAGE = "oltc-agent-dock";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

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

function Orbit({ className = "" }: { className?: string }) {
  return (
    <div className={`agent-orbit ${className}`} aria-hidden>
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

export function AgentDock() {
  const lang = useAppLang();
  const [open, setOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE) === "closed") setOpen(false);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  function close() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE, "closed");
    } catch {
      /* ignore */
    }
  }

  function reopen() {
    setOpen(true);
    try {
      localStorage.setItem(STORAGE, "open");
    } catch {
      /* ignore */
    }
  }

  if (!hydrated) return null;

  return (
    <div className="agent-dock">
      {open ? (
        <aside
          className="agent-bubble"
          role="dialog"
          aria-labelledby="agent-dock-title"
        >
          <button
            type="button"
            className="agent-x"
            onClick={close}
            aria-label={t(lang, "agentClose")}
          >
            <XMarkIcon className="h-4 w-4" aria-hidden />
          </button>
          <Orbit />
          <div className="min-w-0 flex-1">
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
              className="mt-2 inline-block text-[13px] font-medium text-[var(--color-accent)] hover:underline"
            >
              {t(lang, "agentCta")}
            </Link>
          </div>
        </aside>
      ) : (
        <button
          type="button"
          className="agent-chip"
          onClick={reopen}
          aria-label={t(lang, "agentOpen")}
        >
          <img src={brand("workbuddy.svg")} alt="" />
          {t(lang, "agentChip")}
        </button>
      )}
    </div>
  );
}
