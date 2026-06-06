"use client";

import { useEffect, useState } from "react";
import { getOrder } from "@repo/api-client";
import type { Order } from "@repo/api-client";
import { formatVND } from "@/lib/format";
import { Link } from "next-view-transitions";

interface OrderTrackingPageClientProps {
  id: string;
}

const STATUS_TEXT: Record<Order["status"], { title: string; desc: string }> = {
  DRAFT: { title: "Draft", desc: "Order is being created" },
  PENDING_PAYMENT: { title: "Awaiting Payment", desc: "Please complete payment at counter" },
  PAID: { title: "Paid & Queued", desc: "Your order is in the kitchen queue" },
  CONFIRMED: { title: "Confirmed", desc: "The team has accepted your order" },
  PREPARING: { title: "In the Oven", desc: "Your croissants and coffee are being crafted now" },
  READY: { title: "Ready for Pickup", desc: "Freshly baked and packed! Come on by" },
  OUT_FOR_DELIVERY: { title: "Out for Delivery", desc: "Our rider is on the way to your address" },
  DELIVERED: { title: "Delivered", desc: "Enjoy your fresh bakes!" },
  COMPLETED: { title: "Order Picked Up", desc: "Thank you for stopping by Bakerio" },
  CANCELLED: { title: "Cancelled", desc: "This order has been cancelled" },
};

const TERMINAL_STATUSES: ReadonlySet<Order["status"]> = new Set<Order["status"]>([
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
]);

// Order codes look like "BKO-20260602-A3K7QM"; show the human-friendly tail.
function orderCodeTail(order: Pick<Order, "code" | "id">): string {
  if (order.code) {
    const parts = order.code.split("-");
    return `#${parts[parts.length - 1]}`;
  }
  return order.id.replace("order-", "#");
}

export function OrderTrackingPageClient({ id }: OrderTrackingPageClientProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderDetails = async () => {
    try {
      setError(null);
      setOrder(await getOrder(id));
    } catch (err) {
      setError("Could not refresh order details.");
      if (process.env.NODE_ENV !== "production") {
        console.error("Failed to load order data:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isTerminal = order ? TERMINAL_STATUSES.has(order.status) : false;

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

  const currentStatus = STATUS_TEXT[order.status] ?? { title: order.status, desc: "" };

  return (
    <main className="mx-auto max-w-md px-6 pt-4 pb-32 bg-cream min-h-screen flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <Link href="/orders" aria-label="Back to orders" className="text-[22px] text-espresso">‹</Link>
        <div className="text-center">
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-caramel">
            {isTerminal ? "Order detail" : "Order status"}
          </div>
          <div className="font-display text-[16px] leading-none text-espresso">{orderCodeTail(order)}</div>
        </div>
        <span className="w-[44px]" aria-hidden="true" />
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-2xl border border-cinnamon/30 bg-cinnamon/10 p-3 text-[13px] text-sienna">
          {error}
        </div>
      )}

      {/* Status Details */}
      <div className="mb-5 rounded-2xl border border-crust bg-white p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-caramel">Current Status</div>
        <h2 className="font-display text-[26px] leading-[1.05] tracking-tight text-espresso mt-1.5">
          {currentStatus.title}
        </h2>
        <p className="font-editorial text-[14.5px] italic text-cinnamon mt-1">
          {currentStatus.desc}
        </p>
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
                <span>Discount</span>
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

      {/* Fulfillment Details */}
      <div className="mt-4 rounded-2xl border border-crust bg-white p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-caramel mb-3">Fulfillment</div>
        <div className="flex flex-col gap-2.5 text-[13.5px] text-espresso">
          {order.delivery_address && (
            <div className="flex flex-col gap-1">
              <span className="text-cocoa text-left">Address</span>
              <span className="text-[12.5px] italic text-cinnamon text-left">{order.delivery_address}</span>
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
