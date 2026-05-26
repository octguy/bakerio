"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { createUser, getBranches, type Branch } from "@repo/api-client";
import { getStaff, getStaffCounts } from "@repo/api-client/staff";
import type { StaffMember } from "@repo/api-client/staff";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const STAFF_CREATION_ROLES = [
  { value: "product_manager", label: "Product Manager" },
  { value: "branch_manager", label: "Branch Manager" },
  { value: "branch_staff", label: "Branch Staff" },
] as const;
const BRANCH_SCOPED_ROLES = new Set(["branch_manager", "branch_staff"]);

function isBranchScopedRole(role?: string): boolean {
  return !!role && BRANCH_SCOPED_ROLES.has(role);
}

const schema = z.object({
  email: z.string().email("Valid email required"),
  full_name: z.string().min(1, "Name required"),
  password: z.string().min(6, "Min 6 characters"),
  role: z.string().min(1, "Role required"),
  branch_id: z.string().optional(),
}).superRefine((data, ctx) => {
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

export default function UsersPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchError, setBranchError] = useState("");
  const [counts, setCounts] = useState<{ total: number; onShift: number }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStaffData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const staffList = await getStaff();
      const countsData = await getStaffCounts();
      setStaff(staffList);
      setCounts(countsData);
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
    fetchStaffData(true); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const createMut = useMutation({
    mutationFn: (d: FormData) => createUser({
      email: d.email,
      full_name: d.full_name,
      password: d.password,
      role: d.role,
      branch_id: isBranchScopedRole(d.role) ? d.branch_id?.trim() : undefined,
    }),
    onSuccess: () => {
      setOpen(false);
      toast("User created");
      reset();
      fetchStaffData();
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      full_name: "",
      password: "",
      role: "",
      branch_id: "",
    },
  });
  const selectedRole = watch("role");

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setBranchError("");
    setBranchesLoading(true);

    void getBranches()
      .then((branchList) => {
        if (!cancelled) {
          setBranches(branchList);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setBranches([]);
        setBranchError("Could not load branches. Retry when the API is reachable.");
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to fetch branches:", err);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setBranchesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleCreateUser = (data: FormData) => {
    if (createMut.isPending) return;
    createMut.mutate(data);
  };

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
            style={{ fontSize: "clamp(26px,3.6vw,32px)", lineHeight: 1, letterSpacing: "-0.02em" }}
          >
            Staff <span className="font-editorial text-cinnamon">· the team</span>
          </h1>
        </div>
        <Button onClick={() => setOpen(true)} className="rounded-full bg-espresso text-cream font-mono text-[11px] uppercase tracking-[0.08em] px-4 py-2 hover:bg-cinnamon transition-colors flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Add User
        </Button>
      </div>

      {/* Staff Table */}
      <div className="rounded-lg border border-[var(--admin-line)] bg-white">
        <div
          className="grid items-center border-b border-[var(--admin-line)] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--admin-muted)]"
          style={{ gridTemplateColumns: "2fr 1.5fr 1fr 1.5fr 1fr" }}
        >
          <span>Staff Member</span>
          <span>Role</span>
          <span>Branch</span>
          <span>Shift</span>
          <span>Status</span>
        </div>
        {staff.map((s, i) => {
          const statusColors: Record<string, string> = {
            "clocked-in": "var(--sage)",
            "on-break": "var(--golden)",
            "late": "var(--sienna)",
            "off": "var(--admin-muted)",
          };
          const statusLabels: Record<string, string> = {
            "clocked-in": "Clocked In",
            "on-break": "On Break",
            "late": "Late",
            "off": "Off Duty",
          };
          const color = statusColors[s.status] || "var(--admin-muted)";
          const avatarColors: Record<string, string> = {
            cinnamon: "bg-cinnamon text-white",
            golden: "bg-golden text-espresso",
            sage: "bg-sage text-espresso",
            honey: "bg-honey text-espresso",
            rose: "bg-rose text-white",
          };
          const avatarClass = avatarColors[s.accent] || "bg-espresso text-cream";

          return (
            <div
              key={s.email}
              className="grid items-center px-4 py-3.5"
              style={{
                gridTemplateColumns: "2fr 1.5fr 1fr 1.5fr 1fr",
                borderBottom: i === staff.length - 1 ? undefined : "1px solid var(--admin-line)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full font-display text-[15px] ${avatarClass}`}>
                  {s.initial}
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-espresso">{s.name}</div>
                  <div className="font-mono text-[11px] text-[var(--admin-muted)]">{s.email}</div>
                </div>
              </div>
              <span className="font-mono text-[12px] font-bold text-espresso">{s.role}</span>
              <span className="font-editorial text-[14px] italic text-caramel">{s.branch}</span>
              <span className="font-mono text-[12px] text-espresso">{s.shift}</span>
              <span>
                <span
                  className="rounded-full px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.06em]"
                  style={{ background: `${color}18`, color }}
                >
                  ● {statusLabels[s.status]}
                </span>
              </span>
            </div>
          );
        })}
        {loading && (
          <div className="px-4 py-6 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--admin-muted)]">
            Loading staff...
          </div>
        )}
        {!loading && error && (
          <div role="alert" className="px-4 py-6 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-sienna">{error}</p>
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

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); reset(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>Create a staff account with a name, email, password, and role.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleCreateUser)} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="create-user-full-name">Full Name</Label>
              <Input id="create-user-full-name" {...register("full_name")} />
              {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name.message}</p>}
            </div>
            <div>
              <Label htmlFor="create-user-email">Email</Label>
              <Input id="create-user-email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="create-user-password">Password</Label>
              <Input id="create-user-password" type="password" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
            </div>
            <div>
              <Label htmlFor="create-user-role">Role</Label>
              <Select id="create-user-role" {...register("role")}>
                <option value="">Select role...</option>
                {STAFF_CREATION_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </Select>
              {errors.role && <p className="text-xs text-destructive mt-1">{errors.role.message}</p>}
            </div>
            {isBranchScopedRole(selectedRole) && (
              <div>
                <Label htmlFor="create-user-branch">Branch</Label>
                <Select
                  id="create-user-branch"
                  {...register("branch_id")}
                  disabled={branchesLoading || branches.length === 0}
                >
                  <option value="">
                    {branchesLoading ? "Loading branches..." : "Select branch..."}
                  </option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </Select>
                {branchError && <p className="text-xs text-destructive mt-1">{branchError}</p>}
                {errors.branch_id && <p className="text-xs text-destructive mt-1">{errors.branch_id.message}</p>}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMut.isPending}>{createMut.isPending ? "Creating..." : "Create User"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
