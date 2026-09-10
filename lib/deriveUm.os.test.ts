import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isTapSideRatedKv, oltcUmFromRatedKv } from "./deriveUm";

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

function loadSales(): OsRow[] {
  const raw = JSON.parse(
    readFileSync(new URL("../docs/replay/2026-os-sales.json", import.meta.url), "utf8"),
  ) as { sales: OsRow[] };
  return raw.sales;
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

function matchRate(
  rows: Array<{ rated: number; soldUm: number; conn: "Y" | "D" }>,
): { n: number; ok: number; pct: number } {
  let ok = 0;
  for (const r of rows) {
    const pred = oltcUmFromRatedKv(r.rated, r.conn);
    if (Math.abs(pred - r.soldUm) < 0.2) ok += 1;
  }
  return { n: rows.length, ok, pct: rows.length ? (ok / rows.length) * 100 : 0 };
}

describe("2026 OS: only tap-side Un (I matches S/U)", () => {
  const rows = tapSideRows(loadSales());

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

  it("220 / 230 kV star → sold 72.5 at ≥80%", () => {
    const subset = rows.filter(
      (r) => r.conn === "Y" && r.rated >= 200 && r.rated <= 250,
    );
    const { n, pct } = matchRate(subset);
    expect(n).toBeGreaterThan(10);
    expect(pct).toBeGreaterThanOrEqual(80);
  });

  it("tap-side Y/D excluding 35 kV class matches sold Um at ≥85%", () => {
    const subset = rows.filter((r) => r.rated >= 48);
    const { n, pct } = matchRate(subset);
    expect(n).toBeGreaterThan(50);
    expect(pct).toBeGreaterThanOrEqual(85);
  });
});
