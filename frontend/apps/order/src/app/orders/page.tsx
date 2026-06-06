"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { getOrders, getOrderStats, getProduct, reorderItems } from "@repo/api-client";
import type { Order, OrderStatus } from "@repo/api-client";
import { formatVND } from "@/lib/format";
import { Link } from "next-view-transitions";
import { useTransitionRouter as useRouter } from "next-view-transitions";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useCartStore } from "@/store/cart";

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

const TERMINAL_STATUSES: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
]);

// Order codes look like "BKO-20260602-A3K7QM"; show the human-friendly tail.
// Falls back to the legacy id format when the backend code is absent.
function orderCodeTail(order: Pick<Order, "code" | "id">): string {
  if (order.code) {
    const parts = order.code.split("-");
    return `#${parts[parts.length - 1]}`;
  }
  return order.id.replace("order-", "#");
}

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
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"All" | "In progress" | "Delivered" | "Cancelled">("All");
  const [stats, setStats] = useState({ lifetime: 0, inProgress: 0, delivered: 0, cancelled: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const observer = useRef<IntersectionObserver | null>(null);
  const fetchCount = useRef(0);
  const statsFetched = useRef(false);

  const lastOrderElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || isFetchingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0] && entries[0].isIntersecting && hasMore) {
        setPage((prev) => prev + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, isFetchingMore, hasMore]);

  const fetchOrdersData = async (currentPage: number, currentSearch: string, currentTab: typeof activeTab, shouldAppend: boolean) => {
    const currentFetchId = ++fetchCount.current;
    try {
      if (!shouldAppend) {
        setLoading(true);
      } else {
        setIsFetchingMore(true);
      }
      const statuses = currentTab === "All" ? undefined : currentTab === "In progress" ? "PENDING_PAYMENT,PAID,CONFIRMED,PREPARING,READY,OUT_FOR_DELIVERY" : currentTab === "Delivered" ? "DELIVERED,COMPLETED" : "CANCELLED";
      const data = await getOrders({ page: currentPage, size: 10, search: currentSearch, status: statuses });
      if (currentFetchId !== fetchCount.current) return;
      setOrders(prev => shouldAppend ? [...prev, ...data.items] : data.items);
      setHasMore(currentPage * 10 < data.total);
      setError(null);
      if (!statsFetched.current) {
        const counts = await getOrderStats();
        if (currentFetchId === fetchCount.current) {
          setStats(counts);
          statsFetched.current = true;
        }
      }
    } catch (err) {
      if (currentFetchId !== fetchCount.current) return;
      setError("Could not load orders. Please try again.");
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to load orders:", err);
      }
    } finally {
      if (currentFetchId === fetchCount.current) {
        setLoading(false);
        setIsFetchingMore(false);
      }
    }
  };

  // Reset page and clear orders when tab or search changes
  useEffect(() => {
    setPage(1); // eslint-disable-line react-hooks/set-state-in-effect
    setOrders([]);
    setHasMore(true);
  }, [activeTab, searchQuery]);

  // Fetch data when page, tab, or search changes
  useEffect(() => {
    fetchOrdersData(page, searchQuery, activeTab, page > 1); // eslint-disable-line react-hooks/set-state-in-effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, activeTab, searchQuery]);

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

      <div className="mt-6 mb-4">
        <input
          type="text"
          value={searchQuery}
          aria-label="Search orders"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search orders..."
          className="w-full rounded-2xl border border-crust bg-white px-4 py-3 font-mono text-[13px] text-espresso placeholder-caramel shadow-sm focus:border-cinnamon focus:outline-none focus:ring-1 focus:ring-cinnamon transition-all"
        />
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
            onClick={() => fetchOrdersData(page, searchQuery, activeTab, page > 1)}
            className="ml-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-cinnamon"
          >
            Retry
          </button>
        </div>
      )}

      {loading && page === 1 ? (
        <div className="py-12 text-center font-editorial text-[14px] italic text-caramel">
          Reading the order book…
        </div>
      ) : orders.length === 0 && !loading ? (
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
        <>
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {orders.map((o, index) => {
              const st = STATUS_LABEL[o.status] ?? { l: o.status, c: "var(--caramel)" };
              const itemsCount = o.items.reduce((s, i) => s + i.quantity, 0);
              const displayId = orderCodeTail(o);
              const isTerminal = TERMINAL_STATUSES.has(o.status);
              const isLast = index === orders.length - 1;
              return (
                <div
                  key={o.id}
                  ref={isLast ? lastOrderElementRef : null}
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

                  <Link
                    href={`/orders/${o.id}`}
                    aria-label={`View order ${displayId}`}
                    className="flex items-center gap-3"
                  >
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
                    <span className="text-[18px] text-caramel" aria-hidden="true">›</span>
                  </Link>

                  <div className="mt-2.5 flex justify-between border-t border-dashed border-crust pt-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-cinnamon">
                    <Link href={`/orders/${o.id}`} className="hover:text-espresso transition-colors">
                      {st.live ? "Track →" : "View details →"}
                    </Link>
                    {isTerminal && (
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
          {isFetchingMore && (
            <div className="py-6 text-center font-editorial text-[14px] italic text-caramel flex items-center justify-center gap-2">
              <span className="bkr-pulse inline-block h-1.5 w-1.5 rounded-full bg-cinnamon align-middle" aria-hidden="true" />
              Loading more...
            </div>
          )}
        </>
      )}
    </main>
  );
}
