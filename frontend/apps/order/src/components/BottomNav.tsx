"use client";

import { Link } from "next-view-transitions";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCartStore } from "@/store/cart";

const navItems = [
  { href: "/menu", icon: "◆", key: "menu" as const },
  { href: "/orders", icon: "○", key: "orders" as const },
  { href: "/cart", icon: "✦", key: "cart" as const },
  { href: "/profile", icon: "◐", key: "me" as const },
];

export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const itemCount = useCartStore((s) =>
    s.items.reduce((sum, item) => sum + item.quantity, 0),
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-crust bg-white lg:hidden">
      <div className="flex items-center justify-around px-2 pt-2.5 pb-7">
        {navItems.map(({ href, icon, key }) => {
          const active =
            pathname === href || (href !== "/" && pathname.startsWith(href));
          const label = t(key);
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-col items-center gap-0.5"
              style={{
                color: active ? "var(--cinnamon)" : "var(--caramel)",
                fontWeight: active ? 700 : 500,
              }}
            >
              <span className="text-[16px]" aria-hidden>
                {icon}
              </span>
              {key === "cart" && itemCount > 0 && (
                <>
                  <span
                    className="absolute -right-2 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-cinnamon font-mono text-[9px] font-bold text-white"
                    aria-hidden="true"
                  >
                    {itemCount}
                  </span>
                  <span className="sr-only">{t("items", { count: itemCount })}</span>
                </>
              )}
              <span className="font-mono text-[9.5px] uppercase tracking-[0.16em]">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
