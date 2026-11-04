/**
 * Nameplate replay: drive the shipped OS rows from MVA / rated kV / Y-D
 * through deriveDuty (the web form and CLI path), then the engine, and
 * compare against what was sold. The OS replay feeds the sold Um straight
 * in; this one checks the Um and current rules themselves.
 *
 *   npx vite-node scripts/nameplateReplay.ts [2025|2026]
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { selectOltc } from "../lib/engine";
import { commercialMatch, parseTypeString } from "../lib/orderReplay";
import {
  buildOsSelectInput,
  familyDuty,
  loadOsSales,
  numCell,
  soldTypeInResults,
} from "../lib/osReplay";
import { deriveDuty, type TransformerSpec } from "../lib/transformer";
import { osMarket, osStepFraction, truncatedTapCode, unevenTapGeometry } from "./replayTap";

type Verdict = {
  serial: string;
  customer: string;
  sold: string;
  kv: number;
  mva: number;
  conn: string;
  tap: string;
  iOs: number;
  iDerived: number;
  umSold: number;
  umDerived: number;
  umAssumed: boolean;
  primary: string;
  primaryMatch: boolean;
  soldListed: boolean;
  /** Engine #1 letter with selectorSize auto, and the sold letter. */
  gradeEngine: string;
  gradeSold: string;
};

// 2026-11-04 audit GRADE-3: the type verdicts feed the sold letter in, so
// they never test the grade. A second run with selectorSize auto does.
const GRADES = ["B", "C", "D", "DE"];
const gradeCmp = (e: string, s: string): "match" | "weaker" | "stronger" | null => {
  const ei = GRADES.indexOf(e);
  const si = GRADES.indexOf(s);
  if (ei < 0 || si < 0) return null;
  return ei === si ? "match" : ei < si ? "weaker" : "stronger";
};

const year = process.argv[2] ?? "2026";
const rows = loadOsSales(
  JSON.parse(
    readFileSync(path.join(process.cwd(), "docs", "replay", `${year}-os-sales.json`), "utf8"),
  ),
);

const out: Verdict[] = [];
const skipped: Record<string, number> = {};
const skip = (why: string) => (skipped[why] = (skipped[why] ?? 0) + 1);

for (const row of rows) {
  const sold = (row.sold_type ?? "").toString().trim();
  const parsed = sold ? parseTypeString(sold) : null;
  if (!parsed) { skip("no / unparsed sold type"); continue; }
  const fam = familyDuty(parsed.family);
  if (!fam || fam.dutyKind === "octc") { skip("OCTC or unknown family"); continue; }
  const mva = numCell(row.mva);
  const kv = numCell(row.rated_kv);
  const iOs = numCell(row.i_a);
  if (!mva || !kv || !iOs) { skip("no MVA / kV / I on the OS"); continue; }
  const conn = (row.connection || parsed.connection || "").toUpperCase();
  if (conn !== "Y" && conn !== "D") { skip("no Y/D"); continue; }

  // 2026-11-04 r2 ORDERS-2: cut-off codes are skipped; 10181G keeps positions + mid.
  const tapNorm = (row.tap_code || parsed.tapCode || "").toString().replace(/\s+/g, "");
  if (truncatedTapCode(tapNorm, parsed.family)) { skip("tap code truncated"); continue; }
  const built = buildOsSelectInput(row, parsed);
  if ("skip" in built) { skip(built.skip); continue; }
  const uneven = unevenTapGeometry(tapNorm);
  const base = uneven ? { ...built, plusMinusSteps: undefined, ...uneven } : built;

  // 2026-11-04 r3 ORDERS-10: minus range, step and OS Imax go in, so deriveDuty
  // gives the lowest-tap current the app sizes on (it was the OS rated current).
  const iMaxOs = numCell(row.i_max_a);
  const nMinus = base.regulation !== "linear" ? (numCell(row.minus_steps) ?? base.plusMinusSteps ?? 0) : 0;
  // The step is read by the OS letter, as a user types the nameplate step %.
  const stepFraction = osStepFraction(kv, conn, base.stepVoltageV, nMinus) ?? 0;
  // Y = star neutral. D = line end; the OS current tells star from delta.
  const specs: TransformerSpec[] = (conn === "Y"
    ? [{ tapPoint: "neutral", winding: "star" }]
    : [
        { tapPoint: "line_end", winding: "delta" },
        { tapPoint: "line_end", winding: "star" },
      ]
  ).map((p) => ({
    kind: "two_winding",
    tapPoint: p.tapPoint as TransformerSpec["tapPoint"],
    winding: p.winding as TransformerSpec["winding"],
    mva,
    tapKv: kv,
    hvKv: 0,
    mvKv: 0,
    minusSteps: nMinus,
    stepFraction,
    safetyK: 1,
    ...(iMaxOs ? { statedMaxA: iMaxOs } : {}),
  }));
  // A single-phase unit carries the winding current whatever the bank.
  const duties = specs
    .map((s) => ({ s, d: deriveDuty(s) }))
    .filter((x) => x.d.ok)
    .sort((a, b) => Math.abs(a.d.ratedA / iOs - 1) - Math.abs(b.d.ratedA / iOs - 1));
  if (!duties.length) { skip("deriveDuty refused"); continue; }
  const { s, d } = duties[0]!;

  // The app passes the tapped winding kV (FAM-2/FAM-3, the 330 kV-class grade).
  // A rated current far from the OS one is a kV from another winding (the
  // "current off" table): those rows keep the OS figure.
  const fitsOs = iOs / d.ratedA >= 0.85 && iOs / d.ratedA <= 1.4;
  const sizedA = fitsOs && ((s.stepFraction ?? 0) > 0 || iMaxOs) ? d.dutyA : base.throughCurrentA;
  // r3 ORDERS-11: the --market a user would type (TR raises 72.5 neutrals to C).
  const market = osMarket(row.customer);
  const input = { ...base, throughCurrentA: sizedA, ...(market ? { market } : {}), tapWindingKv: kv, umKv: d.umKv, combinedOnly: d.combinedOnly, connection: parsed.phases === "I" ? base.connection : d.connection };
  const res = selectOltc(input);
  const models = res.results.map((r) => r.model);
  const primary = models[0] ?? "";
  const auto = selectOltc({ ...input, selectorSize: "auto" }).results[0];
  out.push({
    serial: (row.serial ?? row.file ?? "").toString(),
    customer: (row.customer ?? "").toString(),
    sold,
    kv,
    mva,
    conn,
    tap: `${s.tapPoint}/${s.winding}`,
    iOs,
    iDerived: d.ratedA,
    umSold: parsed.umKv,
    umDerived: d.umKv,
    umAssumed: d.umAssumed,
    primary,
    primaryMatch:
      !!primary &&
      (commercialMatch(primary.replace(/^3[x×]/, ""), sold.replace(/^3[x×]/, ""), "full") ||
        commercialMatch(primary.replace(/^3[x×]/, ""), sold.replace(/^3[x×]/, ""), "family-i-um")),
    soldListed: soldTypeInResults(sold, models),
    gradeEngine: auto?.selectorSize ?? "",
    gradeSold: parsed.selectorSize ?? "",
  });
}

const n = out.length;
const pct = (k: number) => `${((100 * k) / n).toFixed(1)}%`;
const umSame = out.filter((v) => v.umDerived === v.umSold);
const umLow = out.filter((v) => v.umDerived < v.umSold);
const umHigh = out.filter((v) => v.umDerived > v.umSold);
const iOff = out.filter((v) => Math.abs(v.iDerived / v.iOs - 1) > 0.05);
const listed = out.filter((v) => v.soldListed);
const top = out.filter((v) => v.primaryMatch);
const grade = { match: 0, weaker: 0, stronger: 0 };
const gradeByUm = new Map<number, typeof grade>();
for (const v of out) {
  const c = gradeCmp(v.gradeEngine, v.gradeSold);
  if (!c) continue;
  grade[c]++;
  const g = gradeByUm.get(v.umSold) ?? { match: 0, weaker: 0, stronger: 0 };
  g[c]++;
  gradeByUm.set(v.umSold, g);
}
const gradeRows = [...gradeByUm.keys()]
  .sort((a, b) => a - b)
  .map((u) => {
    const g = gradeByUm.get(u)!;
    return `| ${u} | ${g.match} | ${g.weaker} | ${g.stronger} |`;
  })
  .join("\n");

const row = (v: Verdict) =>
  `| ${v.serial} | ${v.customer.slice(0, 24)} | ${v.mva} MVA ${v.kv} kV ${v.conn} | ${v.tap} | ${v.iOs} / ${v.iDerived.toFixed(1)} | ${v.umSold} / ${v.umDerived}${v.umAssumed ? "*" : ""} | \`${v.sold}\` | \`${v.primary}\` |`;
const head =
  "| serial | customer | nameplate | tap point | I OS / derived | Um sold / derived | sold | engine #1 |\n|---|---|---|---|---|---|---|---|";

const md = `# ${year} nameplate replay

Generated by \`scripts/nameplateReplay.ts\`. Duty comes from MVA, rated kV and Y/D through \`deriveDuty\` (the web form and CLI path); step voltage and steps come from the OS. Y is taken as a star neutral; D as a line end, star or delta by whichever matches the OS current. The rated kV is passed as the tapped-winding kV, as the app does; cut-off sold tap codes are skipped. Since r3 the current is the lowest-tap current deriveDuty gives from the OS minus steps and step (or the OS Imax), not the OS rated current; rows whose OS current does not fit the nameplate keep the OS figure. Turkish buyers go in as \`--market TR\`.

Rows judged: ${n}. Skipped: ${Object.values(skipped).reduce((a, b) => a + b, 0)} (${Object.entries(skipped)
  .map(([k, v]) => `${k} ${v}`)
  .join(", ")}).

| check | n | share |
|---|---:|---:|
| Um class derived = sold | ${umSame.length} | ${pct(umSame.length)} |
| Um derived below sold (under-insulated if trusted) | ${umLow.length} | ${pct(umLow.length)} |
| Um derived above sold | ${umHigh.length} | ${pct(umHigh.length)} |
| Current off the OS by more than 5% | ${iOff.length} | ${pct(iOff.length)} |
| Engine #1 = sold (family, I, Um) | ${top.length} | ${pct(top.length)} |
| Sold type in the engine's list | ${listed.length} | ${pct(listed.length)} |
| Grade (engine #1, auto) = sold letter | ${grade.match} | |
| Grade weaker than sold | ${grade.weaker} | |
| Grade stronger than sold | ${grade.stronger} | |

\`*\` = neutral Um assumed (72.5) and flagged 待 OS 核对 in the app.

## Grade by sold Um

| sold Um | match | weaker than sold | stronger |
|---:|---:|---:|---:|
${gradeRows}

## Um derived below sold

${head}
${umLow.map(row).join("\n")}

## Um derived above sold

${head}
${umHigh.map(row).join("\n")}

## Current off by more than 5%

${head}
${iOff.map(row).join("\n")}
`;

if (process.env.REPLAY_JSON) writeFileSync(process.env.REPLAY_JSON, JSON.stringify(out));
const file = path.join(process.cwd(), "docs", "replay", `${year}-nameplate-replay.md`);
writeFileSync(file, md);
console.log(
  JSON.stringify(
    {
      year,
      judged: n,
      skipped,
      umSame: umSame.length,
      umLow: umLow.length,
      umLowAssumed: umLow.filter((v) => v.umAssumed).length,
      umHigh: umHigh.length,
      iOff: iOff.length,
      top: top.length,
      listed: listed.length,
      grade,
    },
    null,
    1,
  ),
);
