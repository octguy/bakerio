"use client";

import { useState, useEffect, useId, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/lib/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { getMembership, getMyProfile, getOrderStats, updateMyProfile, changePassword, getAddresses, addAddress, updateAddress, removeAddress, setDefaultAddress } from "@repo/api-client";
import type { Membership, Profile, SavedAddress } from "@repo/api-client";
import { formatVND } from "@/lib/format";
import { Star, Pencil, Trash2 } from "lucide-react";

const AddressMapPicker = dynamic(
  () => import("@/components/AddressMapPicker").then((mod) => mod.AddressMapPicker),
  {
    ssr: false,
    loading: () => <div className="h-64 rounded-2xl border border-crust bg-butter" />,
  },
);

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const t = useTranslations("profile");
  const locale = useLocale();
  const { user, logout } = useAuth();
  const profileUser = user as (typeof user & { phone?: string | null; created_at?: string | null }) | null;
  const initial = (user?.full_name?.[0] ?? user?.email?.[0] ?? "T").toUpperCase();
  const [displayName, setDisplayName] = useState(user?.display_name || user?.full_name || t("friendFallback"));
  const [draftName, setDraftName] = useState(displayName);
  const [phone, setPhone] = useState("");
  const [profileAddress, setProfileAddress] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [draftPhone, setDraftPhone] = useState("");
  const [draftProfileAddress, setDraftProfileAddress] = useState("");
  const [draftBio, setDraftBio] = useState("");
  const [draftAvatarUrl, setDraftAvatarUrl] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [newAddress, setNewAddress] = useState("");
  const [newAddressLat, setNewAddressLat] = useState("");
  const [newAddressLng, setNewAddressLng] = useState("");
  const [newAddressDefault, setNewAddressDefault] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [profileError, setProfileError] = useState("");
  const memberSince = formatMemberSince(profileUser?.created_at, locale);

  const [membership, setMembership] = useState<Membership | undefined>(undefined);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [lifetimeOrders, setLifetimeOrders] = useState<number | undefined>(undefined);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const applyProfile = useCallback((profile: Profile) => {
    if (profile.display_name) setDisplayName(profile.display_name);
    setPhone(profile.phone ?? "");
    setProfileAddress(profile.address ?? "");
    setBio(profile.bio ?? "");
    setAvatarUrl(profile.avatar_url ?? "");
  }, []);

  useEffect(() => {
    let active = true;
    const loadProfileData = async () => {
      try {
        const profile = await getMyProfile();
        if (!active) return;
        applyProfile(profile);
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to load profile:", err);
        }
      }
      try {
        const m = await getMembership();
        if (active) setMembership(m);
      } catch (err) {
        if (process.env.NODE_ENV !== "production") console.error("Failed to load membership:", err);
      }
      try {
        const addrs = await getAddresses();
        if (!active) return;
        setAddresses(addrs);
        const stats = await getOrderStats();
        if (!active) return;
        setLifetimeOrders(stats.lifetime);
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to load profile data:", err);
        }
      }
    };
    loadProfileData();
    return () => {
      active = false;
    };
  }, [applyProfile]);

  const openEdit = () => {
    setProfileError("");
    setDraftName(displayName);
    setDraftPhone(phone);
    setDraftProfileAddress(profileAddress);
    setDraftBio(bio);
    setDraftAvatarUrl(avatarUrl);
    setEditOpen(true);
  };

  const saveProfile = async () => {
    const nextName = draftName.trim();
    if (!nextName) return;
    setProfileError("");
    setIsSavingProfile(true);
    try {
      const updated = await updateMyProfile({
        display_name: nextName,
        phone: draftPhone.trim(),
        address: draftProfileAddress.trim(),
        bio: draftBio.trim(),
        avatar_url: draftAvatarUrl.trim(),
      });
      applyProfile(updated);
      setEditOpen(false);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : t("failedUpdateProfile"));
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to update profile:", err);
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const saveAddress = async () => {
    const trimmed = newAddress.trim();
    const lat = Number(newAddressLat);
    const lng = Number(newAddressLng);
    if (!trimmed || !newAddressLat || !newAddressLng || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    
    setIsSavingAddress(true);
    try {
      const shouldSetDefault = newAddressDefault || (!editingAddressId && addresses.length === 0);
      if (editingAddressId) {
        const updated = await updateAddress(editingAddressId, { address: trimmed, lat, lng });
        if (shouldSetDefault) {
          setAddresses(await setDefaultAddress(updated.id));
        } else {
          setAddresses((current) => current.map((addr) => (addr.id === updated.id ? updated : addr)));
        }
      } else {
        const next = await addAddress("Address", trimmed, { lat, lng, isDefault: shouldSetDefault });
        setAddresses((current) => [...current, next]);
      }
      setNewAddress("");
      setNewAddressLat("");
      setNewAddressLng("");
      setNewAddressDefault(false);
      setEditingAddressId(null);
      setAddressOpen(false);
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to add address:", err);
      }
    } finally {
      setIsSavingAddress(false);
    }
  };

  const openAddressEditor = (address?: SavedAddress) => {
    if (address) {
      setEditingAddressId(address.id);
      setNewAddress(address.address);
      setNewAddressLat(address.lat != null ? String(address.lat) : "");
      setNewAddressLng(address.lng != null ? String(address.lng) : "");
      setNewAddressDefault(Boolean(address.is_default));
    } else {
      setEditingAddressId(null);
      setNewAddress("");
      setNewAddressLat("");
      setNewAddressLng("");
      setNewAddressDefault(addresses.length === 0);
    }
    setAddressOpen(true);
  };

  const handleRemoveAddress = async (id: string) => {
    try {
      await removeAddress(id);
      setAddresses((current) => current.filter((a) => a.id !== id));
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to remove address:", err);
      }
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    try {
      const all = await setDefaultAddress(id);
      const byId = new Map(all.map((a) => [a.id, a]));
      setAddresses((current) =>
        current.map((a) => byId.get(a.id) ?? a).concat(all.filter((a) => !current.some((c) => c.id === a.id))),
      );
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to set default address:", err);
      }
    }
  };

  const savePassword = async () => {
    setPasswordError("");
    setPasswordSuccess(false);
    
    if (!currentPassword) {
      setPasswordError(t("currentPasswordRequired"));
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError(t("newPasswordMin"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("passwordsNoMatch"));
      return;
    }
    
    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : t("failedChangePassword"));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const hasMembership = !!membership;
  const spent = membership?.total_spent ?? 0;
  const threshold = membership?.next_tier_threshold ?? 0;
  const progress = hasMembership && threshold > 0 ? Math.min(1, spent / threshold) : 0;

  return (
    <main className="mx-auto max-w-5xl px-6 pt-4 pb-32 md:pb-12">
      {/* Header (Mobile only) */}
      <div className="mb-2 flex items-center justify-between md:hidden">
        <button
          type="button"
          onClick={openEdit}
          className="font-mono text-[11px] font-bold tracking-[0.16em] text-cinnamon"
        >
          {t("edit")}
        </button>
        <div className="font-display text-[16px] leading-none">{t("title")}</div>
        <span className="w-[3.5ch]" aria-hidden="true" />
      </div>

      <div className="md:grid md:grid-cols-[320px_1fr] md:gap-8 md:items-start mt-4">
        {/* Left column: Avatar and loyalty card */}
        <div>
          {/* Avatar */}
          <div className="relative pt-6 pb-6 text-center bg-white rounded-2xl border border-crust mb-4">
            {/* Desktop-only Edit button */}
            <div className="hidden md:flex absolute top-3 right-4">
              <button
                type="button"
                onClick={openEdit}
                className="font-mono text-[10px] font-bold tracking-[0.12em] text-cinnamon hover:text-espresso transition-colors cursor-pointer"
              >
                {t("edit")}
              </button>
            </div>

            <div className="mx-auto flex h-[92px] w-[92px] items-center justify-center overflow-hidden rounded-full bg-cinnamon font-display text-[38px] text-white shadow-[0_12px_24px_-6px_rgba(196,91,74,0.4)]">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <h1 className="mt-4 font-display text-[30px] leading-none tracking-tight">{displayName}</h1>
            {(memberSince || lifetimeOrders !== undefined) && (
              <div className="mt-1 font-editorial text-[13px] italic text-cinnamon">
                {[memberSince ? t("memberSince", { date: memberSince }) : null, lifetimeOrders !== undefined ? t("ordersCount", { count: lifetimeOrders }) : null].filter(Boolean).join(" · ")}
              </div>
            )}
            {bio && (
              <p className="mx-auto mt-2 max-w-[34ch] px-4 font-editorial text-[13px] italic leading-snug text-caramel">{bio}</p>
            )}
          </div>

          {/* Loyalty card */}
          <div className="relative mb-4 overflow-hidden rounded-2xl bg-espresso p-5 text-cream">
            <div
              aria-hidden
              className="absolute -right-7 -top-7 h-[140px] w-[140px] rounded-full opacity-60"
              style={{
                background: "radial-gradient(circle, var(--cinnamon) 0%, transparent 70%)",
              }}
            />
            <div className="relative">
              <div className="mb-3.5 flex items-center gap-2">
                <span className="text-[14px] text-honey" aria-hidden="true">
                  ✦
                </span>
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-honey">{t("membership")}</span>
              </div>
              <div className="flex items-baseline gap-2.5">
                <span className="font-display text-[48px] leading-none tracking-tight">{membership?.tier ?? "—"}</span>
                <span className="font-editorial text-[14px] italic text-honey">{t("spent", { amount: formatVND(spent) })}</span>
              </div>
              <div className="mt-3.5 h-1.5 overflow-hidden rounded-sm bg-white/15">
                <div
                  className="bkr-fill h-full rounded-sm bg-honey"
                  style={
                    {
                      "--fill-scale": progress,
                      transform: `scaleX(${progress})`,
                    } as React.CSSProperties
                  }
                />
              </div>
              <div className="mt-2 flex justify-between font-mono text-[10px] tracking-[0.08em] opacity-80">
                <span>{t("tier", { tier: membership?.tier ?? "—" })}</span>
                <span>{!hasMembership ? "—" : threshold > 0 ? t("nextTier", { amount: formatVND(Math.max(0, threshold - spent)) }) : t("topTier")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Info & preferences */}
        <div className="space-y-4">
          {/* Account */}
          <Section title={t("account")}>
            {[user?.email ? { i: "✉", l: user.email, s: t("verified") } : null, phone ? { i: "☎", l: phone, s: t("onProfile") } : null]
              .filter((r): r is { i: string; l: string; s: string } => Boolean(r))
              .map((r, idx) => (
                <Row key={idx} icon={r.i} label={r.l} sub={r.s} />
              ))}
            <Row icon="🔑" label={t("password")} sub={t("changePassword")} onClick={() => setPasswordOpen(true)} last />
          </Section>

          {/* Addresses */}
          <Section title={t("addresses")} cta={t("addAddress")} onCta={() => openAddressEditor()}>
            {addresses.map((r, idx, all) => (
              <div key={r.id} className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${idx === all.length - 1 ? "" : "border-b border-crust"}`}>
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-butter text-[14px] text-cinnamon shrink-0" aria-hidden="true">
                  📍
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex min-h-[18px] items-center">
                    {r.is_default && (
                      <span className="rounded bg-golden px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-[0.18em] text-white">{t("default")}</span>
                    )}
                  </div>
                  <div className="text-[15px] font-bold text-espresso truncate">{r.address}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!r.is_default && (
                    <button
                      type="button"
                      onClick={() => handleSetDefaultAddress(r.id)}
                      aria-label={t("setDefault")}
                      title={t("setDefault")}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-golden transition-colors hover:bg-butter"
                    >
                      <Star size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openAddressEditor(r)}
                    aria-label={t("editBtn")}
                    title={t("editBtn")}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-sage transition-colors hover:bg-butter hover:text-espresso"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveAddress(r.id)}
                    aria-label={t("removeAddress")}
                    title={t("removeAddress")}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-cinnamon transition-colors hover:bg-butter hover:text-espresso"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </Section>

          {/* Preferences */}
          <Section title={t("preferences")}>
            <Row icon="🔔" label={t("pushNotifications")} sub={pushEnabled ? t("orderUpdatesOn") : t("muted")} toggle on={pushEnabled} onClick={() => setPushEnabled((value) => !value)} />
            <Row icon="🌐" label={t("language")} sub={t("vietnamese")} badge={t("soon")} />
            <Row icon="🥄" label={t("dietary")} sub={t("noPeanut")} badge={t("soon")} />
            <Row icon="🔒" label={t("privacy")} badge={t("soon")} last />
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left border-t border-crust hover:bg-butter/25 transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-butter text-[14px] text-sienna" aria-hidden="true">
                ⏻
              </div>
              <div className="text-[13.5px] font-semibold text-sienna">{t("signOut")}</div>
            </button>
          </Section>
        </div>
      </div>

      {editOpen && (
        <Modal title={t("editProfile")} onClose={() => setEditOpen(false)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="profile-name" className="block font-mono text-[9.5px] uppercase tracking-[0.18em] text-caramel">
                {t("displayName")}
              </label>
              <input
                id="profile-name"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-crust bg-white px-3.5 py-3 font-editorial text-[14px] italic text-espresso focus:border-cinnamon focus:outline-none focus:ring-2 focus:ring-cinnamon/30"
              />
            </div>
            <div>
              <label htmlFor="profile-avatar" className="block font-mono text-[9.5px] uppercase tracking-[0.18em] text-caramel">
                {t("avatarUrl")}
              </label>
              <input
                id="profile-avatar"
                type="url"
                value={draftAvatarUrl}
                onChange={(e) => setDraftAvatarUrl(e.target.value)}
                placeholder="https://…/photo.jpg"
                className="mt-1 w-full rounded-xl border border-crust bg-white px-3.5 py-3 font-editorial text-[14px] italic text-espresso focus:border-cinnamon focus:outline-none focus:ring-2 focus:ring-cinnamon/30"
              />
            </div>
            <div>
              <label htmlFor="profile-phone" className="block font-mono text-[9.5px] uppercase tracking-[0.18em] text-caramel">
                {t("phone")}
              </label>
              <input
                id="profile-phone"
                type="tel"
                value={draftPhone}
                onChange={(e) => setDraftPhone(e.target.value)}
                placeholder="+84 901 234 567"
                className="mt-1 w-full rounded-xl border border-crust bg-white px-3.5 py-3 font-editorial text-[14px] italic text-espresso focus:border-cinnamon focus:outline-none focus:ring-2 focus:ring-cinnamon/30"
              />
            </div>
            <div>
              <label htmlFor="profile-default-address" className="block font-mono text-[9.5px] uppercase tracking-[0.18em] text-caramel">
                {t("address")}
              </label>
              <input
                id="profile-default-address"
                value={draftProfileAddress}
                onChange={(e) => setDraftProfileAddress(e.target.value)}
                className="mt-1 w-full rounded-xl border border-crust bg-white px-3.5 py-3 font-editorial text-[14px] italic text-espresso focus:border-cinnamon focus:outline-none focus:ring-2 focus:ring-cinnamon/30"
              />
            </div>
            <div>
              <label htmlFor="profile-bio" className="block font-mono text-[9.5px] uppercase tracking-[0.18em] text-caramel">
                {t("bio")}
              </label>
              <textarea
                id="profile-bio"
                value={draftBio}
                onChange={(e) => setDraftBio(e.target.value)}
                rows={3}
                className="mt-1 w-full resize-none rounded-xl border border-crust bg-white px-3.5 py-3 font-editorial text-[14px] italic text-espresso focus:border-cinnamon focus:outline-none focus:ring-2 focus:ring-cinnamon/30"
              />
            </div>

            {profileError && (
              <div role="alert" className="rounded-lg bg-cinnamon/10 px-3 py-2 text-[13px] text-cinnamon">
                {profileError}
              </div>
            )}

            <button
              type="button"
              onClick={saveProfile}
              disabled={isSavingProfile || !draftName.trim()}
              className="bkr-press mt-2 inline-flex w-full items-center justify-center rounded-full bg-espresso px-5 py-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-cream disabled:opacity-50"
            >
              {isSavingProfile ? t("savingProfile") : t("saveProfile")}
            </button>
          </div>
        </Modal>
      )}

      {addressOpen && (
        <Modal
          title={editingAddressId ? t("editAddress") : t("addAddressTitle")}
          onClose={() => {
            setAddressOpen(false);
            setEditingAddressId(null);
          }}
          large
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="profile-address" className="block font-mono text-[9.5px] uppercase tracking-[0.18em] text-caramel">
                {t("deliveryAddress")}
              </label>
              <textarea
                id="profile-address"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                rows={3}
                className="mt-1 w-full resize-none rounded-xl border border-crust bg-white px-3.5 py-3 font-editorial text-[14px] italic text-espresso focus:border-cinnamon focus:outline-none focus:ring-2 focus:ring-cinnamon/30"
              />
            </div>
            <div className="space-y-2">
              <div className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-caramel">
                {t("pinLocation")}
              </div>
              <AddressMapPicker
                lat={newAddressLat ? Number(newAddressLat) : undefined}
                lng={newAddressLng ? Number(newAddressLng) : undefined}
                onChange={(lat, lng) => {
                  setNewAddressLat(lat.toFixed(6));
                  setNewAddressLng(lng.toFixed(6));
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setNewAddressDefault((value) => !value)}
              disabled={!editingAddressId && addresses.length === 0}
              className="flex w-full items-center justify-between rounded-2xl border border-crust bg-white px-4 py-3 text-left disabled:opacity-70"
            >
              <span>
                <span className="block text-[13.5px] font-semibold text-espresso">{t("useAsDefault")}</span>
                <span className="block font-editorial text-[11.5px] italic text-caramel">
                  {(!editingAddressId && addresses.length === 0)
                    ? t("firstAddressDefault")
                    : t("checkoutPreselect")}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="relative h-[24px] w-[42px] rounded-full transition-colors"
                style={{ background: newAddressDefault || (!editingAddressId && addresses.length === 0) ? "var(--sage)" : "var(--crust-deep)" }}
              >
                <span
                  className="absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all"
                  style={{ left: newAddressDefault || (!editingAddressId && addresses.length === 0) ? "21px" : "3px" }}
                />
              </span>
            </button>
            <button
              type="button"
              onClick={saveAddress}
              disabled={!newAddress.trim() || !newAddressLat || !newAddressLng || !Number.isFinite(Number(newAddressLat)) || !Number.isFinite(Number(newAddressLng)) || isSavingAddress}
              className="bkr-press mt-4 inline-flex w-full items-center justify-center rounded-full bg-espresso px-5 py-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-cream disabled:opacity-50"
            >
              {isSavingAddress ? t("savingAddress") : editingAddressId ? t("updateAddress") : t("saveAddressBtn")}
            </button>
          </div>
        </Modal>
      )}

      {passwordOpen && (
        <Modal title={t("changePasswordTitle")} onClose={() => {
          setPasswordOpen(false);
          setPasswordError("");
          setPasswordSuccess(false);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        }}>
          {passwordSuccess ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-sage text-white text-[24px]">
                ✓
              </div>
              <h3 className="font-display text-[20px] text-espresso">{t("passwordUpdated")}</h3>
              <p className="mt-2 font-editorial text-[14px] italic text-caramel">
                {t("passwordUpdatedDesc")}
              </p>
              <button
                type="button"
                onClick={() => setPasswordOpen(false)}
                className="bkr-press mt-6 inline-flex w-full items-center justify-center rounded-full bg-espresso px-5 py-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-cream"
              >
                {t("done")}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="current-password" className="block font-mono text-[9.5px] uppercase tracking-[0.18em] text-caramel">
                  {t("currentPassword")}
                </label>
                <input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-crust bg-white px-3.5 py-3 font-editorial text-[14px] italic text-espresso focus:border-cinnamon focus:outline-none focus:ring-2 focus:ring-cinnamon/30"
                />
              </div>
              <div>
                <label htmlFor="new-password" className="block font-mono text-[9.5px] uppercase tracking-[0.18em] text-caramel">
                  {t("newPassword")}
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-crust bg-white px-3.5 py-3 font-editorial text-[14px] italic text-espresso focus:border-cinnamon focus:outline-none focus:ring-2 focus:ring-cinnamon/30"
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="block font-mono text-[9.5px] uppercase tracking-[0.18em] text-caramel">
                  {t("confirmPassword")}
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-crust bg-white px-3.5 py-3 font-editorial text-[14px] italic text-espresso focus:border-cinnamon focus:outline-none focus:ring-2 focus:ring-cinnamon/30"
                />
              </div>

              {passwordError && (
                <div className="rounded-lg bg-cinnamon/10 px-3 py-2 text-[13px] text-cinnamon">
                  {passwordError}
                </div>
              )}

              <button
                type="button"
                onClick={savePassword}
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="bkr-press mt-2 inline-flex w-full items-center justify-center rounded-full bg-espresso px-5 py-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-cream disabled:opacity-50"
              >
                {isChangingPassword ? t("changingPassword") : t("changePasswordBtn")}
              </button>
            </div>
          )}
        </Modal>
      )}
    </main>
  );
}

function Section({ title, cta, onCta, children }: { title: string; cta?: string; onCta?: () => void; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between font-mono text-[9.5px] uppercase tracking-[0.22em] text-caramel">
        <span>{title}</span>
        {cta && (
          <button
            type="button"
            onClick={onCta}
            className="rounded-full bg-cinnamon px-3 py-1.5 font-bold text-cream shadow-sm transition-colors hover:bg-espresso focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cinnamon"
          >
            {cta}
          </button>
        )}
      </div>
      <div className="overflow-hidden rounded-2xl border border-crust bg-white">{children}</div>
    </div>
  );
}

function formatMemberSince(value?: string | null, locale?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale || "en", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function Row({
  icon,
  label,
  sub,
  last,
  toggle,
  on,
  badge,
  onClick,
}: {
  icon: string;
  label: React.ReactNode;
  sub?: string;
  last?: boolean;
  toggle?: boolean;
  on?: boolean;
  badge?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-butter text-[14px] text-cinnamon" aria-hidden="true">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold text-espresso">{label}</div>
        {sub && <div className="font-editorial text-[11.5px] italic text-caramel">{sub}</div>}
      </div>
      {badge ? (
        <span className="rounded bg-caramel/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-caramel">{badge}</span>
      ) : toggle ? (
        <div aria-hidden="true" className="relative h-[22px] w-[38px] rounded-full" style={{ background: on ? "var(--sage)" : "var(--crust-deep)" }}>
          <div className="absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow" style={{ left: on ? "auto" : "2px", right: on ? "2px" : "auto" }} />
        </div>
      ) : (
        <span className="text-[18px] text-caramel" aria-hidden="true">
          ›
        </span>
      )}
    </>
  );
  const className = `flex w-full items-center gap-3 px-4 py-3.5 text-left ${last ? "" : "border-b border-crust"} ${badge ? "opacity-60" : ""}`;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }
  return (
    <div className={className}>
      {content}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
  large = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  large?: boolean;
}) {
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<Element | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    previouslyFocused.current = document.activeElement;
    modalRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      if (previouslyFocused.current instanceof HTMLElement) {
        previouslyFocused.current.focus();
      }
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-espresso/35 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      ref={modalRef}
      tabIndex={-1}
    >
      <div
        className={`flex min-h-[min(24rem,calc(100vh-2rem))] w-[min(92vw,50rem)] flex-col rounded-[1.75rem] border border-crust bg-cream p-5 shadow-[0_22px_80px_rgba(44,24,16,0.24)] md:min-w-[32rem] ${
          large ? "h-[82vh] md:w-[min(72vw,56rem)]" : "h-[50vh] md:w-[50vw]"
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id={titleId} className="font-display text-[24px] leading-none tracking-tight text-espresso">{title}</h2>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-caramel" aria-label="Close">
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  );
}
