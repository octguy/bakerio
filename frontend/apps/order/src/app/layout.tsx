import type { Metadata } from "next";
import { Lora, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";

const lora = Lora({ subsets: ["latin"], variable: "--font-heading", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: "Bakerio - Order Fresh Baked Goods",
  description: "Order cakes, pastries, bread and drinks from Bakerio",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lora.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-cream text-espresso font-body pb-16 md:pb-0">
        <AuthProvider>
          <Header />
          {children}
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
