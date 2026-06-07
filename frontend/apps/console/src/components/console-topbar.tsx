"use client";

import { usePathname } from "next/navigation";
import { ToggleLeft, ToggleRight } from "lucide-react";
import { useFilterStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notification-bell";
import { useTranslations } from "next-intl";

const SEGMENT_LABEL_KEY: Record<string, string> = {
  "": "counter",
  orders: "orders",
  kitchen: "kitchen",
  products: "products",
  categories: "categories",
  inventory: "inventory",
  branches: "branches",
  users: "staff",
};

const SEGMENT_GROUP_KEY: Record<string, string> = {
  "": "operations",
  orders: "operations",
  kitchen: "operations",
  inventory: "operations",
  branches: "operations",
  users: "operations",
  products: "catalog",
  categories: "catalog",
};

export function ConsoleTopBar() {
  const pathname = usePathname();
  const t = useTranslations("common");
  const segment = pathname.split("/").filter(Boolean)[0] ?? "";
  const labelKey = SEGMENT_LABEL_KEY[segment];
  const label = labelKey ? t(`topbarSegments.${labelKey}`) : segment;
  const groupKey = SEGMENT_GROUP_KEY[segment];
  const group = groupKey ? t(`topbarGroups.${groupKey}`) : "Bakerio";

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
              aria-label={onlyActive ? t("showAll") : t("showActiveOnly")}
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
              {t("activeOnly")}
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
