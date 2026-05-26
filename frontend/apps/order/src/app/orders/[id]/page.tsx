"use client";

import { useEffect, useState, use } from "react";
import { getOrder, getBranches } from "@repo/api-client";
import type { Order, Branch } from "@repo/api-client";
import { formatVND } from "@/lib/format";
import Link from "next/link";
import { ProtectedRoute } from "@/components/ProtectedRoute";

interface PageProps {
  params: Promise<{ id: string }>;
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

export default function OrderTrackingPage({ params }: PageProps) {
  return (
    <ProtectedRoute>
      <OrderTrackingPageInner params={params} />
    </ProtectedRoute>
  );
}

function OrderTrackingPageInner({ params }: PageProps) {
  const { id } = use(params);

  const [order, setOrder] = useState<Order | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderDetails = async () => {
    try {
      setError(null);
      const data = await getOrder(id);
      setOrder(data);
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

  // SVG coordinates for animating path
  // Start: Branch position
  // End: Delivery destination position
  const branchCoords = { x: 80, y: 150 };
  const destinationCoords = { x: 260, y: 70 };
  const riderPath = `M ${branchCoords.x} ${branchCoords.y} Q 170 120 ${destinationCoords.x} ${destinationCoords.y}`;

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
      <div className="relative mb-5 overflow-hidden rounded-2xl border border-crust bg-[#fbf6ef] p-4 h-[220px]">
        {/* Animated Rider Map */}
        <svg className="w-full h-full" viewBox="0 0 340 200" fill="none" aria-hidden="true">
          {/* Abstract roads */}
          <path d="M 20 180 L 320 80" stroke="#ebdcb9" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M 60 40 L 280 190" stroke="#ebdcb9" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M 120 20 L 120 180" stroke="#ebdcb9" strokeWidth="1.5" />
          <path d="M 220 20 L 220 180" stroke="#ebdcb9" strokeWidth="1.5" />

          {/* Delivery route path */}
          {isDelivery && (
            <path
              id="delivery-route"
              d={riderPath}
              stroke="var(--golden)"
              strokeWidth="2.5"
              strokeDasharray="4 4"
            />
          )}

          {/* Branch Marker */}
          <circle cx={branchCoords.x} cy={branchCoords.y} r="8" fill="var(--espresso)" />
          <circle cx={branchCoords.x} cy={branchCoords.y} r="4" fill="var(--honey)" />
          <text x={branchCoords.x - 10} y={branchCoords.y + 20} className="font-mono text-[9px] fill-espresso font-bold">
            {branch?.name.split(" ")[0] ?? "Branch"}
          </text>

          {/* Destination Marker */}
          {isDelivery ? (
            <>
              <circle cx={destinationCoords.x} cy={destinationCoords.y} r="8" fill="var(--cinnamon)" />
              <circle cx={destinationCoords.x} cy={destinationCoords.y} r="4" fill="white" />
              <text x={destinationCoords.x - 20} y={destinationCoords.y - 12} className="font-mono text-[9px] fill-cinnamon font-bold">
                Destination
              </text>
            </>
          ) : (
            <text x={branchCoords.x + 18} y={branchCoords.y + 4} className="font-editorial text-[11px] italic fill-cinnamon">
              (Pickup at branch)
            </text>
          )}

          {/* Rider Chip */}
          {isDelivery && order.status === "OUT_FOR_DELIVERY" && (
            <g>
              <circle r="11" fill="var(--cinnamon)">
                <animateMotion dur="10s" repeatCount="indefinite" path={riderPath} />
              </circle>
              {/* Rider Bike Icon Dot */}
              <circle r="5" fill="white">
                <animateMotion dur="10s" repeatCount="indefinite" path={riderPath} />
              </circle>
            </g>
          )}
        </svg>

        {/* Floating details overlay */}
        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg border border-crust p-2.5 max-w-[150px]">
          <div className="font-mono text-[8px] uppercase tracking-[0.16em] text-caramel">Rider</div>
          <div className="text-[11.5px] font-bold text-espresso">
            {order.status === "OUT_FOR_DELIVERY" ? "Nguyễn Văn Hùng 🛵" : "Waiting for pickup..."}
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
              className="h-full rounded-full bg-cinnamon transition-all duration-1000"
              style={{ width: `${progress}%` }}
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
                <span className="font-mono text-[12px] font-bold text-cinnamon mr-2">{it.quantity}x</span>
                {it.product_name}
              </span>
              <span className="font-mono">{formatVND(it.total_price)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center">
          <span className="font-display text-[16px] text-espresso">Total amount</span>
          <span className="font-display text-[20px] text-espresso">{formatVND(order.total_amount)}</span>
        </div>
      </div>
    </main>
  );
}
