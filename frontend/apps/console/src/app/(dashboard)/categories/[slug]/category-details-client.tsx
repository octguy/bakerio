"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCategory, updateCategory } from "@repo/api-client";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Loader2 } from "lucide-react";

interface CategoryDetailsPageClientProps {
  categorySlug: string;
}

export function CategoryDetailsPageClient({ categorySlug }: CategoryDetailsPageClientProps) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [isActive, setIsActive] = useState(true);

  const { data: category, isLoading } = useQuery({
    queryKey: ["category", categorySlug],
    queryFn: () => getCategory(categorySlug),
  });

  useEffect(() => {
    if (!category) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(category.name);
    setSortOrder(String(category.sort_order ?? 0));
    setIsActive(category.is_active);
  }, [category]);

  const updateMut = useMutation({
    mutationFn: () => {
      if (!category) throw new Error("Category is not loaded yet");
      return updateCategory(category.id, {
        name,
        sort_order: Number(sortOrder),
        is_active: isActive,
      });
    },
    onSuccess: (updated) => {
      qc.setQueryData(["category", categorySlug], updated);
      qc.setQueryData(["category", updated.slug], updated);
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast("Category updated");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/categories"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
          aria-label="Back to categories"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="mb-1 flex items-center gap-3">
            <span className="block h-px w-6 bg-golden" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cinnamon">
              Category Details
            </span>
          </div>
          <h1
            className="flex items-center gap-2 font-display tracking-tight"
            style={{
              fontSize: "clamp(24px,3.2vw,30px)",
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            {category ? (
              <>
                Manage <span className="font-editorial text-cinnamon">{category.name}</span>
              </>
            ) : (
              "Loading Category..."
            )}
          </h1>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-cinnamon" />
          <p className="font-mono text-sm text-console-muted">
            Loading category details...
          </p>
        </div>
      ) : !category ? (
        <Card className="p-6 text-center text-sm text-console-muted">
          Category not found.
        </Card>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <Card className="border-border bg-white p-5 shadow-sm lg:col-span-1">
            <h2 className="border-b border-console-line pb-2 font-display text-lg font-semibold text-espresso">
              Category Information
            </h2>
            <form
              className="mt-4 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                updateMut.mutate();
              }}
            >
              <div>
                <Label htmlFor="category-name">Name</Label>
                <Input
                  id="category-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="category-sort-order">Sort Order</Label>
                <Input
                  id="category-sort-order"
                  type="number"
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="category-status">Status</Label>
                <Select
                  id="category-status"
                  value={isActive ? "active" : "inactive"}
                  onChange={(event) => setIsActive(event.target.value === "active")}
                >
                  <option value="active">Enabled</option>
                  <option value="inactive">Disabled</option>
                </Select>
              </div>
              <div>
                <Label>Slug</Label>
                <span className="mt-0.5 block font-mono text-xs text-cinnamon">
                  {category.slug}
                </span>
              </div>
              <Button type="submit" className="w-full" disabled={updateMut.isPending}>
                {updateMut.isPending ? "Saving..." : "Save Category"}
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
