"use client";

import Link from "next/link";
import { Croissant } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { formatVND } from "@/lib/format";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const subtotal = useCartStore((s) => s.subtotal);

  if (items.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="font-heading text-2xl font-bold mb-3">Your cart is empty</h1>
        <p className="text-espresso/60 mb-6">Add some delicious items from our menu</p>
        <Link href="/menu" className="inline-block bg-golden hover:bg-golden-dark text-white font-semibold px-6 py-3 rounded-[10px] transition-colors">
          Browse Menu
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-heading text-2xl font-bold mb-6">Your Cart</h1>

      <div className="space-y-4 mb-6">
        {items.map((item) => (
          <div key={item.id} className="bg-white border border-crust rounded-[10px] p-4 flex gap-4">
            <div className="w-16 h-16 bg-latte rounded-lg flex-shrink-0 flex items-center justify-center">
              <Croissant className="text-golden" size={24} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">{item.product.name}</h3>
              <p className="text-xs text-espresso/50 truncate">
                {item.choices.map((c) => c.choiceLabel).join(", ")}
              </p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center border border-crust rounded-full text-sm">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-2 py-0.5">−</button>
                  <span className="px-2 font-medium">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-2 py-0.5">+</button>
                </div>
                <span className="font-semibold text-sm text-golden">
                  {formatVND(item.unitPrice * item.quantity)}
                </span>
              </div>
            </div>
            <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 text-lg self-start">×</button>
          </div>
        ))}
      </div>

      <div className="bg-white border border-crust rounded-[10px] p-4 mb-6 flex justify-between items-center">
        <span className="font-medium">Subtotal</span>
        <span className="font-heading text-xl font-bold text-golden">{formatVND(subtotal())}</span>
      </div>

      <div className="flex gap-3">
        <Link href="/menu" className="flex-1 text-center border border-crust py-3 rounded-[10px] font-medium hover:border-golden transition-colors">
          Continue Shopping
        </Link>
        <Link href="/checkout" className="flex-1 text-center bg-golden hover:bg-golden-dark text-white py-3 rounded-[10px] font-semibold transition-colors">
          Proceed to Checkout
        </Link>
      </div>
    </main>
  );
}
