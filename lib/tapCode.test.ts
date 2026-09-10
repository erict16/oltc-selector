import { describe, expect, it } from "vitest";
import { midControl, midOptionsFor, nextMidForPm } from "./tapCode";

describe("中间位 control across ±N changes", () => {
  it("±8 W offers both mids; lower ± still shows the control", () => {
    expect(midOptionsFor(8, "reversing")).toEqual([3, 1]);
    expect(midControl(8, "reversing")).toEqual({
      show: true,
      options: [3, 1],
    });
    expect(midControl(4, "reversing")).toEqual({
      show: true,
      options: [1],
    });
    expect(midControl(7, "reversing")).toEqual({
      show: true,
      options: [1],
    });
  });

  it("returning to ±8 after a low ± restores both 3 and 1", () => {
    const cycle = [8, 4, 5, 7, 8].map((n) => midControl(n, "reversing"));
    expect(cycle[0]?.options).toEqual([3, 1]);
    expect(cycle[1]?.show).toBe(true);
    expect(cycle[1]?.options).toEqual([1]);
    expect(cycle.at(-1)).toEqual({ show: true, options: [3, 1] });
  });

  it("keeps mid=1 when it is still valid on the way back to ±8", () => {
    expect(nextMidForPm(4, "reversing", 3)).toBe(1);
    expect(nextMidForPm(8, "reversing", 1)).toBe(1);
    expect(nextMidForPm(8, "reversing", 3)).toBe(3);
  });

  it("G ±8 only has mid 3 but the control stays mounted", () => {
    expect(midControl(8, "coarse_fine")).toEqual({
      show: true,
      options: [3],
    });
    expect(midControl(9, "coarse_fine")).toEqual({
      show: true,
      options: [1],
    });
    expect(midControl(8, "coarse_fine").show).toBe(true);
  });

  it("linear never shows 中间位", () => {
    expect(midControl(8, "linear").show).toBe(false);
  });
});
