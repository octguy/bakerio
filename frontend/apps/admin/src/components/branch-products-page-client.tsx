"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProductsPage,
  getCategories,
  getBranchProductMap,
  setBranchProductAvailability,
  setBranchProductStock,
} from "@repo/api-client";
import type { Product, Category, BranchProductDetail } from "@repo/api-client";
import { useViewportPageSize } from "@/lib/use-viewport-page-size";
import { DataTable } from "@/components/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pencil,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface BranchProductsPageClientProps {
  branchId: string;
  branchName: string;
  backHref?: string;
  backLabel?: string;
}

export function BranchProductsPageClient({
  branchId,
  branchName,
  backHref = "/branches",
  backLabel = "Branches",
}: BranchProductsPageClientProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = useViewportPageSize();
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [stockOverrides, setStockOverrides] = useState<Record<string, number>>({});
  const [stockTarget, setStockTarget] = useState<Product | null>(null);
  const [stockValue, setStockValue] = useState<string>("");
  const trimmedSearch = debouncedSearch.trim();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const { data: productsPage, isLoading } = useQuery({
    queryKey: ["branch-catalog", branchId, { search: trimmedSearch, category, page, size: pageSize }],
    queryFn: () =>
      getProductsPage({
        q: trimmedSearch || undefined,
        category: category || undefined,
        page,
        size: pageSize,
      }),
  });

  const products: Product[] = productsPage?.items ?? [];
  const total = productsPage?.total ?? 0;
  const currentPage = productsPage?.page ?? page;
  const currentSize = productsPage?.size ?? pageSize;
  const totalPages = Math.max(1, productsPage?.total_pages ?? Math.ceil(total / currentSize));
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  useEffect(() => {
    const timeout = window.setTimeout(() => setPage(1), 0);
    return () => window.clearTimeout(timeout);
  }, [pageSize]);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
    staleTime: Infinity,
  });

  const branchMapQuery = useQuery({
    queryKey: ["branch-product-map", branchId],
    queryFn: () => getBranchProductMap(branchId),
  });

  const branchMap: Record<string, BranchProductDetail> = branchMapQuery.data ?? {};

  const availabilityMut = useMutation({
    mutationFn: ({
      productId,
      isActive,
    }: {
      productId: string;
      isActive: boolean;
    }) => setBranchProductAvailability(branchId, productId, isActive),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["branch-product-map", branchId] });
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

  const stockMut = useMutation({
    mutationFn: ({
      productId,
      quantity,
    }: {
      productId: string;
      quantity: number;
    }) => setBranchProductStock(branchId, productId, quantity),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["branch-product-map", branchId] });
      setStockOverrides((current) => {
        const next = { ...current };
        delete next[variables.productId];
        return next;
      });
      setStockTarget(null);
      toast("Stock updated");
    },
    onError: (e: Error, variables) => {
      setStockOverrides((current) => {
        const next = { ...current };
        delete next[variables.productId];
        return next;
      });
      toast(e.message, "error");
    },
  });

  const columns: ColumnDef<Product, unknown>[] = [
    {
      accessorKey: "name",
      header: "Product",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-espresso">
            {row.original.name}
          </span>
          {!row.original.is_active && (
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-sienna">
              Globally off
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "category_id",
      header: "Category",
      cell: ({ row }) => {
        const cat = categories.find((c) => c.id === row.original.category_id);
        return cat?.name || "—";
      },
    },
    {
      id: "stock",
      header: "Stock",
      cell: ({ row }) => {
        const product = row.original;
        const branchDetail = branchMap[product.id];
        const effectiveQuantity =
          stockOverrides[product.id] ?? (branchDetail?.quantity ?? 0);
        return (
          <div className="inline-flex items-center gap-2 font-mono text-[13px] text-espresso">
            <span>{effectiveQuantity}</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Edit stock for ${product.name}`}
              onClick={() => {
                setStockTarget(product);
                setStockValue(String(effectiveQuantity));
              }}
              className="h-auto w-auto border-0 bg-transparent p-0 shadow-none hover:bg-transparent"
            >
              <Pencil aria-hidden="true" className="h-4 w-4 text-cinnamon" />
            </Button>
          </div>
        );
      },
    },
    {
      id: "available",
      header: "Available",
      cell: ({ row }) => {
        const product = row.original;
        const branchDetail = branchMap[product.id];
        const isActive = overrides[product.id] ?? (branchDetail?.is_active ?? false);
        const isPending =
          availabilityMut.isPending &&
          availabilityMut.variables?.productId === product.id;
        return (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`${isActive ? "Disable" : "Enable"} ${product.name} at ${branchName}`}
            onClick={() => {
              const nextValue = !isActive;
              setOverrides((current) => ({
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
                className="h-7 w-7 fill-sage/20 text-sage"
              />
            ) : (
              <ToggleLeft
                aria-hidden="true"
                className="h-7 w-7 fill-sienna/20 text-sienna"
              />
            )}
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <Link
            href={backHref}
            className="mb-3 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-cinnamon"
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            {backLabel}
          </Link>
          <div className="mb-1.5 flex items-center gap-3">
            <span className="block h-px w-6 bg-golden" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cinnamon">
              {total} catalog products
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

      <div className="flex flex-col gap-3 rounded-xl border border-admin-line bg-white/70 p-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid w-full gap-3 sm:max-w-2xl sm:grid-cols-2">
          <div>
            <Label htmlFor="branch-product-search">Search</Label>
            <Input
              id="branch-product-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products..."
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="branch-category-filter">Category</Label>
            <Select
              id="branch-category-filter"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
              className="mt-1"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 self-end">
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
        <DataTable columns={columns} data={products} showFooter={false} />
      )}

      <Dialog
        open={!!stockTarget}
        onOpenChange={(o) => {
          if (!o) setStockTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update stock</DialogTitle>
            <DialogDescription>
              {stockTarget
                ? `Set the stock quantity for ${stockTarget.name} at ${branchName}.`
                : "Set the stock quantity for this product."}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="stock-quantity">Stock quantity</Label>
              <Input
                id="stock-quantity"
                type="number"
                min={0}
                step={1}
                value={stockValue}
                onChange={(event) => setStockValue(event.target.value)}
                className="appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStockTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={
                  stockMut.isPending ||
                  !Number.isInteger(Number(stockValue)) ||
                  Number(stockValue) < 0
                }
                onClick={() => {
                  if (!stockTarget) return;
                  const parsed = Number(stockValue);
                  if (!Number.isInteger(parsed) || parsed < 0) {
                    toast("Enter a whole number of 0 or more", "error");
                    return;
                  }
                  setStockOverrides((current) => ({
                    ...current,
                    [stockTarget.id]: parsed,
                  }));
                  stockMut.mutate({
                    productId: stockTarget.id,
                    quantity: parsed,
                  });
                }}
              >
                {stockMut.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
