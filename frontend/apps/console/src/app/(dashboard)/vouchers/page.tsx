"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAdminVouchers,
  createVoucher,
  updateVoucher,
} from "@repo/api-client";
import type { Voucher } from "@repo/api-client";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { useViewportPageSize } from "@/lib/use-viewport-page-size";
import { useAuth } from "@/lib/auth";
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
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pencil,
  Plus,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const VOUCHER_ROLES = new Set(["super_admin", "product_manager"]);

const schema = z
  .object({
    code: z.string().min(1, "Code required"),
    discount_percent: z.coerce.number().min(1, "1–100").max(100, "1–100"),
    max_discount: z.string().optional(),
    min_subtotal: z.string().optional(),
    valid_from: z.string().min(1, "Start required"),
    valid_to: z.string().min(1, "End required"),
    is_active: z.boolean().optional(),
  })
  .refine((d) => new Date(d.valid_to) > new Date(d.valid_from), {
    message: "End must be after start",
    path: ["valid_to"],
  });

type FormData = z.infer<typeof schema>;

// Backend sends RFC3339 timestamps; <input type="datetime-local"> needs
// "YYYY-MM-DDTHH:mm" in local time. These two helpers bridge the formats.
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIso(local: string): string {
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? local : d.toISOString();
}

function formatRange(from: string, to: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  return `${fmt(from)} → ${fmt(to)}`;
}

function formatCap(value?: string): string {
  if (!value) return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return new Intl.NumberFormat("vi-VN").format(n) + "₫";
}

export default function VouchersPage() {
  const t = useTranslations("vouchers");
  const tc = useTranslations("common");
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const canManage = (user?.roles ?? []).some((r) => VOUCHER_ROLES.has(r));

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const pageSize = useViewportPageSize();

  useEffect(() => {
    const timeout = window.setTimeout(() => setPage(1), 0);
    return () => window.clearTimeout(timeout);
  }, [pageSize, activeFilter]);

  const activeParam =
    activeFilter === "all" ? undefined : activeFilter === "active";

  const { data, isLoading } = useQuery({
    queryKey: ["console-vouchers", { activeParam, page, pageSize }],
    queryFn: () =>
      getAdminVouchers({ active: activeParam, page, size: pageSize }),
  });

  const vouchers = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, data?.total_pages ?? 1);
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  const createMut = useMutation({
    mutationFn: (d: FormData) =>
      createVoucher({
        code: d.code.trim().toUpperCase(),
        discount_percent: d.discount_percent,
        max_discount: d.max_discount?.trim() || undefined,
        min_subtotal: d.min_subtotal?.trim() || undefined,
        valid_from: toIso(d.valid_from),
        valid_to: toIso(d.valid_to),
        is_active: d.is_active ?? true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["console-vouchers"] });
      setOpen(false);
      toast(t("created"));
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const updateMut = useMutation({
    mutationFn: (d: FormData) =>
      updateVoucher(editing!.id, {
        discount_percent: d.discount_percent,
        max_discount: d.max_discount?.trim() || undefined,
        min_subtotal: d.min_subtotal?.trim() || undefined,
        valid_from: toIso(d.valid_from),
        valid_to: toIso(d.valid_to),
        is_active: d.is_active ?? editing!.is_active,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["console-vouchers"] });
      setOpen(false);
      setEditing(null);
      toast(t("updated"));
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const statusMut = useMutation({
    mutationFn: ({ voucher, isActive }: { voucher: Voucher; isActive: boolean }) =>
      updateVoucher(voucher.id, { is_active: isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["console-vouchers"] });
      toast(t("statusUpdated"));
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof schema>, unknown, FormData>({
    resolver: zodResolver(schema),
    values: editing
      ? {
          code: editing.code,
          discount_percent: editing.discount_percent,
          max_discount: editing.max_discount ?? "",
          min_subtotal: editing.min_subtotal ?? "",
          valid_from: toLocalInput(editing.valid_from),
          valid_to: toLocalInput(editing.valid_to),
          is_active: editing.is_active,
        }
      : undefined,
  });

  const columns: ColumnDef<Voucher, unknown>[] = [
    {
      accessorKey: "is_active",
      header: t("colStatus"),
      cell: ({ row }) => {
        const isActive = row.original.is_active;
        const isPending =
          statusMut.isPending &&
          statusMut.variables?.voucher?.id === row.original.id;
        return (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`${isActive ? "Deactivate" : "Activate"} ${row.original.code}`}
            onClick={() =>
              statusMut.mutate({ voucher: row.original, isActive: !isActive })
            }
            disabled={isPending || !canManage}
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
      accessorKey: "code",
      header: t("colCode"),
      cell: ({ row }) => (
        <span className="font-mono font-semibold tracking-wide">
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: "discount_percent",
      header: t("colDiscount"),
      cell: ({ row }) => `${row.original.discount_percent}%`,
    },
    {
      id: "max_discount",
      header: t("colMaxCap"),
      cell: ({ row }) => formatCap(row.original.max_discount),
    },
    {
      id: "min_subtotal",
      header: t("colMinOrder"),
      cell: ({ row }) => formatCap(row.original.min_subtotal),
    },
    {
      id: "validity",
      header: t("colValid"),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-console-muted">
          {formatRange(row.original.valid_from, row.original.valid_to)}
        </span>
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
            aria-label={`Edit ${row.original.code}`}
            disabled={!canManage}
            onClick={() => {
              setEditing(row.original);
              setOpen(true);
            }}
          >
            <Pencil aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (user && !canManage) {
    return (
      <div className="rounded-lg border border-console-line bg-white px-4 py-10 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-console-muted">
          {t("noAccess")}
        </p>
      </div>
    );
  }

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
            <span className="font-editorial text-cinnamon">· {t("codes", { count: total })}</span>
          </h1>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            reset({
              code: "",
              discount_percent: 10,
              max_discount: "",
              min_subtotal: "",
              valid_from: "",
              valid_to: "",
              is_active: true,
            });
            setOpen(true);
          }}
        >
          <Plus aria-hidden="true" className="h-4 w-4" /> {t("addVoucher")}
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-console-line bg-white/70 p-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-2">
          {(["all", "active", "inactive"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={activeFilter === value ? "default" : "outline"}
              onClick={() => setActiveFilter(value)}
              className="capitalize"
            >
              {t(`filter_${value}`)}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 self-end">
          <Button type="button" variant="outline" size="sm" aria-label="First page" onClick={() => setPage(1)} disabled={!canGoPrev || isLoading}>
            <ChevronsLeft aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" aria-label="Previous page" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!canGoPrev || isLoading}>
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 text-sm text-console-muted">
            <span>{t("page")}</span>
            <Input
              aria-label="Jump to voucher page"
              type="number"
              min={1}
              max={totalPages}
              value={page}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (!Number.isFinite(next)) return;
                setPage(Math.min(totalPages, Math.max(1, next)));
              }}
              className="h-8 w-16 appearance-none text-center [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span>{t("of", { total: totalPages })}</span>
          </div>
          <Button type="button" variant="outline" size="sm" aria-label="Next page" onClick={() => setPage((p) => p + 1)} disabled={!canGoNext || isLoading}>
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" aria-label="Last page" onClick={() => setPage(totalPages)} disabled={!canGoNext || isLoading}>
            <ChevronsRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p>{tc("loading")}</p>
      ) : (
        <DataTable columns={columns} data={vouchers} showFooter={false} />
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
            <DialogTitle>{editing ? t("editVoucher") : t("newVoucher")}</DialogTitle>
            <DialogDescription>
              {editing ? t("editDesc") : t("createDesc")}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((d) =>
              editing ? updateMut.mutate(d) : createMut.mutate(d),
            )}
            className="mt-4 space-y-4"
          >
            <div>
              <Label htmlFor="voucher-code">{t("labelCode")}</Label>
              <Input
                id="voucher-code"
                spellCheck={false}
                disabled={!!editing}
                className="uppercase"
                {...register("code")}
              />
              {errors.code && (
                <p className="mt-1 text-xs text-destructive">{errors.code.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="voucher-discount">{t("labelDiscount")}</Label>
              <Input
                id="voucher-discount"
                type="number"
                min={1}
                max={100}
                {...register("discount_percent")}
              />
              {errors.discount_percent && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.discount_percent.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="voucher-max">{t("labelMaxCap")}</Label>
                <Input
                  id="voucher-max"
                  type="number"
                  min={0}
                  placeholder={t("placeholderNoCap")}
                  {...register("max_discount")}
                />
              </div>
              <div>
                <Label htmlFor="voucher-min">{t("labelMinOrder")}</Label>
                <Input
                  id="voucher-min"
                  type="number"
                  min={0}
                  placeholder={t("placeholderNoMin")}
                  {...register("min_subtotal")}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="voucher-from">{t("labelValidFrom")}</Label>
                <Input id="voucher-from" type="datetime-local" {...register("valid_from")} />
                {errors.valid_from && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.valid_from.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="voucher-to">{t("labelValidTo")}</Label>
                <Input id="voucher-to" type="datetime-local" {...register("valid_to")} />
                {errors.valid_to && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.valid_to.message}
                  </p>
                )}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-espresso">
              <input type="checkbox" {...register("is_active")} />
              {t("labelActive")}
            </label>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  setEditing(null);
                }}
              >
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {tc("save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

