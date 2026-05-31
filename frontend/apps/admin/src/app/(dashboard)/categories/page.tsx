"use client";

import { useState } from "react";
import { useFilterStore } from "@/lib/store";
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
import { Button } from "@/components/ui/button";
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
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
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
  const { onlyActive } = useFilterStore();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

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
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${row.original.name}`}
            onClick={() => {
              setEditing(row.original);
              setOpen(true);
            }}
          >
            <Pencil aria-hidden="true" className="h-4 w-4" />
          </Button>
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
  } = useForm<FormData>({
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


      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <DataTable
          columns={columns}
          data={onlyActive ? categories.filter((c) => c.is_active) : categories}
          searchKey="name"
          searchPlaceholder="Search categories..."
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
