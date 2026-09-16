import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { commercialTypeExists } from "./typeExists";
import {
  loadOsSales,
  replayOsRow,
  type OsSalesRow,
} from "./osReplay";

function loadYear(year: 2025 | 2026): OsSalesRow[] {
  const raw = JSON.parse(
    readFileSync(
      path.join(process.cwd(), "docs", "replay", `${year}-os-sales.json`),
      "utf8",
    ),
  );
  return loadOsSales(raw);
}

function replayYear(year: 2025 | 2026) {
  const rows = loadYear(year);
  const judged: ReturnType<typeof replayOsRow>[] = [];
  let skip = 0;
  let outOfCat = 0;
  let missingSold = 0;
  const illegal: string[] = [];
  for (const row of rows) {
    const r = replayOsRow(row);
    if (r.skip) {
      skip++;
      continue;
    }
    if (r.outOfCatalogue) {
      outOfCat++;
      for (const m of r.models) {
        if (!commercialTypeExists(m)) illegal.push(`${year} ${r.serial} ${m}`);
      }
      continue;
    }
    judged.push(r);
    for (const m of r.models) {
      if (!commercialTypeExists(m)) illegal.push(`${year} ${r.serial} ${m}`);
    }
    if (!r.soldCovered) missingSold++;
  }
  return { rows: rows.length, skip, outOfCat, judged: judged.length, missingSold, illegal };
}

describe("OS Excel-backed replay (shipped selectOltc)", () => {
  it("2025 OS: every emitted model exists; legal sold types stay in results", () => {
    const s = replayYear(2025);
    expect(s.rows).toBeGreaterThan(1);
    expect(s.illegal, s.illegal.slice(0, 8).join("\n")).toEqual([]);
    expect(s.judged).toBeGreaterThan(0);
    expect(s.missingSold, `2025 legal sold types omitted: ${s.missingSold}`).toBe(0);
  });

  it("2026 OS: every emitted model exists; legal sold types stay in results", () => {
    const s = replayYear(2026);
    expect(s.rows).toBeGreaterThan(1);
    expect(s.illegal, s.illegal.slice(0, 8).join("\n")).toEqual([]);
    expect(s.judged).toBeGreaterThan(0);
    expect(s.missingSold, `2026 legal sold types omitted: ${s.missingSold}`).toBe(0);
  });
});
