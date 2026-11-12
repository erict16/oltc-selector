"use client";

import { useState } from "react";
import {
  ACROSS_BIL_MENU,
  ACROSS_BIL_OPTIONS_KV,
  ACROSS_PF_MENU,
  ACROSS_PF_OPTIONS_KV,
} from "@/lib/catalog";
import { isOctc as formIsOctc, type FormState } from "@/lib/formState";
import { currentLabel, t, type Lang } from "@/lib/i18n";
import type { SelectInput } from "@/lib/types";
import { UpSelect } from "@/components/UpSelect";
import { CardHead, Field, FieldSelect, PickOrType, controlClass } from "./fields";
import type { FormActions } from "./useFormActions";

const SAFETY_K_OPTIONS = [
  1, 1.1, 1.15, 1.2, 1.25, 1.3, 1.35, 1.4, 1.5, 1.6, 1.7, 1.8,
] as const;

/** Card 3: on-load or off-circuit, interrupter, construction, mounting, insulation, safety factor. */
export function SwitchSection({
  lang,
  form,
  actions,
}: {
  lang: Lang;
  form: FormState;
  actions: FormActions;
}) {
  const { input, safetyK } = form;
  const { patch, setOffCircuit, setArc, setMounting, commitSafetyK } = actions;
  const isOctc = formIsOctc(form);
  const [safetyKCustom, setSafetyKCustom] = useState(false);
  return (
    <section aria-label={t(lang, "cardSwitch")} className="sheet-section">
      <CardHead title={t(lang, "cardSwitch")} />
      <div id="switch-fields" className="rows rows-2">
          <Field label={t(lang, "dutyKind")}>
            <FieldSelect
              className={controlClass}
              value={input.dutyKind ?? "oltc"}
              // 2026-11-04 (r2 UI-2…4): a switch re-maps the read line
              // for the new mode and leaves no ±2 or winding behind.
              onChange={(e) => setOffCircuit(e.target.value === "octc")}
            >
              <option value="oltc">{t(lang, "dutyOltc")}</option>
              <option value="octc">{t(lang, "dutyOctc")}</option>
            </FieldSelect>
          </Field>
          {!isOctc && input.mounting !== "dry_type" && input.mounting !== "reactor" ? (
            <Field label={t(lang, "arcMode")}>
              <FieldSelect
                className={controlClass}
                value={input.preferVacuum ? "vac" : "oil"}
                onChange={(e) => setArc(e.target.value === "vac")}
              >
                <option value="vac">{t(lang, "arcVac")}</option>
                <option value="oil">{t(lang, "arcOil")}</option>
              </FieldSelect>
            </Field>
          ) : null}
          <Field label={t(lang, "specStructure")}>
            <FieldSelect
              className={controlClass}
              value={input.preferStructure ?? "auto"}
              onChange={(e) =>
                patch(
                  "preferStructure",
                  e.target.value as SelectInput["preferStructure"],
                )
              }
            >
              <option value="auto">{t(lang, "auto")}</option>
              {isOctc ? (
                <>
                  <option value="cage">{t(lang, "specCage")}</option>
                  <option value="drum">{t(lang, "specDrum")}</option>
                </>
              ) : (
                <>
                  <option value="compound">
                    {t(lang, "specCompound")}
                  </option>
                  <option value="combined">
                    {t(lang, "specCombined")}
                  </option>
                </>
              )}
            </FieldSelect>
          </Field>

          <Field label={t(lang, "mounting")}>
            <FieldSelect
              className={controlClass}
              value={input.mounting}
              onChange={(e) => setMounting(e.target.value as SelectInput["mounting"])}
            >
              <option value="in_tank">{t(lang, "mountIn")}</option>
              <option value="on_tank">{t(lang, "mountOn")}</option>
              <option value="external_compartment">
                {t(lang, "mountExt")}
              </option>
              <option value="dry_type">{t(lang, "mountDry")}</option>
              <option value="reactor">
                {t(lang, "mountReactor")}
              </option>
            </FieldSelect>
          </Field>

          <Field as="div" className="row-wide" label={t(lang, "acrossInsul")}>
            <div className="flex min-w-0 flex-1 gap-1">
              <UpSelect
                label={t(lang, "acrossBil")}
                value={
                  input.acrossTapBilKv != null &&
                  input.acrossTapBilKv > 0
                    ? String(input.acrossTapBilKv)
                    : ""
                }
                onChange={(raw) =>
                  patch(
                    "acrossTapBilKv",
                    raw === "" ? undefined : Number(raw),
                  )
                }
                options={[
                  { value: "", label: t(lang, "acrossUnset") },
                  ...(input.acrossTapBilKv != null &&
                  input.acrossTapBilKv > 0 &&
                  !(ACROSS_BIL_OPTIONS_KV as readonly number[]).includes(
                    input.acrossTapBilKv,
                  )
                    ? [
                        {
                          value: String(input.acrossTapBilKv),
                          label: `${input.acrossTapBilKv} kV`,
                        },
                      ]
                    : []),
                  ...ACROSS_BIL_MENU.map((item) => ({
                    value: String(item.value),
                    label: currentLabel(lang, item.labelZh, item.labelEn),
                  })),
                ]}
              />
              <UpSelect
                label={t(lang, "acrossPf")}
                value={
                  input.acrossTapPfKv != null &&
                  input.acrossTapPfKv > 0
                    ? String(input.acrossTapPfKv)
                    : ""
                }
                onChange={(raw) =>
                  patch(
                    "acrossTapPfKv",
                    raw === "" ? undefined : Number(raw),
                  )
                }
                options={[
                  { value: "", label: t(lang, "acrossUnset") },
                  ...(input.acrossTapPfKv != null &&
                  input.acrossTapPfKv > 0 &&
                  !(ACROSS_PF_OPTIONS_KV as readonly number[]).includes(
                    input.acrossTapPfKv,
                  )
                    ? [
                        {
                          value: String(input.acrossTapPfKv),
                          label: `${input.acrossTapPfKv} kV`,
                        },
                      ]
                    : []),
                  ...ACROSS_PF_MENU.map((item) => ({
                    value: String(item.value),
                    label: currentLabel(lang, item.labelZh, item.labelEn),
                  })),
                ]}
              />
            </div>
          </Field>
          <Field label={t(lang, "safetyK")}>
            <PickOrType
              lang={lang}
              value={safetyK > 0 ? safetyK : 1}
              options={SAFETY_K_OPTIONS}
              optionLabel={(n) => `×${n}`}
              prefix="×"
              custom={safetyKCustom}
              onCustom={setSafetyKCustom}
              onValue={commitSafetyK}
            />
          </Field>
      </div>
    </section>
  );
}
