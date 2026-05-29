"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cart";
import type { Product } from "@repo/api-client";
import { formatVND } from "@/lib/format";

export function AddToCartSection({ product }: { product: Product }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const unitPrice = product.price;
  const totalPrice = unitPrice * quantity;

   const handleAdd = () => {
     addItem({
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
       quantity,
       unitPrice,
     });
     setAdded(true);
   };

  return (
    <>
      <div className="flex items-center gap-4 mb-6">
        <span className="text-sm font-medium">Quantity</span>
        <div className="flex items-center border border-crust rounded-full">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="px-3 py-1 text-lg"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="px-3 font-semibold">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity(quantity + 1)}
            className="px-3 py-1 text-lg"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      <div className="bg-white border border-crust rounded-[10px] p-4 mb-6 text-center">
        <span className="text-sm text-espresso/60">Total: </span>
        <span className="font-heading text-xl font-bold text-golden">{formatVND(totalPrice)}</span>
      </div>

      {!added ? (
        <button onClick={handleAdd} className="w-full rounded-[10px] bg-golden py-3 font-semibold text-white transition-colors transition-transform hover:bg-golden-dark active:scale-[0.97]">
          Add to Cart
        </button>
      ) : (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-[10px] p-3 text-center text-green-800 text-sm font-medium">
            ✓ Added to cart!
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push("/menu")} className="flex-1 border border-crust py-3 rounded-[10px] font-medium hover:border-golden transition-colors">
              Continue Shopping
            </button>
            <button onClick={() => router.push("/cart")} className="flex-1 bg-golden hover:bg-golden-dark text-white py-3 rounded-[10px] font-semibold transition-colors">
              View Cart
            </button>
          </div>
        </div>
      )}
    </>
  );
}
