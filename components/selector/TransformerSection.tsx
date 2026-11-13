"use client";

import { EARTH_INSULATION } from "@/lib/catalog";
import { formatUmKv } from "@/lib/deriveUm";
import { isOctc as formIsOctc, type FormState } from "@/lib/formState";
import { t, type Lang } from "@/lib/i18n";
import {
  TAP_POINTS_FOR,
  type TapPoint,
  type TransformerKind,
  type WindingConnection,
} from "@/lib/transformer";
import { CardHead, Field, FieldSelect, KvField, controlClass } from "./fields";
import type { FormActions } from "./useFormActions";
import type { Selection } from "./useSelection";

/** Catalogue Um classes offered when the OS states the switch insulation. */
const EARTH_UM_OPTIONS = [40.5, 72.5, 126, 145, 170, 252, 300, 363] as const;

/**
 * One spelling for an insulation class everywhere it is picked: the Um plus
 * the AC / LI a tender states, written like the card's 对地工频/雷电 value.
 */
function earthUmLabel(um: number): string {
  const e = EARTH_INSULATION[um];
  const kv = `${formatUmKv(um)} kV`;
  return e ? `${kv} · ${e.pf} / ${e.bil}` : kv;
}

/** Card 1: what the transformer is and where the switch sits. */
export function TransformerSection({
  lang,
  form,
  actions,
  sel,
}: {
  lang: Lang;
  form: FormState;
  actions: FormActions;
  sel: Selection;
}) {
  const { kind, tapPoint, winding, hvKv, mvKv, windingRatedKv, earthUm } = form;
  const { pickKind, pickTap, pickWinding, setHvKv, setMvKv, setVoltageKv, setEarthUm } = actions;
  const { ruleDuty } = sel;
  const isOctc = formIsOctc(form);
  return (
    <section aria-label={t(lang, "transformer")} className="sheet-section">
      {isOctc ? (
        <p id="auto-octc-note" className="sr-only">
          {t(lang, "autoOctcNote")}
        </p>
      ) : null}
      <CardHead title={t(lang, "transformer")} />
      <div className="rows rows-2">
          <Field label={t(lang, "kindLabel")}>
            <FieldSelect
              className={controlClass}
              value={kind}
              aria-describedby={isOctc ? "auto-octc-note" : undefined}
              onChange={(e) => pickKind(e.target.value as TransformerKind)}
            >
              <option value="two_winding">{t(lang, "kindTwo")}</option>
              <option value="auto" disabled={isOctc}>
                {t(lang, "kindAuto")}
              </option>
            </FieldSelect>
          </Field>
          <Field label={t(lang, "tapPoint")}>
            <FieldSelect
              className={controlClass}
              value={tapPoint}
              aria-describedby={
                kind === "two_winding" && winding === "delta"
                  ? "delta-no-neutral"
                  : undefined
              }
              onChange={(e) => pickTap(e.target.value as TapPoint)}
            >
              {TAP_POINTS_FOR[kind].map((p) => (
                <option
                  key={p}
                  value={p}
                  disabled={
                    kind === "two_winding" && winding === "delta" && p === "neutral"
                  }
                >
                  {t(lang, `tap_${p}`)}
                </option>
              ))}
            </FieldSelect>
            {kind === "two_winding" && winding === "delta" ? (
              <span id="delta-no-neutral" className="sr-only">
                {t(lang, "deltaNoNeutral")}
              </span>
            ) : null}
          </Field>
          {kind === "two_winding" ? (
            <Field label={t(lang, "winding")}>
              <FieldSelect
                className={controlClass}
                value={winding}
                onChange={(e) => pickWinding(e.target.value as WindingConnection)}
              >
                <option value="star">{t(lang, "windingStar")}</option>
                <option value="delta">{t(lang, "windingDelta")}</option>
              </FieldSelect>
            </Field>
          ) : null}
          {kind === "auto" ? (
            <>
              <KvField
                lang={lang}
                label={t(lang, "hvKv")}
                kvValue={hvKv}
                onKv={setHvKv}
              />
              <KvField
                lang={lang}
                label={t(lang, "mvKv")}
                kvValue={mvKv}
                onKv={setMvKv}
              />
            </>
          ) : (
            <KvField
              lang={lang}
              label={t(lang, "umWinding")}
              kvValue={windingRatedKv}
              onKv={setVoltageKv}
            />
          )}
          <Field label={t(lang, "earthUm")}>
            <FieldSelect
              className={controlClass}
              value={String(earthUm)}
              onChange={(e) => {
                setEarthUm(Number(e.target.value));
              }}
            >
              <option value="0">
                {ruleDuty.ok
                  ? t(lang, "earthRule", { um: `${formatUmKv(ruleDuty.umKv)} kV` })
                  : t(lang, "earthRuleNone")}
              </option>
              {EARTH_UM_OPTIONS.map((u) => (
                <option key={u} value={String(u)}>
                  {earthUmLabel(u)}
                </option>
              ))}
            </FieldSelect>
          </Field>
      </div>
    </section>
  );
}
