"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  assignBranchMember,
  createUser,
  getBranches,
  getMyProfile,
  getUserProfile,
  setUserPassword,
  updateUserProfile,
} from "@repo/api-client";
import type { Branch } from "@repo/api-client";
import {
  getBranchStaff,
  getStaffPage,
  getStaffCountsFromList,
  getStaffRoleOptions,
} from "@repo/api-client/staff";
import type { StaffMember, StaffRoleOption } from "@repo/api-client/staff";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { useViewportPageSize } from "@/lib/use-viewport-page-size";
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
import { ArrowRightLeft, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const BRANCH_SCOPED_ROLES = new Set(["branch_manager", "branch_staff"]);

function isBranchScopedRole(role?: string): boolean {
  return !!role && BRANCH_SCOPED_ROLES.has(role);
}

const createSchema = z
  .object({
    email: z.string().email("Valid email required"),
    full_name: z.string().min(1, "Name required"),
    password: z.string().min(6, "Min 6 characters"),
    role: z.string().min(1, "Role required"),
    branch_id: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (isBranchScopedRole(data.role) && !data.branch_id?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "Branch required for branch-scoped roles",
        path: ["branch_id"],
      });
    }
  });

const editSchema = z.object({
  display_name: z.string().min(1, "Name required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  password: z.string().optional(),
});

const passwordSchema = z.object({
  password: z.string().min(6, "Min 6 characters"),
});

type CreateFormData = z.infer<typeof createSchema>;
type EditFormData = z.infer<typeof editSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

interface BranchBrief {
  id: string;
  name: string;
  address?: string;
}

interface ConsoleProfile {
  roles?: string[];
  branch?: BranchBrief | null;
}

function roleLabel(role: string): string {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function filterStaff(staff: StaffMember[], q: string): StaffMember[] {
  const term = q.trim().toLowerCase();
  if (!term) return staff;
  return staff.filter(
    (member) =>
      member.name.toLowerCase().includes(term) ||
      member.email.toLowerCase().includes(term) ||
      String(member.role).toLowerCase().includes(term),
  );
}

export default function StaffPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<StaffMember | null>(null);
  const [reassigning, setReassigning] = useState<StaffMember | null>(null);
  const [reassignBranchId, setReassignBranchId] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [staffRoles, setStaffRoles] = useState<StaffRoleOption[]>([]);
  const [profile, setProfile] = useState<ConsoleProfile | null>(null);
  const [counts, setCounts] = useState<{ total: number; onShift: number }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pageSize = useViewportPageSize();
  const trimmedSearch = debouncedSearch.trim();

  const isSuperAdmin = profile?.roles?.includes("super_admin") ?? false;
  const isBranchManager = profile?.roles?.includes("branch_manager") ?? false;
  const canManageStaff = isSuperAdmin || (isBranchManager && !!profile?.branch?.id);
  const roleOptions = isSuperAdmin
    ? staffRoles
    : staffRoles.filter((role) => role.value === "branch_staff");
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;
  const filteredBySelectStaff = staff;
  const createForm = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      email: "",
      full_name: "",
      password: "",
      role: "",
      branch_id: "",
    },
  });
  const selectedRole = useWatch({ control: createForm.control, name: "role" });
  const selectedBranchId = useWatch({ control: createForm.control, name: "branch_id" });

  const editForm = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      display_name: "",
      phone: "",
      address: "",
      password: "",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "" },
  });

  const fetchStaffData = async (showLoading = false, q = trimmedSearch) => {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const currentProfile = (profile ?? (await getMyProfile())) as ConsoleProfile;
      setProfile(currentProfile);

      const currentIsSuperAdmin = currentProfile.roles?.includes("super_admin") ?? false;
      const currentIsBranchManager = currentProfile.roles?.includes("branch_manager") ?? false;

      if (currentIsSuperAdmin) {
        const [branchList, roles] = await Promise.all([
          branches.length > 0 ? Promise.resolve(branches) : getBranches(),
          staffRoles.length > 0 ? Promise.resolve(staffRoles) : getStaffRoleOptions(),
        ]);
        const staffPage = await getStaffPage({
          q: q || undefined,
          role: roleFilter !== "all" ? roleFilter : undefined,
          branch_id: branchFilter !== "all" ? branchFilter : undefined,
          page,
          size: pageSize,
          branches: branchList,
        });
        setBranches(branchList);
        setStaffRoles(roles);
        setStaff(staffPage.items);
        setCounts({ total: staffPage.total, onShift: staffPage.total });
        setTotalPages(Math.max(1, staffPage.totalPages));
        return;
      }

      if (currentIsBranchManager && currentProfile.branch?.id) {
        const staffList = await getBranchStaff(
          currentProfile.branch.id,
          currentProfile.branch.name,
          roleFilter !== "all" ? roleFilter : undefined
        );
        const filteredStaff = filterStaff(staffList, q);
        const branchTotalPages = Math.max(1, Math.ceil(filteredStaff.length / pageSize));
        const roles = staffRoles.length > 0 ? staffRoles : await getStaffRoleOptions();
        setBranches(currentProfile.branch ? [{ id: currentProfile.branch.id, name: currentProfile.branch.name } as Branch] : []);
        setStaffRoles(roles);
        setStaff(filteredStaff.slice((page - 1) * pageSize, page * pageSize));
        setCounts(getStaffCountsFromList(filteredStaff));
        setTotalPages(branchTotalPages);
        return;
      }

      setBranches([]);
      setStaff([]);
      setCounts({ total: 0, onShift: 0 });
      setTotalPages(1);
    } catch (err) {
      setError("Could not load staff data. Retry when the API is reachable.");
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to fetch staff:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchStaffData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setPage(1), 0);
    return () => window.clearTimeout(timeout);
  }, [pageSize, roleFilter, branchFilter]);

  useEffect(() => {
    if (loading && !profile) return;
    const timeout = window.setTimeout(() => {
      void fetchStaffData(false, trimmedSearch);
    }, 0);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmedSearch, roleFilter, branchFilter, page, pageSize]);

  useEffect(() => {
    if (!isBranchScopedRole(selectedRole)) {
      createForm.setValue("branch_id", "");
      return;
    }

    if (!isSuperAdmin) {
      createForm.setValue("branch_id", profile?.branch?.id ?? "");
    }
  }, [createForm, isSuperAdmin, profile?.branch?.id, selectedRole]);

  useEffect(() => {
    if (!editing) {
      editForm.reset({ display_name: "", phone: "", address: "", password: "" });
      return;
    }

    let active = true;
    editForm.reset({
      display_name: editing.name,
      phone: "",
      address: "",
      password: "",
    });

    getUserProfile(editing.userId)
      .then((data) => {
        if (!active) return;
        editForm.reset({
          display_name: data.display_name || editing.name,
          phone: data.phone ?? "",
          address: data.address ?? "",
          password: "",
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
  }, [editForm, editing]);

  const createMut = useMutation({
    mutationFn: (data: CreateFormData) =>
      createUser({
        email: data.email,
        full_name: data.full_name,
        password: data.password,
        role: data.role,
        branch_id: isBranchScopedRole(data.role) ? data.branch_id || undefined : undefined,
      }),
    onSuccess: () => {
      setOpen(false);
      createForm.reset();
      toast("Staff member created");
      void fetchStaffData();
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const updateMut = useMutation({
    mutationFn: async (data: EditFormData) => {
      if (!editing) return;
      await updateUserProfile(editing.userId, {
        display_name: data.display_name,
        phone: data.phone || undefined,
        address: data.address || undefined,
      });
      if (data.password?.trim()) {
        await setUserPassword(editing.userId, data.password.trim());
      }
    },
    onSuccess: () => {
      setEditing(null);
      editForm.reset();
      toast("Staff member updated");
      void fetchStaffData();
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const reassignMut = useMutation({
    mutationFn: async () => {
      if (!reassigning || !reassignBranchId) return;
      await assignBranchMember(reassignBranchId, reassigning.userId);
    },
    onSuccess: () => {
      setReassigning(null);
      setReassignBranchId("");
      toast("Staff member reassigned");
      void fetchStaffData();
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const passwordMut = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      if (!passwordTarget) return;
      await setUserPassword(passwordTarget.userId, data.password.trim());
    },
    onSuccess: () => {
      setPasswordTarget(null);
      passwordForm.reset();
      toast("Staff password updated");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const columns: ColumnDef<StaffMember, unknown>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const avatarColors: Record<string, string> = {
          cinnamon: "bg-cinnamon text-white",
          golden: "bg-golden text-espresso",
          sage: "bg-sage text-espresso",
          honey: "bg-honey text-espresso",
          rose: "bg-rose text-white",
        };

        return (
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full font-display text-[15px] ${avatarColors[row.original.accent]}`}
            >
              {row.original.initial}
            </div>
            <div>
              <div className="text-[14px] font-semibold text-espresso">
                {row.original.name}
              </div>
              <div className="font-mono text-[10.5px] text-[var(--console-muted)]">
                {row.original.email}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => roleLabel(String(row.original.role)),
    },
    {
      accessorKey: "branch",
      header: "Branch",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex gap-1">
          {isSuperAdmin && row.original.branchId && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Reassign ${row.original.name}`}
              onClick={() => {
                setReassigning(row.original);
                setReassignBranchId(row.original.branchId ?? "");
              }}
            >
              <ArrowRightLeft aria-hidden="true" className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${row.original.name}`}
            onClick={() => setEditing(row.original)}
          >
            <Pencil aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Set password for ${row.original.name}`}
            onClick={() => {
              setPasswordTarget(row.original);
              passwordForm.reset({ password: "" });
            }}
          >
            <KeyRound aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete ${row.original.name}`}
            title="Backend has no global staff delete route"
            disabled
          >
            <Trash2 aria-hidden="true" className="h-4 w-4 text-destructive" />
          </Button>
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
              {loading && !counts
                ? "Loading staff..."
                : error && !counts
                  ? "Staff data unavailable"
                  : `${counts?.total ?? 0} staff · ${isSuperAdmin ? "global directory" : profile?.branch?.name ?? "branch scope"}`}
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
            Staff <span className="font-editorial text-cinnamon">· the team</span>
          </h1>
        </div>
        <Button
          onClick={() => setOpen(true)}
          disabled={!canManageStaff}
          className="flex items-center gap-1.5"
        >
          <Plus aria-hidden="true" className="h-4 w-4" /> Add Staff
        </Button>
      </div>

      {!loading && !canManageStaff ? (
        <div className="rounded-lg border border-[var(--console-line)] bg-white px-4 py-6 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--console-muted)]">
            Staff directory is only available to super admins and branch managers.
          </p>
        </div>
      ) : error ? (
        <div role="alert" className="rounded-lg border border-sienna/25 bg-white px-4 py-6 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-sienna">
            {error}
          </p>
          <Button variant="outline" className="mt-3" onClick={() => fetchStaffData(true)}>
            Retry
          </Button>
        </div>
      ) : loading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 rounded-xl border border-console-line bg-white/70 p-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end sm:justify-start">
              <div className="w-full sm:max-w-xs">
                <Label htmlFor="staff-search">Search</Label>
                <Input
                  id="staff-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search staff..."
                  className="mt-1"
                />
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end sm:justify-start">
                <div className="w-full sm:w-40">
                  <Label htmlFor="role-filter">Role</Label>
                  <SearchableCombobox
                    id="role-filter"
                    value={roleFilter}
                    onChange={setRoleFilter}
                    options={roleOptions}
                    placeholder="All Roles"
                    searchPlaceholder="Search role..."
                    emptyMessage="No roles found."
                    allOption={{ value: "all", label: "All Roles" }}
                  />
                </div>
                <div className="w-full sm:w-40">
                  <Label htmlFor="branch-filter">Branch</Label>
                  <SearchableCombobox
                    id="branch-filter"
                    value={branchFilter}
                    onChange={setBranchFilter}
                    options={branches.map((branch) => ({ value: branch.id, label: branch.name }))}
                    placeholder="All Branches"
                    searchPlaceholder="Search branch..."
                    emptyMessage="No branches found."
                    allOption={{ value: "all", label: "All Branches" }}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 self-end">
              <Button type="button" variant="outline" size="sm" aria-label="First page" onClick={() => setPage(1)} disabled={!canGoPrev || loading}>
                <ChevronsLeft aria-hidden="true" className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="sm" aria-label="Previous page" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!canGoPrev || loading}>
                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1 text-sm text-console-muted">
                <span>Page</span>
                <Input
                  aria-label="Jump to staff page"
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
                <span>of {totalPages}</span>
              </div>
              <Button type="button" variant="outline" size="sm" aria-label="Next page" onClick={() => setPage((p) => p + 1)} disabled={!canGoNext || loading}>
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="sm" aria-label="Last page" onClick={() => setPage(totalPages)} disabled={!canGoNext || loading}>
                <ChevronsRight aria-hidden="true" className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DataTable
            columns={columns}
            data={filteredBySelectStaff}
            showFooter={false}
          />
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) createForm.reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Staff</DialogTitle>
            <DialogDescription>
              Create a staff account and assign it to the right operational scope.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit((data) => createMut.mutate(data))} className="mt-4 space-y-4">
            <div>
              <Label htmlFor="staff-name">Full Name</Label>
              <Input id="staff-name" {...createForm.register("full_name")} />
              {createForm.formState.errors.full_name && (
                <p className="mt-1 text-xs text-destructive">
                  {createForm.formState.errors.full_name.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="staff-email">Email</Label>
              <Input id="staff-email" type="email" spellCheck={false} {...createForm.register("email")} />
              {createForm.formState.errors.email && (
                <p className="mt-1 text-xs text-destructive">
                  {createForm.formState.errors.email.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="staff-password">Password</Label>
              <Input id="staff-password" type="password" autoComplete="new-password" {...createForm.register("password")} />
              {createForm.formState.errors.password && (
                <p className="mt-1 text-xs text-destructive">
                  {createForm.formState.errors.password.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="staff-role">Role</Label>
              <SearchableCombobox
                id="staff-role"
                value={selectedRole}
                onChange={(value) => createForm.setValue("role", value, { shouldDirty: true, shouldValidate: true })}
                options={roleOptions}
                placeholder="Select role..."
                searchPlaceholder="Search role..."
                emptyMessage="No roles found."
              />
              {createForm.formState.errors.role && (
                <p className="mt-1 text-xs text-destructive">
                  {createForm.formState.errors.role.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="staff-branch">Branch</Label>
              {isSuperAdmin ? (
                <SearchableCombobox
                  id="staff-branch"
                  value={selectedBranchId ?? ""}
                  onChange={(value) => createForm.setValue("branch_id", value, { shouldDirty: true, shouldValidate: true })}
                  options={branches.map((branch) => ({ value: branch.id, label: branch.name }))}
                  placeholder={isBranchScopedRole(selectedRole) ? "Select branch..." : "Not applicable"}
                  searchPlaceholder="Search branch..."
                  emptyMessage="No branches found."
                  disabled={!isBranchScopedRole(selectedRole)}
                />
              ) : (
                <>
                  <Input id="staff-branch" value={profile?.branch?.name ?? ""} readOnly />
                  <input type="hidden" {...createForm.register("branch_id")} />
                </>
              )}
              {createForm.formState.errors.branch_id && (
                <p className="mt-1 text-xs text-destructive">
                  {createForm.formState.errors.branch_id.message}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? "Creating..." : "Create Staff"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editing}
        onOpenChange={(value) => {
          if (!value) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Staff</DialogTitle>
            <DialogDescription>
              Update the staff profile. Password is changed only when filled.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit((data) => updateMut.mutate(data))} className="mt-4 space-y-4">
            <div>
              <Label htmlFor="edit-staff-name">Display Name</Label>
              <Input id="edit-staff-name" {...editForm.register("display_name")} />
              {editForm.formState.errors.display_name && (
                <p className="mt-1 text-xs text-destructive">
                  {editForm.formState.errors.display_name.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="edit-staff-phone">Phone</Label>
              <Input id="edit-staff-phone" {...editForm.register("phone")} />
            </div>
            <div>
              <Label htmlFor="edit-staff-address">Address</Label>
              <Input id="edit-staff-address" {...editForm.register("address")} />
            </div>
            <div>
              <Label htmlFor="edit-staff-password">Reset Password</Label>
              <Input id="edit-staff-password" type="password" autoComplete="new-password" {...editForm.register("password")} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMut.isPending}>
                {updateMut.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!passwordTarget}
        onOpenChange={(value) => {
          if (!value) {
            setPasswordTarget(null);
            passwordForm.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Staff Password</DialogTitle>
            <DialogDescription>
              Override the current password for {passwordTarget?.name ?? "this staff member"}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={passwordForm.handleSubmit((data) => passwordMut.mutate(data))} className="mt-4 space-y-4">
            <div>
              <Label htmlFor="set-staff-password">New Password</Label>
              <Input id="set-staff-password" type="password" autoComplete="new-password" {...passwordForm.register("password")} />
              {passwordForm.formState.errors.password && (
                <p className="mt-1 text-xs text-destructive">
                  {passwordForm.formState.errors.password.message}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPasswordTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={passwordMut.isPending}>
                {passwordMut.isPending ? "Updating..." : "Set Password"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!reassigning}
        onOpenChange={(value) => {
          if (!value) {
            setReassigning(null);
            setReassignBranchId("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Branch</DialogTitle>
            <DialogDescription>
              Move {reassigning?.name ?? "this staff member"} to another branch.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="reassign-branch">Branch</Label>
              <BranchCombobox
                value={reassignBranchId}
                onChange={setReassignBranchId}
                branches={branches}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setReassigning(null);
                  setReassignBranchId("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={
                  reassignMut.isPending ||
                  !reassignBranchId ||
                  reassignBranchId === reassigning?.branchId
                }
                onClick={() => reassignMut.mutate()}
              >
                {reassignMut.isPending ? "Moving..." : "Move Branch"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface BranchComboboxProps {
  value: string;
  onChange: (value: string) => void;
  branches: { id: string; name: string }[];
}

function BranchCombobox({ value, onChange, branches }: BranchComboboxProps) {
  return (
    <SearchableCombobox
      value={value}
      onChange={onChange}
      options={branches.map((branch) => ({ value: branch.id, label: branch.name }))}
      placeholder="Select branch..."
      searchPlaceholder="Search branch..."
      emptyMessage="No branches found."
    />
  );
}

interface SearchableComboboxOption {
  value: string;
  label: string;
}

interface SearchableComboboxProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableComboboxOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  allOption?: SearchableComboboxOption;
  disabled?: boolean;
}

function SearchableCombobox({
  id,
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  allOption,
  disabled = false,
}: SearchableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const choices = allOption ? [allOption, ...options] : options;
  const selectedOption = choices.find((option) => option.value === value);
  const filtered = choices.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <Button
        type="button"
        id={id}
        variant="outline"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen(!open);
          setSearch("");
        }}
        className="w-full justify-between border-input bg-background text-left font-normal text-espresso shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="truncate text-left">{selectedOption ? selectedOption.label : placeholder}</span>
        <span className="text-xs text-console-muted">▼</span>
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-console-line bg-white p-2 shadow-lg">
          <Input
            autoFocus
            placeholder={searchPlaceholder}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="mb-2 h-8 text-sm"
          />
          <div className="space-y-1">
            {filtered.length > 0 ? (
              filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`w-full rounded px-2 py-1.5 text-left text-xs text-espresso hover:bg-vanilla ${
                    value === option.value ? "bg-vanilla font-semibold" : ""
                  }`}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <p className="py-2 text-center text-xs text-console-muted">
                {emptyMessage}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
