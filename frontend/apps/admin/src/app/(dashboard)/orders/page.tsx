"use client";

import { useState, useEffect } from "react";
import { getOrders, updateOrderStatus } from "@repo/api-client";
import type { Order } from "@repo/api-client";
import { formatCurrency } from "@/lib/utils";



const CHANNEL: Record<string, { l: string; bg: string; c: string }> = {
  app: { l: "APP", bg: "rgba(212,148,58,0.16)", c: "var(--cinnamon)" },
  web: { l: "WEB", bg: "rgba(107,143,94,0.16)", c: "var(--sage)" },
  phone: { l: "TEL", bg: "rgba(201,123,107,0.16)", c: "var(--rose)" },
};

const getCustomerName = (id: string) => {
  if (id === "order-11055") return "P. Ngọc";
  if (id === "order-11056") return "M. Trần";
  if (id === "order-11051") return "D. Linh";
  if (id === "order-11052") return "A. Vũ";
  if (id === "order-11053") return "Ms. Hằng";
  if (id === "order-11054") return "B. Sơn";
  return "Customer";
};

const getBranchCode = (branchId: string) => {
  const branchMap: Record<string, string> = {
    "br-le-loi": "LL",
    "br-pasteur": "PA",
    "br-thao-dien": "TĐ",
    "br-pmh": "PMH",
  };
  return branchMap[branchId] || branchId.replace("br-", "").toUpperCase();
};

const getRiderName = (id: string) => {
  if (id === "order-11055") return "Hùng";
  if (id === "order-11051") return "Quân";
  return "";
};

const getTag = (id: string) => {
  if (id === "order-11056") return "New cust";
  if (id === "order-11053") return "Pre-order";
  if (id === "order-11052") return "VIP";
  return undefined;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrders = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const data = await getOrders();
      setOrders(data);
    } catch (err) {
      setError("Could not load live orders. Retry when the API is reachable.");
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

  const handleAction = async (orderId: string, colKey: string, mode: "pickup" | "delivery") => {
    let nextStatus: Order["status"];
    if (colKey === "queued") {
      nextStatus = "PREPARING";
    } else if (colKey === "baking") {
      nextStatus = mode === "delivery" ? "OUT_FOR_DELIVERY" : "READY";
    } else if (colKey === "delivery") {
      nextStatus = "COMPLETED";
    } else {
      return;
    }
    try {
      await updateOrderStatus(orderId, nextStatus);
      await fetchOrders();
    } catch (err) {
      setError("Could not update order status. Please retry.");
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to update status:", err);
      }
    }
  };

  // Grouping logic based on columns
  // Queued: PENDING_PAYMENT, PAID, CONFIRMED, DRAFT
  // Baking: PREPARING
  // Delivery: READY, OUT_FOR_DELIVERY
  // Done: COMPLETED, DELIVERED, CANCELLED
  const queuedOrders = orders.filter((o) =>
    ["DRAFT", "PENDING_PAYMENT", "PAID", "CONFIRMED"].includes(o.status)
  );
  const bakingOrders = orders.filter((o) => o.status === "PREPARING");
  const deliveryOrders = orders.filter((o) =>
    ["READY", "OUT_FOR_DELIVERY"].includes(o.status)
  );
  const completedOrders = orders.filter((o) =>
    ["DELIVERED", "COMPLETED", "CANCELLED"].includes(o.status)
  );

  const COLS = [
    {
      key: "queued",
      title: "Queued",
      sub: "awaiting kitchen",
      accent: "var(--caramel)",
      badge: queuedOrders.length.toString(),
      cta: "Start ▸",
      orders: queuedOrders,
    },
    {
      key: "baking",
      title: "In the kitchen",
      sub: "baking · plating",
      accent: "var(--golden)",
      badge: bakingOrders.length.toString(),
      pulse: true,
      cta: "Ready ✓",
      orders: bakingOrders,
    },
    {
      key: "delivery",
      title: "Out for delivery",
      sub: "rider en route / ready",
      accent: "var(--cinnamon)",
      badge: deliveryOrders.length.toString(),
      pulse: true,
      cta: "Complete ✓",
      orders: deliveryOrders,
    },
    {
      key: "done",
      title: "Completed",
      sub: "today · last 30",
      accent: "var(--sage)",
      badge: completedOrders.length.toString(),
      cta: "Receipt",
      orders: completedOrders,
    },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-3.5 flex items-end justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-3">
            <span className="block h-px w-6 bg-golden" />
            <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-cinnamon">
              auto-refresh 5s
            </span>
          </div>
          <h1
            className="font-display tracking-tight"
            style={{ fontSize: "clamp(26px,3.6vw,34px)", lineHeight: 1, letterSpacing: "-0.02em" }}
          >
            Live orders.{" "}
            <span className="font-editorial text-cinnamon">
              {orders.filter((o) => o.status !== "COMPLETED" && o.status !== "CANCELLED").length} in motion
            </span>
          </h1>
        </div>
        <div className="flex gap-2">
          <div className="flex overflow-hidden rounded-full border border-[var(--admin-line)] bg-white">
            {[
              { l: "List" },
              { l: "Board", a: true },
              { l: "Map" },
              { l: "Timeline" },
            ].map((v) => (
              <span
                key={v.l}
                className={`px-4 py-2 font-mono text-[10.5px] tracking-[0.12em] ${
                  v.a ? "bg-espresso font-bold text-white" : "text-[var(--admin-muted)]"
                }`}
              >
                {v.l}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center gap-2 border-b border-[var(--admin-line)] pb-3">
        <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--admin-muted)]">
          Filter
        </span>
        {["All branches ⌄", "All channels ⌄", "Mode · any ⌄", "SLA · all ⌄"].map((c, i) => (
          <span
            key={c}
            className={`rounded-full border border-[var(--admin-line)] px-3 py-1.5 font-mono text-[11px] text-espresso ${
              i === 0 ? "bg-[var(--admin-panel)]" : "bg-white"
            }`}
          >
            {c}
          </span>
        ))}
        <div className="flex-1" />
        <span className="font-mono text-[11px] tracking-[0.08em] text-[var(--admin-muted)]">
          SLA · <span className="font-bold text-sage">98.5%</span>
          <span className="ml-3">Avg prep · </span>
          <span className="font-bold text-espresso">10m 15s</span>
        </span>
      </div>

      {error && (
        <div role="alert" className="mb-3 rounded-lg border border-sienna/30 bg-sienna/10 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-sienna">{error}</p>
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

      {/* Board */}
      {loading ? (
        <div className="flex min-h-[280px] flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--admin-line)] bg-white font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--admin-muted)]">
          Loading orders...
        </div>
      ) : (
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COLS.map((col) => (
          <div
            key={col.key}
            className="flex min-h-0 flex-col rounded-xl border border-[var(--admin-line)] bg-[var(--admin-panel)]"
          >
            <div className="flex items-center gap-2.5 rounded-t-xl border-b border-[var(--admin-line)] bg-[#fffaf2] px-3.5 py-3">
              <span
                className={`block h-2 w-2 rounded-full ${col.pulse ? "bkr-pulse" : ""}`}
                style={{ background: col.accent }}
              />
              <div className="flex-1">
                <div className="font-display text-[16px] leading-none tracking-tight text-espresso">{col.title}</div>
                <div className="mt-0.5 font-editorial text-[11.5px] italic text-[var(--admin-muted)]">{col.sub}</div>
              </div>
              <span className="rounded-full bg-espresso px-2.5 py-0.5 font-mono text-[11px] font-bold tracking-[0.06em] text-white">
                {col.badge}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-2 overflow-auto p-2.5">
              {col.orders.length === 0 && (
                <div className="rounded-lg border border-dashed border-[var(--admin-line)] bg-white/60 p-4 text-center font-editorial text-[13px] italic text-[var(--admin-muted)]">
                  No orders here.
                </div>
              )}
              {col.orders.map((o) => {
                const orderNum = o.id.replace("order-", "#");
                const mins = Math.max(
                  0,
                  Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000)
                );
                const mode = o.delivery_address?.toLowerCase().includes("pickup")
                  ? ("pickup" as const)
                  : ("delivery" as const);
                const channel = o.id === "order-11056" || o.id === "order-11052" ? "web" : "app";
                const ch = CHANNEL[channel];
                const late = mins > 20 && o.status !== "COMPLETED" && o.status !== "CANCELLED";
                const cust = getCustomerName(o.id);
                const branch = getBranchCode(o.branch_id);
                const rider = getRiderName(o.id);
                const tag = getTag(o.id);
                const itemsStr = o.items
                  .map((item) => `${item.product_name.split(" ")[0]} × ${item.quantity}`)
                  .join(" · ");

                return (
                  <div
                    key={o.id}
                    className="rounded-lg bg-white p-3.5"
                    style={{
                      border: `1px solid ${late ? "var(--sienna)" : "var(--admin-line)"}`,
                      boxShadow: late ? "0 0 0 2px rgba(196,91,74,0.13)" : "none",
                    }}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="font-mono text-[11.5px] font-bold tracking-[0.04em] text-espresso">
                        {orderNum}
                      </span>
                      <span
                        className="rounded px-1.5 py-0.5 font-mono text-[8.5px] font-bold tracking-[0.18em]"
                        style={{ background: ch.bg, color: ch.c }}
                      >
                        {ch.l}
                      </span>
                      <span className="rounded border border-[var(--admin-line-2)] px-1.5 py-0.5 font-mono text-[8.5px] tracking-[0.18em] text-[var(--admin-muted)]">
                        {mode === "delivery" ? "⏍ DEL" : "◧ PU"}
                      </span>
                      <span
                        className="ml-auto font-mono text-[10.5px] font-bold tracking-[0.04em]"
                        style={{
                          color: late
                            ? "var(--sienna)"
                            : mins > 15
                            ? "var(--cinnamon)"
                            : "var(--admin-muted)",
                        }}
                      >
                        {mins}m
                      </span>
                    </div>

                    <div className="mb-1.5 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cinnamon font-display text-[12px] text-white">
                        {cust.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-semibold leading-tight text-espresso">{cust}</div>
                        <div className="font-mono text-[9.5px] tracking-[0.08em] text-[var(--admin-muted)]">
                          {branch} {rider ? `· 🛵 ${rider}` : ""}
                        </div>
                      </div>
                    </div>

                    <div className="mb-2.5 font-editorial text-[12.5px] italic leading-[1.35] text-cocoa">
                      {itemsStr}
                    </div>

                    <div className="flex items-center justify-between border-t border-dashed border-[var(--admin-line)] pt-2.5">
                      <span className="font-display text-[15px] text-espresso">
                        {formatCurrency(o.total_amount).replace("₫", "")}
                        <span className="ml-0.5 text-[11px] text-[var(--admin-muted)]">₫</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        {tag && (
                          <span
                            className="rounded px-1.5 py-0.5 font-mono text-[8.5px] font-bold tracking-[0.18em]"
                            style={{
                              background: late ? "rgba(196,91,74,0.15)" : "rgba(212,148,58,0.15)",
                              color: late ? "var(--sienna)" : "var(--cinnamon)",
                            }}
                          >
                            {tag}
                          </span>
                        )}
                        {col.key === "done" ? (
                          <span className="rounded-full px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.06em] bg-var(--admin-panel) text-var(--admin-muted)">
                            {col.cta}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAction(o.id, col.key, mode)}
                            className="rounded-full bg-espresso px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.06em] text-white hover:bg-cinnamon transition-colors"
                          >
                            {col.cta}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
