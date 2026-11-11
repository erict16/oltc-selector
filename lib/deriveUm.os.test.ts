import { HAS_REPLAY_DATA, readSalesJson } from "./replayData";
import { describe, expect, it } from "vitest";
import { isTapSideRatedKv } from "./deriveUm";
import { deriveDuty } from "./transformer";

type OsRow = {
  serial?: string;
  rated_kv?: number | null;
  um_kv?: number | null;
  mva?: number | null;
  i_a?: number | null;
  i_max_a?: number | null;
  connection?: "Y" | "D" | string | null;
  phases?: string | null;
};

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const HAS_SALES = HAS_REPLAY_DATA;

function loadSales(year: "2025" | "2026"): OsRow[] {
  return readSalesJson(year).sales as OsRow[];
}

function tapSideRows(sales: OsRow[]): Array<OsRow & { rated: number; soldUm: number; conn: "Y" | "D" }> {
  const out: Array<OsRow & { rated: number; soldUm: number; conn: "Y" | "D" }> = [];
  for (const r of sales) {
    const rated = num(r.rated_kv);
    const soldUm = num(r.um_kv);
    const mva = num(r.mva);
    const dutyA = num(r.i_max_a) ?? num(r.i_a);
    const conn = r.connection === "Y" || r.connection === "D" ? r.connection : null;
    if (!rated || !soldUm || !mva || !dutyA || !conn) continue;
    if (r.phases && r.phases !== "III") continue;
    if (
      !isTapSideRatedKv({
        mva,
        ratedKv: rated,
        dutyA,
        connection: conn,
      })
    ) {
      continue;
    }
    out.push({ ...r, rated, soldUm, conn });
  }
  return out;
}

/**
 * The shipped rule (deriveDuty): Y = star neutral, D = line end.
 * 2026-11-04 audit UM-7: this test used to check a second rule in
 * deriveUm.ts (220 kV star → 252) that no user ever saw.
 */
function shippedUm(rated: number, conn: "Y" | "D"): number {
  return deriveDuty({
    kind: "two_winding",
    tapPoint: conn === "Y" ? "neutral" : "line_end",
    winding: conn === "Y" ? "star" : "delta",
    mva: 0,
    tapKv: rated,
    hvKv: 0,
    mvKv: 0,
    minusSteps: 0,
    stepFraction: null,
    safetyK: 1,
  }).umKv;
}

function matchRate(
  rows: Array<{ rated: number; soldUm: number; conn: "Y" | "D" }>,
): { n: number; ok: number; pct: number } {
  let ok = 0;
  for (const r of rows) {
    if (Math.abs(shippedUm(r.rated, r.conn) - r.soldUm) < 0.2) ok += 1;
  }
  return { n: rows.length, ok, pct: rows.length ? (ok / rows.length) * 100 : 0 };
}

describe.skipIf(!HAS_SALES)("2026 OS: only tap-side Un (I matches S/U)", () => {
  const rows = tapSideRows(loadSales("2026"));

  it("has a usable confirmed set", () => {
    expect(rows.length).toBeGreaterThan(80);
  });

  it("110 / 115 kV star → sold 72.5 at ≥90%", () => {
    const subset = rows.filter(
      (r) => r.conn === "Y" && r.rated >= 100 && r.rated <= 121,
    );
    const { n, pct } = matchRate(subset);
    expect(n).toBeGreaterThan(20);
    expect(pct).toBeGreaterThanOrEqual(90);
  });

  it("132 / 138 kV star → sold 72.5 at ≥80%", () => {
    const subset = rows.filter(
      (r) => r.conn === "Y" && r.rated > 121 && r.rated <= 141,
    );
    const { n, pct } = matchRate(subset);
    expect(n).toBeGreaterThan(5);
    expect(pct).toBeGreaterThanOrEqual(80);
  });

  it("132 / 138 kV delta → sold 145 at ≥90%", () => {
    const subset = rows.filter(
      (r) => r.conn === "D" && r.rated > 121 && r.rated <= 141,
    );
    const { n, pct } = matchRate(subset);
    expect(n).toBeGreaterThan(2);
    expect(pct).toBeGreaterThanOrEqual(90);
  });

  it("tap-side Y/D 66–150 kV class matches sold Um at ≥85%", () => {
    const subset = rows.filter((r) => r.rated >= 48 && r.rated < 200);
    const { n, pct } = matchRate(subset);
    expect(n).toBeGreaterThan(50);
    expect(pct).toBeGreaterThanOrEqual(85);
  });

  // Where the old second rule said 252. Russia and Brazil bought 72.5
  // (measured 17 of 21 in 2026).
  it("220 / 230 kV star neutral → sold 72.5 at ≥75%", () => {
    const subset = rows.filter(
      (r) => r.conn === "Y" && r.rated >= 200 && r.rated <= 242,
    );
    const { n, pct } = matchRate(subset);
    expect(n).toBeGreaterThan(15);
    expect(pct).toBeGreaterThanOrEqual(75);
  });
});

describe.skipIf(!HAS_SALES)("2025 + 2026 OS: shipped Um rule", () => {
  const rows = [...tapSideRows(loadSales("2025")), ...tapSideRows(loadSales("2026"))];

  it("110 / 115 kV star → sold 72.5 at ≥85% (88% measured)", () => {
    const subset = rows.filter(
      (r) => r.conn === "Y" && r.rated >= 100 && r.rated <= 121,
    );
    const { n, pct } = matchRate(subset);
    expect(n).toBeGreaterThan(60);
    expect(pct).toBeGreaterThanOrEqual(85);
  });

  it("132 / 138 kV delta → sold 145 at ≥90%", () => {
    const subset = rows.filter(
      (r) => r.conn === "D" && r.rated > 121 && r.rated <= 141,
    );
    const { n, pct } = matchRate(subset);
    expect(n).toBeGreaterThan(5);
    expect(pct).toBeGreaterThanOrEqual(90);
  });
});
