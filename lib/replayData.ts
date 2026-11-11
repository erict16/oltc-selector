import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Sold-order sheets (buyer names, serials) are not in the repository:
 * docs/replay is git-ignored and stays on the maintainer's disk.
 * Tests that replay them skip when the files are absent (CI, a fresh clone).
 */
const file = (year: number | string) =>
  path.join(process.cwd(), "docs", "replay", `${year}-os-sales.json`);

export const HAS_REPLAY_DATA = existsSync(file(2025)) && existsSync(file(2026));

/** Parsed JSON of one year, or an empty sheet when the data is absent. */
export function readSalesJson(year: number | string): { sales: unknown[] } {
  if (!HAS_REPLAY_DATA) return { sales: [] };
  return JSON.parse(readFileSync(file(year), "utf8"));
}
