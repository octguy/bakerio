"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Croissant } from "lucide-react";
import type { Product, Category } from "@repo/api-client";
import { formatVND } from "@/lib/format";
import { useCartStore } from "@/store/cart";

export function MenuGrid({ products, categories }: { products: Product[]; categories: Category[] }) {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const totalCount = items.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const filtered =
    activeCategory === "all"
      ? products
      : products.filter((p) => (p.category?.id || (p as any).category_id) === activeCategory);

  return (
    <>
      {/* Category chips */}
      <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-3 scrollbar-hide">
        <button
          type="button"
          aria-pressed={activeCategory === "all"}
          onClick={() => setActiveCategory("all")}
          className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors ${
            activeCategory === "all"
              ? "bg-espresso text-white"
              : "border border-crust bg-white text-espresso"
          }`}
        >
          All <span className="font-mono text-[10px] opacity-70">{products.length}</span>
        </button>
        {categories.map((cat) => {
          const count = products.filter((p) => (p.category?.id || (p as any).category_id) === cat.id).length;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                isActive ? "bg-espresso text-white" : "border border-crust bg-white text-espresso"
              }`}
            >
              {cat.name} <span className="font-mono text-[10px] opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Section title */}
      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 className="font-display text-[22px] tracking-tight text-espresso">From the counter</h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-caramel">Sort · popular</span>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-2 gap-3 pb-16">
        {filtered.map((product) => {
          const handleAdd = () => {
            addItem({
              product: {
                id: product.id,
                name: product.name,
                slug: product.slug,
                description: product.description || "",
                basePrice: product.base_price,
                image: product.images?.[0]?.url || "",
                category: product.category?.name || categories.find((c) => c.id === (product.category?.id || (product as any).category_id))?.name || "",
                options: [],
              },
              choices: [],
              quantity: 1,
              unitPrice: product.base_price,
            });
          };

          return (
            <div key={product.id} className="overflow-hidden rounded-2xl border border-crust bg-white">
              <div className="relative h-[110px] bg-butter">
                <Link href={`/menu/${product.slug}`} aria-label={`View ${product.name}`}>
                  {product.images?.[0] ? (
                    <Image
                      src={product.images[0].url}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="50vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Croissant className="text-golden" size={36} aria-hidden="true" />
                    </div>
                  )}
                </Link>
                <button
                  type="button"
                  aria-label={`Add ${product.name}`}
                  onClick={handleAdd}
                  className="absolute -bottom-3.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-espresso text-[18px] text-white shadow-[0_4px_10px_rgba(44,24,16,0.3)]"
                >
                  +
                </button>
              </div>
              <Link href={`/menu/${product.slug}`} className="block p-3">
                <h3 className="font-display text-[14px] leading-[1.1] tracking-tight text-espresso line-clamp-1">
                  {product.name}
                </h3>
                <div className="mt-0.5 font-editorial text-[11px] text-cinnamon line-clamp-1">
                  {product.category?.name || categories.find((c) => c.id === (product.category?.id || (product as any).category_id))?.name || "Bakerio"}
                </div>
                <div className="mt-1.5 font-display text-[15px] text-espresso">
                  {formatVND(product.base_price)}
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center font-editorial text-[14px] italic text-caramel">No products found</p>
      )}

      {/* Floating cart bar */}
      {totalCount > 0 && (
        <div className="fixed bottom-20 left-6 right-6 z-30">
          <Link
            href="/cart"
            className="flex items-center justify-between rounded-full bg-espresso px-5 py-3.5 text-white shadow-[0_12px_30px_rgba(44,24,16,0.35)]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-honey font-mono text-[12px] font-bold text-espresso">
                {totalCount}
              </div>
              <div>
                <div className="text-[12.5px] font-semibold">View cart</div>
                <div className="font-mono text-[10px] tracking-[0.08em] opacity-70">15–25 min · ready</div>
              </div>
            </div>
            <div className="font-display text-[18px]">{formatVND(totalAmount)}</div>
          </Link>
        </div>
      )}
    </>
  );
}
