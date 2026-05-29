"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { getLoyalty } from "@repo/api-client/mock/loyalty";
import type { LoyaltyBalance } from "@repo/api-client/mock/loyalty";
import { getAddresses } from "@repo/api-client/mock/addresses";
import type { SavedAddress } from "@repo/api-client/mock/addresses";
import { getOrderStats } from "@repo/api-client";
import { formatVND } from "@/lib/format";

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const { user, logout } = useAuth();
  const profileUser = user as (typeof user & { phone?: string | null; created_at?: string | null }) | null;
  const initial = (user?.full_name?.[0] ?? user?.email?.[0] ?? "T").toUpperCase();
  const [displayName, setDisplayName] = useState(user?.display_name || user?.full_name || "Friend");
  const [draftName, setDraftName] = useState(displayName);
  const [editOpen, setEditOpen] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [newAddress, setNewAddress] = useState("");
  const phone = profileUser?.phone?.trim();
  const memberSince = formatMemberSince(profileUser?.created_at);

  const [loyalty, setLoyalty] = useState<LoyaltyBalance | undefined>(undefined);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [lifetimeOrders, setLifetimeOrders] = useState<number | undefined>(undefined);

  useEffect(() => {
    let active = true;
    const loadProfileData = async () => {
      try {
        const loy = await getLoyalty();
        if (!active) return;
        setLoyalty(loy);
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
  }, []);

  const saveProfile = () => {
    const nextName = draftName.trim();
    if (nextName) setDisplayName(nextName);
    setEditOpen(false);
  };

  const saveAddress = () => {
    const trimmed = newAddress.trim();
    if (!trimmed) return;
    setAddresses((current) => [
      ...current,
      {
        id: `addr-${Date.now()}`,
        label: "New address",
        address: trimmed,
        is_default: current.length === 0,
      },
    ]);
    setNewAddress("");
    setAddressOpen(false);
  };

  return (
    <main className="mx-auto max-w-5xl px-6 pt-4 pb-32 md:pb-12">
      {/* Header (Mobile only) */}
      <div className="mb-2 flex items-center justify-between md:hidden">
        <button
          type="button"
          onClick={() => {
            setDraftName(displayName);
            setEditOpen(true);
          }}
          className="font-mono text-[11px] font-bold tracking-[0.16em] text-cinnamon"
        >
          EDIT
        </button>
        <div className="font-display text-[16px] leading-none">Profile</div>
        <button type="button" onClick={() => setSettingsOpen(true)} className="text-[16px] text-caramel" aria-label="Profile settings">
          ⚙
        </button>
      </div>

      <div className="md:grid md:grid-cols-[320px_1fr] md:gap-8 md:items-start mt-4">
        {/* Left column: Avatar and loyalty card */}
        <div>
          {/* Avatar */}
          <div className="relative pt-6 pb-6 text-center bg-white rounded-2xl border border-crust mb-4">
            {/* Desktop-only Edit & Settings buttons */}
            <div className="hidden md:flex absolute top-3 right-4 gap-3">
              <button
                type="button"
                onClick={() => {
                  setDraftName(displayName);
                  setEditOpen(true);
                }}
                className="font-mono text-[10px] font-bold tracking-[0.12em] text-cinnamon hover:text-espresso transition-colors cursor-pointer"
              >
                EDIT
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="text-[14px] text-caramel hover:text-espresso transition-colors cursor-pointer"
                aria-label="Profile settings"
              >
                ⚙
              </button>
            </div>

            <div className="mx-auto flex h-[92px] w-[92px] items-center justify-center rounded-full bg-cinnamon font-display text-[38px] text-white shadow-[0_12px_24px_-6px_rgba(196,91,74,0.4)]">
              {initial}
            </div>
            <h1 className="mt-4 font-display text-[30px] leading-none tracking-tight">{displayName}</h1>
            {(memberSince || lifetimeOrders !== undefined) && (
              <div className="mt-1 font-editorial text-[13px] italic text-cinnamon">
                {[memberSince ? `member since ${memberSince}` : null, lifetimeOrders !== undefined ? `${lifetimeOrders} orders` : null].filter(Boolean).join(" · ")}
              </div>
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
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-honey">Bakerio crumbs</span>
              </div>
              <div className="flex items-baseline gap-2.5">
                <span className="font-display text-[48px] leading-none tracking-tight">{loyalty?.balance.toLocaleString() ?? "0"}</span>
                <span className="font-editorial text-[14px] italic text-honey">= {formatVND(loyalty?.asMoney ?? 0)} off</span>
              </div>
              <div className="mt-3.5 h-1.5 overflow-hidden rounded-sm bg-white/15">
                <div
                  className="bkr-fill h-full rounded-sm bg-honey"
                  style={
                    {
                      "--fill-scale": loyalty?.progress ?? 0,
                      transform: `scaleX(${loyalty?.progress ?? 0})`,
                    } as React.CSSProperties
                  }
                />
              </div>
              <div className="mt-2 flex justify-between font-mono text-[10px] tracking-[0.08em] opacity-80">
                <span>{loyalty?.tier ?? "Croissant"} tier</span>
                <span>{loyalty?.nextTier ? `${loyalty.toNextTier.toLocaleString()} → ${loyalty.nextTier} tier` : "Max tier reached"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Info & preferences */}
        <div className="space-y-4">
          {/* Account */}
          <Section title="Account">
            {[user?.email ? { i: "✉", l: user.email, s: "verified" } : null, phone ? { i: "☎", l: phone, s: "on profile" } : null]
              .filter((r): r is { i: string; l: string; s: string } => Boolean(r))
              .map((r, idx, a) => (
                <Row key={idx} icon={r.i} label={r.l} sub={r.s} last={idx === a.length - 1} />
              ))}
          </Section>

          {/* Addresses */}
          <Section title="Addresses" cta="+ Add" onCta={() => setAddressOpen(true)}>
            {addresses.map((r, idx, all) => (
              <Row
                key={r.id}
                icon="📍"
                label={
                  <span className="flex items-center gap-2">
                    <span>{r.label}</span>
                    {r.is_default && (
                      <span className="rounded bg-golden px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-[0.18em] text-white">Default</span>
                    )}
                  </span>
                }
                sub={r.address}
                last={idx === all.length - 1}
              />
            ))}
          </Section>

          {/* Preferences */}
          <Section title="Preferences">
            <Row icon="🔔" label="Push notifications" sub={pushEnabled ? "order updates on" : "muted"} toggle on={pushEnabled} onClick={() => setPushEnabled((value) => !value)} />
            <Row icon="🌐" label="Language" sub="Tiếng Việt" badge="soon" />
            <Row icon="🥄" label="Dietary" sub="no peanut" badge="soon" />
            <Row icon="🔒" label="Privacy & data" badge="soon" last />
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left border-t border-crust hover:bg-butter/25 transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-butter text-[14px] text-sienna" aria-hidden="true">
                ⏻
              </div>
              <div className="text-[13.5px] font-semibold text-sienna">Sign out</div>
            </button>
          </Section>
        </div>
      </div>

      {editOpen && (
        <Modal title="Edit profile" onClose={() => setEditOpen(false)}>
          <label htmlFor="profile-name" className="block font-mono text-[9.5px] uppercase tracking-[0.18em] text-caramel">
            Display name
          </label>
          <input
            id="profile-name"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-crust bg-white px-3.5 py-3 font-editorial text-[14px] italic text-espresso focus:border-cinnamon focus:outline-none focus:ring-2 focus:ring-cinnamon/30"
          />
          <button
            type="button"
            onClick={saveProfile}
            className="bkr-press mt-4 inline-flex w-full items-center justify-center rounded-full bg-espresso px-5 py-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-cream"
          >
            Save profile
          </button>
        </Modal>
      )}

      {addressOpen && (
        <Modal title="Add address" onClose={() => setAddressOpen(false)}>
          <label htmlFor="profile-address" className="block font-mono text-[9.5px] uppercase tracking-[0.18em] text-caramel">
            Delivery address
          </label>
          <textarea
            id="profile-address"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            rows={3}
            className="mt-1 w-full resize-none rounded-xl border border-crust bg-white px-3.5 py-3 font-editorial text-[14px] italic text-espresso focus:border-cinnamon focus:outline-none focus:ring-2 focus:ring-cinnamon/30"
          />
          <button
            type="button"
            onClick={saveAddress}
            disabled={!newAddress.trim()}
            className="bkr-press mt-4 inline-flex w-full items-center justify-center rounded-full bg-espresso px-5 py-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-cream disabled:opacity-50"
          >
            Save address
          </button>
        </Modal>
      )}

      {settingsOpen && (
        <Modal title="Profile settings" onClose={() => setSettingsOpen(false)}>
          <button
            type="button"
            onClick={() => setPushEnabled((value) => !value)}
            className="flex w-full items-center justify-between rounded-xl border border-crust bg-white px-4 py-3 text-left"
          >
            <span>
              <span className="block text-[13.5px] font-semibold text-espresso">Push notifications</span>
              <span className="font-editorial text-[11.5px] italic text-caramel">{pushEnabled ? "Enabled" : "Muted"}</span>
            </span>
            <span className="font-mono text-[11px] text-cinnamon">{pushEnabled ? "ON" : "OFF"}</span>
          </button>
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
          <button type="button" onClick={onCta} className="font-bold text-cinnamon opacity-80">
            {cta}
          </button>
        )}
      </div>
      <div className="overflow-hidden rounded-2xl border border-crust bg-white">{children}</div>
    </div>
  );
}

function formatMemberSince(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en", {
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

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-espresso/30 px-4 pb-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full rounded-2xl border border-crust bg-cream p-5 shadow-[0_22px_80px_rgba(44,24,16,0.24)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[24px] leading-none tracking-tight text-espresso">{title}</h2>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-caramel" aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
