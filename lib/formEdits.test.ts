import { describe, expect, it } from "vitest";
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
  setVoltageEntry,
  setVoltageKv,
} from "./formEdits";
import { INITIAL_FORM, formSelectInput, pickKind, pickPm, type FormState } from "./formState";

const F = INITIAL_FORM;

describe("single-control form edits", () => {
  it("returns the same form when a field does not change", () => {
    expect(setField(F, "hvKv", F.hvKv)).toBe(F);
    expect(setField(F, "hvKv", 330).hvKv).toBe(330);
    expect(F.hvKv).toBe(220);
  });

  it("delta moves the switch off the neutral, star puts it back", () => {
    const d = pickWinding(F, "delta");
    expect(d.tapPoint).toBe("line_end");
    expect(d.tapForced).toBe(true);
    expect(d.input.connection).toBe("D");
    const y = pickWinding(d, "star");
    expect(y.tapPoint).toBe("neutral");
    expect(y.tapForced).toBe(false);
    expect(y.input.connection).toBe("Y");
  });

  it("keeps a line end the user picked through delta and back", () => {
    const picked = pickTap(F, "line_end");
    expect(picked.input.connection).toBe("D");
    expect(pickWinding(pickWinding(picked, "delta"), "star").tapPoint).toBe("line_end");
  });

  it("refuses a tap point the kind or winding does not have", () => {
    expect(pickTap(F, "auto_junction")).toBe(F);
    const d = pickWinding(F, "delta");
    expect(pickTap(d, "neutral")).toBe(d);
    const auto = pickKind(F, "auto");
    expect(pickTap(auto, "neutral")).toBe(auto);
  });

  it("switching to current entry carries the current the capacity gave", () => {
    const sized = formSelectInput(F);
    expect(sized.ok).toBe(true);
    const c = setCurrentEntry(F, "current");
    expect(c.currentMode).toBe("current");
    if (sized.ok) expect(c.input.throughCurrentA).toBeCloseTo(sized.input.throughCurrentA, 1);
    expect(setCurrentEntry(c, "current")).toBe(c);
  });

  it("capacity entry needs the rated voltage: Um mode goes back to it", () => {
    const um = setVoltageEntry(F, "equipment");
    expect(um.windingRatedKv).toBe(0);
    expect(um.currentMode).toBe("current");
    const typed = setVoltageKv(um, 72.5);
    expect(typed.input.umKv).toBe(72.5);
    const back = setCurrentEntry(typed, "capacity");
    expect(back.voltageMode).toBe("winding");
    expect(back.windingRatedKv).toBeGreaterThan(0);
    expect(back.input.umKv).toBe(0);
  });

  it("a new connection drops a typed Um in rated-voltage mode only", () => {
    const withUm: FormState = { ...F, input: { ...F.input, umKv: 72.5 } };
    expect(patchInput(withUm, "connection", "D").input.umKv).toBe(0);
    expect(patchInput(withUm, "throughCurrentA", 600).input.umKv).toBe(72.5);
    const um: FormState = { ...withUm, voltageMode: "equipment" };
    expect(patchInput(um, "connection", "D").input.umKv).toBe(72.5);
  });

  it("one side of a custom range commits the whole range", () => {
    const custom = pickPm(F, "");
    const r = setTapSide(setTapSide(custom, "plus", 4), "minus", 12);
    expect(r.tapPlus).toBe(4);
    expect(r.tapMinus).toBe(12);
    expect(r.tapRange).toMatchObject({ plus: 4, minus: 12 });
  });

  it("mid positions follow the connection diagram", () => {
    const m = applyMid(F, "1");
    expect(m.input.midPositions).toBe(1);
    expect(applyMid(m, "3").input.midPositions).toBe(3);
  });

  it("the safety factor stays on the capacity path while MVA and kV are filled", () => {
    const c = setCurrentEntry(F, "current");
    const k = commitSafetyK(c, 1.2);
    expect(k.safetyK).toBe(1.2);
    expect(k.currentMode).toBe("capacity");
    expect(k.voltageMode).toBe("winding");
  });

  it("the medium follows mounting and interrupter", () => {
    expect(setArc(F, false).input.medium).toBe("oil");
    expect(setMounting(F, "dry_type").input.medium).toBe("dry");
    expect(setMounting(F, "reactor").input.medium).toBe("oil");
    expect(setMounting(setArc(F, false), "on_tank").input.medium).toBe("oil");
    expect(setMounting(F, "on_tank").input.medium).toBe("oil_vacuum");
  });
});
