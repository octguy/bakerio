import type { Metadata } from "next";
import { display, editorial, news, sans, mono, script, slab } from "@/lib/fonts";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { SmoothScroll } from "@/app/_components/SmoothScroll";
import { I18nProvider } from "@/i18n/provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Bakerio — Every Bite Tells a Story",
    template: "%s | Bakerio",
  },
  description: "A bakery rooted in Saigon. Sourdough fermented 48 hours, butter croissants laminated by hand, bánh mì on a crust we don't apologise for.",
  metadataBase: new URL("https://thinhuit.id.vn"),
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "Bakerio",
    title: "Bakerio — Every Bite Tells a Story",
    description: "A bakery rooted in Saigon. Eleven shops, one city.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fontVars = `${sans.variable} ${display.variable} ${editorial.variable} ${news.variable} ${mono.variable} ${script.variable} ${slab.variable}`;
  return (
    <html lang="vi" className={`${fontVars} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-cream text-espresso">
        <I18nProvider>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-espresso focus:rounded">Skip to content</a>
        <Navbar />
        <SmoothScroll>
          <main id="main-content" className="flex-1">{children}</main>
          <Footer />
        </SmoothScroll>
        </I18nProvider>
      </body>
    </html>
  );
}
