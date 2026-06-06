"use client";

import { useState, useEffect, useRef } from "react";
import { getOrders } from "@repo/api-client";
import type { Order } from "@repo/api-client";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const getBranchCode = (branchId: string) => {
  const branchMap: Record<string, string> = {
    "br-le-loi": "LL",
    "br-pasteur": "PA",
    "br-thao-dien": "TĐ",
    "br-pmh": "PMH",
  };
  return branchMap[branchId] || branchId.replace("br-", "").toUpperCase();
};

// Order codes look like "BKO-20260602-A3K7QM"; show the human-friendly tail.
const getOrderCodeTail = (order: Order) => {
  if (order.code) {
    const parts = order.code.split("-");
    return parts[parts.length - 1];
  }
  return order.id.replace("order-", "#");
};

const TERMINAL_STATUSES: Order["status"][] = [
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
];

const ORDERS_PAGE_SIZE = 24;

const isTerminalOrder = (status: Order["status"]) =>
  TERMINAL_STATUSES.includes(status);

const getOrderAgeMinutes = (order: Order) =>
  Math.max(
    0,
    Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000),
  );

export default function OrdersPage() {
  const { user } = useAuth();
  const roles = user?.roles ?? [];
  // Branch-level roles only ever see their own branch's orders, so the branch
  // label is redundant noise for them.
  const isBranchScoped =
    !roles.includes("super_admin") &&
    (roles.includes("branch_manager") || roles.includes("branch_staff"));

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageRef = useRef(1);

  const fetchOrders = async (showLoading = false, requestedPage = pageRef.current) => {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const data = await getOrders({
        page: requestedPage,
        size: ORDERS_PAGE_SIZE,
      });
      setOrders(data.items || []);
      pageRef.current = data.page;
      setPage(data.page);
      setTotalOrders(data.total);
      setTotalPages(data.pages || Math.ceil(data.total / data.size) || 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("permission") || msg.includes("forbidden")) {
        setError("You don't have permission to view orders.");
      } else {
        setError("Could not load live orders. Retry when the API is reachable.");
      }
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to fetch orders:", err);
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(true); // eslint-disable-line react-hooks/set-state-in-effect
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  // Latest orders first.
  const visibleOrders = [...orders].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-4 flex items-end justify-between border-b border-[var(--console-line)] pb-3">
        <div>
          <div className="mb-1.5 flex items-center gap-3">
            <span className="block h-px w-6 bg-golden" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cinnamon">
              auto-refresh 5s
            </span>
          </div>
          <h1
            className="font-display tracking-tight"
            style={{
              fontSize: "clamp(26px,3.6vw,34px)",
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            Live orders.{" "}
            <span className="font-editorial text-cinnamon">
              {orders.filter((o) => !isTerminalOrder(o.status)).length} in
              motion
            </span>
          </h1>
        </div>
        <span className="font-mono text-[11px] tracking-[0.08em] text-[var(--console-muted)]">
          {totalOrders} orders
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-3 rounded-lg border border-sienna/30 bg-sienna/10 px-4 py-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-sienna">
              {error}
            </p>
            <button
              type="button"
              onClick={() => fetchOrders(true)}
              className="rounded-full border border-sienna/30 px-3 py-1.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-sienna"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Cards */}
      {loading ? (
        <div className="flex min-h-[280px] flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--console-line)] bg-white font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--console-muted)]">
          Loading orders...
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="flex min-h-[280px] flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--console-line)] bg-white px-4 text-center font-editorial text-[14px] italic text-caramel">
          No orders yet.
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 auto-rows-min content-start gap-3 overflow-y-auto grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleOrders.map((o) => {
            const orderNum = getOrderCodeTail(o);
            const mins = getOrderAgeMinutes(o);
            const late = mins > 20 && !isTerminalOrder(o.status);

            return (
              <div
                key={o.id}
                className="flex flex-col rounded-lg bg-white p-3.5"
                style={{
                  border: `1px solid ${late ? "var(--sienna)" : "var(--console-line)"}`,
                  boxShadow: late ? "0 0 0 2px rgba(196,91,74,0.13)" : "none",
                }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-mono text-[11.5px] font-bold tracking-[0.04em] text-espresso">
                    {orderNum}
                  </span>
                  {!isBranchScoped && (
                    <span className="font-mono text-[9px] font-bold tracking-[0.16em] text-cinnamon">
                      {getBranchCode(o.branch_id)}
                    </span>
                  )}
                  <span
                    className="ml-auto font-mono text-[10.5px] font-bold tracking-[0.04em]"
                    style={{
                      color: late
                        ? "var(--sienna)"
                        : mins > 15
                          ? "var(--cinnamon)"
                          : "var(--console-muted)",
                    }}
                  >
                    {mins}m
                  </span>
                </div>

                <div className="mb-1.5 truncate text-[12px] font-semibold leading-tight text-espresso">
                  {o.delivery_address || "—"}
                </div>

                <ul className="mb-2.5 flex flex-col gap-1">
                  {o.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-baseline justify-between gap-2 text-[12px] text-cocoa"
                    >
                      <span className="min-w-0 truncate">
                        <span className="mr-1.5 font-mono text-[11px] font-bold tabular-nums text-cinnamon">
                          {item.quantity}×
                        </span>
                        {item.product_name}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--console-muted)]">
                        {formatCurrency(item.total_price).replace("₫", "")}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto flex items-center justify-between border-t border-dashed border-[var(--console-line)] pt-2.5">
                  <span className="font-display text-[15px] text-espresso">
                    {formatCurrency(o.total_amount).replace("₫", "")}
                    <span className="ml-0.5 text-[11px] text-[var(--console-muted)]">
                      ₫
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <nav
          aria-label="Orders pagination"
          className="mt-4 flex items-center justify-between rounded-lg border border-[var(--console-line)] bg-white px-4 py-3"
        >
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => fetchOrders(true, page - 1)}
            className="rounded-full border border-[var(--console-line)] px-4 py-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-espresso disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--console-muted)]">
            Page {page} of {totalPages} · {totalOrders} orders
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => fetchOrders(true, page + 1)}
            className="rounded-full border border-espresso bg-espresso px-4 py-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-white disabled:cursor-not-allowed disabled:border-[var(--console-line)] disabled:bg-white disabled:text-espresso disabled:opacity-40"
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
