"use client";

import { useLocale } from "next-intl";
import { LOCALE_COOKIE, locales, type Locale } from "@/i18n/config";

export function LocaleSwitcher() {
  const current = useLocale() as Locale;

  const switchLocale = (locale: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000`;
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-1">
      {locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => switchLocale(loc)}
          className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
            loc === current
              ? "bg-cinnamon/20 font-bold text-cinnamon"
              : "text-espresso/40 hover:text-espresso"
          }`}
        >
          {loc}
        </button>
      ))}
    </div>
  );
}
