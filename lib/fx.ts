/** Indicative mid-market FX for list × FX only. Not Huaming’s 7.0 worksheet. */

export const LIST_CURRENCIES = [
  "CNY",
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "CAD",
  "CHF",
  "HKD",
  "SGD",
  "KRW",
  "INR",
  "THB",
  "IDR",
  "VND",
] as const;

export type ListCurrency = (typeof LIST_CURRENCIES)[number];

export const FX_STORAGE_KEY = "oltc-selector:list-currency";

/** Units of each currency per 1 CNY. Dated so the static Pages build works offline. */
export const FX_FALLBACK = {
  date: "2026-08-18",
  source: "open.er-api.com",
  perCny: {
    CNY: 1,
    USD: 0.14808,
    EUR: 0.127935,
    GBP: 0.109387,
    JPY: 23.605567,
    AUD: 0.208615,
    CAD: 0.205369,
    CHF: 0.120182,
    HKD: 1.161679,
    SGD: 0.189142,
    KRW: 209.687566,
    INR: 14.154482,
    THB: 4.892642,
    IDR: 2645.502646,
    VND: 3875.968992,
  } satisfies Record<ListCurrency, number>,
};

export type FxRates = {
  date: string;
  source: string;
  live: boolean;
  perCny: Record<ListCurrency, number>;
};

export function isListCurrency(value: string): value is ListCurrency {
  return (LIST_CURRENCIES as readonly string[]).includes(value);
}

export function convertFromCny(
  cny: number,
  currency: ListCurrency,
  perCny: Record<string, number> = FX_FALLBACK.perCny,
): number {
  if (currency === "CNY") return cny;
  const rate = perCny[currency];
  if (!(rate > 0)) return cny * FX_FALLBACK.perCny[currency];
  return cny * rate;
}

function mergeRates(
  incoming: Record<string, number>,
  date: string,
  source: string,
  live: boolean,
): FxRates {
  const perCny = { ...FX_FALLBACK.perCny };
  for (const code of LIST_CURRENCIES) {
    if (code === "CNY") continue;
    const n = incoming[code] ?? incoming[code.toLowerCase()];
    if (typeof n === "number" && n > 0) perCny[code] = n;
  }
  return { date, source, live, perCny };
}

export const FRANKFURTER_LATEST = "https://api.frankfurter.dev/v1/latest";
export const ER_API_LATEST = "https://open.er-api.com/v6/latest/CNY";

/** Frankfurter (ECB) first; fill gaps from open.er-api. Offline → dated fallback. */
export async function fetchListRates(
  fetcher: typeof fetch = fetch,
): Promise<FxRates> {
  try {
    const codes = LIST_CURRENCIES.filter((c) => c !== "CNY").join(",");
    const res = await fetcher(
      `${FRANKFURTER_LATEST}?base=CNY&symbols=${codes}`,
    );
    if (res.ok) {
      const body = (await res.json()) as {
        date?: string;
        rates?: Record<string, number>;
      };
      const merged = mergeRates(
        body.rates ?? {},
        body.date ?? FX_FALLBACK.date,
        "frankfurter.dev",
        true,
      );
      const missing = LIST_CURRENCIES.filter(
        (c) => c !== "CNY" && !(body.rates && body.rates[c] > 0),
      );
      if (!missing.length) return merged;
      try {
        const extra = await fetcher(ER_API_LATEST);
        if (extra.ok) {
          const er = (await extra.json()) as {
            time_last_update_utc?: string;
            rates?: Record<string, number>;
          };
          return mergeRates(
            { ...(body.rates ?? {}), ...(er.rates ?? {}) },
            er.time_last_update_utc?.slice(0, 16) ?? merged.date,
            "frankfurter.dev + open.er-api.com",
            true,
          );
        }
      } catch {
        /* keep Frankfurter + fallback for VND etc. */
      }
      return merged;
    }
  } catch {
    /* fall through */
  }
  try {
    const res = await fetcher(ER_API_LATEST);
    if (res.ok) {
      const body = (await res.json()) as {
        time_last_update_utc?: string;
        rates?: Record<string, number>;
      };
      return mergeRates(
        body.rates ?? {},
        body.time_last_update_utc?.slice(0, 16) ?? FX_FALLBACK.date,
        "open.er-api.com",
        true,
      );
    }
  } catch {
    /* dated table */
  }
  return {
    date: FX_FALLBACK.date,
    source: FX_FALLBACK.source,
    live: false,
    perCny: { ...FX_FALLBACK.perCny },
  };
}
