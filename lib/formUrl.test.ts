import { describe, expect, it } from "vitest";
import {
  INITIAL_FORM,
  commitRange,
  editStepPct,
  formSelectInput,
  pickKind,
  pickPhases,
  pickPm,
  pickRegulation,
  readLine,
  toOctc,
  toOltc,
  type FormState,
} from "./formState";
import { decodeForm, encodeForm } from "./formUrl";

const roundTrip = (f: FormState, line = "") => decodeForm(`#${encodeForm(f, line)}`);

describe("form in the URL hash", () => {
  it("writes nothing for the default form and reads it back", () => {
    expect(encodeForm(INITIAL_FORM)).toBe("");
    expect(decodeForm("").form).toBe(INITIAL_FORM);
    expect(decodeForm("#").form).toBe(INITIAL_FORM);
    expect(roundTrip(INITIAL_FORM).form).toBe(INITIAL_FORM);
  });

  it("writes only what differs from the default", () => {
    const f: FormState = { ...INITIAL_FORM, transformerMva: 63 };
    expect(encodeForm(f)).toBe("mva=63");
    const g: FormState = { ...INITIAL_FORM, input: { ...INITIAL_FORM.input, mounting: "on_tank" } };
    expect(encodeForm(g)).toBe("mt=on_tank");
  });

  it("round-trips custom values", () => {
    let f: FormState = {
      ...INITIAL_FORM,
      transformerMva: 31.5,
      mvaCustom: true,
      windingRatedKv: 38.5,
      safetyK: 1.2,
      earthUm: 72.5,
      osImaxA: 612.5,
      osUstV: 880,
      market: "TR",
      input: {
        ...INITIAL_FORM.input,
        mounting: "external_compartment",
        preferVacuum: false,
        medium: "oil",
        acrossTapBilKv: 350,
        acrossTapPfKv: 82,
        preferStructure: "combined",
      },
    };
    f = editStepPct(f, 1.43, true);
    f = pickRegulation(f, "coarse_fine");
    f = pickPhases(f, "I");
    const back = roundTrip(f);
    expect(back.form).toEqual(f);
    expect(formSelectInput(back.form)).toEqual(formSelectInput(f));
  });

  it("round-trips a custom +a/−b range", () => {
    let f = pickPm(INITIAL_FORM, "");
    f = commitRange(f, 4, 12, 1.25);
    expect(roundTrip(f).form).toEqual(f);
  });

  it("round-trips current entry on equipment Um", () => {
    const f: FormState = {
      ...INITIAL_FORM,
      currentMode: "current",
      voltageMode: "equipment",
      windingRatedKv: 0,
      input: { ...INITIAL_FORM.input, throughCurrentA: 1200, umKv: 72.5, stepVoltageV: 2000 },
    };
    expect(roundTrip(f).form).toEqual(f);
  });

  it("round-trips an autotransformer", () => {
    const f = { ...pickKind(INITIAL_FORM, "auto"), hvKv: 225, mvKv: 115, transformerMva: 125 };
    expect(f.kind).toBe("auto");
    const back = roundTrip(f);
    expect(back.form).toEqual(f);
    expect(back.form.tapPoint).toBe(f.tapPoint);
  });

  it("round-trips off-circuit and the way back to on-load", () => {
    const octc = toOctc({ ...INITIAL_FORM, input: { ...INITIAL_FORM.input, regulation: "coarse_fine" } });
    expect(octc.input.dutyKind).toBe("octc");
    const back = roundTrip(octc).form;
    expect(back).toEqual(octc);
    expect(toOltc(back)).toEqual(toOltc(octc));
  });

  it("round-trips a read tender line with its text", () => {
    const line = "220/110/35kV-125MVA 225±8x1,25%/115/35kV YNa0d11";
    const f = readLine(INITIAL_FORM, line);
    expect(f.lineRead).not.toBeNull();
    const back = roundTrip(f, line);
    expect(back.line).toBe(line);
    expect(back.form).toEqual(f);
    expect(formSelectInput(back.form)).toEqual(formSelectInput(f));
  });

  it("drops the line text when no line is in force", () => {
    expect(encodeForm({ ...INITIAL_FORM, transformerMva: 40 }, "some text")).toBe("mva=40");
  });

  it("ignores unknown keys", () => {
    const d = decodeForm("#mva=63&utm_source=mail&zzz=1");
    expect(d.form).toEqual({ ...INITIAL_FORM, transformerMva: 63 });
    expect(decodeForm("#utm_source=mail").form).toBe(INITIAL_FORM);
  });

  it("falls back to the default form on garbage or hostile input, without throwing", () => {
    const hostile = [
      "#%E0%A4%A",
      "#mva=abc",
      "#mva=-5",
      "#mva=1e309",
      "#mva=Infinity",
      "#mva=NaN",
      "#mva=99999999999",
      "#kd=__proto__",
      "#__proto__=1&constructor=2&kd=nope",
      "#kd=auto&tap=neutral",
      "#w=delta&tap=neutral",
      "#tr=1_2_3",
      "#tr=a_b_c_d",
      "#pt=11",
      "#mid=2",
      "#mk=<script>",
      "#oc=<img onerror=alert(1)>",
      "#pm=javascript:alert(1)",
      `#mva=${"9".repeat(5000)}`,
      "#" + "a=1&".repeat(2000),
      "#&&&===",
      "#mva",
      "?mva=63#",
      "\u0000￿",
    ];
    for (const h of hostile) {
      expect(() => decodeForm(h), h).not.toThrow();
      expect(decodeForm(h).form, h).toBe(INITIAL_FORM);
    }
    // @ts-expect-error not a string
    expect(decodeForm(null).form).toBe(INITIAL_FORM);
    // @ts-expect-error not a string
    expect(decodeForm({ toString: () => "mva=63" }).form).toBe(INITIAL_FORM);
  });

  it("keeps a good form when only the line is unreadable", () => {
    const d = decodeForm("#mva=63&ln=%3Cscript%3E");
    expect(d.form).toEqual({ ...INITIAL_FORM, transformerMva: 63 });
    expect(d.line).toBe("");
  });

  it("never touches the default form object", () => {
    const before = JSON.stringify(INITIAL_FORM);
    decodeForm("#mva=63&mt=reactor&tr=4_12_17_0.0125");
    expect(JSON.stringify(INITIAL_FORM)).toBe(before);
  });
});

describe("2026-11-13 second review", () => {
  it("a tender line with ±2 steps comes back from its link", () => {
    const f = readLine(INITIAL_FORM, "25 MVA 110±2x2.5%/10.5 kV YNd11");
    const back = decodeForm(encodeForm(f, "25 MVA 110±2x2.5%/10.5 kV YNd11"));
    expect(formSelectInput(back.form)).toEqual(formSelectInput(f));
    expect(back.line).toContain("110±2x2.5%");
  });

  it("a 1.1 % step survives the float noise of pct / 100", () => {
    const f = readLine(INITIAL_FORM, "40 MVA 132±8x1.1%/33 kV YNd11 linear");
    const hash = encodeForm(f, "40 MVA 132±8x1.1%/33 kV YNd11 linear");
    expect(hash).not.toMatch(/0000000/);
    expect(hash).toContain("tr=8_8_17_0.011");
    const back = decodeForm(hash).form;
    // The cleaned 0.011 moves Ust in the 13th digit only.
    expect(back.tapRange).toEqual({ plus: 8, minus: 8, positions: 17, stepPercent: 0.011 });
    expect(back.windingRatedKv).toBe(132);
    expect(back.input.regulation).toBe("linear");
  });

  it("one unreadable value is skipped, the rest of the link still applies", () => {
    const d = decodeForm("kv=220&mva=63&sp=not-a-number");
    expect(d.form.windingRatedKv).toBe(220);
    expect(d.form.transformerMva).toBe(63);
    expect(d.form.stepPercentPct).toBe(INITIAL_FORM.stepPercentPct);
  });

  it.each(["dk=octc&rg=reversing", "st=cage", "dk=octc&rg=linear&st=combined", "pm=8&pms=16"])(
    "a hand-edited link the page could not make gives the default form: %s",
    (hash) => {
      expect(decodeForm(hash).form).toBe(INITIAL_FORM);
    },
  );
});
