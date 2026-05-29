"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { setBranchProductAvailability } from "@repo/api-client";
import type { Product } from "@repo/api-client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, ToggleLeft, ToggleRight } from "lucide-react";

interface BranchProductsPageClientProps {
  branchId: string;
  branchName: string;
  products: Product[];
}

export function BranchProductsPageClient({
  branchId,
  branchName,
  products,
}: BranchProductsPageClientProps) {
  const { toast } = useToast();
  // Backend has no GET for branch-specific availability yet, so toggles start
  // from each product's global is_active value and only write branch overrides.
  const [availability, setAvailability] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(products.map((product) => [product.id, product.is_active])),
  );

  const availabilityMut = useMutation({
    mutationFn: ({
      productId,
      isActive,
    }: {
      productId: string;
      isActive: boolean;
    }) => setBranchProductAvailability(branchId, productId, isActive),
    onSuccess: () => toast("Product availability updated"),
    onError: (e: Error, variables) => {
      setAvailability((current) => ({
        ...current,
        [variables.productId]: !variables.isActive,
      }));
      toast(e.message, "error");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <Link
            href="/branches"
            className="mb-3 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-cinnamon"
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            Branches
          </Link>
          <div className="mb-1.5 flex items-center gap-3">
            <span className="block h-px w-6 bg-golden" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cinnamon">
              {products.length} catalog items
            </span>
          </div>
          <h1
            className="font-display tracking-tight"
            style={{
              fontSize: "clamp(26px,3.6vw,32px)",
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            Products{" "}
            <span className="font-editorial text-cinnamon">· {branchName}</span>
          </h1>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--admin-line)] bg-white">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--admin-line)] font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--admin-muted)]">
              <th scope="col" className="px-4 py-3 text-left font-inherit">
                Product
              </th>
              <th scope="col" className="px-4 py-3 text-right font-inherit">
                Available
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => {
              const isActive = availability[product.id] ?? false;
              const isPending =
                availabilityMut.isPending &&
                availabilityMut.variables?.productId === product.id;

              return (
                <tr
                  key={product.id}
                  className={
                    index === products.length - 1
                      ? undefined
                      : "border-b border-[var(--admin-line)]"
                  }
                >
                  <td className="px-4 py-3.5">
                    <div className="text-[14px] font-semibold text-espresso">
                      {product.name}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`${isActive ? "Disable" : "Enable"} ${product.name} at ${branchName}`}
                        onClick={() => {
                          const nextValue = !isActive;
                          setAvailability((current) => ({
                            ...current,
                            [product.id]: nextValue,
                          }));
                          availabilityMut.mutate({
                            productId: product.id,
                            isActive: nextValue,
                          });
                        }}
                        disabled={isPending}
                        className="h-auto w-auto border-0 bg-transparent p-0 shadow-none hover:bg-transparent"
                      >
                        {isActive ? (
                          <ToggleRight
                            aria-hidden="true"
                            className="h-8 w-8 fill-sage/20 text-sage"
                          />
                        ) : (
                          <ToggleLeft
                            aria-hidden="true"
                            className="h-6 w-6 fill-sienna/20 text-sienna"
                          />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {products.length === 0 && (
          <div className="px-4 py-6 text-center font-editorial text-[14px] italic text-caramel">
            No products in the catalog.
          </div>
        )}
      </div>
    </div>
  );
}
