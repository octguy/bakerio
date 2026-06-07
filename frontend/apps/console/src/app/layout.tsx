import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "@/lib/providers";
import { display, editorial, news, sans, mono, script } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bakerio · Ops",
  description: "Bakerio back-office — counter, kitchen, catalogue, inventory.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const fontVars = `${sans.variable} ${display.variable} ${editorial.variable} ${news.variable} ${mono.variable} ${script.variable}`;
  return (
    <html lang={locale} className={`${fontVars} h-full`}>
      <body className="h-full bg-background text-foreground antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-espresso focus:rounded">Skip to content</a>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
