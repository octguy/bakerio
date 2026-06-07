"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useCartStore } from "@/store/cart";
import type { Product } from "@repo/api-client";
import { formatVND } from "@/lib/format";

type CartProduct = Product & {
  price?: number;
  base_price?: number;
  category_id?: string;
  category?: { id?: string };
};

function getProductPrice(product: Product) {
  const p = product as CartProduct;
  return p.price ?? p.base_price ?? 0;
}

function getProductCategoryId(product: Product) {
  const p = product as CartProduct;
  return p.category_id ?? p.category?.id ?? "";
}

export function AddToCartSection({ product }: { product: Product }) {
  const t = useTranslations("menu");
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
    setTimeout(() => setAdded(false), 1500);
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

      <button
        onClick={handleAdd}
        disabled={added}
        style={{ viewTransitionName: "none" }}
        className={`bkr-press flex min-h-14 w-full items-center justify-between rounded-full px-5 py-3 font-mono text-[11px] font-black uppercase tracking-[0.16em] shadow-[0_16px_30px_-20px_rgba(44,24,16,0.8)] transition-colors ${
          added ? "bg-sage text-white" : "bg-espresso text-cream"
        }`}
      >
        <span>{added ? `✓ ${t("addedToCart")}` : t("addToCart")}</span>
        <span aria-hidden="true">{added ? "" : "→"}</span>
      </button>
    </>
  );
}
