"use client";

import { useState } from "react";
import { isOctc as formIsOctc, type FormState } from "@/lib/formState";
import { t, type Lang } from "@/lib/i18n";
import type { SelectInput } from "@/lib/types";
import { CardHead, DecimalInput, Field, FieldSelect, PickOrType, controlClass } from "./fields";
import type { FormActions } from "./useFormActions";

const SAFETY_K_OPTIONS = [
  1, 1.1, 1.15, 1.2, 1.25, 1.3, 1.35, 1.4, 1.5, 1.6, 1.7, 1.8,
] as const;

const GRADES = ["B", "C", "D", "DE"] as const;

/** The selector's inner distances (brochure Table 4-2), each with LI and AC. */
const DISTANCES = [
  { id: "a", label: "insulA", li: "acrossTapBilKv", pf: "acrossTapPfKv" },
  { id: "b", label: "insulB", li: "insulBBilKv", pf: "insulBPfKv" },
  { id: "c1", label: "insulC1", li: "insulC1BilKv", pf: "insulC1PfKv" },
  { id: "c2", label: "insulC2", li: "insulC2BilKv", pf: "insulC2PfKv" },
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
  const { patch, pickSelectorGrade, setOffCircuit, setArc, setMounting, commitSafetyK } = actions;
  const isOctc = formIsOctc(form);
  const [safetyKCustom, setSafetyKCustom] = useState(false);
  const [fillOpen, setFillOpen] = useState(false);
  // b and c2 are between phases; c1 and c2 sit on the change-over selector.
  const threePhase = !isOctc && input.phases === "III";
  const changeOver = !isOctc && input.regulation !== "linear";
  const distances = DISTANCES.filter(
    (d) =>
      d.id === "a" ||
      (d.id === "b" && threePhase) ||
      (d.id === "c1" && changeOver) ||
      (d.id === "c2" && threePhase && changeOver),
  );
  const fill =
    fillOpen || distances.some((d) => (input[d.li] ?? 0) > 0 || (input[d.pf] ?? 0) > 0);
  const typed = input.selectorSize;
  const grade = !isOctc && GRADES.some((g) => g === typed) ? typed : "auto";
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

          <Field label={t(lang, "selectorSize")}>
            <FieldSelect
              className={controlClass}
              value={fill ? "fill" : grade}
              onChange={(e) => {
                const v = e.target.value;
                setFillOpen(v === "fill");
                // A letter or Auto drops the typed values: the two never disagree.
                pickSelectorGrade(v === "fill" ? "auto" : (v as SelectInput["selectorSize"]));
              }}
            >
              <option value="auto">{t(lang, "auto")}</option>
              {isOctc
                ? null
                : GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
              <option value="fill">{t(lang, "gradeFill")}</option>
            </FieldSelect>
          </Field>
          {fill
            ? distances.map((d) => (
                <Field key={d.id} as="div" className="row-pair" label={t(lang, d.label)}>
                  <DecimalInput
                    className={controlClass}
                    label={`${d.id} ${t(lang, "insulLi")} kV`}
                    placeholder={t(lang, "insulLi")}
                    value={input[d.li] ?? 0}
                    onValue={(n) => patch(d.li, n > 0 ? n : undefined)}
                  />
                  <DecimalInput
                    className={controlClass}
                    label={`${d.id} ${t(lang, "insulAc")} kV`}
                    placeholder={t(lang, "insulAc")}
                    value={input[d.pf] ?? 0}
                    onValue={(n) => patch(d.pf, n > 0 ? n : undefined)}
                  />
                  <span className="row-unit">kV</span>
                </Field>
              ))
            : null}
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
