"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBranchProducts, setBranchProductAvailability } from "@repo/api-client";
import type { BranchProductDetail } from "@repo/api-client";
import { useViewportPageSize } from "@/lib/use-viewport-page-size";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface BranchProductsPageClientProps {
  branchId: string;
  branchName: string;
}

export function BranchProductsPageClient({
  branchId,
  branchName,
}: BranchProductsPageClientProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const pageSize = useViewportPageSize();
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const { data: branchProductsPage, isLoading } = useQuery({
    queryKey: ["branch-products", branchId, { page, size: pageSize }],
    queryFn: () => getBranchProducts(branchId, { page, size: pageSize }),
  });

  const branchProducts = branchProductsPage?.items ?? [];
  const total = branchProductsPage?.total ?? 0;
  const currentPage = branchProductsPage?.page ?? page;
  const currentSize = branchProductsPage?.size ?? pageSize;
  const totalPages = Math.max(1, branchProductsPage?.total_pages ?? Math.ceil(total / currentSize));
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  useEffect(() => {
    const timeout = window.setTimeout(() => setPage(1), 0);
    return () => window.clearTimeout(timeout);
  }, [pageSize]);

  const availabilityMut = useMutation({
    mutationFn: ({
      productId,
      isActive,
    }: {
      productId: string;
      isActive: boolean;
    }) => setBranchProductAvailability(branchId, productId, isActive),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["branch-products", branchId] });
      setOverrides((current) => {
        const next = { ...current };
        delete next[variables.productId];
        return next;
      });
      toast("Product availability updated");
    },
    onError: (e: Error, variables) => {
      setOverrides((current) => {
        const next = { ...current };
        delete next[variables.productId];
        return next;
      });
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
              {total} branch products
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

      <div className="flex justify-end rounded-xl border border-admin-line bg-white/70 p-3">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="First page"
            onClick={() => setPage(1)}
            disabled={!canGoPrev || isLoading}
          >
            <ChevronsLeft aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Previous page"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!canGoPrev || isLoading}
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 text-sm text-admin-muted">
            <span>Page</span>
            <Input
              aria-label="Jump to branch product page"
              type="number"
              min={1}
              max={totalPages}
              value={page}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (!Number.isFinite(next)) return;
                setPage(Math.min(totalPages, Math.max(1, next)));
              }}
              className="h-8 w-16 appearance-none text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span>of {totalPages}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Next page"
            onClick={() => setPage((p) => p + 1)}
            disabled={!canGoNext || isLoading}
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Last page"
            onClick={() => setPage(totalPages)}
            disabled={!canGoNext || isLoading}
          >
            <ChevronsRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--admin-line)] bg-white">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--admin-line)] font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--admin-muted)]">
                <th scope="col" className="px-4 py-3 text-left font-inherit">
                  Product
                </th>
                <th scope="col" className="px-4 py-3 text-right font-inherit">
                  Stock
                </th>
                <th scope="col" className="px-4 py-3 text-right font-inherit">
                  Available
                </th>
              </tr>
            </thead>
            <tbody>
              {branchProducts.map((p: BranchProductDetail, index: number) => {
                const isActive = overrides[p.product_id] ?? p.is_active;
                const isPending =
                  availabilityMut.isPending &&
                  availabilityMut.variables?.productId === p.product_id;

                return (
                  <tr
                    key={p.product_id}
                    className={
                      index === branchProducts.length - 1
                        ? undefined
                        : "border-b border-[var(--admin-line)]"
                    }
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-espresso">
                          {p.name}
                        </span>
                        {p.product_active === false && (
                          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-sienna">
                            Globally off
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-[13px] text-espresso">
                      {p.quantity}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`${isActive ? "Disable" : "Enable"} ${p.name} at ${branchName}`}
                          onClick={() => {
                            const nextValue = !isActive;
                            setOverrides((current) => ({
                              ...current,
                              [p.product_id]: nextValue,
                            }));
                            availabilityMut.mutate({
                              productId: p.product_id,
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
          {!isLoading && branchProducts.length === 0 && (
            <div className="px-4 py-6 text-center font-editorial text-[14px] italic text-caramel">
              No branch products.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
