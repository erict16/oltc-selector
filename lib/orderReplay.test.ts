import { describe, expect, it } from "vitest";
import { selectOltc } from "./engine";
import { lookupListPrice } from "./basePrices";
import {
  ORDER_REPLAY,
  ORDER_REPLAY_SKIPPED,
  commercialMatch,
  parseTypeString,
  replaySummary,
  runOrderReplay,
} from "./orderReplay";

describe("order-replay parse / match", () => {
  it("parses combined, compound, and 3× strings", () => {
    expect(parseTypeString("SHZVIII-1000Y/72.5C-12233W")).toMatchObject({
      family: "SHZV",
      phases: "III",
      currentA: 1000,
      connection: "Y",
      umKv: 72.5,
      selectorSize: "C",
      tapCode: "12233W",
    });
    expect(parseTypeString("CV2III-350D/40.5-10193W")).toMatchObject({
      family: "CV2",
      selectorSize: "",
      connection: "D",
    });
    expect(parseTypeString("3×SHZVI-2400/72.5C-10193W")).toMatchObject({
      unitCount: 3,
      family: "SHZV",
      phases: "I",
      currentA: 2400,
    });
  });

  it("matches family / I / Um / grade / tap (criterion 2)", () => {
    expect(
      commercialMatch(
        "SHZVIII-1000Y/170D-12233W",
        "SHZV III 1000Y / 170D – 12233W",
      ),
    ).toBe(true);
    expect(
      commercialMatch("CM2III-500Y/72.5B-10193W", "CV2III-350Y/72.5-10193W"),
    ).toBe(false);
  });
});

describe("order-replay: shipped selectOltc on real QS/OS", () => {
  it("every fixture drives selectOltc (no mock)", () => {
    for (const c of ORDER_REPLAY) {
      const out = selectOltc(c.input);
      expect(out.ok, c.id).toBe(true);
      expect(out.results.length, c.id).toBeGreaterThan(0);
    }
  });

  it("min-adequate #1 matches the ordered type (criterion 2)", () => {
    for (const c of ORDER_REPLAY.filter((x) => x.tag === "min-adequate")) {
      const out = selectOltc(c.input);
      expect(
        commercialMatch(
          out.results[0].model,
          c.expectPrimary,
          c.match ?? "full",
        ),
        `${c.id}: #1=${out.results[0].model} expected ${c.expectPrimary}`,
      ).toBe(true);
    }
  });

  it("customer-specified ordered type appears in the ranked list", () => {
    for (const c of ORDER_REPLAY.filter((x) => x.tag === "customer-specified")) {
      const out = selectOltc(c.input);
      const hit = out.results.some((r) =>
        commercialMatch(r.model, c.expectPrimary, c.match ?? "full"),
      );
      expect(
        hit,
        `${c.id}: ${c.expectPrimary} not in ${out.results.map((r) => r.model).join(" | ")}`,
      ).toBe(true);
    }
  });

  it("named backup sits in non-primary results; otherwise remaining list is non-empty", () => {
    for (const c of ORDER_REPLAY) {
      const out = selectOltc(c.input);
      const rest = out.results.slice(1);
      if (c.expectBackup) {
        expect(
          rest.some((r) =>
            commercialMatch(r.model, c.expectBackup!, c.match ?? "full"),
          ),
          `${c.id}: backup ${c.expectBackup} not in ${rest.map((r) => r.model).join(" | ")}`,
        ).toBe(true);
      } else {
        expect(rest.length, `${c.id}: no remaining eligible types`).toBeGreaterThan(
          0,
        );
      }
    }
  });

  it("in-tank vacuum 350 A / 40.5 D ±8 is the commercial CV2 type, not merely ok", () => {
    const c = ORDER_REPLAY.find((x) => x.id === "Qu-ET260002")!;
    const fromOrder = selectOltc(c.input);
    expect(fromOrder.results[0].model).toBe("CV2III-350D/40.5-10193W");

    // Same commercial string from the plan's representative duty (350 A, not the 15 MVA I).
    const fromDuty = selectOltc({
      mounting: "in_tank",
      medium: "oil_vacuum",
      preferVacuum: true,
      phases: "III",
      connection: "D",
      throughCurrentA: 350,
      umKv: 40.5,
      stepVoltageV: 1500,
      regulation: "reversing",
      plusMinusSteps: 8,
    });
    expect(fromDuty.ok).toBe(true);
    expect(fromDuty.results[0].model).toBe("CV2III-350D/40.5-10193W");
  });

  it("runOrderReplay uses the shipped entry point on every case", () => {
    const rows = runOrderReplay();
    expect(rows.length).toBe(ORDER_REPLAY.length);
    const failed = rows.filter((r) => !r.pass);
    expect(failed.map((r) => `${r.id} #1=${r.actualPrimary}`)).toEqual([]);
  });

  it("replaySummary is zero FAIL", () => {
    const rows = runOrderReplay();
    const s = replaySummary(rows);
    // Printed for CORRECTNESS.md — fail must stay 0.
    // eslint-disable-next-line no-console
    console.log("replaySummary", s);
    expect(s.fail).toBe(0);
    expect(s.total).toBe(ORDER_REPLAY.length);
    expect(s.match + s.eligibleDifferent).toBe(s.total);
    expect(s.skip).toBe(ORDER_REPLAY_SKIPPED.length);
    expect(s.skip).toBeGreaterThan(0);
  });

  it("HWV / WSL replay rows exist; list lookup hits those types", () => {
    const hwv = ORDER_REPLAY.filter((c) =>
      parseTypeString(c.expectPrimary)?.family === "HWV",
    );
    const wsl = ORDER_REPLAY.filter(
      (c) =>
        c.input.dutyKind === "octc" ||
        ["WSL", "WDL"].includes(parseTypeString(c.expectPrimary)?.family ?? ""),
    );
    expect(hwv.length).toBeGreaterThan(0);
    expect(wsl.length).toBeGreaterThan(0);
    expect(
      hwv.some((c) => c.expectPrimary === "HWVIII-400Y/72.5-10193W"),
    ).toBe(true);
    expect(
      wsl.some((c) =>
        /^WSLIV-800Y\/170-6x5[AB]$/.test(c.expectPrimary),
      ),
    ).toBe(true);
    expect(lookupListPrice("HWVIII-400Y/72.5-10193W")).toMatchObject({
      found: true,
      listRmb: 225000,
    });
    expect(lookupListPrice("HWVIII-800D/40.5-10193W")).toMatchObject({
      found: true,
    });
    expect(lookupListPrice("WSLIV-800Y/170-6x5B")).toMatchObject({
      found: true,
    });
    expect(lookupListPrice("CV2III-350D/40.5-10193W")).toMatchObject({
      found: true,
      listRmb: 148700,
    });
  });

  it("2026 OS-style #1 and other options have 2025 list rows", () => {
    const duties = [
      {
        mounting: "in_tank" as const,
        medium: "oil_vacuum" as const,
        preferVacuum: true,
        phases: "III" as const,
        connection: "Y" as const,
        throughCurrentA: 400,
        umKv: 72.5,
        stepVoltageV: 1500,
        regulation: "reversing" as const,
        plusMinusSteps: 8,
        mdu: "none" as const,
      },
      {
        mounting: "in_tank" as const,
        medium: "oil_vacuum" as const,
        preferVacuum: true,
        phases: "III" as const,
        connection: "Y" as const,
        throughCurrentA: 180,
        umKv: 126,
        stepVoltageV: 1500,
        regulation: "coarse_fine" as const,
        plusMinusSteps: 12,
        mdu: "none" as const,
      },
      {
        mounting: "in_tank" as const,
        medium: "oil_vacuum" as const,
        preferVacuum: true,
        phases: "III" as const,
        connection: "D" as const,
        throughCurrentA: 350,
        umKv: 145,
        stepVoltageV: 1500,
        regulation: "reversing" as const,
        plusMinusSteps: 8,
        mdu: "none" as const,
      },
    ];
    for (const input of duties) {
      const out = selectOltc(input);
      expect(out.ok).toBe(true);
      for (const r of out.results.slice(0, 4)) {
        if (r.unitCount > 1) continue;
        const hit = lookupListPrice(r.model);
        expect(hit.found, r.model).toBe(true);
      }
    }
  });

  it("closed skips only: MDU, CV2-500, under-duty, multi-QS, 2-unit", () => {
    const reasons = ORDER_REPLAY_SKIPPED.map((s) => s.reason);
    for (const r of reasons) {
      const ok =
        /MDU-only|CV2-500|below transformer duty|two |price list of several|2-unit set|catalogue max|WDLVIII/.test(
          r,
        );
      expect(ok, r).toBe(true);
    }
    expect(ORDER_REPLAY_SKIPPED.some((s) => /CV2-500/.test(s.reason))).toBe(
      true,
    );
    expect(ORDER_REPLAY_SKIPPED.some((s) => /MDU-only/.test(s.reason))).toBe(
      true,
    );
  });

  it("parses CZ 3× and WSG", () => {
    expect(parseTypeString("3xCZI-500/40.5-17")).toMatchObject({
      unitCount: 3,
      family: "CZ",
      currentA: 500,
      tapCode: "17",
    });
    expect(parseTypeString("WSGII-800D/40.5-4x5A")).toMatchObject({
      family: "WSG",
      currentA: 800,
      tapCode: "4x5",
    });
  });
});
