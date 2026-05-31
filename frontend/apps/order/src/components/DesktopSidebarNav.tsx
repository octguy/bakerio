"use client";

import { Link } from "next-view-transitions";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { LogOut } from "lucide-react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/orders", label: "Orders" },
  { href: "/profile", label: "Profile" },
];

export function DesktopSidebarNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const userInitial = user
    ? (user.full_name?.trim() || user.email?.trim() || "B")
        .charAt(0)
        .toUpperCase()
    : "";

  return (
    <nav className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-56 lg:flex-col lg:border-r lg:border-crust lg:bg-cream">
      {/* Brand Logo */}
      <div className="px-6 pt-8 pb-6">
        <Link href="/" className="flex items-baseline gap-2 text-espresso">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M12 22V8"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <path
              d="M12 8c-2-1.5-3.5-3.2-3.5-5C8.5 1.5 10 1 12 1s3.5.5 3.5 2c0 1.8-1.5 3.5-3.5 5z"
              stroke="currentColor"
              strokeWidth="1.3"
            />
            <path
              d="M12 12c-2.5-.5-4.5-1.7-4.5-3.5 0-1 .5-1.7 1.5-2 1.5 1 2.5 2.7 3 5.5z"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d="M12 12c2.5-.5-4.5-1.7 4.5-3.5 0-1-.5-1.7-1.5-2-1.5 1-2.5 2.7-3 5.5z"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
          <span className="font-display text-[20px] leading-none tracking-tight">
            Bakerio
          </span>
        </Link>
      </div>

      {/* Navigation items */}
      <div className="flex flex-1 flex-col gap-1.5 px-4 py-4">
        {navItems.map(({ href, label }) => {
          const active =
            pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="rounded-lg px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] transition-all hover:bg-crust/30"
              style={{
                color: active ? "var(--cinnamon)" : "var(--caramel)",
                fontWeight: active ? 700 : 500,
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* Auth state at the bottom */}
      <div className="p-4 border-t border-crust">
        {user ? (
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/profile"
              className="flex items-center gap-3 group min-w-0 flex-1"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cinnamon font-display text-[13px] text-white">
                {userInitial}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[11px] font-bold text-espresso group-hover:text-cinnamon transition-colors leading-tight">
                  {user.full_name || user.email}
                </p>
                <p className="font-editorial text-[10px] text-caramel italic">
                  My account
                </p>
              </div>
            </Link>
            <button
              onClick={logout}
              aria-label="Log out"
              className="p-2 text-caramel hover:text-espresso transition-colors shrink-0"
            >
              <LogOut size={16} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex w-full items-center justify-center rounded-full bg-espresso py-2.5 px-4 text-center font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-cream transition-colors hover:bg-cinnamon"
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
