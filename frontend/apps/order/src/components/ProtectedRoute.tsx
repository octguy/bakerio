"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="h-8 w-8 border-4 border-golden border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return null;
  return <>{children}</>;
}
