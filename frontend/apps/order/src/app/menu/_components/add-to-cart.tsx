"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useTransitionRouter as useRouter } from "next-view-transitions";
import { useCartStore } from "@/store/cart";
import type { Product } from "@repo/api-client";
import { formatVND } from "@/lib/format";

type CartProduct = Product & {
  price?: number;
  base_price?: number;
  category_id?: string;
  category?: { id?: string };
};

const DESKTOP_CART_MEDIA_QUERY = "(min-width: 1024px)";

function getProductPrice(product: Product) {
  const cartProduct = product as CartProduct;
  return cartProduct.price ?? cartProduct.base_price ?? 0;
}

function getProductCategoryId(product: Product) {
  const cartProduct = product as CartProduct;
  return cartProduct.category_id ?? cartProduct.category?.id ?? "";
}

export function AddToCartSection({ product }: { product: Product }) {
  const t = useTranslations("menu");
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const unitPrice = getProductPrice(product);
  const totalPrice = unitPrice * quantity;

  const handleAdd = () => {
    addItem({
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: "",
        basePrice: unitPrice,
        image: "",
        category: getProductCategoryId(product),
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
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-caramel">
          {t("quantity")}
        </span>
        <div className="flex min-h-12 items-center rounded-full border-2 border-espresso bg-cream shadow-[5px_5px_0_var(--espresso)]">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="flex h-12 w-12 items-center justify-center rounded-full text-xl transition-transform active:scale-90"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="min-w-10 text-center font-mono text-sm font-black tabular-nums text-espresso">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity(quantity + 1)}
            className="flex h-12 w-12 items-center justify-center rounded-full text-xl transition-transform active:scale-90"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      <div className="mb-5 rounded-[1.5rem] border border-crust-deep bg-butter/70 p-4 text-center">
        <span className="font-editorial text-[14px] italic text-caramel">
          {t("totalLabel")}:{" "}
        </span>
        <span className="font-display text-2xl text-espresso">
          {formatVND(totalPrice)}
        </span>
      </div>

      {!added ? (
        <button
          onClick={handleAdd}
          className="bkr-press flex min-h-14 w-full items-center justify-between rounded-full bg-espresso px-5 py-3 font-mono text-[11px] font-black uppercase tracking-[0.16em] text-cream shadow-[0_16px_30px_-20px_rgba(44,24,16,0.8)]"
        >
          <span>{t("addToCart")}</span>
          <span aria-hidden="true">→</span>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-[1.25rem] border border-sage/30 bg-sage/10 p-3 text-center text-sm font-bold text-sage">
            ✓ {t("addedToCart")}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/menu")}
              className="min-h-12 flex-1 rounded-full border border-crust-deep bg-white px-3 py-3 text-sm font-bold transition-colors hover:border-cinnamon"
            >
              {t("continueShopping")}
            </button>
            <button
              onClick={() => {
                if (window.matchMedia(DESKTOP_CART_MEDIA_QUERY).matches) {
                  const cartState = useCartStore.getState?.();
                  if (cartState?.setCartOpen) {
                    cartState.setCartOpen(true);
                    router.push("/menu");
                  } else {
                    router.push("/cart");
                  }
                } else {
                  router.push("/cart");
                }
              }}
              className="min-h-12 flex-1 rounded-full bg-espresso px-3 py-3 text-sm font-bold text-cream transition-colors hover:bg-cinnamon"
            >
              {t("viewCart")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
