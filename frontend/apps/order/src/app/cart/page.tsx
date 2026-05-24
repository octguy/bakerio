"use client";

import Link from "next/link";
import Image from "next/image";
import { Croissant } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useCartStore } from "@/store/cart";
import { formatVND } from "@/lib/format";

export default function CartPage() {
  return (
    <ProtectedRoute>
      <CartPageInner />
    </ProtectedRoute>
  );
}

function CartPageInner() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const subtotal = useCartStore((s) => s.subtotal());
  const loyalty = Math.round(subtotal * 0.05);
  const total = Math.max(0, subtotal - loyalty);

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-md px-6 pt-16 pb-32 text-center">
        <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.22em] text-cinnamon">
          ◆ your basket
        </div>
        <h1 className="font-display text-[36px] leading-[0.95] tracking-tight text-espresso">
          Nothing in the basket <span className="font-editorial text-cinnamon">yet.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xs font-editorial text-[14px] italic text-caramel">
          Bring something warm in. We&apos;ll keep the oven on.
        </p>
        <Link
          href="/menu"
          className="bkr-press mt-8 inline-flex items-center gap-2 rounded-full bg-espresso px-6 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-cream"
        >
          Browse menu <span>→</span>
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 pt-4 pb-40">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <Link href="/menu" className="text-[22px] text-espresso">‹</Link>
        <div className="text-center">
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-caramel">step 2 / 3</div>
          <div className="font-display text-[16px] leading-none text-espresso">Your basket</div>
        </div>
        <button
          onClick={() => items.forEach((it) => removeItem(it.id))}
          className="font-mono text-[11px] tracking-[0.1em] text-caramel"
        >
          Clear
        </button>
      </div>

      {/* Editorial line */}
      <h1
        className="mt-2 font-display tracking-tight"
        style={{ fontSize: "clamp(30px,8vw,38px)", lineHeight: 0.95, letterSpacing: "-0.02em" }}
      >
        {items.reduce((s, i) => s + i.quantity, 0)} items, baked{" "}
        <span className="font-editorial text-cinnamon">fresh.</span>
      </h1>

      {/* Pickup card */}
      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-crust bg-white p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-butter font-display text-[14px] text-cinnamon">
          📍
        </div>
        <div className="flex-1">
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-caramel">Pickup</div>
          <div className="text-[14px] font-semibold text-espresso">Lê Lợi Flagship — 0.8 km</div>
          <div className="mt-0.5 font-editorial text-[12px] text-cinnamon">Ready in 15–25 minutes</div>
        </div>
        <span className="text-[18px] text-caramel">›</span>
      </div>

      {/* Line items */}
      <div className="mt-3">
        {items.map((item, i) => (
          <div
            key={item.id}
            className={`flex items-center gap-3 py-3.5 ${i < items.length - 1 ? "border-b border-crust" : ""}`}
          >
            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-butter">
              {item.product.image ? (
                <Image src={item.product.image} alt={item.product.name} fill className="object-cover" sizes="56px" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Croissant className="text-cinnamon" size={20} aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-display text-[15px] leading-[1.1] tracking-tight text-espresso">
                {item.product.name}
              </h4>
              <div className="mt-0.5 font-editorial text-[11.5px] text-cinnamon line-clamp-1">
                {item.choices.map((c) => c.choiceLabel).join(" · ") || item.product.category}
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-[14px] leading-none text-espresso">
                {formatVND(item.unitPrice * item.quantity).replace("₫", "")}
                <span className="ml-0.5 text-[10px] text-caramel">₫</span>
              </div>
              <div className="mt-2 inline-flex items-center rounded-full border border-crust font-mono text-[11px]">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="flex h-[22px] w-[22px] items-center justify-center text-caramel"
                >
                  −
                </button>
                <span className="min-w-[18px] text-center font-bold text-espresso">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="flex h-[22px] w-[22px] items-center justify-center text-espresso"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Promo */}
      <div className="mt-3 flex items-center gap-2.5 rounded-2xl border border-dashed border-crust-deep bg-butter p-3">
        <span className="text-[16px]">🎟️</span>
        <div className="flex-1">
          <div className="text-[12.5px] text-cocoa">Add a promo code</div>
        </div>
        <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-cinnamon">
          Apply
        </span>
      </div>

      {/* Totals */}
      <div className="mt-3 rounded-2xl border border-crust bg-white p-4">
        {[
          { l: "Subtotal", v: `${formatVND(subtotal).replace("₫", "")}₫` },
          { l: "Pickup", v: "Free" },
          { l: "Loyalty (−5%)", v: `−${formatVND(loyalty).replace("₫", "")}₫`, accent: true },
        ].map((r) => (
          <div
            key={r.l}
            className="flex justify-between py-1.5 text-[13px] font-medium"
            style={{ color: r.accent ? "var(--sage)" : "var(--cocoa)", fontWeight: r.accent ? 600 : 500 }}
          >
            <span>{r.l}</span>
            <span className="font-mono">{r.v}</span>
          </div>
        ))}
        <div className="mt-3 flex items-baseline justify-between border-t border-crust pt-3">
          <span className="font-display text-[20px] text-espresso">Total</span>
          <span className="font-display text-[26px] tracking-tight text-espresso">
            {formatVND(total).replace("₫", "")}
            <span className="ml-0.5 text-[13px] text-cinnamon">₫</span>
          </span>
        </div>
      </div>

      <div className="h-28" />

      {/* Sticky CTA */}
      <div
        className="fixed bottom-16 left-0 right-0 px-6 pb-3 pt-3"
        style={{ background: "linear-gradient(180deg, transparent, var(--cream) 30%)" }}
      >
        <Link
          href="/checkout"
          className="bkr-press flex items-center justify-between rounded-full bg-espresso px-5 py-4 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-cream"
        >
          <span>Pay {formatVND(total).replace("₫", "")}₫</span>
          <span className="flex items-center gap-2">
            <span className="font-mono text-[11px] opacity-75">Continue</span>
            →
          </span>
        </Link>
        <div className="mt-2 text-center font-editorial text-[12.5px] italic text-caramel">
          You&apos;ll earn{" "}
          <strong className="font-sans text-cinnamon not-italic">{Math.round(subtotal / 1000)} crumbs</strong>{" "}
          with this order.
        </div>
      </div>
    </main>
  );
}
