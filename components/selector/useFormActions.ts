"use client";

import { useMemo, type Dispatch, type SetStateAction } from "react";
import {
  applyMid,
  commitSafetyK,
  patchInput,
  pickTap,
  pickWinding,
  setArc,
  setCurrentEntry,
  setField,
  setMounting,
  setTapSide,
  setVoltageKv,
} from "@/lib/formEdits";
import {
  editStepPct,
  pickKind,
  pickPhases,
  pickPm,
  pickRegulation,
  readLine,
  toOctc,
  toOltc,
  type FormState,
} from "@/lib/formState";
import type { TapPoint, TransformerKind, WindingConnection } from "@/lib/transformer";
import type { SelectInput } from "@/lib/types";

/**
 * Every edit the form's controls make. Each one is a functional update with a
 * pure transition from lib/formState or lib/formEdits, so no handler reads a
 * value from an older render.
 */
export function useFormActions(setForm: Dispatch<SetStateAction<FormState>>) {
  return useMemo(() => {
    const run = (step: (f: FormState) => FormState) => setForm(step);
    return {
      /** Put a whole form in force (a link was opened). */
      replace: (next: FormState) => setForm(next),
      pickKind: (k: TransformerKind) => run((f) => pickKind(f, k)),
      pickTap: (p: TapPoint) => run((f) => pickTap(f, p)),
      pickWinding: (w: WindingConnection) => run((f) => pickWinding(f, w)),
      setHvKv: (kv: number) => run((f) => setField(f, "hvKv", kv)),
      setMvKv: (kv: number) => run((f) => setField(f, "mvKv", kv)),
      setVoltageKv: (kv: number) => run((f) => setVoltageKv(f, kv)),
      setEarthUm: (um: number) => run((f) => setField(f, "earthUm", um)),
      /**
       * 读取: fill the transformer and range fields from one tender line. The
       * kind, tap point and winding come from the vector group, so a YNa0d11
       * line cannot be sized as a two-winding job by a missed click. Same
       * mapping as the CLI --line (lib/formState readLine).
       */
      readLine: (text: string) => run((f) => readLine(f, text)),
      clearLineFailed: () => run((f) => setField(f, "lineFailed", false)),
      patch: <K extends keyof SelectInput>(k: K, v: SelectInput[K]) =>
        run((f) => patchInput(f, k, v)),
      setTransformerMva: (n: number) => run((f) => setField(f, "transformerMva", n)),
      setMvaCustom: (on: boolean) => run((f) => setField(f, "mvaCustom", on)),
      setCurrentEntry: (mode: FormState["currentMode"]) => run((f) => setCurrentEntry(f, mode)),
      // 2026-11-04 final UI-12: lib/formState pickRegulation, so the tests reach it.
      setRegulation: (reg: SelectInput["regulation"]) => run((f) => pickRegulation(f, reg)),
      // 2026-11-04 (r3 UI-6): lib/formState pickPm; 自定义 keeps the step %.
      applyPm: (raw: string) => run((f) => pickPm(f, raw)),
      // 2026-11-04: the untouched 无载 ±2 is a display; the duty keeps −8.
      setStepPct: (n: number, fromList: boolean) =>
        run((f) => (fromList ? editStepPct(f, n, false) : editStepPct(f, n))),
      setStepPctCustom: (on: boolean) => run((f) => setField(f, "stepPctCustom", on)),
      // 2026-11-04: a W/G custom +a/−b takes the Fig. 3-3 row the maker sells
      // (+4/−12 → 10193W), not plus + minus + 1 positions on mid 1 (18171W).
      setTapSide: (side: "plus" | "minus", n: number) => run((f) => setTapSide(f, side, n)),
      applyMid: (raw: string) => run((f) => applyMid(f, raw)),
      pickPhases: (phases: SelectInput["phases"]) => run((f) => pickPhases(f, phases)),
      // 2026-11-04 (r2 UI-2…4): a switch re-maps the read line for the new
      // mode and leaves no ±2 or winding behind.
      setOffCircuit: (octc: boolean) => run(octc ? toOctc : toOltc),
      setArc: (vacuum: boolean) => run((f) => setArc(f, vacuum)),
      setMounting: (m: SelectInput["mounting"]) => run((f) => setMounting(f, m)),
      commitSafetyK: (n: number) => run((f) => commitSafetyK(f, n)),
    };
  }, [setForm]);
}

export type FormActions = ReturnType<typeof useFormActions>;
