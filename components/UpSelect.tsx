"use client";

import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Opt = { value: string; label: string };

const controlClass =
  "h-11 w-full min-w-0 rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] bg-white px-3 text-[0.9rem] leading-snug text-[var(--color-ink)] transition-colors duration-150 hover:border-[var(--color-accent)] focus:border-[var(--color-accent)] focus:outline-none";

/**
 * Menu opens above the field. The insulation row sits at the bottom of the
 * form, and the native menu runs off the screen.
 */
export function UpSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Opt[];
}) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{
    left: number;
    width: number;
    bottom: number;
    maxHeight: number;
  } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const current = options.find((o) => o.value === value) ?? options[0];

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const el = btnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const gap = 4;
      const spaceAbove = Math.max(0, r.top - gap - 8);
      setBox({
        left: r.left,
        width: r.width,
        bottom: window.innerHeight - r.top + gap,
        maxHeight: Math.max(96, Math.min(256, spaceAbove)),
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    const selected = listRef.current?.querySelector<HTMLElement>(
      "[aria-selected='true']",
    );
    selected?.scrollIntoView({ block: "nearest" });
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative min-w-0">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        className={`${controlClass} flex items-center justify-between gap-2 text-left`}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="min-w-0 truncate">{current?.label ?? ""}</span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-[var(--color-muted)] transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open && box
        ? createPortal(
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label={label}
              style={{
                position: "fixed",
                left: box.left,
                width: box.width,
                bottom: box.bottom,
                maxHeight: box.maxHeight,
                zIndex: 60,
              }}
              className="overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] bg-white py-1 shadow-[0_8px_24px_oklch(24%_0.02_258_/_0.12)]"
            >
              {options.map((o) => {
                const on = o.value === value;
                return (
                  <li key={o.value || "__empty"} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={on}
                      className={`flex w-full items-center px-3 py-1.5 text-left text-[0.9rem] hover:bg-[var(--color-soft)] ${
                        on
                          ? "font-medium text-[var(--color-accent)]"
                          : "text-[var(--color-ink)]"
                      }`}
                      onClick={() => {
                        onChange(o.value);
                        setOpen(false);
                      }}
                    >
                      {o.label}
                    </button>
                  </li>
                );
              })}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
