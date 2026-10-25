/**
 * Plain decimal numbers typed by people in six languages.
 * `,` and `，` are decimal points (vi / es / tr / id write 0,5).
 * `1,200` is ambiguous — 1.2 or 1200 — so it is refused, not guessed.
 * No hex, exponent, sign, or thousands separators.
 */
export type DecimalParse =
  | { ok: true; value: number }
  | { ok: false; reason: "empty" | "invalid" | "ambiguous" };

const GROUPED = /^\d{1,3}([,，]\d{3})+$/;
const PLAIN = /^\d*\.?\d*$/;

export function parseDecimal(raw: string): DecimalParse {
  const s = String(raw).trim().replace(/\s+/g, "");
  if (!s) return { ok: false, reason: "empty" };
  if (GROUPED.test(s)) return { ok: false, reason: "ambiguous" };
  const t = s.replace(/[,，]/g, ".");
  if (!PLAIN.test(t) || t === ".") return { ok: false, reason: "invalid" };
  const n = Number(t);
  if (!Number.isFinite(n)) return { ok: false, reason: "invalid" };
  return { ok: true, value: n };
}

/**
 * Keystroke filter for a text field: keep the draft the person typed
 * (`1.`, `0,`) and report the number it holds so far, if any.
 * Null `draft` means reject the keystroke.
 */
export function decimalDraft(raw: string): {
  draft: string | null;
  value: number | null;
} {
  const d = raw.replace(/\s+/g, "").replace(/[,，]/g, ".");
  if (!PLAIN.test(d)) return { draft: null, value: null };
  if (d === "" || d === ".") return { draft: d, value: null };
  const n = Number(d);
  return Number.isFinite(n) ? { draft: d, value: n } : { draft: null, value: null };
}
