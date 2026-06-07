"use client";

import { NextIntlClientProvider } from "next-intl";
import { useSyncExternalStore } from "react";
import { defaultLocale, locales, LOCALE_COOKIE, type Locale } from "./config";
import vi from "../messages/vi.json";
import en from "../messages/en.json";

const messageMap: Record<Locale, typeof vi> = { vi, en };

function getLocaleFromCookie(): Locale {
  if (typeof document === "undefined") return defaultLocale;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  const val = match?.[1];
  return locales.includes(val as Locale) ? (val as Locale) : defaultLocale;
}

function subscribe() {
  // Cookie changes don't fire events; locale only changes on reload
  return () => {};
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getLocaleFromCookie, () => defaultLocale);

  return (
    <NextIntlClientProvider locale={locale} messages={messageMap[locale]}>
      {children}
    </NextIntlClientProvider>
  );
}
