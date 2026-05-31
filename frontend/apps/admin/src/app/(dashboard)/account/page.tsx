"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { changePassword, getMyProfile, updateMyProfile, type Profile } from "@repo/api-client";
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

const profileSchema = z.object({
  display_name: z.string().min(1, "Display name required").max(120, "Too long"),
  phone: z.string().max(40, "Too long"),
  address: z.string().max(255, "Too long"),
  bio: z.string().max(500, "Too long"),
  avatar_url: z.string().url("Must be a valid URL").or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function AccountPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  const profileQuery = useQuery({
    queryKey: ["my-profile"],
    queryFn: getMyProfile,
  });

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { display_name: "", phone: "", address: "", bio: "", avatar_url: "" },
  });

  // Hydrate the form once the profile loads (or refetches).
  useEffect(() => {
    const p = profileQuery.data;
    if (!p) return;
    resetProfile({
      display_name: p.display_name ?? "",
      phone: p.phone ?? "",
      address: p.address ?? "",
      bio: p.bio ?? "",
      avatar_url: p.avatar_url ?? "",
    });
  }, [profileQuery.data, resetProfile]);

  const profileMut = useMutation({
    mutationFn: (data: ProfileFormData) => updateMyProfile(data),
    onSuccess: (updated: Profile) => {
      queryClient.setQueryData(["my-profile"], updated);
      toast("Profile updated");
    },
    onError: (e: Error) => toast(e.message, "error"),
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
              Account settings
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
            Account <span className="font-editorial text-cinnamon">· Profile &amp; Security</span>
          </h1>
        </div>
      </div>

      {/* Profile details — GET/PATCH /profile */}
      <div className="max-w-xl rounded-lg border border-[var(--admin-line)] bg-white p-5">
        <h2 className="mb-1 font-display text-[18px] tracking-tight">Profile</h2>
        <p className="mb-4 font-mono text-[11px] text-[var(--admin-muted)]">
          Shown across the back office. Your roles and branch are managed by an administrator.
        </p>
        {(profileQuery.data?.roles?.length || profileQuery.data?.branch) && (
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {profileQuery.data?.roles?.map((role) => (
              <span
                key={role}
                className="rounded-full border border-[var(--admin-line)] bg-vanilla px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-cinnamon"
              >
                {role.replace(/_/g, " ")}
              </span>
            ))}
            {profileQuery.data?.branch && (
              <span className="rounded-full bg-espresso px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-cream">
                {profileQuery.data.branch.name}
              </span>
            )}
          </div>
        )}
        {profileQuery.isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-[var(--admin-muted)]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-crust border-t-cinnamon" />
            Loading profile…
          </div>
        ) : profileQuery.isError ? (
          <div className="space-y-3 py-2">
            <p className="text-sm text-destructive">Couldn&apos;t load your profile.</p>
            <Button type="button" variant="outline" onClick={() => profileQuery.refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleProfileSubmit((data) => profileMut.mutate(data))}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="display-name">Display Name</Label>
              <Input id="display-name" autoComplete="name" {...registerProfile("display_name")} />
              {profileErrors.display_name && (
                <p className="text-xs text-destructive mt-1">{profileErrors.display_name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="avatar-url">Avatar URL</Label>
              <Input id="avatar-url" type="url" placeholder="https://…/photo.jpg" {...registerProfile("avatar_url")} />
              {profileErrors.avatar_url && (
                <p className="text-xs text-destructive mt-1">{profileErrors.avatar_url.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" autoComplete="tel" placeholder="+84 901 234 567" {...registerProfile("phone")} />
              {profileErrors.phone && (
                <p className="text-xs text-destructive mt-1">{profileErrors.phone.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input id="address" autoComplete="street-address" {...registerProfile("address")} />
              {profileErrors.address && (
                <p className="text-xs text-destructive mt-1">{profileErrors.address.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                {...registerProfile("bio")}
              />
              {profileErrors.bio && (
                <p className="text-xs text-destructive mt-1">{profileErrors.bio.message}</p>
              )}
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={profileMut.isPending}
                className="bg-[var(--espresso-deep)] font-bold text-white shadow-[0_10px_22px_rgba(31,16,10,0.22)] ring-1 ring-black/10 hover:bg-[var(--cocoa)]"
              >
                {profileMut.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        )}
      </div>

      <div className="max-w-xl rounded-lg border border-[var(--admin-line)] bg-white p-5">
        <h2 className="mb-4 font-display text-[18px] tracking-tight">Security</h2>
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
