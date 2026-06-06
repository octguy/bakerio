"use client";

import { useAuth } from "@/lib/auth";
import { useTransitionRouter as useRouter } from "next-view-transitions";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, ReactNode, Suspense } from "react";

function buildLoginPath(pathname: string, queryString: string) {
  const currentPath = queryString ? `${pathname}?${queryString}` : pathname;
  if (!currentPath.startsWith("/") || currentPath.startsWith("//") || currentPath.includes("\\")) {
    return "/login";
  }
  return `/login?next=${encodeURIComponent(currentPath)}`;
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="h-8 w-8 border-4 border-golden border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRouteInner({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(buildLoginPath(pathname, searchParams.toString()));
    }
  }, [user, loading, pathname, router, searchParams]);

  if (loading) return <LoadingScreen />;
  if (!user) return null;
  return <>{children}</>;
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ProtectedRouteInner>{children}</ProtectedRouteInner>
    </Suspense>
  );
}
