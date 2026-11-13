"use client";

import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { CheckIcon } from "@heroicons/react/24/outline";

type Opt = { value: string; label: string; disabled: boolean; hidden: boolean };

type Props = React.SelectHTMLAttributes<HTMLSelectElement> & {
  /** Label id the system <select> needs: only where no <label> wraps it. */
  labelId?: string | null;
  /** Label id for the page's own list, which a <label> does not name. */
  ownLabelId?: string | null;
};

function text(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (Array.isArray(node)) return node.map(text).join("");
  if (isValidElement<{ children?: React.ReactNode }>(node)) return text(node.props.children);
  return String(node);
}

/** The <option> children as data, through fragments and conditionals. */
function readOptions(children: React.ReactNode, into: Opt[] = []): Opt[] {
  Children.forEach(children, (child) => {
    if (!isValidElement<React.OptionHTMLAttributes<HTMLOptionElement>>(child)) return;
    if (child.type === Fragment) {
      readOptions(child.props.children, into);
    } else if (child.type === "option") {
      const label = text(child.props.children);
      into.push({
        value: child.props.value == null ? label : String(child.props.value),
        label,
        disabled: !!child.props.disabled,
        hidden: !!child.props.hidden,
      });
    }
  });
  return into;
}

// A mouse or trackpad gets the page's own list, opening under the control.
// A touch screen keeps the system picker, which is better on a phone.
const FINE_POINTER = "(hover: hover) and (pointer: fine)";
function watchPointer(onChange: () => void) {
  const m = window.matchMedia(FINE_POINTER);
  m.addEventListener("change", onChange);
  return () => m.removeEventListener("change", onChange);
}
const hasFinePointer = () => window.matchMedia(FINE_POINTER).matches;
const noPointerYet = () => false;

/**
 * A menu of options. Takes the same props and <option> children as <select>.
 *
 * 2026-11-14: Safari on macOS draws the system menu over the control and
 * to its left, so the list hid the field it belonged to. The list here opens
 * under the control (above it when there is no room below), at its width.
 * It follows the select-only combobox pattern: arrows, Home, End, type to
 * find, Enter, Escape, and Tab takes the highlighted option. The custom
 * list removed on 2026-11-07 had none of these.
 */
export function MenuSelect(props: Props) {
  const own = useSyncExternalStore(watchPointer, hasFinePointer, noPointerYet);
  const { labelId, ownLabelId, ...rest } = props;
  if (own) return <OwnMenu {...rest} labelId={ownLabelId ?? labelId} />;
  return (
    <select
      {...(labelId && !rest["aria-label"] ? { "aria-labelledby": labelId } : {})}
      {...rest}
    />
  );
}

const GAP = 6;
const EDGE = 12;
const MAX_HEIGHT = 352;

function OwnMenu({
  value,
  onChange,
  children,
  className,
  disabled,
  id,
  labelId,
  "aria-label": ariaLabel,
  "aria-describedby": describedBy,
}: Omit<Props, "ownLabelId">) {
  const all = readOptions(children);
  const opts = all.filter((o) => !o.hidden);
  const current = String(value ?? "");
  const shown = all.find((o) => o.value === current);
  const selected = opts.findIndex((o) => o.value === current);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const listId = useId();
  const optId = (i: number) => `${listId}-${i}`;

  /** Next option that can be picked, from `from` in direction `dir`. */
  const step = (from: number, dir: 1 | -1) => {
    for (let i = from; i >= 0 && i < opts.length; i += dir) {
      if (!opts[i].disabled) return i;
    }
    return -1;
  };
  const move = (to: number, dir: 1 | -1) => {
    const i = step(Math.min(Math.max(to, 0), opts.length - 1), dir);
    if (i >= 0) setActive(i);
  };

  const show = (at?: number) => {
    setActive(at ?? (selected >= 0 ? selected : step(0, 1)));
    setOpen(true);
    // Safari does not focus a button on click; the keys are read from it.
    btnRef.current?.focus();
  };

  const pick = (i: number) => {
    const o = opts[i];
    if (!o || o.disabled) return;
    setOpen(false);
    if (o.value === current) return;
    const target = { value: o.value };
    onChange?.({ target, currentTarget: target } as React.ChangeEvent<HTMLSelectElement>);
  };

  // Under the control, at its width; above it when the room below is short.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const btn = btnRef.current;
      const list = listRef.current;
      if (!btn || !list) return;
      const r = btn.getBoundingClientRect();
      const below = window.innerHeight - r.bottom - GAP - EDGE;
      const above = r.top - GAP - EDGE;
      list.style.maxHeight = "";
      const want = Math.min(list.scrollHeight + 2, MAX_HEIGHT);
      const up = below < want && above > below;
      list.style.left = `${r.left}px`;
      list.style.minWidth = `${r.width}px`;
      list.style.maxHeight = `${Math.max(96, Math.min(MAX_HEIGHT, up ? above : below))}px`;
      list.style.top = up ? "" : `${r.bottom + GAP}px`;
      list.style.bottom = up ? `${window.innerHeight - r.top + GAP}px` : "";
      list.dataset.side = up ? "top" : "bottom";
    };
    place();
    const outside = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !listRef.current?.contains(t)) setOpen(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);

  // Keep the highlighted option inside the list's own scroll.
  useEffect(() => {
    if (!open || active < 0) return;
    const list = listRef.current;
    const item = list?.children[active] as HTMLElement | undefined;
    if (!list || !item) return;
    const top = item.offsetTop - 5;
    const bottom = item.offsetTop + item.offsetHeight + 5;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }, [open, active]);

  const find = (char: string) => {
    const now = Date.now();
    const buf = typed.current;
    buf.text = now - buf.at > 600 ? char : buf.text + char;
    buf.at = now;
    const q = buf.text.toLowerCase();
    // One letter typed again steps through the options that start with it.
    const again = q.length > 1 && [...q].every((c) => c === q[0]);
    const needle = again ? q[0] : q;
    const start = again || q.length === 1 ? active + 1 : Math.max(active, 0);
    for (let n = 0; n < opts.length; n++) {
      const i = (start + n + opts.length) % opts.length;
      if (!opts[i].disabled && opts[i].label.toLowerCase().startsWith(needle)) return i;
    }
    return -1;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey) return;
    const k = e.key;
    if (!open) {
      if (k === "ArrowDown" || k === "ArrowUp" || k === "Enter" || k === " ") {
        e.preventDefault();
        show();
      } else if (k === "Home" || k === "End") {
        e.preventDefault();
        show(k === "Home" ? step(0, 1) : step(opts.length - 1, -1));
      } else if (k.length === 1 && !e.altKey) {
        const i = find(k);
        if (i >= 0) show(i);
      }
      return;
    }
    if (k === "ArrowDown") {
      e.preventDefault();
      move(active + 1, 1);
    } else if (k === "ArrowUp") {
      e.preventDefault();
      if (e.altKey) pick(active);
      else move(active - 1, -1);
    } else if (k === "Home") {
      e.preventDefault();
      move(0, 1);
    } else if (k === "End") {
      e.preventDefault();
      move(opts.length - 1, -1);
    } else if (k === "PageDown") {
      e.preventDefault();
      move(active + 8, -1);
    } else if (k === "PageUp") {
      e.preventDefault();
      move(active - 8, 1);
    } else if (k === "Enter" || (k === " " && Date.now() - typed.current.at > 600)) {
      e.preventDefault();
      pick(active);
    } else if (k === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    } else if (k === "Tab") {
      // Focus moves on; the highlighted option is taken, as a system menu does.
      pick(active);
      setOpen(false);
    } else if (k.length === 1 && !e.altKey) {
      e.preventDefault();
      const i = find(k);
      if (i >= 0) setActive(i);
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        id={id}
        type="button"
        role="combobox"
        className={`${className ?? ""} menu-btn`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? optId(active) : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : (labelId ?? undefined)}
        aria-describedby={describedBy}
        data-open={open || undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        onBlur={() => setOpen(false)}
      >
        <span className="menu-value">{shown?.label ?? ""}</span>
      </button>
      {open
        ? createPortal(
            <div
              ref={listRef}
              id={listId}
              role="listbox"
              className="menu-list"
              aria-label={ariaLabel}
              aria-labelledby={ariaLabel ? undefined : (labelId ?? undefined)}
              // The button keeps focus, so the keys keep working.
              onMouseDown={(e) => e.preventDefault()}
            >
              {opts.map((o, i) => (
                <div
                  key={o.value || "__empty"}
                  id={optId(i)}
                  role="option"
                  className="menu-item"
                  aria-selected={i === selected}
                  aria-disabled={o.disabled || undefined}
                  data-active={i === active || undefined}
                  onMouseMove={() => {
                    if (!o.disabled && i !== active) setActive(i);
                  }}
                  onClick={() => pick(i)}
                >
                  <span className="menu-value">{o.label}</span>
                  {i === selected ? (
                    <CheckIcon className="menu-tick" strokeWidth={2.2} aria-hidden />
                  ) : null}
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
