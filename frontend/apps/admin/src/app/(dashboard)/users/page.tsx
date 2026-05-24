"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { createUser } from "@repo/api-client";
import { getStaff, getStaffCounts } from "@repo/api-client/mock/staff";
import type { StaffMember } from "@repo/api-client/mock/staff";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  email: z.string().email("Valid email required"),
  full_name: z.string().min(1, "Name required"),
  password: z.string().min(6, "Min 6 characters"),
  role: z.string().min(1, "Role required"),
});
type FormData = z.infer<typeof schema>;

export default function UsersPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [counts, setCounts] = useState<{ total: number; onShift: number }>();

  const fetchStaffData = async () => {
    try {
      const staffList = await getStaff();
      const countsData = await getStaffCounts();
      setStaff(staffList);
      setCounts(countsData);
    } catch (err) {
      console.error("Failed to fetch staff:", err);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, []);

  const createMut = useMutation({
    mutationFn: (d: FormData) => createUser({ email: d.email, full_name: d.full_name, password: d.password, role: d.role }),
    onSuccess: () => {
      setOpen(false);
      toast("User created");
      reset();
      fetchStaffData();
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-3">
            <span className="block h-px w-6 bg-golden" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cinnamon">
              {counts?.total ?? 46} on the payroll · {counts?.onShift ?? 28} on shift now
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
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); reset(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create User</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => createMut.mutate(d))} className="space-y-4 mt-4">
            <div><Label>Full Name</Label><Input {...register("full_name")} />{errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name.message}</p>}</div>
            <div><Label>Email</Label><Input type="email" {...register("email")} />{errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}</div>
            <div><Label>Password</Label><Input type="password" {...register("password")} />{errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}</div>
            <div><Label>Role</Label><Select {...register("role")}><option value="">Select role...</option><option value="admin">Admin</option><option value="manager">Manager</option><option value="staff">Staff</option><option value="member">Member</option></Select>{errors.role && <p className="text-xs text-destructive mt-1">{errors.role.message}</p>}</div>
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
