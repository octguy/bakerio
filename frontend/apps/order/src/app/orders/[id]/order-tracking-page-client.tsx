"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getOrder } from "@repo/api-client";
import type { Order } from "@repo/api-client";
import { formatVND } from "@/lib/format";
import { Link } from "next-view-transitions";

interface OrderTrackingPageClientProps {
  id: string;
}

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
  const t = useTranslations("orders");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderDetails = async () => {
    try {
      setError(null);
      setOrder(await getOrder(id));
    } catch (err) {
      setError(t("tracking.refreshError"));
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
        {t("tracking.finding")}
      </main>
    );
  }

  if (!order) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center bg-cream min-h-screen">
        <h1 className="font-display text-[24px] text-espresso">{t("tracking.notFound")}</h1>
        <p className="font-editorial text-[14px] italic text-caramel mt-2">{t("tracking.couldNotLocate", { id })}</p>
        <Link href="/orders" className="mt-6 inline-block font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-cinnamon">
          ← {t("tracking.backToOrders")}
        </Link>
      </main>
    );
  }

  const statusKey = order.status.toLowerCase().replace(/_/g, "") as string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentStatusTitle = t(`tracking.status.${statusKey}.title` as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentStatusDesc = t(`tracking.status.${statusKey}.desc` as any);

  return (
    <main className="mx-auto max-w-md px-6 pt-4 pb-32 bg-cream min-h-screen flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <Link href="/orders" aria-label={t("tracking.backToOrders")} className="text-[22px] text-espresso">‹</Link>
        <div className="text-center">
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-caramel">
            {isTerminal ? t("tracking.orderDetail") : t("tracking.orderStatus")}
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
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-caramel">{t("tracking.currentStatus")}</div>
        <h2 className="font-display text-[26px] leading-[1.05] tracking-tight text-espresso mt-1.5">
          {currentStatusTitle}
        </h2>
        <p className="font-editorial text-[14.5px] italic text-cinnamon mt-1">
          {currentStatusDesc}
        </p>
      </div>

      {/* Basket Details */}
      <div className="rounded-2xl border border-crust bg-white p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-caramel mb-3">{t("tracking.orderBasket")}</div>
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
              <span>{t("tracking.subtotal")}</span>
              <span className="font-mono tabular-nums">{formatVND(order.subtotal_amount)}</span>
            </div>
            {order.loyalty_discount_amount ? (
              <div className="flex justify-between text-sage font-semibold">
                <span>{t("tracking.discount")}</span>
                <span className="font-mono tabular-nums">−{formatVND(order.loyalty_discount_amount)}</span>
              </div>
            ) : null}
            {order.delivery_fee_amount ? (
              <div className="flex justify-between">
                <span>{t("tracking.deliveryFee")}</span>
                <span className="font-mono tabular-nums">{formatVND(order.delivery_fee_amount)}</span>
              </div>
            ) : null}
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="font-display text-[16px] text-espresso">{t("tracking.totalAmount")}</span>
          <span className="font-display tabular-nums text-[20px] text-espresso">{formatVND(order.total_amount)}</span>
        </div>
      </div>

      {/* Fulfillment Details */}
      <div className="mt-4 rounded-2xl border border-crust bg-white p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-caramel mb-3">
          {order.fulfillment_mode === "PICKUP" ? t("tracking.pickup") : t("tracking.shipping")}
        </div>
        <div className="flex flex-col gap-2.5 text-[13.5px] text-espresso">
          {order.branch_name && (
            <div className="flex flex-col gap-1">
              <span className="text-cocoa text-left">{t("tracking.fromBranch")}</span>
              <span className="text-[12.5px] italic text-cinnamon text-left">{order.branch_name}</span>
            </div>
          )}
          {order.delivery_address && (
            <div className="flex flex-col gap-1 border-t border-crust/50 pt-2">
              <span className="text-cocoa text-left">{t("tracking.deliverTo")}</span>
              <span className="text-[12.5px] italic text-cinnamon text-left">{order.delivery_address}</span>
            </div>
          )}
          {order.contact_phone && (
            <div className="flex flex-col gap-1 border-t border-crust/50 pt-2">
              <span className="text-cocoa text-left">{t("tracking.contact")}</span>
              <span className="font-mono text-[12.5px] tabular-nums tracking-wide text-cinnamon text-left">{order.contact_phone}</span>
            </div>
          )}
          {order.note && (
            <div className="flex flex-col gap-1 border-t border-crust/50 pt-2">
              <span className="text-cocoa text-left">{t("tracking.note")}</span>
              <span className="text-[12.5px] italic text-caramel text-left">{order.note}</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
