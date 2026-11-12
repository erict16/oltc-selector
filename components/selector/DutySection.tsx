"use client";

import {
  CURRENT_OPTIONS_A,
  STEP_VOLTAGE_MENU,
  STEP_VOLTAGE_OPTIONS_V,
} from "@/lib/catalog";
import { isOctc as formIsOctc, type FormState } from "@/lib/formState";
import { currentLabel, t, type Lang } from "@/lib/i18n";
import { parseTypeString } from "@/lib/parseType";
import { midControl, pmStepOptionsFor } from "@/lib/tapCode";
import { OCTC_SERIES_ROMANS, type SelectInput } from "@/lib/types";
import { CardHead, Field, FieldSelect, PickOrType, controlClass } from "./fields";
import type { FormActions } from "./useFormActions";
import type { Selection } from "./useSelection";

const MVA_OPTIONS = [
  16, 25, 31.5, 40, 50, 63, 80, 100, 160, 250, 400, 500,
] as const;
const STEP_PERCENT_OPTIONS = [
  0.5, 0.625, 0.8, 1, 1.25, 1.5, 1.67, 2, 2.25, 2.5, 2.75, 3, 3.33, 4, 5, 6.25,
  7.5, 10,
] as const;
const TAP_SIDE_OPTIONS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
] as const;

/** Card 2: capacity or current, regulation, range, step, phases. */
export function DutySection({
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
  const { input, pm, tapPlus, tapMinus, stepPercentPct, stepPctCustom, currentMode, transformerMva, mvaCustom } = form;
  const {
    patch,
    setTransformerMva,
    setMvaCustom,
    setCurrentEntry,
    setRegulation,
    applyPm,
    setStepPct,
    setStepPctCustom,
    setTapSide,
    applyMid,
    pickPhases,
  } = actions;
  const { primary, ustV } = sel;
  const isOctc = formIsOctc(form);
  const isLinear = isOctc || input.regulation === "linear";
  const pmOptions = pmStepOptionsFor(input.regulation);
  const pmN =
    pm && Number(pm) > 0
      ? Number(pm)
      : input.plusMinusSteps && input.plusMinusSteps > 0
        ? input.plusMinusSteps
        : null;
  const midCtrl = !pm
    ? { show: false, options: [] as Array<1 | 3> }
    : midControl(pmN, input.regulation, input.positions);
  const midOpts = midCtrl.options;
  return (
    <section aria-label={t(lang, "cardDuty")} className="sheet-section">
      <CardHead title={t(lang, "cardDuty")} />
      <div className="rows rows-2">
    <Field
      label={
        currentMode === "capacity"
          ? t(lang, "transformerMva")
          : t(lang, "throughCurrent")
      }
    >
      {currentMode === "capacity" ? (
        <PickOrType
          lang={lang}
          value={transformerMva}
          options={MVA_OPTIONS}
          optionLabel={(n) => `${n} MVA`}
          unit="MVA"
          placeholder={t(lang, "mvaPlaceholder")}
          custom={mvaCustom}
          onCustom={setMvaCustom}
          // 2026-11-07: "12,5" read as 125 in a type=number field.
          onValue={setTransformerMva}
          extra={[
            {
              value: "__current__",
              label: t(lang, "switchToCurrent"),
              onPick: () => setCurrentEntry("current"),
            },
          ]}
        />
      ) : (
        <PickOrType
          lang={lang}
          value={input.throughCurrentA}
          options={CURRENT_OPTIONS_A}
          optionLabel={(n) => `${n} A`}
          unit="A"
          groupedError={t(lang, "groupedNumber")}
          onValue={(n) => patch("throughCurrentA", n)}
          extra={[
            {
              value: "__capacity__",
              label: t(lang, "switchToCapacity"),
              onPick: () => setCurrentEntry("capacity"),
            },
          ]}
        />
      )}
    </Field>



    {isOctc ? (
      <Field label={t(lang, "octcSeries")}>
        <FieldSelect
          className={controlClass}
          value={input.octcSeries ?? "auto"}
          onChange={(e) =>
            patch(
              "octcSeries",
              e.target.value as SelectInput["octcSeries"],
            )
          }
        >
          <option value="auto">
            {(() => {
              const roman = primary
                ? parseTypeString(primary.model)?.phases
                : undefined;
              return roman
                ? `${t(lang, "auto")} · ${roman}`
                : t(lang, "auto");
            })()}
          </option>
          {OCTC_SERIES_ROMANS.map((r) => (
            <option key={r} value={r}>
              {t(lang, `octc${r}`)}
            </option>
          ))}
        </FieldSelect>
      </Field>
    ) : (
      <Field label={t(lang, "regulation")}>
        <FieldSelect
          className={controlClass}
          value={input.regulation}
          onChange={(e) =>
            setRegulation(e.target.value as SelectInput["regulation"])
          }
        >
          <option value="reversing">{t(lang, "regW")}</option>
          <option value="coarse_fine">{t(lang, "regG")}</option>
          <option value="linear">{t(lang, "regLinear")}</option>
        </FieldSelect>
      </Field>
    )}

    {isLinear ? null : (
      <Field label={t(lang, "pmSteps")}>
        <FieldSelect
          className={controlClass}
          value={pm}
          onChange={(e) => applyPm(e.target.value)}
        >
          <option value="">{t(lang, "customPos")}</option>
          {pmOptions.map((n) => (
            <option key={n} value={String(n)}>
              ±{n}
            </option>
          ))}
        </FieldSelect>
      </Field>
    )}

    <Field label={t(lang, "stepPercent")}>
      <PickOrType
        lang={lang}
        value={stepPercentPct}
        options={STEP_PERCENT_OPTIONS}
        optionLabel={(n) => `${n}%`}
        unit="%"
        custom={stepPctCustom}
        onCustom={setStepPctCustom}
        // 2026-11-04: the untouched 无载 ±2 is a display; the duty keeps −8.
        onValue={setStepPct}
      />
    </Field>

    {isLinear || !pm ? (
      <>
        <Field
          as="div"
          label={t(lang, "positions")}
        >
          <div className="flex min-w-0 flex-1 gap-1">
              <FieldSelect
                className={controlClass}
                value={tapPlus > 0 ? String(tapPlus) : ""}
                onChange={(e) => setTapSide("plus", Number(e.target.value))}
                aria-label={`${t(lang, "positions")} +`}
              >
                {TAP_SIDE_OPTIONS.map((n) => (
                  <option key={`p${n}`} value={String(n)}>
                    +{n}
                  </option>
                ))}
              </FieldSelect>
              <FieldSelect
                className={controlClass}
                value={tapMinus > 0 ? String(tapMinus) : ""}
                onChange={(e) => setTapSide("minus", Number(e.target.value))}
                aria-label={`${t(lang, "positions")} −`}
              >
                {TAP_SIDE_OPTIONS.map((n) => (
                  <option key={`m${n}`} value={String(n)}>
                    −{n}
                  </option>
                ))}
              </FieldSelect>
            </div>
        </Field>
      </>
    ) : null}

    {midCtrl.show ? (
      <Field label={t(lang, "mid")}>
        <FieldSelect
          className={controlClass}
          value={String(
            midOpts.includes((input.midPositions as 1 | 3) ?? 3)
              ? input.midPositions
              : midOpts[0] ?? 3,
          )}
          onChange={(e) => applyMid(e.target.value)}
        >
          {midOpts.map((m) => (
            <option key={m} value={String(m)}>
              {m === 1 ? t(lang, "midOpt1") : t(lang, "midOpt3")}
            </option>
          ))}
        </FieldSelect>
      </Field>
    ) : null}

    {/* Volt picker only when tap % cannot derive Ust (Um mode, no rated kV). */}
    {ustV == null ? (
    <Field
      label={t(lang, "ust")}
    >
      <FieldSelect
        className={controlClass}
        value={
          STEP_VOLTAGE_OPTIONS_V.includes(
            input.stepVoltageV as (typeof STEP_VOLTAGE_OPTIONS_V)[number],
          )
            ? String(input.stepVoltageV)
            : String(
                [...STEP_VOLTAGE_OPTIONS_V].find(
                  (v) => v >= input.stepVoltageV,
                ) ?? input.stepVoltageV,
              )
        }
        onChange={(e) => patch("stepVoltageV", Number(e.target.value))}
      >
        {/* Keep odd calculated values visible if example set one */}
        {!STEP_VOLTAGE_OPTIONS_V.includes(
          input.stepVoltageV as (typeof STEP_VOLTAGE_OPTIONS_V)[number],
        ) && input.stepVoltageV > 0 ? (
          <option value={input.stepVoltageV}>
            {input.stepVoltageV} V
          </option>
        ) : null}
        {STEP_VOLTAGE_MENU.map((item) => (
          <option key={item.value} value={item.value}>
            {currentLabel(lang, item.labelZh, item.labelEn)}
          </option>
        ))}
      </FieldSelect>
    </Field>
    ) : null}

    <Field label={t(lang, "phases")}>
      <FieldSelect
        className={controlClass}
        value={input.phases}
        onChange={(e) => pickPhases(e.target.value as SelectInput["phases"])}
      >
        <option value="III">III</option>
        <option value="II">{t(lang, "phaseII")}</option>
        <option value="I">I</option>
      </FieldSelect>
    </Field>
      </div>
    </section>
  );
}
