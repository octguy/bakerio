"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Croissant } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { formatVND } from "@/lib/format";
import { maxRedeemableFor } from "@repo/api-client/mock/loyalty";

export default function SidebarCart() {
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const subtotal = useCartStore((s) => s.subtotal());
  const setCartOpen = useCartStore((s) => s.setCartOpen);

  const [loyalty, setLoyalty] = useState(0);

  useEffect(() => {
    let active = true;
    const loadLoyalty = async () => {
      try {
        const disc = await maxRedeemableFor(subtotal);
        if (active) {
          setLoyalty(disc);
        }
      } catch {
        if (active) {
          setLoyalty(0);
        }
      }
    };
    loadLoyalty();
    return () => {
      active = false;
    };
  }, [subtotal]);

  const total = Math.max(0, subtotal - loyalty);
  const handleCloseCart = () => setCartOpen(false);

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col bg-[radial-gradient(circle_at_50%_20%,var(--butter),transparent_44%)] p-5">
        <div className="flex items-center justify-between rounded-[1.5rem] border border-crust-deep bg-white px-4 py-3 shadow-[0_18px_34px_-28px_rgba(44,24,16,0.8)]">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-cinnamon">
            ◆ your basket
          </div>
          <button
            type="button"
            onClick={handleCloseCart}
            className="text-[20px] leading-none font-mono text-caramel hover:text-espresso"
            aria-label="Close cart"
          >
            ×
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <h2 className="font-display text-[24px] leading-tight text-espresso">
            Nothing in the basket{" "}
            <span className="font-editorial text-cinnamon">yet.</span>
          </h2>
          <p className="mt-2 font-editorial text-[13px] italic text-caramel">
            Bring something warm in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[linear-gradient(180deg,var(--cream),#fffaf3)] p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between rounded-[1.5rem] border border-crust-deep bg-white px-4 py-3 shadow-[0_18px_34px_-28px_rgba(44,24,16,0.8)]">
        <div>
          <div className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-caramel">
            counter ticket
          </div>
          <h2 className="font-display text-[22px] leading-none text-espresso">
            Your basket
          </h2>
        </div>
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={clearCart}
            className="font-mono text-[10px] tracking-[0.1em] text-caramel hover:text-espresso"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleCloseCart}
            className="text-[20px] leading-none font-mono text-caramel hover:text-espresso"
            aria-label="Close cart"
          >
            ×
          </button>
        </div>
      </div>

      {/* Line items */}
      <div className="flex-1 overflow-y-auto pr-1">
        {items.map((item, i) => (
          <div
            key={item.id}
            className={`flex items-start gap-3 py-3 ${i < items.length - 1 ? "border-b border-crust" : ""}`}
          >
            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl bg-butter">
              {item.product.image ? (
                <Image
                  src={item.product.image}
                  alt={item.product.name}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Croissant
                    className="text-cinnamon"
                    size={16}
                    aria-hidden="true"
                  />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-display text-[14px] leading-tight tracking-tight text-espresso line-clamp-2">
                {item.product.name}
              </h4>
              <div className="mt-0.5 font-editorial text-[11px] text-cinnamon line-clamp-1">
                {item.choices.map((c) => c.choiceLabel).join(" · ")}
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <div className="font-display tabular-nums text-[13px] leading-none text-espresso">
                  {formatVND(item.unitPrice * item.quantity)}
                </div>
                <div className="inline-flex min-h-7 items-center rounded-full border border-crust-deep bg-white font-mono text-[10px]">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="flex h-[20px] w-[20px] items-center justify-center text-caramel hover:text-espresso"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="min-w-[16px] tabular-nums text-center font-bold text-espresso">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="flex h-[20px] w-[20px] items-center justify-center text-espresso"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="mt-4 shrink-0 rounded-[1.5rem] border border-crust-deep bg-white p-4 shadow-[0_18px_40px_-34px_rgba(44,24,16,0.75)]">
        {[
          { l: "Subtotal", v: formatVND(subtotal) },
          { l: "Loyalty", v: `−${formatVND(loyalty)}`, accent: true },
        ].map((r) => (
          <div
            key={r.l}
            className="flex justify-between py-1 text-[12px] font-medium"
            style={{
              color: r.accent ? "var(--sage)" : "var(--cocoa)",
              fontWeight: r.accent ? 600 : 500,
            }}
          >
            <span>{r.l}</span>
            <span className="font-mono tabular-nums">{r.v}</span>
          </div>
        ))}
        <div className="mt-2 flex items-baseline justify-between border-t border-crust pt-2">
          <span className="font-display text-[16px] text-espresso">Total</span>
          <span className="font-display tabular-nums text-[20px] tracking-tight text-espresso">
            {formatVND(total)}
          </span>
        </div>
      </div>

      {/* Checkout button */}
      <div className="mt-4 shrink-0">
        <Link
          href="/checkout"
          onClick={handleCloseCart}
          className="bkr-press flex min-h-14 w-full items-center justify-between rounded-full bg-espresso px-5 py-3 font-mono text-[11px] font-black uppercase tracking-[0.08em] text-cream shadow-[0_16px_30px_-20px_rgba(44,24,16,0.8)] transition-colors hover:bg-cinnamon"
        >
          <span className="tabular-nums">Pay {formatVND(total)}</span>
          <span className="flex items-center gap-1.5">
            <span className="opacity-75">Continue</span>
            <span aria-hidden="true">→</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
