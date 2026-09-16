"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAppLang } from "@/components/LangProvider";
import { t } from "@/lib/i18n";

const STORAGE = "oltc-agent-dock";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const EASE = "cubic-bezier(0.32, 0.72, 0.28, 1)";
const MS = 520;

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

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function AgentDock() {
  const lang = useAppLang();
  const [open, setOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const bubbleRef = useRef<HTMLElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);
  const busy = useRef(false);
  const skipFirstOpen = useRef(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE) === "closed") setOpen(false);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  function persist(next: boolean) {
    try {
      localStorage.setItem(STORAGE, next ? "open" : "closed");
    } catch {
      /* ignore */
    }
  }

  function close() {
    if (busy.current) return;
    const bubble = bubbleRef.current;
    const chip = chipRef.current;
    persist(false);
    if (!bubble || !chip || prefersReducedMotion()) {
      setOpen(false);
      return;
    }
    const a = bubble.getBoundingClientRect();
    const b = chip.getBoundingClientRect();
    if (a.width < 2 || b.width < 2) {
      setOpen(false);
      return;
    }
    busy.current = true;
    const dx = b.left - a.left;
    const dy = b.top - a.top;
    const sx = b.width / a.width;
    const sy = b.height / a.height;
    bubble.style.transformOrigin = "top left";
    bubble.style.transition = "none";
    bubble.style.transform = "none";
    void bubble.offsetWidth;
    bubble.style.transition = `transform ${MS}ms ${EASE}, opacity ${MS}ms ease`;
    bubble.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    bubble.style.opacity = "0";
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      bubble.removeEventListener("transitionend", done);
      bubble.style.transition = "";
      bubble.style.transform = "";
      bubble.style.opacity = "";
      setOpen(false);
      busy.current = false;
    };
    bubble.addEventListener("transitionend", done);
    window.setTimeout(done, MS + 80);
  }

  function reopen() {
    if (busy.current) return;
    persist(true);
    setOpen(true);
  }

  useEffect(() => {
    if (!hydrated || !open) return;
    if (skipFirstOpen.current) {
      skipFirstOpen.current = false;
      return;
    }
    const bubble = bubbleRef.current;
    const chip = chipRef.current;
    if (!bubble || !chip || prefersReducedMotion()) return;
    const a = bubble.getBoundingClientRect();
    const b = chip.getBoundingClientRect();
    if (a.width < 2 || b.width < 2) return;
    const dx = b.left - a.left;
    const dy = b.top - a.top;
    const sx = b.width / a.width;
    const sy = b.height / a.height;
    busy.current = true;
    bubble.style.transformOrigin = "top left";
    bubble.style.transition = "none";
    bubble.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    bubble.style.opacity = "0.4";
    void bubble.offsetWidth;
    bubble.style.transition = `transform ${MS}ms ${EASE}, opacity ${MS}ms ease`;
    bubble.style.transform = "none";
    bubble.style.opacity = "1";
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      bubble.removeEventListener("transitionend", done);
      bubble.style.transition = "";
      bubble.style.transform = "";
      bubble.style.opacity = "";
      busy.current = false;
    };
    bubble.addEventListener("transitionend", done);
    window.setTimeout(done, MS + 80);
  }, [hydrated, open]);

  if (!hydrated) return null;

  return (
    <div className={`agent-dock${open ? " is-open" : ""}`}>
      <aside
        ref={bubbleRef}
        className="agent-bubble"
        role="dialog"
        aria-labelledby="agent-dock-title"
        aria-hidden={!open}
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
      <button
        ref={chipRef}
        type="button"
        className="agent-chip"
        onClick={reopen}
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
