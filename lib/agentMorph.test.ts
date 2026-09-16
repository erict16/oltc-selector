import { describe, expect, it } from "vitest";
import { morphAt, morphIntent, rectFlip } from "./agentMorph";

describe("morphIntent", () => {
  it("starts close from rest open, and reverse if already opening", () => {
    expect(morphIntent("open", "close")).toBe("startClose");
    expect(morphIntent("toBubble", "close")).toBe("reverse");
    expect(morphIntent("toChip", "close")).toBe("ignore");
    expect(morphIntent("closed", "close")).toBe("ignore");
  });

  it("does not drop an open click while closing", () => {
    expect(morphIntent("toChip", "open")).toBe("reverse");
    expect(morphIntent("closed", "open")).toBe("startOpen");
    expect(morphIntent("open", "open")).toBe("ignore");
    expect(morphIntent("toBubble", "open")).toBe("ignore");
  });
});

describe("morphAt inverse", () => {
  const g = rectFlip(
    { left: 809, top: 726, width: 440, height: 123 },
    { left: 1139, top: 838, width: 110, height: 40 },
  );

  it("keeps inner * shell scale at 1 for every k", () => {
    for (const k of [0, 0.25, 0.5, 0.75, 1]) {
      const m = morphAt(k, g);
      expect(m.sxi * m.invX).toBeCloseTo(1, 10);
      expect(m.syi * m.invY).toBeCloseTo(1, 10);
    }
  });

  it("lands on the chip box at k=1", () => {
    const m = morphAt(1, g);
    expect(m.sxi).toBeCloseTo(g.sx, 10);
    expect(m.tx).toBe(g.dx);
  });
});
