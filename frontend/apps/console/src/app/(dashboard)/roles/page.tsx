"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRoles, useRolePermissions, useCreateRole } from "@/lib/use-rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const createSchema = z.object({
  name: z.string().min(1, "Name required").max(50),
  description: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;

function RolePermCount({ roleId }: { roleId: string }) {
  const { data } = useRolePermissions(roleId);
  return <span>{data?.length ?? "—"}</span>;
}

export default function RolesPage() {
  const { data: roles, isLoading } = useRoles();
  const [dialogOpen, setDialogOpen] = useState(false);
  const createRole = useCreateRole();
  const { toast } = useToast();

  const form = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", description: "" },
  });

  async function onSubmit(values: CreateForm) {
    try {
      await createRole.mutateAsync(values);
      toast("Role created");
      setDialogOpen(false);
      form.reset();
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "";
      const msg = errMsg.includes("conflict") || errMsg.includes("exists")
        ? "Role name already exists"
        : errMsg || "Failed to create role";
      form.setError("name", { message: msg });
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-lg tracking-tight">Roles</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Role
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-crust border-t-cinnamon" />
        </div>
      ) : !roles?.length ? (
        <p className="py-12 text-center text-[13px] text-[var(--console-muted)]">No roles found</p>
      ) : (
        <div className="rounded-lg border border-[var(--console-line)] bg-white overflow-hidden">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--console-line)] bg-cream/50">
                <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-[var(--console-muted)]">Name</th>
                <th className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider text-[var(--console-muted)]">Description</th>
                <th className="px-4 py-2.5 text-center font-mono text-[10px] uppercase tracking-wider text-[var(--console-muted)]">Perms</th>
                <th className="px-4 py-2.5 text-right font-mono text-[10px] uppercase tracking-wider text-[var(--console-muted)]">Action</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id} className="border-b border-[var(--console-line)] last:border-0 hover:bg-cream/30 transition-colors">
                  <td className="px-4 py-3 font-semibold">{role.name}</td>
                  <td className="px-4 py-3 text-[var(--console-muted)]">{role.description || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <RolePermCount roleId={role.id} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/roles/${role.id}`}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-mono uppercase tracking-wider text-cinnamon hover:bg-cinnamon/10 transition-colors"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Role</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="warehouse_staff" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-[11px] text-red-600">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description (optional)</Label>
              <Input id="description" placeholder="Nhân viên quản lý kho" {...form.register("description")} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createRole.isPending}>
                {createRole.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
