"use client";

import { useCartStore } from "@/store/cart";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import SidebarCart from "@/app/menu/_components/sidebar-cart";
import { ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setHydrated(true), []);
  const isCartOpen = useCartStore((s) => s.isCartOpen);
  const setCartOpen = useCartStore((s) => s.setCartOpen);
  const itemCount = useCartStore((s) =>
    s.items.reduce((sum, item) => sum + item.quantity, 0),
  );

  return (
    <div className="min-h-screen flex flex-col lg:pl-56">
      {/* Top Header for Mobile and Tablet */}
      <div className="lg:hidden">
        <Header />
      </div>

      {/* Main Layout Area */}
      <div className="flex-1 flex min-h-0">
        {/* Content Area */}
        <main id="main-content" className="flex-1 min-w-0">
          {children}
        </main>

        {/* Right Sidebar Cart for Desktop */}
        {hydrated && isCartOpen && (
          <aside className="sticky top-0 z-40 hidden h-screen w-[340px] shrink-0 overflow-y-auto border-l border-crust-deep bg-white lg:block xl:w-[380px]">
            <SidebarCart />
          </aside>
        )}
      </div>

      {/* Mobile and Tablet Bottom Navigation */}
      <BottomNav />

      {/* Floating Cart Button for Desktop */}
      {hydrated && !isCartOpen && itemCount > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed right-6 bottom-6 z-50 hidden h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-espresso text-cream shadow-lg transition-all hover:bg-cinnamon lg:flex"
          aria-label="Open cart"
        >
          <div className="relative">
            <ShoppingBag size={20} />
            <span className="absolute -top-3.5 -right-3.5 flex h-5 w-5 items-center justify-center rounded-full bg-cinnamon font-mono text-[10px] font-bold text-white shadow">
              {itemCount}
            </span>
          </div>
        </button>
      )}
    </div>
  );
}
