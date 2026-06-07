"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

interface NavItem {
  href: string;
  labelKey: string;
  glyph: string;
  badge?: string;
}

interface NavGroup {
  headKey: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    headKey: "groupToday",
    items: [
      { href: "/", labelKey: "counter", glyph: "◆" },
      { href: "/orders", labelKey: "orders", glyph: "○" },
    ],
  },
  {
    headKey: "groupCatalog",
    items: [
      { href: "/products", labelKey: "products", glyph: "⬡" },
      { href: "/branch-products", labelKey: "branchProducts", glyph: "▦" },
      { href: "/categories", labelKey: "categories", glyph: "⬢" },
      { href: "/vouchers", labelKey: "vouchers", glyph: "⬔" },
    ],
  },
  {
    headKey: "groupOperations",
    items: [
      { href: "/branches", labelKey: "branches", glyph: "◉" },
      { href: "/staff", labelKey: "staff", glyph: "◐" },
      { href: "/all-users", labelKey: "allUsers", glyph: "◒" },
      { href: "/roles", labelKey: "roles", glyph: "◎" },
      { href: "/account", labelKey: "account", glyph: "◈" },
    ],
  },
  {
    headKey: "groupAdmin",
    items: [
      { href: "/admin/seed-demo", labelKey: "seedDemo", glyph: "✦" },
    ],
  },
];

function getAuthorizedGroups(roles: string[]): NavGroup[] {
  const isSuperAdmin = roles.includes("super_admin");
  const isBranchManager = roles.includes("branch_manager");
  const isProductManager = roles.includes("product_manager");

  return GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((it) => {
      if (it.href === "/all-users") return isSuperAdmin;
      if (it.href === "/roles") return isSuperAdmin;
      if (it.href === "/staff") return isSuperAdmin || isBranchManager;
      if (it.href === "/branches") return isSuperAdmin;
      if (it.href === "/branch-products") return isBranchManager;
      if (it.href === "/categories") return isSuperAdmin || isProductManager;
      if (it.href === "/vouchers") return isSuperAdmin || isProductManager;
      if (it.href === "/products") return isSuperAdmin || isProductManager;
      if (it.href === "/orders") return isSuperAdmin || isBranchManager || roles.includes("branch_staff");
      if (it.href === "/") return isSuperAdmin || isBranchManager;
      if (it.href === "/admin/seed-demo") return isSuperAdmin;
      return true; // /account
    }),
  })).filter((g) => g.items.length > 0);
}

function SidebarContent() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const t = useTranslations("sidebar");
  const roleSubtitle = user?.roles?.length
    ? user.roles.map((role) => role.replace(/_/g, " ")).join(", ")
    : null;

  const authorizedGroups = getAuthorizedGroups(user?.roles ?? []);

  return (
    <>
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-6">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 22V8"
            stroke="var(--honey)"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path
            d="M12 8c-2-1.5-3.5-3.2-3.5-5C8.5 1.5 10 1 12 1s3.5.5 3.5 2c0 1.8-1.5 3.5-3.5 5z"
            stroke="var(--honey)"
            strokeWidth="1.3"
          />
          <path
            d="M12 12c-2.5-.5-4.5-1.7-4.5-3.5 0-1 .5-1.7 1.5-2 1.5 1 2.5 2.7 3 5.5z"
            stroke="var(--honey)"
            strokeWidth="1.2"
          />
          <path
            d="M12 12c2.5-.5 4.5-1.7 4.5-3.5 0-1-.5-1.7-1.5-2-1.5 1-2.5 2.7-3 5.5z"
            stroke="var(--honey)"
            strokeWidth="1.2"
          />
        </svg>
        <span className="font-display text-[18px] text-[var(--console-ink-text)]">
          Bakerio
        </span>
        <span className="ml-auto rounded border border-honey/30 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-honey">
          Ops
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {authorizedGroups.map((g) => (
          <div key={g.headKey} className="px-3 pb-3.5">
            <div className="px-2 pt-0.5 pb-2 font-mono text-[9.5px] uppercase tracking-[0.22em] text-[var(--console-muted-dark)]">
              {t(g.headKey)}
            </div>
            {g.items.map((it) => {
              const active =
                it.href === "/"
                  ? pathname === "/"
                  : pathname === it.href || pathname.startsWith(`${it.href}/`);
              const itemClassName = cn(
                "relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[12.5px] transition-colors",
                active
                  ? "bg-[var(--console-ink-text)]/10 font-semibold text-honey"
                  : "font-medium text-[var(--console-ink-text)] hover:bg-[var(--console-ink-text)]/5",
              );
              const content = (
                <>
                  <span
                    className={cn(
                      "w-3.5 font-mono text-[11px]",
                      active ? "text-honey" : "text-[var(--console-muted-dark)]",
                    )}
                    aria-hidden="true"
                  >
                    {it.glyph}
                  </span>
                  <span className="flex-1">{t(it.labelKey)}</span>
                  {it.badge && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 font-mono text-[9.5px]",
                        active
                          ? "bg-golden text-espresso"
                          : "bg-white/8 text-[var(--console-ink-text)]",
                      )}
                    >
                      {it.badge}
                    </span>
                  )}
                  {active && (
                    <span
                      className="absolute -left-3 top-1.5 bottom-1.5 w-0.5 rounded bg-honey"
                      aria-hidden
                    />
                  )}
                </>
              );
              return (
                <Link key={it.href} href={it.href} className={itemClassName}>
                  {content}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="m-3 flex items-center gap-2.5 rounded-lg bg-[var(--console-ink-text)]/10 px-3 py-2.5">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-cinnamon font-display text-[13px] text-white">
          {(user?.email?.[0] ?? "T").toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11.5px] font-semibold text-[var(--console-ink-text)]">
            {user?.full_name || user?.email || "Operator"}
          </div>
          {roleSubtitle && (
            <div className="font-mono text-[10px] tracking-[0.08em] text-[var(--console-muted-dark)]">
              {roleSubtitle}
            </div>
          )}
        </div>
        <button
          onClick={logout}
          aria-label="Sign out"
          className="text-[11px] text-[var(--console-muted-dark)]"
        >
          <LogOut aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-40 rounded-md border border-border bg-white p-2 shadow-sm md:hidden"
        aria-label="Open menu"
      >
        <Menu aria-hidden="true" className="h-5 w-5" />
      </button>

      <aside className="hidden h-full w-[232px] flex-col bg-[var(--console-ink)] text-[var(--console-ink-text)] md:flex">
        <SidebarContent />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 flex w-[232px] flex-col bg-[var(--console-ink)] text-[var(--console-ink-text)] shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 rounded-md p-1 hover:bg-white/10"
              aria-label="Close menu"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
