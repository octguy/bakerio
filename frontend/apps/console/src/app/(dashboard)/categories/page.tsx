"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useFilterStore } from "@/lib/store";
import { useViewportPageSize } from "@/lib/use-viewport-page-size";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@repo/api-client";
import type { Category } from "@repo/api-client";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  name: z.string().min(1, "Name required"),
  sort_order: z.coerce.number().optional(),
  is_active: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

export default function CategoriesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const { onlyActive } = useFilterStore();
  const pageSize = useViewportPageSize();
  const trimmedSearch = debouncedSearch.trim();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setPage(1), 0);
    return () => window.clearTimeout(timeout);
  }, [pageSize]);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories", { search: trimmedSearch }],
    queryFn: () => getCategories({ q: trimmedSearch || undefined }),
  });
  const filteredCategories = onlyActive
    ? categories.filter((category) => category.is_active)
    : categories;
  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / pageSize));
  const paginatedCategories = filteredCategories.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  const createMut = useMutation({
    mutationFn: (d: FormData) =>
      createCategory({ name: d.name, sort_order: d.sort_order }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setOpen(false);
      toast("Category created");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const updateMut = useMutation({
    mutationFn: (d: FormData) =>
      updateCategory(editing!.id, {
        name: d.name,
        sort_order: d.sort_order ?? 0,
        is_active: d.is_active ?? editing!.is_active,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setOpen(false);
      setEditing(null);
      toast("Category updated");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setDeleting(null);
      toast("Category deleted");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const statusMut = useMutation({
    mutationFn: ({
      category,
      isActive,
    }: {
      category: Category;
      isActive: boolean;
    }) =>
      updateCategory(category.id, {
        name: category.name,
        sort_order: category.sort_order,
        is_active: isActive,
      }),
    onSuccess: (_result, { category, isActive }) => {
      qc.setQueryData<Category[]>(["categories"], (current) =>
        current?.map((item) =>
          item.id === category.id ? { ...item, is_active: isActive } : item,
        ),
      );
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast("Category status updated");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const columns: ColumnDef<Category, unknown>[] = [
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.original.is_active;
        const isPending =
          statusMut.isPending &&
          statusMut.variables?.category?.id === row.original.id;
        return (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`${isActive ? "Deactivate" : "Activate"} ${row.original.name}`}
            onClick={() =>
              statusMut.mutate({
                category: row.original,
                isActive: !isActive,
              })
            }
            disabled={isPending}
            className="h-auto w-auto p-0 hover:bg-transparent bg-transparent border-0 shadow-none"
          >
            {isActive ? (
              <ToggleRight aria-hidden="true" className="h-6 w-6 text-sage fill-sage/20" />
) : (
              <ToggleLeft aria-hidden="true" className="h-6 w-6 text-sienna fill-sienna/20" />
            )}
          </Button>
        );
      },
    },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "slug", header: "Slug" },
    { accessorKey: "sort_order", header: "Order" },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Link
            href={`/categories/${row.original.slug}`}
            className={buttonVariants({ variant: "ghost", size: "icon" })}
            aria-label={`Edit ${row.original.name}`}
          >
            <Pencil aria-hidden="true" className="h-4 w-4" />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete ${row.original.name}`}
            onClick={() => setDeleting(row.original)}
          >
            <Trash2 aria-hidden="true" className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof schema>, unknown, FormData>({
    resolver: zodResolver(schema),
    values: editing
      ? {
          name: editing.name,
          sort_order: editing.sort_order,
          is_active: editing.is_active,
        }
      : undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-3">
            <span className="block h-px w-6 bg-golden" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cinnamon">
              How the menu is shelved
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
            Categories{" "}
            <span className="font-editorial text-cinnamon">
              · {categories.length} sections
            </span>
          </h1>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus aria-hidden="true" className="h-4 w-4" /> Add Category
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-console-line bg-white/70 p-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <Label htmlFor="category-search">Search</Label>
          <Input
            id="category-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search categories..."
            className="mt-1"
          />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 self-end">
          <Button type="button" variant="outline" size="sm" aria-label="First page" onClick={() => setPage(1)} disabled={!canGoPrev || isLoading}>
            <ChevronsLeft aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" aria-label="Previous page" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!canGoPrev || isLoading}>
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 text-sm text-console-muted">
            <span>Page</span>
            <Input
              aria-label="Jump to category page"
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
          <Button type="button" variant="outline" size="sm" aria-label="Next page" onClick={() => setPage((p) => p + 1)} disabled={!canGoNext || isLoading}>
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" aria-label="Last page" onClick={() => setPage(totalPages)} disabled={!canGoNext || isLoading}>
            <ChevronsRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          data={paginatedCategories}
          showFooter={false}
        />
      )}

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) {
            setOpen(false);
            setEditing(null);
            reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Category" : "New Category"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update this category's name and display order."
                : "Add a new category and choose its display order."}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((d) =>
              editing ? updateMut.mutate(d) : createMut.mutate(d),
            )}
            className="space-y-4 mt-4"
          >
            <div>
              <Label htmlFor="category-name">Name</Label>
              <Input id="category-name" {...register("name")} />
              {errors.name && (
                <p className="text-xs text-destructive mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="category-sort-order">Sort Order</Label>
              <Input
                id="category-sort-order"
                type="number"
                {...register("sort_order")}
              />
              {errors.sort_order && (
                <p className="text-xs text-destructive mt-1">
                  {errors.sort_order.message}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  setEditing(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMut.isPending || updateMut.isPending}
              >
                Save
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Confirm that you want to permanently remove this category.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete &quot;{deleting?.name}&quot;?
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleting && deleteMut.mutate(deleting.id)}
              disabled={deleteMut.isPending}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
