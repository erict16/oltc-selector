"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAppLang } from "@/components/LangProvider";
import { t } from "@/lib/i18n";

const STORAGE = "oltc-agent-dock";
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
/** Shared-element morph of a ~27rem card into a 2.5rem chip. Over 300ms so it reads as one object. */
const SHELL_MS = 420;
const FADE_MS = 90;

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

function rectFlip(from: DOMRect, to: DOMRect) {
  return {
    dx: to.left - from.left,
    dy: to.top - from.top,
    sx: to.width / from.width,
    sy: to.height / from.height,
  };
}

function clearMorph(el: HTMLElement) {
  el.style.transition = "";
  el.style.transform = "";
  el.style.opacity = "";
  el.style.borderRadius = "";
  el.style.transformOrigin = "";
  el.style.willChange = "";
  el.style.pointerEvents = "";
}

function onTransformEnd(el: HTMLElement, ms: number, fn: () => void) {
  let done = false;
  const finish = (e?: TransitionEvent) => {
    if (done) return;
    if (e && e.target !== el) return;
    if (e && e.propertyName && e.propertyName !== "transform") return;
    done = true;
    el.removeEventListener("transitionend", finish as EventListener);
    fn();
  };
  el.addEventListener("transitionend", finish as EventListener);
  window.setTimeout(() => finish(), ms + 80);
}

export function AgentDock() {
  const lang = useAppLang();
  const [open, setOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const bubbleRef = useRef<HTMLElement>(null);
  const chipRef = useRef<HTMLButtonElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const xRef = useRef<HTMLButtonElement>(null);
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
    const inner = innerRef.current;
    const x = xRef.current;
    persist(false);
    if (!bubble || !chip || reduced()) {
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
    const { dx, dy, sx, sy } = rectFlip(a, b);
    bubble.style.pointerEvents = "none";
    bubble.style.transformOrigin = "top left";
    bubble.style.willChange = "transform";
    if (x) {
      x.style.transition = `opacity ${FADE_MS}ms ease-out`;
      x.style.opacity = "0";
    }
    if (inner) {
      inner.style.transformOrigin = "top left";
      inner.style.willChange = "transform, opacity";
      inner.style.transition = `transform ${SHELL_MS}ms ${EASE}, opacity 120ms ease-out ${SHELL_MS - 120}ms`;
      inner.style.opacity = "0";
      inner.style.transform = `scale(${1 / sx}, ${1 / sy})`;
    }
    void bubble.offsetWidth;
    bubble.style.transition = `transform ${SHELL_MS}ms ${EASE}, border-radius ${SHELL_MS}ms ${EASE}`;
    bubble.style.borderRadius = "999px";
    bubble.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    onTransformEnd(bubble, SHELL_MS, () => {
      clearMorph(bubble);
      if (inner) clearMorph(inner);
      if (x) clearMorph(x);
      setOpen(false);
      busy.current = false;
    });
  }

  function reopen() {
    if (busy.current) return;
    persist(true);
    setOpen(true);
  }

  useLayoutEffect(() => {
    if (!hydrated) return;
    if (skipFirstOpen.current) {
      skipFirstOpen.current = false;
      if (open) return;
    }
    if (!open) return;
    const bubble = bubbleRef.current;
    const chip = chipRef.current;
    const inner = innerRef.current;
    const x = xRef.current;
    if (!bubble || !chip || reduced()) return;
    const a = bubble.getBoundingClientRect();
    const b = chip.getBoundingClientRect();
    if (a.width < 2 || b.width < 2) return;
    const { dx, dy, sx, sy } = rectFlip(a, b);
    busy.current = true;
    bubble.style.pointerEvents = "none";
    bubble.style.transition = "none";
    bubble.style.transformOrigin = "top left";
    bubble.style.willChange = "transform";
    bubble.style.borderRadius = "999px";
    bubble.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    if (x) {
      x.style.transition = "none";
      x.style.opacity = "0";
    }
    if (inner) {
      inner.style.transition = "none";
      inner.style.transformOrigin = "top left";
      inner.style.transform = `scale(${1 / sx}, ${1 / sy})`;
      inner.style.opacity = "1";
    }
    const play = () => {
      bubble.style.transition = `transform ${SHELL_MS}ms ${EASE}, border-radius ${SHELL_MS}ms ${EASE}`;
      bubble.style.transform = "none";
      bubble.style.borderRadius = "16px";
      if (inner) {
        inner.style.transition = `transform ${SHELL_MS}ms ${EASE}`;
        inner.style.transform = "none";
      }
      if (x) {
        x.style.transition = `opacity 180ms ease-out 140ms`;
        x.style.opacity = "1";
      }
    };
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(play);
    });
    onTransformEnd(bubble, SHELL_MS, () => {
      clearMorph(bubble);
      if (inner) clearMorph(inner);
      if (x) clearMorph(x);
      busy.current = false;
    });
    return () => cancelAnimationFrame(raf);
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
