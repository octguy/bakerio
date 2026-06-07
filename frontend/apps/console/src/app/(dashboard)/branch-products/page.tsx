"use client";

import { useAuth } from "@/lib/auth";
import { BranchProductsPageClient } from "@/components/branch-products-page-client";
import { useTranslations } from "next-intl";

export default function MyBranchProductsPage() {
  const t = useTranslations("branchProducts");
  const { user, loading } = useAuth();
  const branch = user?.branch;

  if (loading) return null;

  if (!branch?.id) {
    return (
      <div className="flex h-full flex-col">
        <p className="font-editorial italic text-[var(--console-muted)]">
          {t("noBranch")}
        </p>
      </div>
    );
  }

  return (
    <BranchProductsPageClient
      branchId={branch.id}
      branchName={branch.name}
      backHref="/"
      backLabel={t("dashboard")}
    />
  );
}
