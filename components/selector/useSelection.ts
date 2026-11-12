"use client";

import { useMemo } from "react";
import { formatUmKv } from "@/lib/deriveUm";
import { displayModel, displayNote } from "@/lib/domesticModel";
import {
  insuranceModel,
  optionsWithInsurance,
  primaryIsInsurance,
  selectOltc,
} from "@/lib/engine";
import { formSelectInput, formSpec, type FormState } from "@/lib/formState";
import { t, type Lang } from "@/lib/i18n";
import { localizeNote, notesFor } from "@/lib/noteI18n";
import { deriveDuty, type DutyBasis } from "@/lib/transformer";
import type { ModelResult, SelectInput, SelectOutput } from "@/lib/types";

/** Stands in for the duty when the sizing itself threw. */
const NO_DUTY: DutyBasis = {
  ok: false,
  connection: "Y",
  umSystemKv: NaN,
  actualUmKv: NaN,
  umKv: NaN,
  umRule: "line",
  umAssumed: false,
  ratedA: NaN,
  maxA: NaN,
  maxRule: "full_range",
  dutyA: NaN,
  currentKv: NaN,
  currentDivisor: "sqrt3",
  stepV: null,
  combinedOnly: false,
  cautionsZh: [],
  cautionsEn: [],
};

const safe = <T,>(get: () => T, fallback: T): T => {
  try {
    return get();
  } catch {
    return fallback;
  }
};

/** Everything the page shows that follows from the form. */
export interface Selection {
  /** What went to the engine; null when the duty is incomplete or the sizing threw. */
  sized: SelectInput | null;
  result: SelectOutput;
  /** The sizing threw: shown as "could not calculate". */
  calcFailed: boolean;
  pickedDutyA: number | null;
  pickedStepV: number;
  primary: ModelResult | null;
  /** The first type already is the roomier one. */
  loose: boolean;
  alts: ModelResult[];
  /** The alternative offered as the one with margin. */
  insuranceId: string | null;
  duty: DutyBasis;
  /** The duty with no stated insulation class: what the rule alone gives. */
  ruleDuty: DutyBasis;
  /** Through-current the capacity gives; null in current entry. */
  derivedA: number | null;
  /** Step voltage the tap % and rated kV give; null when they cannot. */
  ustV: number | null;
  cautions: string[];
  /** Why there is no type: could not calculate, nothing fits, or the duty is incomplete. */
  emptyKey: "calcFailed" | "noMatch" | "needInput";
  emptyNotes: string[];
  /** What a screen reader hears once typing settles. */
  liveText: string;
}

/**
 * The engine is synchronous and cheap, so the answer follows the form on
 * every change. A Select button used to let the readouts and the type
 * disagree. A throw anywhere in the sizing becomes a visible state, not a
 * blank page.
 */
export function selectionFor(form: FormState, lang: Lang): Selection {
  let calcFailed = false;
  let sized: SelectInput | null = null;
  let result: SelectOutput;
  try {
    const r = formSelectInput(form);
    if (r.ok) {
      sized = r.input;
      result = selectOltc(r.input);
    } else {
      const msg =
        "msgKey" in r
          ? t(lang, r.msgKey)
          : (lang === "zh" ? r.duty.errorZh : localizeNote(r.duty.errorEn ?? "", lang)) ||
            t(lang, "needRated");
      result = { ok: false, results: [], errorsEn: [msg], errorsZh: [msg] };
    }
  } catch {
    calcFailed = true;
    sized = null;
    const msg = t(lang, "calcFailedHint");
    result = { ok: false, results: [], errorsEn: [msg], errorsZh: [msg] };
  }
  const pickedDutyA = sized ? sized.throughCurrentA : null;
  const pickedStepV = sized && sized.stepVoltageV > 0 ? sized.stepVoltageV : 0;
  const primary = result.ok ? (result.results[0] ?? null) : null;

  const marginNeed = {
    acrossTapBilKv: form.input.acrossTapBilKv,
    acrossTapPfKv: form.input.acrossTapPfKv,
  };
  const loose =
    primary != null &&
    pickedDutyA != null &&
    safe(() => primaryIsInsurance(primary, pickedDutyA, pickedStepV, marginNeed), false);
  const alts =
    result.ok && pickedDutyA != null
      ? safe(() => optionsWithInsurance(result.results, pickedDutyA, pickedStepV, 3, marginNeed), [])
      : [];
  const insuranceId =
    !loose && result.ok && pickedDutyA != null
      ? safe(() => insuranceModel(result.results, pickedDutyA, pickedStepV, marginNeed), null)
      : null;

  const duty = safe(() => deriveDuty(formSpec(form)), NO_DUTY);
  const derivedA =
    form.currentMode === "capacity" && duty.ok && Number.isFinite(duty.dutyA) && duty.dutyA > 0
      ? duty.dutyA
      : null;
  const ustV = duty.ok && duty.stepV != null && duty.stepV > 0 ? duty.stepV : null;
  const ruleDuty = safe(() => deriveDuty({ ...formSpec(form), earthUmKv: undefined }), NO_DUTY);

  // Notes belong to a type: with no type the card says only why there is none.
  const cautions = (
    primary
      ? [
          ...(form.earthUm > 0 && ruleDuty.ok && form.earthUm < ruleDuty.umKv
            ? [
                t(lang, "earthBelowRule", {
                  um: formatUmKv(form.earthUm),
                  rule: formatUmKv(ruleDuty.umKv),
                }),
              ]
            : []),
          ...notesFor(lang, primary.cautionsZh, primary.cautionsEn),
          ...(duty.ok ? notesFor(lang, duty.cautionsZh, duty.cautionsEn) : []),
        ]
      : []
  )
    .map((c) => displayNote(c, lang))
    .filter((c, i, all) => all.indexOf(c) === i);

  const emptyKey = calcFailed ? "calcFailed" : sized ? "noMatch" : "needInput";
  const emptyNotes = primary
    ? []
    : notesFor(lang, result.errorsZh, result.errorsEn)
        .filter(Boolean)
        .map((e) => displayNote(e, lang));
  // With no type the reader hears why, never the type that was there before.
  const stop = lang === "zh" ? "。" : ". ";
  const liveText = primary
    ? [
        displayModel(primary.model, lang),
        ...(cautions.length > 0 ? [t(lang, "cautionCount", { n: cautions.length })] : []),
      ].join(stop)
    : [t(lang, emptyKey), ...emptyNotes].join(stop);

  return {
    sized,
    result,
    calcFailed,
    pickedDutyA,
    pickedStepV,
    primary,
    loose,
    alts,
    insuranceId,
    duty,
    ruleDuty,
    derivedA,
    ustV,
    cautions,
    emptyKey,
    emptyNotes,
    liveText,
  };
}

export function useSelection(form: FormState, lang: Lang): Selection {
  return useMemo(() => selectionFor(form, lang), [form, lang]);
}
