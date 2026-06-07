import { getRequestConfig } from "next-intl/server";
import { defaultLocale } from "./config";

export default getRequestConfig(async () => {
  // Server components always render with default locale (vi).
  // Client-side I18nProvider handles actual locale from cookie.
  const messages = (await import(`../messages/${defaultLocale}.json`)).default;
  return { locale: defaultLocale, messages };
});
