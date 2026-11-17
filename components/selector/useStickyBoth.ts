"use client";

import { useEffect, type RefObject } from "react";

/**
 * A sticky card that moves as one piece with the page (2026-11-17 Eric:
 * 右侧下滑能整体下滑). A card that fits the window stays in view. A taller
 * one scrolls with the page until its foot is on screen and holds there;
 * scrolling back up brings its head back under the header. Nothing inside
 * the card is pinned on its own, and nothing scrolls inside it.
 *
 * It drives the card's `top`: between `head` (under the header) and the
 * value that puts the card's foot `foot` px above the window's bottom.
 */
export function useStickyBoth(
  ref: RefObject<HTMLElement | null>,
  { head, foot, media }: { head: number; foot: number; media: string },
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    const mq = window.matchMedia(media);
    let top = head;
    let lastY = window.scrollY;
    let frame = 0;

    const lowest = () => Math.min(head, window.innerHeight - el.offsetHeight - foot);
    const apply = (next: number) => {
      top = Math.max(lowest(), Math.min(head, next));
      el.style.top = `${Math.round(top)}px`;
    };
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      if (mq.matches) apply(top - dy);
    };
    const settle = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        lastY = window.scrollY;
        if (mq.matches) apply(top);
        else el.style.top = "";
      });
    };

    settle();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", settle);
    mq.addEventListener("change", settle);
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(settle);
    ro?.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", settle);
      mq.removeEventListener("change", settle);
      ro?.disconnect();
      el.style.top = "";
    };
  }, [ref, head, foot, media]);
}
