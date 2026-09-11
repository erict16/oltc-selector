import { describe, expect, it } from "vitest";
import {
  midControl,
  midOptionsFor,
  parseTapRange,
  preferredMid,
  resolveTapFields,
} from "./tapCode";

describe("parseTapRange +4/−2", () => {
  it("reads RFQ ±4/2×2.5% as 7 positions", () => {
    expect(parseTapRange("±4/2×2.5%")).toEqual({
      plus: 4,
      minus: 2,
      positions: 7,
      stepPercent: 0.025,
    });
    expect(parseTapRange("+4-2")).toEqual({
      plus: 4,
      minus: 2,
      positions: 7,
      stepPercent: null,
    });
    expect(parseTapRange("+4/-2x2.5%")).toMatchObject({
      plus: 4,
      minus: 2,
      stepPercent: 0.025,
    });
  });

  it("does not treat a position count as a range", () => {
    expect(parseTapRange("19")).toBeNull();
    expect(parseTapRange("7")).toBeNull();
  });
});

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

  it("changing ±N snaps to brochure preferred mid (not leftover mid=1)", () => {
    expect(preferredMid(4, "reversing")).toBe(1);
    expect(preferredMid(8, "reversing")).toBe(3);
    expect(preferredMid(9, "reversing")).toBe(1);
    expect(preferredMid(10, "reversing")).toBe(3);
    // ±8 → ±4 forces mid1; going back to ±8 must be 10193W not 18171W
    const afterLow = resolveTapFields({
      regulation: "reversing",
      plusMinusSteps: 8,
      midPositions: preferredMid(8, "reversing"),
    });
    expect(afterLow.tapCode).toBe("10193W");
    expect(afterLow.mid).toBe(3);
    expect(afterLow.positions).toBe(19);
  });

  it("Fig. 3-3 W rows: P=2N+mid and commercial tap code", () => {
    const rows: Array<[number, 1 | 3, string]> = [
      [4, 1, "10091W"],
      [5, 1, "12111W"],
      [6, 1, "14131W"],
      [7, 1, "16151W"],
      [8, 1, "18171W"],
      [8, 3, "10193W"],
      [9, 1, "10191W"],
      [10, 3, "12233W"],
      [11, 1, "12231W"],
      [12, 3, "14273W"],
      [13, 1, "14271W"],
      [14, 3, "16313W"],
      [15, 1, "16311W"],
      [16, 3, "18353W"],
      [17, 1, "18351W"],
    ];
    for (const [n, mid, code] of rows) {
      expect(2 * n + mid).toBe(
        resolveTapFields({
          regulation: "reversing",
          plusMinusSteps: n,
          midPositions: mid,
        }).positions,
      );
      expect(
        resolveTapFields({
          regulation: "reversing",
          plusMinusSteps: n,
          midPositions: mid,
        }).tapCode,
      ).toBe(code);
    }
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

  it("custom position count only offers mids that exist for that P", () => {
    expect(midControl(null, "reversing", 19)).toEqual({
      show: true,
      options: [3, 1],
    });
    expect(midControl(null, "reversing", 17)).toEqual({
      show: true,
      options: [1],
    });
    expect(midControl(null, "reversing", 13)).toEqual({
      show: true,
      options: [1],
    });
  });
});
