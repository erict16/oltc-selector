"use client";

import { useEffect, useMemo, useState } from "react";
import { lookupListPrice } from "@/lib/basePrices";
import {
  FX_FALLBACK,
  FX_STORAGE_KEY,
  LIST_CURRENCIES,
  convertFromCny,
  fetchListRates,
  isListCurrency,
  type FxRates,
  type ListCurrency,
} from "@/lib/fx";
import { t, type Lang } from "@/lib/i18n";

/** Integer-style ISO codes. List RMB is whole yuan. */
const ZERO_DEC = new Set<ListCurrency>([
  "CNY",
  "JPY",
  "KRW",
  "VND",
  "IDR",
]);

const LANG_LOCALE: Record<Lang, string> = {
  zh: "zh-CN",
  en: "en-US",
  vi: "vi-VN",
  es: "es",
  tr: "tr-TR",
  ru: "ru-RU",
};

function formatMoney(n: number, currency: ListCurrency, lang: Lang): string {
  const digits = ZERO_DEC.has(currency) ? 0 : 2;
  return new Intl.NumberFormat(LANG_LOCALE[lang], {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

function readStoredCurrency(): ListCurrency {
  if (typeof window === "undefined") return "CNY";
  try {
    const raw = localStorage.getItem(FX_STORAGE_KEY);
    if (raw && isListCurrency(raw)) return raw;
  } catch {
    /* private mode */
  }
  return "CNY";
}

const fallbackFx: FxRates = {
  date: FX_FALLBACK.date,
  source: FX_FALLBACK.source,
  live: false,
  perCny: { ...FX_FALLBACK.perCny },
};

const selectClass =
  "h-10 w-[7.5rem] shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] bg-white px-3 text-[0.9rem] leading-snug text-[var(--color-ink)] transition-colors duration-150 hover:border-[var(--color-accent)] focus:border-[var(--color-accent)]";

/** 2025 list RMB FOB Shanghai × mid-market FX. Mount only after a successful select. */
export function ListPrice({ model, lang }: { model: string; lang: Lang }) {
  const hit = useMemo(() => lookupListPrice(model), [model]);
  const [currency, setCurrency] = useState<ListCurrency>(readStoredCurrency);
  const [fx, setFx] = useState<FxRates>(fallbackFx);

  useEffect(() => {
    if (!hit.found) return;
    let cancelled = false;
    fetchListRates().then((rates) => {
      if (!cancelled) setFx(rates);
    });
    return () => {
      cancelled = true;
    };
  }, [hit.found]);

  const onCurrency = (next: string) => {
    if (!isListCurrency(next)) return;
    setCurrency(next);
    try {
      localStorage.setItem(FX_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  if (!hit.found) {
    return (
      <div className="border-t border-[var(--color-rule)] px-4 py-3">
        <p className="text-[0.8125rem] font-medium text-[var(--color-ink)]">
          {t(lang, "priceTitle")}
        </p>
        <p className="mt-1.5 text-[0.8125rem] text-[var(--color-muted)]">
          {t(lang, "priceNone")}
        </p>
      </div>
    );
  }

  const converted = convertFromCny(hit.listRmb, currency, fx.perCny);
  const fxLine = t(lang, fx.live ? "priceFxLive" : "priceFxFallback", {
    date: fx.date,
  });

  return (
    <div className="border-t border-[var(--color-rule)] px-4 py-3">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.8125rem] font-medium text-[var(--color-ink)]">
            {t(lang, "priceTitle")}
          </p>
          <p className="mt-1.5 font-mono text-[1rem] leading-snug font-medium tracking-tight tabular-nums text-[var(--color-ink)]">
            {t(lang, "priceCny", {
              n: formatMoney(hit.listRmb, "CNY", lang),
            })}
          </p>
        </div>
        <label className="flex shrink-0 flex-col gap-1.5">
          <span className="text-[0.8125rem] leading-snug font-medium text-[var(--color-ink)]">
            {t(lang, "priceCurrency")}
          </span>
          <select
            className={selectClass}
            value={currency}
            onChange={(e) => onCurrency(e.target.value)}
            aria-label={t(lang, "priceCurrency")}
          >
            {LIST_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </label>
      </div>
      {currency !== "CNY" ? (
        <p className="mt-2 font-mono text-[0.875rem] tabular-nums text-[var(--color-ink-2)]">
          {t(lang, "priceConverted", {
            ccy: currency,
            n: formatMoney(converted, currency, lang),
          })}
        </p>
      ) : null}
      <p className="mt-2 text-[0.75rem] leading-snug text-[var(--color-muted)]">
        {fxLine}
      </p>
      <p className="mt-1 text-[0.75rem] leading-snug text-[var(--color-muted)]">
        {t(lang, "priceDisclaimer")}
      </p>
    </div>
  );
}
