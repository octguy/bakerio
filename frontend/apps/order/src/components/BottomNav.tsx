"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, UtensilsCrossed, ClipboardList, ShoppingCart, User } from "lucide-react";
import { useCartStore } from "@/store/cart";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/menu", icon: UtensilsCrossed, label: "Menu" },
  { href: "/orders", icon: ClipboardList, label: "Orders" },
  { href: "/cart", icon: ShoppingCart, label: "Cart" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const pathname = usePathname();
  const itemCount = useCartStore((s) => s.items.length);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-crust md:hidden">
      <div className="flex items-center justify-around h-14">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} aria-label={label} className={`flex flex-col items-center gap-0.5 relative ${active ? "text-golden" : "text-espresso/50"}`}>
              <Icon size={20} />
              {label === "Cart" && itemCount > 0 && (
                <span className="absolute -top-1 right-0 bg-golden text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
