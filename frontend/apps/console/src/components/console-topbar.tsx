"use client";

import { usePathname } from "next/navigation";
import { ToggleLeft, ToggleRight } from "lucide-react";
import { useFilterStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";

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

export function ConsoleTopBar() {
  const pathname = usePathname();
  const segment = pathname.split("/").filter(Boolean)[0] ?? "";
  const label = SEGMENT_LABEL[segment] ?? segment;
  const group = SEGMENT_GROUP[segment] ?? "Bakerio";

  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });

  const { onlyActive, setOnlyActive } = useFilterStore();
  const showToggle = ["branches", "products", "categories"].includes(segment);

  return (
    <header className="flex h-[60px] flex-shrink-0 items-center gap-4 border-b border-[var(--console-line)] bg-[var(--console-bg)] px-7">
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--console-muted)]">
        <span>{group}</span>
        <span>›</span>
        <span className="text-espresso">{label}</span>
      </div>

      {showToggle && (
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--console-muted)]">
          <span>|</span>
          <div className="flex items-center gap-1.5 select-none">
            <Button
              variant="ghost"
              size="icon"
              aria-label={onlyActive ? "Show all items" : "Show only active items"}
              onClick={() => setOnlyActive(!onlyActive)}
              className="h-auto w-auto p-0 hover:bg-transparent bg-transparent border-0 shadow-none animate-none"
            >
              {onlyActive ? (
                <ToggleRight aria-hidden="true" className="h-6 w-6 text-sage fill-sage/20" />
              ) : (
                <ToggleLeft aria-hidden="true" className="h-6 w-6 text-[var(--console-muted)] fill-[var(--console-muted)]/10" />
              )}
            </Button>
            <span className="text-[10px] tracking-wider text-caramel">
              Active only
            </span>
          </div>
        </div>
      )}

      <div className="ml-auto flex items-center gap-3">
        <NotificationBell />
        <div className="flex items-center gap-2 rounded-full border border-[var(--console-line)] bg-white px-3 py-1.5 font-mono text-[11px] text-espresso">
          <span>{today}</span>
        </div>
      </div>
    </header>
  );
}
