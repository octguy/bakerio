"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { createOrder } from "@repo/api-client";
import { getLoyalty, maxRedeemableFor, redeemCrumbs } from "@repo/api-client/mock/loyalty";
import type { LoyaltyBalance } from "@repo/api-client/mock/loyalty";
import { useCartStore } from "@/store/cart";
import { formatVND } from "@/lib/format";

const checkoutSchema = z.object({
  items: z.array(z.any()).min(1, "Cart cannot be empty"),
  branchId: z.string().min(1, "No branch selected"),
});

const TIMES = [
  { l: "ASAP", s: "15–25m" },
  { l: "07:30", s: "today" },
  { l: "08:00", s: "today" },
  { l: "08:30", s: "today" },
  { l: "09:00", s: "today" },
];

const PAY_METHODS = [
  { l: "Apple Pay", s: "Touch ID · ★", color: "#000" },
  { l: "Momo wallet", s: "•••• 4421", color: "#a50064", letters: "M" },
  { l: "Visa", s: "•••• 7011", color: "#1a1f71", letters: "VISA" },
  { l: "Pay at counter", s: "cash or QR", color: "var(--crust)", letters: "$" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const branchId = useCartStore((s) => s.branchId);
  const subtotal = useCartStore((s) => s.subtotal());
  const clearCart = useCartStore((s) => s.clearCart);

  const [mode, setMode] = useState<"Pickup" | "Delivery">("Pickup");
  const [selectedTime, setSelectedTime] = useState(0);
  const [payMethod, setPayMethod] = useState(3); // Default to "Pay at counter"
  const [useCrumbs, setUseCrumbs] = useState(true);
  const [ordered, setOrdered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [loyalty, setLoyalty] = useState<LoyaltyBalance | undefined>(undefined);
  const [maxDiscount, setMaxDiscount] = useState<number>(0);

  useEffect(() => {
    if (items.length === 0 && !ordered) router.replace("/menu");
  }, [items, ordered, router]);

  useEffect(() => {
    const loadLoyaltyData = async () => {
      try {
        const bal = await getLoyalty();
        setLoyalty(bal);
        const disc = await maxRedeemableFor(subtotal);
        setMaxDiscount(disc);
      } catch (err) {
        console.error("Failed to load loyalty:", err);
      }
    };
    loadLoyaltyData();
  }, [subtotal]);

  if (ordered) {
    return (
      <main className="mx-auto max-w-md px-6 pt-16 pb-32 text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-cinnamon font-display text-[40px] text-white">
          ✓
        </div>
        <h1 className="font-display text-[36px] leading-[0.95] tracking-tight text-espresso">
          Order placed. <span className="font-editorial text-cinnamon">Out of the oven soon.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xs font-editorial text-[14px] italic text-caramel">
          We&apos;ll text when your basket is ready.
        </p>
        <Link
          href="/orders"
          className="bkr-press mt-8 inline-flex items-center gap-2 rounded-full bg-espresso px-6 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-cream"
        >
          Track my order <span>→</span>
        </Link>
      </main>
    );
  }

  if (items.length === 0) return null;

  const crumbsDiscount = useCrumbs ? maxDiscount : 0;
  const potentialCrumbsNeeded = Math.ceil(maxDiscount / 50);
  const deliveryFee = mode === "Delivery" ? 30000 : 0;
  const total = Math.max(0, subtotal + deliveryFee - crumbsDiscount);

  const handlePlaceOrder = async () => {
    const validation = checkoutSchema.safeParse({ items, branchId });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    try {
      if (useCrumbs && potentialCrumbsNeeded > 0) {
        await redeemCrumbs(potentialCrumbsNeeded);
      }
      await createOrder(
        items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        branchId!,
        undefined,
      );
      clearCart();
      setOrdered(true);
    } catch {
      setError("Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-6 pt-4 pb-44">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <Link href="/cart" className="text-[22px] text-espresso">‹</Link>
        <div className="text-center">
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-caramel">step 3 / 3</div>
          <div className="font-display text-[16px] leading-none text-espresso">Checkout</div>
        </div>
        <span className="font-mono text-[11px] tracking-[0.1em] text-caramel">Help</span>
      </div>

      {/* Progress */}
      <div className="mb-4 flex items-center gap-1.5">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-[3px] flex-1 rounded-sm bg-cinnamon" />
        ))}
      </div>

      {/* Mode toggle */}
      <div className="mb-3 flex rounded-full bg-butter p-1">
        {(["Pickup", "Delivery"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMode(tab)}
            className={`flex-1 rounded-full py-2.5 text-center text-[13px] font-bold tracking-wide transition-colors ${
              mode === tab ? "bg-espresso text-white" : "text-cocoa"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Location card */}
      <div className="mb-3 rounded-2xl border border-crust bg-white p-4">
        <div className="mb-1 font-mono text-[9px] uppercase tracking-[0.2em] text-caramel">
          {mode === "Pickup" ? "Pickup at" : "Deliver to"}
        </div>
        <div className="font-display text-[22px] leading-[1.05] tracking-tight text-espresso">
          {mode === "Pickup" ? "Lê Lợi Flagship" : "24 Nguyễn Đình Chiểu"}
        </div>
        <div className="mt-0.5 font-editorial text-[13px] text-cinnamon">
          {mode === "Pickup" ? "42 Lê Lợi, Q.1 — 0.8 km" : "Q.3 · Home"}
        </div>
        <div className="mt-3 flex items-center gap-2.5 text-[12px] text-cocoa">
          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-sage">● OPEN</span>
          <span className="font-mono text-[11px] text-caramel">06–22</span>
          <span className="ml-auto font-mono text-[11px] font-bold tracking-[0.16em] text-cinnamon">
            CHANGE
          </span>
        </div>
      </div>

      {/* When */}
      <div className="mb-3 rounded-2xl border border-crust bg-white p-4">
        <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-caramel">When?</div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
          {TIMES.map((s, i) => {
            const active = i === selectedTime;
            return (
              <button
                key={i}
                onClick={() => setSelectedTime(i)}
                className={`min-w-[78px] flex-shrink-0 rounded-lg px-3 py-2 text-center transition-colors ${
                  active ? "bg-espresso text-white" : "border border-crust bg-butter text-espresso"
                }`}
              >
                <div className="font-display text-[16px]">{s.l}</div>
                <div className="font-mono text-[9.5px] tracking-[0.1em] opacity-80">{s.s}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Payment */}
      <div className="mb-3">
        <div className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.22em] text-caramel">Pay with</div>
        <div className="flex flex-col gap-2">
          {PAY_METHODS.map((p, i) => {
            const active = i === payMethod;
            const isStub = i < 3;
            return (
              <button
                key={p.l}
                disabled={isStub}
                onClick={() => setPayMethod(i)}
                className={`flex items-center gap-3 rounded-xl p-3.5 text-left ${
                  active ? "border-2 border-cinnamon bg-white shadow-sm" : "border border-crust bg-white"
                } ${isStub ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <div
                  className="flex h-6 w-9 items-center justify-center rounded text-[9px] font-bold tracking-wider text-white"
                  style={{ background: p.color }}
                >
                  {p.letters ?? ""}
                </div>
                <div className="flex-1">
                  <div className="text-[13.5px] font-semibold text-espresso">{p.l}</div>
                  <div className="font-mono text-[10px] tracking-[0.08em] text-caramel">{p.s}</div>
                </div>
                {isStub ? (
                  <span className="rounded bg-caramel/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-caramel">
                    coming soon
                  </span>
                ) : (
                  <span
                    className="h-[18px] w-[18px] rounded-full border-[1.5px]"
                    style={{
                      background: active ? "var(--cinnamon)" : "transparent",
                      borderColor: active ? "var(--cinnamon)" : "var(--crust-deep)",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loyalty */}
      <button
        onClick={() => setUseCrumbs((s) => !s)}
        className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-golden/30 bg-butter p-3 text-left"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-honey font-display text-[15px] text-espresso">
          ✦
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-semibold text-espresso">
            Use {potentialCrumbsNeeded} crumbs (−{formatVND(crumbsDiscount).replace("₫", "")}₫)
          </div>
          <div className="font-editorial text-[11.5px] italic text-caramel">
            You have {loyalty?.balance.toLocaleString() ?? "1,420"} in your jar.
          </div>
        </div>
        <div
          className="relative h-[22px] w-[36px] rounded-full transition-colors"
          style={{ background: useCrumbs ? "var(--sage)" : "var(--crust-deep)" }}
        >
          <div
            className="absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow"
            style={{ left: useCrumbs ? "auto" : "2px", right: useCrumbs ? "2px" : "auto" }}
          />
        </div>
      </button>

      {error && (
        <p className="mb-3 rounded-md border border-sienna/30 bg-sienna/10 px-3 py-2 text-center font-mono text-[11px] text-sienna">
          {error}
        </p>
      )}

      <div className="h-40" />

      {/* Sticky bottom */}
      <div
        className="fixed bottom-16 left-0 right-0 px-6 pb-3 pt-3"
        style={{ background: "linear-gradient(180deg, transparent, var(--cream) 30%)" }}
      >
        <div className="mb-3 rounded-2xl border border-crust bg-white p-3.5">
          <div className="flex justify-between py-0.5 text-[12px] text-cocoa">
            <span>Subtotal</span>
            <span className="font-mono">{formatVND(subtotal).replace("₫", "")}₫</span>
          </div>
          {crumbsDiscount > 0 && (
            <div className="flex justify-between py-0.5 text-[12px] font-semibold text-sage">
              <span>Crumbs · {potentialCrumbsNeeded}</span>
              <span className="font-mono">−{formatVND(crumbsDiscount).replace("₫", "")}₫</span>
            </div>
          )}
          {deliveryFee > 0 && (
            <div className="flex justify-between py-0.5 text-[12px] text-cocoa">
              <span>Delivery</span>
              <span className="font-mono">{formatVND(deliveryFee).replace("₫", "")}₫</span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-crust pt-2">
            <span className="font-display text-[18px]">Total</span>
            <span className="font-display text-[22px] text-espresso">
              {formatVND(total).replace("₫", "")}
              <span className="ml-0.5 text-[12px] text-cinnamon">₫</span>
            </span>
          </div>
        </div>

        <button
          onClick={handlePlaceOrder}
          disabled={submitting}
          className="bkr-press flex w-full items-center justify-between rounded-full bg-espresso px-5 py-4 font-mono text-[12px] font-semibold uppercase tracking-[0.06em] text-cream disabled:opacity-50"
        >
          <span>{submitting ? "Placing…" : `Pay with ${PAY_METHODS[payMethod].l}`}</span>
          <span>→</span>
        </button>
      </div>
    </main>
  );
}
