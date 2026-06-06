"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useRole,
  usePermissions,
  useRolePermissions,
  useUpdateRole,
  useUpdateRolePermissions,
} from "@/lib/use-rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

const roleSchema = z.object({
  name: z.string().min(1, "Required").max(50),
  description: z.string().optional(),
});

type RoleForm = z.infer<typeof roleSchema>;

export default function RoleDetailPage() {
  const { id } = useParams() as { id: string };
  const { toast } = useToast();

  const { data: role, isLoading: roleLoading } = useRole(id);
  const { data: allPermissions } = usePermissions();
  const { data: rolePermissions, isLoading: permsLoading } = useRolePermissions(id);
  const updateRole = useUpdateRole(id);
  const updatePerms = useUpdateRolePermissions(id);

  // Track checked permission IDs locally for debounced save
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [permSaveState, setPermSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const syncedRef = useRef<string>("");

  // Sync from server data
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    const key = rolePermissions?.map((p) => p.id).sort().join(",") ?? "";
    if (rolePermissions && key !== syncedRef.current) {
      syncedRef.current = key;
      setCheckedIds(new Set(rolePermissions.map((p) => p.id)));
    }
  }, [rolePermissions]);

  // Group permissions by prefix
  const groups = useMemo(() => {
    if (!allPermissions) return [];
    const map = new Map<string, typeof allPermissions>();
    for (const p of allPermissions) {
      const group = p.name.split(".")[0] || "other";
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(p);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [allPermissions]);

  function togglePermission(permId: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      scheduleSave(next);
      return next;
    });
  }

  function scheduleSave(ids: Set<string>) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setPermSaveState("saving");
    debounceRef.current = setTimeout(async () => {
      try {
        await updatePerms.mutateAsync(Array.from(ids));
        setPermSaveState("saved");
        setTimeout(() => setPermSaveState("idle"), 1500);
      } catch {
        setPermSaveState("idle");
        toast("Failed to save permissions", "error");
      }
    }, 500);
  }

  // Role info form
  const form = useForm<RoleForm>({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: "", description: "" },
  });

  useEffect(() => {
    if (role) form.reset({ name: role.name, description: role.description || "" });
  }, [role, form]);

  async function onSaveRole(values: RoleForm) {
    try {
      await updateRole.mutateAsync(values);
      toast("Role updated");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update";
      toast(msg, "error");
    }
  }

  if (roleLoading || permsLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-crust border-t-cinnamon" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="py-16 text-center">
        <p className="text-[13px] text-[var(--console-muted)]">Role not found</p>
        <Link href="/roles" className="mt-2 inline-block text-[12px] text-cinnamon hover:underline">← Back to roles</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/roles" className="flex h-7 w-7 items-center justify-center rounded border border-[var(--console-line)] bg-white hover:bg-cream transition-colors">
          <ChevronLeft size={14} />
        </Link>
        <h1 className="font-display text-lg tracking-tight">Edit Role: <span className="text-cinnamon">{role.name}</span></h1>
      </div>

      {/* Role Info */}
      <section className="rounded-lg border border-[var(--console-line)] bg-white p-5 mb-6">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--console-muted)] mb-3">Role Info</h2>
        <form onSubmit={form.handleSubmit(onSaveRole)} className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[180px] space-y-1">
            <Label htmlFor="role-name" className="text-[11px]">Name</Label>
            <Input id="role-name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-[10px] text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="flex-1 min-w-[180px] space-y-1">
            <Label htmlFor="role-desc" className="text-[11px]">Description</Label>
            <Input id="role-desc" {...form.register("description")} />
          </div>
          <Button type="submit" size="sm" disabled={updateRole.isPending}>
            {updateRole.isPending ? "Saving..." : "Save"}
          </Button>
        </form>
      </section>

      {/* Permission Matrix */}
      <section className="rounded-lg border border-[var(--console-line)] bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--console-muted)]">Permissions</h2>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--console-muted)]">
            {permSaveState === "saving" && <><Loader2 className="h-3 w-3 animate-spin" /> Saving...</>}
            {permSaveState === "saved" && <><Check className="h-3 w-3 text-green-600" /> <span className="text-green-600">Saved</span></>}
          </div>
        </div>

        <div className="space-y-4">
          {groups.map(([group, perms]) => (
            <div key={group} className="rounded border border-[var(--console-line)] p-3">
              <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--console-muted)] mb-2">{group}</div>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {perms.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={checkedIds.has(p.id)}
                      onChange={() => togglePermission(p.id)}
                      className="h-3.5 w-3.5 rounded border-[var(--console-line)] accent-cinnamon"
                    />
                    <span className="text-[12px]">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          {!groups.length && (
            <p className="text-[12px] text-[var(--console-muted)] text-center py-4">No permissions defined</p>
          )}
        </div>
      </section>
    </div>
  );
}
