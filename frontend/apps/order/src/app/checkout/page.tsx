"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PartyPopper } from "lucide-react";
import { z } from "zod";
import { createOrder } from "@repo/api-client";
import { useCartStore } from "@/store/cart";
import { formatVND } from "@/lib/format";

const checkoutSchema = z.object({
  items: z.array(z.any()).min(1, "Cart cannot be empty"),
  branchId: z.string().min(1, "No branch selected"),
});

const DELIVERY_FEE = 30000;

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const branchId = useCartStore((s) => s.branchId);
  const subtotal = useCartStore((s) => s.subtotal);
  const clearCart = useCartStore((s) => s.clearCart);

  const [ordered, setOrdered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (items.length === 0 && !ordered) router.replace("/menu");
  }, [items, ordered, router]);

  if (ordered) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <PartyPopper className="mx-auto text-golden mb-4" size={48} aria-hidden="true" />
        <h1 className="font-heading text-2xl font-bold mb-2">Order Placed!</h1>
        <p className="text-espresso/60 mb-6">Thank you for your order. We&apos;ll prepare it fresh for you.</p>
        <Link href="/orders" className="inline-block bg-golden hover:bg-golden-dark text-white font-semibold px-6 py-3 rounded-[10px] transition-colors">
          View Orders
        </Link>
      </main>
    );
  }

  if (items.length === 0) return null;

  const sub = subtotal();
  const total = sub + DELIVERY_FEE;

  const handlePlaceOrder = async () => {
    const validation = checkoutSchema.safeParse({ items, branchId });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    try {
      await createOrder(
        items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
        branchId!,
        note || undefined
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
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-heading text-2xl font-bold mb-6">Checkout</h1>

      <section className="bg-white border border-crust rounded-[10px] p-4 mb-5">
        <h2 className="font-semibold mb-3">Order Summary</h2>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.product.name} × {item.quantity}</span>
              <span className="font-medium">{formatVND(item.unitPrice * item.quantity)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-crust rounded-[10px] p-4 mb-5">
        <label htmlFor="order-note" className="font-semibold mb-3 block">Note</label>
        <textarea
          id="order-note"
          value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Any special requests?"
          className="w-full border border-crust rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-golden resize-none h-20"
        />
      </section>

      <section className="bg-white border border-crust rounded-[10px] p-4 mb-5 space-y-2 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>{formatVND(sub)}</span></div>
        <div className="flex justify-between"><span>Delivery Fee</span><span>{formatVND(DELIVERY_FEE)}</span></div>
        <div className="flex justify-between font-bold text-base border-t border-crust pt-2">
          <span>Total</span><span className="text-golden">{formatVND(total)}</span>
        </div>
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-[10px] p-3 mb-5 text-center text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      <button
        onClick={handlePlaceOrder}
        disabled={submitting}
        className="w-full bg-golden hover:bg-golden-dark disabled:opacity-50 text-white font-semibold py-3 rounded-[10px] transition-colors"
      >
        {submitting ? "Placing Order..." : `Place Order — ${formatVND(total)}`}
      </button>
    </main>
  );
}
