"use client";

import { SERIES } from "@/lib/catalog";
import { formatUmKv } from "@/lib/deriveUm";
import { t, type Lang } from "@/lib/i18n";
import type { DutyBasis } from "@/lib/transformer";
import type { ModelResult, SelectInput, StructureKind } from "@/lib/types";
import { cx } from "./fields";

/** Share of a rating the duty uses; null when either side is missing. */
function useOf(need: number | null, rating: number | null | undefined): number | null {
  if (need == null || rating == null || !(need > 0) || !(rating > 0)) return null;
  return need / rating;
}

/**
 * Duty beside the chosen type's rating, one row per axis the engine checks.
 * The bar shows how much of the rating the duty takes.
 */
export function BasisTable({
  lang,
  duty,
  dutyA,
  stepV,
  model,
}: {
  lang: Lang;
  duty: DutyBasis;
  dutyA: number | null;
  stepV: number;
  model: ModelResult | null;
}) {
  const ok = duty.ok;
  const a = dutyA != null && dutyA > 0 ? dutyA : null;
  const u = ok && stepV > 0 ? stepV : null;
  const kva = a != null && u != null ? (a * u) / 1000 : null;
  // Every row is one line: name, duty, rating, use. Insulation is not here:
  // it is a class, not a load, so its bar always read 97–100 % (145 / 145)
  // and looked like a limit reached (2026-11-14 Eric). The class and its
  // withstand levels are in the type's Um cell.
  const rows: Array<{
    key: string;
    label: string;
    need: string;
    unit: string;
    rating: string | null;
    use: number | null;
  }> = [
    {
      key: "i",
      label: t(lang, "kpiImax"),
      need: a != null ? round1(a) : "—",
      unit: "A",
      rating: model ? `${model.currentA}` : null,
      use: useOf(a, model?.currentA),
    },
    {
      key: "u",
      label: t(lang, "kpiUst"),
      need: u != null ? round1(u) : "—",
      unit: "V",
      rating: model?.maxStepVoltageV != null ? `${model.maxStepVoltageV}` : null,
      use: useOf(u, model?.maxStepVoltageV),
    },
    {
      key: "p",
      label: t(lang, "specPsin"),
      need: kva != null ? round1(kva) : "—",
      unit: "kVA",
      rating: model?.stepCapacityKva != null ? `${model.stepCapacityKva}` : null,
      use: useOf(kva, model?.stepCapacityKva),
    },
  ];
  return (
    <dl className="basis">
      {rows
        // Off-circuit types carry no step rating; a row of dashes says nothing.
        .filter((r) => !(model && r.rating == null))
        .map((r) => {
          const pct = r.use != null ? Math.round(r.use * 100) : null;
          const tone =
            r.use == null ? "" : r.use > 1 ? "is-over" : r.use >= 0.95 ? "is-tight" : "";
          return (
            <div key={r.key} className={cx("basis-row", tone)}>
              <dt>{r.label}</dt>
              <dd className="num">
                <b>{r.need}</b>
                {r.rating != null ? <span> / {r.rating}</span> : null}
                <span className="basis-unit">{r.unit}</span>
                {pct != null ? <span className="basis-pct">{pct}%</span> : null}
              </dd>
              {pct != null ? (
                <span className="basis-bar" aria-hidden>
                  <i style={{ transform: `scaleX(${Math.min(100, pct) / 100})` }} />
                </span>
              ) : null}
            </div>
          );
        })}
    </dl>
  );
}

export function round1(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/** Break a type string after "-" and "/", never in the middle of a token. */
export function modelNodes(model: string) {
  return model.split(/([-/])/).map((part, i) =>
    part === "-" || part === "/" ? (
      <span key={i}>
        {part}
        <wbr />
      </span>
    ) : (
      part
    ),
  );
}

/**
 * The type string read aloud: one cell per coded part, with what it means.
 * Cut from the shown string, so the domestic spelling keeps its own letters.
 */
export function TypeSegments({ lang, r, shown }: { lang: Lang; r: ModelResult; shown: string }) {
  const series = SERIES.find((s) => s.id === r.seriesId);
  const at = shown.lastIndexOf(`-${r.currentA}`);
  if (at < 0) return null;
  const head = shown.slice(0, at);
  // Off-circuit types carry a wiring roman (WSLIV), not a phase count,
  // and switch no arc: the family cell says the construction only.
  const offCircuit = series?.structure === "cage" || series?.structure === "drum";
  const wiring = offCircuit ? head.match(/^(.*?)(VIII|VII|VI|IV|IX|V|III|II|I)$/) : null;
  const family = wiring
    ? wiring[1]
    : head.endsWith(r.phases)
      ? head.slice(0, -r.phases.length)
      : head;
  const cells: Array<{ code: string; says: string }> = [
    {
      code: family,
      says: offCircuit
        ? t(lang, structureLabelKey(series?.structure))
        : `${t(lang, series?.vacuum ? "specVac" : "specOil")} · ${t(lang, structureLabelKey(series?.structure))}`,
    },
  ];
  if (wiring) cells.push({ code: wiring[2], says: t(lang, "octcSeries") });
  else if (family !== head) cells.push({ code: r.phases, says: t(lang, "phases") });
  cells.push({ code: String(r.currentA), says: "A" });
  // The rest is cut from the string as shown: a single-phase type has no
  // Y/D after the current, and a reactor type ends in its own step count.
  const rest = shown.slice(at + 1 + String(r.currentA).length);
  const m = rest.match(/^([YD])?\/([^-]+)-(.+)$/);
  if (!m) return null;
  if (m[1]) {
    cells.push({ code: m[1], says: t(lang, m[1] === "Y" ? "windingStar" : "windingDelta") });
  }
  // The withstand levels belong to the Um class, so they sit under it,
  // spelled as the form's own insulation menu spells them (2026-11-14).
  const withstand =
    r.earthPfKv != null && r.earthBilKv != null ? ` · ${r.earthPfKv} / ${r.earthBilKv}` : "";
  cells.push({ code: m[2], says: `Um kV${withstand}` });
  // A type that ends in a bare count (reactor HWDK …-17, dry CZ) states its
  // own positions; the caption must not print another number under it.
  const count = /^\d+$/.test(m[3]) ? Number(m[3]) : r.positions;
  cells.push({ code: m[3], says: `${t(lang, "positions")} ${count}` });
  // Where each coded part sits in the shown string, in characters. The type
  // is set in a monospaced face, so a character is one `ch` wide and the
  // key below can hang a leader from the middle of each part.
  let from = 0;
  const placed = cells.map((c) => {
    const start = c.code ? shown.indexOf(c.code, from) : -1;
    if (start >= 0) from = start + c.code.length;
    return { ...c, start, len: c.code.length };
  });
  const keyed = placed.every((c) => c.start >= 0);
  return (
    <>
      <dl className={cx("type-segs", keyed && "has-key")} translate="no">
        {cells.map((c, i) => (
          <div key={i}>
            <dt>{c.code}</dt>
            <dd>{c.says}</dd>
          </div>
        ))}
      </dl>
      {/* The type explained the way the catalogue's 型号说明 figure does it:
          a bracket under each coded part and a leader down to what it says.
          Wide cards only; it repeats the list above, so it is hidden from
          screen readers and the list is hidden from the eye. */}
      {keyed ? (
        <div
          className="type-key"
          aria-hidden
          translate="no"
          style={{ "--rows": placed.length } as React.CSSProperties}
        >
          {placed.map((c, i) => (
            <div
              key={i}
              className="tk"
              style={
                {
                  "--s": c.start,
                  "--l": c.len,
                  "--k": placed.length - 1 - i,
                } as React.CSSProperties
              }
            >
              <i className="tk-bracket" />
              <i className="tk-leader" />
              <span className="tk-row">
                {/* A bare unit reads better with its number: "350 A". */}
                <span className="tk-says">
                  {/^[A-Za-z]{1,3}$/.test(c.says) ? `${c.code} ${c.says}` : c.says}
                </span>
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}

function mountLabelKey(m: SelectInput["mounting"]): string {
  switch (m) {
    case "on_tank":
      return "mountOn";
    case "external_compartment":
      return "mountExt";
    case "dry_type":
      return "mountDry";
    case "reactor":
      return "mountReactor";
    default:
      return "mountIn";
  }
}

function structureLabelKey(structure: StructureKind | undefined): string {
  switch (structure) {
    case "combined":
      return "specCombined";
    case "compound":
      return "specCompound";
    case "cage":
      return "specCage";
    case "drum":
      return "specDrum";
    default:
      return "specCompound";
  }
}

export function ModelSpec({
  lang,
  r,
  dutyMounting,
  compact,
  hideRatings,
  inline,
}: {
  lang: Lang;
  r: ModelResult;
  dutyMounting: SelectInput["mounting"];
  compact?: boolean;
  /** The basis table already shows max Ust and step capacity. */
  hideRatings?: boolean;
  /** Under the loads of the chosen type: two columns, no padding of its own. */
  inline?: boolean;
}) {
  const nb = "\u00a0";
  const series = SERIES.find((s) => s.id === r.seriesId);
  const vacuum = series?.vacuum === true;
  const mount =
    series?.mounting.includes(dutyMounting)
      ? dutyMounting
      : (series?.mounting[0] ?? dutyMounting);
  const offCircuit = series?.structure === "cage" || series?.structure === "drum";
  const items: Array<{ key: string; value: string }> = offCircuit
    ? []
    : [
        {
          key: "specArc",
          value: t(lang, vacuum ? "specVac" : "specOil"),
        },
      ];
  if (!hideRatings && r.maxStepVoltageV != null) {
    items.push({ key: "specUst", value: `${r.maxStepVoltageV}${nb}V` });
  }
  if (!hideRatings && r.stepCapacityKva != null) {
    items.push({ key: "specPsin", value: `${r.stepCapacityKva}${nb}kVA` });
  }
  items.push({
    key: "specStructure",
    value: t(lang, structureLabelKey(series?.structure)),
  });
  if (r.earthPfKv != null && r.earthBilKv != null) {
    items.push({
      key: "specEarth",
      value: `Um${nb}${formatUmKv(r.umKv)} · ${r.earthPfKv}${nb}/${nb}${r.earthBilKv}${nb}kV`,
    });
  }
  items.push({
    key: "mounting",
    value: t(lang, mountLabelKey(mount)),
  });

  return (
    <dl
      className={cx(
        "grid grid-cols-2 gap-x-5",
        inline
          ? "spec-inline gap-y-4"
          : cx(
              "gap-y-3",
              hideRatings ? "sm:grid-cols-4" : "sm:grid-cols-3",
              compact ? "pt-1 pr-5 pb-4 pl-11 sm:pr-8 sm:pl-14" : "px-5 py-4 sm:px-8",
            ),
      )}
    >
      {items.map((item) => (
        <div key={item.key} className="min-w-0">
          <dt className="text-[0.75rem] leading-snug break-words text-[var(--color-muted)]">
            {t(lang, item.key)}
          </dt>
          <dd
            className="mt-0.5 text-[0.875rem] leading-snug tabular-nums text-[var(--color-ink)]"
            translate="no"
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
