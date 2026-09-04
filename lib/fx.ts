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
  "TRY",
  "RUB",
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
    TRY: 7.153076,
    RUB: 13.03781,
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

const FX_DATE_LOCALE: Record<string, string> = {
  zh: "zh-CN",
  en: "en-US",
  vi: "vi-VN",
  es: "es",
  tr: "tr-TR",
  ru: "ru-RU",
};

/** Normalize API dates (`2026-08-19` or `Tue, 18 Aug 2026 …`) to YYYY-MM-DD. */
export function toIsoDate(raw?: string | null): string {
  if (!raw) return FX_FALLBACK.date;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return FX_FALLBACK.date;
  return d.toISOString().slice(0, 10);
}

/** FX date in the UI language (20 авг. 2026 г. / 2026年8月20日). */
export function formatFxDate(raw: string, lang: string): string {
  const iso = toIsoDate(raw);
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return raw;
  return new Intl.DateTimeFormat(FX_DATE_LOCALE[lang] ?? "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
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
        toIsoDate(body.date),
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
            toIsoDate(er.time_last_update_utc) || merged.date,
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
        toIsoDate(body.time_last_update_utc),
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
