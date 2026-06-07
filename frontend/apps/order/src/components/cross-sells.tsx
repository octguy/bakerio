"use client";

import { useTranslations } from "next-intl";
import { useCartStore } from "@/store/cart";
import { useCrossSellProducts } from "@/hooks/use-cross-sell";
import { formatVND } from "@/lib/format";
import { motion } from "framer-motion";
import type { Product } from "@repo/api-client";

type CartProduct = Product & {
  price?: number;
  base_price?: number;
  category_id?: string;
  category?: { id?: string };
};

function getProductPrice(product: Product) {
  const cartProduct = product as CartProduct;
  return cartProduct.price ?? cartProduct.base_price ?? 0;
}

function getProductCategoryId(product: Product) {
  const cartProduct = product as CartProduct;
  return cartProduct.category_id ?? cartProduct.category?.id ?? "";
}

export function CrossSells() {
  const t = useTranslations("cart");
  const { items, addItem } = useCartStore();
  const { recommendations, loading } = useCrossSellProducts(items);

  if (loading || recommendations.length === 0) return null;

  return (
    <div className="mt-8 pt-8 border-t border-border">
      <h3 className="text-xl font-display font-medium mb-4 text-espresso">{t("perfectPairings")}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {recommendations.map((product, i) => {
          const price = getProductPrice(product);
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={product.id}
              className="group relative flex flex-col p-4 bg-sand/30 rounded-xl border border-border overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cream to-sand opacity-50 z-0"></div>
              <div className="relative z-10 flex justify-between items-start mb-2">
                <div className="flex flex-col">
                  <span className="font-medium text-espresso line-clamp-1">{product.name}</span>
                  <span className="text-sm font-mono text-muted-foreground">{formatVND(price)}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  addItem({
                    product: {
                      id: product.id,
                      name: product.name,
                      slug: product.slug,
                      description: "",
                      basePrice: price,
                      image: "",
                      category: getProductCategoryId(product),
                      options: [],
                    },
                    choices: [],
                    quantity: 1,
                    unitPrice: price,
                  });
                }}
                className="mt-auto relative z-10 w-full py-2 bg-espresso text-white rounded-lg font-medium text-sm hover:bg-caramel transition-colors flex items-center justify-center gap-2 group-hover:scale-[1.02] active:scale-95 duration-200"
              >
                <span>{t("add")}</span>
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
