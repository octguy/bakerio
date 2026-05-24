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
  const initial = (user?.full_name?.[0] ?? user?.email?.[0] ?? "T").toUpperCase();
  const name = user?.display_name || user?.full_name || "Friend";

  const [loyalty, setLoyalty] = useState<LoyaltyBalance | undefined>(undefined);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [lifetimeOrders, setLifetimeOrders] = useState<number>(47);

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const loy = await getLoyalty();
        setLoyalty(loy);
        const addrs = await getAddresses();
        setAddresses(addrs);
        const stats = await getOrderStats();
        setLifetimeOrders(stats.lifetime);
      } catch (err) {
        console.error("Failed to load profile data:", err);
      }
    };
    loadProfileData();
  }, []);

  return (
    <main className="mx-auto max-w-md px-6 pt-4 pb-32">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[11px] font-bold tracking-[0.16em] text-cinnamon">EDIT</span>
        <div className="font-display text-[16px] leading-none">Profile</div>
        <span className="text-[16px] text-caramel">⚙</span>
      </div>

      {/* Avatar */}
      <div className="pt-6 pb-6 text-center">
        <div className="mx-auto flex h-[92px] w-[92px] items-center justify-center rounded-full bg-cinnamon font-display text-[38px] text-white shadow-[0_12px_24px_-6px_rgba(196,91,74,0.4)]">
          {initial}
        </div>
        <h1 className="mt-4 font-display text-[30px] leading-none tracking-tight">{name}</h1>
        <div className="mt-1 font-editorial text-[13px] italic text-cinnamon">
          member since May 2024 · {lifetimeOrders} orders
        </div>
      </div>

      {/* Loyalty card */}
      <div className="relative mb-4 overflow-hidden rounded-2xl bg-espresso p-5 text-cream">
        <div
          aria-hidden
          className="absolute -right-7 -top-7 h-[140px] w-[140px] rounded-full opacity-60"
          style={{ background: "radial-gradient(circle, var(--cinnamon) 0%, transparent 70%)" }}
        />
        <div className="relative">
          <div className="mb-3.5 flex items-center gap-2">
            <span className="text-[14px] text-honey">✦</span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-honey">
              Bakerio crumbs
            </span>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="font-display text-[48px] leading-none tracking-tight">
              {loyalty?.balance.toLocaleString() ?? "0"}
            </span>
            <span className="font-editorial text-[14px] italic text-honey">
              = {formatVND(loyalty?.asMoney ?? 0).replace("₫", "")}₫ off
            </span>
          </div>
          <div className="mt-3.5 h-1.5 overflow-hidden rounded-sm bg-white/15">
            <div
              className="bkr-fill h-full rounded-sm bg-honey"
              style={{
                ["--pct" as any]: `${(loyalty?.progress ?? 0) * 100}%`,
                width: `${(loyalty?.progress ?? 0) * 100}%`,
              }}
            />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[10px] tracking-[0.08em] opacity-80">
            <span>{loyalty?.tier ?? "Croissant"} tier</span>
            <span>
              {loyalty?.nextTier
                ? `${loyalty.toNextTier.toLocaleString()} → ${loyalty.nextTier} tier`
                : "Max tier reached"}
            </span>
          </div>
        </div>
      </div>

      {/* Account */}
      <Section title="Account">
        {[
          { i: "✉", l: user?.email ?? "—", s: "verified" },
          { i: "☎", l: "+84 901 234 567", s: "verified" },
          { i: "🔑", l: "Password", s: "updated 18 days ago" },
        ].map((r, idx, a) => (
          <Row key={idx} icon={r.i} label={r.l} sub={r.s} last={idx === a.length - 1} />
        ))}
      </Section>

      {/* Addresses */}
      <Section title="Addresses" cta="+ Add">
        {addresses.map((r, idx, all) => (
          <Row
            key={r.id}
            icon="📍"
            label={
              <span className="flex items-center gap-2">
                <span>{r.label}</span>
                {r.is_default && (
                  <span className="rounded bg-golden px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-[0.18em] text-white">
                    Default
                  </span>
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
        <Row icon="🔔" label="Push notifications" sub="order updates · promos" badge="soon" />
        <Row icon="🌐" label="Language" sub="Tiếng Việt" badge="soon" />
        <Row icon="🥄" label="Dietary" sub="no peanut" badge="soon" />
        <Row icon="🔒" label="Privacy & data" badge="soon" last />
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left border-t border-crust hover:bg-butter/25 transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-butter text-[14px] text-sienna">
            ⏻
          </div>
          <div className="text-[13.5px] font-semibold text-sienna">Sign out</div>
        </button>
      </Section>
    </main>
  );
}

function Section({ title, cta, children }: { title: string; cta?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between font-mono text-[9.5px] uppercase tracking-[0.22em] text-caramel">
        <span>{title}</span>
        {cta && <span className="font-bold text-cinnamon cursor-pointer">{cta}</span>}
      </div>
      <div className="overflow-hidden rounded-2xl border border-crust bg-white">{children}</div>
    </div>
  );
}

function Row({
  icon,
  label,
  sub,
  last,
  toggle,
  on,
  badge,
}: {
  icon: string;
  label: React.ReactNode;
  sub?: string;
  last?: boolean;
  toggle?: boolean;
  on?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 ${last ? "" : "border-b border-crust"} ${
        badge ? "opacity-60" : ""
      }`}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-butter text-[14px] text-cinnamon">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold text-espresso">{label}</div>
        {sub && <div className="font-editorial text-[11.5px] italic text-caramel">{sub}</div>}
      </div>
      {badge ? (
        <span className="rounded bg-caramel/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-caramel">
          {badge}
        </span>
      ) : toggle ? (
        <div
          className="relative h-[22px] w-[38px] rounded-full"
          style={{ background: on ? "var(--sage)" : "var(--crust-deep)" }}
        >
          <div
            className="absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow"
            style={{ left: on ? "auto" : "2px", right: on ? "2px" : "auto" }}
          />
        </div>
      ) : (
        <span className="text-[18px] text-caramel">›</span>
      )}
    </div>
  );
}
