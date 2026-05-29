"use client";

import { useState } from "react";
import { useFilterStore } from "@/lib/store";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBranches,
  createBranch,
  updateBranch,
  updateBranchStatus,
} from "@repo/api-client";
import type { Branch } from "@repo/api-client";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import {
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  PackageCheck,
  Users,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  name: z.string().min(1, "Name required"),
  address: z.string().min(1, "Address required"),
  lat: z
    .number({ invalid_type_error: "Latitude must be a number" })
    .min(-90, "Latitude must be at least -90")
    .max(90, "Latitude must be at most 90")
    .optional(),
  lng: z
    .number({ invalid_type_error: "Longitude must be a number" })
    .min(-180, "Longitude must be at least -180")
    .max(180, "Longitude must be at most 180")
    .optional(),
});
type FormData = z.infer<typeof schema>;

export default function BranchesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const { onlyActive } = useFilterStore();

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
  });

  const createMut = useMutation({
    mutationFn: (d: FormData) =>
      createBranch(d as Parameters<typeof createBranch>[0]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      setOpen(false);
      toast("Branch created");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const updateMut = useMutation({
    mutationFn: (d: FormData) =>
      updateBranch(editing!.id, d as Parameters<typeof updateBranch>[1]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      setOpen(false);
      setEditing(null);
      toast("Branch updated");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const statusMut = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "active" | "inactive";
    }) => updateBranchStatus(id, status),
    onSuccess: (_result, { id, status }) => {
      qc.setQueryData<Branch[]>(["branches"], (current) =>
        current?.map((branch) =>
          branch.id === id ? { ...branch, status } : branch,
        ),
      );
      qc.invalidateQueries({ queryKey: ["branches"] });
      toast("Branch status updated");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const columns: ColumnDef<Branch, unknown>[] = [
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.original.status === "active";
        const nextStatus = isActive ? "inactive" : "active";
        const isPending =
          statusMut.isPending && statusMut.variables?.id === row.original.id;

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label={`${isActive ? "Deactivate" : "Activate"} ${row.original.name}`}
              onClick={() =>
                statusMut.mutate({ id: row.original.id, status: nextStatus })
              }
              disabled={isPending}
              className="h-auto w-auto p-0 hover:bg-transparent bg-transparent border-0 shadow-none"
            >
              {isActive ? (
                <ToggleRight aria-hidden="true" className="h-8 w-8 text-sage fill-sage/20" />
              ) : (
                <ToggleLeft aria-hidden="true" className="h-6 w-6 text-sienna fill-sienna/20" />
              )}
            </Button>
          </div>
        );
      },
    },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "address", header: "Address" },
    {
      accessorKey: "lat",
      header: "Lat",
      cell: ({ row }) => row.original.lat ?? "-",
    },
    {
      accessorKey: "lng",
      header: "Lng",
      cell: ({ row }) => row.original.lng ?? "-",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Link
            href={`/branches/${row.original.id}/staff`}
            className={buttonVariants({ variant: "ghost", size: "icon" })}
            aria-label={`Manage staff for ${row.original.name}`}
          >
            <Users aria-hidden="true" className="h-4 w-4" />
          </Link>
          <Link
            href={`/branches/${row.original.id}/products`}
            className={buttonVariants({ variant: "ghost", size: "icon" })}
            aria-label={`Manage product availability for ${row.original.name}`}
          >
            <PackageCheck aria-hidden="true" className="h-4 w-4" />
          </Link>
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
            title="Use Deactivate - backend has no delete"
            disabled
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
          address: editing.address,
          lat: editing.lat,
          lng: editing.lng,
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
              {branches.length} shops · 3 opening soon
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
            Branches{" "}
            <span className="font-editorial text-cinnamon">· the network</span>
          </h1>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus aria-hidden="true" className="h-4 w-4" /> Add Branch
        </Button>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <DataTable
          columns={columns}
          data={onlyActive ? branches.filter((b) => b.status === "active") : branches}
          searchKey="name"
          searchPlaceholder="Search branches..."
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
            <DialogTitle>{editing ? "Edit Branch" : "New Branch"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update this branch's name, address, and coordinates."
                : "Add a new branch with its name, address, and coordinates."}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((d) =>
              editing ? updateMut.mutate(d) : createMut.mutate(d),
            )}
            className="space-y-4 mt-4"
          >
            <div>
              <Label htmlFor="branch-name">Name</Label>
              <Input id="branch-name" {...register("name")} />
              {errors.name && (
                <p className="text-xs text-destructive mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="branch-address">Address</Label>
              <Input id="branch-address" {...register("address")} />
              {errors.address && (
                <p className="text-xs text-destructive mt-1">
                  {errors.address.message}
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="branch-lat">Latitude</Label>
                <Input
                  id="branch-lat"
                  type="number"
                  step="any"
                  {...register("lat", {
                    setValueAs: (value) =>
                      value === "" ? undefined : Number(value),
                  })}
                />
                {errors.lat && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.lat.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="branch-lng">Longitude</Label>
                <Input
                  id="branch-lng"
                  type="number"
                  step="any"
                  {...register("lng", {
                    setValueAs: (value) =>
                      value === "" ? undefined : Number(value),
                  })}
                />
                {errors.lng && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.lng.message}
                  </p>
                )}
              </div>
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
    </div>
  );
}
