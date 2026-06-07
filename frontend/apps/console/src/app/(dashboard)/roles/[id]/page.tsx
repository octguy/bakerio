"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Check, Loader2, Search } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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

// Permission names follow "resource:action:scope" (e.g. "product:manage:all").
function parsePermission(name: string) {
  const [resource = "other", action = "", scope = ""] = name.split(":");
  return { resource, action, scope };
}

export default function RoleDetailPage() {
  const { id } = useParams() as { id: string };
  const t = useTranslations("roles");
  const { toast } = useToast();

  const { data: role, isLoading: roleLoading } = useRole(id);
  const { data: allPermissions } = usePermissions();
  const { data: rolePermissions, isLoading: permsLoading } = useRolePermissions(id);
  const updateRole = useUpdateRole(id);
  const updatePerms = useUpdateRolePermissions(id);

  // Track checked permission IDs locally for debounced save
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [permSaveState, setPermSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [permSearch, setPermSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const syncedRef = useRef<string>("");

  // Sync from server data
  useEffect(() => {
    const key = rolePermissions?.map((p) => p.id).sort().join(",") ?? "";
    if (rolePermissions && key !== syncedRef.current) {
      syncedRef.current = key;
      setCheckedIds(new Set(rolePermissions.map((p) => p.id)));
    }
  }, [rolePermissions]);

  // Humanize a permission into "Action scope" (e.g. "Manage all").
  function describePermission(name: string) {
    const { action, scope } = parsePermission(name);
    const actLabel = t.has(`act.${action}`) ? t(`act.${action}`) : action;
    const scopeLabel = scope ? (t.has(`scope.${scope}`) ? t(`scope.${scope}`) : scope) : "";
    return scopeLabel ? `${actLabel} ${scopeLabel}` : actLabel;
  }

  function resourceLabel(resource: string) {
    return t.has(`res.${resource}`) ? t(`res.${resource}`) : resource;
  }

  // Group permissions by resource (the part before the first ":"), filtered by
  // the search box. Each group carries its checked count for the header.
  const groups = useMemo(() => {
    if (!allPermissions) return [];
    const q = permSearch.trim().toLowerCase();
    const map = new Map<string, typeof allPermissions>();
    for (const p of allPermissions) {
      const { resource } = parsePermission(p.name);
      if (q && !p.name.toLowerCase().includes(q) && !resourceLabel(resource).toLowerCase().includes(q)) {
        continue;
      }
      if (!map.has(resource)) map.set(resource, []);
      map.get(resource)!.push(p);
    }
    return Array.from(map.entries())
      .map(([resource, perms]) => ({
        resource,
        perms: [...perms].sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => resourceLabel(a.resource).localeCompare(resourceLabel(b.resource)));
  }, [allPermissions, permSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPerms = allPermissions?.length ?? 0;

  function togglePermission(permId: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      scheduleSave(next);
      return next;
    });
  }

  // Bulk toggle every permission in a resource group at once.
  function toggleGroup(permIds: string[], checked: boolean) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      for (const id of permIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
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
        toast(t("permsSaveFailed"), "error");
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
      toast(t("updated"));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t("updateFailed");
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
        <p className="text-[13px] text-[var(--console-muted)]">{t("notFound")}</p>
        <Link href="/roles" className="mt-2 inline-block text-[12px] text-cinnamon hover:underline">{t("backToRoles")}</Link>
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
        <h1 className="font-display text-lg tracking-tight">{t("editRole")} <span className="text-cinnamon">{role.name}</span></h1>
      </div>

      {/* Role Info */}
      <section className="rounded-lg border border-[var(--console-line)] bg-white p-5 mb-6">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--console-muted)] mb-3">{t("roleInfo")}</h2>
        <form onSubmit={form.handleSubmit(onSaveRole)} className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[180px] space-y-1">
            <Label htmlFor="role-name" className="text-[11px]">{t("labelName")}</Label>
            <Input id="role-name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-[10px] text-red-600">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="flex-1 min-w-[180px] space-y-1">
            <Label htmlFor="role-desc" className="text-[11px]">{t("labelDescription")}</Label>
            <Input id="role-desc" {...form.register("description")} />
          </div>
          <Button type="submit" size="sm" disabled={updateRole.isPending}>
            {updateRole.isPending ? t("saving") : t("save")}
          </Button>
        </form>
      </section>

      {/* Permission Matrix */}
      <section className="rounded-lg border border-[var(--console-line)] bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--console-muted)]">{t("permissions")}</h2>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--console-muted)]">
            {permSaveState === "saving" && <><Loader2 className="h-3 w-3 animate-spin" /> {t("saving")}</>}
            {permSaveState === "saved" && <><Check className="h-3 w-3 text-green-600" /> <span className="text-green-600">{t("saved")}</span></>}
          </div>
        </div>

        {/* Summary + search */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-[12px] text-[var(--console-muted)]">
            {t("permsSummary", { count: checkedIds.size, total: totalPerms })}
          </p>
          <div className="relative w-full max-w-[220px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--console-muted)]" />
            <Input
              value={permSearch}
              onChange={(e) => setPermSearch(e.target.value)}
              placeholder={t("searchPermissions")}
              className="h-8 pl-8 text-[12px]"
            />
          </div>
        </div>

        <div className="space-y-3">
          {groups.map(({ resource, perms }) => {
            const ids = perms.map((p) => p.id);
            const checkedInGroup = ids.filter((id) => checkedIds.has(id)).length;
            const allChecked = checkedInGroup === ids.length && ids.length > 0;
            return (
              <div key={resource} className="rounded-lg border border-[var(--console-line)] overflow-hidden">
                <div className="flex items-center justify-between gap-2 bg-cream/50 px-3 py-2 border-b border-[var(--console-line)]">
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-semibold">{resourceLabel(resource)}</span>
                    <span className="font-mono text-[10px] text-[var(--console-muted)]">
                      {t("groupCount", { checked: checkedInGroup, total: ids.length })}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleGroup(ids, !allChecked)}
                    className="rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-cinnamon hover:bg-cinnamon/10 transition-colors"
                  >
                    {allChecked ? t("clearAll") : t("selectAll")}
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 p-3 sm:grid-cols-2">
                  {perms.map((p) => {
                    const checked = checkedIds.has(p.id);
                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-2.5 rounded px-2 py-1.5 cursor-pointer select-none hover:bg-cream/40 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermission(p.id)}
                          className="h-4 w-4 rounded border-[var(--console-line)] accent-cinnamon"
                        />
                        <span className="flex-1 text-[12.5px]">{describePermission(p.name)}</span>
                        <code className="font-mono text-[9.5px] text-[var(--console-muted)]">{p.name}</code>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {!groups.length && (
            <p className="text-[12px] text-[var(--console-muted)] text-center py-4">
              {permSearch.trim() ? t("noPermMatch") : t("noPermissions")}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
