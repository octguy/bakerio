import type { Metadata } from "next";
import { ViewTransitions } from "next-view-transitions";
import "./globals.css";
import { display, editorial, news, sans, mono, script, slab } from "@/lib/fonts";
import { AuthProvider } from "@/lib/auth";
import { QueryProvider } from "@/lib/providers";
import { DesktopSidebarNav } from "@/components/DesktopSidebarNav";
import { LayoutShell } from "@/components/LayoutShell";
import { UndoToast } from "@/components/undo-toast";
import { I18nProvider } from "@/i18n/provider";

export const metadata: Metadata = {
  title: "Bakerio — Order Fresh Baked Goods",
  description:
    "Pick up your order. Bánh mì, croissant, sourdough, cà phê — every morning, eleven shops across Saigon.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const fontVars = `${sans.variable} ${display.variable} ${editorial.variable} ${news.variable} ${mono.variable} ${script.variable} ${slab.variable}`;
  return (
    <html lang="vi" className={fontVars}>
      <body className="min-h-screen bg-cream text-espresso pb-16 lg:pb-0 antialiased">
        <ViewTransitions>
          <AuthProvider>
            <QueryProvider>
            <I18nProvider>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-espresso focus:rounded"
            >
              Skip to content
            </a>
            <DesktopSidebarNav />
            <LayoutShell>{children}</LayoutShell>
            <UndoToast />
            </I18nProvider>
            </QueryProvider>
          </AuthProvider>
        </ViewTransitions>
      </body>
    </html>
  );
}
