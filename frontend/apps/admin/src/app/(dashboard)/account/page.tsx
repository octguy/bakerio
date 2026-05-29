"use client";

import { useMutation } from "@tanstack/react-query";
import { changePassword } from "@repo/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z
  .object({
    current_password: z.string().min(1, "Current password required"),
    new_password: z.string().min(6, "Min 6 characters"),
    confirm_password: z.string().min(1, "Confirm password required"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords must match",
    path: ["confirm_password"],
  });

type FormData = z.infer<typeof schema>;

export default function AccountPage() {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  });

  const passwordMut = useMutation({
    mutationFn: (data: FormData) =>
      changePassword(data.current_password, data.new_password),
    onSuccess: () => {
      reset();
      toast("Password changed");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-3">
            <span className="block h-px w-6 bg-golden" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cinnamon">
              Security settings
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
            Account <span className="font-editorial text-cinnamon">· Security</span>
          </h1>
        </div>
      </div>

      <div className="max-w-xl rounded-lg border border-[var(--admin-line)] bg-white p-5">
        <form
          onSubmit={handleSubmit((data) => passwordMut.mutate(data))}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              {...register("current_password")}
            />
            {errors.current_password && (
              <p className="text-xs text-destructive mt-1">
                {errors.current_password.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              {...register("new_password")}
            />
            {errors.new_password && (
              <p className="text-xs text-destructive mt-1">
                {errors.new_password.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              {...register("confirm_password")}
            />
            {errors.confirm_password && (
              <p className="text-xs text-destructive mt-1">
                {errors.confirm_password.message}
              </p>
            )}
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={passwordMut.isPending}
              className="bg-[var(--espresso-deep)] font-bold text-white shadow-[0_10px_22px_rgba(31,16,10,0.22)] ring-1 ring-black/10 hover:bg-[var(--cocoa)]"
            >
              {passwordMut.isPending ? "Changing..." : "Change Password"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
