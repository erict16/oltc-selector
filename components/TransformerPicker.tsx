"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { t, type Lang } from "@/lib/i18n";
import {
  TAP_POINTS_FOR,
  type TapPoint,
  type TransformerKind,
  type WindingConnection,
} from "@/lib/transformer";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/**
 * One-phase schematic in IEC 60617 style: windings as coil loops, the
 * regulating winding with its tap leads and the selector contact. Coordinates
 * are in a 240 × 236 box; the main column runs at X.
 */
const X = 104;
const TAP_N = 5; // tap leads drawn on the regulating winding
const TAP_PITCH = 8;
const SLOT = TAP_PITCH * (TAP_N - 1) + 8; // 40: regulating winding slot length
const PIVOT = { x: 36, y: 27 }; // selector pivot, slot-local
const TAP_HIT = 1; // tap the contact rests on

/** Middle of each slot, global coordinates. */
const SLOT_AT: Record<TapPoint, { x: number; y: number; dir: "down" | "right" }> = {
  line_end: { x: X, y: 28, dir: "down" },
  neutral: { x: X, y: 160, dir: "down" },
  auto_junction: { x: X, y: 92, dir: "down" },
  auto_mv_line: { x: 150, y: 152, dir: "right" },
};

function fmtKv(kv: number): string {
  if (!(kv > 0)) return "—";
  const r = Math.round(kv * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/** Slot-local point to global, for a slot that starts at (x, y). */
function toGlobal(slot: TapPoint, lx: number, ly: number) {
  const s = SLOT_AT[slot];
  return s.dir === "down" ? { x: s.x + lx, y: s.y + ly } : { x: s.x + ly, y: s.y - lx };
}

function slotMid(slot: TapPoint) {
  return toGlobal(slot, 0, SLOT / 2);
}

const INK = "stroke-[var(--color-ink-2)]";

/** Main winding: n loops bulging left, from (X, y) downwards. */
function Winding({ y, loops }: { y: number; loops: number }) {
  const r = 5;
  let d = `M${X} ${y}`;
  for (let i = 0; i < loops; i++) d += ` a${r} ${r} 0 0 0 0 ${2 * r}`;
  return <path d={d} fill="none" className={INK} strokeWidth={1.6} strokeLinejoin="round" />;
}

function Wire({ d, faint }: { d: string; faint?: boolean }) {
  return (
    <path
      d={d}
      fill="none"
      className={faint ? "stroke-[var(--color-rule-2)]" : INK}
      strokeWidth={faint ? 1.2 : 1.6}
      strokeDasharray={faint ? "3 3" : undefined}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function Node({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={2.6} className="fill-[var(--color-ink-2)]" />;
}

function Terminal({
  x,
  y,
  label,
  lx,
  ly,
  anchor = "start",
}: {
  x: number;
  y: number;
  label: string;
  lx: number;
  ly: number;
  anchor?: "start" | "end" | "middle";
}) {
  return (
    <g>
      <circle cx={x} cy={y} r={4.5} className={`fill-white ${INK}`} strokeWidth={1.6} />
      <text
        x={lx}
        y={ly}
        textAnchor={anchor}
        className="fill-[var(--color-ink)] text-[11px] font-medium tabular-nums"
      >
        {label}
      </text>
    </g>
  );
}

/**
 * Regulating winding with tap leads and the selector contact, slot-local:
 * the winding runs from (0,0) to (0,SLOT), leads point to +x.
 */
function Regulator({ slot }: { slot: TapPoint }) {
  const s = SLOT_AT[slot];
  const r = TAP_PITCH / 2;
  let d = "M0 0 V4";
  for (let i = 0; i < TAP_N - 1; i++) d += ` a${r} ${r} 0 0 0 0 ${TAP_PITCH}`;
  d += ` V${SLOT}`;
  const taps = Array.from({ length: TAP_N }, (_, i) => 4 + i * TAP_PITCH);
  const tip = { x: 15, y: taps[TAP_HIT]! };
  const len = Math.hypot(tip.x - PIVOT.x, tip.y - PIVOT.y);
  const ux = (tip.x - PIVOT.x) / len;
  const uy = (tip.y - PIVOT.y) / len;
  const bx = tip.x - ux * 5.5;
  const by = tip.y - uy * 5.5;
  const head = `${tip.x},${tip.y} ${bx - uy * 2.6},${by + ux * 2.6} ${bx + uy * 2.6},${by - ux * 2.6}`;
  const transform =
    s.dir === "down" ? `translate(${s.x} ${s.y})` : `translate(${s.x} ${s.y}) rotate(-90)`;
  return (
    <g transform={transform} className="regulator">
      <path d={d} fill="none" className="stroke-[var(--color-accent)]" strokeWidth={1.6} />
      {taps.map((ty) => (
        <g key={ty}>
          <line x1={0} x2={13} y1={ty} y2={ty} className="stroke-[var(--color-accent)]" strokeWidth={1.1} />
          <circle cx={14.5} cy={ty} r={1.6} className="fill-[var(--color-accent)]" />
        </g>
      ))}
      <line
        x1={PIVOT.x}
        y1={PIVOT.y}
        x2={bx}
        y2={by}
        className="stroke-[var(--color-accent)]"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <polygon points={head} className="fill-[var(--color-accent)]" />
      <circle cx={PIVOT.x} cy={PIVOT.y} r={2.6} className="fill-white stroke-[var(--color-accent)]" strokeWidth={1.4} />
    </g>
  );
}

function Spot({
  point,
  label,
  selected,
  onPick,
  labelAt,
  anchor,
}: {
  point: TapPoint;
  label: string;
  selected: boolean;
  onPick: (p: TapPoint) => void;
  labelAt: { x: number; y: number };
  anchor: "start" | "end" | "middle";
}) {
  const m = slotMid(point);
  const key = (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onPick(point);
    }
  };
  return (
    <g
      role="radio"
      aria-checked={selected}
      aria-label={label}
      tabIndex={0}
      onClick={() => onPick(point)}
      onKeyDown={key}
      className="tap-spot cursor-pointer outline-none"
    >
      <rect x={m.x - 22} y={m.y - 22} width={44} height={44} fill="transparent" />
      {!selected ? (
        <circle
          cx={m.x}
          cy={m.y}
          r={6}
          className="tap-spot-dot fill-white stroke-[var(--color-accent)]"
          strokeWidth={1.4}
          strokeDasharray="2.4 2.4"
        />
      ) : null}
      <text
        x={labelAt.x}
        y={labelAt.y}
        textAnchor={anchor}
        className={cx(
          "text-[11px] transition-colors duration-150",
          selected ? "fill-[var(--color-accent)] font-semibold" : "fill-[var(--color-muted)]",
        )}
      >
        {label}
      </text>
    </g>
  );
}

/**
 * The wire through a slot: the regulating winding when the tap changer sits
 * there, else a plain conductor. `into` is where the circuit leaves the slot
 * through the selector when it is fitted.
 */
function SlotWire({ slot, on }: { slot: TapPoint; on: boolean }) {
  const a = toGlobal(slot, 0, 0);
  const b = toGlobal(slot, 0, SLOT);
  return on ? <Regulator slot={slot} /> : <Wire d={`M${a.x} ${a.y} L${b.x} ${b.y}`} />;
}

export function TransformerSketch({
  lang,
  kind,
  tapPoint,
  winding,
  tapKv,
  hvKv,
  mvKv,
  onTap,
}: {
  lang: Lang;
  kind: TransformerKind;
  tapPoint: TapPoint;
  winding: WindingConnection;
  tapKv: number;
  hvKv: number;
  mvKv: number;
  onTap: (p: TapPoint) => void;
}) {
  const points = TAP_POINTS_FOR[kind].filter(
    (p) => !(kind === "two_winding" && winding === "delta" && p === "neutral"),
  );
  const pv = toGlobal(tapPoint, PIVOT.x, PIVOT.y);
  const on = (p: TapPoint) => p === tapPoint;
  let body: ReactNode;
  let labels: Partial<Record<TapPoint, { x: number; y: number; anchor: "start" | "end" | "middle" }>>;

  if (kind === "auto") {
    const row = 152; // MV junction row
    const mvEnd = toGlobal("auto_mv_line", 0, SLOT).x;
    body = (
      <>
        <Terminal x={X} y={12} label={`A ${fmtKv(hvKv)} kV`} lx={X - 12} ly={16} anchor="end" />
        <Wire d={`M${X} 16.5 V22`} />
        <Winding y={22} loops={6} />
        <Wire d={`M${X} 82 V92`} />
        <SlotWire slot="auto_junction" on={on("auto_junction")} />
        {on("auto_junction") ? (
          <Wire d={`M${pv.x} ${pv.y} V${row}`} />
        ) : (
          <Wire d={`M${X} 132 V${row}`} />
        )}
        <Wire d={`M${X} ${row} H${SLOT_AT.auto_mv_line.x}`} />
        <SlotWire slot="auto_mv_line" on={on("auto_mv_line")} />
        {on("auto_mv_line") ? (
          <Wire d={`M${pv.x} ${pv.y} H220 V${row - 4.5}`} />
        ) : (
          <Wire d={`M${mvEnd} ${row} H215.5`} />
        )}
        <Terminal x={220} y={row} label={`Am ${fmtKv(mvKv)} kV`} lx={234} ly={row + 22} anchor="end" />
        <Node x={on("auto_junction") ? pv.x : X} y={row} />
        <Wire d={`M${X} ${row} V162`} />
        <Winding y={162} loops={5} />
        <Wire d={`M${X} 212 V222`} />
        <Node x={X} y={224} />
        <text x={X - 10} y={228} textAnchor="end" className="fill-[var(--color-ink)] text-[11px] font-medium">
          N
        </text>
      </>
    );
    labels = {
      auto_junction: { x: X - 16, y: 116, anchor: "end" },
      auto_mv_line: { x: 164, y: row + 22, anchor: "end" },
    };
  } else {
    const delta = winding === "delta";
    body = (
      <>
        {delta ? <Wire d={`M${X} 224 H196 V12 H${X}`} faint /> : null}
        <Terminal x={X} y={12} label={`A ${fmtKv(tapKv)} kV`} lx={X - 12} ly={16} anchor="end" />
        {on("line_end") ? (
          <Wire d={`M${X + 4.5} 12 H${pv.x} V${pv.y}`} />
        ) : (
          <Wire d={`M${X} 16.5 V28`} />
        )}
        <SlotWire slot="line_end" on={on("line_end")} />
        <Wire d={`M${X} 68 V76`} />
        <Winding y={76} loops={8} />
        <Wire d={`M${X} 156 V160`} />
        <SlotWire slot="neutral" on={on("neutral")} />
        {delta ? (
          <>
            <Wire d={`M${X} 200 V219.5`} />
            <Terminal x={X} y={224} label="B" lx={X - 12} ly={228} anchor="end" />
          </>
        ) : (
          <>
            {on("neutral") ? (
              <Wire d={`M${pv.x} ${pv.y} V224 H${X}`} />
            ) : (
              <Wire d={`M${X} 200 V224`} />
            )}
            <Node x={X} y={224} />
            <text x={X - 10} y={228} textAnchor="end" className="fill-[var(--color-ink)] text-[11px] font-medium">
              N
            </text>
          </>
        )}
      </>
    );
    labels = {
      line_end: { x: X - 16, y: 52, anchor: "end" },
      neutral: { x: X - 16, y: 184, anchor: "end" },
    };
  }

  return (
    <svg
      viewBox="0 0 240 236"
      role="radiogroup"
      aria-label={t(lang, "diagramAria")}
      className="block h-auto w-full max-w-[200px] select-none sm:max-w-[272px]"
    >
      {body}
      {points.map((p) => {
        const l = labels[p]!;
        return (
          <Spot
            key={p}
            point={p}
            label={t(lang, `tapShort_${p}`)}
            selected={on(p)}
            onPick={onTap}
            labelAt={l}
            anchor={l.anchor}
          />
        );
      })}
      {(() => {
        const at =
          SLOT_AT[tapPoint].dir === "down"
            ? { x: pv.x + 8, y: pv.y + 4, anchor: "start" as const }
            : { x: pv.x, y: pv.y - 9, anchor: "middle" as const };
        return (
          <text
            x={at.x}
            y={at.y}
            textAnchor={at.anchor}
            className="pointer-events-none fill-[var(--color-accent)] text-[10px] font-semibold tracking-[0.04em]"
          >
            OLTC
          </text>
        );
      })()}
    </svg>
  );
}

export function KindToggle({
  lang,
  kind,
  onKind,
  autoDisabled,
}: {
  lang: Lang;
  kind: TransformerKind;
  onKind: (k: TransformerKind) => void;
  autoDisabled?: boolean;
}) {
  const opts: Array<{ id: TransformerKind; title: string }> = [
    { id: "two_winding", title: t(lang, "kindTwo") },
    { id: "auto", title: t(lang, "kindAuto") },
  ];
  return (
    <div role="radiogroup" aria-label={t(lang, "transformer")} className="ui-track">
      {opts.map((o) => {
        const on = o.id === kind;
        const off = o.id === "auto" && autoDisabled;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={off}
            onClick={() => onKind(o.id)}
            className={cx("ui-seg", on && "is-on")}
          >
            {o.title}
          </button>
        );
      })}
    </div>
  );
}

export function TapList({
  lang,
  kind,
  winding,
  tapPoint,
  onTap,
}: {
  lang: Lang;
  kind: TransformerKind;
  winding: WindingConnection;
  tapPoint: TapPoint;
  onTap: (p: TapPoint) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={t(lang, "tapPoint")}
      className="divide-y divide-[var(--color-rule)] overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] bg-white"
    >
      {TAP_POINTS_FOR[kind].map((p) => {
        const on = p === tapPoint;
        const off = kind === "two_winding" && winding === "delta" && p === "neutral";
        return (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={off}
            onClick={() => onTap(p)}
            className={cx(
              "flex min-h-11 w-full min-w-0 items-center gap-3 px-3 py-2 text-left text-[0.875rem] leading-snug transition-colors duration-150",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-accent)]",
              on
                ? "bg-[color-mix(in_oklch,var(--color-accent)_6%,white)] font-semibold text-[var(--color-ink)]"
                : "text-[var(--color-ink-2)] hover:bg-[var(--color-field)]",
              off && "cursor-not-allowed text-[var(--color-caption)] hover:bg-white",
            )}
          >
            <span
              className={cx(
                "h-4 w-4 shrink-0 rounded-full border bg-white transition-[border-color,border-width] duration-150",
                on ? "border-[5px] border-[var(--color-accent)]" : "border-[var(--color-rule-2)]",
              )}
              aria-hidden
            />
            <span className="min-w-0">{t(lang, `tap_${p}`)}</span>
          </button>
        );
      })}
    </div>
  );
}
