"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import {
  createUser,
  getBranch,
  getMyProfile,
  getUserProfile,
  removeBranchMember,
  setUserPassword,
  updateUserProfile,
} from "@repo/api-client";
import type { Branch } from "@repo/api-client";
import { getBranchStaff, getStaffCountsFromList } from "@repo/api-client/staff";
import type { StaffMember } from "@repo/api-client/staff";
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
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const BRANCH_ROLES = [
  { value: "branch_manager", labelKey: "roleBranchManager" },
  { value: "branch_staff", labelKey: "roleBranchStaff" },
] as const;

const BRANCH_MANAGER_ROLES = [
  { value: "branch_staff", labelKey: "roleBranchStaff" },
] as const;

const schema = z.object({
  email: z.string().email("Valid email required"),
  full_name: z.string().min(1, "Name required"),
  password: z.string().min(6, "Min 6 characters"),
  role: z.enum(["branch_manager", "branch_staff"]),
});

type FormData = z.infer<typeof schema>;

const editSchema = z.object({
  display_name: z.string().min(1, "Name required"),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type EditFormData = z.infer<typeof editSchema>;

interface BranchBrief {
  id: string;
  name: string;
}

interface ConsoleProfile {
  roles?: string[];
  branch?: BranchBrief | null;
}

function canManageBranch(profile: ConsoleProfile | null, branchId: string) {
  if (profile?.roles?.includes("super_admin")) return true;
  if (!profile?.roles?.includes("branch_manager")) return false;
  return profile.branch?.id === branchId;
}

function roleOptions(profile: ConsoleProfile | null, hasBranchManager: boolean) {
  return profile?.roles?.includes("super_admin") && !hasBranchManager
    ? BRANCH_ROLES
    : BRANCH_MANAGER_ROLES;
}

export function BranchStaffPageClient({ branchId }: { branchId: string }) {
  const t = useTranslations("branchStaff");
  const { toast } = useToast();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [profile, setProfile] = useState<ConsoleProfile | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [counts, setCounts] = useState({ total: 0, onShift: 0 });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [removing, setRemoving] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resetPassword, setResetPassword] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      full_name: "",
      password: "",
      role: "branch_staff",
    },
  });

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      display_name: "",
      phone: "",
      address: "",
    },
  });

  const loadBranchStaff = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const [profileData, branchData] = await Promise.all([
        getMyProfile() as Promise<ConsoleProfile>,
        getBranch(branchId),
      ]);
      setProfile(profileData);
      setBranch(branchData);

      if (!canManageBranch(profileData, branchId)) {
        setStaff([]);
        setCounts({ total: 0, onShift: 0 });
        return;
      }

      const staffList = await getBranchStaff(branchId, branchData.name);
      setStaff(staffList);
      const nextCounts = getStaffCountsFromList(staffList);
      setCounts({ total: nextCounts.total, onShift: nextCounts.onShift });
    } catch (err) {
      setError(t("loadError"));
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to fetch branch staff:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadBranchStaff(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  useEffect(() => {
    if (!editing) {
      resetEdit({ display_name: "", phone: "", address: "" });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResetPassword("");
      return;
    }

    let active = true;
    resetEdit({ display_name: editing.name, phone: "", address: "" });
    setResetPassword("");

    getUserProfile(editing.userId)
      .then((data) => {
        if (!active) return;
        resetEdit({
          display_name: data.display_name || editing.name,
          phone: data.phone ?? "",
          address: data.address ?? "",
        });
      })
      .catch((err) => {
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to fetch staff profile:", err);
        }
      });

    return () => {
      active = false;
    };
  }, [editing, resetEdit]);

  const createMut = useMutation({
    mutationFn: (data: FormData) =>
      createUser({
        email: data.email,
        full_name: data.full_name,
        password: data.password,
        role: data.role,
        branch_id: branchId,
      }),
    onSuccess: () => {
      setOpen(false);
      reset();
      toast(t("staffCreated"));
      void loadBranchStaff();
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const updateMut = useMutation({
    mutationFn: (data: EditFormData) =>
      updateUserProfile(editing!.userId, {
        display_name: data.display_name,
        phone: data.phone,
        address: data.address,
      }),
    onSuccess: () => {
      setEditing(null);
      resetEdit();
      toast(t("staffUpdated"));
      void loadBranchStaff();
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const passwordMut = useMutation({
    mutationFn: (password: string) => setUserPassword(editing!.userId, password),
    onSuccess: () => {
      setResetPassword("");
      toast(t("passwordUpdated"));
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const removeMut = useMutation({
    mutationFn: (member: StaffMember) =>
      removeBranchMember(branchId, member.userId),
    onSuccess: () => {
      setRemoving(null);
      toast(t("staffRemoved"));
      void loadBranchStaff();
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const allowed = canManageBranch(profile, branchId);
  const hasBranchManager = staff.some((member) => member.role === "Manager");
  const roles = roleOptions(profile, hasBranchManager);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <Link
            href="/branches"
            className="mb-3 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-cinnamon"
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            {t("branches")}
          </Link>
          <div className="mb-1.5 flex items-center gap-3">
            <span className="block h-px w-6 bg-golden" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cinnamon">
              {loading
                ? t("loadingStaff")
                : t("staffCounts", { total: counts.total, onShift: counts.onShift })}
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
            {t("staffHeading")}{" "}
            <span className="font-editorial text-cinnamon">
              · {branch?.name ?? t("branch")}
            </span>
          </h1>
        </div>
        <Button
          onClick={() => setOpen(true)}
          disabled={!allowed || loading}
          className="rounded-full bg-[var(--espresso-deep)] px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-white shadow-[0_10px_22px_rgba(31,16,10,0.28)] ring-1 ring-black/10 transition-colors hover:bg-[var(--cocoa)] flex items-center gap-1.5"
        >
          <Plus aria-hidden="true" className="h-4 w-4" /> {t("addStaff")}
        </Button>
      </div>

      {!loading && !allowed ? (
        <div className="rounded-lg border border-[var(--console-line)] bg-white px-4 py-6 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--console-muted)]">
            {t("noAccess")}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--console-line)] bg-white">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--console-line)] font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--console-muted)]">
                <th scope="col" className="px-4 py-3 text-left font-inherit">
                  {t("colName")}
                </th>
                <th scope="col" className="px-4 py-3 text-left font-inherit">
                  {t("colEmail")}
                </th>
                <th scope="col" className="px-4 py-3 text-left font-inherit">
                  {t("colRole")}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-inherit">
                  {t("colActions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member, index) => (
                <tr
                  key={member.email}
                  className={
                    index === staff.length - 1
                      ? undefined
                      : "border-b border-[var(--console-line)]"
                  }
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cinnamon font-display text-[15px] text-white">
                        {member.initial}
                      </div>
                      <div className="text-[14px] font-semibold text-espresso">
                        {member.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[11px] text-[var(--console-muted)]">
                    {member.email}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[12px] font-bold text-espresso">
                    {member.role}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${member.name}`}
                        onClick={() => setEditing(member)}
                      >
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${member.name}`}
                        onClick={() => setRemoving(member)}
                      >
                        <Trash2
                          aria-hidden="true"
                          className="h-4 w-4 text-destructive"
                        />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && (
            <div className="px-4 py-6 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--console-muted)]">
              {t("loadingStaff")}
            </div>
          )}
          {!loading && error && (
            <div role="alert" className="px-4 py-6 text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-sienna">
                {error}
              </p>
              <button
                type="button"
                onClick={() => loadBranchStaff(true)}
                className="mt-3 rounded-full border border-sienna/30 px-3 py-1.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-sienna"
              >
                {t("retry")}
              </button>
            </div>
          )}
          {!loading && !error && staff.length === 0 && (
            <div className="px-4 py-6 text-center font-editorial text-[14px] italic text-caramel">
              {t("noStaff")}
            </div>
          )}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!value) {
            setOpen(false);
            reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addStaff")}</DialogTitle>
            <DialogDescription>
              {t("addStaffDesc", { branch: branch?.name ?? t("thisBranch") })}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((data) => createMut.mutate(data))}
            className="space-y-4 mt-4"
          >
            <div>
              <Label htmlFor="branch-staff-name">{t("fullName")}</Label>
              <Input id="branch-staff-name" {...register("full_name")} />
              {errors.full_name && (
                <p className="text-xs text-destructive mt-1">
                  {errors.full_name.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="branch-staff-email">{t("email")}</Label>
              <Input
                id="branch-staff-email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="branch-staff-password">{t("password")}</Label>
              <Input
                id="branch-staff-password"
                type="password"
                autoComplete="new-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-destructive mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="branch-staff-role">{t("role")}</Label>
              <Select id="branch-staff-role" {...register("role")}>
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {t(role.labelKey)}
                  </option>
                ))}
              </Select>
              {errors.role && (
                <p className="text-xs text-destructive mt-1">
                  {errors.role.message}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={createMut.isPending}
                className="bg-[var(--espresso-deep)] font-bold text-white shadow-[0_10px_22px_rgba(31,16,10,0.22)] ring-1 ring-black/10 hover:bg-[var(--cocoa)]"
              >
                {createMut.isPending ? t("creating") : t("createStaff")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editing}
        onOpenChange={(value) => {
          if (!value) {
            setEditing(null);
            resetEdit();
            setResetPassword("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editStaff")}</DialogTitle>
            <DialogDescription>
              {t("editStaffDesc", { branch: branch?.name ?? t("thisBranch") })}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleEditSubmit((data) => updateMut.mutate(data))}
            className="space-y-4 mt-4"
          >
            <div>
              <Label htmlFor="edit-staff-name">{t("fullName")}</Label>
              <Input id="edit-staff-name" {...registerEdit("display_name")} />
              {editErrors.display_name && (
                <p className="text-xs text-destructive mt-1">
                  {editErrors.display_name.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-staff-phone">{t("phone")}</Label>
              <Input
                id="edit-staff-phone"
                type="tel"
                autoComplete="tel"
                {...registerEdit("phone")}
              />
            </div>
            <div>
              <Label htmlFor="edit-staff-address">{t("address")}</Label>
              <Input
                id="edit-staff-address"
                autoComplete="street-address"
                {...registerEdit("address")}
              />
            </div>
            <div>
              <Label htmlFor="edit-staff-role">{t("role")}</Label>
              <Input
                id="edit-staff-role"
                value={editing?.role ?? ""}
                readOnly
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("roleChangeNote")}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(null)}
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={updateMut.isPending}
                className="bg-[var(--espresso-deep)] font-bold text-white shadow-[0_10px_22px_rgba(31,16,10,0.22)] ring-1 ring-black/10 hover:bg-[var(--cocoa)]"
              >
                {updateMut.isPending ? t("saving") : t("save")}
              </Button>
            </div>
          </form>
          <div className="mt-5 border-t border-[var(--console-line)] pt-4">
            <Label htmlFor="edit-staff-reset-password">{t("resetPassword")}</Label>
            <div className="mt-1 flex gap-2">
              <Input
                id="edit-staff-reset-password"
                type="password"
                autoComplete="new-password"
                value={resetPassword}
                onChange={(event) => setResetPassword(event.target.value)}
                placeholder={t("newPassword")}
              />
              <Button
                type="button"
                variant="outline"
                disabled={resetPassword.length < 6 || passwordMut.isPending}
                onClick={() => passwordMut.mutate(resetPassword)}
              >
                {passwordMut.isPending ? t("updating") : t("update")}
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("passwordMinLength")}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removing} onOpenChange={() => setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("removeStaff")}</DialogTitle>
            <DialogDescription>
              {t("removeStaffDesc", { branch: branch?.name ?? t("thisBranch") })}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("removeConfirm", { name: removing?.name ?? "" })}
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setRemoving(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => removing && removeMut.mutate(removing)}
              disabled={removeMut.isPending}
            >
              {t("remove")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
