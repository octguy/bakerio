"use client";

import { useTranslations } from "next-intl";

export function SortDropdown({
  sortBy,
  setSortBy,
}: {
  sortBy: string;
  setSortBy: (val: "popular" | "priceLtoH" | "priceHtoL" | "nameAtoZ") => void;
}) {
  const t = useTranslations("menu");

  return (
    <div className="relative">
      <select
        aria-label={t("sortProducts")}
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as "popular" | "priceLtoH" | "priceHtoL" | "nameAtoZ")}
        className="appearance-none rounded-full border-2 border-espresso bg-butter px-4 py-1.5 pr-8 font-mono text-[10px] uppercase tracking-[0.18em] text-espresso shadow-[2px_2px_0_var(--espresso)] outline-none transition-transform focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none"
      >
        <option value="popular">{t("sortPopular")}</option>
        <option value="priceLtoH">{t("sortPriceLow")}</option>
        <option value="priceHtoL">{t("sortPriceHigh")}</option>
        <option value="nameAtoZ">{t("sortName")}</option>
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-espresso">
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}
