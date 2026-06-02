"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useFilterStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProductsPage,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
} from "@repo/api-client";
import type { Product } from "@repo/api-client";
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
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Image as ImageIcon } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  name: z.string().min(1, "Name required"),
  price: z.coerce.number().positive("Price must be positive"),
  category_id: z.string().min(1, "Category required"),
});
type FormData = z.infer<typeof schema>;
const PAGE_SIZE = 20;

export default function ProductsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const { onlyActive } = useFilterStore();

  const { data: productsPage, isLoading } = useQuery({
    queryKey: ["products", { category, page, size: PAGE_SIZE }],
    queryFn: () =>
      getProductsPage({
        category: category || undefined,
        page,
        size: PAGE_SIZE,
      }),
  });

  const products = productsPage?.items ?? [];
  const total = productsPage?.total ?? 0;
  const currentPage = productsPage?.page ?? page;
  const currentSize = productsPage?.size ?? PAGE_SIZE;
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage * currentSize < total;

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    staleTime: Infinity, // Cache categories infinitely
  });

  const createMut = useMutation({
    mutationFn: (d: FormData) =>
      createProduct({
        name: d.name,
        category_id: d.category_id,
        price: d.price,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
      toast("Product created");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const updateMut = useMutation({
    mutationFn: (d: FormData) =>
      updateProduct(editing!.id, {
        name: d.name,
        category_id: d.category_id,
        price: d.price,
        sort_order: editing!.sort_order ?? 0,
        is_active: editing!.is_active,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
      setEditing(null);
      toast("Product updated");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      setDeleting(null);
      toast("Product deleted");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const statusMut = useMutation({
    mutationFn: ({
      product,
      isActive,
    }: {
      product: Product;
      isActive: boolean;
    }) =>
      updateProduct(product.id, {
        name: product.name,
        category_id: product.category_id,
        price: product.price,
        sort_order: product.sort_order ?? 0,
        is_active: isActive,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast("Product status updated");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const columns: ColumnDef<Product, unknown>[] = [
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.original.is_active;
        const isPending =
          statusMut.isPending &&
          statusMut.variables?.product?.id === row.original.id;
        return (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`${isActive ? "Deactivate" : "Activate"} ${row.original.name}`}
            onClick={() =>
              statusMut.mutate({
                product: row.original,
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
    {
      accessorFn: (row) => `${row.name} ${row.slug || ""}`,
      id: "name",
      header: "Name",
      cell: ({ row }) => row.original.name,
    },
    {
      accessorKey: "category_id",
      header: "Category",
      cell: ({ row }) => {
        const category = categories.find((c) => c.id === row.original.category_id);
        return category?.name || "—";
      },
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => formatCurrency(row.original.price),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Link
            href={`/products/${row.original.id}/images`}
            className={buttonVariants({ variant: "ghost", size: "icon" })}
            aria-label={`Manage images for ${row.original.name}`}
          >
            <ImageIcon aria-hidden="true" className="h-4 w-4" />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setEditing(row.original);
              setOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleting(row.original)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-3">
            <span className="block h-px w-6 bg-golden" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cinnamon">
              {products.length} items · {categories.length} categories · 11
              shops
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
            <span className="font-editorial text-cinnamon">· the carte</span>
          </h1>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus aria-hidden="true" className="h-4 w-4" /> Add Product
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-admin-line bg-white/70 p-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-xs">
          <Label htmlFor="category-filter">Category</Label>
          <Select
            id="category-filter"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(1);
            }}
            className="mt-1"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-2 self-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!canGoPrev || isLoading}
          >
            Prev
          </Button>
          <span className="min-w-16 text-center text-sm text-admin-muted">
            page {currentPage}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!canGoNext || isLoading}
          >
            Next
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <DataTable
          columns={columns}
          data={onlyActive ? products.filter((p) => p.is_active) : products}
          searchKey="name"
          searchPlaceholder="Search products..."
        />
      )}

      {/* Create/Edit Dialog */}
      <ProductFormDialog
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        editing={editing}
        categories={categories}
        onSubmit={(d) => (editing ? updateMut.mutate(d) : createMut.mutate(d))}
        loading={createMut.isPending || updateMut.isPending}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Confirm that you want to permanently remove this product from the
              catalog.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete &quot;{deleting?.name}&quot;? This
            action cannot be undone.
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

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  categories: { id: string; name: string }[];
}

function CategoryCombobox({ value, onChange, categories }: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedCategory = categories.find((c) => c.id === value);
  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setOpen(!open);
          setSearch("");
        }}
        className="w-full justify-between bg-background text-left font-normal border-input text-espresso shadow-sm"
      >
        <span>{selectedCategory ? selectedCategory.name : "Select category..."}</span>
        <span className="text-admin-muted text-xs">▼</span>
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-admin-line bg-white p-2 shadow-lg max-h-60 overflow-y-auto">
          <Input
            autoFocus
            placeholder="Search category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2 h-8 text-sm"
          />
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-vanilla text-espresso"
            >
              None
            </button>
            {filtered.length > 0 ? (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-vanilla text-espresso ${
                    value === c.id ? "bg-vanilla font-semibold" : ""
                  }`}
                >
                  {c.name}
                </button>
              ))
            ) : (
              <p className="text-xs text-admin-muted text-center py-2">
                No categories found.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductFormDialog({
  open,
  onClose,
  editing,
  categories,
  onSubmit,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  editing: Product | null;
  categories: { id: string; name: string }[];
  onSubmit: (d: FormData) => void;
  loading: boolean;
}) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: editing
      ? {
          name: editing.name,
          price: editing.price,
          category_id: editing.category_id,
        }
      : undefined,
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          reset();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Product" : "New Product"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update this product's name, price, and category."
              : "Add a new product with its name, price, and category."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="product-name">Name</Label>
            <Input id="product-name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive mt-1">
                {errors.name.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="product-price">Price (VND)</Label>
            <Input id="product-price" type="number" {...register("price")} />
            {errors.price && (
              <p className="text-xs text-destructive mt-1">
                {errors.price.message}
              </p>
            )}
          </div>
          <div>
            <Label>Category</Label>
            <Controller
              control={control}
              name="category_id"
              render={({ field }) => (
                <CategoryCombobox
                  value={field.value || ""}
                  onChange={field.onChange}
                  categories={categories}
                />
              )}
            />
            {errors.category_id && (
              <p className="text-xs text-destructive mt-1">
                {errors.category_id.message}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
