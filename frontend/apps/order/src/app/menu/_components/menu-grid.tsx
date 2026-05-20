"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Croissant } from "lucide-react";
import type { Product, Category } from "@repo/api-client";
import { formatVND } from "@/lib/format";

export function MenuGrid({ products, categories }: { products: Product[]; categories: Category[] }) {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered = activeCategory === "all"
    ? products
    : products.filter((p) => p.category?.id === activeCategory);

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            activeCategory === "all" ? "bg-golden text-white" : "bg-white border border-crust text-espresso hover:border-golden"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat.id ? "bg-golden text-white" : "bg-white border border-crust text-espresso hover:border-golden"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {filtered.map((product) => (
          <Link
            key={product.id}
            href={`/menu/${product.slug}`}
            className="bg-white border border-crust rounded-[10px] overflow-hidden hover:shadow-lg hover:border-golden transition-all"
          >
            <div className="aspect-square bg-latte relative">
              {product.images?.[0] ? (
                <Image src={product.images[0].url} alt={product.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 33vw" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Croissant className="text-golden" size={36} aria-hidden="true" /></div>
              )}
            </div>
            <div className="p-3">
              <h3 className="font-heading font-semibold text-sm mb-1 line-clamp-1">{product.name}</h3>
              <p className="text-golden font-semibold text-sm">{formatVND(product.base_price)}</p>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-espresso/50 py-8">No products found</p>
      )}
    </>
  );
}
