"use client";

import { useMutation } from "@tanstack/react-query";
import { seedDemo, type SeedDemoSummary } from "@repo/api-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";

const COUNTS: ReadonlyArray<{ key: keyof SeedDemoSummary; labelKey: string }> = [
  { key: "branches", labelKey: "branches" },
  { key: "categories", labelKey: "categories" },
  { key: "products", labelKey: "products" },
  { key: "branch_products", labelKey: "branchProducts" },
  { key: "product_images", labelKey: "productImages" },
  { key: "customers", labelKey: "customers" },
  { key: "staff", labelKey: "staff" },
  { key: "addresses", labelKey: "addresses" },
  { key: "orders", labelKey: "orders" },
  { key: "vouchers", labelKey: "vouchers" },
  { key: "memberships", labelKey: "memberships" },
];

export default function SeedDemoPage() {
  const t = useTranslations("admin");
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [summary, setSummary] = useState<SeedDemoSummary | null>(null);

  useEffect(() => {
    if (user && !user.roles?.includes("super_admin")) {
      router.replace("/");
    }
  }, [user, router]);

  const mutation = useMutation({
    mutationFn: seedDemo,
    onSuccess: (data) => {
      setSummary(data);
      toast(
        data.skipped
          ? t("seedSkipped")
          : t("seedSuccess"),
        data.skipped ? "info" : "success",
      );
    },
    onError: (error: Error) => {
      toast(`${t("seedFailed")}: ${error.message}`, "error");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl text-[var(--console-ink-text)]">
          {t("seedTitle")}
        </h1>
        <p className="text-sm text-[var(--console-muted-dark)]">
          {t("seedDescription")}
        </p>
      </header>

      <Button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? t("seeding") : t("runSeed")}
      </Button>

      {summary && (
        <section className="rounded-lg border border-border bg-background p-4">
          <h2 className="mb-3 font-display text-base">
            {summary.skipped ? t("alreadyPopulated") : t("seedSummary")}
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            {COUNTS.map(({ key, labelKey }) => (
              <div key={key} className="flex justify-between gap-4">
                <dt className="text-[var(--console-muted-dark)]">{t(labelKey)}</dt>
                <dd className="font-mono">{summary[key] as number}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
