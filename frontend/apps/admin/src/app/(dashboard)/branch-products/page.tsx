"use client";

import { useAuth } from "@/lib/auth";
import { BranchProductsPageClient } from "@/components/branch-products-page-client";

export default function MyBranchProductsPage() {
  const { user, loading } = useAuth();
  const branch = user?.branch;

  if (loading) return null;

  if (!branch?.id) {
    return (
      <div className="flex h-full flex-col">
        <p className="font-editorial italic text-[var(--admin-muted)]">
          No branch assigned to your account.
        </p>
      </div>
    );
  }

  return (
    <BranchProductsPageClient
      branchId={branch.id}
      branchName={branch.name}
      backHref="/"
      backLabel="Dashboard"
    />
  );
}
