import type { Metadata } from "next";
import { Providers } from "@/lib/providers";
import { display, editorial, news, sans, mono, script } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bakerio · Ops",
  description: "Bakerio back-office — counter, kitchen, catalogue, inventory.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVars = `${sans.variable} ${display.variable} ${editorial.variable} ${news.variable} ${mono.variable} ${script.variable}`;
  return (
    <html lang="vi" className={`${fontVars} h-full`}>
      <body className="h-full bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
