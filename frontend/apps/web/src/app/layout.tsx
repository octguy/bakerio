import type { Metadata } from "next";
import { inter, lora, sacramento } from "@/lib/fonts";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Bakerio — Freshly Baked Happiness",
    template: "%s | Bakerio",
  },
  description: "Artisan cakes, pastries, and bread — crafted with love, served with warmth. 10+ locations in Ho Chi Minh City.",
  metadataBase: new URL("https://bakerio.vn"),
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "Bakerio",
    title: "Bakerio — Freshly Baked Happiness",
    description: "Artisan cakes, pastries, and bread — crafted with love, served with warmth.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} ${lora.variable} ${sacramento.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded">Skip to content</a>
        <Navbar />
        <main id="main-content" className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
