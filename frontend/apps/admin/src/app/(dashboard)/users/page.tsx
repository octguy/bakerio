"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createUser } from "@repo/api-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { Plus, Users as UsersIcon } from "lucide-react";
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

// Note: No getUsers() endpoint available yet — show create-only UI
export default function UsersPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const createMut = useMutation({
    mutationFn: (d: FormData) => createUser({ email: d.email, full_name: d.full_name, password: d.password, role: d.role }),
    onSuccess: () => { setOpen(false); toast("User created"); reset(); },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users / Staff</h1>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add User</Button>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
        <UsersIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">User listing will be available once the backend endpoint is implemented.</p>
        <p className="text-sm text-muted-foreground mt-1">You can create new staff accounts using the button above.</p>
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
