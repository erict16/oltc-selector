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

/** Where each tap point sits on the sketch (viewBox 0 0 240 224). */
const SPOT: Record<TapPoint, { x: number; y: number }> = {
  line_end: { x: 120, y: 44 },
  neutral: { x: 120, y: 168 },
  auto_junction: { x: 120, y: 103 },
  auto_mv_line: { x: 176, y: 116 },
};

function fmtKv(kv: number): string {
  if (!(kv > 0)) return "—";
  const r = Math.round(kv * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

function Coil({ y, h }: { y: number; h: number }) {
  const turns: number[] = [];
  for (let ty = y + 8; ty < y + h - 4; ty += 7) turns.push(ty);
  return (
    <g>
      <rect
        x={106}
        y={y}
        width={28}
        height={h}
        rx={6}
        className="fill-[var(--color-soft)] stroke-[var(--color-ink-2)]"
        strokeWidth={1.4}
      />
      {turns.map((ty) => (
        <line
          key={ty}
          x1={110}
          x2={130}
          y1={ty}
          y2={ty}
          className="stroke-[var(--color-rule-2)]"
          strokeWidth={1.2}
        />
      ))}
    </g>
  );
}

function Terminal({
  x,
  y,
  label,
  anchor = "start",
  dx = 12,
  dy = 4,
}: {
  x: number;
  y: number;
  label: string;
  anchor?: "start" | "end" | "middle";
  dx?: number;
  dy?: number;
}) {
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={5.5}
        className="fill-white stroke-[var(--color-ink-2)]"
        strokeWidth={1.6}
      />
      <text
        x={x + dx}
        y={y + dy}
        textAnchor={anchor}
        className="fill-[var(--color-ink)] font-[family-name:var(--font-mono)] text-[11px] font-medium"
      >
        {label}
      </text>
    </g>
  );
}

function Wire({ d, faint }: { d: string; faint?: boolean }) {
  return (
    <path
      d={d}
      fill="none"
      className={faint ? "stroke-[var(--color-rule-2)]" : "stroke-[var(--color-ink-2)]"}
      strokeWidth={1.6}
      strokeDasharray={faint ? "3 4" : undefined}
      strokeLinecap="round"
    />
  );
}

function Spot({
  point,
  label,
  selected,
  onPick,
  labelSide,
}: {
  point: TapPoint;
  label: string;
  selected: boolean;
  onPick: (p: TapPoint) => void;
  labelSide: "left" | "below";
}) {
  const { x, y } = SPOT[point];
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
      <circle cx={x} cy={y} r={15} fill="transparent" />
      {!selected ? (
        <circle
          cx={x}
          cy={y}
          r={6.5}
          className="tap-spot-dot fill-white stroke-[var(--color-accent)]"
          strokeWidth={1.6}
          strokeDasharray="2.5 2.5"
        />
      ) : null}
      <text
        x={labelSide === "left" ? x - 34 : x}
        y={labelSide === "left" ? y + 3.5 : y + 26}
        textAnchor={labelSide === "left" ? "end" : "middle"}
        className={cx(
          "text-[11px] transition-colors duration-200",
          selected
            ? "fill-[var(--color-accent)] font-semibold"
            : "fill-[var(--color-muted)]",
        )}
      >
        {label}
      </text>
    </g>
  );
}

function OltcChip({ point }: { point: TapPoint }) {
  const { x, y } = SPOT[point];
  return (
    <g
      className="oltc-chip pointer-events-none"
      style={{ transform: `translate(${x}px, ${y}px)` }}
      aria-hidden
    >
      <circle r={13} className="tap-pulse fill-[var(--color-accent)]" />
      <rect
        x={-21}
        y={-9.5}
        width={42}
        height={19}
        rx={9.5}
        className="fill-[var(--color-accent)]"
      />
      <text
        y={3.6}
        textAnchor="middle"
        className="fill-white font-[family-name:var(--font-mono)] text-[9.5px] font-semibold tracking-[0.06em]"
      >
        OLTC
      </text>
    </g>
  );
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
  let body: ReactNode;
  if (kind === "auto") {
    body = (
      <>
        <Terminal x={120} y={18} label={`A ${fmtKv(hvKv)} kV`} />
        <Wire d="M120 23.5 V36" />
        <Coil y={36} h={56} />
        <Wire d="M120 92 V126" />
        <circle cx={120} cy={116} r={3.2} className="fill-[var(--color-ink-2)]" />
        <Wire d="M120 116 H212" />
        <Terminal x={218} y={116} label={`Am ${fmtKv(mvKv)} kV`} anchor="end" dx={0} dy={-12} />
        <Coil y={126} h={56} />
        <Wire d="M120 182 V206" />
        <circle cx={120} cy={208} r={3.2} className="fill-[var(--color-ink-2)]" />
        <text x={130} y={212} className="fill-[var(--color-ink)] font-[family-name:var(--font-mono)] text-[11px] font-medium">
          N
        </text>
        {/* HV impulse travels down the series winding onto the tap point. */}
        <path
          d="M88 22 V100"
          fill="none"
          className="impulse-flow stroke-[var(--color-warn)]"
          strokeWidth={1.6}
          strokeDasharray="5 7"
          strokeLinecap="round"
        />
        <text
          x={82}
          y={60}
          textAnchor="end"
          className="fill-[var(--color-warn)] text-[10.5px] font-medium"
        >
          {t(lang, "impulse")}
        </text>
      </>
    );
  } else if (winding === "delta") {
    body = (
      <>
        <Terminal x={120} y={18} label={`A ${fmtKv(tapKv)} kV`} />
        <Wire d="M120 23.5 V62" />
        <Coil y={62} h={92} />
        <Wire d="M120 154 V200" />
        <Terminal x={120} y={206} label="B" />
        <Wire d="M126 206 H196 V18 H126" faint />
        <text x={202} y={116} className="fill-[var(--color-caption)] text-[9.5px]">
          Δ
        </text>
      </>
    );
  } else {
    body = (
      <>
        <Terminal x={120} y={18} label={`A ${fmtKv(tapKv)} kV`} />
        <Wire d="M120 23.5 V62" />
        <Coil y={62} h={84} />
        <Wire d="M120 146 V190" />
        <circle cx={120} cy={192} r={3.2} className="fill-[var(--color-ink-2)]" />
        <Wire d="M120 192 L92 214 M120 192 L148 214" faint />
        <text x={130} y={196} className="fill-[var(--color-ink)] font-[family-name:var(--font-mono)] text-[11px] font-medium">
          N
        </text>
      </>
    );
  }
  return (
    <svg
      viewBox="34 4 206 216"
      role="radiogroup"
      aria-label={t(lang, "diagramAria")}
      className="block h-auto w-full max-w-[210px] select-none sm:max-w-[300px]"
    >
      {body}
      {points.map((p) => (
        <Spot
          key={p}
          point={p}
          label={t(lang, `tapShort_${p}`)}
          selected={p === tapPoint}
          onPick={onTap}
          labelSide={p === "auto_mv_line" ? "below" : "left"}
        />
      ))}
      <OltcChip point={tapPoint} />
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
              "flex h-10 w-full min-w-0 items-center gap-3 px-3 text-left text-[0.875rem] transition-colors duration-150",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-accent)]",
              on
                ? "bg-[color-mix(in_oklch,var(--color-accent)_7%,white)] font-semibold text-[var(--color-ink)]"
                : "text-[var(--color-ink-2)] hover:bg-[var(--color-field)]",
              off && "cursor-not-allowed text-[var(--color-caption)] hover:bg-white",
            )}
          >
            <span
              className={cx(
                "h-3.5 w-3.5 shrink-0 rounded-full border transition-[border-color,border-width] duration-150",
                on
                  ? "border-[4px] border-[var(--color-accent)] bg-white"
                  : "border-[var(--color-rule-2)] bg-white",
              )}
              aria-hidden
            />
            <span className="min-w-0 truncate">{t(lang, `tap_${p}`)}</span>
          </button>
        );
      })}
    </div>
  );
}
