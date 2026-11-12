/**
 * Single-control edits of the selector form, as pure transitions like the
 * ones in lib/formState. Each takes the form in force and returns the next
 * one, so the page applies them with a functional update and never reads a
 * value from an older render.
 */
import { DEFAULT_WINDING_RATED_KV } from "./deriveUm";
import { commitRange, formSpec, geometryForPm, type FormState } from "./formState";
import { safetyKKeepsCapacity } from "./safetyK";
import { lookupByPositions } from "./tapCode";
import {
  TAP_POINTS_FOR,
  deriveDuty,
  tapAfterWinding,
  type TapPoint,
  type WindingConnection,
} from "./transformer";
import type { SelectInput } from "./types";

export function mediumFor(
  mounting: SelectInput["mounting"],
  preferVacuum: boolean,
): SelectInput["medium"] {
  if (mounting === "dry_type") return "dry";
  // 2026-11-04: reactor is HWDK, oil only; the arc toggle is hidden there.
  if (mounting === "reactor") return "oil";
  return preferVacuum ? "oil_vacuum" : "oil";
}

/** One top-level field. */
export function setField<K extends Exclude<keyof FormState, "input">>(
  f: FormState,
  k: K,
  v: FormState[K],
): FormState {
  return f[k] === v ? f : { ...f, [k]: v };
}

/** One engine-input field. A new connection drops a typed Um in rated-voltage mode. */
export function patchInput<K extends keyof SelectInput>(
  f: FormState,
  k: K,
  v: SelectInput[K],
): FormState {
  const input = { ...f.input, [k]: v };
  if (k === "connection" && f.voltageMode === "winding") input.umKv = 0;
  return { ...f, input };
}

export function setVoltageEntry(f: FormState, mode: FormState["voltageMode"]): FormState {
  if (mode === f.voltageMode) return f;
  if (mode === "winding") {
    return {
      ...f,
      voltageMode: mode,
      windingRatedKv: f.windingRatedKv > 0 ? f.windingRatedKv : DEFAULT_WINDING_RATED_KV,
      input: { ...f.input, umKv: 0 },
    };
  }
  return {
    ...f,
    voltageMode: mode,
    windingRatedKv: 0,
    currentMode: f.currentMode === "capacity" ? "current" : f.currentMode,
    input: { ...f.input, umKv: 0 },
  };
}

/** Through-current the capacity path gives, or null. Never throws. */
export function capacityThroughA(f: FormState): number | null {
  try {
    const d = deriveDuty(formSpec(f));
    return d.ok && Number.isFinite(d.dutyA) && d.dutyA > 0 ? d.dutyA : null;
  } catch {
    return null;
  }
}

export function setCurrentEntry(f: FormState, mode: FormState["currentMode"]): FormState {
  if (mode === f.currentMode) return f;
  let next = f;
  if (mode === "current") {
    // Carry the current the capacity gave, not the last menu pick.
    const a = capacityThroughA(f);
    if (a != null) next = patchInput(next, "throughCurrentA", Math.round(a * 10) / 10);
  }
  next = { ...next, currentMode: mode };
  if (mode === "capacity" && next.voltageMode !== "winding") next = setVoltageEntry(next, "winding");
  return next;
}

/** The rated-voltage field: tap-side kV, or the equipment Um in Um mode. */
export function setVoltageKv(f: FormState, kv: number): FormState {
  if (f.voltageMode === "winding") {
    return { ...f, windingRatedKv: kv, input: { ...f.input, umKv: 0 } };
  }
  return { ...f, windingRatedKv: 0, input: { ...f.input, umKv: kv } };
}

export function pickTap(f: FormState, p: TapPoint): FormState {
  if (!TAP_POINTS_FOR[f.kind].includes(p)) return f;
  if (f.kind === "two_winding" && f.winding === "delta" && p === "neutral") return f;
  // Engine Y = one switch on a common star point; D = no common star point.
  return {
    ...f,
    tapPoint: p,
    tapForced: false,
    input: { ...f.input, connection: p === "neutral" ? "Y" : "D" },
  };
}

export function pickWinding(f: FormState, w: WindingConnection): FormState {
  if (f.kind !== "two_winding") return { ...f, winding: w };
  const next = tapAfterWinding(w, f.tapPoint, f.tapForced);
  const out: FormState = { ...f, winding: w, tapForced: next.forced };
  if (next.tapPoint === f.tapPoint) return out;
  return {
    ...out,
    tapPoint: next.tapPoint,
    input: { ...f.input, connection: next.tapPoint === "neutral" ? "Y" : "D" },
  };
}

export function applyMid(f: FormState, raw: string): FormState {
  const mid = (Number(raw) === 1 ? 1 : 3) as 1 | 3;
  const s = f.input;
  const n = s.plusMinusSteps;
  if (n != null && n > 0) {
    // Mid is part of the connection diagram: P and pitch must follow
    return { ...f, input: { ...s, ...geometryForPm(n, s.regulation, mid) } };
  }
  // Custom P: keep position count, take pitch from the matching Fig. 3-3 row.
  const positions = s.positions ?? 19;
  const row = lookupByPositions(positions, mid, s.regulation);
  return {
    ...f,
    input: {
      ...s,
      midPositions: mid,
      pitch: (row?.pitch ?? s.pitch ?? 10) as 10 | 12 | 14 | 16 | 18,
    },
  };
}

/** One side of the +a/−b range. */
export function setTapSide(f: FormState, side: "plus" | "minus", n: number): FormState {
  const plus = side === "plus" ? n : f.tapPlus;
  const minus = side === "minus" ? n : f.tapMinus;
  return commitRange({ ...f, tapPlus: plus, tapMinus: minus }, plus, minus, f.stepPercentPct);
}

export function commitSafetyK(f: FormState, n: number): FormState {
  const nextMode = safetyKKeepsCapacity({
    currentMode: f.currentMode,
    transformerMva: f.transformerMva,
    windingRatedKv: f.windingRatedKv,
  });
  const out: FormState = { ...f, safetyK: n };
  if (nextMode === f.currentMode) return out;
  return {
    ...out,
    currentMode: nextMode,
    voltageMode: nextMode === "capacity" ? "winding" : f.voltageMode,
  };
}

export function setArc(f: FormState, vacuum: boolean): FormState {
  return {
    ...f,
    input: { ...f.input, preferVacuum: vacuum, medium: mediumFor(f.input.mounting, vacuum) },
  };
}

export function setMounting(f: FormState, mounting: SelectInput["mounting"]): FormState {
  return {
    ...f,
    input: { ...f.input, mounting, medium: mediumFor(mounting, f.input.preferVacuum) },
  };
}
