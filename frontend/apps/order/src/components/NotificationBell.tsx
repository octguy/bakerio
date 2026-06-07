"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { Link } from "next-view-transitions";
import { useUnreadCount, useNotifications, useMarkRead } from "@/hooks/use-notifications";
import { useAuth } from "@/lib/auth";
import type { Notification, NotificationType } from "@repo/api-client";

const TYPE_ICON: Record<NotificationType, string> = {
  "order.placed": "🛒",
  "order.placed.branch": "📦",
  "auth.password_changed": "🔒",
  "auth.password_reset_by_admin": "⚠️",
  "membership.tier_upgraded": "🏆",
};

function timeAgo(date: string, t: ReturnType<typeof useTranslations<"notifications">>) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("justNow");
  if (mins < 60) return t("minutesAgo", { count: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("hoursAgo", { count: hrs });
  return t("daysAgo", { count: Math.floor(hrs / 24) });
}

export function NotificationBell() {
  const t = useTranslations("notifications");
  const { user } = useAuth();
  const { data: count = 0 } = useUnreadCount(!!user);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useNotifications(open ? { size: 5 } : undefined);
  const markRead = useMarkRead();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  if (!user) return null;

  function handleClick(n: Notification) {
    if (!n.read_at) markRead.mutate(n.id);
    setOpen(false);
  }

  function getLink(n: Notification): string {
    if ((n.type === "order.placed") && n.data?.order_id) return `/orders/${n.data.order_id}`;
    if (n.type === "membership.tier_upgraded") return `/profile`;
    return "/notifications";
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label={count > 0 ? t("bellWithCount", { count }) : t("title")}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-crust bg-white text-espresso"
      >
        <Bell size={16} />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cinnamon px-1 font-mono text-[9.5px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-crust bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-crust px-4 py-2.5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-caramel">{t("title")}</span>
            {count > 0 && (
              <span className="rounded-full bg-cinnamon/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-cinnamon">{count}</span>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {data?.items?.length ? (
              data.items.map((n) => (
                <Link
                  key={n.id}
                  href={getLink(n)}
                  onClick={() => handleClick(n)}
                  className={`flex gap-3 px-4 py-3 border-b border-crust/50 last:border-0 transition-colors hover:bg-cream ${!n.read_at ? "bg-cinnamon/5" : ""}`}
                >
                  <span className="text-base shrink-0">{TYPE_ICON[n.type] ?? "🔔"}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[12.5px] leading-snug truncate ${!n.read_at ? "font-semibold" : ""}`}>{n.title}</p>
                    <p className="mt-0.5 text-[11px] text-caramel">{timeAgo(n.created_at, t)}</p>
                  </div>
                </Link>
              ))
            ) : (
              <p className="px-4 py-6 text-center text-[12px] text-caramel">{t("empty")}</p>
            )}
          </div>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-crust px-4 py-2.5 text-center font-mono text-[10.5px] uppercase tracking-wider text-cinnamon hover:bg-cream"
          >
            {t("viewAll")} →
          </Link>
        </div>
      )}
    </div>
  );
}
