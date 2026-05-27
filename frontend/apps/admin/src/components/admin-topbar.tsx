"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";

const SEGMENT_LABEL: Record<string, string> = {
  "": "Counter",
  orders: "Orders",
  kitchen: "Kitchen",
  products: "Products",
  categories: "Categories",
  inventory: "Inventory",
  branches: "Branches",
  users: "Staff",
};

const SEGMENT_GROUP: Record<string, string> = {
  "": "Operations",
  orders: "Operations",
  kitchen: "Operations",
  inventory: "Operations",
  branches: "Operations",
  users: "Operations",
  products: "Catalog",
  categories: "Catalog",
};

export function AdminTopBar() {
  const pathname = usePathname();
  const segment = pathname.split("/").filter(Boolean)[0] ?? "";
  const label = SEGMENT_LABEL[segment] ?? segment;
  const group = SEGMENT_GROUP[segment] ?? "Bakerio";

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });

  return (
    <header className="flex h-[60px] flex-shrink-0 items-center gap-4 border-b border-[var(--admin-line)] bg-[var(--admin-bg)] px-7">
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--admin-muted)]">
        <span>{group}</span>
        <span>›</span>
        <span className="text-espresso">{label}</span>
      </div>

      <div className="mx-auto flex w-full max-w-[480px] items-center gap-2.5 rounded-md border border-[var(--admin-line)] bg-white px-3.5 py-2 focus-within:border-cinnamon focus-within:ring-2 focus-within:ring-cinnamon/30">
        <Search
          aria-hidden="true"
          className="h-3.5 w-3.5 text-[var(--admin-muted)]"
        />
        <label htmlFor="admin-global-search" className="sr-only">
          Search orders, products, or branches
        </label>
        <input
          id="admin-global-search"
          type="search"
          placeholder="Search orders, products, branches..."
          className="min-w-0 flex-1 bg-transparent font-editorial text-[13px] italic text-espresso outline-none placeholder:text-[var(--admin-muted)]"
        />
        <kbd className="rounded border border-[var(--admin-line)] bg-vanilla px-1.5 py-0.5 font-mono text-[10px] text-[var(--admin-muted)]">
          ⌘K
        </kbd>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-[var(--admin-line)] bg-white px-3 py-1.5 font-mono text-[11px] text-espresso">
          <span>{today} · today</span>
          <span className="text-[var(--admin-muted)]">▾</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-sienna/10 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-sienna">
          <span className="bkr-pulse h-1.5 w-1.5 rounded-full bg-sienna" />
          Live
        </div>
      </div>
    </header>
  );
}
