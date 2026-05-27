import type { Metadata } from "next";
import "./globals.css";
import { display, editorial, news, sans, mono, script } from "@/lib/fonts";
import { AuthProvider } from "@/lib/auth";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Bakerio — Order Fresh Baked Goods",
  description: "Pick up your order. Bánh mì, croissant, sourdough, cà phê — every morning, eleven shops across Saigon.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVars = `${sans.variable} ${display.variable} ${editorial.variable} ${news.variable} ${mono.variable} ${script.variable}`;
  return (
    <html lang="vi" className={fontVars}>
      <body className="min-h-screen bg-cream text-espresso pb-16 md:pb-0 antialiased">
        <AuthProvider>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-espresso focus:rounded">Skip to content</a>
          <Header />
          {children}
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
