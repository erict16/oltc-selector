"use client";

import { useEffect, useMemo, useState } from "react";
import { resolveListPrice } from "@/lib/basePrices";
import {
  FX_FALLBACK,
  FX_STORAGE_KEY,
  LIST_CURRENCIES,
  convertFromCny,
  fetchListRates,
  formatFxDate,
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
  "h-9 w-[7rem] shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] bg-white px-2 text-[0.8125rem] leading-snug text-[var(--color-ink)] transition-colors duration-150 hover:border-[var(--color-accent)] focus:border-[var(--color-accent)] focus:outline-none";

/** Shared list currency + FX. One instance in SelectorApp; alts follow the primary select. */
export function useListFx() {
  const [currency, setCurrencyState] = useState<ListCurrency>("CNY");
  const [fx, setFx] = useState<FxRates>(fallbackFx);

  useEffect(() => {
    setCurrencyState(readStoredCurrency());
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchListRates().then((rates) => {
      if (!cancelled) setFx(rates);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrency = (next: string) => {
    if (!isListCurrency(next)) return;
    setCurrencyState(next);
    try {
      localStorage.setItem(FX_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  return { currency, fx, setCurrency };
}

function CurrencySelect({
  lang,
  currency,
  onCurrency,
}: {
  lang: Lang;
  currency: ListCurrency;
  onCurrency: (next: string) => void;
}) {
  return (
    <label className="flex shrink-0 items-center gap-2">
      <span className="text-[0.75rem] leading-none text-[var(--color-muted)]">
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
  );
}

function amountLine(
  listRmb: number,
  currency: ListCurrency,
  fx: FxRates,
  lang: Lang,
): string {
  const converted = convertFromCny(listRmb, currency, fx.perCny);
  if (currency === "CNY") {
    return t(lang, "priceCny", { n: formatMoney(listRmb, "CNY", lang) });
  }
  return t(lang, "priceConverted", {
    ccy: currency,
    n: formatMoney(converted, currency, lang),
  });
}

/** Compact `USD 12,345` (or `—`) for alt rows. Same currency as the primary block. */
export function AltListAmount({
  model,
  lang,
  currency,
  fx,
}: {
  model: string;
  lang: Lang;
  currency: ListCurrency;
  fx: FxRates;
}) {
  const hit = useMemo(() => resolveListPrice(model), [model]);
  if (!hit.found) {
    return (
      <span className="shrink-0 text-[0.8125rem] leading-none tabular-nums text-[var(--color-muted)]">
        —
      </span>
    );
  }
  const amount = amountLine(hit.listRmb, currency, fx, lang);
  return (
    <span className="shrink-0 text-[0.8125rem] leading-none tabular-nums text-[var(--color-ink-2)]">
      {hit.estimated ? `~ ${amount}` : amount}
    </span>
  );
}

/** 2025 base quotation × mid-market FX. Mount only after a successful select. */
export function ListPrice({
  model,
  lang,
  currency,
  fx,
  onCurrency,
}: {
  model: string;
  lang: Lang;
  currency: ListCurrency;
  fx: FxRates;
  onCurrency: (next: string) => void;
}) {
  const hit = useMemo(() => resolveListPrice(model), [model]);

  if (!hit.found) {
    return (
      <div className="border-t border-[var(--color-rule)] px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.8125rem] font-medium text-[var(--color-ink)]">
              {t(lang, "priceTitle")}
            </p>
            <p className="mt-2 text-[0.875rem] text-[var(--color-muted)]">
              {t(lang, "priceNone")}
            </p>
          </div>
          <CurrencySelect
            lang={lang}
            currency={currency}
            onCurrency={onCurrency}
          />
        </div>
      </div>
    );
  }

  const fxLine = t(lang, fx.live ? "priceFxLive" : "priceFxFallback", {
    date: formatFxDate(fx.date, lang),
  });

  return (
    <div className="border-t border-[var(--color-rule)] px-4 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.8125rem] font-medium text-[var(--color-ink)]">
            {t(lang, "priceTitle")}
          </p>
          <p className="mt-1.5 text-[1.0625rem] leading-none font-normal tabular-nums tracking-tight text-[var(--color-ink)]">
            {hit.estimated
              ? `~ ${amountLine(hit.listRmb, currency, fx, lang)}`
              : amountLine(hit.listRmb, currency, fx, lang)}
          </p>
        </div>
        <CurrencySelect
          lang={lang}
          currency={currency}
          onCurrency={onCurrency}
        />
      </div>
      <p className="mt-2 text-[0.75rem] leading-snug text-[var(--color-muted)]">
        {fxLine}
        <span className="text-[var(--color-rule-2)]"> · </span>
        {t(lang, hit.estimated ? "priceEstimated" : "priceDisclaimer")}
      </p>
    </div>
  );
}
