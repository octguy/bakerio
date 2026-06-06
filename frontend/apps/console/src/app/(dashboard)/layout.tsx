"use client";

import { useAuth } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { ConsoleTopBar } from "@/components/console-topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--console-bg)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-crust border-t-cinnamon" />
      </div>
    );
  }

  if (!user) return null;

  const roles = user.roles || [];
  const isSuperAdmin = roles.includes("super_admin");
  const isBranchManager = roles.includes("branch_manager");
  const isProductManager = roles.includes("product_manager");

  let hasAccess = true;

  if (pathname.startsWith("/all-users")) {
    hasAccess = isSuperAdmin;
  } else if (pathname.startsWith("/staff")) {
    hasAccess = isSuperAdmin || isBranchManager;
  } else if (pathname.startsWith("/branch-products")) {
    hasAccess = isSuperAdmin || isBranchManager;
  } else if (pathname.startsWith("/branches")) {
    hasAccess = isSuperAdmin;
  } else if (pathname.startsWith("/vouchers")) {
    hasAccess = isSuperAdmin || isProductManager;
  } else if (pathname.startsWith("/categories")) {
    hasAccess = isSuperAdmin || isProductManager;
  } else if (pathname.startsWith("/products")) {
    hasAccess = isSuperAdmin || isProductManager;
  } else if (pathname.startsWith("/orders")) {
    hasAccess = isSuperAdmin || isBranchManager || roles.includes("branch_staff");
  } else if (pathname === "/" || pathname.startsWith("/account")) {
  }

  if (!hasAccess) {
    return (
      <div className="flex h-full bg-[var(--console-bg)] text-espresso">
        <a href="#main-content" className="sr-only focus:not-sr-only">Skip to main content</a>
        <Sidebar />
        <main id="main-content" className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <ConsoleTopBar />
          <div className="flex-1 overflow-auto px-5 pt-4 pb-6 md:px-7 md:pt-6">
            <div className="flex h-full flex-col items-center justify-center text-center">
              <h1 className="text-4xl font-bold text-destructive">403</h1>
              <p className="mt-2 text-lg">You do not have permission to view this page.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[var(--console-bg)] text-espresso">
      <a href="#main-content" className="sr-only focus:not-sr-only">Skip to main content</a>
      <Sidebar />
      <main id="main-content" className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <ConsoleTopBar />
        <div className="flex-1 overflow-auto px-5 pt-4 pb-6 md:px-7 md:pt-6">{children}</div>
      </main>
    </div>
  );
}
