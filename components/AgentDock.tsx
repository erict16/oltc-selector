"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAppLang } from "@/components/LangProvider";
import {
  MORPH_MS,
  applyMorph,
  easeOutCubic,
  morphIntent,
  rectFlip,
  type Flip,
  type MorphPhase,
} from "@/lib/agentMorph";
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

function reduced() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function clearInline(el: HTMLElement | null) {
  if (!el) return;
  el.style.transform = "";
  el.style.opacity = "";
  el.style.borderRadius = "";
  el.style.transformOrigin = "";
}

type Driver = {
  raf: number;
  k: number;
  k0: number;
  target: 0 | 1;
  t0: number;
  g: Flip;
};

export function AgentDock() {
  const lang = useAppLang();
  const [open, setOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [morphing, setMorphing] = useState(false);
  const bubbleRef = useRef<HTMLElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const xRef = useRef<HTMLButtonElement>(null);
  const phase = useRef<MorphPhase>("open");
  const playOpen = useRef(false);
  const drv = useRef<Driver>({
    raf: 0,
    k: 0,
    k0: 0,
    target: 0,
    t0: 0,
    g: { dx: 0, dy: 0, sx: 1, sy: 1 },
  });

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE) === "closed") {
        setOpen(false);
        phase.current = "closed";
      }
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

  function paint(k: number) {
    const bubble = bubbleRef.current;
    if (!bubble) return;
    applyMorph(bubble, innerRef.current, xRef.current, k, drv.current.g);
  }

  function stopRaf() {
    if (drv.current.raf) cancelAnimationFrame(drv.current.raf);
    drv.current.raf = 0;
  }

  function finish(next: "open" | "closed") {
    stopRaf();
    phase.current = next;
    setMorphing(false);
    if (next === "closed") setOpen(false);
    requestAnimationFrame(() => {
      clearInline(bubbleRef.current);
      clearInline(innerRef.current);
      clearInline(xRef.current);
    });
  }

  function tick(now: number) {
    const d = drv.current;
    const p = easeOutCubic((now - d.t0) / MORPH_MS);
    d.k = d.k0 + (d.target - d.k0) * p;
    paint(d.k);
    if (p < 1) {
      d.raf = requestAnimationFrame(tick);
      return;
    }
    d.k = d.target;
    paint(d.k);
    finish(d.target === 1 ? "closed" : "open");
  }

  function retarget(target: 0 | 1) {
    const d = drv.current;
    d.k0 = d.k;
    d.target = target;
    d.t0 = performance.now();
    phase.current = target === 1 ? "toChip" : "toBubble";
    if (!d.raf) d.raf = requestAnimationFrame(tick);
  }

  function measure(): Flip | null {
    const bubble = bubbleRef.current;
    const chip = chipRef.current;
    if (!bubble || !chip) return null;
    const a = bubble.getBoundingClientRect();
    const b = chip.getBoundingClientRect();
    if (a.width < 2 || b.width < 2) return null;
    return rectFlip(a, b);
  }

  function close() {
    const intent = morphIntent(phase.current, "close");
    if (intent === "ignore") return;
    persist(false);
    if (reduced()) {
      finish("closed");
      return;
    }
    if (intent === "reverse") {
      retarget(1);
      return;
    }
    clearInline(bubbleRef.current);
    clearInline(innerRef.current);
    const g = measure();
    if (!g) {
      finish("closed");
      return;
    }
    drv.current.g = g;
    drv.current.k = 0;
    setMorphing(true);
    retarget(1);
  }

  function reopen() {
    const intent = morphIntent(phase.current, "open");
    if (intent === "ignore") return;
    persist(true);
    if (reduced()) {
      setOpen(true);
      phase.current = "open";
      return;
    }
    if (intent === "reverse") {
      retarget(0);
      return;
    }
    playOpen.current = true;
    phase.current = "toBubble";
    setOpen(true);
  }

  useLayoutEffect(() => {
    if (!hydrated || !open || !playOpen.current) return;
    if (reduced()) {
      playOpen.current = false;
      phase.current = "open";
      return;
    }
    playOpen.current = false;
    clearInline(bubbleRef.current);
    clearInline(innerRef.current);
    const g = measure();
    if (!g) {
      phase.current = "open";
      return;
    }
    drv.current.g = g;
    drv.current.k = 1;
    paint(1);
    setMorphing(true);
    retarget(0);
    return () => {
      if (drv.current.k !== 0 && drv.current.target === 0) {
        playOpen.current = true;
        stopRaf();
      }
    };
  }, [hydrated, open]);

  if (!hydrated) return null;

  return (
    <div
      className={`agent-dock${open ? " is-open" : ""}${morphing ? " is-morphing" : ""}`}
    >
      <aside
        ref={bubbleRef}
        className="agent-bubble"
        role="dialog"
        aria-labelledby="agent-dock-title"
        aria-hidden={!open}
      >
        <button
          ref={xRef}
          type="button"
          className="agent-x"
          onClick={close}
          aria-label={t(lang, "agentClose")}
        >
          <XMarkIcon className="h-4 w-4" aria-hidden />
        </button>
        <div className="agent-clip">
          <div ref={innerRef} className="agent-inner">
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
                className="mt-2 inline-block text-[13px] font-medium text-[var(--color-accent)] hover:underline"
              >
                {t(lang, "agentCta")}
              </Link>
            </div>
          </div>
        </div>
      </aside>
      <button
        ref={chipRef}
        type="button"
        className="agent-chip"
        onClick={reopen}
        aria-label={t(lang, "agentOpen")}
        tabIndex={open && !morphing ? -1 : 0}
      >
        <span className="agent-chip-mark">
          <img src={brand("workbuddy.svg")} alt="" />
        </span>
        {t(lang, "agentChip")}
      </button>
    </div>
  );
}
