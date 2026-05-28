"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBranches,
  createBranch,
  updateBranch,
  updateBranchStatus,
  deleteBranch,
} from "@repo/api-client";
import type { Branch } from "@repo/api-client";
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
import { useToast } from "@/components/ui/toast";
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  name: z.string().min(1, "Name required"),
  address: z.string().min(1, "Address required"),
});
type FormData = z.infer<typeof schema>;

export default function BranchesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState<Branch | null>(null);

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

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteBranch(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      setDeleting(null);
      toast("Branch deleted");
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["branches"] });
      toast("Branch status updated");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const columns: ColumnDef<Branch, unknown>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "address", header: "Address" },
    { accessorKey: "region", header: "Region" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.original.status === "active";
        const nextStatus = isActive ? "inactive" : "active";

        return (
          <div className="flex items-center gap-2">
            <Badge variant={isActive ? "success" : "secondary"}>
              {row.original.status}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              aria-label={`${isActive ? "Deactivate" : "Activate"} ${row.original.name}`}
              onClick={() =>
                statusMut.mutate({ id: row.original.id, status: nextStatus })
              }
              disabled={statusMut.isPending}
            >
              {isActive ? (
                <ToggleRight aria-hidden="true" className="h-4 w-4" />
              ) : (
                <ToggleLeft aria-hidden="true" className="h-4 w-4" />
              )}
              {isActive ? "Deactivate" : "Activate"}
            </Button>
          </div>
        );
      },
    },
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
      ? { name: editing.name, address: editing.address }
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
          data={branches}
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
                ? "Update this branch's name and address."
                : "Add a new branch with its name and address."}
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
            <DialogTitle>Delete Branch</DialogTitle>
            <DialogDescription>
              Confirm that you want to permanently remove this branch.
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
