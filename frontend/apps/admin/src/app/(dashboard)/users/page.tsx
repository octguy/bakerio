"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { createUser, getMyProfile } from "@repo/api-client";
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
import { Plus } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const STAFF_CREATION_ROLES = [
  { value: "branch_staff", label: "Branch Staff" },
] as const;
const BRANCH_SCOPED_ROLES = new Set(["branch_manager", "branch_staff"]);
const BRANCH_ADMIN_ROLES = new Set(["branch_manager"]);

function isBranchScopedRole(role?: string): boolean {
  return !!role && BRANCH_SCOPED_ROLES.has(role);
}

const schema = z
  .object({
    email: z.string().email("Valid email required"),
    full_name: z.string().min(1, "Name required"),
    password: z.string().min(6, "Min 6 characters"),
    role: z.string().min(1, "Role required"),
    branch_id: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const branchId = data.branch_id?.trim();
    if (isBranchScopedRole(data.role) && !branchId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Branch required for branch-scoped roles",
        path: ["branch_id"],
      });
    }
  });
type FormData = z.infer<typeof schema>;

interface BranchBrief {
  id: string;
  name: string;
  address?: string;
}

interface AdminProfile {
  roles?: string[];
  branch?: BranchBrief | null;
}

function isBranchAdmin(profile?: AdminProfile | null): boolean {
  return (
    !!profile?.branch?.id &&
    !!profile.roles?.some((role) => BRANCH_ADMIN_ROLES.has(role))
  );
}

export default function UsersPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [counts, setCounts] = useState<{ total: number; onShift: number }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStaffData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const currentProfile = (profile ??
        (await getMyProfile())) as AdminProfile;
      setProfile(currentProfile);
      if (!isBranchAdmin(currentProfile)) {
        setStaff([]);
        setCounts({ total: 0, onShift: 0 });
        return;
      }
      const branch = currentProfile.branch!;
      const staffList = await getBranchStaff(branch.id, branch.name);
      setStaff(staffList);
      setCounts(getStaffCountsFromList(staffList));
    } catch (err) {
      setError("Could not load staff data. Retry when the API is reachable.");
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to fetch staff:", err);
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const currentProfile = (await getMyProfile()) as AdminProfile;
        if (cancelled) return;
        setProfile(currentProfile);
        if (!isBranchAdmin(currentProfile)) {
          setStaff([]);
          setCounts({ total: 0, onShift: 0 });
          setError("");
          return;
        }
        const branch = currentProfile.branch!;
        const staffList = await getBranchStaff(branch.id, branch.name);
        if (cancelled) return;
        setStaff(staffList);
        setCounts(getStaffCountsFromList(staffList));
        setError("");
      } catch (err) {
        if (cancelled) return;
        setError("Could not load staff data. Retry when the API is reachable.");
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to fetch staff:", err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const createMut = useMutation({
    mutationFn: (d: FormData) =>
      createUser({
        email: d.email,
        full_name: d.full_name,
        password: d.password,
        role: d.role,
        branch_id: isBranchScopedRole(d.role) ? profile?.branch?.id : undefined,
      }),
    onSuccess: () => {
      setOpen(false);
      toast("User created");
      reset();
      fetchStaffData();
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      full_name: "",
      password: "",
      role: "",
      branch_id: "",
    },
  });
  const selectedRole = useWatch({ control, name: "role" });

  useEffect(() => {
    setValue("branch_id", profile?.branch?.id ?? "");
  }, [profile?.branch?.id, setValue]);

  const handleCreateUser = (data: FormData) => {
    if (createMut.isPending) return;
    createMut.mutate(data);
  };

  const canManageBranchStaff = isBranchAdmin(profile);

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-3">
            <span className="block h-px w-6 bg-golden" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cinnamon">
              {loading && !counts
                ? "Loading staff..."
                : error && !counts
                  ? "Staff data unavailable"
                  : `${counts?.total ?? 46} on the payroll · ${counts?.onShift ?? 28} on shift now`}
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
            Staff{" "}
            <span className="font-editorial text-cinnamon">· the team</span>
          </h1>
        </div>
        <Button
          onClick={() => {
            setOpen(true);
          }}
          disabled={!canManageBranchStaff}
          className="rounded-full bg-[var(--espresso-deep)] px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-white shadow-[0_10px_22px_rgba(31,16,10,0.28)] ring-1 ring-black/10 transition-colors hover:bg-[var(--cocoa)] flex items-center gap-1.5"
        >
          <Plus aria-hidden="true" className="h-4 w-4" /> Add User
        </Button>
      </div>

      {/* Staff Table */}
      {!loading && !canManageBranchStaff ? (
        <div className="rounded-lg border border-[var(--admin-line)] bg-white px-4 py-6 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--admin-muted)]">
            Staff directory is only available to branch managers.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--admin-line)] bg-white">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--admin-line)] font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--admin-muted)]">
                <th scope="col" className="px-4 py-3 text-left font-inherit">
                  Name
                </th>
                <th scope="col" className="px-4 py-3 text-left font-inherit">
                  Email
                </th>
                <th scope="col" className="px-4 py-3 text-left font-inherit">
                  Role
                </th>
                <th scope="col" className="px-4 py-3 text-left font-inherit">
                  Shift
                </th>
                <th scope="col" className="px-4 py-3 text-left font-inherit">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s, i) => {
                const statusColors: Record<string, string> = {
                  "clocked-in": "var(--sage)",
                  "on-break": "var(--golden)",
                  late: "var(--sienna)",
                  off: "var(--admin-muted)",
                };
                const statusLabels: Record<string, string> = {
                  "clocked-in": "Clocked In",
                  "on-break": "On Break",
                  late: "Late",
                  off: "Off Duty",
                };
                const color = statusColors[s.status] || "var(--admin-muted)";
                const avatarColors: Record<string, string> = {
                  cinnamon: "bg-cinnamon text-white",
                  golden: "bg-golden text-espresso",
                  sage: "bg-sage text-espresso",
                  honey: "bg-honey text-espresso",
                  rose: "bg-rose text-white",
                };
                const avatarClass =
                  avatarColors[s.accent] || "bg-espresso text-cream";

                return (
                  <tr
                    key={s.email}
                    className={
                      i === staff.length - 1
                        ? undefined
                        : "border-b border-[var(--admin-line)]"
                    }
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full font-display text-[15px] ${avatarClass}`}
                        >
                          {s.initial}
                        </div>
                        <div>
                          <div className="text-[14px] font-semibold text-espresso">
                            {s.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-[var(--admin-muted)]">
                      {s.email}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[12px] font-bold text-espresso">
                      {s.role}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[12px] text-espresso">
                      {s.shift}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className="rounded-full px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.06em]"
                        style={{ background: `${color}18`, color }}
                      >
                        ● {statusLabels[s.status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {loading && (
            <div className="px-4 py-6 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--admin-muted)]">
              Loading staff...
            </div>
          )}
          {!loading && error && (
            <div role="alert" className="px-4 py-6 text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-sienna">
                {error}
              </p>
              <button
                type="button"
                onClick={() => fetchStaffData(true)}
                className="mt-3 rounded-full border border-sienna/30 px-3 py-1.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-sienna"
              >
                Retry
              </button>
            </div>
          )}
          {!loading && !error && staff.length === 0 && (
            <div className="px-4 py-6 text-center font-editorial text-[14px] italic text-caramel">
              No staff records found.
            </div>
          )}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) {
            setOpen(false);
            reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>
              Create a staff account with a name, email, password, and role.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmit(handleCreateUser)}
            className="space-y-4 mt-4"
          >
            <div>
              <Label htmlFor="create-user-full-name">Full Name</Label>
              <Input id="create-user-full-name" {...register("full_name")} />
              {errors.full_name && (
                <p className="text-xs text-destructive mt-1">
                  {errors.full_name.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="create-user-email">Email</Label>
              <Input
                id="create-user-email"
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
              <Label htmlFor="create-user-password">Password</Label>
              <Input
                id="create-user-password"
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
              <Label htmlFor="create-user-role">Role</Label>
              <Select id="create-user-role" {...register("role")}>
                <option value="">Select role...</option>
                {STAFF_CREATION_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </Select>
              {errors.role && (
                <p className="text-xs text-destructive mt-1">
                  {errors.role.message}
                </p>
              )}
            </div>
            {isBranchScopedRole(selectedRole) && (
              <div>
                <Label htmlFor="create-user-branch">Branch</Label>
                <Input
                  id="create-user-branch"
                  value={profile?.branch?.name ?? ""}
                  readOnly
                />
                <input type="hidden" {...register("branch_id")} />
                {errors.branch_id && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.branch_id.message}
                  </p>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMut.isPending}
                className="bg-[var(--espresso-deep)] font-bold text-white shadow-[0_10px_22px_rgba(31,16,10,0.22)] ring-1 ring-black/10 hover:bg-[var(--cocoa)]"
              >
                {createMut.isPending ? "Creating…" : "Create User"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
