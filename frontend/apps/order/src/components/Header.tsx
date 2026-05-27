"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useCartStore } from "@/store/cart";
import { ShoppingBag, LogOut } from "lucide-react";

export function Header() {
  const { user, logout } = useAuth();
  const itemCount = useCartStore((s) => s.items.length);
  const userInitial = user ? (user.full_name?.trim() || user.email?.trim() || "B").charAt(0).toUpperCase() : "";

  return (
    <header className="sticky top-0 z-50 border-b border-crust bg-cream/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
        <Link href="/" className="flex items-baseline gap-2 text-espresso">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 22V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M12 8c-2-1.5-3.5-3.2-3.5-5C8.5 1.5 10 1 12 1s3.5.5 3.5 2c0 1.8-1.5 3.5-3.5 5z" stroke="currentColor" strokeWidth="1.3" />
            <path d="M12 12c-2.5-.5-4.5-1.7-4.5-3.5 0-1 .5-1.7 1.5-2 1.5 1 2.5 2.7 3 5.5z" stroke="currentColor" strokeWidth="1.2" />
            <path d="M12 12c2.5-.5 4.5-1.7 4.5-3.5 0-1-.5-1.7-1.5-2-1.5 1-2.5 2.7-3 5.5z" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <span className="font-display text-[18px] leading-none tracking-tight">Bakerio</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/cart"
            aria-label="Shopping cart"
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-crust bg-white text-espresso"
          >
            <ShoppingBag size={16} aria-hidden="true" />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-cinnamon font-mono text-[9.5px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>
          {user ? (
            <div className="flex items-center gap-1">
              <Link
                href="/profile"
                aria-label="Profile"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-cinnamon font-display text-[13px] text-white"
              >
                {userInitial}
              </Link>
              <button onClick={logout} aria-label="Log out" className="p-2 text-caramel transition-colors hover:text-espresso">
                <LogOut size={16} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <Link href="/login" className="rounded-full bg-espresso px-3.5 py-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-cream">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
