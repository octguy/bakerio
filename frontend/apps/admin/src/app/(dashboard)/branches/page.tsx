"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBranches, createBranch, updateBranch, deleteBranch } from "@repo/api-client";
import type { Branch } from "@repo/api-client";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  name: z.string().min(1, "Name required"),
  address: z.string().min(1, "Address required"),
  region: z.string().min(1, "Region required"),
});
type FormData = z.infer<typeof schema>;

export default function BranchesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState<Branch | null>(null);

  const { data: branches = [], isLoading } = useQuery({ queryKey: ["branches"], queryFn: getBranches });

  const createMut = useMutation({
    mutationFn: (d: FormData) => createBranch(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branches"] }); setOpen(false); toast("Branch created"); },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const updateMut = useMutation({
    mutationFn: (d: FormData) => updateBranch(editing!.id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branches"] }); setOpen(false); setEditing(null); toast("Branch updated"); },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteBranch(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["branches"] }); setDeleting(null); toast("Branch deleted"); },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const columns: ColumnDef<Branch, unknown>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "address", header: "Address" },
    { accessorKey: "region", header: "Region" },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <Badge variant={row.original.status === "active" ? "success" : "secondary"}>{row.original.status}</Badge> },
    {
      id: "actions", header: "", cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => { setEditing(row.original); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleting(row.original)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ),
    },
  ];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: editing ? { name: editing.name, address: editing.address, region: editing.region } : undefined,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Branches</h1>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Add Branch</Button>
      </div>

      {isLoading ? <p>Loading...</p> : <DataTable columns={columns} data={branches} searchKey="name" searchPlaceholder="Search branches..." />}

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setEditing(null); reset(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Branch" : "New Branch"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => editing ? updateMut.mutate(d) : createMut.mutate(d))} className="space-y-4 mt-4">
            <div><Label>Name</Label><Input {...register("name")} />{errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}</div>
            <div><Label>Address</Label><Input {...register("address")} />{errors.address && <p className="text-xs text-destructive mt-1">{errors.address.message}</p>}</div>
            <div><Label>Region</Label><Select {...register("region")}><option value="">Select...</option><option value="north">North</option><option value="central">Central</option><option value="south">South</option></Select>{errors.region && <p className="text-xs text-destructive mt-1">{errors.region.message}</p>}</div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditing(null); }}>Cancel</Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Branch</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Delete &quot;{deleting?.name}&quot;?</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleting && deleteMut.mutate(deleting.id)} disabled={deleteMut.isPending}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
