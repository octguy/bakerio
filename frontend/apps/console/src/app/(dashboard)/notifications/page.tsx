"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useNotifications, useMarkRead, useMarkAllRead, useUnreadCount } from "@/lib/use-notifications";
import type { Notification, NotificationType } from "@repo/api-client";

const TYPE_ICON: Record<NotificationType, string> = {
  "order.placed": "🛒",
  "order.placed.branch": "📦",
  "auth.password_changed": "🔒",
  "auth.password_reset_by_admin": "⚠️",
  "membership.tier_upgraded": "🏆",
};

function timeAgo(date: string, t: (key: string, values?: Record<string, string | number | Date>) => string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("justNow");
  if (mins < 60) return t("minutesAgo", { count: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("hoursAgo", { count: hrs });
  return t("daysAgo", { count: Math.floor(hrs / 24) });
}

function getLink(n: Notification): string {
  if (n.type === "order.placed.branch" && n.data?.order_id) return `/orders`;
  return "#";
}

type Filter = "all" | "unread" | "read";

export default function NotificationsPage() {
  const t = useTranslations("notifications");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const unreadOpt = filter === "unread" ? true : filter === "read" ? false : undefined;
  const { data, isLoading } = useNotifications({ page, size: 20, unread: unreadOpt });
  const { data: unreadCount = 0 } = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  function handleClick(n: Notification) {
    if (!n.read_at) markRead.mutate(n.id);
  }

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: t("filterAll") },
    { key: "unread", label: t("filterUnread") },
    { key: "read", label: t("filterRead") },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-lg tracking-tight">{t("title")}</h1>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            className="font-mono text-[10.5px] uppercase tracking-wider text-cinnamon hover:underline"
          >
            {t("markAllRead")}
          </button>
        )}
      </div>

      <div className="flex gap-1 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setFilter(tab.key); setPage(1); }}
            className={`rounded-full px-3 py-1 font-mono text-[10.5px] uppercase tracking-wider transition-colors ${
              filter === tab.key ? "bg-espresso text-cream" : "bg-white border border-[var(--console-line)] text-[var(--console-muted)] hover:bg-cream"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-crust border-t-cinnamon" />
        </div>
      ) : !data?.items?.length ? (
        <p className="py-12 text-center text-[13px] text-[var(--console-muted)]">{t("empty")}</p>
      ) : (
        <>
          <div className="rounded-lg border border-[var(--console-line)] bg-white overflow-hidden">
            {data.items.map((n) => (
              <Link
                key={n.id}
                href={getLink(n)}
                onClick={() => handleClick(n)}
                className={`flex gap-3 px-5 py-4 border-b border-[var(--console-line)] last:border-0 transition-colors hover:bg-cream/50 ${!n.read_at ? "bg-cinnamon/5" : ""}`}
              >
                <span className="text-lg shrink-0 mt-0.5">{TYPE_ICON[n.type] ?? "🔔"}</span>
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] leading-snug ${!n.read_at ? "font-semibold" : ""}`}>{n.title}</p>
                  {n.body && <p className="mt-0.5 text-[12px] text-[var(--console-muted)] line-clamp-2">{n.body}</p>}
                  <p className="mt-1 text-[11px] text-[var(--console-muted)]">{timeAgo(n.created_at, t)}</p>
                </div>
              </Link>
            ))}
          </div>

          {data.total_pages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded px-3 py-1 font-mono text-[11px] border border-[var(--console-line)] disabled:opacity-40"
              >
                ←
              </button>
              <span className="font-mono text-[11px] text-[var(--console-muted)]">
                {page} / {data.total_pages}
              </span>
              <button
                disabled={page >= data.total_pages}
                onClick={() => setPage(page + 1)}
                className="rounded px-3 py-1 font-mono text-[11px] border border-[var(--console-line)] disabled:opacity-40"
              >
                →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
