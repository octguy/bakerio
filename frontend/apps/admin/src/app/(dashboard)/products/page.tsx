"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
} from "@repo/api-client";
import type { Product } from "@repo/api-client";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  sku: z.string().min(1, "SKU required"),
  name: z.string().min(1, "Name required"),
  unit: z.string().min(1, "Unit required"),
  price: z.coerce.number().positive("Price must be positive"),
  description: z.string().optional(),
  category_id: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function ProductsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const createMut = useMutation({
    mutationFn: (d: FormData) =>
      createProduct({
        sku: d.sku,
        name: d.name,
        unit: d.unit,
        base_price: d.price,
        description: d.description,
        category_id: d.category_id,
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
        description: d.description,
        unit: d.unit,
        base_price: d.price,
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

  const columns: ColumnDef<Product, unknown>[] = [
    { accessorKey: "sku", header: "SKU" },
    { accessorKey: "name", header: "Name" },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => row.original.category?.name || "—",
    },
    {
      accessorKey: "base_price",
      header: "Price",
      cell: ({ row }) => formatCurrency(row.original.base_price),
    },
    { accessorKey: "unit", header: "Unit" },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? "success" : "secondary"}>
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex gap-1">
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
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <DataTable
          columns={columns}
          data={products}
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
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: editing
      ? {
          sku: editing.sku,
          name: editing.name,
          unit: editing.unit,
          price: editing.base_price,
          description: editing.description || "",
          category_id: editing.category?.id || "",
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
              ? "Update this product's name, unit, price, description, and category."
              : "Add a new product with its SKU, unit, price, description, and category."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="product-sku">SKU</Label>
              <Input
                id="product-sku"
                {...register("sku")}
                disabled={!!editing}
              />
              {errors.sku && (
                <p className="text-xs text-destructive mt-1">
                  {errors.sku.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="product-unit">Unit</Label>
              <Input
                id="product-unit"
                {...register("unit")}
                placeholder="piece, kg..."
              />
              {errors.unit && (
                <p className="text-xs text-destructive mt-1">
                  {errors.unit.message}
                </p>
              )}
            </div>
          </div>
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
            <Label htmlFor="product-description">Description</Label>
            <Input id="product-description" {...register("description")} />
          </div>
          <div>
            <Label htmlFor="product-category">Category</Label>
            <Select id="product-category" {...register("category_id")}>
              <option value="">None</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
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
