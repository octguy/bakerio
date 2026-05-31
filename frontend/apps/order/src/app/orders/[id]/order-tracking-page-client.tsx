"use client";

import { useEffect, useState } from "react";
import { getOrder, getBranches, getMockOrderSessionUser } from "@repo/api-client";
import type { Order, Branch } from "@repo/api-client";
import { formatVND } from "@/lib/format";
import { Link } from "next-view-transitions";
import dynamic from "next/dynamic";
import { useOrderDetailsStore } from "@/store/orderDetails";

const TrackingMap = dynamic(() => import("@/components/TrackingMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-[#fbf6ef] font-mono text-[11px] text-caramel">
      Loading map...
    </div>
  ),
});

interface OrderTrackingPageClientProps {
  id: string;
}

const STATUS_PROGRESS: Record<Order["status"], number> = {
  DRAFT: 0,
  PENDING_PAYMENT: 10,
  PAID: 25,
  CONFIRMED: 40,
  PREPARING: 60,
  READY: 80,
  OUT_FOR_DELIVERY: 90,
  DELIVERED: 100,
  COMPLETED: 100,
  CANCELLED: 0,
};

const STATUS_TEXT: Record<Order["status"], { title: string; desc: string }> = {
  DRAFT: { title: "Draft", desc: "Order is being created" },
  PENDING_PAYMENT: { title: "Awaiting Payment", desc: "Please complete payment at counter" },
  PAID: { title: "Paid & Queued", desc: "Your order is in the kitchen queue" },
  CONFIRMED: { title: "Confirmed", desc: "The team has accepted your order" },
  PREPARING: { title: "In the Oven", desc: "Your croissants and coffee are being crafted now" },
  READY: { title: "Ready for Pickup", desc: "Freshly baked and packed! Come on by" },
  OUT_FOR_DELIVERY: { title: "Out for Delivery", desc: "Our rider is zooming to your address" },
  DELIVERED: { title: "Delivered", desc: "Enjoy your fresh bakes!" },
  COMPLETED: { title: "Order Picked Up", desc: "Thank you for stopping by Bakerio" },
  CANCELLED: { title: "Cancelled", desc: "This order has been cancelled" },
};

export function OrderTrackingPageClient({ id }: OrderTrackingPageClientProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderDetails = async () => {
    try {
      setError(null);
      const data = await getOrder(id);
      if (data) {
        const sessionUser = getMockOrderSessionUser();
        const localDetail = useOrderDetailsStore.getState().getOrderDetail(sessionUser, data.id);
        if (localDetail) {
          setOrder({
            ...data,
            fulfillment_mode: localDetail.fulfillment_mode,
            delivery_address: localDetail.delivery_address,
            requested_time: localDetail.requested_time,
            payment_method: localDetail.payment_method,
            delivery_fee_amount: localDetail.delivery_fee_amount,
            loyalty_discount_amount: localDetail.loyalty_discount_amount,
            crumbs_redeemed: localDetail.crumbs_redeemed,
            subtotal_amount: localDetail.subtotal_amount,
            total_amount: localDetail.total_amount ?? data.total_amount,
            note: localDetail.note,
          });
        } else {
          setOrder(data);
        }
      } else {
        setOrder(null);
      }
      if (branches.length === 0) {
        const branchList = await getBranches();
        setBranches(branchList);
      }
    } catch (err) {
      setError("Could not refresh tracking details.");
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to load tracking data:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails(); // eslint-disable-line react-hooks/set-state-in-effect
    const interval = setInterval(fetchOrderDetails, 5000);
    return () => clearInterval(interval);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center font-editorial text-[14px] italic text-caramel bg-cream min-h-screen">
        Finding your basket…
      </main>
    );
  }

  if (!order) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center bg-cream min-h-screen">
        <h1 className="font-display text-[24px] text-espresso">Order not found</h1>
        <p className="font-editorial text-[14px] italic text-caramel mt-2">Could not locate order {id}</p>
        <Link href="/orders" className="mt-6 inline-block font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-cinnamon">
          ← Back to orders
        </Link>
      </main>
    );
  }

  const progress = STATUS_PROGRESS[order.status] ?? 0;
  const currentStatus = STATUS_TEXT[order.status] ?? { title: order.status, desc: "" };
  const isDelivery =
    order.fulfillment_mode === "DELIVERY" ||
    (order.fulfillment_mode == null && !order.delivery_address?.toLowerCase().includes("pickup"));
  const branch = branches.find((b) => b.id === order.branch_id);

  return (
    <main className="mx-auto max-w-md px-6 pt-4 pb-32 bg-cream min-h-screen flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <Link href="/orders" aria-label="Back to orders" className="text-[22px] text-espresso">‹</Link>
        <div className="text-center">
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-caramel">Live tracking</div>
          <div className="font-display text-[16px] leading-none text-espresso">{order.id.replace("order-", "#")}</div>
        </div>
        <button
          type="button"
          className="font-mono text-[11px] tracking-[0.1em] text-caramel"
          onClick={fetchOrderDetails}
        >
          Reload
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-2xl border border-cinnamon/30 bg-cinnamon/10 p-3 text-[13px] text-sienna">
          {error}
        </div>
      )}

      {/* Honest visual badge */}
      <div className="mb-4 text-center">
        <span className="inline-block rounded-full bg-caramel/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-caramel">
          Simulated tracking · visual only
        </span>
      </div>

      {/* Map visual section */}
      <div className="relative mb-5 overflow-hidden rounded-2xl border border-crust bg-[#fbf6ef] h-[220px]">
        <TrackingMap branch={branch} isDelivery={isDelivery} />

        {/* Floating details overlay */}
        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg border border-crust p-2.5 max-w-[150px] z-10">
          <div className="font-mono text-[8px] uppercase tracking-[0.16em] text-caramel">Rider</div>
          <div className="text-[11.5px] font-bold text-espresso">
            {order.status === "OUT_FOR_DELIVERY" ? "Nguyễn Văn Hùng 🛵" : "Waiting for pickup…"}
          </div>
        </div>
      </div>

      {/* Status Details */}
      <div className="mb-5 rounded-2xl border border-crust bg-white p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-caramel">Current Status</div>
        <h2 className="font-display text-[26px] leading-[1.05] tracking-tight text-espresso mt-1.5">
          {currentStatus.title}
        </h2>
        <p className="font-editorial text-[14.5px] italic text-cinnamon mt-1">
          {currentStatus.desc}
        </p>

        {/* Progress Bar */}
        <div className="mt-5">
          <div className="h-2 overflow-hidden rounded-full bg-butter">
            <div
              className="h-full rounded-full bg-cinnamon transition-transform duration-1000"
              style={{ transform: `scaleX(${progress / 100})`, transformOrigin: "left center" }}
            />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[9px] tracking-[0.08em] text-caramel uppercase">
            <span>Placed</span>
            <span>Prep</span>
            <span>Ready</span>
            <span>Done</span>
          </div>
        </div>
      </div>

      {/* Basket Details */}
      <div className="rounded-2xl border border-crust bg-white p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-caramel mb-3">Order Basket</div>
        <div className="flex flex-col gap-2 border-b border-crust pb-3 mb-3">
          {order.items.map((it) => (
            <div key={it.id} className="flex justify-between items-center text-[13.5px] text-espresso">
              <span>
                <span className="mr-2 font-mono tabular-nums text-[12px] font-bold text-cinnamon">{it.quantity}x</span>
                {it.product_name}
              </span>
              <span className="font-mono tabular-nums">{formatVND(it.total_price)}</span>
            </div>
          ))}
        </div>

        {/* Price Breakdown */}
        {order.subtotal_amount !== undefined && (
          <div className="flex flex-col gap-1.5 border-b border-crust pb-3 mb-3 text-[12.5px] text-cocoa">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums">{formatVND(order.subtotal_amount)}</span>
            </div>
            {order.loyalty_discount_amount ? (
              <div className="flex justify-between text-sage font-semibold">
                <span>Crumbs Discount {order.crumbs_redeemed ? `(${order.crumbs_redeemed})` : ""}</span>
                <span className="font-mono tabular-nums">−{formatVND(order.loyalty_discount_amount)}</span>
              </div>
            ) : null}
            {order.delivery_fee_amount ? (
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span className="font-mono tabular-nums">{formatVND(order.delivery_fee_amount)}</span>
              </div>
            ) : null}
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="font-display text-[16px] text-espresso">Total amount</span>
          <span className="font-display tabular-nums text-[20px] text-espresso">{formatVND(order.total_amount)}</span>
        </div>
      </div>

      {/* Fulfillment & Payment Details */}
      <div className="mt-4 rounded-2xl border border-crust bg-white p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-caramel mb-3">Fulfillment & Payment</div>
        <div className="flex flex-col gap-2.5 text-[13.5px] text-espresso">
          <div className="flex justify-between">
            <span className="text-cocoa">Mode</span>
            <span className="font-semibold">{order.fulfillment_mode ?? "PICKUP"}</span>
          </div>
          {order.delivery_address && (
            <div className="flex flex-col gap-1 border-t border-crust/50 pt-2">
              <span className="text-cocoa text-left">Address</span>
              <span className="text-[12.5px] italic text-cinnamon text-left">{order.delivery_address}</span>
            </div>
          )}
          {order.requested_time && (
            <div className="flex justify-between border-t border-crust/50 pt-2">
              <span className="text-cocoa">Requested Time</span>
              <span>{order.requested_time}</span>
            </div>
          )}
          {order.payment_method && (
            <div className="flex justify-between border-t border-crust/50 pt-2">
              <span className="text-cocoa">Payment Method</span>
              <span className="font-mono text-[12px]">{order.payment_method}</span>
            </div>
          )}
          {order.note && (
            <div className="flex flex-col gap-1 border-t border-crust/50 pt-2">
              <span className="text-cocoa text-left">Note</span>
              <span className="text-[12.5px] italic text-caramel text-left">{order.note}</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
