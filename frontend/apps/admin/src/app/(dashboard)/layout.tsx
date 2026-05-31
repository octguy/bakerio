"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { AdminTopBar } from "@/components/admin-topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--admin-bg)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-crust border-t-cinnamon" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-full bg-[var(--admin-bg)] text-espresso">
      <a href="#main-content" className="sr-only focus:not-sr-only">Skip to main content</a>
      <Sidebar />
      <main id="main-content" className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminTopBar />
        <div className="flex-1 overflow-auto px-5 pt-4 pb-6 md:px-7 md:pt-6">{children}</div>
      </main>
    </div>
  );
}
