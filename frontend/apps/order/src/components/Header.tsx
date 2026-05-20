"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useCartStore } from "@/store/cart";
import { ShoppingCart, User, LogOut } from "lucide-react";

export function Header() {
  const { user, logout } = useAuth();
  const itemCount = useCartStore((s) => s.items.length);

  return (
    <header className="sticky top-0 z-50 bg-cream/95 backdrop-blur border-b border-crust">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-heading text-xl font-bold text-golden">Bakerio</Link>
        <div className="flex items-center gap-3">
          <Link href="/cart" aria-label="Shopping cart" className="relative p-2">
            <ShoppingCart size={20} />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-golden text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Link>
          {user ? (
            <div className="flex items-center gap-2">
              <Link href="/profile" aria-label="Profile" className="p-2"><User size={20} /></Link>
              <button onClick={logout} aria-label="Log out" className="p-2 text-espresso/50 hover:text-espresso"><LogOut size={18} /></button>
            </div>
          ) : (
            <Link href="/login" className="text-sm font-medium bg-golden text-white px-3 py-1.5 rounded-full hover:bg-golden-dark transition-colors">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
