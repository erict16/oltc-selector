import { describe, expect, it } from "vitest";
import { SERIES } from "./catalog";
import { selectOltc } from "./engine";
import { parseTypeString } from "./parseType";
import type { SelectInput } from "./types";
import { commercialTypeExists } from "./typeExists";

const STAR_ONLY_III_D = /(?:CM2|CM|CMD|SHZV|SDZV|SHZVG)III-\d+D\//;
const COMPOUND_GRADE = /(?:CV2|CV|SV|CVT)III-\d+[YD]\/\d+(?:\.\d+)?[BCDE]/;
const SINGLE_PHASE_YD = /(?:CM2|CM|CMD|SHZV|SDZV|SHZVG|HWV)I-\d+[YD]\//;
const CM2_II_YD = /(?:CM2|CM|CMD)II-\d+[YD]\//;

const VAC_CODES = new Set(
  SERIES.filter((s) => s.vacuum).map((s) => s.code),
);
const IN_TANK = new Set(
  SERIES.filter((s) => s.mounting.includes("in_tank")).map((s) => s.code),
);
const ON_TANK = new Set(
  SERIES.filter((s) =>
    s.mounting.includes("on_tank") || s.mounting.includes("external_compartment"),
  ).map((s) => s.code),
);
const DRY = new Set(
  SERIES.filter((s) => s.mounting.includes("dry_type")).map((s) => s.code),
);

function checkModel(
  model: string,
  ctx: string,
  bucket: string[],
  extra?: (parsed: NonNullable<ReturnType<typeof parseTypeString>>) => void,
): void {
  if (!commercialTypeExists(model)) bucket.push(`${ctx} missing ${model}`);
  if (STAR_ONLY_III_D.test(model)) bucket.push(`${ctx} III-D ${model}`);
  if (COMPOUND_GRADE.test(model)) bucket.push(`${ctx} grade ${model}`);
  if (SINGLE_PHASE_YD.test(model)) bucket.push(`${ctx} I-YD ${model}`);
  if (CM2_II_YD.test(model)) bucket.push(`${ctx} II-YD ${model}`);
  if (/CV2III-500/.test(model)) bucket.push(`${ctx} CV2-500 ${model}`);
  if (/CZIII-/.test(model)) bucket.push(`${ctx} CZIII ${model}`);
  if (/SDZVIII-1300|SDZVIII-2400|SDZVI-1200|SDZVI-1500|SDZVII-/.test(model)) {
    bucket.push(`${ctx} bad-SDZV ${model}`);
  }
  const parsed = parseTypeString(model);
  if (!parsed) {
    bucket.push(`${ctx} unparseable ${model}`);
    return;
  }
  const s = SERIES.find((row) => row.code === parsed.family);
  if (!s) bucket.push(`${ctx} unknown-family ${model}`);
  extra?.(parsed);
}

describe("catalogue pressure: all families", () => {
  it("OLTC grid never invents a type or leaks medium / mounting", () => {
    const illegal: string[] = [];
    const soft: string[] = [];
    const currents = [160, 350, 400, 500, 600, 800, 1000, 1300, 1500, 1600, 2400, 2915.9];
    const ums = [12, 17.5, 40.5, 72.5, 126, 145, 170];
    const usts = [800, 1500, 2000, 3300, 4000, 5000, 6000];
    const conns = ["Y", "D"] as const;
    const pms = [8, 16] as const;

    const jobs: SelectInput[] = [];
    for (const iu of currents) {
      for (const um of ums) {
        for (const ust of usts) {
          for (const conn of conns) {
            for (const pm of pms) {
              const tap = {
                throughCurrentA: iu,
                umKv: um,
                stepVoltageV: ust,
                connection: conn,
                plusMinusSteps: pm,
                midPositions: 3 as const,
                phases: "III" as const,
                regulation: "reversing" as const,
                mdu: "none" as const,
              };
              jobs.push({
                ...tap,
                mounting: "in_tank",
                medium: "oil_vacuum",
                preferVacuum: true,
              });
              jobs.push({
                ...tap,
                mounting: "in_tank",
                medium: "oil",
                preferVacuum: false,
              });
              jobs.push({
                ...tap,
                mounting: "on_tank",
                medium: "oil_vacuum",
                preferVacuum: true,
              });
              jobs.push({
                ...tap,
                mounting: "dry_type",
                medium: "dry",
                preferVacuum: true,
              });
            }
          }
        }
      }
    }

    for (const input of jobs) {
      const ctx = `${input.mounting}/${input.medium}/${input.throughCurrentA}A/${input.umKv}kV/${input.stepVoltageV}V/${input.connection}/±${input.plusMinusSteps}`;
      const out = selectOltc(input);
      for (const r of out.results) {
        checkModel(r.model, ctx, illegal);
        if (input.medium === "oil" && VAC_CODES.has(r.seriesCode)) {
          illegal.push(`${ctx} oil→vac ${r.model}`);
        }
        if (input.mounting === "dry_type" && !DRY.has(r.seriesCode)) {
          illegal.push(`${ctx} dry→wet ${r.model}`);
        }
        if (input.mounting === "on_tank" && !ON_TANK.has(r.seriesCode)) {
          illegal.push(`${ctx} on-tank→in-tank ${r.model}`);
        }
        if (input.mounting === "in_tank" && !IN_TANK.has(r.seriesCode)) {
          illegal.push(`${ctx} in-tank→other ${r.model}`);
        }
      }
      if (
        input.preferVacuum &&
        out.ok &&
        out.results[0] &&
        !VAC_CODES.has(out.results[0].seriesCode)
      ) {
        soft.push(`${ctx} vac-primary-oil ${out.results[0].model}`);
      }
    }

    expect(illegal, illegal.slice(0, 25).join(" | ")).toEqual([]);
    expect(soft, soft.slice(0, 15).join(" | ")).toEqual([]);
  });

  it("OCTC grid never invents a list-missing row", () => {
    const illegal: string[] = [];
    const currents = [250, 600, 800, 1000, 1600, 2000];
    const ums = [12, 40.5, 72.5, 126, 170];
    const conns = ["Y", "D"] as const;
    for (const iu of currents) {
      for (const um of ums) {
        for (const conn of conns) {
          const out = selectOltc({
            mounting: "in_tank",
            medium: "oil",
            preferVacuum: false,
            dutyKind: "octc",
            phases: "III",
            connection: conn,
            throughCurrentA: iu,
            umKv: um,
            stepVoltageV: 0,
            regulation: "linear",
            positions: 6,
            mdu: "none",
          });
          const ctx = `octc ${iu}A ${um} ${conn}`;
          for (const r of out.results) {
            checkModel(r.model, ctx, illegal);
            if (!["WSL", "WDL", "WSG"].includes(r.seriesCode)) {
              illegal.push(`${ctx} not-octc ${r.model}`);
            }
          }
        }
      }
    }
    expect(illegal, illegal.slice(0, 20).join(" | ")).toEqual([]);
  });
});
