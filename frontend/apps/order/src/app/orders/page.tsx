"use client";

import { useEffect, useState } from "react";
import { getOrders, getOrderStats, getProduct, reorderItems, getMockOrderSessionUser } from "@repo/api-client";
import type { Order, OrderStatus } from "@repo/api-client";
import { formatVND } from "@/lib/format";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useCartStore } from "@/store/cart";
import { useOrderDetailsStore } from "@/store/orderDetails";

const STATUS_LABEL: Record<OrderStatus, { l: string; c: string; live?: boolean }> = {
  DRAFT: { l: "Draft", c: "var(--caramel)" },
  PENDING_PAYMENT: { l: "Pending pay", c: "var(--golden)" },
  PAID: { l: "Paid", c: "var(--cinnamon)" },
  CONFIRMED: { l: "Confirmed", c: "var(--cinnamon)" },
  PREPARING: { l: "In kitchen", c: "var(--cinnamon)", live: true },
  READY: { l: "Ready", c: "var(--cinnamon)" },
  OUT_FOR_DELIVERY: { l: "On its way", c: "var(--cinnamon)", live: true },
  DELIVERED: { l: "Delivered", c: "var(--sage)" },
  COMPLETED: { l: "Picked up", c: "var(--sage)" },
  CANCELLED: { l: "Cancelled", c: "var(--sienna)" },
};

export default function OrdersPage() {
  return (
    <ProtectedRoute>
      <OrdersPageInner />
    </ProtectedRoute>
  );
}

function OrdersPageInner() {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const setBranch = useCartStore((s) => s.setBranch);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"All" | "In progress" | "Delivered" | "Cancelled">("All");
  const [stats, setStats] = useState({ lifetime: 0, inProgress: 0, delivered: 0, cancelled: 0 });

  const fetchOrdersData = async () => {
    try {
      setError(null);
      const data = await getOrders();
      const sessionUser = getMockOrderSessionUser();
      const store = useOrderDetailsStore.getState();
      const mergedOrders = data.map((o) => {
        const localDetail = store.getOrderDetail(sessionUser, o.id);
        if (!localDetail) return o;
        return {
          ...o,
          fulfillment_mode: localDetail.fulfillment_mode,
          delivery_address: localDetail.delivery_address,
          requested_time: localDetail.requested_time,
          payment_method: localDetail.payment_method,
          delivery_fee_amount: localDetail.delivery_fee_amount,
          loyalty_discount_amount: localDetail.loyalty_discount_amount,
          crumbs_redeemed: localDetail.crumbs_redeemed,
          subtotal_amount: localDetail.subtotal_amount,
          total_amount: localDetail.total_amount ?? o.total_amount,
          note: localDetail.note,
        };
      });
      setOrders(mergedOrders);
      const counts = await getOrderStats();
      setStats(counts);
    } catch (err) {
      setError("Could not load orders. Please try again.");
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to load orders:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersData(); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  const handleReorder = async (orderId: string) => {
    setLoading(true);
    try {
      setError(null);
      const sourceOrder = orders.find((order) => order.id === orderId);
      if (!sourceOrder) {
        throw new Error(`Order ${orderId} not found`);
      }
      const itemsList = await reorderItems(orderId);
           const addedItems = await Promise.all(
             itemsList.map(async (item) => {
               const product = await getProduct(item.product_id);
               if (!product) return null;
               return {
                 product: {
                   id: product.id,
                   name: product.name,
                   slug: product.slug,
                   description: "",
                   basePrice: product.price,
                   image: "",
                   category: product.category_id,
                   options: [],
                 },
                 choices: [],
                 quantity: item.quantity,
                 unitPrice: product.price,
               };
             })
           );

      setBranch(sourceOrder.branch_id);
      addedItems.forEach((it) => {
        if (it) addItem(it);
      });
      router.push("/cart");
    } catch (err) {
      setError("Could not reorder those items. Please try again.");
      if (process.env.NODE_ENV !== "production") {
        console.error("Reorder failed:", err);
      }
      setLoading(false);
    }
  };

  const filtered = orders.filter((o) => {
    if (activeTab === "All") return true;
    if (activeTab === "In progress") {
      return ["PENDING_PAYMENT", "PAID", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"].includes(o.status);
    }
    if (activeTab === "Delivered") {
      return ["DELIVERED", "COMPLETED"].includes(o.status);
    }
    if (activeTab === "Cancelled") {
      return o.status === "CANCELLED";
    }
    return true;
  });

  const tabs = [
    { l: "All", k: "All" as const, count: stats.lifetime },
    { l: "In progress", k: "In progress" as const, count: stats.inProgress },
    { l: "Delivered", k: "Delivered" as const, count: stats.delivered },
    { l: "Cancelled", k: "Cancelled" as const, count: stats.cancelled },
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 pt-4 pb-32 md:pb-12">
      {/* Header (Mobile only) */}
      <div className="mb-3 flex items-center justify-between md:hidden">
        <Link href="/profile" aria-label="Back to profile" className="text-[22px] text-espresso">‹</Link>
        <div className="font-display text-[16px] leading-none text-espresso">Orders</div>
        <span className="font-mono text-[11px] tracking-[0.1em] text-caramel">Filter</span>
      </div>

      <div className="mt-2">
        <h1
          className="font-display tracking-tight"
          style={{ fontSize: "clamp(32px,9vw,40px)", lineHeight: 0.95, letterSpacing: "-0.02em" }}
        >
          Your basket, <span className="font-editorial text-cinnamon">over time.</span>
        </h1>
        <p className="mt-2 font-editorial text-[14px] italic leading-[1.45] text-caramel">
          You&apos;ve had {stats.lifetime} orders with us. That&apos;s a lot of bánh mì.
        </p>
      </div>

      {/* Tabs */}
      <div className="-mx-1 mt-4 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-2">
        {tabs.map((tab) => {
          const active = activeTab === tab.k;
          return (
            <button
              key={tab.l}
              type="button"
              aria-pressed={active}
              onClick={() => setActiveTab(tab.k)}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] tracking-[0.1em] transition-colors ${
                active ? "bg-espresso font-bold text-white" : "border border-crust bg-white text-cocoa"
              }`}
            >
              {tab.l} <span className="text-[10px] opacity-70">{tab.count}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div role="alert" className="mb-3 rounded-2xl border border-cinnamon/30 bg-cinnamon/10 p-3 text-[13px] text-sienna">
          {error}
          <button
            type="button"
            onClick={fetchOrdersData}
            className="ml-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-cinnamon"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center font-editorial text-[14px] italic text-caramel">
          Reading the order book…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-crust-deep bg-butter py-10 text-center">
          <p className="font-editorial text-[14px] italic text-cocoa">No orders to show.</p>
          <Link
            href="/menu"
            className="mt-3 inline-block font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-cinnamon"
          >
            Start ordering →
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((o) => {
            const st = STATUS_LABEL[o.status] ?? { l: o.status, c: "var(--caramel)" };
            const itemsCount = o.items.reduce((s, i) => s + i.quantity, 0);
            const displayId = o.id.replace("order-", "#");
            return (
              <div
                key={o.id}
                className={`relative overflow-hidden rounded-2xl bg-white p-4 ${
                  st.live ? "border-2 border-cinnamon" : "border border-crust"
                }`}
              >
                {st.live && (
                  <div className="absolute right-0 top-0 rounded-bl-[10px] bg-cinnamon px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-white">
                    <span className="bkr-pulse mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-white align-middle" aria-hidden="true" />
                    Live
                  </div>
                )}
                <div className="mb-2 flex items-center gap-2.5">
                  <span className="font-mono text-[11.5px] font-bold tracking-[0.04em] text-espresso">
                    {displayId}
                  </span>
                  <span className="font-mono text-[10px] tracking-wider text-caramel">
                    · {o.branch_id === "br-le-loi" ? "Lê Lợi" : o.branch_id === "br-pasteur" ? "Pasteur" : o.branch_id === "br-thao-dien" ? "Thảo Điền" : "Phú Mỹ Hưng"}
                  </span>
                  <span
                    className="ml-auto font-mono text-[9.5px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: st.c }}
                  >
                    {st.l}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-butter font-display text-[16px] text-cinnamon">
                    {itemsCount}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-editorial text-[13px] text-cocoa">
                      {itemsCount} items · {new Date(o.created_at).toLocaleDateString("vi-VN")}
                    </div>
                    <div className="mt-0.5 font-display text-[18px] text-espresso">
                      {formatVND(o.total_amount)}
                    </div>
                  </div>
                  {st.live ? (
                    <Link href={`/orders/${o.id}`} aria-label={`Track order ${displayId}`}>
                      <span className="text-[18px] text-caramel" aria-hidden="true">›</span>
                    </Link>
                  ) : (
                    <span className="text-[18px] text-caramel" aria-hidden="true">›</span>
                  )}
                </div>

                <div className="mt-2.5 flex justify-between border-t border-dashed border-crust pt-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-cinnamon">
                  {st.live ? (
                    <Link href={`/orders/${o.id}`} className="hover:text-espresso transition-colors">
                      Track →
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleReorder(o.id)}
                      className="font-bold text-cinnamon hover:text-espresso transition-colors"
                    >
                      Reorder
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
