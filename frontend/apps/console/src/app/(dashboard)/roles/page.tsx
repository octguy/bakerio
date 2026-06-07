"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import type { Role } from "@repo/api-client";
import { useRoles, useRolePermissions, useCreateRole } from "@/lib/use-rbac";
import { DataTable } from "@/components/data-table";
import { Button, buttonVariants } from "@/components/ui/button";
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
  return <span className="font-mono tabular-nums">{data?.length ?? "—"}</span>;
}

export default function RolesPage() {
  const t = useTranslations("roles");
  const tc = useTranslations("common");
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
      toast(t("created"));
      setDialogOpen(false);
      form.reset();
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "";
      const msg = errMsg.includes("conflict") || errMsg.includes("exists")
        ? t("nameExists")
        : errMsg || t("createFailed");
      form.setError("name", { message: msg });
    }
  }

  const columns: ColumnDef<Role, unknown>[] = [
    {
      accessorKey: "name",
      header: t("colName"),
      cell: ({ row }) => (
        <span className="font-semibold text-espresso">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "description",
      header: t("colDescription"),
      cell: ({ row }) => (
        <span className="text-console-muted">{row.original.description || "—"}</span>
      ),
    },
    {
      id: "perms",
      header: t("colPerms"),
      cell: ({ row }) => <RolePermCount roleId={row.original.id} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Link
            href={`/roles/${row.original.id}`}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <Pencil aria-hidden="true" className="h-4 w-4" /> {tc("edit")}
          </Link>
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
              {t("subtitle")}
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
            {t("title")}{" "}
            <span className="font-editorial text-cinnamon">· {t("rolesCount", { count: roles?.length ?? 0 })}</span>
          </h1>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus aria-hidden="true" className="h-4 w-4" /> {t("createRole")}
        </Button>
      </div>

      {isLoading ? (
        <p>{tc("loading")}</p>
      ) : (
        <DataTable columns={columns} data={roles ?? []} showFooter={false} />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createRole")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">{t("labelName")}</Label>
              <Input id="name" placeholder="warehouse_staff" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-[11px] text-red-600">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">{t("labelDescription")}</Label>
              <Input id="description" placeholder="Nhân viên quản lý kho" {...form.register("description")} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>{tc("cancel")}</Button>
              <Button type="submit" disabled={createRole.isPending}>
                {createRole.isPending ? t("creating") : tc("create")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
