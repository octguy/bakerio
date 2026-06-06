"use client";

import { useMutation } from "@tanstack/react-query";
import { seedDemo, type SeedDemoSummary } from "@repo/api-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";

const COUNTS: ReadonlyArray<{ key: keyof SeedDemoSummary; label: string }> = [
  { key: "branches", label: "Branches" },
  { key: "categories", label: "Categories" },
  { key: "products", label: "Products" },
  { key: "branch_products", label: "Branch products" },
  { key: "product_images", label: "Product images" },
  { key: "customers", label: "Customers" },
  { key: "staff", label: "Staff" },
  { key: "addresses", label: "Addresses" },
  { key: "orders", label: "Orders" },
  { key: "vouchers", label: "Vouchers" },
  { key: "memberships", label: "Memberships" },
];

export default function SeedDemoPage() {
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
          ? "Seed skipped — database already populated"
          : "Demo data seeded successfully",
        data.skipped ? "info" : "success",
      );
    },
    onError: (error: Error) => {
      toast(`Seed failed: ${error.message}`, "error");
    },
  });

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl text-[var(--console-ink-text)]">
          Seed demo data
        </h1>
        <p className="text-sm text-[var(--console-muted-dark)]">
          Populate a fresh database with realistic sample branches, products,
          users, and orders. Idempotent — does nothing if branches already exist.
        </p>
      </header>

      <Button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? "Seeding…" : "Run seed"}
      </Button>

      {summary && (
        <section className="rounded-lg border border-border bg-background p-4">
          <h2 className="mb-3 font-display text-base">
            {summary.skipped ? "Already populated" : "Seed summary"}
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            {COUNTS.map(({ key, label }) => (
              <div key={key} className="flex justify-between gap-4">
                <dt className="text-[var(--console-muted-dark)]">{label}</dt>
                <dd className="font-mono">{summary[key] as number}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
